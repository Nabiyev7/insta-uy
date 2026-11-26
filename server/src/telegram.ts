import { z } from 'zod';
import { parseBankMessage } from './payments/bank.ts';
import { createAccount } from './auth.ts';
import { bt, both, guessLang, langOf, oneLang, type Lang, type TextKey } from './botText.ts';
import { sendReset } from './password.ts';
import { adminReply, askNick, nickProblem, normalizeNick, openDispute, proposeNick, supportMessage, takeProof } from './support.ts';
import { buyCode, payCode, preCheckout, sendInvoice, shopMenu, starsPaid, testBuy } from './shop.ts';
import { HttpError, type Ctx, type ReplyMenu, type Telegram, type TgButton } from './types.ts';
import { json, keyed, limit, randomPassword, randomToken, readJson, requireUser, safeEqual } from './util.ts';

/** Inline tugmalar: `row` bir xil bo'lganlari bir qatorda; webApp — Mini App, url — havola, data — callback. */
export const inlineKeyboard = (buttons?: readonly TgButton[]): unknown => {
  if (!buttons || buttons.length === 0) return undefined;
  const rows: unknown[][] = [];
  let lastRow: number | undefined;
  for (const b of buttons) {
    const cell = b.webApp ? { text: b.text, web_app: { url: b.webApp } } : b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.data };
    if (b.row !== undefined && b.row === lastRow) rows.at(-1)?.push(cell);
    else rows.push([cell]);
    lastRow = b.row;
  }
  return { inline_keyboard: rows };
};
/** Pastdagi doimiy menyu (reply keyboard). */
export const replyKeyboard = (menu: ReplyMenu): unknown => ({
  keyboard: menu.map((row) => row.map((b) => (b.webApp ? { text: b.text, web_app: { url: b.webApp } } : { text: b.text }))), resize_keyboard: true, is_persistent: true,
});

