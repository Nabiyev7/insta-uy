/** Bir nechta joyda draw call va uchburchak o‘rtachasi: node e2e/perf-many.mjs http://localhost:5173 */
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ids = ['P0001', 'P0030', 'P0060', 'P0100', 'P0150', 'P0200', 'P0250', 'P0300', 'P0420', 'P0500', 'P0600', 'P0700'];
for (const site of process.argv.slice(2)) {
  for (const quality of ['low', 'mid']) {
    const rows = [];
    for (const id of ids) {
      const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
      await ctx.addInitScript((q) => { localStorage.setItem('quality', q); localStorage.setItem('intro', '1'); }, quality);
      const page = await ctx.newPage();
      await page.goto(`${site}/?uy=${id}`);
      await page.locator('.topbar').waitFor({ timeout: 60000 });
      await page.waitForTimeout(1800);
      rows.push(await page.evaluate(() => window.__gl()));
      await ctx.close();
    }
    const avg = (k) => Math.round(rows.reduce((s, r) => s + r[k], 0) / rows.length);
    console.log(site, quality, 'calls', avg('calls'), 'max', Math.max(...rows.map((r) => r.calls)), 'tris', avg('triangles'), 'max', Math.max(...rows.map((r) => r.triangles)));
  }
}
await browser.close();
