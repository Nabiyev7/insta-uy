/** Bot: nik tasdiq qadami, nik nizosi ("Bu nik meniki"), adminga yozish (murojaatlar) va Telegram'ga xabar navbati. Har javob foydalanuvchi tilida. */
import { z } from 'zod';
import { bt, langOf, oneLang, type Lang } from './botText.ts';
import { HttpError, type Ctx, type Telegram, type TgButton } from './types.ts';
import { json, readJson, requireUser } from './util.ts';

// ---------- 1. Nik: aniq sabab bilan format tekshiruvi ----------
/** "@nik" va "instagram.com/nik" — tozalanadi; oxiridagi nuqta va bo'shliq olinadi. */
export const normalizeNick = (raw: string): string =>
  raw.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').replace(/[.\s]+$/, '').toLowerCase();

/** Instagram qoidasi: 1–30 belgi, a–z 0–9 . _, ketma-ket ikki nuqta yo'q, nuqta bilan boshlanmaydi/tugamaydi. Xato bo'lsa — aniq sabab. */
export const nickProblem = (nick: string, lang: Lang = 'uz'): string | null => {
  if (nick === '') return bt(lang, 'nickEmpty');
  if (nick.length > 30) return bt(lang, 'nickLong', { nick });
  const bad = [...new Set(nick.replace(/[a-z0-9._]/g, ''))].join(' ');
  if (bad) return bt(lang, 'nickBad', { nick, bad });
  if (nick.includes('..')) return bt(lang, 'nickDots', { nick });
  if (nick.startsWith('.')) return bt(lang, 'nickStartDot', { nick });
  return null;
};

export const askNick = async (ctx: Ctx, lang: Lang = 'uz'): Promise<string> => {
  const channel = String((await ctx.db.rpc<string | null>('svc_setting', { p_key: 'telegram_channel' })) ?? '').replace(/^@/, '') || (ctx.env.TELEGRAM_CHANNEL ?? 'citylanduz').replace(/^@/, '');
  return bt(lang, 'welcome', { channel });
};

/** Nik yozildi: format → band emasmi → tasdiq qadami (akkaunt faqat "Ha, to'g'ri" dan keyin). */
export const proposeNick = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, raw: string, lang: Lang = 'uz'): Promise<void> => {
  const nick = normalizeNick(raw);
  const problem = nickProblem(nick, lang);
  if (problem) return tg.send(chat, problem);
  try {
    await ctx.db.rpc<string>('svc_nick_check', { p_nick: nick });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('nick_taken')) {
      await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'nick', p_nick: nick });
      return tg.send(chat, bt(lang, 'nickBusy', { nick }), [{ text: bt(lang, 'btnClaimNick'), data: 'claim' }]);
    }
    if (code.includes('banned_word')) return tg.send(chat, bt(lang, 'nickBanned'));
    if (code.includes('bad_format') || code.includes('empty')) return tg.send(chat, nickProblem(nick, lang) ?? bt(lang, 'nickFormat'));
    throw error;
  }
  await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'confirm', p_nick: nick });
  return tg.send(chat, bt(lang, 'confirmNick', { nick }), [
    { text: `🔗 instagram.com/${nick}`, url: `https://instagram.com/${nick}` }, { text: bt(lang, 'btnNickOk'), data: 'nick_ok' }, { text: bt(lang, 'btnNickAgain'), data: 'nick_again' },
  ]);
};

// ---------- 2. Nik nizosi ----------
export const openDispute = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, nick: string, lang: Lang = 'uz'): Promise<void> => {
  try {
    const id = await ctx.db.rpc<number>('svc_dispute_open', { p_telegram: telegram, p_nick: nick });
    await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'dispute', p_nick: nick, p_ref_id: id });
    return tg.send(chat, `${bt(lang, 'disputeOpened', { id, nick })}\n${bt(lang, 'proofHow')}`);
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('already_claimed')) return tg.send(chat, bt(lang, 'disputeDup'));
    if (code.includes('rate_limited')) return tg.send(chat, bt(lang, 'disputeLimit'));
    if (code.includes('has_account')) return tg.send(chat, bt(lang, 'disputeHasAccount'));
    throw error;
  }
};
/** Egasining tili (admin xabarlari uchun). */
const ownerLang = async (ctx: Ctx, chat: number): Promise<Lang> => langOf((await ctx.db.rpc<{ lang?: string } | null>('svc_bot_ctx', { p_telegram: chat }))?.lang);
export const takeProof = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, dispute: number, fileId: string, lang: Lang = 'uz'): Promise<void> => {
  const side = await ctx.db.rpc<string>('svc_dispute_proof', { p_id: dispute, p_telegram: telegram, p_file: fileId });
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (admin) {
    const al = await ownerLang(ctx, admin);
    await tg.send(admin, bt(al, 'newProof', { id: dispute, side: bt(al, side === 'owner' ? 'sideOwner' : 'sideClaimant') }));
  }
  return tg.send(chat, bt(lang, 'proofOk'));
};

