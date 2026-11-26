import { flushTgOutbox } from './support.ts';
import { flushBroadcast, flushOutbox } from './telegram.ts';
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

/** Telegram bot fayl chegarasi 50 MB — 45 MB lik bo'laklar. */
export const BACKUP_PART = 45 * 1024 * 1024;
export const gzip = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
export const chunks = (data: Uint8Array, size = BACKUP_PART): readonly Uint8Array[] =>
  Array.from({ length: Math.max(1, Math.ceil(data.length / size)) }, (_, i) => data.subarray(i * size, (i + 1) * size));

/** Kunlik zaxira: omborga JSON, adminning shaxsiy Telegramiga siqilgan (.json.gz, kerak bo'lsa bo'laklab). */
export const backup = async (ctx: Ctx, now = new Date()): Promise<string> => {
  const text = JSON.stringify(await ctx.db.rpc('svc_backup', {}));
  const day = now.toISOString().slice(0, 10);
  const path = `${day}.json`;
  await ctx.db.putFile('backups', path, text, 'application/json');
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (ctx.tg && admin) {
    const parts = chunks(await gzip(text));
    for (const [i, part] of parts.entries()) {
      const name = parts.length === 1 ? `cityland-${day}.json.gz` : `cityland-${day}.json.gz.part${i + 1}`;
      await ctx.tg.document(admin, name, part, `🗄 Zaxira ${day}${parts.length > 1 ? ` (${i + 1}/${parts.length}; birlashtirish: cat *.part* > zaxira.json.gz)` : ''}`);
    }
  }
  return path;
};

const DAILY = '10 22 * * *';

/** Egasi (ADMIN_TELEGRAM_ID) bazada yozilib turadi: boshqa Telegramdagi admin roli ishlamaydi. */
export const syncOwner = async (ctx: Ctx): Promise<boolean> => {
  const owner = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (!Number.isSafeInteger(owner) || owner <= 0) return false;
  await ctx.db.rpc('svc_set_owner', { p_telegram: owner });
  return true;
};

/** Bitta ish yiqilsa, qolganlari davom etadi. */
export const runCron = async (ctx: Ctx, cron: string): Promise<readonly string[]> => {
  const jobs: readonly (readonly [string, () => Promise<unknown>])[] = cron === DAILY
    ? [['backup', () => backup(ctx)], ['comments', () => collectComments(ctx)]]
    : [['owner', () => syncOwner(ctx)], ['tick', () => ctx.db.rpc('svc_tick', {})], ['outbox', () => flushOutbox(ctx)], ['broadcast', () => flushBroadcast(ctx)], ['tg_outbox', () => flushTgOutbox(ctx)], ['videos', () => sendVideos(ctx)]];
  const results = await Promise.allSettled(jobs.map(([, run]) => run()));
  return results.flatMap((r, i) => (r.status === 'rejected' ? [`${jobs[i]?.[0]}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`] : []));
};
