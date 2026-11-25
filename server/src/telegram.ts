import { z } from 'zod';
import { parseBankMessage } from './payments/bank.ts';
import { createAccount } from './auth.ts';
import { sendReset } from './password.ts';
import { SUPPORT_ASK, adminReply, askNick, nickProblem, normalizeNick, openDispute, proposeNick, supportMessage, takeProof } from './support.ts';
import { buyCode, preCheckout, sendInvoice, shopMenu, starsPaid } from './shop.ts';
import { HttpError, type Ctx, type Telegram, type TgButton } from './types.ts';
import { json, keyed, limit, randomPassword, randomToken, readJson, requireUser, safeEqual } from './util.ts';

export const telegramApi = (token: string, fetcher: typeof fetch = fetch): Telegram => {
  const call = async (method: string, body: unknown): Promise<void> => {
    const res = await fetcher(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    // 403 = foydalanuvchi botni bloklagan; boshqalarni to'xtatmasin.
    if (!res.ok && res.status !== 403) throw new Error(`telegram ${method}: ${res.status}`);
  };
  const callResult = async <R>(method: string, body: unknown): Promise<R | null> => {
    const res = await fetcher(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return ((await res.json().catch(() => ({}))) as { result?: R }).result ?? null;
  };
  const keyboard = (buttons?: readonly TgButton[]): unknown =>
    buttons && { inline_keyboard: buttons.map((b) => [b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data }]) };
  return {
    send: (chat, text, buttons) => call('sendMessage', { chat_id: chat, text, reply_markup: keyboard(buttons), link_preview_options: { is_disabled: true } }),
    answer: (id, text) => call('answerCallbackQuery', { callback_query_id: id, text }),
    video: (chat, url, caption) => call('sendVideo', { chat_id: chat, video: url, caption }),
    isMember: async (channel, user) => {
      const res = await fetcher(`https://api.telegram.org/bot${token}/getChatMember`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: channel, user_id: user }),
      });
      if (!res.ok) return false;
      const body = (await res.json().catch(() => ({}))) as { result?: { status?: string } };
      return ['creator', 'administrator', 'member'].includes(body.result?.status ?? '');
    },
    invoice: (chat, title, description, payload, stars) => call('sendInvoice', { chat_id: chat, title: title.slice(0, 32), description: description.slice(0, 255), payload, currency: 'XTR', prices: [{ label: title.slice(0, 32), amount: stars }] }),
    preCheckout: (id, isOk, error) => call('answerPreCheckoutQuery', { pre_checkout_query_id: id, ok: isOk, ...(error ? { error_message: error } : {}) }),
    document: async (chat, name, data, caption) => {
      const form = new FormData();
      form.set('chat_id', String(chat));
      form.set('caption', caption.slice(0, 1000));
      form.set('document', new Blob([new Uint8Array(data)], { type: 'application/gzip' }), name);
      const res = await fetcher(`https://api.telegram.org/bot${token}/sendDocument`, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`telegram sendDocument: ${res.status}`);
    },
    sendId: async (chat, text) => (await callResult<{ message_id: number }>('sendMessage', { chat_id: chat, text, link_preview_options: { is_disabled: true } }))?.message_id ?? null,
    photo: async (chat, fileId, caption) => (await callResult<{ message_id: number }>('sendPhoto', { chat_id: chat, photo: fileId, caption: caption.slice(0, 1000) }))?.message_id ?? null,
    download: async (fileId) => {
      const file = await callResult<{ file_path?: string }>('getFile', { file_id: fileId });
      if (!file?.file_path) return null;
      const res = await fetcher(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    },
    refundStars: async (user, chargeId) => {
      const res = await fetcher(`https://api.telegram.org/bot${token}/refundStarPayment`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ user_id: user, telegram_payment_charge_id: chargeId }),
      });
      if (!res.ok) throw new HttpError(502, 'refund_failed');
    },
  };
};

