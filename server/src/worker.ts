/** Cloudflare Worker kirish nuqtasi. */
import { handle } from './app.ts';
import { runCron } from './cron.ts';
import { supabaseBackend } from './supabase.ts';
import { telegramApi } from './telegram.ts';
import type { Ctx, Env } from './types.ts';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'SITE_URL', 'ALLOWED_ORIGINS', 'HASH_SECRET'] as const;

const context = (env: Env, ip: string): Ctx => {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length > 0) throw new Error(`Sozlanmagan: ${missing.join(', ')}`);
  return { env, db: supabaseBackend(env), tg: env.TELEGRAM_TOKEN ? telegramApi(env.TELEGRAM_TOKEN) : null, ip, fetch: (...a) => fetch(...a) };
};
const log = (message: string, error: unknown): void => {
  console.error(message, error instanceof Error ? error.message : error);
};

export default {
  fetch: (req: Request, env: Env): Promise<Response> => handle(req, context(env, req.headers.get('cf-connecting-ip') ?? 'unknown'), log),
  scheduled: async (event: { readonly cron: string }, env: Env): Promise<void> => {
    const errors = await runCron(context(env, 'cron'), event.cron);
    if (errors.length > 0) throw new Error(errors.join('; '));
  },
};
