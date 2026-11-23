/** To'lov provayderi interfeysi: A (karta + noyob summa) va B (Payme/Click) bir xil qo'llanadi (PLAN §8). */
import { z } from 'zod';
import type { Ctx } from '../types.ts';
import { json, readJson, safeEqual } from '../util.ts';
import { handleClick } from './click.ts';
import { handlePayme } from './payme.ts';
import { parseBankMessage } from './bank.ts';

export interface PaymentProvider {
  readonly id: 'card' | 'payme' | 'click';
  isEnabled(ctx: Ctx): boolean;
  handle(req: Request, ctx: Ctx, path: string): Promise<Response>;
}

const bankSchema = z.object({ text: z.string().min(5).max(1000), id: z.string().max(80).optional() });

const card: PaymentProvider = {
  id: 'card',
  isEnabled: (ctx) => Boolean(ctx.env.BANK_SECRET),
  handle: async (req, ctx) => {
    if (!safeEqual(req.headers.get('x-bank-secret') ?? '', ctx.env.BANK_SECRET ?? '')) return json({ error: 'forbidden' }, 403);
    const body = await readJson(req, bankSchema);
    const p = parseBankMessage(body.text);
    if (!p) return json({ result: 'ignored' });
    return json(await ctx.db.rpc('svc_payment', { p_provider: 'card', p_external: body.id ? `sms:${body.id}` : p.id, p_amount: p.amount, p_raw: body.text }));
  },
};
const payme: PaymentProvider = { id: 'payme', isEnabled: (ctx) => Boolean(ctx.env.PAYME_KEY), handle: handlePayme };
const click: PaymentProvider = { id: 'click', isEnabled: (ctx) => Boolean(ctx.env.CLICK_SECRET && ctx.env.CLICK_SERVICE_ID), handle: handleClick };

export const PROVIDERS: readonly PaymentProvider[] = [card, payme, click];
