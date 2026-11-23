import { z } from 'zod';
import { parseBankMessage } from './payments/bank.ts';
import type { Ctx, Telegram, TgButton } from './types.ts';
import { json, keyed, limit, randomCode, readJson, safeEqual } from './util.ts';

export const telegramApi = (token: string, fetcher: typeof fetch = fetch): Telegram => {
  const call = async (method: string, body: unknown): Promise<void> => {
    const res = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    // 403 = foydalanuvchi botni bloklagan; boshqalarni to'xtatmasin.
    if (!res.ok && res.status !== 403) throw new Error(`telegram ${method}: ${res.status}`);
  };
  const keyboard = (buttons?: readonly TgButton[]): unknown =>
    buttons && { inline_keyboard: buttons.map((b) => [b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }]) };
  return {
    send: (chat, text, buttons) => call('sendMessage', { chat_id: chat, text, reply_markup: keyboard(buttons), link_preview_options: { is_disabled: true } }),
    answer: (id, text) => call('answerCallbackQuery', { callback_query_id: id, text }),
    video: (chat, url, caption) => call('sendVideo', { chat_id: chat, video: url, caption }),
  };
};

const fromSchema = z.object({ id: z.number(), first_name: z.string().default(''), username: z.string().optional() });
const updateSchema = z.object({
  message: z.object({
    from: fromSchema.optional(), chat: z.object({ id: z.number(), type: z.string() }), text: z.string().max(4096).optional(), message_id: z.number(),
    forward_origin: z.object({ sender_user: z.object({ username: z.string().optional() }).optional() }).optional(), date: z.number().optional(),
  }).optional(),
  callback_query: z.object({ id: z.string(), from: fromSchema, data: z.string().max(64).optional() }).optional(),
});
type Update = z.infer<typeof updateSchema>;
type Message = NonNullable<Update['message']>;

const HELP = [
  '🏘 Obunachilar shahri boti',
  '/parol — parolni tiklash kodi',
  '/yordam — savol yuborish: "/yordam matn"',
  'Вопрос в поддержку: /yordam ваш текст',
].join('\n');

const sendReset = async (ctx: Ctx, tg: Telegram, telegramId: number): Promise<void> => {
  const user = await ctx.db.rpc<{ user_id: string; login: string } | null>('svc_user', { p_telegram: telegramId });
  if (!user) return tg.send(telegramId, "Bu Telegram hech bir akkauntga ulanmagan. Saytda kirib, «Telegram'ni ulash»ni bosing.");
  const code = randomCode();
  await ctx.db.rpc('svc_reset_begin', { p_user: user.user_id, p_code_hash: keyed(ctx.env.HASH_SECRET, `${user.user_id}:${code}`) });
  return tg.send(telegramId, `Login: ${user.login}\nParolni tiklash kodi: ${code}\n10 daqiqa amal qiladi. Kodni hech kimga bermang.`);
};

const confirmButton = (ctx: Ctx, tg: Telegram, chat: number, purpose: string, token: string): Promise<void> => {
  const what = purpose === 'login' ? 'Saytga shu Telegram orqali kirilmoqda.' : 'Telegram akkauntingizga ulanmoqda.';
  return tg.send(chat, `${what}\n⚠️ Agar bu havolani sizga boshqa odam yuborgan bo'lsa — BOSMANG.\n\n${ctx.env.SITE_URL}`, [{ text: '✅ Ha, bu men', data: `ok:${token}` }]);
};

/** Admin bank botining xabarini forward qiladi → avtomatik solishtirish. */
const bankForward = async (ctx: Ctx, tg: Telegram, m: Message): Promise<boolean> => {
  const isAdmin = ctx.env.ADMIN_TELEGRAM_ID !== undefined && String(m.from?.id) === ctx.env.ADMIN_TELEGRAM_ID;
  const origin = m.forward_origin?.sender_user?.username?.toLowerCase();
  if (!isAdmin || !ctx.env.BANK_BOT || origin !== ctx.env.BANK_BOT.toLowerCase() || !m.text) return false;
  const p = parseBankMessage(m.text);
  if (!p) { await tg.send(m.chat.id, '❔ Kirim summasi topilmadi'); return true; }
  const r = await ctx.db.rpc<{ result: string }>('svc_payment', { p_provider: 'card', p_external: p.id, p_amount: p.amount, p_raw: m.text });
  await tg.send(m.chat.id, `💳 ${p.amount} so'm: ${r.result}`);
  return true;
};