export const telegramApi = (token: string, fetcher: typeof fetch = fetch): Telegram => {
  const post = (method: string, body: unknown): Promise<Response> =>
    fetcher(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const call = async (method: string, body: unknown): Promise<void> => {
    const res = await post(method, body);
    // 403 = foydalanuvchi botni bloklagan; boshqalarni to'xtatmasin.
    if (!res.ok && res.status !== 403) throw new Error(`telegram ${method}: ${res.status}`);
  };
  const callResult = async <R>(method: string, body: unknown): Promise<R | null> => {
    const res = await post(method, body);
    if (!res.ok) return null;
    return ((await res.json().catch(() => ({}))) as { result?: R }).result ?? null;
  };
  return {
    send: (chat, text, buttons, menu) => call('sendMessage', { chat_id: chat, text, reply_markup: menu ? replyKeyboard(menu) : inlineKeyboard(buttons), link_preview_options: { is_disabled: true } }),
    answer: (id, text) => call('answerCallbackQuery', { callback_query_id: id, text }),
    video: (chat, url, caption) => call('sendVideo', { chat_id: chat, video: url, caption }),
    isMember: async (channel, user) => {
      const r = await callResult<{ status?: string }>('getChatMember', { chat_id: channel, user_id: user });
      return ['creator', 'administrator', 'member'].includes(r?.status ?? '');
    },
    invoice: (chat, title, description, payload, stars) => call('sendInvoice', { chat_id: chat, title: title.slice(0, 32), description: description.slice(0, 255), payload, currency: 'XTR', prices: [{ label: title.slice(0, 32), amount: stars }] }),
    invoiceLink: (title, description, payload, stars) => callResult<string>('createInvoiceLink', { title: title.slice(0, 32), description: description.slice(0, 255), payload, currency: 'XTR', prices: [{ label: title.slice(0, 32), amount: stars }] }),
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
    photoButtons: (chat, photo, caption, buttons) => call('sendPhoto', { chat_id: chat, photo, caption: caption.slice(0, 1000), reply_markup: inlineKeyboard(buttons) }),
    download: async (fileId) => {
      const file = await callResult<{ file_path?: string }>('getFile', { file_id: fileId });
      if (!file?.file_path) return null;
      const res = await fetcher(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    },
    refundStars: async (user, chargeId) => {
      const res = await post('refundStarPayment', { user_id: user, telegram_payment_charge_id: chargeId });
      if (!res.ok) throw new HttpError(502, 'refund_failed');
    },
  };
};

const fromSchema = z.object({ id: z.number(), first_name: z.string().default(''), username: z.string().optional(), language_code: z.string().max(10).optional() });
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
type From = z.infer<typeof fromSchema>;

/** Har xabarda bazadan: til, qadam, akkaunt va uy bormi. */
interface BotCtx {
  readonly lang: string; readonly user: string | null; readonly nick: string | null; readonly banned: boolean; readonly news: boolean; readonly has_house: boolean;
  readonly step: string | null; readonly sess_nick: string | null; readonly ref_id: number | null;
}
const loadCtx = async (ctx: Ctx, from: From): Promise<{ readonly c: BotCtx; readonly lang: Lang }> => {
  const c = await ctx.db.rpc<BotCtx>('svc_bot_ctx', { p_telegram: from.id });
  // Hali hech narsa yo'q (yangi odam) — Telegram tili bo'yicha taxmin.
  return { c, lang: c.user === null && c.step === null ? guessLang(from.language_code) : langOf(c.lang) };
};

/** Sayt manzili: til va (ixtiyoriy) ochiladigan oyna bilan — Mini App va brauzer uchun bir xil. */
export const siteUrl = (ctx: Ctx, lang: Lang, extra: Readonly<Record<string, string>> = {}): string => {
  const q = new URLSearchParams({ ...extra, til: lang });
  return `${ctx.env.SITE_URL}/?${q.toString()}`;
};
/** Pastdagi 6 tugma (2 × 3). Shahar, Uyim/Uy olish, Do'kon — Mini App. */
export const mainMenu = (ctx: Ctx, lang: Lang, hasHouse: boolean): ReplyMenu => [
  [{ text: bt(lang, 'btnCity'), webApp: siteUrl(ctx, lang) }, hasHouse ? { text: bt(lang, 'btnHome'), webApp: siteUrl(ctx, lang, { panel: 'uyim' }) } : { text: bt(lang, 'btnClaim'), webApp: siteUrl(ctx, lang, { panel: 'uyolish' }) }, { text: bt(lang, 'btnShop'), webApp: siteUrl(ctx, lang, { panel: 'dokon' }) }],
  [{ text: bt(lang, 'btnInvite') }, { text: bt(lang, 'btnSupport') }, { text: bt(lang, 'btnSettings') }],
];
const langButtons = (): readonly TgButton[] => [{ text: bt('uz', 'langUz'), data: 'lang:uz', row: 1 }, { text: bt('ru', 'langRu'), data: 'lang:ru', row: 1 }];
/** Matnli menyu tugmasi qaysi (ikkala tilda tanish). */
const MENU_KEYS: readonly TextKey[] = ['btnCity', 'btnHome', 'btnClaim', 'btnShop', 'btnInvite', 'btnSupport', 'btnSettings'];
const menuKey = (text: string): TextKey | null => MENU_KEYS.find((k) => both(k).includes(text)) ?? null;

const issueLogin = async (ctx: Ctx, user: string): Promise<string> => {
  const token = randomToken();
  await ctx.db.rpc('svc_login_issue', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_user: user });
  return token;
};
/** Akkaunt tayyor: pastdagi menyu (Mini App) + brauzer uchun bir martalik havola. */
const sendHome = async (ctx: Ctx, tg: Telegram, chat: number, lang: Lang, home: { readonly user: string; readonly nick: string | null; readonly hasHouse: boolean; readonly isNew?: boolean }): Promise<void> => {
  await tg.send(chat, home.isNew ? bt(lang, 'ready') : bt(lang, 'hello', { nick: home.nick ?? '' }), undefined, mainMenu(ctx, lang, home.hasHouse));
  const token = await issueLogin(ctx, home.user);
  return tg.send(chat, bt(lang, 'browserLink'), [{ text: bt(lang, 'btnBrowser'), url: `${ctx.env.SITE_URL}/?kirish=${token}&til=${lang}` }]);
};

interface BotStart { readonly state: 'ready' | 'need_nick' | 'banned' | 'renick'; readonly user?: string; readonly nick?: string | null; readonly lang?: string; readonly has_house?: boolean; readonly is_first?: boolean }
/** Faqat egasi: `ADMIN_TELEGRAM_ID` (bazada ham admin roli tekshiriladi). */
export const isOwnerChat = (ctx: Ctx, telegram: number): boolean => Boolean(ctx.env.ADMIN_TELEGRAM_ID) && String(telegram) === ctx.env.ADMIN_TELEGRAM_ID?.trim();
const isOwner = async (ctx: Ctx, telegram: number): Promise<boolean> => isOwnerChat(ctx, telegram) && (await ctx.db.rpc<boolean>('svc_is_owner_tg', { p_telegram: telegram }));
/** `ADMIN_TELEGRAM_ID` dagi Telegram birinchi kirishdayoq egasi (admin) bo'ladi. */
const promoteOwner = async (ctx: Ctx, telegram: number): Promise<void> => {
  if (isOwnerChat(ctx, telegram)) await ctx.db.rpc('svc_set_owner', { p_telegram: telegram });
};

const greet = async (ctx: Ctx, tg: Telegram, m: Message, ref: string | null): Promise<void> => {
  const from = m.from!;
  await promoteOwner(ctx, from.id);
  const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: from.id, p_ref: ref, p_name: from.first_name, p_lang: guessLang(from.language_code) });
  const lang = langOf(r.lang);
  if (r.state === 'banned') return tg.send(m.chat.id, bt(lang, 'banned'));
  if (r.state === 'renick') return tg.send(m.chat.id, bt(lang, 'renick'));
  if (r.state === 'ready' && r.user) {
    // /start — eslatma va xabarlar yana yoqiladi (o'chirilgan bo'lsa).
    await ctx.db.rpc('svc_news', { p_telegram: from.id, p_on: true });
    return sendHome(ctx, tg, m.chat.id, lang, { user: r.user, nick: r.nick ?? null, hasHouse: r.has_house === true });
  }
  // Birinchi xabarda til tugmalari.
  return tg.send(m.chat.id, await askNick(ctx, lang), r.is_first ? langButtons() : undefined);
};

/** "Ha, to'g'ri" bosildi: akkaunt yaratiladi (bot tilida), menyu va havola yuboriladi. */
const confirmNick = async (ctx: Ctx, tg: Telegram, chat: number, from: From, nick: string, lang: Lang): Promise<void> => {
  try {
    const free = await ctx.db.rpc<string>('svc_nick_check', { p_nick: nick });
    const user = await createAccount(ctx, `tg${from.id}`, randomPassword(), null, from.id, free);
    await ctx.db.rpc('svc_bot_lang', { p_telegram: from.id, p_lang: lang });
    await promoteOwner(ctx, from.id);
    return await sendHome(ctx, tg, chat, lang, { user, nick: free, hasHouse: false, isNew: true });
  } catch (error: unknown) {
    const code = error instanceof Error ? error.message : '';
    if (code.includes('nick_taken')) return proposeNick(ctx, tg, chat, from.id, nick, lang);
    throw error;
  }
};