const fromSchema = z.object({ id: z.number(), first_name: z.string().default(''), username: z.string().optional() });
const updateSchema = z.object({
  message: z.object({
    from: fromSchema.optional(), chat: z.object({ id: z.number(), type: z.string() }), text: z.string().max(4096).optional(), message_id: z.number(),
    forward_origin: z.object({ sender_user: z.object({ username: z.string().optional() }).optional() }).optional(), date: z.number().optional(),
    photo: z.array(z.object({ file_id: z.string().max(300) })).max(10).optional(), caption: z.string().max(1024).optional(),
    reply_to_message: z.object({ message_id: z.number() }).optional(),
    successful_payment: z.object({ currency: z.string(), total_amount: z.number().int(), invoice_payload: z.string().max(128), telegram_payment_charge_id: z.string().max(200) }).optional(),
  }).optional(),
  pre_checkout_query: z.object({ id: z.string(), from: fromSchema, currency: z.string(), total_amount: z.number().int(), invoice_payload: z.string().max(128) }).optional(),
  callback_query: z.object({ id: z.string(), from: fromSchema, data: z.string().max(64).optional() }).optional(),
});
type Update = z.infer<typeof updateSchema>;
type Message = NonNullable<Update['message']>;

const HELP = [
  '🏘 CityLand UZ — 3D shahar / 3D-город',
  "Shaharni ochish uchun pastdagi tugmani bosing. / Нажмите кнопку ниже, чтобы открыть город.",
  '/yordam matn — savol yuborish / вопрос в поддержку',
].join('\n');


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
/** `ADMIN_TELEGRAM_ID` dagi Telegram birinchi kirishdayoq admin bo'ladi (SQL kerak emas). */
const promoteOwner = async (ctx: Ctx, telegram: number): Promise<void> => {
  if (ctx.env.ADMIN_TELEGRAM_ID && String(telegram) === ctx.env.ADMIN_TELEGRAM_ID.trim()) await ctx.db.rpc('svc_make_admin', { p_telegram: telegram });
};

const greet = async (ctx: Ctx, tg: Telegram, m: Message, ref: string | null): Promise<void> => {
  const from = m.from!;
  await promoteOwner(ctx, from.id);
  const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: from.id, p_ref: ref, p_name: from.first_name });
  if (r.state === 'banned') return tg.send(m.chat.id, 'Akkaunt bloklangan. / Аккаунт заблокирован.');
  if (r.state === 'ready' && r.user) return sendLogin(ctx, tg, m.chat.id, r.user);
  return tg.send(m.chat.id, await askNick(ctx));
};

/** "Ha, to'g'ri" bosildi: akkaunt yaratiladi, havola yuboriladi. */
const confirmNick = async (ctx: Ctx, tg: Telegram, chat: number, from: { readonly id: number }, nick: string): Promise<void> => {
  try {
    const free = await ctx.db.rpc<string>('svc_nick_check', { p_nick: nick });
    const user = await createAccount(ctx, `tg${from.id}`, randomPassword(), null, from.id, free);
    await promoteOwner(ctx, from.id);
    return await sendLogin(ctx, tg, chat, user, true);
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('nick_taken')) return proposeNick(ctx, tg, chat, from.id, nick);
    throw error;
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
  return tg.send(chat, HELP, [{ text: '🏙 Shaharni ochish / Открыть город', data: 'open' }, { text: '🏠 Mening uyim / Мой дом', data: 'open' }, { text: '📣 Yangiliklar kanali / Канал новостей', url: `https://t.me/${channel}` }, { text: '✅ Obuna bo‘ldim — tanga olish / Я подписался', data: 'chan' }, { text: '🛍 Do‘kon / Магазин', data: 'shop' }, { text: '✍️ Adminga yozish / Написать админу', data: 'support' }]);
};

const onStart = async (ctx: Ctx, tg: Telegram, m: Message, param: string): Promise<void> => {
  const link = /^link_([0-9a-f]{32})$/.exec(param)?.[1];
  if (link) return confirmButton(ctx, tg, m.chat.id, link);
  if (param === 'reset') return sendReset(ctx, tg, m.from!.id);
  if (param === 'yordam') {
    await ctx.db.rpc('svc_bot_step', { p_telegram: m.from!.id, p_step: 'support' });
    return tg.send(m.chat.id, SUPPORT_ASK);
  }
  if (param === 'wait') {
    const n = await ctx.db.rpc<number>('svc_tg_waitlist', { p_telegram: m.from!.id });
    return tg.send(m.chat.id, `✅ Ro'yxatga yozildingiz (${n}). Shahar ochilganda shu yerga xabar beramiz. / Вы в списке. Сообщим, когда город откроется.`);
  }
  const buy = /^buy_([A-Za-z0-9_]{1,60})$/.exec(param)?.[1];
  if (buy) return buyCode(ctx, tg, m.chat.id, m.from!.id, buy);
  const ref = /^r_([0-9a-f]{6,16})$/.exec(param)?.[1] ?? null;
  return greet(ctx, tg, m, ref);
};

