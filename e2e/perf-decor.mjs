/** 50 ta uyga 20 tadan bezak qo'yib tezlikni o'lchaydi (past sifat). Dev server ishlab turishi kerak. */
import { chromium } from 'playwright-core';
import { ANCHORS, DECOR, LUXE_MODELS } from '../packages/shared/src/index.ts';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const shot = process.argv[2];
const decor = ANCHORS.flatMap((a, i) => { const fit = DECOR.filter((d) => d.spots.includes(a.kind)); const d = fit[i % Math.max(1, fit.length)]; return d ? [`${a.id}:${d.id}`] : []; }).slice(0, 20);
const luxe = ['garaj_oldi:lux_superkar', 'old_hovli_chap:lux_basseyn', 'old_hovli_ong:lux_bog', ...['burchak_1', 'burchak_2', 'burchak_3', 'burchak_4', 'p1', 'p2'].map((a) => `${a}:lux_daraxt`)];
if (luxe.some((x) => !LUXE_MODELS.has(x.split(':')[1]))) throw new Error('lyuks model topilmadi');
const YARDS = { bezaksiz: [], '20 bezak': decor, lyuks: luxe };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-frame-rate-limit', '--disable-gpu-vsync'] });
for (const mode of ['walk', 'city']) {
  for (const [name, list] of Object.entries(YARDS)) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await ctx.addInitScript(() => { localStorage.setItem('quality', 'low'); localStorage.setItem('intro', '1'); });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await page.goto(`${site}/?uy=P0030`);
    await page.locator('.nav5').waitFor({ state: 'attached', timeout: 60_000 });
    await page.evaluate((list) => {
      const s = window.__app.getState();
      const near = s.plan.plots.filter((p) => p.type === 'hovli').sort((a, b) => Math.hypot(a.x - s.plotById.get('P0030').x, a.z - s.plotById.get('P0030').z) - Math.hypot(b.x - s.plotById.get('P0030').x, b.z - s.plotById.get('P0030').z)).slice(0, 50);
      const houses = new Map(s.houses);
      for (const p of near) houses.set(p.id, { plot: p.id, nick: `n_${p.id}`, tier: 5, wall: 0, roof: 0, decor: list, material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false });
      window.__app.setState({ houses, panel: null });
    }, list);
    await page.evaluate((m) => window.__setMode(m), mode);
    await page.waitForTimeout(2500);
    if (shot && list.length) await page.screenshot({ path: `${shot}/decor-${mode}-${name.replace(' ', '')}.png` });
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
    process.stdout.write(`${mode} ${name}: ${JSON.stringify(r)}\n`);
    await ctx.close();
  }
}
await browser.close();