interface SvcUser { readonly user_id: string; readonly role: string; readonly is_banned: boolean }
/** Admin panelga bir martalik havola — faqat egasiga. */
const adminLink = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, lang: Lang): Promise<void> => {
  const u = await ctx.db.rpc<SvcUser | null>('svc_user', { p_telegram: telegram });
  if (!u || u.is_banned || u.role !== 'admin') return tg.send(chat, bt(lang, 'noCommand'));
  if (!ctx.env.ADMIN_URL) return tg.send(chat, bt(lang, 'adminUrlMissing'));
  const token = await issueLogin(ctx, u.user_id);
  return tg.send(chat, bt(lang, 'adminLink'), [{ text: bt(lang, 'btnAdmin'), url: `${ctx.env.ADMIN_URL}/?kirish=${token}` }]);
};

const linkConfirm = (ctx: Ctx, tg: Telegram, chat: number, token: string, lang: Lang): Promise<void> =>
  tg.send(chat, bt(lang, 'linkConfirm', { site: ctx.env.SITE_URL }), [{ text: bt(lang, 'btnItsMe'), data: `ok:${token}` }]);

/** Egasi bank botining xabarini forward qiladi → avtomatik solishtirish. */
const bankForward = async (ctx: Ctx, tg: Telegram, m: Message, lang: Lang): Promise<boolean> => {
  const origin = m.forward_origin?.sender_user?.username?.toLowerCase();
  if (!isOwnerChat(ctx, m.from?.id ?? 0) || !ctx.env.BANK_BOT || origin !== ctx.env.BANK_BOT.toLowerCase() || !m.text) return false;
  const p = parseBankMessage(m.text);
  if (!p) { await tg.send(m.chat.id, bt(lang, 'bankNoAmount')); return true; }
  const r = await ctx.db.rpc<{ result: string }>('svc_payment', { p_provider: 'card', p_external: p.id, p_amount: p.amount, p_raw: m.text });
  await tg.send(m.chat.id, bt(lang, 'bankResult', { amount: p.amount, result: r.result }));
  return true;
};

// ---------- 4. Do'st taklif ----------
interface Invite { readonly ref: string; readonly invited: number; readonly gifts: readonly { readonly at: number; readonly uz: string; readonly ru: string }[] }
export const inviteText = (lang: Lang, link: string, inv: Invite): string => {
  const scale = inv.gifts.map((g) => bt(lang, 'inviteStep', { mark: inv.invited >= g.at ? '✅' : '▫️', at: g.at, gift: g[lang] })).join('\n');
  const next = inv.gifts.find((g) => g.at > inv.invited);
  return `${bt(lang, 'invite', { link, n: inv.invited, scale })}\n${next ? bt(lang, 'inviteLeft', { n: next.at - inv.invited }) : bt(lang, 'inviteAll')}`;
};
const botName = async (ctx: Ctx): Promise<string> =>
  String((await ctx.db.rpc<string | null>('svc_setting', { p_key: 'telegram_bot' })) ?? '').replace(/^@/, '') || (ctx.env.TELEGRAM_BOT ?? '').replace(/^@/, '');
const sendInvite = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, lang: Lang): Promise<void> => {
  const inv = await ctx.db.rpc<Invite | null>('svc_bot_invite', { p_telegram: telegram });
  if (!inv) return tg.send(chat, bt(lang, 'needAccount'));
  const link = `https://t.me/${await botName(ctx)}?start=r_${inv.ref}`;
  const share = `https://t.me/share/url?${new URLSearchParams({ url: link, text: bt(lang, 'shareText') }).toString()}`;
  return tg.send(chat, inviteText(lang, link, inv), [{ text: bt(lang, 'btnShare'), url: share }]);
};

// ---------- 2. Sozlamalar ----------
const sendSettings = (tg: Telegram, chat: number, lang: Lang, isNewsOn: boolean): Promise<void> =>
  tg.send(chat, bt(lang, 'settings', { lang: bt(lang, 'langName'), news: bt(lang, isNewsOn ? 'on' : 'off') }), [...langButtons(), { text: bt(lang, isNewsOn ? 'btnNewsOff' : 'btnNewsOn'), data: isNewsOn ? 'news:off' : 'news:on' }]);

