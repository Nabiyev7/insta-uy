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
    await page.locator('.topbar').waitFor();
  };
  const pos = (page) => page.evaluate(() => ({ x: window.__player.x, z: window.__player.z }));
  const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`) }); };

  const desk = await open({ viewport: { width: 1280, height: 720 } });
  await step('yuklanish ekrani → yo‘riqnoma → shahar', () => enter(desk));
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
    await desk.locator('.chip.main').click();
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
  await step('nik qidirish → teleport', async () => {
    await desk.keyboard.press('Escape');
    await desk.getByRole('button', { name: 'Nik qidirish' }).click();
    await desk.getByPlaceholder('Instagram niki…').fill('demo_0001');
    const before = await pos(desk);
    await desk.getByRole('button', { name: /demo_0001/ }).click();
    await desk.locator('.nick', { hasText: '@demo_0001' }).waitFor();
    const after = await pos(desk);
    assert.notDeepEqual(before, after);
    await shot(desk, 'plot');
  });
  await step('mening uyim: rang saqlanadi, tanga bonusi', async () => {
    await desk.keyboard.press('Escape');
    await desk.locator('.chip.main').click();
    await desk.getByRole('button', { name: 'Devor rangi 5' }).click();
    await desk.getByRole('button', { name: 'Saqlash' }).click();
    await desk.getByText('Saqlandi').first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.getByRole('button', { name: 'Menyu' }).click();
    await desk.getByRole('button', { name: 'Tangalar' }).click();
    await desk.getByRole('button', { name: /Kunlik bonus/ }).click();
    await desk.getByText('Bugun olingan').waitFor();
  });

  const phone = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  await step("telefon: joystick, uyni bosish, ko'p o'yinchi, chat", async () => {
    await enter(phone, `${SITE}/?uy=P0001`);
    await phone.keyboard.press('Escape');
    const box = await phone.locator('.joystick').boundingBox();
    const a = await pos(phone);
    await phone.mouse.move(box.x + 64, box.y + 64);
    await phone.mouse.down();
    await phone.mouse.move(box.x + 64, box.y + 120, { steps: 4 });
    await phone.waitForTimeout(700);
    await phone.mouse.up();
    const b = await pos(phone);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1, 'joystick ishlamadi');
    await phone.touchscreen.tap(195, 330);
    await phone.locator('.sheet').waitFor();
    await phone.getByRole('button', { name: 'Yopish' }).click();
    await desk.keyboard.press('Escape');
    await waitFor(() => phone.evaluate(() => window.__remotes.size >= 1), "boshqa o'yinchi");
    await desk.getByRole('button', { name: /onlayn/ }).click();
    await desk.getByPlaceholder('Xabar…').fill('Salom mahalla');
    await desk.keyboard.press('Enter');
    await desk.locator('.chatbox p', { hasText: 'Salom mahalla' }).waitFor();
    await shot(phone, 'phone');
  });
  await step('video: navbat → render → MP4', async () => {
    const call = (fn, args, token) => fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(args) }).then((r) => r.json());
    const login = await fetch(`${API}/auth/v1/token?grant_type=password`, { method: 'POST', body: JSON.stringify({ email: 'admin@login.obunachilar-shahri.uz', password: 'admin12345' }) }).then((r) => r.json());
    const id = await call('admin_video_create', { p_kind: 'houses', p_plots: ['P0001', 'P0002'], p_style: { title: 'Yangi uylar!', seconds: 4 } }, login.access_token);
    execFileSync(process.execPath, ['video/src/main.ts', '--once'], { cwd: root, env: { ...process.env, SUPABASE_URL: API, SUPABASE_SERVICE_KEY: service, SITE_URL: SITE }, stdio: 'inherit', timeout: 240_000 });
    const job = (await call('admin_videos', {}, login.access_token)).find((j) => j.id === id);
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
