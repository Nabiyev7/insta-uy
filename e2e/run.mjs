/** Uchdan-uchgacha sinov: haqiqiy Chrome + lokal server. `npm run e2e` (o'z portlarida, o'z bazasida). */
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('..', import.meta.url));
const data = mkdtempSync(path.join(tmpdir(), 'shahar-e2e-'));
const shots = process.env.E2E_SHOTS;
const API = 'http://127.0.0.1:8797';
const SITE = 'http://localhost:5183';
const ADMIN = 'http://localhost:5184';
const children = [];
const run = (args, cwd, env) => {
  const c = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  children.push(c);
  return c;
};
const waitFor = async (fn, what, ms = 30_000) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => false);
    if (v) return v;
    if (Date.now() > end) throw new Error(`Kutildi: ${what}`);
    await new Promise((r) => { setTimeout(r, 200); });
  }
};
const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  process.stdout.write(`  ✓ ${name} (${Date.now() - t} ms)\n`);
};

let browser;
try {
  let log = '';
  const api = run(['server/dev/main.ts'], root, { PORT: '8797', DEV_DATA: data, SITE_URL: SITE, ALLOWED_ORIGINS: `${SITE},${ADMIN}` });
  api.stdout.on('data', (d) => { log += d; });
  await waitFor(async () => log.includes('Admin:'), 'API', 60_000);
  const anon = /ANON=(\S+)/.exec(log)[1];
  const service = /SERVICE=(\S+)/.exec(log)[1];
  const env = { VITE_SUPABASE_ANON_KEY: anon, DEV_API: API, VITE_SITE_URL: SITE };
  const vite = path.join(root, 'node_modules/vite/bin/vite.js');
  run([vite, '--port', '5183', '--strictPort'], path.join(root, 'apps/web'), env);
  run([vite, '--port', '5184', '--strictPort'], path.join(root, 'apps/admin'), env);
  await waitFor(async () => (await fetch(SITE)).ok && (await fetch(ADMIN)).ok, 'vite');

  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const errors = [];
  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    return page;
  };
  const enter = async (page, url = SITE) => {
    await page.goto(url);
    await page.getByRole('button', { name: /Shaharga kirish/ }).click({ timeout: 60_000 });
    await page.locator('.nav5').waitFor();
    await page.waitForFunction(() => Boolean(window.__scene));
    await page.waitForTimeout(600);
  };
  const pos = (page) => page.evaluate(() => ({ x: window.__player.x, z: window.__player.z }));
  const view = (page) => page.evaluate(() => ({ ...window.__city.view }));
  const mode = async (page, name) => {
    const t = Date.now();
    await page.getByRole('button', { name, exact: true }).click();
    await page.locator(`.hud.mode-${{ Shahar: 'city', Piyoda: 'walk', Mashina: 'drive' }[name]}`).waitFor();
    assert.ok(Date.now() - t < 1000, `${name} rejimiga o'tish sekin`);
    await page.waitForTimeout(700);
  };
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };

  const desk = await open({ viewport: { width: 1280, height: 720 } });
  await step('yuklanish ekrani → yo‘riqnoma → shahar', () => enter(desk));
  await step('shahar rejimi: sudrash, g‘ildirak, o‘ng tugma, klaviatura', async () => {
    const a = await view(desk);
    await desk.mouse.move(640, 360);
    await desk.mouse.down();
    await desk.mouse.move(760, 420, { steps: 5 });
    await desk.mouse.up();
    await desk.waitForTimeout(200);
    const b = await view(desk);
    assert.ok(b.x < a.x - 5 && b.z < a.z - 5, 'sudrash ishlamadi');
    await desk.mouse.wheel(0, -600);
    await desk.waitForTimeout(200);
    const c = await view(desk);
    assert.ok(c.height < b.height * 0.8, 'g‘ildirak ishlamadi');
    await desk.mouse.down({ button: 'right' });
    await desk.mouse.move(860, 420, { steps: 5 });
    await desk.mouse.up({ button: 'right' });
    await desk.waitForTimeout(200);
    assert.ok(Math.abs((await view(desk)).yaw - c.yaw) > 0.2, 'burish ishlamadi');
    const d = await view(desk);
    await desk.keyboard.down('KeyD');
    await desk.waitForTimeout(400);
    await desk.keyboard.up('KeyD');
    const e = await view(desk);
    assert.ok(Math.hypot(e.x - d.x, e.z - d.z) > 5, 'klaviatura ishlamadi');
  });
  await step('mashina: yuradi, tormozda to‘xtaydi; piyoda rejimga o‘tadi', async () => {
    await mode(desk, 'Mashina');
    const a = await pos(desk);
    await desk.keyboard.down('KeyW');
    await desk.waitForTimeout(1500);
    const speed = await desk.evaluate(() => window.__car.state.speed);
    assert.ok(speed > 5, `mashina tezlashmadi: ${speed}`);
    await desk.keyboard.up('KeyW');
    await desk.keyboard.down('Space');
    await desk.waitForTimeout(900);
    await desk.keyboard.up('Space');
    assert.ok(Math.abs(await desk.evaluate(() => window.__car.state.speed)) < 0.5, 'tormoz ishlamadi');
    const b = await pos(desk);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 4, 'mashina siljimadi');
    await shot(desk, 'drive');
    await mode(desk, 'Piyoda');
  });
  await step('WASD bilan yurish', async () => {
    const a = await pos(desk);
    await desk.keyboard.down('KeyS');
    await desk.waitForTimeout(900);
    await desk.keyboard.up('KeyS');
    const b = await pos(desk);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1.5, 'odam siljimadi');
  });
  await step('til almashadi', async () => {
    await desk.getByRole('button', { name: 'Menyu' }).click();
    await desk.getByRole('button', { name: 'Sozlamalar' }).click();
    await desk.getByRole('button', { name: 'Русский' }).click();
    await desk.getByRole('heading', { name: 'Настройки' }).waitFor();
    await desk.getByRole('button', { name: "O'zbekcha" }).click();
    await desk.keyboard.press('Escape');
  });
  await step("ro'yxatdan o'tish va bo'sh uyni bepul olish", async () => {
    await desk.locator('.nav5').getByRole('button', { name: 'Kirish' }).click();
    await desk.getByRole('button', { name: "Ro'yxatdan o'tish" }).first().click();
    await desk.getByLabel('Login').fill('sinov_odam');
    await desk.getByLabel('Parol').fill('parol12345');
    await desk.locator('form button[type=submit]').click();
    await desk.getByRole('button', { name: /Bo'sh uy topish/ }).click();
    await desk.getByLabel('Instagram nikingiz').fill('@Sinov.Nik');
    await desk.getByRole('button', { name: 'Uyni olish' }).click();
    await desk.getByText('Tasdiq kutilmoqda').waitFor();
    await shot(desk, 'claim');
  });

  const admin = await open({ viewport: { width: 1280, height: 800 } });
  await step('admin kiradi va uyni tasdiqlaydi', async () => {
    await admin.goto(ADMIN);
    await admin.getByLabel('Login').fill('admin');
    await admin.getByLabel('Parol').fill('admin12345');
    await admin.getByRole('button', { name: 'Kirish' }).click();
    await admin.getByRole('heading', { name: 'Statistika' }).waitFor();
    await shot(admin, 'admin');
    await admin.getByRole('button', { name: 'Uylar' }).click();
    await admin.getByText('@sinov.nik').waitFor();
    await admin.getByRole('button', { name: /Tasdiqlash/ }).click();
    await admin.getByText('Bajarildi').waitFor();
  });
  await step('oddiy foydalanuvchi admin panelga kirolmaydi', async () => {
    const p = await open({});
    await p.goto(ADMIN);
    await p.getByLabel('Login').fill('sinov_odam');
    await p.getByLabel('Parol').fill('parol12345');
    await p.getByRole('button', { name: 'Kirish' }).click();
    await p.getByText("admin huquqi yo'q").waitFor();
    await p.context().close();
  });
  await step('xarita: nik qidirish → kamera uchadi', async () => {
    await desk.keyboard.press('Escape');
    await mode(desk, 'Shahar');
    await desk.locator('.nav5').getByRole('button', { name: 'Xarita' }).click();
    await desk.getByPlaceholder('Instagram niki…').fill('demo_0001');
    const before = await view(desk);
    await desk.getByRole('button', { name: /demo_0001/ }).click();
    await desk.locator('.nick', { hasText: '@demo_0001' }).waitFor();
    await desk.waitForTimeout(1200);
    const after = await view(desk);
    assert.ok(Math.hypot(before.x - after.x, before.z - after.z) > 5, 'kamera uchmadi');
    assert.ok(after.height < 30, 'uyga yaqinlashmadi');
    await shot(desk, 'plot');
  });
  await step('mening uyim: rang saqlanadi, tanga bonusi', async () => {
    await desk.keyboard.press('Escape');
    await desk.locator('.nav5').getByRole('button', { name: 'Uyim' }).click();
    await desk.getByRole('button', { name: 'Devor rangi 5' }).click();
    await desk.getByRole('button', { name: 'Saqlash' }).click();
    await desk.getByText('Saqlandi').first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.getByRole('button', { name: /^Tangalar/ }).click();
    await desk.getByRole('button', { name: /Kunlik bonus/ }).click();
    await desk.getByText('Bugun olingan').waitFor();
  });

  const call = (fn, args, token) => fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(args) }).then((r) => r.json());
  const adminToken = async () => (await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email: 'admin@login.obunachilar-shahri.uz', password: 'admin12345' }) }).then((r) => r.json())).access_token;
  await step("bezak: do'kon → sotib olish → hovliga qo'yish → ko'chirish", async () => {
    const token = await adminToken();
    const me = (await call('admin_users', { p_q: 'sinov_odam' }, token))[0];
    await call('admin_user', { p_id: me.id, p_action: 'coins', p_data: { delta: 1000 } }, token);
    await desk.keyboard.press('Escape');
    await desk.locator('.nav5').getByRole('button', { name: "Do'kon" }).click();
    await desk.getByText('7-levelda ochiladi').first().waitFor();
    await desk.getByRole('button', { name: 'Anor: Sotib olish' }).click();
    await desk.getByText(/Sotib olindi/).first().waitFor();
    await desk.locator('.nav5').getByRole('button', { name: 'Uyim' }).click();
    await desk.getByRole('button', { name: 'Old hovli, chapda' }).click();
    await desk.getByRole('button', { name: "Qo'yish" }).click();
    await waitFor(() => desk.evaluate(() => [...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.includes('s1:tree_anor'))), 'bezak qo‘yildi');
    await desk.locator('.spot-panel select').selectOption('s2');
    await waitFor(() => desk.evaluate(() => [...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.includes('s2:tree_anor'))), 'bezak ko‘chdi');
    await desk.getByRole('button', { name: "G'isht" }).click();
    await desk.getByRole('button', { name: 'Eshik rangi 4' }).click();
    await desk.getByRole('button', { name: 'Saqlash' }).click();
    await waitFor(() => desk.evaluate(() => [...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.material === 1 && h.door === 3)), 'material saqlandi');
    await shot(desk, 'yard');
    await desk.keyboard.press('Escape');
  });
  await step("sinab ko'rish, sovg'a, haftaning hovlisiga ovoz, ekranni tozalash", async () => {
    await desk.locator('.nav5').getByRole('button', { name: "Do'kon" }).click();
    await desk.getByRole('button', { name: "Velosiped: Sinab ko'rish" }).click();
    await desk.locator('.preview').waitFor();
    assert.ok(await desk.evaluate(() => window.__app.getState().preview.decor === 'yard_bike' && ![...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.some((d) => d.includes('yard_bike')))), 'sinov saqlanib qolmasin');
    await desk.waitForTimeout(1500);
    await shot(desk, 'preview');
    await desk.locator('.preview').getByRole('button', { name: 'Yopish' }).click();
    await desk.locator('.nav5').getByRole('button', { name: "Do'kon" }).click();
    await desk.getByRole('button', { name: 'Olma: Sotib olish' }).click();
    await desk.getByText(/Sotib olindi/).first().waitFor();
    await desk.locator('.nav5').getByRole('button', { name: 'Uyim' }).click();
    await desk.getByText("Bezakni sovg'a qilish").first().click();
    await desk.locator('details[open] select').selectOption('tree_olma');
    await desk.getByPlaceholder('@nik').fill('@demo_0001');
    desk.once('dialog', (d) => d.accept());
    await desk.locator('details[open] button[type=submit]').click();
    await desk.getByText('Yuborildi').first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.goto(`${SITE}/?uy=P0001`);
    await desk.locator('.sheet').getByRole('button', { name: 'Ovoz berish' }).click();
    await desk.getByText(/Haftaning hovlisi: 1/).waitFor();
    await desk.keyboard.press('Escape');
    await desk.getByRole('button', { name: 'Ekranni tozalash' }).click();
    assert.equal(await desk.locator('.nav5').count(), 0);
    await desk.waitForTimeout(500);
    await desk.mouse.click(500, 400);
    await desk.locator('.nav5').waitFor();
  });
  await step('admin: mavjud modeldan yangi tovar', async () => {
    await admin.getByRole('button', { name: 'Bezaklar' }).click();
    await admin.getByRole('button', { name: '+ Yangi tovar' }).click();
    await admin.getByLabel('ID', { exact: true }).fill('tree_anor_yosh');
    await admin.getByLabel('3D model').selectOption('tree_anor');
    await admin.getByLabel('Nomi (uz)').fill('Yosh anor');
    await admin.getByLabel('Nomi (ru)').fill('Молодой гранат');
    await admin.getByRole('button', { name: 'Saqlash' }).click();
    await admin.getByText('Yosh anor').waitFor();
    await shot(admin, 'admin-decor');
  });

  const phone = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await step("telefon: joystick, uyni bosish, ko'p o'yinchi, chat", async () => {
    await enter(phone, `${SITE}/?uy=P0001`);
    await phone.keyboard.press('Escape');
    assert.equal(await phone.locator('.joystick').count(), 0, 'shahar rejimida joystick bo‘lmasin');
    await phone.touchscreen.tap(195, 290);
    await phone.locator('.sheet').waitFor();
    await phone.getByRole('button', { name: 'Yopish' }).click();
    await mode(phone, 'Piyoda');
    const box = await phone.locator('.joystick').boundingBox();
    const a = await pos(phone);
    await phone.mouse.move(box.x + 64, box.y + 64);
    await phone.mouse.down();
    await phone.mouse.move(box.x + 64, box.y + 120, { steps: 4 });
    await phone.waitForTimeout(700);
    await phone.mouse.up();
    const b = await pos(phone);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1, 'joystick ishlamadi');
    await desk.keyboard.press('Escape');
    await mode(desk, 'Piyoda');
    await waitFor(() => phone.evaluate(() => window.__remotes.size >= 1), "boshqa o'yinchi");
    await desk.locator('.nav5').getByRole('button', { name: /Chat/ }).click();
    await desk.getByPlaceholder('Xabar…').fill('Salom shahar');
    await desk.keyboard.press('Enter');
    await desk.locator('.message', { hasText: 'Salom shahar' }).waitFor();
    await phone.locator('.nav5 .dot').first().waitFor();
    await phone.locator('.nav5').getByRole('button', { name: /Chat/ }).click();
    await phone.locator('.message', { hasText: 'Salom shahar' }).waitFor();
    const sheet = await phone.locator('.sheet').boundingBox();
    assert.ok(sheet.y > 380, 'chat ekranning pastki yarmida emas');
    await phone.getByRole('button', { name: 'Mahalla', exact: true }).click();
    await phone.getByRole('button', { name: 'Yozish uchun kiring' }).waitFor();
    await phone.getByRole('button', { name: /^Onlayn/ }).click();
    await phone.getByText('sinov.nik').waitFor();
    await phone.getByRole('button', { name: 'Yopish' }).click();
    await shot(phone, 'phone');
  });
  await step('eng kichik ekran: elementlar bir-biriga tegmaydi', async () => {
    for (const viewport of [{ width: 360, height: 640 }, { width: 640, height: 360 }]) {
      const small = await open({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      await enter(small);
      for (const name of ['Shahar', 'Piyoda', 'Mashina']) {
        if (name !== 'Shahar') await mode(small, name);
        const boxes = await small.evaluate(() => ['.plate', '.chip.coins', '.modes', '.nav5', '.joystick', '.actions'].flatMap((s) => {
          const el = document.querySelector(s);
          if (!el) return [];
          const r = el.getBoundingClientRect();
          return [{ s, x: r.x, y: r.y, r: r.right, b: r.bottom }];
        }));
        for (const a of boxes) {
          assert.ok(a.x >= 0 && a.y >= 0 && a.r <= viewport.width && a.b <= viewport.height, `${a.s} ekrandan chiqdi (${name})`);
          assert.ok(!(a.x < viewport.width / 2 && a.r > viewport.width / 2 && a.y < viewport.height / 2 && a.b > viewport.height / 2), `${a.s} ekran o'rtasini to'sdi`);
          for (const b of boxes) if (a.s < b.s) assert.ok(a.r <= b.x || b.r <= a.x || a.b <= b.y || b.b <= a.y, `${a.s} va ${b.s} ustma-ust (${name} ${viewport.width}×${viewport.height})`);
        }
      }
      await small.context().close();
    }
  });
  await step('video: navbat → render → MP4', async () => {
    const token = await adminToken();
    const id = await call('admin_video_create', { p_kind: 'houses', p_plots: ['P0001', 'P0002'], p_style: { title: 'Yangi uylar!', seconds: 4 } }, token);
    execFileSync(process.execPath, ['video/src/main.ts', '--once'], { cwd: root, env: { ...process.env, SUPABASE_URL: API, SUPABASE_SERVICE_KEY: service, SITE_URL: SITE }, stdio: 'inherit', timeout: 240_000 });
    const job = (await call('admin_videos', {}, token)).find((j) => j.id === id);
    assert.equal(job.status, 'ready', job.error);
    const file = path.join(data, 'storage', job.file);
    assert.ok(existsSync(file) && statSync(file).size > 200_000);
    let info = '';
    try { execFileSync(ffmpeg, ['-i', file], { stdio: 'pipe' }); } catch (e) { info = String(e.stderr); }
    assert.match(info, /1080x1920/);
    assert.match(info, /Duration: 00:00:04/);
    assert.match(info, /Audio: aac/);
    if (shots) execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '1.7', '-i', file, '-frames:v', '1', path.join(shots, 'video.png')]);
  });
  await step('kutish ro‘yxati sahifasi', async () => {
    const p = await open({});
    await p.goto(`${SITE}/kutish.html`);
    await p.getByPlaceholder('@nik').fill('@kutuvchi_1');
    await p.getByRole('button', { name: /Navbatga/ }).click();
    await p.getByText('Yozildingiz').waitFor();
    await shot(p, 'kutish');
    await p.context().close();
  });
  assert.deepEqual(errors, [], 'konsolda xatolar');
  process.stdout.write('E2E: hammasi o‘tdi\n');
} finally {
  await browser?.close();
  for (const c of children) c.kill();
  await new Promise((r) => { setTimeout(r, 500); });
  rmSync(data, { recursive: true, force: true, maxRetries: 5 });
}
