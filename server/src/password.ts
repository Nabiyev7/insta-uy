/** Login + parol yo'li (ro'yxat, parolni tiklash). Kodda saqlanadi, lekin admin sozlamasi `password_login` (sukut — false) ortida: o'chiq bo'lsa hamma endpoint 403. */
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { parseLogin, parsePassword } from '../../packages/shared/src/validation.ts';
import { createAccount } from './auth.ts';
import { bt, type Lang } from './botText.ts';
import { HttpError, type Ctx, type Telegram } from './types.ts';
import { json, keyed, limit, readJson } from './util.ts';

/** Sozlama serverda tekshiriladi (faqat UI'da emas). */
export const requirePasswordLogin = async (ctx: Ctx): Promise<void> => {
  if (!(await ctx.db.rpc<boolean>('svc_password_login', {}))) throw new HttpError(403, 'password_off');
};

const loginOf = (raw: string): string => {
  const r = parseLogin(raw);
  if (!r.ok) throw new HttpError(400, `login_${r.code}`);
  return r.value;
};
const passwordOf = (raw: string): string => {
  const r = parsePassword(raw);
  if (!r.ok) throw new HttpError(400, `password_${r.code}`);
  return r.value;
};

const checkTurnstile = async (ctx: Ctx, token: string | undefined): Promise<void> => {
  if (!ctx.env.TURNSTILE_SECRET) {
    // Himoyasiz ro'yxat faqat lokalda; ishlab chiqarishda sozlanmagan bo'lsa yopiq turadi.
    if (ctx.env.DEV === '1') return;
    throw new HttpError(503, 'bot_check');
  }
  const body = new URLSearchParams({ secret: ctx.env.TURNSTILE_SECRET, response: token ?? '', remoteip: ctx.ip });
  const res = await ctx.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) throw new HttpError(403, 'bot_check');
};

const registerSchema = z.object({ login: z.string().max(60), password: z.string().max(200), ref: z.string().max(20).nullish(), captcha: z.string().max(3000).optional() });
export const register = async (req: Request, ctx: Ctx): Promise<Response> => {
  await requirePasswordLogin(ctx);
  const body = await readJson(req, registerSchema);
  const login = loginOf(body.login);
  const password = passwordOf(body.password);
  await limit(ctx, 'register', 5, 3600);
  await checkTurnstile(ctx, body.captcha);
  // "tg<raqam>" Telegram orqali kirganlar uchun ajratilgan.
  if (/^(deleted_|tg\d+$)/.test(login) || !(await ctx.db.rpc<boolean>('svc_login_free', { p_login: login }))) throw new HttpError(409, 'login_taken');
  await createAccount(ctx, login, password, body.ref ?? null, null);
  return json({ ok: true });
};

const botUrl = (ctx: Ctx, param: string): string => `https://t.me/${ctx.env.TELEGRAM_BOT ?? ''}?start=${param}`;
const resetStartSchema = z.object({ login: z.string().max(60) });
/** Login bor-yo'qligi oshkor qilinmaydi: javob doim bir xil. Kodni bot yuboradi. */
export const resetStart = async (req: Request, ctx: Ctx): Promise<Response> => {
  await requirePasswordLogin(ctx);
  await readJson(req, resetStartSchema);
  await limit(ctx, 'reset', 10, 3600);
  return json({ ok: true, url: ctx.env.TELEGRAM_BOT ? botUrl(ctx, 'reset') : null });
};

const resetSchema = z.object({ login: z.string().max(60), code: z.string().regex(/^\d{6}$/), password: z.string().max(200) });
export const resetFinish = async (req: Request, ctx: Ctx): Promise<Response> => {
  await requirePasswordLogin(ctx);
  const body = await readJson(req, resetSchema);
  const password = passwordOf(body.password);
  await limit(ctx, 'resetf', 10, 3600);
  const user = await ctx.db.rpc<{ user_id: string } | null>('svc_user', { p_login: body.login.trim().toLowerCase() });
  if (!user) throw new HttpError(400, 'bad_code');
  const isValid = await ctx.db.rpc<boolean>('svc_reset_check', { p_user: user.user_id, p_code_hash: keyed(ctx.env.HASH_SECRET, `${user.user_id}:${body.code}`) });
  if (!isValid) throw new HttpError(400, 'bad_code');
  await ctx.db.setPassword(user.user_id, password);
  return json({ ok: true });
};

const randomCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');
/** Bot: /parol — parolni tiklash kodi (faqat parol yo'li yoqilgan bo'lsa). */
export const sendReset = async (ctx: Ctx, tg: Telegram, telegramId: number, lang: Lang = 'uz'): Promise<void> => {
  if (!(await ctx.db.rpc<boolean>('svc_password_login', {}))) return tg.send(telegramId, bt(lang, 'resetOff'));
  const user = await ctx.db.rpc<{ user_id: string; login: string } | null>('svc_user', { p_telegram: telegramId });
  if (!user) return tg.send(telegramId, bt(lang, 'resetNoUser'));
  const code = randomCode();
  await ctx.db.rpc('svc_reset_begin', { p_user: user.user_id, p_code_hash: keyed(ctx.env.HASH_SECRET, `${user.user_id}:${code}`) });
  return tg.send(telegramId, bt(lang, 'resetCode', { login: user.login, code }));
};