const onMessage = async (ctx: Ctx, tg: Telegram, m: Message): Promise<void> => {
  if (m.chat.type !== 'private' || !m.from) return;
  if (m.successful_payment?.currency === 'XTR') return starsPaid(ctx, tg, m.chat.id, m.successful_payment);
  if (await bankForward(ctx, tg, m)) return;
  await limit(ctx, 'tg', 20, 60, String(m.from.id));
  const text = (m.text ?? '').trim();
  const start = /^\/start(?:\s+(\S{1,64}))?$/.exec(text);
  if (start) return onStart(ctx, tg, m, start[1] ?? '');
  const photo = m.photo?.at(-1)?.file_id ?? null;
  const body = text || (m.caption ?? '').trim();
  // Admin murojaatga "Javob berish" (reply) qildi.
  if (String(m.from.id) === ctx.env.ADMIN_TELEGRAM_ID?.trim() && m.reply_to_message && (await adminReply(ctx, tg, m.reply_to_message.message_id, body, photo))) return tg.send(m.chat.id, '✅ Javob yuborildi.');
  const help = /^\/yordam\s+([\s\S]{3,1000})$/.exec(text);
  if (help?.[1]) return supportMessage(ctx, tg, m.chat.id, m.from, help[1], null);
  if (text === '/yordam') {
    await ctx.db.rpc('svc_bot_step', { p_telegram: m.from.id, p_step: 'support' });
    return tg.send(m.chat.id, SUPPORT_ASK);
  }
  const session = await ctx.db.rpc<{ step: string; nick: string | null; ref_id: number | null } | null>('svc_bot_session', { p_telegram: m.from.id });
  const isPlain = !text.startsWith('/');
  if (session?.step === 'support' && isPlain && (body || photo)) return supportMessage(ctx, tg, m.chat.id, m.from, body, photo);
  if ((session?.step === 'dispute' || session?.step === 'dispute_owner') && session.ref_id) {
    if (photo) return takeProof(ctx, tg, m.chat.id, m.from.id, session.ref_id, photo);
    if (isPlain) return tg.send(m.chat.id, 'Iltimos, skrinshotni rasm qilib yuboring. / Пришлите скриншот как фото.');
  }
  if ((session?.step === 'nick' || session?.step === 'confirm') && isPlain && text) return proposeNick(ctx, tg, m.chat.id, m.from.id, text);
  if (session?.step === 'renick' && isPlain && text) {
    const problem = nickProblem(normalizeNick(text));
    if (problem) return tg.send(m.chat.id, problem);
    try {
      const nick = await ctx.db.rpc<string>('svc_renick', { p_telegram: m.from.id, p_nick: normalizeNick(text) });
      return tg.send(m.chat.id, `✅ Yangi nikingiz: @${nick}. / Ваш новый ник: @${nick}.`);
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('nick_taken')) return tg.send(m.chat.id, 'Bu nik band — boshqasini yozing. / Ник занят.');
      throw error;
    }
  }
  if (text === '/kirish') return greet(ctx, tg, m, null);
  if (text === '/admin') return adminLink(ctx, tg, m);
  if (text === '/parol') return sendReset(ctx, tg, m.from.id);
  if (text === '/stop' || text === '/xabar') {
    const isOn = text === '/xabar';
    await ctx.db.rpc('svc_news', { p_telegram: m.from.id, p_on: isOn });
    return tg.send(m.chat.id, isOn ? '🔔 Xabarlar yoqildi. / Уведомления включены.' : '🔕 Umumiy xabarlar o‘chirildi (muhimlari keladi). Qayta yoqish: /xabar / Рассылка выключена. Включить: /xabar');
  }
  if (text === '/dokon') return shopMenu(ctx, tg, m.chat.id);
  const salute = /^\/salyut\s+([\s\S]{1,200})$/.exec(text)?.[1];
  if (salute) return sendInvoice(ctx, tg, m.chat.id, m.from.id, { kind: 'salute', payload: { text: salute.trim() } });
  return menu(ctx, tg, m.chat.id);
};

