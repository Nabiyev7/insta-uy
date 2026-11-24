/** 50 ta uyga 20 tadan bezak qo'yib tezlikni o'lchaydi (past sifat). Dev server ishlab turishi kerak. */
import { chromium } from 'playwright-core';
import { ANCHORS, DECOR } from '../packages/shared/src/index.ts';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const shot = process.argv[2];
const decor = ANCHORS.flatMap((a, i) => { const fit = DECOR.filter((d) => d.spots.includes(a.kind)); const d = fit[i % Math.max(1, fit.length)]; return d ? [`${a.id}:${d.id}`] : []; }).slice(0, 20);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
for (const mode of ['walk', 'city']) {
  for (const isFull of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => { localStorage.setItem('quality', 'low'); localStorage.setItem('intro', '1'); });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${site}/?uy=P0030`);
    await page.locator('.nav5').waitFor({ timeout: 60_000 });
    await page.evaluate(({ list, on }) => {
      const s = window.__app.getState();
      const near = s.plan.plots.filter((p) => p.type === 'hovli').sort((a, b) => Math.hypot(a.x - s.plotById.get('P0030').x, a.z - s.plotById.get('P0030').z) - Math.hypot(b.x - s.plotById.get('P0030').x, b.z - s.plotById.get('P0030').z)).slice(0, 50);
      const houses = new Map(s.houses);
      for (const p of near) houses.set(p.id, { plot: p.id, nick: `n_${p.id}`, tier: 10, wall: 2, roof: 1, decor: on ? list : [], material: 1, frame: 4, door: 6, label: 'plain', badge: null, status: 'owned', expanded: false });
      window.__app.setState({ houses, panel: null });
    }, { list: decor, on: isFull });
    await page.evaluate((m) => window.__setMode(m), mode);
    await page.waitForTimeout(2500);
    if (shot && isFull) await page.screenshot({ path: `${shot}/decor-${mode}.png` });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    const r = await page.evaluate(async () => {
      let n = 0;
      const end = performance.now() + 5000;
      while (performance.now() < end) {
        await new Promise((f) => { requestAnimationFrame(f); });
        n++;
        if (window.__session.mode === 'city') window.__city.view = { ...window.__city.view, yaw: window.__city.view.yaw + 0.002 };
        else window.__player.x += 0.04;
      }
      return { fps: Math.round(n / 5), ...window.__gl() };
    });
    process.stdout.write(`${mode} ${isFull ? '20 bezak' : 'bezaksiz'}: ${JSON.stringify(r)}\n`);
    await ctx.close();
  }
}
await browser.close();
