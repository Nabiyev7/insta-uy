/** Mustaqil ko'p o'yinchi server: `node server/src/realtime/main.ts` (Render/Fly/Oracle bepul tarifi). */
import { createServer } from 'node:http';
import { supabaseBackend } from '../supabase.ts';
import type { Env } from '../types.ts';
import { attachRealtime } from './server.ts';

const env = process.env as unknown as Env & { PORT?: string };
for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'ALLOWED_ORIGINS'] as const) {
  if (!env[key]) throw new Error(`${key} sozlanmagan`);
}
const http = createServer((_req, res) => { res.end('ok'); });
attachRealtime(http, supabaseBackend(env), env.ALLOWED_ORIGINS.split(','), (e) => console.error('realtime', e instanceof Error ? e.message : e));
http.listen(Number(env.PORT ?? 8788));
