/** Telefon o'lchamidagi (360×640) skrinshotlar: docs/chat/ekran-*.png. Dev server ishlab turishi kerak. */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const out = process.argv[2] ?? path.join(fileURLToPath(new URL('..', import.meta.url)), 'docs/chat');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const shoot = async (viewport, suffix) => {
  const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('quality', 'mid'); localStorage.setItem('intro', '1'); });
  const page = await ctx.newPage();
  await page.goto(site);
  await page.locator('.nav5').waitFor({ timeout: 60_000 });
  await page.waitForTimeout(3000);
  for (const [mode, name] of [['city', 'shahar'], ['walk', 'piyoda'], ['drive', 'mashina']]) {
    await page.evaluate((m) => {
      if (m === 'walk') Object.assign(window.__city, { view: { x: -54, z: -168, yaw: 0.4, height: 40 }, flight: null });
      window.__setMode(m);
    }, mode);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: path.join(out, `ekran-${name}${suffix}.png`) });
  }
  await ctx.close();
};
await shoot({ width: 360, height: 640 }, '');
await shoot({ width: 640, height: 360 }, '-yotiq');
await browser.close();
