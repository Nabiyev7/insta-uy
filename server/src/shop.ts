/** Bot do'koni: Telegram Stars bilan to'lov (tanga paketlari, premium uy, bezak, level, salyut) va qaytarish. */
import { bt, type Lang, type TextKey } from './botText.ts';
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

const ERRORS: readonly (readonly [string, TextKey])[] = [
  ['payments_off', 'payOff'], ['stars_unavailable', 'starsUnavailable'], ['not_for_sale', 'notForSale'], ['user_not_found', 'userMissing'], ['not_free', 'placeTaken'],
  ['too_many_orders', 'tooManyOrders'], ['no_links', 'noLinks'], ['banned_word', 'badWord'], ['too_long', 'tooLong'],
];
const errorKey = (error: unknown): TextKey => {
  const code = error instanceof Error ? error.message : '';
  return ERRORS.find(([k]) => code.includes(k))?.[1] ?? 'error';
};

/** Buyurtma ochib, Stars hisob-fakturasini yuboradi. */
export const sendInvoice = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, p: Product, lang: Lang = 'uz'): Promise<void> => {
  try {
    const o = await ctx.db.rpc<StarsOrder>('svc_stars_order', { p_telegram: telegram, p_kind: p.kind, p_payload: p.payload });
    await tg.invoice(chat, o.title, bt(lang, 'invoiceDesc', { title: o.title }), o.id, o.stars);
  } catch (error: unknown) {
    await tg.send(chat, bt(lang, errorKey(error)));
  }
};

/** To'lov tugmasi bosildi (`pay:<kod>`): Stars hisob-fakturasi. */
export const payCode = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, code: string, lang: Lang = 'uz'): Promise<void> => {
  if (code === 'salute') return tg.send(chat, bt(lang, 'saluteHow'));
  const p = parseProduct(code);
  if (!p) return tg.send(chat, bt(lang, 'productMissing'));
  return sendInvoice(ctx, tg, chat, telegram, p, lang);
};

interface ProductView { readonly title: string; readonly uzs: number; readonly stars: number | null; readonly image: string | null }
/** Tovar ma'lumoti (sayt va bot bir xil narx): bezak — katalogdan, tanga paketi — `premium` sozlamasidan. */
const productView = async (ctx: Ctx, code: string, lang: Lang): Promise<ProductView | null> => {
  const premium = (await ctx.db.rpc<Premium | null>('svc_premium', {})) ?? {};
  const min = premium.starsMin ?? 50;
  const pack = /^pack([1-9])$/.exec(code)?.[1];
  if (pack) {
    const pk = premium.packs?.[Number(pack) - 1];
    if (!pk) return null;
    return { title: bt(lang, 'productCoins', { n: fmt(pk.coins + (pk.bonus ?? 0)) }), uzs: pk.uzs ?? 0, stars: pk.stars && pk.stars >= min ? pk.stars : null, image: null };
  }
  const decor = /^d_([a-z0-9_]{1,40})$/.exec(code)?.[1];
  if (!decor) return null;
  const c = (await ctx.db.rpc<readonly (CatalogItem & { readonly model?: string })[]>('api_catalog', {}).catch(() => [])).find((x) => x.id === decor);
  if (!c) return null;
  const stars = Math.max(1, Math.ceil(c.uzs / Math.max(1, premium.starsRate ?? 200)));
  return { title: `${c.premium ? '⭐ ' : ''}${c[lang]}`, uzs: c.uzs, stars: stars >= min ? stars : null, image: c.model ? `${ctx.env.SITE_URL}/assets/decor/${c.model}.webp` : null };
};

/** Saytdagi "Botda sotib olish" (`?start=buy_<kod>`) va bot do'koni: rasm, nom, narx, to'lov tugmasi.
 *  To'lov o'chiq — "Tez kunda"; admin sinov rejimida — "Sinov xaridi". */
export const buyCode = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, code: string, lang: Lang = 'uz'): Promise<void> => {
  if (code === 'salute') return tg.send(chat, bt(lang, 'saluteHow'));
  const view = await productView(ctx, code, lang);
  if (!view) return payCode(ctx, tg, chat, telegram, code, lang);
  const [isTester, isOn] = await Promise.all([ctx.db.rpc<boolean>('svc_is_tester_tg', { p_telegram: telegram }), ctx.db.rpc<unknown>('svc_setting', { p_key: 'payments_enabled' })]);
  const caption = bt(lang, 'product', { title: view.title, uzs: fmt(view.uzs), stars: view.stars ? bt(lang, 'productStars', { n: view.stars }) : '' });
  const buttons: readonly TgButton[] = isTester ? [{ text: bt(lang, 'btnTestBuy'), data: `tbuy:${code}` }]
    : isOn !== true ? [] : view.stars ? [{ text: bt(lang, 'btnPayStars', { n: view.stars }), data: `pay:${code}` }] : [];
  const note = isTester ? '' : isOn !== true ? `\n\n${bt(lang, 'payOff')}` : view.stars ? '' : `\n\n${bt(lang, 'starsUnavailable')}`;
  if (view.image && tg.photoButtons) {
    try {
      return await tg.photoButtons(chat, view.image, caption + note, buttons);
    } catch {
      // rasm yuklanmasa — matn bilan
    }
  }
  return tg.send(chat, caption + note, buttons);
};