// ---------- 6. Egasining buyruqlari ----------
interface Stat { readonly users: readonly number[]; readonly houses: readonly number[]; readonly active: readonly number[]; readonly given: readonly number[]; readonly spent: readonly number[]; readonly tickets: number; readonly disputes: number; readonly revenue: readonly number[] | null }
const fmt = (n: number | undefined): string => (n ?? 0).toLocaleString('ru-RU').replace(/ /g, ' ');
export const statText = (lang: Lang, s: Stat): string => bt(lang, 'stat', {
  u1: fmt(s.users[0]), u7: fmt(s.users[1]), h1: fmt(s.houses[0]), h7: fmt(s.houses[1]), a1: fmt(s.active[0]), a7: fmt(s.active[1]), g1: fmt(s.given[0]), g7: fmt(s.given[1]), s1: fmt(s.spent[0]), s7: fmt(s.spent[1]),
  t: s.tickets, d: s.disputes, revenue: s.revenue ? bt(lang, 'statRevenue', { r1: fmt(s.revenue[0]), r7: fmt(s.revenue[1]) }) : '',
});
interface OpenCounts { readonly tickets: number; readonly disputes: number; readonly districts: readonly { readonly id: number; readonly uz: string; readonly ru: string }[] }
const panelButton = (ctx: Ctx, lang: Lang, hash: string): readonly TgButton[] => (ctx.env.ADMIN_URL ? [{ text: bt(lang, 'btnPanel'), url: `${ctx.env.ADMIN_URL}/#${hash}` }] : []);
const ownerCommand = async (ctx: Ctx, tg: Telegram, m: Message, text: string, lang: Lang): Promise<boolean> => {
  const command = /^\/(admin|stat|hammaga|bekor|murojaatlar|nizolar)(?:@\w+)?$/.exec(text)?.[1];
  if (!command) return false;
  const chat = m.chat.id;
  const from = m.from!.id;
  if (!(await isOwner(ctx, from))) {
    await tg.send(chat, bt(lang, 'noCommand'));
    return true;
  }
  if (command === 'admin') await adminLink(ctx, tg, chat, from, lang);
  if (command === 'stat') await tg.send(chat, statText(lang, await ctx.db.rpc<Stat>('svc_bot_stat', { p_telegram: from })));
  if (command === 'hammaga') {
    await ctx.db.rpc('svc_bot_step', { p_telegram: from, p_step: 'broadcast' });
    await tg.send(chat, bt(lang, 'bcAsk'));
  }
  if (command === 'bekor') {
    await ctx.db.rpc('svc_bot_cancel', { p_telegram: from });
    await tg.send(chat, bt(lang, 'bcCancelled'));
  }
  if (command === 'murojaatlar' || command === 'nizolar') {
    const o = await ctx.db.rpc<OpenCounts>('svc_bot_open', { p_telegram: from });
    await tg.send(chat, command === 'murojaatlar' ? bt(lang, 'openTickets', { n: o.tickets }) : bt(lang, 'openDisputes', { n: o.disputes }), panelButton(ctx, lang, command === 'murojaatlar' ? 'tickets' : 'disputes'));
  }
  return true;
};
/** /hammaga: egasi matn yoki rasm yubordi → qoralama → ko'rinishi → kimga. */
const broadcastDraft = async (ctx: Ctx, tg: Telegram, chat: number, from: number, body: string, photo: string | null, lang: Lang): Promise<void> => {
  await ctx.db.rpc('svc_bot_draft', { p_telegram: from, p_text: body, p_photo: photo });
  if (photo) await tg.photo(chat, photo, body);
  else await tg.send(chat, body);
  return tg.send(chat, bt(lang, 'bcPreview'), [
    { text: bt(lang, 'btnAll'), data: 'bc:all', row: 1 }, { text: bt(lang, 'btnDistrict'), data: 'bc:district', row: 1 }, { text: bt(lang, 'btnWaitlist'), data: 'bc:waitlist', row: 2 }, { text: bt(lang, 'btnCancel'), data: 'bc:cancel', row: 2 },
  ]);
};
const broadcastCallback = async (ctx: Ctx, tg: Telegram, q: NonNullable<Update['callback_query']>, lang: Lang): Promise<boolean> => {
  const data = q.data ?? '';
  if (!/^bc(go)?:/.test(data)) return false;
  const chat = q.from.id;
  if (!(await isOwner(ctx, chat))) { await tg.answer(q.id, bt(lang, 'noCommand')); return true; }
  await tg.answer(q.id, '✓');
  if (data === 'bc:cancel') {
    await ctx.db.rpc('svc_bot_cancel', { p_telegram: chat });
    await tg.send(chat, bt(lang, 'bcCancelled'));
    return true;
  }
  if (data === 'bc:district') {
    const o = await ctx.db.rpc<OpenCounts>('svc_bot_open', { p_telegram: chat });
    await tg.send(chat, bt(lang, 'bcDistrict'), [...o.districts.map((d, i) => ({ text: d[lang], data: `bc:d${d.id}`, row: Math.floor(i / 2) })), { text: bt(lang, 'btnCancel'), data: 'bc:cancel' }]);
    return true;
  }
  const pick = /^bc:(all|waitlist|d(\d{1,4}))$/.exec(data);
  if (pick) {
    const [target, district] = pick[2] ? ['district', Number(pick[2])] : [pick[1] ?? 'all', null];
    const n = await ctx.db.rpc<number>('svc_bot_audience', { p_telegram: chat, p_target: target, p_district: district });
    await tg.send(chat, bt(lang, 'bcConfirm', { n }), [{ text: bt(lang, 'btnSend'), data: `bcgo:${target}:${district ?? 0}`, row: 1 }, { text: bt(lang, 'btnCancel'), data: 'bc:cancel', row: 1 }]);
    return true;
  }
  const go = /^bcgo:(all|waitlist|district):(\d{1,4})$/.exec(data);
  if (go) {
    const n = await ctx.db.rpc<number>('svc_bot_broadcast', { p_telegram: chat, p_target: go[1], p_district: go[1] === 'district' ? Number(go[2]) : null });
    await tg.send(chat, bt(lang, 'bcQueued', { n }));
  }
  return true;
};

const askSupport = async (ctx: Ctx, tg: Telegram, chat: number, telegram: number, lang: Lang): Promise<void> => {
  await ctx.db.rpc('svc_bot_step', { p_telegram: telegram, p_step: 'support' });
  return tg.send(chat, bt(lang, 'supportAsk'));
};
const openCity = (ctx: Ctx, tg: Telegram, chat: number, lang: Lang, panel?: string): Promise<void> =>
  tg.send(chat, bt(lang, 'pickMenu'), [{ text: bt(lang, 'btnOpenCity'), webApp: siteUrl(ctx, lang, panel ? { panel } : {}) }]);

const onStart = async (ctx: Ctx, tg: Telegram, m: Message, param: string, lang: Lang): Promise<void> => {
  const from = m.from!;
  const link = /^link_([0-9a-f]{32})$/.exec(param)?.[1];
  if (link) return linkConfirm(ctx, tg, m.chat.id, link, lang);
  if (param === 'reset' && (await ctx.db.rpc<boolean>('svc_password_login', {}))) return sendReset(ctx, tg, from.id, lang);
  if (param === 'yordam') return askSupport(ctx, tg, m.chat.id, from.id, lang);
  if (param === 'wait') {
    const n = await ctx.db.rpc<number>('svc_tg_waitlist', { p_telegram: from.id });
    return tg.send(m.chat.id, bt(lang, 'waitlist', { n }));
  }
  const buy = /^buy_([A-Za-z0-9_]{1,60})$/.exec(param)?.[1];
  if (buy) return buyCode(ctx, tg, m.chat.id, from.id, buy, lang);
  const ref = /^r_([0-9a-f]{6,16})$/.exec(param)?.[1] ?? null;
  return greet(ctx, tg, m, ref);
};

