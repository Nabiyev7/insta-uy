/** Ijtimoiy tarmoq rasmi (1200x630): ishlab turgan saytdan olinadi → apps/web/public/og.png */
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const site = process.env.SITE_URL ?? 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(`${site}/?video=1`);
await page.waitForFunction(() => '__video' in window);
await page.evaluate(async (plots) => { await window.__video.setup(plots, { time: 0.4 }); await window.__video.frame(Number(1.9)); }, process.argv[2] ? [process.argv[2]] : ['P0001']);
await page.addStyleTag({ content: '.hud,.photo-bar,.toasts{display:none!important}' });
const out = (f) => fileURLToPath(new URL(`../apps/web/public/${f}`, import.meta.url));
await page.waitForTimeout(800);
await sharp(await page.screenshot()).webp({ quality: 82 }).toFile(out('hero.webp'));
await page.addStyleTag({ content: '.photo-bar{display:none!important}.og{position:fixed;inset:0;z-index:99;background:linear-gradient(90deg,rgba(10,45,52,.94) 0,rgba(10,45,52,.72) 42%,transparent 72%);color:#fdf6e6;padding:90px 70px;display:grid;align-content:center;gap:22px}.og b{font:800 78px/1 "Unbounded Variable";max-width:640px}.og i{width:120px;height:12px;background:#f3cd68}.og span{font:500 32px "Golos Text Variable";max-width:520px}' });
await page.evaluate(() => {
  const d = document.createElement('div');
  d.className = 'og';
  for (const [tag, text] of [['i', ''], ['b', 'Obunachilar shahri'], ['span', "3D o'zbek shahrida o'z uyingizni bepul oling"]]) d.append(Object.assign(document.createElement(tag), { textContent: text }));
  document.body.append(d);
});
await page.waitForTimeout(1500);
const png = await page.screenshot();
await sharp(png).png({ palette: true, quality: 85 }).toFile(out('og.png'));
await browser.close();
