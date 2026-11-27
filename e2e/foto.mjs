/** Foto rejimi namunalari (17-qadam): `node e2e/foto.mjs` — dev server (DEMO=1) ishlab turishi kerak.
 *  Natija: docs/chat/ui-foto-oltin.png, ui-foto-tun.png (panel) va foto-namuna-*.jpg (1080×1920 kadrlar); kadr olish vaqti (CPU ×6 sekinlashtirilgan ham). */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const SITE = process.env.SITE_URL ?? 'http://localhost:5173';
const out = path.join(import.meta.dirname, '..', 'docs', 'chat');
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await ctx.addInitScript(() => { localStorage.setItem('quality', 'high'); localStorage.setItem('intro', '1'); });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('xato:', e.message));
await page.goto(SITE);
await page.locator('.topbar').waitFor({ timeout: 60_000 });
await page.waitForFunction(() => window.__app.getState().houses.size > 50, null, { timeout: 60_000 });
/** Eng zich mahalla (45 m ichida eng ko'p uy). */
const spot = await page.evaluate(() => {
  const s = window.__app.getState();
  const pts = [...s.houses.keys()].map((id) => s.plotById.get(id)).filter(Boolean);
  let best = pts[0];
  let n = 0;
  for (const a of pts) { const k = pts.filter((b) => Math.hypot(a.x - b.x, a.z - b.z) < 45).length; if (k > n) { n = k; best = a; } }
  return { x: best.x, z: best.z };
});
const view = (v) => page.evaluate((x) => { window.__setMode('city'); Object.assign(window.__city, { view: x, flight: null }); }, v);
const shoot = async (name) => {
  const t0 = Date.now();
  await page.locator('.photo-panel').getByRole('button', { name: 'Suratga olish' }).click();
  const img = page.locator('.photo-result img');
  await img.waitFor({ timeout: 30_000 });
  const ms = Date.now() - t0;
  const r = await img.evaluate(async (el) => {
    await el.decode();
    const a = new Uint8Array(await (await fetch(el.src)).arrayBuffer());
    let s = '';
    for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
    return { w: el.naturalWidth, h: el.naturalHeight, b64: btoa(s) };
  });
  writeFileSync(path.join(out, `foto-namuna-${name}.jpg`), Buffer.from(r.b64, 'base64'));
  console.log(`${name}: ${r.w}×${r.h}, ${ms} ms`);
  await page.locator('.photo-result').getByRole('button', { name: 'Yopish' }).click();
  return ms;
};
const set = (photo) => page.evaluate((p) => window.__app.setState({ isPhoto: true, photo: p }), photo);

await view({ x: spot.x, z: spot.z, yaw: 0.7, height: 40 });
await set({ light: 'golden', tilt: 'high', format: '9:16', hasLink: true });
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(out, 'ui-foto-oltin.png') });
await shoot('oltin');
await set({ light: 'golden', tilt: 'mid', format: '4:5', hasLink: true });
await page.waitForTimeout(1500);
await shoot('oltin-4x5');
await set({ light: 'night', tilt: 'mid', format: '9:16', hasLink: true });
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(out, 'ui-foto-tun.png') });
await shoot('tun');
// O'rta telefon: CPU ×6 sekinlashtirilgan — kadr olish ≤ 3 s.
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await set({ light: 'golden', tilt: 'high', format: '9:16', hasLink: true });
await page.waitForTimeout(3000);
const slow = await shoot('oltin-sekin');
(await import('node:fs')).rmSync(path.join(out, 'foto-namuna-oltin-sekin.jpg'), { force: true });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
console.log(slow <= 3000 ? `✅ CPU ×6 da kadr ${slow} ms (≤ 3 s)` : `❌ CPU ×6 da kadr ${slow} ms (> 3 s)`);
await browser.close();
if (slow > 3000) process.exit(1);