const onMessage = async (ctx: Ctx, tg: Telegram, m: Message): Promise<void> => {
  if (m.chat.type !== 'private' || !m.from) return;
  if (await bankForward(ctx, tg, m)) return;
  await limit(ctx, 'tg', 20, 60, String(m.from.id));
  const text = (m.text ?? '').trim();
  const start = /^\/start (login|link)_([0-9a-f]{32})$/.exec(text);
  if (start?.[1] && start[2]) return confirmButton(ctx, tg, m.chat.id, start[1], start[2]);
  if (/^\/(parol|start reset)/.test(text)) return sendReset(ctx, tg, m.from.id);
  const help = /^\/yordam\s+([\s\S]{3,1000})$/.exec(text);
  if (help?.[1]) {
    const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
    if (admin) await tg.send(admin, `🆘 ${m.from.first_name} ${m.from.username ? `@${m.from.username}` : ''} (${m.from.id}):\n${help[1]}`);
    return tg.send(m.chat.id, 'Xabaringiz yuborildi. / Сообщение отправлено.');
  }
  return tg.send(m.chat.id, HELP, [{ text: "🏙 Shaharni ochish", url: ctx.env.SITE_URL }]);
};

const onCallback = async (ctx: Ctx, tg: Telegram, q: NonNullable<Update['callback_query']>): Promise<void> => {
  const token = /^ok:([0-9a-f]{32})$/.exec(q.data ?? '')?.[1];
  if (!token) return;
  const r = await ctx.db.rpc<{ ok: boolean; error?: string }>('svc_tg_confirm', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_telegram: q.from.id, p_name: q.from.first_name });
  await tg.answer(q.id, r.ok ? 'Tasdiqlandi ✅' : 'Muddati tugagan');
  const why = r.error === 'telegram_used' ? 'Bu Telegram boshqa akkauntga ulangan.' : 'Havola muddati tugagan. Saytdan qaytadan boshlang.';
  await tg.send(q.from.id, r.ok ? 'Tayyor! Saytga qayting.' : why);
};

export const handleTelegram = async (req: Request, ctx: Ctx): Promise<Response> => {
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !ctx.tg || !safeEqual(req.headers.get('x-telegram-bot-api-secret-token') ?? '', secret)) return json({ error: 'forbidden' }, 403);
  const update = await readJson(req, updateSchema);
  if (update.message) await onMessage(ctx, ctx.tg, update.message);
  if (update.callback_query) await onCallback(ctx, ctx.tg, update.callback_query);
  return json({ ok: true });
};

const NOTES: Readonly<Record<string, readonly [string, string]>> = {
  approved: ['🏠 Uyingiz tasdiqlandi!', '🏠 Ваш дом одобрен!'],
  released: ['Uyingiz bo‘shatildi.', 'Ваш дом освобождён.'],
  transfer: ['🎁 Sizga uy sovg‘a qilishmoqchi! Saytga kiring.', '🎁 Вам хотят подарить дом! Зайдите на сайт.'],
  transfer_done: ['🎁 Sovg‘angiz qabul qilindi.', '🎁 Ваш подарок принят.'],
  referral: ['👥 Do‘stingiz uy oldi — tanga qo‘shildi!', '👥 Друг получил дом — монеты начислены!'],
  order_paid: ['✅ To‘lov qabul qilindi.', '✅ Оплата получена.'],
  order_problem: ['⚠️ To‘lov keldi, lekin buyurtmada muammo bor. Admin ko‘rib chiqadi.', '⚠️ Оплата пришла, но есть проблема. Админ проверит.'],
  street_named: ['🪧 Ko‘cha nomi tasdiqlandi!', '🪧 Название улицы одобрено!'],
  street_rejected: ['Ko‘cha nomi rad etildi.', 'Название улицы отклонено.'],
  ad_live: ['📢 Reklamangiz chiqdi!', '📢 Ваша реклама размещена!'],
  ad_rejected: ['Reklama rad etildi. Tahrirlab qayta yuboring.', 'Реклама отклонена. Исправьте и отправьте снова.'],
  elected: ['👑 Saylovda g‘olib bo‘ldingiz!', '👑 Вы победили на выборах!'],
  inactive_warning: ['⏳ Uzoq vaqt kirmadingiz. 14 kun ichida kirmasangiz, bepul uyingiz bo‘shatiladi.', '⏳ Вы давно не заходили. Если не зайдёте 14 дней, бесплатный дом освободится.'],
};

interface OutboxRow { readonly kind: string; readonly chat: number; readonly lang: string }
export const flushOutbox = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const rows = await ctx.db.rpc<readonly OutboxRow[]>('svc_outbox', {});
  const results = await Promise.allSettled(rows.map((r) => {
    const text = NOTES[r.kind]?.[r.lang === 'ru' ? 1 : 0];
    return text && ctx.tg ? ctx.tg.send(r.chat, text, [{ text: '🏙', url: ctx.env.SITE_URL }]) : Promise.resolve();
  }));
  return results.filter((r) => r.status === 'fulfilled').length;
};
