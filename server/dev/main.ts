/** Lokal muhit: baza + Supabase emulyatori + Worker + ko'p o'yinchi — bitta portda (127.0.0.1). */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handle } from '../src/app.ts';
import { runCron } from '../src/cron.ts';
import { attachRealtime } from '../src/realtime/server.ts';
import { supabaseBackend } from '../src/supabase.ts';
import { telegramApi } from '../src/telegram.ts';
import type { Ctx, Env } from '../src/types.ts';
import { openDb } from './db.ts';
import { seedDemo } from './demo.ts';
import { createEmulator, makeKeys } from './supabase-emu.ts';

/** Faqat localhost uchun; ishlab chiqarishda Supabase'ning o'z kalitlari ishlatiladi. */
const DEV_SECRET = 'local-development-only-secret';
const ADMIN = { login: 'admin', password: 'admin12345' } as const;

const port = Number(process.env.PORT ?? 8787);
const dataRoot = process.env.DEV_DATA ?? fileURLToPath(new URL('../../.dev-data', import.meta.url));
const isFresh = !existsSync(path.join(dataRoot, 'db'));
mkdirSync(dataRoot, { recursive: true });
const db = await openDb(path.join(dataRoot, 'db'));
const keys = makeKeys(DEV_SECRET);
const emulator = createEmulator(db, keys, path.join(dataRoot, 'storage'));
const base = `http://127.0.0.1:${port}`;
const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173,http://localhost:5174').split(',');

const env: Env = {
  ...(process.env as unknown as Env), SUPABASE_URL: base, SUPABASE_SERVICE_KEY: keys.service, SITE_URL: process.env.SITE_URL ?? 'http://localhost:5173', ADMIN_URL: process.env.ADMIN_URL ?? 'http://localhost:5174',
  ALLOWED_ORIGINS: origins.join(','), HASH_SECRET: DEV_SECRET, DEV: '1',
};
const emuFetch: typeof fetch = (input, init) => emulator(new Request(input as string, init));
const backend = supabaseBackend(env, emuFetch);
const ctx = (ip: string): Ctx => ({ env, db: backend, tg: env.TELEGRAM_TOKEN ? telegramApi(env.TELEGRAM_TOKEN) : null, ip, fetch: (...a) => fetch(...a) });
const logError = (message: string, error: unknown): void => { process.stderr.write(`${message}: ${error instanceof Error ? error.message : String(error)}\n`); };

const toRequest = async (req: IncomingMessage): Promise<Request> => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const headers = new Headers(Object.entries(req.headers).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v] as [string, string]] : [])));
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0;
  return new Request(`${base}${req.url ?? '/'}`, { method: req.method ?? 'GET', headers, ...(hasBody ? { body: Buffer.concat(chunks) } : {}) });
};
const serve = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const request = await toRequest(req);
  const isEmulator = /^\/(rest|auth|storage)\/v1\//.test(new URL(request.url).pathname);
  const out = isEmulator ? await emulator(request) : await handle(request, ctx(req.socket.remoteAddress ?? 'local'), logError);
  res.writeHead(out.status, Object.fromEntries(out.headers));
  res.end(Buffer.from(await out.arrayBuffer()));
};

const http = createServer((req, res) => {
  if (req.url?.startsWith('/socket.io')) return;
  serve(req, res).catch((error: unknown) => {
    logError('dev', error);
    res.writeHead(500).end();
  });
});
attachRealtime(http, backend, ['*'], (e) => logError('realtime', e));

if (isFresh) {
  const user = await backend.createUser(`${ADMIN.login}@login.citylanduz.uz`, ADMIN.password);
  await backend.rpc('svc_profile_create', { p_user: user.id, p_login: ADMIN.login });
  await db.query("update profiles set role = 'admin', coins = 50000 where user_id = $1", [user.id]);
  // Shahar bo'sh ochiladi (docs/chat/UYLAR-BEZAK-PROMT.md §1). Sinov aholisi faqat DEMO=1 bilan.
  if (process.env.DEMO === '1') await seedDemo(db);
}
setInterval(() => { void runCron(ctx('cron'), '*/10 * * * *').then((e) => e.forEach((m) => logError('cron', m))); }, 600_000);
http.listen(port, '127.0.0.1', () => {
  process.stdout.write(`API: ${base}\nANON=${keys.anon}\nSERVICE=${keys.service}\nAdmin: ${ADMIN.login} / ${ADMIN.password}\n`);
});
