/** Ishlab chiqarish saytini tez tekshirish: node e2e/prod.mjs [rasm.png] */
import { chromium } from 'playwright-core';
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 160)); });
const t0 = Date.now();
await p.goto(process.env.SITE ?? 'https://citylanduz.pages.dev/');
await p.locator('.guide, .nav5').first().waitFor({ timeout: 90000 });
console.log('ochildi:', ((Date.now() - t0) / 1000).toFixed(1), 's');
await p.waitForTimeout(3000);
console.log('xatolar:', errors.length ? errors.slice(0, 5) : 'yo‘q');
await p.screenshot({ path: process.argv[2] ?? 'prod.png' });
await b.close();