/** Admin sinov rejimi: botda to'lovsiz xarid (`is_test`). */
export const testBuy = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, code: string, lang: Lang = 'uz'): Promise<void> => {
  const p = parseProduct(code);
  if (!p) return tg.send(chat, bt(lang, 'productMissing'));
  try {
    await ctx.db.rpc('svc_test_purchase', { p_telegram: telegram, p_kind: p.kind, p_payload: p.payload });
    return await tg.send(chat, bt(lang, 'paidOk'), [{ text: bt(lang, 'btnCity'), webApp: `${ctx.env.SITE_URL}/?til=${lang}` }]);
  } catch (error: unknown) {
    return tg.send(chat, bt(lang, errorKey(error)));
  }
};

const linkSchema = z.object({ code: z.string().regex(/^[A-Za-z0-9_]{1,60}$/) });
/** POST /pay/stars/link — Mini App ichida to'lash (Telegram.WebApp.openInvoice): botga chiqib ketmasdan. */
export const starsLink = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  const { code } = await readJson(req, linkSchema);
  const p = parseProduct(code);
  if (!p) throw new HttpError(400, 'bad_format');
  if (!ctx.tg?.invoiceLink) throw new HttpError(503, 'telegram_off');
  const telegram = await ctx.db.rpc<number>('svc_channel_target', { p_user: user.id });
  const o = await ctx.db.rpc<StarsOrder>('svc_stars_order', { p_telegram: telegram, p_kind: p.kind, p_payload: p.payload });
  const url = await ctx.tg.invoiceLink(o.title, bt('uz', 'invoiceDesc', { title: o.title }), o.id, o.stars);
  if (!url) throw new HttpError(502, 'telegram_failed');
  return json({ url });
};

interface Pack { readonly coins: number; readonly bonus?: number; readonly uzs?: number; readonly stars?: number | null; readonly tag?: string }
interface CatalogItem { readonly id: string; readonly uz: string; readonly ru: string; readonly uzs: number; readonly premium?: boolean; readonly onSale: boolean }
interface Premium { readonly packs?: readonly Pack[]; readonly starsMin?: number; readonly starsRate?: number }
const fmt = (n: number): string => n.toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
const TAGS: Readonly<Record<string, TextKey>> = { best: 'packBest', popular: 'packPopular' };
/** Faqat Stars narxi bor (≥ 50 ⭐) paketlar; 1–2-paket — faqat saytda karta bilan. */
export const packButtons = (p: Premium, lang: Lang = 'uz'): readonly TgButton[] => (p.packs ?? []).flatMap((pk, i) => (pk.stars && pk.stars >= (p.starsMin ?? 50)
  ? [{ text: `🪙 ${fmt(pk.coins + (pk.bonus ?? 0))} — ${pk.stars}⭐${pk.tag && TAGS[pk.tag] ? bt(lang, TAGS[pk.tag] ?? 'packBest') : ''}`, data: `buy:pack${i + 1}` }] : []));
/** Premium bezak va mashinalar (faqat pulga) — Stars narxi kurs bo'yicha, ≥ 50 ⭐ bo'lsa. */
export const premiumButtons = (items: readonly CatalogItem[], p: Premium, lang: Lang = 'uz'): readonly TgButton[] => items.flatMap((c) => {
  const stars = Math.max(1, Math.ceil(c.uzs / Math.max(1, p.starsRate ?? 200)));
  return c.premium && c.onSale && c.uzs > 0 && stars >= (p.starsMin ?? 50) ? [{ text: `⭐ ${c[lang]} — ${stars}⭐`, data: `buy:d_${c.id}` }] : [];
});
/** Do'kon: tanga paketlari, premium tovarlar va salyut; oddiy bezak va uy — saytda (Mini App). */
export const shopMenu = async (ctx: Ctx, tg: Telegram, chat: number, lang: Lang = 'uz'): Promise<void> => {
  const [premium, catalog] = await Promise.all([ctx.db.rpc<Premium | null>('svc_premium', {}), ctx.db.rpc<readonly CatalogItem[]>('api_catalog', {}).catch(() => [])]);
  return tg.send(chat, bt(lang, 'shop'), [...packButtons(premium ?? {}, lang), ...premiumButtons(catalog, premium ?? {}, lang), { text: bt(lang, 'btnSalute'), data: 'buy:salute' },
    { text: bt(lang, 'btnShop'), webApp: `${ctx.env.SITE_URL}/?panel=dokon&til=${lang}` }]);
};

/** pre_checkout_query: buyurtma hali kutilmoqdami, summa va egasi to'g'rimi. */
export const preCheckout = async (ctx: Ctx, tg: Telegram, q: { readonly id: string; readonly from: { readonly id: number }; readonly total_amount: number; readonly invoice_payload: string }, lang: Lang = 'uz'): Promise<void> => {
  const isOk = /^[0-9a-f-]{36}$/.test(q.invoice_payload)
    && await ctx.db.rpc<boolean>('svc_stars_check', { p_order: q.invoice_payload, p_telegram: q.from.id, p_stars: q.total_amount });
  await tg.preCheckout(q.id, isOk, isOk ? undefined : bt(lang, 'orderOld'));
};

/** successful_payment: to'lov yozilib, buyurtma darhol bajariladi (idempotent). */
export const starsPaid = async (ctx: Ctx, tg: Telegram, chat: number, p: { readonly total_amount: number; readonly invoice_payload: string; readonly telegram_payment_charge_id: string }, lang: Lang = 'uz'): Promise<void> => {
  const r = await ctx.db.rpc<{ result: string }>('svc_payment', { p_provider: 'stars', p_external: p.telegram_payment_charge_id, p_amount: p.total_amount, p_order: p.invoice_payload });
  await tg.send(chat, bt(lang, r.result === 'paid' ? 'paidOk' : 'paidProblem'), [{ text: bt(lang, 'btnCity'), webApp: `${ctx.env.SITE_URL}/?til=${lang}` }]);
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
