import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { z } from 'zod';
import { HttpError, type AuthUser, type Ctx } from './types.ts';

export const md5 = (s: string): string => createHash('md5').update(s).digest('hex');
export const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
export const keyed = (secret: string, s: string): string => createHmac('sha256', secret).update(s).digest('hex');
export const randomToken = (): string => randomBytes(16).toString('hex');
export const randomCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');
export const randomPassword = (): string => randomBytes(24).toString('base64url');

/** Uzunlik ham sizib chiqmasin: avval xesh. */
export const safeEqual = (a: string, b: string): boolean =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const MAX_BODY = 16_384;

export const readText = async (req: Request): Promise<string> => {
  const text = await req.text();
  if (text.length > MAX_BODY) throw new HttpError(413, 'too_long');
  return text;
};
export const readJson = async <T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> => {
  let raw: unknown;
  try {
    raw = JSON.parse(await readText(req));
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'bad_json');
  }
  const r = schema.safeParse(raw);
  if (!r.success) throw new HttpError(400, 'bad_format');
  return r.data;
};

/** IP ochiq saqlanmaydi — kalitlangan xesh. */
export const limit = async (ctx: Ctx, name: string, max: number, seconds: number, subject: string = ctx.ip): Promise<void> => {
  const isAllowed = await ctx.db.rpc<boolean>('svc_rate', { p_key: `${name}:${keyed(ctx.env.HASH_SECRET, subject).slice(0, 24)}`, p_max: max, p_seconds: seconds });
  if (!isAllowed) throw new HttpError(429, 'rate_limited');
};

export const requireUser = async (req: Request, ctx: Ctx): Promise<AuthUser> => {
  const jwt = /^Bearer (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1];
  const user = jwt ? await ctx.db.userByJwt(jwt) : null;
  if (!user) throw new HttpError(401, 'not_signed_in');
  return user;
};

export const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);
