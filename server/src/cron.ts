import { flushOutbox } from './telegram.ts';
import type { Ctx } from './types.ts';

/** Instagram kommentlaridan niklar — faqat rasmiy Meta Graph API (PLAN §4 v3). */
export const collectComments = async (ctx: Ctx): Promise<number> => {
  const { META_TOKEN, META_MEDIA_IDS } = ctx.env;
  if (!META_TOKEN || !META_MEDIA_IDS) return 0;
  const ids = META_MEDIA_IDS.split(',').map((s) => s.trim()).filter((s) => /^\d+$/.test(s));
  const pages = await Promise.all(ids.map(async (id) => {
    const res = await ctx.fetch(`https://graph.facebook.com/v23.0/${id}/comments?fields=username&limit=100`, { headers: { authorization: `Bearer ${META_TOKEN}` } });
    if (!res.ok) throw new Error(`meta ${id}: ${res.status}`);
    return ((await res.json()) as { data?: readonly { username?: string }[] }).data ?? [];
  }));
  const nicks = [...new Set(pages.flat().map((c) => c.username).filter((u): u is string => typeof u === 'string'))];
  return nicks.length > 0 ? ctx.db.rpc<number>('svc_gazette_candidates', { p_nicks: nicks }) : 0;
};

interface Sendable { readonly id: string; readonly file: string | null; readonly style: { readonly title?: string } }
export const sendVideos = async (ctx: Ctx): Promise<number> => {
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (!ctx.tg || !admin) return 0;
  const tg = ctx.tg;
  const list = (await ctx.db.rpc<readonly Sendable[]>('svc_video_sendable', {})).filter((v) => v.file?.startsWith('https://'));
  await Promise.all(list.map((v) => tg.video(admin, v.file ?? '', v.style.title ?? '')));
  return list.length;
};

export const backup = async (ctx: Ctx, now = new Date()): Promise<string> => {
  const data = await ctx.db.rpc('svc_backup', {});
  const path = `${now.toISOString().slice(0, 10)}.json`;
  await ctx.db.putFile('backups', path, JSON.stringify(data), 'application/json');
  return path;
};

const DAILY = '10 22 * * *';

/** Bitta ish yiqilsa, qolganlari davom etadi. */
export const runCron = async (ctx: Ctx, cron: string): Promise<readonly string[]> => {
  const jobs: readonly (readonly [string, () => Promise<unknown>])[] = cron === DAILY
    ? [['backup', () => backup(ctx)], ['comments', () => collectComments(ctx)]]
    : [['tick', () => ctx.db.rpc('svc_tick', {})], ['outbox', () => flushOutbox(ctx)], ['videos', () => sendVideos(ctx)]];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  return results.flatMap((r, i) => (r.status === 'rejected' ? [`${jobs[i]?.[0]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`] : []));
};
