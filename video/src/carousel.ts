/** Shahar gazetasi → Instagram karusel (1080x1350 PNG): `npm run carousel`. */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { slides, type Issue } from './logic/slides.ts';
import { launchBrowser } from './render.ts';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:8787';
const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_SERVICE_KEY;
if (!key) throw new Error('SUPABASE_ANON_KEY yoki SUPABASE_SERVICE_KEY kerak');
const res = await fetch(`${url}/rest/v1/rpc/api_gazette`, { method: 'POST', headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: '{}' });
if (!res.ok) throw new Error(`api_gazette: ${res.status}`);
const issue = ((await res.json()) as readonly Issue[])[0];
if (!issue) throw new Error("Hali gazeta yo'q (svc_tick haftada bir yaratadi)");

const out = fileURLToPath(new URL(`../out/gazeta-${issue.week}`, import.meta.url));
await mkdir(out, { recursive: true });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [i, html] of slides(issue).entries()) {
    await page.setContent(html);
    await page.screenshot({ path: path.join(out, `${i + 1}.png`) });
  }
} finally {
  await browser.close();
}
process.stdout.write(`${out}\n`);
