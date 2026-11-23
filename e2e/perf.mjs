/** Unumdorlik o'lchovi: past sifat, protsessor sekinlashtirilgan (arzon telefon taxmini). Dev server ishlab turishi kerak. */
import { chromium } from 'playwright-core';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const throttle = Number(process.argv[2] ?? 6);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
for (const quality of ['low', 'mid', 'high']) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript((q) => { localStorage.setItem('quality', q); localStorage.setItem('intro', '1'); }, quality);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await page.goto(`${site}/?uy=P0001`);
  await page.locator('.topbar').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  const r = await page.evaluate(async () => {
    const times = [];
    let last = performance.now();
    const end = last + 6000;
    while (performance.now() < end) {
      await new Promise((f) => { requestAnimationFrame(f); });
      const now = performance.now();
      times.push(now - last);
      last = now;
      window.__player.x += 0.05; // harakatda: bo'laklar va instanslar yangilanadi
      window.__player.z -= 0.02;
    }
    times.sort((a, b) => a - b);
    return { fps: Math.round(1000 / (times.reduce((s, t) => s + t, 0) / times.length)), p95ms: Math.round(times[Math.floor(times.length * 0.95)] * 10) / 10, info: window.__gl?.() };
  });
  process.stdout.write(`${quality} (CPU ÷${throttle}): ${JSON.stringify(r)}\n`);
  await ctx.close();
}
await browser.close();
