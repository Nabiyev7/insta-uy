/** POST /photo/send (19-qadam): Foto rejimidagi rasm — bot uni foydalanuvchining o'ziga chatga yuboradi (saqlash yoki do'stga uzatish uchun),
 *  ostida taklif havolasi va "Do'stga yuborish" tugmasi. Eski Telegram (downloadFile / shareToStory yo'q) va boshqa muhitlar uchun zaxira yo'l. */
import { z } from 'zod';
import { bt, type Lang } from './botText.ts';
import { HttpError, type Ctx } from './types.ts';
import { json, limit, readJson, requireUser } from './util.ts';

const bodySchema = z.object({ path: z.string().max(120) });
/** Faqat o'z papkasidagi rasm: `<user_id>/<uuid>.jpg|png`. */
export const isOwnShot = (path: string, userId: string): boolean => new RegExp(String.raw`^${userId}/[0-9a-f-]{36}\.(jpg|png)$`).test(path);

interface PhotoCtx { readonly telegram: number | null; readonly ref: string; readonly lang: string }

export const photoSend = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  await limit(ctx, 'photo', 20, 3600, user.id);
  const { path } = await readJson(req, bodySchema);
  if (!isOwnShot(path, user.id)) throw new HttpError(400, 'bad_format');
  const info = await ctx.db.rpc<PhotoCtx | null>('svc_photo_ctx', { p_user: user.id });
  if (!info?.telegram || !ctx.tg?.photoButtons) throw new HttpError(409, 'no_telegram');
  const lang: Lang = info.lang === 'ru' ? 'ru' : 'uz';
  const bot = String((await ctx.db.rpc<string | null>('svc_setting', { p_key: 'telegram_bot' })) ?? ctx.env.TELEGRAM_BOT ?? '').replace(/^@/, '');
  const link = `https://t.me/${bot}?start=r_${info.ref}`;
  const share = `https://t.me/share/url?${new URLSearchParams({ url: link, text: bt(lang, 'shareText') }).toString()}`;
  const url = `${ctx.env.SUPABASE_URL}/storage/v1/object/public/shots/${path}`;
  await ctx.tg.photoButtons(info.telegram, url, bt(lang, 'photoCaption', { link }), [{ text: bt(lang, 'btnShare'), url: share }]);
  return json({ ok: true });
};
