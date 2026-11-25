import { z } from 'zod';
import { parseBankMessage } from './payments/bank.ts';
import { createAccount } from './auth.ts';
import { HttpError, type Ctx, type Telegram, type TgButton } from './types.ts';
import { json, keyed, limit, randomPassword, randomToken, readJson, safeEqual } from './util.ts';

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
  '🏘 CityLand UZ — 3D shahar / 3D-город',
  "Shaharni ochish uchun pastdagi tugmani bosing. / Нажмите кнопку ниже, чтобы открыть город.",
  '/yordam matn — savol yuborish / вопрос в поддержку',
].join('\n');
const ASK_NICK = [
  '👋 Xush kelibsiz! CityLand UZ — Instagram obunachilari shahri.',
  'Instagram nikingizni yozing (masalan: ali_karimov). Uy ustida shu nik turadi, keyin o‘zgartirib bo‘lmaydi.',
  '',
  '👋 Добро пожаловать! Напишите ваш ник в Instagram (например: ali_karimov). Он будет над вашим домом, изменить потом нельзя.',
].join('\n');
const NICK_ERRORS: Readonly<Record<string, string>> = {
  nick_taken: 'Bu nik band. Agar nik sizniki bo‘lsa — /yordam orqali yozing. / Этот ник занят. Если он ваш — напишите в /yordam.',
  banned_word: 'Bu nikni ishlatib bo‘lmaydi. / Такой ник нельзя.',
  bad_format: 'Nik faqat lotin harf, raqam, nuqta va _ dan iborat bo‘lsin. / Ник: латиница, цифры, точка и _.',
  empty: 'Nikingizni yozing. / Напишите ник.',
};
const NICK_OK = /^@?[A-Za-z0-9._]{1,30}$/;

const issueLogin = async (ctx: Ctx, user: string): Promise<string> => {
  const token = randomToken();
  await ctx.db.rpc('svc_login_issue', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_user: user });
  return token;
};

/** Bir martalik kirish havolasi: sayt kirib bo'lgan holda ochiladi (Instagram ichki brauzerida ham). */
const sendLogin = async (ctx: Ctx, tg: Telegram, chat: number, user: string, isNew = false): Promise<void> => {
  const token = await issueLogin(ctx, user);
  const head = isNew ? '✅ Tayyor! Akkaunt ochildi. / Готово! Аккаунт создан.' : '🔑 Kirish havolangiz / Ваша ссылка для входа';
  return tg.send(chat, `${head}\nHavola 15 daqiqa amal qiladi va bir marta ishlaydi. / Ссылка действует 15 минут, один раз.`, [
    { text: '🏙 Shaharni ochish / Открыть город', url: `${ctx.env.SITE_URL}/?kirish=${token}` },
  ]);
};

interface BotStart { readonly state: 'ready' | 'need_nick' | 'banned'; readonly user?: string }
const greet = async (ctx: Ctx, tg: Telegram, m: Message, ref: string | null): Promise<void> => {
  const from = m.from!;
  const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: from.id, p_ref: ref, p_name: from.first_name });
  if (r.state === 'banned') return tg.send(m.chat.id, 'Akkaunt bloklangan. / Аккаунт заблокирован.');
  if (r.state === 'ready' && r.user) return sendLogin(ctx, tg, m.chat.id, r.user);
  return tg.send(m.chat.id, ASK_NICK);
};

/** Nik yozildi: tekshiriladi, akkaunt yaratiladi, havola yuboriladi. */
const takeNick = async (ctx: Ctx, tg: Telegram, m: Message, text: string): Promise<void> => {
  const from = m.from!;
  if (!NICK_OK.test(text)) return tg.send(m.chat.id, NICK_ERRORS.bad_format ?? '');
  try {
    const nick = await ctx.db.rpc<string>('svc_nick_check', { p_nick: text });
    const user = await createAccount(ctx, `tg${from.id}`, randomPassword(), null, from.id, nick);
    return await sendLogin(ctx, tg, m.chat.id, user, true);
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    const known = Object.keys(NICK_ERRORS).find((k) => code.includes(k));
    if (!known) throw error;
    return tg.send(m.chat.id, NICK_ERRORS[known] ?? '');
  }
};

