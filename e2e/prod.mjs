/** dist/ ni Cloudflare Pages kabi (_headers + CSP) beradi va brauzerda ochadi. API: lokal dev server. */
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const dist = fileURLToPath(new URL('../apps/web/dist', import.meta.url));
const csp = /Content-Security-Policy: (.+)/.exec(readFileSync(path.join(dist, '_headers'), 'utf8'))[1];
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.glb': 'model/gltf-binary', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (/^\/(rest|auth|storage)\//.test(url.pathname)) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const r = await fetch(`http://127.0.0.1:8787${req.url}`, { method: req.method, headers: { ...req.headers, host: 'x' }, ...(chunks.length ? { body: Buffer.concat(chunks) } : {}) });
    res.writeHead(r.status, { 'content-type': 'application/json' }).end(Buffer.from(await r.arrayBuffer()));
    return;
  }
  const f = path.join(dist, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!f.startsWith(dist) || !existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(f)] ?? 'application/octet-stream', 'content-security-policy': csp }).end(readFileSync(f));
}).listen(5190);
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const problems = [];
let bytes = 0;
page.on('console', (m) => { if (m.type() === 'error' && !/socket\.io|WebSocket/.test(m.text())) problems.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => problems.push(e.message));
page.on('response', async (r) => { bytes += (await r.body().catch(() => Buffer.alloc(0))).length; });
const t = Date.now();
await page.goto('http://localhost:5190/');
await page.getByRole('button', { name: /Shaharga kirish/ }).waitFor({ timeout: 30_000 });
process.stdout.write(`tayyor: ${Date.now() - t} ms, siqilmagan ${(bytes / 1e6).toFixed(2)} MB\nmuammolar: ${JSON.stringify(problems)}\n`);
await browser.close();
server.close();
process.exit(problems.length ? 1 : 0);