// ---------- 9. Adminga yozish ----------
interface Ticket { readonly ticket: number; readonly message: number; readonly is_new: boolean; readonly nick: string | null; readonly login: string | null; readonly address: string | null }
interface From { readonly id: number; readonly first_name: string; readonly username?: string }
export const supportMessage = async (ctx: Ctx, tg: Telegram, chat: number, from: From, text: string, photo: string | null, lang: Lang = 'uz'): Promise<void> => {
  let t: Ticket;
  try {
    t = await ctx.db.rpc<Ticket>('svc_support_message', { p_telegram: from.id, p_text: text, p_photo: photo });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('rate_limited')) return tg.send(chat, bt(lang, 'supportLimit'));
    if (code.includes('banned')) return tg.send(chat, bt(lang, 'banned'));
    throw error;
  }
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (admin) {
    const al = await ownerLang(ctx, admin);
    const who = `${t.nick ? `@${t.nick}` : '—'} · ${from.first_name}${from.username ? ` @${from.username}` : ''} (${from.id})`;
    const body = bt(al, 'newTicket', { ticket: t.ticket, more: t.is_new ? '' : bt(al, 'ticketMore'), who, address: t.address ? `\n🏠 ${t.address}` : '', text });
    const id = photo ? await tg.photo(admin, photo, body) : await tg.sendId(admin, body);
    if (id) await ctx.db.rpc('svc_support_admin_msg', { p_message: t.message, p_admin_msg: id });
  }
  if (t.is_new) await tg.send(chat, bt(lang, 'supportSent'));
};
/** Admin botda murojaatga "Javob berish" (reply) qildi → foydalanuvchiga (uning tilida). */
export const adminReply = async (ctx: Ctx, tg: Telegram, replyTo: number, text: string, photo: string | null): Promise<boolean> => {
  const r = await ctx.db.rpc<{ chat: number; ticket: number } | null>('svc_support_reply', { p_admin_msg: replyTo, p_ticket: null, p_text: text, p_photo: photo });
  if (!r) return false;
  const body = bt(await ownerLang(ctx, r.chat), 'adminAnswer', { ticket: r.ticket, text });
  if (photo) await tg.photo(r.chat, photo, body);
  else await tg.send(r.chat, body);
  return true;
};

const replySchema = z.object({ ticket: z.number().int().positive(), text: z.string().min(1).max(3000) });
/** POST /admin/support/reply — paneldan javob. */
export const panelReply = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  if (!(await ctx.db.rpc<boolean>('svc_is_admin', { p_user: user.id }))) throw new HttpError(403, 'forbidden');
  const { ticket, text } = await readJson(req, replySchema);
  if (!ctx.tg) throw new HttpError(503, 'telegram_off');
  const r = await ctx.db.rpc<{ chat: number; ticket: number } | null>('svc_support_reply', { p_admin_msg: null, p_ticket: ticket, p_text: text, p_photo: null });
  if (!r) throw new HttpError(404, 'not_found');
  await ctx.tg.send(r.chat, bt(await ownerLang(ctx, r.chat), 'adminAnswer', { ticket: r.ticket, text }));
  return json({ ok: true });
};
const proofSchema = z.object({ id: z.number().int().positive(), side: z.enum(['claimant', 'owner']) });
/** POST /admin/dispute/proof — skrinshot Telegram'da saqlanadi; admin panelga server orqali ko'rsatiladi. */
export const disputeProof = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  const { id, side } = await readJson(req, proofSchema);
  const file = await ctx.db.rpc<string | null>('svc_dispute_file', { p_user: user.id, p_id: id, p_side: side });
  if (!file || !ctx.tg) throw new HttpError(404, 'not_found');
  const data = await ctx.tg.download(file);
  if (!data) throw new HttpError(404, 'not_found');
  return new Response(new Uint8Array(data), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'no-store' } });
};

// ---------- Navbat: akkaunti yo'q odamga ham (nizo, eslatma) — oluvchi tilida ----------
interface OutRow { readonly chat: number; readonly text: string; readonly buttons: readonly TgButton[] | null; readonly lang?: string }
export const flushTgOutbox = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const rows = await ctx.db.rpc<readonly OutRow[]>('svc_tg_outbox', { p_limit: 100 });
  await Promise.allSettled(rows.map((r) => {
    const lang = langOf(r.lang);
    const buttons = r.buttons?.map((b) => ({ ...b, text: oneLang(b.text, lang) }));
    return tg.send(r.chat, oneLang(r.text, lang), buttons ?? undefined);
  }));
  return rows.length;
};