interface SvcUser { readonly user_id: string; readonly role: string; readonly is_banned: boolean }
/** Admin va moderatorga admin panelga bir martalik havola (parol yo'q). */
const adminLink = async (ctx: Ctx, tg: Telegram, m: Message): Promise<void> => {
  const u = await ctx.db.rpc<SvcUser | null>('svc_user', { p_telegram: m.from!.id });
  if (!u || u.is_banned || u.role === 'user') return tg.send(m.chat.id, "Bu buyruq faqat adminlar uchun. / Только для админов.");
  if (!ctx.env.ADMIN_URL) return tg.send(m.chat.id, 'ADMIN_URL sozlanmagan.');
  const token = await issueLogin(ctx, u.user_id);
  return tg.send(m.chat.id, '🛠 Admin panel (15 daqiqa, bir marta)', [{ text: '🛠 Admin panelni ochish', url: `${ctx.env.ADMIN_URL}/?kirish=${token}` }]);
};

const confirmButton = (ctx: Ctx, tg: Telegram, chat: number, token: string): Promise<void> =>
  tg.send(chat, `Telegram akkauntingizga ulanmoqda.\n⚠️ Agar bu havolani sizga boshqa odam yuborgan bo'lsa — BOSMANG.\n\n${ctx.env.SITE_URL}`, [{ text: '✅ Ha, bu men', data: `ok:${token}` }]);

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

const menu = (ctx: Ctx, tg: Telegram, chat: number): Promise<void> => {
  const channel = ctx.env.TELEGRAM_CHANNEL ?? 'citylanduz';
  return tg.send(chat, HELP, [{ text: '🏙 Shaharni ochish / Открыть город', data: 'open' }, { text: '📣 Yangiliklar kanali / Канал новостей', url: `https://t.me/${channel}` }]);
};

const onStart = async (ctx: Ctx, tg: Telegram, m: Message, param: string): Promise<void> => {
  const link = /^link_([0-9a-f]{32})$/.exec(param)?.[1];
  if (link) return confirmButton(ctx, tg, m.chat.id, link);
  if (param === 'wait') {
    const n = await ctx.db.rpc<number>('svc_tg_waitlist', { p_telegram: m.from!.id });
    return tg.send(m.chat.id, `✅ Ro'yxatga yozildingiz (${n}). Shahar ochilganda shu yerga xabar beramiz. / Вы в списке. Сообщим, когда город откроется.`);
  }
  const ref = /^r_([0-9a-f]{6,16})$/.exec(param)?.[1] ?? null;
  return greet(ctx, tg, m, ref);
};

const onMessage = async (ctx: Ctx, tg: Telegram, m: Message): Promise<void> => {
  if (m.chat.type !== 'private' || !m.from) return;
  if (await bankForward(ctx, tg, m)) return;
  await limit(ctx, 'tg', 20, 60, String(m.from.id));
  const text = (m.text ?? '').trim();
  const start = /^\/start(?:\s+(\S{1,64}))?$/.exec(text);
  if (start) return onStart(ctx, tg, m, start[1] ?? '');
  const help = /^\/yordam\s+([\s\S]{3,1000})$/.exec(text);
  if (help?.[1]) {
    const admin = Number(ctx.env.ADMIN_TELEGRAM_ID);
    if (admin) await tg.send(admin, `🆘 ${m.from.first_name} ${m.from.username ? `@${m.from.username}` : ''} (${m.from.id}):\n${help[1]}`);
    return tg.send(m.chat.id, 'Xabaringiz yuborildi. / Сообщение отправлено.');
  }
  const session = await ctx.db.rpc<{ step: string } | null>('svc_bot_session', { p_telegram: m.from.id });
  if (session?.step === 'nick' && !text.startsWith('/')) return takeNick(ctx, tg, m, text);
  if (text === '/kirish') return greet(ctx, tg, m, null);
  if (text === '/admin') return adminLink(ctx, tg, m);
  return menu(ctx, tg, m.chat.id);
};

