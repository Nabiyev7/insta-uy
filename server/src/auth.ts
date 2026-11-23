import { z } from 'zod';
import { loginEmail, parseLogin, parsePassword } from '../../packages/shared/src/validation.ts';
import { HttpError, type Ctx } from './types.ts';
import { json, keyed, limit, randomPassword, randomToken, readJson, requireUser } from './util.ts';

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
  if (!ctx.env.TURNSTILE_SECRET) return;
  const body = new URLSearchParams({ secret: ctx.env.TURNSTILE_SECRET, response: token ?? '', remoteip: ctx.ip });
  const res = await ctx.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const data = (await res.json()) as { success?: boolean };
  if (!data.success) throw new HttpError(403, 'bot_check');
};

/** Akkaunt va profil birga yaratiladi; profil yaratilmasa akkaunt qaytariladi. */
const createAccount = async (ctx: Ctx, login: string, password: string, ref: string | null, telegram: number | null): Promise<string> => {
  const user = await ctx.db.createUser(loginEmail(login), password);
  try {
    await ctx.db.rpc('svc_profile_create', { p_user: user.id, p_login: login, p_ref: ref, p_telegram: telegram });
  } catch (error: unknown) {
    await ctx.db.deleteUser(user.id);
    throw error;
  }
  return user.id;
};

const registerSchema = z.object({ login: z.string().max(60), password: z.string().max(200), ref: z.string().max(20).nullish(), captcha: z.string().max(3000).optional() });
export const register = async (req: Request, ctx: Ctx): Promise<Response> => {
  const body = await readJson(req, registerSchema);
  const login = loginOf(body.login);
  const password = passwordOf(body.password);
  await limit(ctx, 'register', 5, 3600);
  await checkTurnstile(ctx, body.captcha);
  if (login.startsWith('deleted_') || !(await ctx.db.rpc<boolean>('svc_login_free', { p_login: login }))) throw new HttpError(409, 'login_taken');
  await createAccount(ctx, login, password, body.ref ?? null, null);
  return json({ ok: true });
};

const botUrl = (ctx: Ctx, param: string): string => `https://t.me/${ctx.env.TELEGRAM_BOT ?? ''}?start=${param}`;

export const telegramStart = async (_req: Request, ctx: Ctx): Promise<Response> => {
  if (!ctx.env.TELEGRAM_BOT) throw new HttpError(503, 'telegram_off');
  await limit(ctx, 'tgstart', 20, 3600);
  const token = randomToken();
  await ctx.db.rpc('svc_tg_begin', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_purpose: 'login' });
  return json({ token, url: botUrl(ctx, `login_${token}`) });
};

export const telegramLink = async (req: Request, ctx: Ctx): Promise<Response> => {
  if (!ctx.env.TELEGRAM_BOT) throw new HttpError(503, 'telegram_off');
  const user = await requireUser(req, ctx);
  await limit(ctx, 'tglink', 10, 3600, user.id);
  const token = randomToken();
  await ctx.db.rpc('svc_tg_begin', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_purpose: 'link', p_user: user.id });
  return json({ url: botUrl(ctx, `link_${token}`) });
};

interface Consumed { readonly state: 'waiting' | 'expired' | 'ok'; readonly telegram?: number; readonly user?: string | null }
const pollSchema = z.object({ token: z.string().regex(/^[0-9a-f]{32}$/), ref: z.string().max(20).nullish() });

export const telegramPoll = async (req: Request, ctx: Ctx): Promise<Response> => {
  const { token, ref } = await readJson(req, pollSchema);
  await limit(ctx, 'tgpoll', 120, 60);
  const r = await ctx.db.rpc<Consumed>('svc_tg_consume', { p_hash: keyed(ctx.env.HASH_SECRET, token) });
  if (r.state !== 'ok' || !r.telegram) return json({ state: r.state });
  const userId = r.user ?? (await createAccount(ctx, `tg${r.telegram}`, randomPassword(), ref ?? null, r.telegram));
  const email = await ctx.db.emailOf(userId);
  if (!email) throw new HttpError(404, 'user_not_found');
  return json({ state: 'ok', token_hash: await ctx.db.magicToken(email) });
};

const resetStartSchema = z.object({ login: z.string().max(60) });
/** Login bor-yo'qligi oshkor qilinmaydi: javob doim bir xil. Kodni bot yuboradi. */
export const resetStart = async (req: Request, ctx: Ctx): Promise<Response> => {
  await readJson(req, resetStartSchema);
  await limit(ctx, 'reset', 10, 3600);
  return json({ ok: true, url: ctx.env.TELEGRAM_BOT ? botUrl(ctx, 'reset') : null });
};

const resetSchema = z.object({ login: z.string().max(60), code: z.string().regex(/^\d{6}$/), password: z.string().max(200) });
export const resetFinish = async (req: Request, ctx: Ctx): Promise<Response> => {
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

export const deleteAccount = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  await ctx.db.rpc('svc_delete_account', { p_user: user.id });
  await ctx.db.deleteUser(user.id);
  return json({ ok: true });
};
