/** Bot: nik tasdiq qadami, nik nizosi ("Bu nik meniki"), adminga yozish (murojaatlar) va Telegram'ga xabar navbati. */
import { z } from 'zod';
import { HttpError, type Ctx, type Telegram, type TgButton } from './types.ts';
import { json, readJson, requireUser } from './util.ts';

// ---------- 1. Nik: aniq sabab bilan format tekshiruvi ----------
/** "@nik" va "instagram.com/nik" — tozalanadi; oxiridagi nuqta va bo'shliq olinadi. */
export const normalizeNick = (raw: string): string =>
  raw.trim().replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@+/, '').replace(/[.\s]+$/, '').toLowerCase();

/** Instagram qoidasi: 1–30 belgi, a–z 0–9 . _, ketma-ket ikki nuqta yo'q, nuqta bilan boshlanmaydi/tugamaydi. Xato bo'lsa — aniq sabab (uz / ru). */
export const nickProblem = (nick: string): string | null => {
  if (nick === '') return 'Nikingizni yozing. / Напишите ник.';
  if (nick.length > 30) return `«${nick}» — 30 belgidan uzun. / Длиннее 30 символов.`;
  const bad = [...new Set(nick.replace(/[a-z0-9._]/g, ''))].join(' ');
  if (bad) return `«${nick}» — ruxsat etilmagan belgi: ${bad} (faqat lotin harf, raqam, «.» va «_»). / Недопустимый символ: ${bad}.`;
  if (nick.includes('..')) return `«${nick}» — ikki nuqta ketma-ket bo‘lmaydi. / Две точки подряд нельзя.`;
  if (nick.startsWith('.')) return `«${nick}» — nuqta bilan boshlanmaydi. / Не может начинаться с точки.`;
  return null;
};

export const askNick = async (ctx: Ctx): Promise<string> => {
  const channel = String((await ctx.db.rpc<string | null>('svc_setting', { p_key: 'telegram_channel' })) ?? '').replace(/^@/, '') || (ctx.env.TELEGRAM_CHANNEL ?? 'citylanduz').replace(/^@/, '');
  return [
    '👋 Xush kelibsiz! CityLand UZ — Instagram obunachilari shahri.',
    `Instagram nikingizni Instagram'dagidek to'liq va aniq yozing (masalan: ${channel}): har bir harf, raqam, nuqta va pastki chiziq (_) muhim. Keyin o'zgartirib bo'lmaydi.`,
    '',
    `👋 Добро пожаловать! Напишите ваш ник в Instagram точно как в профиле (например: ${channel}). Изменить потом нельзя.`,
  ].join('\n');
};

/** Nik yozildi: format → band emasmi → tasdiq qadami (akkaunt faqat "Ha, to'g'ri" dan keyin). */
export const proposeNick = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, raw: string): Promise<void> => {
  const nick = normalizeNick(raw);
  const problem = nickProblem(nick);
  if (problem) return tg.send(chat, problem);
  try {
    await ctx.db.rpc<string>('svc_nick_check', { p_nick: nick });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('nick_taken')) {
      await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'nick', p_nick: nick });
      return tg.send(chat, `@${nick} — bu nik band. Agar u sizniki bo'lsa — «Bu nik meniki» tugmasini bosing. Aks holda boshqa nik yozing. / Ник занят. Если он ваш — нажмите «Это мой ник».`, [{ text: '🙋 Bu nik meniki / Это мой ник', data: 'claim' }]);
    }
    if (code.includes('banned_word')) return tg.send(chat, 'Bu nikni ishlatib bo‘lmaydi. / Такой ник нельзя.');
    if (code.includes('bad_format') || code.includes('empty')) return tg.send(chat, nickProblem(nick) ?? 'Nik formati noto‘g‘ri. / Неверный формат.');
    throw error;
  }
  await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'confirm', p_nick: nick });
  return tg.send(chat, `Shu to'g'rimi? Bosib Instagram'da tekshiring: instagram.com/${nick}\nПроверьте: так ли ваш ник?`, [
    { text: `🔗 instagram.com/${nick}`, url: `https://instagram.com/${nick}` }, { text: "✅ Ha, to'g'ri / Да, верно", data: 'nick_ok' }, { text: '✏️ Qayta yozish / Написать заново', data: 'nick_again' },
  ]);
};