/** Bosilgan menyu tugmasi (matn sifatida kelgan). */
const onMenu = async (ctx: Ctx, tg: Telegram, m: Message, key: TextKey, c: BotCtx, lang: Lang): Promise<void> => {
  const chat = m.chat.id;
  const from = m.from!.id;
  if (key === 'btnInvite') return sendInvite(ctx, tg, chat, from, lang);
  if (key === 'btnSupport') return askSupport(ctx, tg, chat, from, lang);
  if (key === 'btnSettings') return sendSettings(tg, chat, lang, c.news);
  if (key === 'btnShop') return shopMenu(ctx, tg, chat, lang);
  return openCity(ctx, tg, chat, lang, key === 'btnHome' ? 'uyim' : key === 'btnClaim' ? 'uyolish' : undefined);
};

/** Suhbat qadami bo'yicha (nik, tasdiq, nizo, murojaat, yangi nik, /hammaga). true — xabar qabul qilindi. */
const onStep = async (ctx: Ctx, tg: Telegram, m: Message, c: BotCtx, lang: Lang, body: string, photo: string | null): Promise<boolean> => {
  const chat = m.chat.id;
  const from = m.from!;
  const text = (m.text ?? '').trim();
  const isPlain = !text.startsWith('/');
  if (c.step === 'broadcast' && isPlain && (body || photo) && (await isOwner(ctx, from.id))) { await broadcastDraft(ctx, tg, chat, from.id, body, photo, lang); return true; }
  if (c.step === 'support' && isPlain && (body || photo)) { await supportMessage(ctx, tg, chat, from, c.sess_nick === 'pay' ? `${bt(lang, 'payTicketTag')} ${body}` : body, photo, lang); return true; }
  if ((c.step === 'dispute' || c.step === 'dispute_owner') && c.ref_id) {
    if (photo) { await takeProof(ctx, tg, chat, from.id, c.ref_id, photo, lang); return true; }
    if (isPlain) { await tg.send(chat, bt(lang, 'sendPhoto')); return true; }
  }
  if ((c.step === 'nick' || c.step === 'confirm') && isPlain && text) { await proposeNick(ctx, tg, chat, from.id, text, lang); return true; }
  if (c.step === 'renick' && isPlain && text) {
    const problem = nickProblem(normalizeNick(text), lang);
    if (problem) { await tg.send(chat, problem); return true; }
    try {
      const nick = await ctx.db.rpc<string>('svc_renick', { p_telegram: from.id, p_nick: normalizeNick(text) });
      await tg.send(chat, bt(lang, 'renickDone', { nick }));
    } catch (error: unknown) {
      if (!(error instanceof Error && error.message.includes('nick_taken'))) throw error;
      await tg.send(chat, bt(lang, 'renickTaken'));
    }
    return true;
  }
  return false;
};

const onCommand = async (ctx: Ctx, tg: Telegram, m: Message, text: string, c: BotCtx, lang: Lang): Promise<boolean> => {
  const chat = m.chat.id;
  const from = m.from!.id;
  if (text === '/kirish') { await greet(ctx, tg, m, null); return true; }
  if (text === '/dokon') { await shopMenu(ctx, tg, chat, lang); return true; }
  if (text === '/taklif') { await sendInvite(ctx, tg, chat, from, lang); return true; }
  if (text === '/yordam') { await askSupport(ctx, tg, chat, from, lang); return true; }
  if (text === '/paysupport') {
    // Murojaat "to'lov" belgisi bilan (sessiyada `pay`), admin darhol ajratadi.
    await ctx.db.rpc('svc_bot_step', { p_telegram: from, p_step: 'support', p_nick: 'pay' });
    await tg.send(chat, bt(lang, 'paySupportAsk'));
    return true;
  }
  if (text === '/terms') { await tg.send(chat, bt(lang, 'terms', { url: siteUrl(ctx, lang, { panel: 'qoidalar' }) })); return true; }
  if (text === '/sozlamalar' || text === '/til') { await sendSettings(tg, chat, lang, c.news); return true; }
  if (text === '/parol' && (await ctx.db.rpc<boolean>('svc_password_login', {}))) { await sendReset(ctx, tg, from, lang); return true; }
  if (text === '/stop' || text === '/xabar') {
    const isOn = text === '/xabar';
    await ctx.db.rpc('svc_news', { p_telegram: from, p_on: isOn });
    await tg.send(chat, bt(lang, isOn ? 'newsOn' : 'newsOff'));
    return true;
  }
  const salute = /^\/salyut\s+([\s\S]{1,200})$/.exec(text)?.[1];
  if (salute) { await sendInvoice(ctx, tg, chat, from, { kind: 'salute', payload: { text: salute.trim() } }, lang); return true; }
  return ownerCommand(ctx, tg, m, text, lang);
};