const onCallback = async (ctx: Ctx, tg: Telegram, q: NonNullable<Update['callback_query']>): Promise<void> => {
  const vote = /^poll:(\d{1,9}):([1-6])$/.exec(q.data ?? '');
  if (vote) {
    const picked = await ctx.db.rpc<string>('svc_poll_vote', { p_telegram: q.from.id, p_poll: Number(vote[1]), p_option: Number(vote[2]) });
    if (picked === 'own') return tg.answer(q.id, 'O‘z uyingizga ovoz berib bo‘lmaydi / Нельзя голосовать за свой дом');
    return tg.answer(q.id, picked === 'closed' ? 'So‘rovnoma yopilgan / Опрос закрыт' : `✅ ${picked}`);
  }
  if (q.data === 'shop') { await tg.answer(q.id, '🛍'); return shopMenu(ctx, tg, q.from.id); }
  if (q.data === 'support') {
    await tg.answer(q.id, '✍️');
    await ctx.db.rpc('svc_bot_step', { p_telegram: q.from.id, p_step: 'support' });
    return tg.send(q.from.id, SUPPORT_ASK);
  }
  if (q.data === 'nick_ok' || q.data === 'nick_again' || q.data === 'claim') {
    await tg.answer(q.id, '✓');
    const session = await ctx.db.rpc<{ step: string; nick: string | null } | null>('svc_bot_session', { p_telegram: q.from.id });
    if (!session?.nick) return tg.send(q.from.id, await askNick(ctx));
    if (q.data === 'nick_ok' && session.step === 'confirm') return confirmNick(ctx, tg, q.from.id, q.from, session.nick);
    if (q.data === 'claim') return openDispute(ctx, tg, q.from.id, q.from.id, session.nick);
    await ctx.db.rpc('svc_bot_step', { p_telegram: q.from.id, p_step: 'nick' });
    return tg.send(q.from.id, await askNick(ctx));
  }
  const give = /^dgive:(\d{1,9})$/.exec(q.data ?? '')?.[1];
  if (give) {
    await ctx.db.rpc('svc_dispute_give', { p_id: Number(give), p_telegram: q.from.id });
    await tg.answer(q.id, '✓');
    return tg.send(q.from.id, "Rahmat. Nik haqiqiy egasiga o'tdi — yangi nikingizni yozing. / Спасибо. Напишите новый ник.");
  }
  if (q.data === 'chan') return channelButton(ctx, tg, q.id, q.from.id);
  const buy = /^buy:([A-Za-z0-9_]{1,60})$/.exec(q.data ?? '')?.[1];
  if (buy) { await tg.answer(q.id, '🛍'); return buyCode(ctx, tg, q.from.id, q.from.id, buy); }
  if (q.data === 'open') {
    await tg.answer(q.id, '🏙');
    const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: q.from.id, p_ref: null, p_name: q.from.first_name });
    if (r.state === 'ready' && r.user) return sendLogin(ctx, tg, q.from.id, r.user);
    return tg.send(q.from.id, r.state === 'banned' ? 'Akkaunt bloklangan. / Аккаунт заблокирован.' : await askNick(ctx));
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
  if (r.data.pre_checkout_query) await preCheckout(ctx, tg, r.data.pre_checkout_query);
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
  const tg: Telegram = { send: async (_chat, text, buttons) => { sent.push({ text, buttons: buttons ?? [] }); }, answer: async (_id, text) => { sent.push({ text, buttons: [] }); }, video: async () => undefined, isMember: async () => true,
    invoice: async (_chat, title, _d, payload, stars) => { sent.push({ text: `invoice:${payload}:${stars}:${title}`, buttons: [] }); },
    preCheckout: async (_id, isOk) => { sent.push({ text: `precheckout:${isOk}`, buttons: [] }); }, refundStars: async () => undefined, document: async () => undefined, sendId: async () => null, photo: async () => null, download: async () => null };
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

