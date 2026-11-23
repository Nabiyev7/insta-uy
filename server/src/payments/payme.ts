/** Payme Merchant API (JSON-RPC). account.order = buyurtma UUID; summa tiyinda. */
import { z } from 'zod';
import { HttpError, type Ctx } from '../types.ts';
import { json, readJson, safeEqual } from '../util.ts';

const uuid = z.uuid();
const requestSchema = z.object({
  id: z.union([z.number(), z.string()]).nullish(),
  method: z.string(),
  params: z.object({
    id: z.string().max(60).optional(), time: z.number().optional(), amount: z.number().optional(), reason: z.number().optional(),
    account: z.object({ order: z.string() }).partial().optional(), from: z.number().optional(), to: z.number().optional(),
  }).default({}),
});
type Params = z.infer<typeof requestSchema>['params'];

interface Tx { readonly ext_id: string; readonly order_id: string; readonly amount: number; readonly state: number; readonly create_time: number; readonly perform_time: number; readonly cancel_time: number; readonly reason: number | null; readonly error?: string }
interface Order { readonly pay_amount: number; readonly status: string; readonly provider: string; readonly expires_at: string }

class PaymeError extends Error {
  readonly code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}
const ORDER_NOT_FOUND = -31050;
const TIMEOUT_MS = 43_200_000;

const soums = (p: Params): number => {
  if (p.amount === undefined || p.amount % 100 !== 0) throw new PaymeError(-31001, 'amount');
  return p.amount / 100;
};
const orderId = (p: Params): string => {
  const r = uuid.safeParse(p.account?.order);
  if (!r.success) throw new PaymeError(ORDER_NOT_FOUND, 'order');
  return r.data;
};
const txId = (p: Params): string => {
  if (!p.id) throw new PaymeError(-31003, 'transaction');
  return p.id;
};
const findTx = async (ctx: Ctx, p: Params): Promise<Tx> => {
  const t = await ctx.db.rpc<Tx | null>('svc_tx', { p_provider: 'payme', p_ext: txId(p) });
  if (!t) throw new PaymeError(-31003, 'transaction');
  return t;
};
const times = (t: Tx): Record<string, unknown> => ({
  create_time: t.create_time, perform_time: t.perform_time, cancel_time: t.cancel_time, transaction: t.ext_id, state: t.state, reason: t.reason,
});

const METHODS: Readonly<Record<string, (ctx: Ctx, p: Params) => Promise<unknown>>> = {
  CheckPerformTransaction: async (ctx, p) => {
    const o = await ctx.db.rpc<Order | null>('svc_order', { p_id: orderId(p) });
    if (!o || o.status !== 'pending' || o.provider !== 'payme' || Date.parse(o.expires_at) < Date.now()) throw new PaymeError(ORDER_NOT_FOUND, 'order');
    if (o.pay_amount !== soums(p)) throw new PaymeError(-31001, 'amount');
    return { allow: true };
  },
  CreateTransaction: async (ctx, p) => {
    const t = await ctx.db.rpc<Tx>('svc_tx_create', { p_provider: 'payme', p_ext: txId(p), p_order: orderId(p), p_amount: soums(p), p_time: p.time ?? Date.now() });
    if (t.error === 'amount') throw new PaymeError(-31001, 'amount');
    if (t.error === 'busy') throw new PaymeError(-31099, 'busy');
    if (t.error) throw new PaymeError(ORDER_NOT_FOUND, 'order');
    if (t.state !== 1 || Date.now() - t.create_time > TIMEOUT_MS) throw new PaymeError(-31008, 'state');
    return { create_time: t.create_time, transaction: t.ext_id, state: t.state };
  },
  PerformTransaction: async (ctx, p) => {
    await findTx(ctx, p);
    const t = await ctx.db.rpc<Tx>('svc_tx_perform', { p_provider: 'payme', p_ext: txId(p) });
    if (t.error) throw new PaymeError(-31008, 'state');
    return { transaction: t.ext_id, perform_time: t.perform_time, state: t.state };
  },
  CancelTransaction: async (ctx, p) => {
    await findTx(ctx, p);
    const t = await ctx.db.rpc<Tx>('svc_tx_cancel', { p_provider: 'payme', p_ext: txId(p), p_reason: p.reason ?? 0 });
    if (t.error) throw new PaymeError(-31007, 'done');
    return { transaction: t.ext_id, cancel_time: t.cancel_time, state: t.state };
  },
  CheckTransaction: async (ctx, p) => times(await findTx(ctx, p)),
  GetStatement: async (ctx, p) => {
    const list = await ctx.db.rpc<readonly Tx[]>('svc_tx_list', { p_provider: 'payme', p_from: p.from ?? 0, p_to: p.to ?? Date.now() });
    return { transactions: list.map((t) => ({ id: t.ext_id, time: t.create_time, amount: t.amount * 100, account: { order: t.order_id }, ...times(t) })) };
  },
};

const isAuthorized = (req: Request, key: string): boolean => {
  const b64 = /^Basic (.+)$/.exec(req.headers.get('authorization') ?? '')?.[1] ?? '';
  try {
    return safeEqual(atob(b64), `Paycom:${key}`);
  } catch {
    return false; // noto'g'ri base64
  }
};

/** Payme protokoli: xato ham HTTP 200 bilan qaytadi. */
export const handlePayme = async (req: Request, ctx: Ctx): Promise<Response> => {
  const fail = (id: unknown, code: number, message: string): Response => json({ jsonrpc: '2.0', id: id ?? null, error: { code, message: { uz: message, ru: message, en: message } } });
  if (!isAuthorized(req, ctx.env.PAYME_KEY ?? '')) return fail(null, -32504, 'auth');
  let body: z.infer<typeof requestSchema>;
  try {
    body = await readJson(req, requestSchema);
  } catch (error: unknown) {
    if (error instanceof HttpError) return fail(null, -32700, 'parse');
    throw error;
  }
  const method = Object.hasOwn(METHODS, body.method) ? METHODS[body.method] : undefined;
  if (!method) return fail(body.id, -32601, 'method');
  try {
    return json({ jsonrpc: '2.0', id: body.id ?? null, result: await method(ctx, body.params) });
  } catch (error: unknown) {
    if (error instanceof PaymeError) return fail(body.id, error.code, error.message);
    throw error;
  }
};
