/** Bo'sh shahar va uy qurilishi rasmlari: docs/chat/bosh-uchastka.png, uy-qurilishi-1..3.png. Dev server (bo'sh baza) ishlab turishi kerak. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const out = process.argv[2] ?? path.join(fileURLToPath(new URL('..', import.meta.url)), 'docs/chat');
mkdirSync(out, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(out, `${name}.png`) });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 1.5 })).newPage();
page.on('console', (m) => { if (m.type() === 'error') process.stdout.write(`XATO: ${m.text()}\n`); });
await page.addInitScript(() => { localStorage.setItem('quality', 'high'); localStorage.setItem('intro', '1'); });
await page.goto(site);
await page.locator('.nav5').waitFor({ state: 'attached', timeout: 60_000 });
await page.evaluate(() => { window.__director.dayFraction = 0.45; });
// 1-tuman o'rtasidagi bo'sh hovli
const plot = await page.evaluate(() => {
  const s = window.__app.getState();
  const free = s.plan.plots.filter((p) => p.districtId === 1 && p.type === 'hovli' && p.rot === 0 && !s.houses.has(p.id));
  const centre = free.reduce((c, p) => ({ x: c.x + p.x / free.length, z: c.z + p.z / free.length }), { x: 0, z: 0 });
  const p = free.sort((a, b) => Math.hypot(a.x - centre.x, a.z - centre.z) - Math.hypot(b.x - centre.x, b.z - centre.z))[0];
  return { id: p.id, x: p.x, z: p.z };
});
await page.evaluate(({ x, z }) => { Object.assign(window.__city, { view: { x, z: z + 8, yaw: 0.35, height: 22 }, flight: null }); }, plot);
await page.waitForTimeout(3500);
await shot(page, 'bosh-uchastka');
// ro'yxatdan o'tib, shu joyga uy qurish
await page.locator('.nav5').getByRole('button', { name: 'Kirish', exact: true }).click();
const login = `sinov_${Date.now().toString(36)}`;
const form = page.locator('.sheet .dev-login');
await form.getByLabel('Telegram ID').fill(String(Date.now() % 1e9));
await form.getByLabel('Instagram nik').fill(login);
await form.getByRole('button', { name: 'Lokal kirish' }).click();
await page.waitForFunction(() => window.__app?.getState().profile !== null && !location.search.includes('kirish='), null, { timeout: 60_000 });
await page.goto(`${site}/?uy=${plot.id}`);
await page.locator('.nav5').waitFor({ state: 'attached', timeout: 60_000 });
await page.evaluate(() => { window.__director.dayFraction = 0.45; });
await page.getByRole('button', { name: 'Shu yerda bepul uy qurish' }).click();
await page.locator('.sheet form button[type=submit]').click();
await page.waitForFunction(() => window.__app.getState().building !== null);
await page.waitForFunction(() => performance.now() > window.__app.getState().building.at + 500);
await shot(page, 'uy-qurilishi-1');
await page.waitForFunction(() => performance.now() > (window.__app.getState().building?.at ?? 0) + 1300);
await shot(page, 'uy-qurilishi-2');
await page.getByRole('heading', { name: /Tabriklaymiz/ }).waitFor();
await page.waitForTimeout(800);
await shot(page, 'uy-qurilishi-3');
await browser.close();
