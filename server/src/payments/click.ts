/** Click SHOP API: Prepare (action=0) va Complete (action=1). merchant_trans_id = buyurtma UUID. */
import { z } from 'zod';
import type { Ctx } from '../types.ts';
import { json, md5, readText, safeEqual } from '../util.ts';

const schema = z.object({
  click_trans_id: z.string().max(40), service_id: z.string().max(20), merchant_trans_id: z.string().max(60), merchant_prepare_id: z.string().max(60).optional(),
  amount: z.string().max(20), action: z.enum(['0', '1']), error: z.string().max(10).default('0'), sign_time: z.string().max(30), sign_string: z.string().max(64),
});
interface Order { readonly pay_amount: number; readonly status: string; readonly provider: string; readonly expires_at: string }
interface Tx { readonly ext_id?: string; readonly state?: number; readonly order_id?: string; readonly amount?: number; readonly error?: string }

const reply = (p: z.infer<typeof schema> | null, error: number, note: string, extra: Record<string, unknown> = {}): Response =>
  json({ click_trans_id: p?.click_trans_id, merchant_trans_id: p?.merchant_trans_id, error, error_note: note, ...extra });

export const handleClick = async (req: Request, ctx: Ctx): Promise<Response> => {
  const parsed = schema.safeParse(Object.fromEntries(new URLSearchParams(await readText(req))));
  if (!parsed.success) return reply(null, -8, 'bad request');
  const p = parsed.data;
  const prepareId = p.action === '1' ? p.merchant_prepare_id ?? '' : '';
  const expected = md5(p.click_trans_id + p.service_id + (ctx.env.CLICK_SECRET ?? '') + p.merchant_trans_id + prepareId + p.amount + p.action + p.sign_time);
  if (p.service_id !== ctx.env.CLICK_SERVICE_ID || !safeEqual(expected, p.sign_string)) return reply(p, -1, 'SIGN CHECK FAILED');
  if (!z.uuid().safeParse(p.merchant_trans_id).success) return reply(p, -5, 'order not found');

  const order = await ctx.db.rpc<Order | null>('svc_order', { p_id: p.merchant_trans_id });
  if (!order || order.provider !== 'click') return reply(p, -5, 'order not found');
  if (Number(p.amount) !== order.pay_amount) return reply(p, -2, 'incorrect amount');

  if (p.action === '0') {
    if (order.status === 'paid') return reply(p, -4, 'already paid');
    if (order.status !== 'pending' || Date.parse(order.expires_at) < Date.now()) return reply(p, -9, 'cancelled');
    const t = await ctx.db.rpc<Tx>('svc_tx_create', { p_provider: 'click', p_ext: p.click_trans_id, p_order: p.merchant_trans_id, p_amount: order.pay_amount, p_time: Date.now() });
    return t.error ? reply(p, -9, 'transaction cancelled') : reply(p, 0, 'Success', { merchant_prepare_id: p.click_trans_id });
  }
  const t = await ctx.db.rpc<Tx | null>('svc_tx', { p_provider: 'click', p_ext: p.click_trans_id });
  if (!t || t.order_id !== p.merchant_trans_id || p.merchant_prepare_id !== p.click_trans_id) return reply(p, -6, 'transaction not found');
  if (Number(p.error) < 0) {
    await ctx.db.rpc('svc_tx_cancel', { p_provider: 'click', p_ext: p.click_trans_id, p_reason: Number(p.error) });
    return reply(p, -9, 'transaction cancelled');
  }
  if (t.state === 2) return reply(p, -4, 'already paid');
  const done = await ctx.db.rpc<Tx>('svc_tx_perform', { p_provider: 'click', p_ext: p.click_trans_id });
  return done.error ? reply(p, -9, 'transaction cancelled') : reply(p, 0, 'Success', { merchant_confirm_id: p.click_trans_id });
};
