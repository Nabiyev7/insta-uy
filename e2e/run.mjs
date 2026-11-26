/** Uchdan-uchgacha sinov: haqiqiy Chrome + lokal server. `npm run e2e` (o'z portlarida, o'z bazasida). */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import { helpers, launch, root, startServers, waitFor } from './harness.mjs';
import { runUi } from './ui.mjs';

const shots = process.env.E2E_SHOTS;
const step = async (name, fn) => {
  const t = Date.now();
  await fn();
  process.stdout.write(`  ✓ ${name} (${Date.now() - t} ms)\n`);
};

let browser;
let server;
try {
  server = await startServers();
  const { API, SITE, ADMIN, data, service, call, tgToken, adminToken } = server;
  const { register } = helpers(server);
  const ODAM = 5_000_001;
  const { enter } = helpers(server);
  browser = await launch();
  const errors = [];
  const open = async (options) => {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
    return page;
  };
  const pos = (page) => page.evaluate(() => ({ x: window.__player.x, z: window.__player.z }));
  const view = (page) => page.evaluate(() => ({ ...window.__city.view }));
  const mode = async (page, name) => {
    const t = Date.now();
    await page.locator('.modes').getByRole('button', { name, exact: true }).click();
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
    await desk.locator('.topbar').getByRole('button', { name: 'Menyu', exact: true }).click();
    await desk.locator('.sheet').getByRole('button', { name: 'Sozlamalar', exact: true }).click();
    await desk.getByRole('button', { name: 'Русский' }).click();
    await desk.getByRole('heading', { name: 'Настройки' }).waitFor();
    await desk.getByRole('button', { name: "O'zbekcha" }).click();
    await desk.keyboard.press('Escape');
  });
  await step("ro'yxatdan o'tish va bo'sh joyga bepul uy qurish", async () => {
    await desk.locator('.nav5').getByRole('button', { name: 'Kirish' }).click();
    await register(desk, ODAM, '@Sinov.Nik');
    await desk.getByRole('button', { name: /Bo'sh joy topish/ }).click();
    await desk.getByRole('button', { name: 'Shu yerda bepul uy qurish' }).click();
    await desk.locator('.sheet form button[type=submit]').click();
    await desk.waitForFunction(() => window.__app.getState().building !== null);
    const plotId = await desk.evaluate(() => window.__app.getState().building.plot);
    await desk.getByRole('heading', { name: /Tabriklaymiz/ }).waitFor();
    assert.ok(await desk.evaluate((id) => { const s = window.__app.getState(); const h = s.houses.get(id); return s.building === null && h.tier === 1 && h.nick === 'sinov.nik' && s.plotById.get(id).type === 'hovli'; }, plotId), 'uy qurilmadi');
    await shot(desk, 'claim');
  });

  const admin = await open({ viewport: { width: 1280, height: 800 } });
  await step('admin kiradi, uy darhol egali (tasdiq yo‘q)', async () => {
    await admin.goto(ADMIN);
    await admin.getByLabel('Login').fill('admin');
    await admin.getByLabel('Parol').fill('admin12345');
    await admin.getByRole('button', { name: 'Kirish' }).click();
    await admin.getByRole('heading', { name: 'Statistika' }).waitFor();
    await shot(admin, 'admin');
    await admin.getByRole('button', { name: 'Uylar' }).click();
    await admin.getByText('@sinov.nik').waitFor();
    assert.equal(await admin.getByRole('button', { name: /Tasdiqlash/ }).count(), 0);
  });
  await step('admin faqat egasi: oddiy odam va moderator /admin → "Bunday buyruq yo‘q"', async () => {
    const say = () => fetch(`${API}/dev/telegram`, { method: 'POST', body: JSON.stringify({ message: { message_id: 1, from: { id: ODAM, first_name: 'S' }, chat: { id: ODAM, type: 'private' }, text: '/admin' } }) }).then((r) => r.json());
    const res = await say();
    assert.match(res.sent[0].text, /Bunday buyruq yo‘q/);
    assert.equal(res.sent[0].buttons.length, 0, 'havola berilmasin');
    const me = (await call('admin_users', { p_q: `tg${ODAM}` }, await adminToken()))[0];
    await call('admin_user', { p_id: me.id, p_action: 'role', p_data: { role: 'moderator', perms: ['plots'] } }, await adminToken());
    const again = await say();
    assert.match(again.sent[0].text, /Bunday buyruq yo‘q/);
    await call('admin_user', { p_id: me.id, p_action: 'role', p_data: { role: 'user', perms: [] } }, await adminToken());
  });
  await step('xarita: nik qidirish → kamera uchadi', async () => {
    await desk.keyboard.press('Escape');
    await mode(desk, 'Shahar');
    await desk.locator('.nav5').getByRole('button', { name: 'Xarita' }).click();
    await desk.getByPlaceholder('Nik yoki manzil…').fill('demo_0001');
    const before = await view(desk);
    await desk.getByRole('button', { name: /demo_0001/ }).click();
    await desk.locator('.nick', { hasText: '@demo_0001' }).waitFor();
    await desk.waitForTimeout(1200);
    const after = await view(desk);
    assert.ok(Math.hypot(before.x - after.x, before.z - after.z) > 5, 'kamera uchmadi');
    assert.ok(after.height < 30, 'uyga yaqinlashmadi');
    await shot(desk, 'plot');
  });
  await step('mening uyim: yozuv saqlanadi, tanga bonusi', async () => {
    await desk.keyboard.press('Escape');
    await desk.locator('.nav5').getByRole('button', { name: 'Uyim' }).click();
    await desk.getByRole('button', { name: 'Uy yozuvi' }).click();
    await desk.getByLabel('Qisqa yozuv (ixtiyoriy)').fill('Xush kelibsiz');
    await desk.getByRole('button', { name: 'Saqlash' }).click();
    await desk.getByText('Saqlandi').first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.locator('.pill.coins').click();
    await desk.locator('.sheet').getByRole('button', { name: /Kunlik bonus/ }).click();
    await desk.getByText('Bugun olingan').waitFor();
  });

  const shop = async (tab, id) => {
    await desk.keyboard.press('Escape');
    await desk.locator('.nav5').getByRole('button', { name: "Do'kon" }).click();
    await desk.getByRole('tab', { name: tab, exact: true }).click();
    if (id) await desk.locator(`.good[data-id="${id}"]`).click();
  };
  await step("bezak: 1-levelda yopiq; 5-levelda do'kon → sotib olish → hovliga qo'yish → ko'chirish", async () => {
    const token = await adminToken();
    const me = (await call('admin_users', { p_q: `tg${ODAM}` }, token))[0];
    await shop('Bog‘', 'daraxt_olma');
    assert.ok(await desk.getByRole('button', { name: /^Olma daraxti: 5-levelda/ }).isDisabled(), '1-levelda bezak sotilmasin');
    const plot = await desk.evaluate(() => window.__app.getState().profile.plots[0].plot);
    const coins = await desk.evaluate(() => window.__app.getState().boot.settings.coins);
    await call('admin_setting', { p_key: 'coins', p_value: { ...coins, tier: { 2: 1, 3: 1, 4: 1, 5: 1 }, maxTier: 5 } }, token);
    const mine = await tgToken(ODAM);
    for (let tier = 2; tier <= 5; tier++) await call('my_tier_coins', { p_plot: plot }, mine);
    await desk.reload();
    await desk.locator('.nav5').waitFor();
    await desk.waitForFunction(() => window.__app.getState().profile?.plots[0]?.tier === 5);
    await call('admin_user', { p_id: me.id, p_action: 'coins', p_data: { delta: 1000 } }, token);
    await shop('Bog‘', 'daraxt_olma');
    await desk.getByRole('button', { name: /^Olma daraxti: Olish/ }).click();
    await desk.getByText(/Sotib olindi/).first().waitFor();
    await desk.getByRole('button', { name: 'Hovliga qo‘yish' }).click();
    await desk.getByRole('button', { name: 'Old burchak, chapda' }).click();
    await desk.locator('.spot-panel').getByRole('button', { name: "Qo'yish" }).click();
    await waitFor(() => desk.evaluate(() => [...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.includes('burchak_1:daraxt_olma'))), 'bezak qo‘yildi');
    await desk.locator('.spot-panel select').selectOption('burchak_2');
    await waitFor(() => desk.evaluate(() => [...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.includes('burchak_2:daraxt_olma'))), 'bezak ko‘chdi');
    await shot(desk, 'yard');
    await desk.keyboard.press('Escape');
  });
  await step("sinab ko'rish, sovg'a, haftaning hovlisiga ovoz, ekranni tozalash", async () => {
    await shop('Hovli', 'yard_bike');
    await desk.getByRole('button', { name: "Velosiped: Sinab ko'rish" }).click();
    await desk.locator('.preview').waitFor();
    assert.ok(await desk.evaluate(() => window.__app.getState().preview.decor === 'yard_bike' && ![...window.__app.getState().houses.values()].some((h) => h.nick === 'sinov.nik' && h.decor.some((d) => d.includes('yard_bike')))), 'sinov saqlanib qolmasin');
    await desk.waitForTimeout(1500);
    await shot(desk, 'preview');
    await desk.locator('.preview').getByRole('button', { name: 'Yopish' }).click();
    await shop('Bog‘', 'gul_zor');
    await desk.getByRole('button', { name: /^Gulzor: Olish/ }).click();
    await desk.getByText(/Sotib olindi/).first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.locator('.nav5').getByRole('button', { name: 'Uyim' }).click();
    await desk.getByRole('button', { name: 'Sovg‘alar', exact: true }).click();
    await desk.locator('.sheet select').selectOption('gul_zor');
    await desk.getByPlaceholder('@nik').fill('@demo_0001');
    await desk.locator('.sheet form').first().locator('button[type=submit]').click();
    await desk.locator('.modal').getByRole('button', { name: 'Ha', exact: true }).click();
    await desk.getByText('Yuborildi').first().waitFor();
    await desk.keyboard.press('Escape');
    await desk.goto(`${SITE}/?uy=P0001`);
    await desk.locator('.sheet .heart').getByRole('button', { name: /^Yoqdi/ }).click();
    await desk.locator('.sheet .heart').getByRole('button', { name: /^Yoqtirdingiz: 1/ }).waitFor();
    await desk.keyboard.press('Escape');
    await desk.locator('.topbar').getByRole('button', { name: 'Menyu', exact: true }).click();
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
    await phone.locator('.sheet').getByRole('button', { name: 'Yopish' }).click();
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
    // Mehmonda faqat "Umumiy" (Mahalla — uyi borlarga; "Onlayn" tabi yo'q).
    assert.equal(await phone.getByRole('button', { name: 'Mahalla', exact: true }).count(), 0);
    assert.equal(await phone.getByRole('button', { name: /^Onlayn/ }).count(), 0);
    await phone.getByRole('button', { name: 'Yozish uchun kiring' }).waitFor();
    await phone.locator('.sheet').getByRole('button', { name: 'Yopish' }).click();
    await shot(phone, 'phone');
  });
  await step('video: navbat → render → MP4', async () => {
    // Ochiq 3D sahifalar videokartani band qilmasin (render sekinlashib qolmasin).
    for (const p of [desk, admin, phone]) await p.context().close();
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
    // Matn fondan aniq ajralib turadi (interfeys ranglari o'zgarganda sahifa buzilmasin).
    const colors = await p.evaluate(() => ['.wait', '.wait .invite p'].map((s) => getComputedStyle(document.querySelector(s))).map((c, i) => (i ? c.color : c.backgroundColor)));
    assert.deepEqual(colors, ['rgb(255, 253, 248)', 'rgb(154, 106, 8)']);
    await shot(p, 'kutish');
    await p.context().close();
  });
  assert.deepEqual(errors, [], 'konsolda xatolar');
  await server.stop();
  server = undefined;
  // Yangi interfeysning hamma oqimi: 3 ekran o'lchami × 2 til.
  if (!process.env.E2E_SKIP_UI) await runUi(step);
  process.stdout.write('E2E: hammasi o‘tdi\n');
} finally {
  await browser?.close();
  await server?.stop();
}
