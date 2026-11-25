/** Bot do'koni: Telegram Stars bilan to'lov (tanga paketlari, premium uy, bezak, level, salyut) va qaytarish. */
import { HttpError, type Ctx, type Telegram, type TgButton } from './types.ts';
import { json, readJson, requireUser } from './util.ts';
import { z } from 'zod';

interface StarsOrder { readonly id: string; readonly stars: number; readonly title: string }
interface Product { readonly kind: string; readonly payload: Readonly<Record<string, unknown>> }

/** `buy_<kod>` (sayt havolasi) yoki `buy:<kod>` (bot tugmasi) → buyurtma turi. */
export const parseProduct = (code: string): Product | null => {
  const pack = /^pack([1-9])$/.exec(code)?.[1];
  if (pack) return { kind: 'coins', payload: { pack: Number(pack) } };
  const decor = /^d_([a-z0-9_]{1,40})$/.exec(code)?.[1];
  if (decor) return { kind: 'decor', payload: { id: decor } };
  const house = /^([ht])_([A-Z0-9]{1,8})_([1-9])$/.exec(code);
  if (house) return { kind: house[1] === 'h' ? 'plot' : 'tier', payload: { plot: house[2], tier: Number(house[3]) } };
  return null;
};

const SOON = "⏳ To'lovlar tez kunda ochiladi. Hozircha tanga bilan oling. / Оплата скоро откроется. Пока используйте монеты.";
const ERRORS: Readonly<Record<string, string>> = {
  payments_off: SOON,
  stars_unavailable: 'Bu tovar Stars bilan sotilmaydi — saytda karta yoki tanga bilan oling. / Только картой или монетами на сайте.',
  not_for_sale: 'Hozircha sotuvda emas. / Пока не продаётся.',
  user_not_found: 'Avval /start bosib akkaunt oching. / Сначала нажмите /start.',
  not_free: 'Bu joy band. Saytdan boshqasini tanlang. / Место занято.',
  too_many_orders: "Ochiq buyurtmalar ko'p — avval ularni tugating. / Слишком много открытых заказов.",
  no_links: 'Salyutda havola bo‘lmasin. / Без ссылок.',
  banned_word: "Nomaqbul so'z bor. / Недопустимое слово.",
  too_long: 'Juda uzun (80 belgigacha). / Слишком длинно.',
};
const errorText = (error: unknown): string => {
  const code = error instanceof Error ? error.message : '';
  return Object.entries(ERRORS).find(([k]) => code.includes(k))?.[1] ?? 'Xatolik, keyinroq urinib ko‘ring. / Ошибка, попробуйте позже.';
};

/** Buyurtma ochib, Stars hisob-fakturasini yuboradi. */
export const sendInvoice = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, p: Product): Promise<void> => {
  try {
    const o = await ctx.db.rpc<StarsOrder>('svc_stars_order', { p_telegram: telegram, p_kind: p.kind, p_payload: p.payload });
    await tg.invoice(chat, o.title, `CityLand UZ — ${o.title}. To'langach saytda darhol paydo bo'ladi.`, o.id, o.stars);
  } catch (error: unknown) {
    await tg.send(chat, errorText(error));
  }
};

export const buyCode = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, code: string): Promise<void> => {
  if (code === 'salute') return tg.send(chat, "🎆 Salyut matnini shunday yozing: /salyut Tug'ilgan kuning bilan! / Напишите: /salyut Текст");
  const p = parseProduct(code);
  if (!p) return tg.send(chat, 'Tovar topilmadi. / Товар не найден.');
  return sendInvoice(ctx, tg, chat, telegram, p);
};

interface Pack { readonly coins: number; readonly bonus?: number; readonly stars?: number | null; readonly tag?: string }
interface Premium { readonly packs?: readonly Pack[]; readonly starsMin?: number }
const fmt = (n: number): string => n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
const TAGS: Readonly<Record<string, string>> = { best: ' · Eng foydali', popular: ' · Ommabop' };
/** Faqat Stars narxi bor (≥ 50 ⭐) paketlar; 1–2-paket — faqat saytda karta bilan. */
export const packButtons = (p: Premium): readonly TgButton[] => (p.packs ?? []).flatMap((pk, i) => (pk.stars && pk.stars >= (p.starsMin ?? 50)
  ? [{ text: `🪙 ${fmt(pk.coins + (pk.bonus ?? 0))} — ${pk.stars}⭐${TAGS[pk.tag ?? ''] ?? ''}`, data: `buy:pack${i + 1}` }] : []));
/** /dokon: tanga paketlari va salyut; uy va bezak — saytda tanlanadi. */
export const shopMenu = async (ctx: Ctx, tg: Telegram, chat: number): Promise<void> => {
  const premium = await ctx.db.rpc<Premium | null>('svc_premium', {});
  return tg.send(chat, "🛍 Do'kon / Магазин\nKichik paketlar va bezaklar — saytda (karta yoki tanga).", [...packButtons(premium ?? {}), { text: '🎆 Salyut — 50⭐', data: 'buy:salute' }, { text: '🏙 Sayt / Сайт', url: ctx.env.SITE_URL }]);
};

/** pre_checkout_query: buyurtma hali kutilmoqdami, summa va egasi to'g'rimi. */
export const preCheckout = async (ctx: Ctx, tg: Telegram, q: { readonly id: string; readonly from: { readonly id: number }; readonly total_amount: number; readonly invoice_payload: string }): Promise<void> => {
  const isOk = /^[0-9a-f-]{36}$/.test(q.invoice_payload)
    && await ctx.db.rpc<boolean>('svc_stars_check', { p_order: q.invoice_payload, p_telegram: q.from.id, p_stars: q.total_amount });
  await tg.preCheckout(q.id, isOk, isOk ? undefined : 'Buyurtma muddati tugagan — qaytadan oching. / Заказ устарел.');
};

/** successful_payment: to'lov yozilib, buyurtma darhol bajariladi (idempotent). */
export const starsPaid = async (ctx: Ctx, tg: Telegram, chat: number, p: { readonly total_amount: number; readonly invoice_payload: string; readonly telegram_payment_charge_id: string }): Promise<void> => {
  const r = await ctx.db.rpc<{ result: string }>('svc_payment', { p_provider: 'stars', p_external: p.telegram_payment_charge_id, p_amount: p.total_amount, p_order: p.invoice_payload });
  const text = r.result === 'paid' ? "✅ To'lov qabul qilindi — saytda tayyor! / Оплата получена!" : "⚠️ To'lov keldi, admin ko'rib chiqadi. / Оплата получена, админ проверит.";
  await tg.send(chat, text, [{ text: '🏙', url: ctx.env.SITE_URL }]);
};

const refundSchema = z.object({ payment: z.number().int().positive() });
interface RefundTarget { readonly provider: string; readonly external: string; readonly telegram: number | null }
/** POST /pay/refund (faqat admin): Stars — Telegram'da qaytariladi; karta — admin pulni o'zi qaytaradi, bu yerda belgilanadi. */
export const refund = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  const { payment } = await readJson(req, refundSchema);
  const t = await ctx.db.rpc<RefundTarget>('svc_refund_target', { p_user: user.id, p_payment: payment });
  if (t.provider === 'stars') {
    if (!ctx.tg || !t.telegram) throw new HttpError(503, 'telegram_off');
    await ctx.tg.refundStars(t.telegram, t.external);
  }
  await ctx.db.rpc('svc_payment_refunded', { p_user: user.id, p_payment: payment });
  return json({ ok: true, provider: t.provider });
};
