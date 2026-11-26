/** Telegram Mini App: sayt bot ichida ochilganda avtomatik kirish. `initData` bot tokeni bilan HMAC-SHA256 orqali tekshiriladi (Telegram hujjatidagi tartib). */
import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { HttpError, type Ctx } from './types.ts';
import { json, limit, readJson, safeEqual } from './util.ts';

/** `auth_date` shundan eski bo'lsa — rad (24 soat). */
export const INIT_MAX_AGE_S = 24 * 60 * 60;

export interface WebAppUser { readonly id: number; readonly language_code?: string; readonly first_name?: string }
const userSchema = z.object({ id: z.number().int().positive(), language_code: z.string().max(10).optional(), first_name: z.string().max(100).optional() });

/** Imzo to'g'ri va eskirmagan bo'lsa — foydalanuvchi; aks holda null. */
export const verifyInitData = (initData: string, botToken: string, nowS = Math.floor(Date.now() / 1000)): WebAppUser | null => {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const check = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(check).digest('hex');
  if (!safeEqual(expected, hash)) return null;
  const authDate = Number(params.get('auth_date'));
  if (!Number.isFinite(authDate) || nowS - authDate > INIT_MAX_AGE_S || authDate - nowS > 300) return null;
  try {
    const user = userSchema.safeParse(JSON.parse(params.get('user') ?? 'null'));
    return user.success ? user.data : null;
  } catch {
    return null;
  }
};

const bodySchema = z.object({ init_data: z.string().min(10).max(4096) });
interface SvcUser { readonly user_id: string; readonly is_banned: boolean; readonly instagram: string | null }
/** POST /auth/telegram/webapp → Supabase sessiyasi. Akkaunt (nik) yo'q bo'lsa — 404 need_nick (sayt botga qaytaradi). */
export const webappLogin = async (req: Request, ctx: Ctx): Promise<Response> => {
  const { init_data: initData } = await readJson(req, bodySchema);
  await limit(ctx, 'webapp', 60, 3600);
  if (!ctx.env.TELEGRAM_TOKEN) throw new HttpError(503, 'telegram_off');
  const user = verifyInitData(initData, ctx.env.TELEGRAM_TOKEN);
  if (!user) throw new HttpError(401, 'bad_signature');
  const u = await ctx.db.rpc<SvcUser | null>('svc_user', { p_telegram: user.id });
  if (!u?.instagram) throw new HttpError(404, 'need_nick');
  if (u.is_banned) throw new HttpError(403, 'banned');
  const email = await ctx.db.emailOf(u.user_id);
  if (!email) throw new HttpError(404, 'need_nick');
  return json({ token_hash: await ctx.db.magicToken(email) });
};