// ---------- 2. Nik nizosi ----------
const PROOF_HOW = [
  "📸 Dalil yuboring: o'sha Instagram akkauntingizga kirgan holda profil sahifangiz skrinshotini shu yerga rasm qilib yuboring.",
  "Skrinshotda nik va «Profilni tahrirlash» tugmasi ko'rinib tursin (bu tugma faqat profil egasiga ko'rinadi).",
  '📸 Пришлите скриншот своего профиля Instagram, где видны ник и кнопка «Редактировать профиль».',
].join('\n');
export const openDispute = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, nick: string): Promise<void> => {
  try {
    const id = await ctx.db.rpc<number>('svc_dispute_open', { p_telegram: telegram, p_nick: nick });
    await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'dispute', p_nick: nick, p_ref_id: id });
    return tg.send(chat, `Ariza №${id} (@${nick}) ochildi.\n${PROOF_HOW}`);
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('already_claimed')) return tg.send(chat, 'Bu nik bo‘yicha ariza allaqachon ko‘rib chiqilmoqda. / По этому нику уже есть заявка.');
    if (code.includes('rate_limited')) return tg.send(chat, 'Bugun ariza chegarasi tugadi (kuniga 3 ta). / Лимит заявок на сегодня.');
    throw error;
  }
};
export const takeProof = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, dispute: number, fileId: string): Promise<void> => {
  const side = await ctx.db.rpc<string>('svc_dispute_proof', { p_id: dispute, p_telegram: telegram, p_file: fileId });
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (admin) await tg.send(admin, `🧾 Nik nizosi №${dispute}: ${side === 'owner' ? 'egasi' : 'da‘vogar'} dalil yubordi. Admin panel → Nik nizolari.`);
  return tg.send(chat, '✅ Dalil qabul qilindi. Admin ko‘rib chiqadi va shu yerda javob beradi. / Доказательство принято.');
};

// ---------- 9. Adminga yozish ----------
export const SUPPORT_ASK = "✍️ Savolingiz yoki muammoingizni yozing. Rasm yoki skrinshot ham yuborsa bo'ladi.\nНапишите вопрос или проблему — можно с фото.";
interface Ticket { readonly ticket: number; readonly message: number; readonly is_new: boolean; readonly nick: string | null; readonly login: string | null; readonly address: string | null }
interface From { readonly id: number; readonly first_name: string; readonly username?: string }
export const supportMessage = async (ctx: Ctx, tg: Telegram, chat: number, from: From, text: string, photo: string | null): Promise<void> => {
  let t: Ticket;
  try {
    t = await ctx.db.rpc<Ticket>('svc_support_message', { p_telegram: from.id, p_text: text, p_photo: photo });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('rate_limited')) return tg.send(chat, 'Bugun murojaatlar chegarasi tugadi (kuniga 5 ta). / Лимит обращений на сегодня.');
    if (code.includes('banned')) return tg.send(chat, 'Akkaunt bloklangan. / Аккаунт заблокирован.');
    throw error;
  }
  const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
  if (admin) {
    const head = `🆘 Murojaat №${t.ticket}${t.is_new ? '' : ' (davomi)'}\n${t.nick ? `@${t.nick}` : '—'} · ${from.first_name}${from.username ? ` @${from.username}` : ''} (${from.id})${t.address ? `\n🏠 ${t.address}` : ''}\n\n`;
    const id = photo ? await tg.photo(admin, photo, `${head}${text}`) : await tg.sendId(admin, `${head}${text}`);
    if (id) await ctx.db.rpc('svc_support_admin_msg', { p_message: t.message, p_admin_msg: id });
  }
  if (t.is_new) await tg.send(chat, '✅ Yuborildi. Admin javobini shu yerda olasiz. / Отправлено. Ответ придёт сюда.');
};
/** Admin botda murojaatga "Javob berish" (reply) qildi → foydalanuvchiga. */
export const adminReply = async (ctx: Ctx, tg: Telegram, replyTo: number, text: string, photo: string | null): Promise<boolean> => {
  const r = await ctx.db.rpc<{ chat: number; ticket: number } | null>('svc_support_reply', { p_admin_msg: replyTo, p_ticket: null, p_text: text, p_photo: photo });
  if (!r) return false;
  const body = `💬 Admin javobi (№${r.ticket}):\n${text}`;
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
  await ctx.tg.send(r.chat, `💬 Admin javobi (№${r.ticket}):\n${text}`);
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

// ---------- Navbat: akkaunti yo'q odamga ham (nizo, eslatma) ----------
interface OutRow { readonly chat: number; readonly text: string; readonly buttons: readonly TgButton[] | null }
export const flushTgOutbox = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const rows = await ctx.db.rpc<readonly OutRow[]>('svc_tg_outbox', { p_limit: 100 });
  await Promise.allSettled(rows.map((r) => tg.send(r.chat, r.text, r.buttons ?? undefined)));
  return rows.length;
};