const onMessage = async (ctx: Ctx, tg: Telegram, m: Message): Promise<void> => {
  if (m.chat.type !== 'private' || !m.from) return;
  const { c, lang } = await loadCtx(ctx, m.from);
  if (m.successful_payment?.currency === 'XTR') return starsPaid(ctx, tg, m.chat.id, m.successful_payment, lang);
  if (await bankForward(ctx, tg, m, lang)) return;
  await limit(ctx, 'tg', 20, 60, String(m.from.id));
  const text = (m.text ?? '').trim();
  const start = /^\/start(?:\s+(\S{1,64}))?$/.exec(text);
  if (start) return onStart(ctx, tg, m, start[1] ?? '', lang);
  const photo = m.photo?.at(-1)?.file_id ?? null;
  const body = text || (m.caption ?? '').trim();
  // Egasi murojaatga "Javob berish" (reply) qildi.
  if (isOwnerChat(ctx, m.from.id) && m.reply_to_message && (await adminReply(ctx, tg, m.reply_to_message.message_id, body, photo))) return tg.send(m.chat.id, bt(lang, 'replySent'));
  const key = menuKey(text);
  if (key && c.user) return onMenu(ctx, tg, m, key, c, lang);
  if (text.startsWith('/') && (await onCommand(ctx, tg, m, text, c, lang))) return;
  if (await onStep(ctx, tg, m, c, lang, body, photo)) return;
  // Noma'lum matn: akkaunti bor — qisqa "Menyudan tanlang"; yo'q — boshlash.
  if (!c.user) return greet(ctx, tg, m, null);
  return tg.send(m.chat.id, bt(lang, text.startsWith('/') ? 'noCommand' : 'pickMenu'), undefined, mainMenu(ctx, lang, c.has_house));
};

const onCallback = async (ctx: Ctx, tg: Telegram, q: NonNullable<Update['callback_query']>): Promise<void> => {
  const { c, lang } = await loadCtx(ctx, q.from);
  const data = q.data ?? '';
  const chosen = /^lang:(uz|ru)$/.exec(data)?.[1];
  if (chosen) {
    const l = langOf(chosen);
    await ctx.db.rpc('svc_bot_lang', { p_telegram: q.from.id, p_lang: l });
    await tg.answer(q.id, bt(l, 'langSaved'));
    if (c.user) return tg.send(q.from.id, bt(l, 'langSaved'), undefined, mainMenu(ctx, l, c.has_house));
    return tg.send(q.from.id, await askNick(ctx, l));
  }
  const news = /^news:(on|off)$/.exec(data)?.[1];
  if (news) {
    await ctx.db.rpc('svc_news', { p_telegram: q.from.id, p_on: news === 'on' });
    await tg.answer(q.id, bt(lang, news === 'on' ? 'newsOn' : 'newsOff'));
    return sendSettings(tg, q.from.id, lang, news === 'on');
  }
  if (await broadcastCallback(ctx, tg, q, lang)) return;
  const vote = /^poll:(\d{1,9}):([1-6])$/.exec(data);
  if (vote) {
    const picked = await ctx.db.rpc<string>('svc_poll_vote', { p_telegram: q.from.id, p_poll: Number(vote[1]), p_option: Number(vote[2]) });
    return tg.answer(q.id, picked === 'own' ? bt(lang, 'pollOwn') : picked === 'closed' ? bt(lang, 'pollClosed') : `✅ ${picked}`);
  }
  if (data === 'shop') { await tg.answer(q.id, '🛍'); return shopMenu(ctx, tg, q.from.id, lang); }
  if (data === 'support') { await tg.answer(q.id, '✍️'); return askSupport(ctx, tg, q.from.id, q.from.id, lang); }
  if (data === 'nick_ok' || data === 'nick_again' || data === 'claim') {
    await tg.answer(q.id, '✓');
    if (!c.sess_nick) return tg.send(q.from.id, await askNick(ctx, lang));
    if (data === 'nick_ok' && c.step === 'confirm') return confirmNick(ctx, tg, q.from.id, q.from, c.sess_nick, lang);
    if (data === 'claim') return openDispute(ctx, tg, q.from.id, q.from.id, c.sess_nick, lang);
    await ctx.db.rpc('svc_bot_step', { p_telegram: q.from.id, p_step: 'nick' });
    return tg.send(q.from.id, await askNick(ctx, lang));
  }
  const give = /^dgive:(\d{1,9})$/.exec(data)?.[1];
  if (give) {
    await ctx.db.rpc('svc_dispute_give', { p_id: Number(give), p_telegram: q.from.id });
    await tg.answer(q.id, '✓');
    return tg.send(q.from.id, bt(lang, 'disputeGiven'));
  }
  if (data === 'chan') return channelButton(ctx, tg, q.id, q.from.id, lang);
  const buy = /^buy:([A-Za-z0-9_]{1,60})$/.exec(data)?.[1];
  if (buy) { await tg.answer(q.id, '🛍'); return buyCode(ctx, tg, q.from.id, q.from.id, buy, lang); }
  const pay = /^pay:([A-Za-z0-9_]{1,60})$/.exec(data)?.[1];
  if (pay) { await tg.answer(q.id, '⭐'); return payCode(ctx, tg, q.from.id, q.from.id, pay, lang); }
  const tbuy = /^tbuy:([A-Za-z0-9_]{1,58})$/.exec(data)?.[1];
  if (tbuy) { await tg.answer(q.id, '🧪'); return testBuy(ctx, tg, q.from.id, q.from.id, tbuy, lang); }
  if (data === 'open') {
    // Eski xabarlardagi tugma: menyu va brauzer havolasi.
    await tg.answer(q.id, '🏙');
    const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: q.from.id, p_ref: null, p_name: q.from.first_name, p_lang: lang });
    if (r.state === 'renick') return tg.send(q.from.id, bt(lang, 'renick'));
    if (r.state === 'ready' && r.user) return sendHome(ctx, tg, q.from.id, lang, { user: r.user, nick: r.nick ?? null, hasHouse: r.has_house === true });
    return tg.send(q.from.id, r.state === 'banned' ? bt(lang, 'banned') : await askNick(ctx, lang));
  }
  const token = /^ok:([0-9a-f]{32})$/.exec(data)?.[1];
  if (!token) return;
  const r = await ctx.db.rpc<{ ok: boolean; error?: string }>('svc_tg_confirm', { p_hash: keyed(ctx.env.HASH_SECRET, token), p_telegram: q.from.id, p_name: q.from.first_name });
  await tg.answer(q.id, r.ok ? bt(lang, 'confirmed') : bt(lang, 'linkExpired'));
  await tg.send(q.from.id, r.ok ? bt(lang, 'backToSite') : bt(lang, r.error === 'telegram_used' ? 'telegramUsed' : 'linkExpired'));
};

