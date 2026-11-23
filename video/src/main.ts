/** Admin paneldagi video navbatini kuzatadi: `npm run video` (bir marta: `npm run video -- --once`). */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderJob, type RenderJob, type RenderOptions } from './render.ts';

const env = process.env;
const supabaseUrl = env.SUPABASE_URL ?? 'http://127.0.0.1:8787';
const key = env.SUPABASE_SERVICE_KEY;
if (!key) throw new Error("SUPABASE_SERVICE_KEY kerak (lokalda dev server chiqargan SERVICE qiymati)");
const options: RenderOptions = {
  siteUrl: env.SITE_URL ?? 'http://localhost:5173', outDir: fileURLToPath(new URL('../out', import.meta.url)),
  ...(env.ELEVENLABS_KEY ? { elevenKey: env.ELEVENLABS_KEY } : {}), ...(env.ELEVENLABS_VOICE ? { elevenVoice: env.ELEVENLABS_VOICE } : {}),
};
const headers = { apikey: key, authorization: `Bearer ${key}` };
const POLL_MS = 15_000;
const log = (text: string): void => { process.stdout.write(`${text}\n`); };

const rpc = async <T,>(fn: string, args: unknown = {}): Promise<T> => {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify(args) });
  if (!res.ok) throw new Error(`${fn}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
};

const upload = async (file: string, id: string): Promise<string> => {
  const name = `${id}-${Date.now().toString(36)}.mp4`;
  const res = await fetch(`${supabaseUrl}/storage/v1/object/videos/${name}`, { method: 'POST', headers: { ...headers, 'content-type': 'video/mp4', 'x-upsert': 'true' }, body: await readFile(file) });
  if (!res.ok) throw new Error(`Yuklash: ${res.status}`);
  return supabaseUrl.startsWith('https://') ? `${supabaseUrl}/storage/v1/object/public/videos/${name}` : `videos/${name}`;
};

const step = async (): Promise<boolean> => {
  const job = await rpc<RenderJob | null>('svc_video_next');
  if (!job?.id) return false;
  log(`Render: ${job.id} (${job.plots.length} uy)`);
  try {
    const file = await renderJob(job, options);
    await rpc('svc_video_done', { p_id: job.id, p_file: await upload(file, job.id) });
    log(`Tayyor: ${file}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await rpc('svc_video_done', { p_id: job.id, p_file: null, p_error: message });
    log(`Xato: ${message}`);
  }
  return true;
};

const isOnce = process.argv.includes('--once');
do {
  const worked = await step().catch((error: unknown) => {
    log(`Navbat: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  });
  if (!worked && !isOnce) await new Promise((r) => { setTimeout(r, POLL_MS); });
  if (!worked && isOnce) break;
} while (true);
