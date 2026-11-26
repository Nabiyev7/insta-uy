import { deleteAccount, telegramLink, telegramRedeem } from './auth.ts';
import { housePage, waitlist } from './pages.ts';
import { PROVIDERS } from './payments/provider.ts';
import { register, resetFinish, resetStart } from './password.ts';
import { refund, starsLink } from './shop.ts';
import { disputeProof, panelReply } from './support.ts';
import { channelCheck, devAdmin, devTelegram, handleTelegram } from './telegram.ts';
import { HttpError, type Ctx } from './types.ts';
import { webappLogin } from './webapp.ts';
import { json } from './util.ts';

type Handler = (req: Request, ctx: Ctx) => Promise<Response>;

const POST: Readonly<Record<string, Handler>> = {
  '/auth/register': register,
  '/auth/reset/start': resetStart,
  '/auth/reset/finish': resetFinish,
  '/auth/telegram/link': telegramLink,
  '/auth/telegram/redeem': telegramRedeem,
  '/auth/telegram/webapp': webappLogin,
  '/auth/delete': deleteAccount,
  '/waitlist': waitlist,
  '/telegram/webhook': handleTelegram,
  '/dev/telegram': devTelegram,
  '/dev/admin': devAdmin,
  '/coins/channel': channelCheck,
  '/pay/refund': refund,
  '/pay/stars/link': starsLink,
  '/admin/support/reply': panelReply,
  '/admin/dispute/proof': disputeProof,
};

const route = async (req: Request, ctx: Ctx, path: string): Promise<Response> => {
  if (req.method === 'GET') {
    if (path === '/health') return json({ ok: true });
    const house = /^\/uy\/([A-Z0-9]{1,8})$/.exec(path)?.[1];
    if (house) return housePage(req, ctx, house);
    throw new HttpError(404, 'not_found');
  }
  if (req.method !== 'POST') throw new HttpError(405, 'method');
  const pay = /^\/pay\/(card|payme|click)(?:\/(?:prepare|complete))?$/.exec(path)?.[1];
  if (pay) {
    const provider = PROVIDERS.find((p) => p.id === pay);
    if (!provider?.isEnabled(ctx)) throw new HttpError(404, 'not_found');
    return provider.handle(req, ctx, path);
  }
  const handler = Object.hasOwn(POST, path) ? POST[path] : undefined;
  if (!handler) throw new HttpError(404, 'not_found');
  return handler(req, ctx);
};

const corsHeaders = (req: Request, ctx: Ctx): Record<string, string> => {
  const origin = req.headers.get('origin');
  const isAllowed = origin !== null && ctx.env.ALLOWED_ORIGINS.split(',').map((s) => s.trim()).includes(origin);
  return isAllowed ? { 'access-control-allow-origin': origin, vary: 'origin', 'access-control-allow-headers': 'content-type,authorization', 'access-control-allow-methods': 'GET,POST,OPTIONS' } : {};
};

export type ErrorLog = (message: string, error: unknown) => void;

export const handle = async (req: Request, ctx: Ctx, log: ErrorLog): Promise<Response> => {
  const cors = corsHeaders(req, ctx);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  let res: Response;
  try {
    res = await route(req, ctx, new URL(req.url).pathname);
  } catch (error: unknown) {
    // 503 — "xizmat sozlanmagan" degan ataylab kod (telegram_off), tafsilot emas.
    const isKnown = error instanceof HttpError && (error.status < 500 || error.status === 503);
    if (!isKnown) log(`${req.method} ${new URL(req.url).pathname}`, error);
    // Kutilmagan xato tafsiloti tashqariga chiqmaydi.
    res = isKnown ? json({ error: error.message }, error.status) : json({ error: 'server_error' }, error instanceof HttpError ? error.status : 500);
  }
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  headers.set('x-content-type-options', 'nosniff');
  return new Response(res.body, { status: res.status, headers });
};