const channelOf = (ctx: Ctx): string => `@${(ctx.env.TELEGRAM_CHANNEL ?? 'citylanduz').replace(/^@/, '')}`;
interface ChannelResult { readonly state: 'paid' | 'done'; readonly gain?: number; readonly coins: number }
/** Kanalga obuna bonusi (bir marta): bot getChatMember bilan tekshiradi. */
const channelBonus = async (ctx: Ctx, tg: Telegram, telegram: number): Promise<ChannelResult> => {
  if (!(await tg.isMember(channelOf(ctx), telegram))) throw new HttpError(400, 'not_subscribed');
  return ctx.db.rpc<ChannelResult>('svc_channel_bonus', { p_telegram: telegram });
};
/** POST /coins/channel — saytdagi "Obunani tekshirish". */
/** Lokal sinov uchun hech narsa yubormaydigan Telegram. */
const DEV_TG: Telegram = { send: async () => undefined, answer: async () => undefined, video: async () => undefined, isMember: async () => false, invoice: async () => undefined, preCheckout: async () => undefined, refundStars: async () => undefined, document: async () => undefined, sendId: async () => null, photo: async () => null, download: async () => null };
export const channelCheck = async (req: Request, ctx: Ctx): Promise<Response> => {
  const user = await requireUser(req, ctx);
  // Lokal sinov: bot tokeni yo'q, lekin DEV=1 va DEV_CHANNEL_OK=1 bo'lsa — obuna "bor".
  const isFake = ctx.env.DEV === '1' && ctx.env.DEV_CHANNEL_OK === '1';
  const tg = ctx.tg ?? (isFake ? { ...DEV_TG, isMember: async () => true } : null);
  if (!tg) throw new HttpError(503, 'telegram_off');
  await limit(ctx, 'channel', 10, 3600, user.id);
  const telegram = await ctx.db.rpc<number>('svc_channel_target', { p_user: user.id });
  return json(await channelBonus(ctx, tg, telegram));
};
/** Botdagi "Obuna bo'ldim" tugmasi. */
async function channelButton(ctx: Ctx, tg: Telegram, callbackId: string, telegram: number): Promise<void> {
  try {
    const r = await channelBonus(ctx, tg, telegram);
    await tg.answer(callbackId, r.state === 'paid' ? `+${r.gain ?? 0} tanga ✅` : 'Bonus olingan / Бонус уже получен');
  } catch (error: unknown) {
    await tg.answer(callbackId, error instanceof HttpError && error.message === 'not_subscribed' ? 'Avval kanalga obuna bo‘ling / Сначала подпишитесь' : 'Xato / Ошибка');
  }
}

interface QueuedMessage { readonly chat: number; readonly text: string; readonly poll: number | null; readonly options: readonly string[] | null; readonly plots?: readonly string[] | null }
/** Hovli so'rovnomasi: har nomzodning uy havolasi matnga qo'shiladi. */
const messageText = (ctx: Ctx, r: QueuedMessage): string => (r.plots && r.options ? `${r.text}\n\n${r.plots.map((p, i) => `${i + 1}. ${r.options?.[i] ?? ''} — ${ctx.env.SITE_URL}/?uy=${p}`).join('\n')}` : r.text);
/** Telegram: sekundiga ~25 xabardan ko'p emas. */
const BROADCAST_BATCH = 25;
const BROADCAST_PER_RUN = 300;
const pause = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
/** Cron: admin yuborgan xabar va so'rovnomalarni navbat bilan jo'natadi. */
export const flushBroadcast = async (ctx: Ctx, delayMs = 1100): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const rows = await ctx.db.rpc<readonly QueuedMessage[]>('svc_broadcast_next', { p_limit: BROADCAST_PER_RUN });
  for (let i = 0; i < rows.length; i += BROADCAST_BATCH) {
    if (i > 0) await pause(delayMs);
    // chat = 0 — kanalga e'lon.
    await Promise.allSettled(rows.slice(i, i + BROADCAST_BATCH).map((r) => tg.send(r.chat === 0 ? channelOf(ctx) : r.chat, messageText(ctx, r), r.poll && r.options ? r.options.map((o, k) => ({ text: o, data: `poll:${r.poll}:${k + 1}` })) : [{ text: '🏙', url: ctx.env.SITE_URL }])));
  }
  return rows.length;
};

const LOCAL_ADMIN_TG = 1;
/** Faqat lokal (DEV=1): bot yo'q — "Admin sifatida kirish (lokal)" tugmasi admin akkauntiga bir martalik havola oladi. Ishlab chiqarishda 404. */
export const devAdmin = async (_req: Request, ctx: Ctx): Promise<Response> => {
  if (ctx.env.DEV !== '1') throw new HttpError(404, 'not_found');
  const telegram = Number(ctx.env.ADMIN_TELEGRAM_ID) || LOCAL_ADMIN_TG;
  const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: telegram, p_ref: null, p_name: 'Admin' });
  const user = r.user ?? (await createAccount(ctx, `tg${telegram}`, randomPassword(), null, telegram, 'admin_lokal'));
  await ctx.db.rpc('svc_make_admin', { p_telegram: telegram });
  return json({ token: await issueLogin(ctx, user) });
};

