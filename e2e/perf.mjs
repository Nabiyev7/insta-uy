/** Unumdorlik o'lchovi: past/o'rta/yuqori sifat, protsessor sekinlashtirilgan (arzon telefon taxmini). Dev server ishlab turishi kerak. */
import { chromium } from 'playwright-core';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const throttle = Number(process.argv[2] ?? 6);
const MEASURE_MS = 6000;
const MAX_HEIGHT = { low: 190, mid: 240, high: 300 };
/** Piyoda (P0001 oldida), shahar — eng yuqori kamera (aholisi zich joy ustida), mashina. */
const SCENES = {
  piyoda: () => window.__setMode('walk'),
  'shahar-eng-baland': (h) => { window.__setMode('city'); Object.assign(window.__city, { view: { x: -220, z: -220, yaw: 0.6, height: h }, flight: null }); },
  mashina: () => window.__setMode('drive'),
};
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
for (const quality of ['low', 'mid', 'high']) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript((q) => { localStorage.setItem('quality', q); localStorage.setItem('intro', '1'); }, quality);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${site}/?uy=P0001`);
  await page.locator('.topbar').waitFor({ timeout: 60_000 });
  for (const [name, enter] of Object.entries(SCENES)) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.evaluate(enter, MAX_HEIGHT[quality]);
    await page.waitForTimeout(2500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    const r = await page.evaluate(async (ms) => {
      const times = [];
      let last = performance.now();
      const end = last + ms;
      while (performance.now() < end) {
        await new Promise((f) => { requestAnimationFrame(f); });
        const now = performance.now();
        times.push(now - last);
        last = now;
        // harakatda: bo'laklar va instanslar yangilanadi
        if (window.__session.mode === 'city') window.__city.view = { ...window.__city.view, x: window.__city.view.x + 0.4, yaw: window.__city.view.yaw + 0.002 };
        else if (window.__session.mode === 'drive') window.__car.state = { ...window.__car.state, speed: 15 };
        else { window.__player.x += 0.05; window.__player.z -= 0.02; }
      }
      times.sort((a, b) => a - b);
      return { fps: Math.round(1000 / (times.reduce((s, t) => s + t, 0) / times.length)), p95ms: Math.round(times[Math.floor(times.length * 0.95)] * 10) / 10, worst: Math.round(times.at(-1)), info: window.__gl?.() };
    }, MEASURE_MS);
    process.stdout.write(`${quality} ${name} (CPU ÷${throttle}): ${JSON.stringify(r)}\n`);
  }
  await ctx.close();
}
await browser.close();
