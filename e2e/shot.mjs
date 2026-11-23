import { chromium } from 'playwright-core';
const [,, out, js='', w='1280', h='720', url='http://localhost:5173/'] = process.argv;
const b = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => { if (['error','warning'].includes(m.type())) console.log(m.type(), m.text().slice(0,600)); });
p.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0,600)));
await p.goto(url); await p.waitForTimeout(4500);
if (js) { console.log(await p.evaluate(js)); await p.waitForTimeout(3500); }
await p.screenshot({ path: out }); await b.close();
