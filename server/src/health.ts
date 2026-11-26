/** Kuzatuv (13-qadam, D): cron har 10 daqiqada sayt, Supabase va jonli serverni tekshiradi (Render shu bilan uxlamaydi).
 *  Ketma-ket 2 marta xato bo'lsa — egasiga botda "⚠️ X ishlamayapti" (har biri uchun soatiga ko'pi bilan 1 ta). */
import { z } from 'zod';
import { HttpError, type Ctx } from './types.ts';
import { json, limit, readJson } from './util.ts';

export const RETRY_MS = 20_000;
const TIMEOUT_MS = 15_000;
const ALERT_EVERY_S = 3600;

export interface Target { readonly name: string; readonly check: () => Promise<boolean> }
const okUrl = (ctx: Ctx, url: string) => async (): Promise<boolean> => (await ctx.fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })).ok;
export const targets = (ctx: Ctx): readonly Target[] => [
  { name: 'Sayt', check: okUrl(ctx, ctx.env.SITE_URL) },
  { name: 'Baza (Supabase)', check: async () => { await ctx.db.rpc('api_sets', {}); return true; } },
  // Render bepul tarifi 15 daqiqa bo'sh tursa uxlaydi — shu so'rov uni uyg'oq tutadi.
  ...(ctx.env.REALTIME_URL ? [{ name: 'Jonli server (Render)', check: okUrl(ctx, ctx.env.REALTIME_URL) }] : []),
];

const isUp = async (t: Target): Promise<boolean> => { try { return await t.check(); } catch { return false; } };
const pause = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });

/** Bir soatda bitta ogohlantirish: bazada (workers.dev'da Cache API ishlamaydi). Baza o'zi ishlamasa — shu isolate xotirasi. */
const sentAt = new Map<string, number>();
const canAlert = async (ctx: Ctx, name: string, now: number): Promise<boolean> => {
  try {
    return await ctx.db.rpc<boolean>('svc_health_alert', { p_name: name });
  } catch {
    const last = sentAt.get(name);
    if (last !== undefined && now - last < ALERT_EVERY_S * 1000) return false;
    sentAt.set(name, now);
    return true;
  }
};

/** Natija: ishlamayotganlar ro'yxati (cron logida ko'rinadi). */
export const healthCheck = async (ctx: Ctx, list: readonly Target[] = targets(ctx), retryMs = RETRY_MS, now = Date.now()): Promise<readonly string[]> => {
  const first = await Promise.all(list.map(isUp));
  const failed = list.filter((_, i) => !first[i]);
  if (failed.length === 0) return [];
  await pause(retryMs);
  const down = (await Promise.all(failed.map(async (t) => ((await isUp(t)) ? null : t.name)))).filter((n): n is string => n !== null);
  const owner = Number(ctx.env.ADMIN_TELEGRAM_ID);
  for (const name of down) {
    if (ctx.tg && owner && (await canAlert(ctx, name, now))) await ctx.tg.send(owner, `⚠️ ${name} ishlamayapti (2 marta ketma-ket tekshirildi). / ${name} не работает.`);
  }
  return down;
};

// ---------- D4. Mijoz xatolari (saytdan) ----------
const logSchema = z.object({ message: z.string().min(1).max(2000), place: z.string().max(300).optional(), ua: z.string().max(300).optional() });
/** POST /log — saytdagi xato; bitta IP dan soatiga 30 ta, bazada kuniga chegarali. */
export const clientLog = async (req: Request, ctx: Ctx): Promise<Response> => {
  const body = await readJson(req, logSchema);
  await limit(ctx, 'log', 30, 3600);
  const isSaved = await ctx.db.rpc<boolean>('svc_log_error', { p_message: body.message, p_place: body.place ?? null, p_ua: body.ua ?? null });
  if (!isSaved) throw new HttpError(429, 'rate_limited');
  return json({ ok: true });
};
