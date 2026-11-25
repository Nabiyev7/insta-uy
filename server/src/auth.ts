import { z } from 'zod';
import { loginEmail } from '../../packages/shared/src/validation.ts';
import { HttpError, type Ctx } from './types.ts';
import { json, keyed, limit, randomToken, readJson, requireUser } from './util.ts';

/** Akkaunt va profil birga yaratiladi; profil yaratilmasa akkaunt qaytariladi. Kirish faqat Telegram bot orqali (parolni hech kim bilmaydi). */
export const createAccount = async (ctx: Ctx, login: string, password: string, ref: string | null, telegram: number | null, instagram: string | null = null): Promise<string> => {
  const user = await ctx.db.createUser(loginEmail(login), password);
  try {
    await ctx.db.rpc('svc_profile_create', { p_user: user.id, p_login: login, p_ref: ref, p_telegram: telegram, p_instagram: instagram });
  } catch (error: unknown) {
    await ctx.db.deleteUser(user.id);
    throw error;
  }
  return user.id;
};

const botUrl = (ctx: Ctx, param: string): string => `https://t.me/${ctx.env.TELEGRAM_BOT ?? ''}?start=${param}`;

/** Eski (parolli) akkauntni Telegram'ga ulash: bot tasdiq so'raydi. */
export const telegramLink = async (req: Request, ctx: Ctx): Promise<Response> => {
  if (!ctx.env.TELEGRAM_BOT) throw new HttpError(503, 'telegram_off');
  const user = await requireUser(req, ctx);
  await limit(ctx, 'tglink', 10, 3600, user.id);
  const token = randomToken();
  await ctx.db.rpc('svc_tg_begin', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_purpose: 'link', p_user: user.id });
  return json({ url: botUrl(ctx, `link_${token}`) });
};

const redeemSchema = z.object({ token: z.string().regex(/^[0-9a-f]{32}$/) });
/** Bot yuborgan bir martalik havola → Supabase sessiyasi. Takror ishlatib bo'lmaydi. */
export const telegramRedeem = async (req: Request, ctx: Ctx): Promise<Response> => {
  const { token } = await readJson(req, redeemSchema);
  await limit(ctx, 'redeem', 30, 3600);
  const user = await ctx.db.rpc<string | null>('svc_login_redeem', { p_hash: keyed(ctx.env.HASH_SECRET, token) });
  if (!user) throw new HttpError(400, 'expired');
  const email = await ctx.db.emailOf(user);
  if (!email) throw new HttpError(404, 'user_not_found');
  return json({ token_hash: await ctx.db.magicToken(email) });
};

export const deleteAccount = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  await ctx.db.rpc('svc_delete_account', { p_user: user.id });
  await ctx.db.deleteUser(user.id);
  return json({ ok: true });
};