/** Bitta yangilanish (webhook va lokal sinov uchun umumiy). */
export const botUpdate = async (ctx: Ctx, tg: Telegram, raw: unknown): Promise<void> => {
  const r = updateSchema.safeParse(raw);
  if (!r.success) throw new HttpError(400, 'bad_format');
  if (r.data.message) await onMessage(ctx, tg, r.data.message);
  if (r.data.callback_query) await onCallback(ctx, tg, r.data.callback_query);
  if (r.data.pre_checkout_query) await preCheckout(ctx, tg, r.data.pre_checkout_query, guessLang(r.data.pre_checkout_query.from.language_code));
};

export const handleTelegram = async (req: Request, ctx: Ctx): Promise<Response> => {
  const secret = ctx.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !ctx.tg || !safeEqual(req.headers.get('x-telegram-bot-api-secret-token') ?? '', secret)) return json({ error: 'forbidden' }, 403);
  await botUpdate(ctx, ctx.tg, await readJson(req, updateSchema));
  return json({ ok: true });
};

/** Lokal sinov uchun hech narsa yubormaydigan Telegram. */
const DEV_TG: Telegram = { send: async () => undefined, answer: async () => undefined, video: async () => undefined, isMember: async () => false, invoice: async () => undefined, preCheckout: async () => undefined, refundStars: async () => undefined, document: async () => undefined, sendId: async () => null, photo: async () => null, download: async () => null };

/** Faqat lokal (DEV=1): bot bilan suhbatni Telegram'siz sinash — javob xabarlari qaytadi. */
export const devTelegram = async (req: Request, ctx: Ctx): Promise<Response> => {
  if (ctx.env.DEV !== '1') throw new HttpError(404, 'not_found');
  const sent: { readonly text: string; readonly buttons: readonly TgButton[]; readonly menu?: ReplyMenu }[] = [];
  const tg: Telegram = {
    ...DEV_TG, isMember: async () => true,
    send: async (_chat, text, buttons, menu) => { sent.push({ text, buttons: buttons ?? [], ...(menu ? { menu } : {}) }); },
    answer: async (_id, text) => { sent.push({ text, buttons: [] }); },
    invoice: async (_chat, title, _d, payload, stars) => { sent.push({ text: `invoice:${payload}:${stars}:${title}`, buttons: [] }); },
    preCheckout: async (_id, isOk) => { sent.push({ text: `precheckout:${isOk}`, buttons: [] }); },
  };
  await botUpdate(ctx, tg, await readJson(req, updateSchema));
  return json({ sent });
};