const onCallback = async (ctx: Ctx, tg: Telegram, q: NonNullable<Update['callback_query']>): Promise<void> => {
  if (q.data === 'open') {
    await tg.answer(q.id, '🏙');
    const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: q.from.id, p_ref: null, p_name: q.from.first_name });
    if (r.state === 'ready' && r.user) return sendLogin(ctx, tg, q.from.id, r.user);
    return tg.send(q.from.id, r.state === 'banned' ? 'Akkaunt bloklangan. / Аккаунт заблокирован.' : ASK_NICK);
  }
  const token = /^ok:([0-9a-f]{32})$/.exec(q.data ?? '')?.[1];
  if (!token) return;
  const r = await ctx.db.rpc<{ ok: boolean; error?: string }>('svc_tg_confirm', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_telegram: q.from.id, p_name: q.from.first_name });
  await tg.answer(q.id, r.ok ? 'Tasdiqlandi ✅' : 'Muddati tugagan');
  const why = r.error === 'telegram_used' ? 'Bu Telegram boshqa akkauntga ulangan.' : 'Havola muddati tugagan. Saytdan qaytadan boshlang.';
  await tg.send(q.from.id, r.ok ? 'Tayyor! Saytga qayting.' : why);
};

/** Bitta yangilanish (webhook va lokal sinov uchun umumiy). */
export const botUpdate = async (ctx: Ctx, tg: Telegram, raw: unknown): Promise<void> => {
  const r = updateSchema.safeParse(raw);
  if (!r.success) throw new HttpError(400, 'bad_format');
  if (r.data.message) await onMessage(ctx, tg, r.data.message);
  if (r.data.callback_query) await onCallback(ctx, tg, r.data.callback_query);
};

export const handleTelegram = async (req: Request, ctx: Ctx): Promise<Response> => {
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !ctx.tg || !safeEqual(req.headers.get('x-telegram-bot-api-secret-token') ?? '', secret)) return json({ error: 'forbidden' }, 403);
  await botUpdate(ctx, ctx.tg, await readJson(req, updateSchema));
  return json({ ok: true });
};

/** Faqat lokal (DEV=1): bot bilan suhbatni Telegram'siz sinash — javob xabarlari qaytadi. */
export const devTelegram = async (req: Request, ctx: Ctx): Promise<Response> => {
  if (ctx.env.DEV !== '1') throw new HttpError(404, 'not_found');
  const sent: { readonly text: string; readonly buttons: readonly TgButton[] }[] = [];
  const tg: Telegram = { send: async (_chat, text, buttons) => { sent.push({ text, buttons: buttons ?? [] }); }, answer: async () => undefined, video: async () => undefined };
  await botUpdate(ctx, tg, await readJson(req, updateSchema));
  return json({ sent });
};

const NOTES: Readonly<Record<string, readonly [string, string]>> = {
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
  decor_gift: ['🎁 Sizga bezak sovg‘a qilindi! Hovlingizga qo‘ying.', '🎁 Вам подарили украшение! Поставьте во двор.'],
  yard_winner: ['🌷 Tabriklaymiz! Hovlingiz haftaning eng chiroyli hovlisi bo‘ldi.', '🌷 Поздравляем! Ваш двор — лучший двор недели.'],
  new_decor: ['✨ Do‘konda yangi bezak: {name}', '✨ Новое украшение в магазине: {name}'],
  elected: ['👑 Saylovda g‘olib bo‘ldingiz!', '👑 Вы победили на выборах!'],
  inactive_warning: ['⏳ Uzoq vaqt kirmadingiz. 14 kun ichida kirmasangiz, bepul uyingiz bo‘shatiladi.', '⏳ Вы давно не заходили. Если не зайдёте 14 дней, бесплатный дом освободится.'],
};

interface OutboxRow { readonly kind: string; readonly chat: number; readonly lang: string; readonly data?: Readonly<Record<string, unknown>> }
const noteText = (r: OutboxRow): string | undefined => {
  const isRu = r.lang === 'ru';
  return NOTES[r.kind]?.[isRu ? 1 : 0].replace('{name}', String(r.data?.[isRu ? 'ru' : 'uz'] ?? ''));
};
export const flushOutbox = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const rows = await ctx.db.rpc<readonly OutboxRow[]>('svc_outbox', {});
  const results = await Promise.allSettled(rows.map((r) => {
    const text = noteText(r);
    return text && ctx.tg ? ctx.tg.send(r.chat, text, [{ text: '🏙', url: ctx.env.SITE_URL }]) : Promise.resolve();
  }));
  return results.filter((r) => r.status === 'fulfilled').length;
};