// ---------- Bildirishnomalar (foydalanuvchi tilida) ----------
interface OutboxRow { readonly kind: string; readonly chat: number; readonly lang: string; readonly data?: Readonly<Record<string, unknown>> }
/** Olib tashlangan funksiyalar (uy sovg'asi, reklama) xabari yo'q — kalit topilmasa yuborilmaydi. */
const NOTE_KINDS: ReadonlySet<string> = new Set(['released', 'referral', 'order_paid', 'order_problem', 'street_named', 'street_rejected', 'decor_gift', 'yard_winner', 'new_decor', 'elected', 'new_neighbour', 'inactive_warning']);
export const noteText = (r: OutboxRow): string | undefined => {
  if (!NOTE_KINDS.has(r.kind)) return undefined;
  const lang = langOf(r.lang);
  const base = bt(lang, `n_${r.kind}` as TextKey, { name: String(r.data?.[lang] ?? ''), nick: String(r.data?.nick ?? '') });
  return r.kind === 'referral' && typeof r.data?.invited === 'number' ? `${base}\n${bt(lang, 'n_referralScale', { n: r.data.invited })}` : base;
};
export const flushOutbox = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const rows = await ctx.db.rpc<readonly OutboxRow[]>('svc_outbox', {});
  const results = await Promise.allSettled(rows.map((r) => {
    const text = noteText(r);
    const lang = langOf(r.lang);
    // Uyga oid xabarda — o'sha uyga havola (?uy=ID), Mini App bo'lib ochiladi.
    const plot = typeof r.data?.plot === 'string' && /^[A-Z0-9]{1,8}$/.test(r.data.plot) ? r.data.plot : null;
    return text ? tg.send(r.chat, text, [{ text: bt(lang, 'btnOpenCity'), webApp: siteUrl(ctx, lang, plot ? { uy: plot } : {}) }]) : Promise.resolve();
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
async function channelButton(ctx: Ctx, tg: Telegram, callbackId: string, telegram: number, lang: Lang): Promise<void> {
  try {
    const r = await channelBonus(ctx, tg, telegram);
    await tg.answer(callbackId, r.state === 'paid' ? bt(lang, 'chanPaid', { gain: r.gain ?? 0 }) : bt(lang, 'chanAlready'));
  } catch (error: unknown) {
    await tg.answer(callbackId, error instanceof HttpError && error.message === 'not_subscribed' ? bt(lang, 'chanFirst') : bt(lang, 'error'));
  }
}

interface QueuedMessage { readonly chat: number; readonly text: string; readonly lang?: string; readonly photo?: string | null; readonly poll: number | null; readonly options: readonly string[] | null; readonly plots?: readonly string[] | null }
/** Hovli so'rovnomasi: har nomzodning uy havolasi matnga qo'shiladi. */
const messageText = (ctx: Ctx, r: QueuedMessage, lang: Lang): string => {
  const text = oneLang(r.text, lang);
  return r.plots && r.options ? `${text}\n\n${r.plots.map((p, i) => `${i + 1}. ${r.options?.[i] ?? ''} — ${ctx.env.SITE_URL}/?uy=${p}`).join('\n')}` : text;
};
/** Telegram: sekundiga ~25 xabardan ko'p emas. */
const BROADCAST_BATCH = 25;
const BROADCAST_PER_RUN = 300;
const pause = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
const sendQueued = (ctx: Ctx, tg: Telegram, r: QueuedMessage): Promise<unknown> => {
  const lang = langOf(r.lang);
  const isChannel = r.chat === 0;
  const chat = isChannel ? channelOf(ctx) : r.chat;
  // Kanalda Mini App tugmasi bo'lmaydi — oddiy havola.
  const buttons: readonly TgButton[] = r.poll && r.options ? r.options.map((o, k) => ({ text: o, data: `poll:${r.poll}:${k + 1}` }))
    : [isChannel ? { text: bt(lang, 'btnOpenCity'), url: ctx.env.SITE_URL } : { text: bt(lang, 'btnOpenCity'), webApp: siteUrl(ctx, lang) }];
  const text = messageText(ctx, r, lang);
  if (r.photo) return tg.photoButtons ? tg.photoButtons(chat, r.photo, text, buttons) : tg.photo(Number(chat), r.photo, text);
  return tg.send(chat, text, buttons);
};
/** Cron: egasi yuborgan xabar va so'rovnomalarni navbat bilan jo'natadi (har kim o'z tilida). */
export const flushBroadcast = async (ctx: Ctx, delayMs = 1100): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const rows = await ctx.db.rpc<readonly QueuedMessage[]>('svc_broadcast_next', { p_limit: BROADCAST_PER_RUN });
  for (let i = 0; i < rows.length; i += BROADCAST_BATCH) {
    if (i > 0) await pause(delayMs);
    await Promise.allSettled(rows.slice(i, i + BROADCAST_BATCH).map((r) => sendQueued(ctx, tg, r)));
  }
  return rows.length;
};

// ---------- 5. Kanalga avtomatik postlar ----------
interface ChannelPost { readonly id: number; readonly kind: 'daily' | 'yard' | 'project' | 'milestone'; readonly data: Readonly<Record<string, unknown>> }
const nickList = (v: unknown): string => (Array.isArray(v) ? v.map((x: { nick?: unknown }) => `@${String(x.nick ?? '')}`).join(', ') : '—');
export const channelText = (ctx: Ctx, lang: Lang, p: ChannelPost): string => {
  const d = p.data;
  if (p.kind === 'daily') {
    const list = (Array.isArray(d.houses) ? d.houses : []).map((h: { nick?: unknown; plot?: unknown }) => `• @${String(h.nick ?? '')} — ${ctx.env.SITE_URL}/?uy=${String(h.plot ?? '')}`).join('\n');
    return bt(lang, 'chDaily', { n: Number(d.count ?? 0), list });
  }
  if (p.kind === 'yard') return bt(lang, 'chYard', { nick: String(d.nick ?? ''), votes: Number(d.votes ?? 0), url: `${ctx.env.SITE_URL}/?uy=${String(d.plot ?? '')}` });
  if (p.kind === 'project') return bt(lang, 'chProject', { name: String(d[lang] ?? d.uz ?? ''), top: nickList(d.top) });
  return bt(lang, 'chMilestone', { n: fmt(Number(d.count ?? 0)) });
};
/** Cron: navbatdagi kanal postlari; xato bo'lsa keyingi cron'da qayta (5 martagacha). */
export const flushChannel = async (ctx: Ctx): Promise<number> => {
  if (!ctx.tg) return 0;
  const tg = ctx.tg;
  const r = await ctx.db.rpc<{ lang: string; posts: readonly ChannelPost[] }>('svc_channel_next', { p_limit: 10 });
  const lang = langOf(r.lang);
  let n = 0;
  for (const p of r.posts) {
    try {
      await tg.send(channelOf(ctx), channelText(ctx, lang, p), [{ text: bt(lang, 'btnOpenCity'), url: ctx.env.SITE_URL }]);
      await ctx.db.rpc('svc_channel_sent', { p_id: p.id });
      n += 1;
    } catch {
      // keyingi cron'da qayta urinadi
    }
  }
  return n;
};

const LOCAL_ADMIN_TG = 1;
/** Faqat lokal (DEV=1): bot yo'q — "Admin sifatida kirish (lokal)" tugmasi admin akkauntiga bir martalik havola oladi. Ishlab chiqarishda 404. */
export const devAdmin = async (_req: Request, ctx: Ctx): Promise<Response> => {
  if (ctx.env.DEV !== '1') throw new HttpError(404, 'not_found');
  const telegram = Number(ctx.env.ADMIN_TELEGRAM_ID) || LOCAL_ADMIN_TG;
  const r = await ctx.db.rpc<BotStart>('svc_bot_start', { p_telegram: telegram, p_ref: null, p_name: 'Admin' });
  const user = r.user ?? (await createAccount(ctx, `tg${telegram}`, randomPassword(), null, telegram, 'admin_lokal'));
  // ADMIN_TELEGRAM_ID berilgan bo'lsa — u egasi (boshqa admin rollari olib tashlanadi).
  await ctx.db.rpc(ctx.env.ADMIN_TELEGRAM_ID ? 'svc_set_owner' : 'svc_make_admin', { p_telegram: telegram });
  return json({ token: await issueLogin(ctx, user) });
};
