/** 6c: bot — Mini App kirishi (initData), til, doimiy menyu, taklif, kanal postlari, egasining buyruqlari, bot profili. */
import { createHmac } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { openDb } from '../dev/db.ts';
import { createEmulator, makeKeys } from '../dev/supabase-emu.ts';
import { handle } from '../src/app.ts';
import { commandsFor, setupCalls, botSetup } from '../src/botSetup.ts';
import { TEXT_KEYS, bt, guessLang, oneLang } from '../src/botText.ts';
import { supabaseBackend } from '../src/supabase.ts';
import { channelText, flushBroadcast, flushChannel, noteText } from '../src/telegram.ts';
import type { Ctx, Env, ReplyMenu, Telegram, TgButton } from '../src/types.ts';
import { INIT_MAX_AGE_S, verifyInitData } from '../src/webapp.ts';

const TOKEN = '123456:SINOV-token';
const keys = makeKeys('bot-secret');
const ENV: Env = {
  SUPABASE_URL: 'http://emu', SUPABASE_SERVICE_KEY: keys.service, SITE_URL: 'https://shahar.test', ALLOWED_ORIGINS: 'https://shahar.test', HASH_SECRET: 'h',
  TELEGRAM_BOT: 'shahar_bot', TELEGRAM_TOKEN: TOKEN, ADMIN_URL: 'https://admin.test', TELEGRAM_WEBHOOK_SECRET: 'wh', ADMIN_TELEGRAM_ID: '5000', TELEGRAM_CHANNEL: 'kanal', DEV: '1',
};
let db: PGlite;
let emu: (req: Request) => Promise<Response>;
type Sent = { chat: number | string; text: string; buttons?: readonly TgButton[]; menu?: ReplyMenu; photo?: string };
const sent: Sent[] = [];
const tg: Telegram = {
  send: async (chat, text, buttons, menu) => { sent.push({ chat, text, ...(buttons ? { buttons } : {}), ...(menu ? { menu } : {}) }); },
  answer: async (_id, text) => { sent.push({ chat: 0, text }); },
  video: async () => undefined, isMember: async () => true, invoice: async () => undefined, preCheckout: async () => undefined, refundStars: async () => undefined, document: async () => undefined,
  sendId: async (chat, text) => { sent.push({ chat, text }); return 1; },
  photo: async (chat, photo, text) => { sent.push({ chat, text, photo }); return 2; },
  photoButtons: async (chat, photo, text, buttons) => { sent.push({ chat, text, photo, buttons }); },
  download: async () => null,
  invoiceLink: async (_t, _d, payload, stars) => `https://t.me/$invoice_${payload.slice(0, 4)}_${stars}`,
};
const emuFetch: typeof fetch = (input, init) => emu(new Request(input as string, init));
let ipN = 0;
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ env: ENV, db: supabaseBackend(ENV, emuFetch), tg, ip: `10.1.0.${++ipN}`, fetch: emuFetch, ...over });
const call = async (p: string, body: unknown, headers: Record<string, string> = {}): Promise<{ status: number; body: Record<string, unknown> }> => {
  const res = await handle(new Request(`https://api.test${p}`, { method: 'POST', body: JSON.stringify(body), headers }), ctx(), () => undefined);
  const text = await res.text();
  return { status: res.status, body: text.startsWith('{') ? (JSON.parse(text) as Record<string, unknown>) : { text } };
};
const webhook = (update: unknown): ReturnType<typeof call> => call('/telegram/webhook', update, { 'x-telegram-bot-api-secret-token': 'wh' });
const say = (id: number, text: string, lang?: string, extra = {}): ReturnType<typeof call> =>
  webhook({ message: { message_id: 1, from: { id, first_name: 'S', ...(lang ? { language_code: lang } : {}) }, chat: { id, type: 'private' }, text, ...extra } });
const tap = (id: number, data: string): ReturnType<typeof call> => webhook({ callback_query: { id: 'q', from: { id, first_name: 'S' }, data } });
const newUser = async (id: number, nick: string, lang?: string): Promise<void> => {
  await say(id, '/start', lang);
  await say(id, nick, lang);
  await tap(id, 'nick_ok');
};
const last = (): Sent => sent.at(-1)!;
const CYR = /[А-Яа-яЁё]/;
/** Bitta xabarda ikki til bo'lmasin: ruschada o'zbekcha belgi (o‘, g‘), o'zbekchada kirill yo'q. */
const isOneLang = (text: string): boolean => !(CYR.test(text) && /[oOgG][‘’ʻ']/.test(text.replace(/O‘zbekcha/g, '')));

beforeAll(async () => {
  db = await openDb();
  emu = createEmulator(db, keys, path.join(tmpdir(), `shahar-bot-${process.pid}`));
});
beforeEach(() => { sent.length = 0; });

/** Telegram tartibida imzolangan initData. */
const signInit = (fields: Record<string, string>, token = TOKEN): string => {
  const check = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = createHmac('sha256', secret).update(check).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
};
const now = (): number => Math.floor(Date.now() / 1000);

describe('Mini App: initData imzosi', () => {
  const user = JSON.stringify({ id: 4242, first_name: 'Ali', language_code: 'ru' });
  test('to‘g‘ri imzo — foydalanuvchi; soxta imzo va eskirgani — rad', () => {
    expect(verifyInitData(signInit({ auth_date: String(now()), user, query_id: 'AA1' }), TOKEN)).toMatchObject({ id: 4242, language_code: 'ru' });
    expect(verifyInitData(signInit({ auth_date: String(now()), user }, 'boshqa:token'), TOKEN)).toBeNull();
    const forged = signInit({ auth_date: String(now()), user }).replace('4242', '4243');
    expect(verifyInitData(forged, TOKEN)).toBeNull();
    expect(verifyInitData(signInit({ auth_date: String(now() - INIT_MAX_AGE_S - 10), user }), TOKEN)).toBeNull();
    expect(verifyInitData('hash=abc', TOKEN)).toBeNull();
  });
  test('/auth/telegram/webapp: akkaunt bo‘lsa — sessiya, nik yozilmagan bo‘lsa — need_nick', async () => {
    const make = (id: number): string => signInit({ auth_date: String(now()), user: JSON.stringify({ id, first_name: 'X' }) });
    expect((await call('/auth/telegram/webapp', { init_data: make(4300) })).body).toEqual({ error: 'need_nick' });
    await newUser(4300, 'mini_app_nik');
    const r = await call('/auth/telegram/webapp', { init_data: make(4300) });
    expect(r.status).toBe(200);
    expect(r.body.token_hash).toEqual(expect.any(String));
    expect((await call('/auth/telegram/webapp', { init_data: `${make(4300)}x` })).status).toBe(401);
  });
});

describe('til', () => {
  test('birinchi /start: Telegram tili bo‘yicha va til tugmalari; tanlangach hammasi shu tilda', async () => {
    await say(4400, '/start', 'ru');
    expect(last().text).toContain('Добро пожаловать');
    expect(last().buttons?.map((b) => b.data)).toEqual(['lang:uz', 'lang:ru']);
    await tap(4400, 'lang:uz');
    expect(last().text).toContain('Xush kelibsiz');
    await say(4400, 'til_nik');
    expect(last().text).toContain('Shu to‘g‘rimi?');
    await tap(4400, 'nick_ok');
    expect(sent.some((m) => m.text.startsWith('✅ Tayyor!'))).toBe(true);
    expect((await db.query("select lang from profiles where telegram_id = 4400")).rows).toEqual([{ lang: 'uz' }]);
    for (const m of sent) expect(isOneLang(m.text), m.text).toBe(true);
    // Ikkinchi /start — til tugmalari yo'q, til o'zgarmaydi.
    sent.length = 0;
    await say(4400, '/start', 'ru');
    expect(sent[0]!.text).toContain('Xush kelibsiz');
    expect(sent.some((m) => m.buttons?.some((b) => b.data === 'lang:ru'))).toBe(false);
    for (const m of sent) expect(isOneLang(m.text), m.text).toBe(true);
  });
  test('Sozlamalarda almashadi; sayt tili (my_lang) ham shu maydon', async () => {
    await newUser(4401, 'til_almash');
    await say(4401, '⚙️ Sozlamalar');
    expect(last().text).toContain('Til: O‘zbekcha');
    await tap(4401, 'lang:ru');
    expect(last().text).toBe('✅ Язык: Русский');
    expect(last().menu?.[0]?.[0]?.text).toBe('🏙 Город');
    await say(4401, 'nimadir');
    expect(last().text).toBe('Выберите в меню 👇');
    await db.query("update profiles set lang = 'uz' where telegram_id = 4401");
    await say(4401, '/sozlamalar');
    expect(last().text).toContain('Til: O‘zbekcha');
    await tap(4401, 'news:off');
    expect((await db.query('select wants_news from profiles where telegram_id = 4401')).rows).toEqual([{ wants_news: false }]);
  });
  test('Telegram tilidan taxmin', () => {
    expect(['ru', 'uk', 'kk-KZ', 'be'].map(guessLang)).toEqual(['ru', 'ru', 'ru', 'ru']);
    expect(['uz', 'en', undefined, 'tr'].map(guessLang)).toEqual(['uz', 'uz', 'uz', 'uz']);
  });
});

describe('menyu, taklif', () => {
  test('doimiy menyu 2×3: Shahar, Uy olish/Uyim, Do‘kon — Mini App; qolgani matn', async () => {
    await newUser(4500, 'menyu_nik');
    const menu = sent.find((m) => m.menu)?.menu;
    expect(menu?.map((r) => r.map((b) => b.text))).toEqual([['🏙 Shahar', '🏡 Uy olish', '🛍 Do‘kon'], ['👥 Do‘st taklif', '✍️ Adminga yozish', '⚙️ Sozlamalar']]);
    expect(menu?.[0]?.map((b) => b.webApp)).toEqual(['https://shahar.test/?til=uz', 'https://shahar.test/?panel=uyolish&til=uz', 'https://shahar.test/?panel=dokon&til=uz']);
    expect(menu?.[1]?.every((b) => !b.webApp)).toBe(true);
    // Brauzer yo'li qoladi.
    expect(last().buttons?.[0]?.url).toMatch(/^https:\/\/shahar\.test\/\?kirish=[0-9a-f]{32}&til=uz$/);
    await say(4500, '✍️ Adminga yozish');
    expect(last().text).toContain('Savolingiz');
    await say(4500, '🏙 Shahar');
    expect(last().buttons?.[0]?.webApp).toBe('https://shahar.test/?til=uz');
  });
  test('"Do‘st taklif": havola, shkala va "Do‘stga yuborish" (t.me/share)', async () => {
    await newUser(4501, 'taklif_nik');
    await say(4501, '👥 Do‘st taklif');
    const ref = ((await db.query<{ ref_code: string }>('select ref_code from profiles where telegram_id = 4501')).rows[0]!).ref_code;
    expect(last().text).toContain(`https://t.me/shahar_bot?start=r_${ref}`);
    expect(last().text).toContain('Taklif qilganlar: 0');
    // 19-qadam: bosqichlar tanga bilan (3 → +2 000 …), bezak yo'q.
    expect(last().text).toContain('3 do‘st — +2 000 tanga');
    expect(last().text).toContain('50 do‘st — +40 000 tanga');
    expect(last().text).toContain('+500 tanga');
    expect(last().text).toContain('Keyingi bosqichgacha yana 3 do‘st.');
    const share = new URL(last().buttons![0]!.url!);
    expect(share.origin + share.pathname).toBe('https://t.me/share/url');
    expect(share.searchParams.get('text')).toContain('CityLand UZ');
  });
});

describe('kanal postlari', () => {
  test('har tur matni; o‘chiq tur navbatga tushmaydi; yuborilgach qayta yuborilmaydi', async () => {
    const c = ctx();
    const base = { id: 1, data: {} };
    expect(channelText(c, 'uz', { ...base, kind: 'daily', data: { count: 3, houses: [{ nick: 'a', plot: 'P0001' }] } })).toBe('🏡 Bugun shaharda 3 ta yangi uy!\n• @a — https://shahar.test/?uy=P0001');
    expect(channelText(c, 'uz', { ...base, kind: 'yard', data: { nick: 'b', votes: 7, plot: 'P0002' } })).toBe('🏆 Haftaning hovlisi: @b (7 ovoz)!\nhttps://shahar.test/?uy=P0002');
    expect(channelText(c, 'uz', { ...base, kind: 'project', data: { uz: 'Stadion', ru: 'Стадион', top: [{ nick: 'a' }, { nick: 'b' }, { nick: 'c' }] } })).toBe('🎉 Stadion qurildi! Rahmat: @a, @b, @c');
    expect(channelText(c, 'uz', { ...base, kind: 'milestone', data: { count: 1000 } })).toBe('🎉 Shaharda 1 000 ta uy! Rahmat, qo‘shnilar!');
    await db.query("update settings set value = '{\"daily\": true, \"yard\": true, \"project\": true, \"milestone\": false}' where key = 'channel_posts'");
    await db.query("select private.channel_post('milestone', '100', '{\"count\": 100}')");
    await db.query("select private.channel_post('daily', '2099-01-01', '{\"count\": 2, \"houses\": []}')");
    await db.query("select private.channel_post('daily', '2099-01-01', '{\"count\": 2, \"houses\": []}')");
    expect((await db.query("select kind from channel_posts where data ->> 'key' in ('100', '2099-01-01')")).rows).toEqual([{ kind: 'daily' }]);
    expect(await flushChannel(c)).toBeGreaterThanOrEqual(1);
    expect(sent.some((m) => m.chat === '@kanal' && m.text.startsWith('🏡 Bugun shaharda 2 ta'))).toBe(true);
    // Kanalda Mini App tugmasi bo'lmaydi — oddiy havola.
    expect(sent.filter((m) => m.chat === '@kanal').every((m) => m.buttons?.every((b) => b.url && !b.webApp))).toBe(true);
    sent.length = 0;
    expect(await flushChannel(c)).toBe(0);
  });
  test('kunlik post faqat 20:00 dan keyin va uy bo‘lsa (tick)', async () => {
    const hour = Number((await db.query<{ h: number }>("select extract(hour from now() at time zone 'Asia/Tashkent')::int h")).rows[0]!.h);
    await db.query('select private.channel_daily()');
    const day = (await db.query<{ d: string }>("select ((now() at time zone 'Asia/Tashkent')::date)::text d")).rows[0]!.d;
    const n = (await db.query("select 1 from channel_posts where kind = 'daily' and data ->> 'key' = $1", [day])).rows.length;
    const houses = Number((await db.query<{ n: number }>("select count(*)::int n from plot_state where status <> 'reserved' and not is_test and claimed_at >= (now() at time zone 'Asia/Tashkent')::date::timestamp at time zone 'Asia/Tashkent'")).rows[0]!.n);
    expect(n).toBe(hour >= 20 && houses > 0 ? 1 : 0);
  });
});

describe('egasining buyruqlari', () => {
  test('/stat, /murojaatlar, /hammaga — faqat egasiga; boshqalarga "Bunday buyruq yo‘q"', async () => {
    await newUser(4600, 'oddiy_odam');
    for (const cmd of ['/stat', '/hammaga', '/murojaatlar', '/nizolar', '/admin']) {
      await say(4600, cmd);
      expect(last().text).toBe('Bunday buyruq yo‘q.');
    }
    await newUser(5000, 'egasi_nik');
    expect((await db.query('select role from profiles where telegram_id = 5000')).rows).toEqual([{ role: 'admin' }]);
    await say(5000, '/stat');
    expect(last().text).toContain('📊 Statistika (bugun / 7 kun)');
    expect(last().text).toContain('Ochiq murojaat');
    await say(5000, '/murojaatlar');
    expect(last().buttons?.[0]?.url).toBe('https://admin.test/#tickets');
    // Boshqa Telegramdagi admin roli ishlamaydi.
    await expect(db.query("update profiles set role = 'admin' where telegram_id = 4600")).rejects.toThrow('forbidden');
  });
  test('/hammaga: matn → ko‘rinishi → kimga → yuborish → navbat (har kim o‘z tilida)', async () => {
    await newUser(4700, 'qabul_uz');
    await newUser(4701, 'qabul_ru', 'ru');
    await say(5000, '/hammaga');
    expect(last().text).toContain('📣');
    await say(5000, 'Ertaga shaharda bayram!');
    expect(sent.at(-2)!.text).toBe('Ertaga shaharda bayram!');
    expect(last().buttons?.map((b) => b.data)).toEqual(['bc:all', 'bc:district', 'bc:waitlist', 'bc:cancel']);
    await tap(5000, 'bc:all');
    expect(last().text).toMatch(/Qabul qiladi: \d+ kishi/);
    await tap(5000, 'bcgo:all:0');
    expect(last().text).toMatch(/Navbatga qo‘yildi: \d+ kishi/);
    sent.length = 0;
    await flushBroadcast(ctx(), 0);
    const got = sent.filter((m) => m.text === 'Ertaga shaharda bayram!');
    expect(got.some((m) => m.chat === 4700)).toBe(true);
    expect(got.find((m) => m.chat === 4701)?.buttons?.[0]?.text).toBe('🏙 Открыть город');
    // Rasm bilan ham.
    await say(5000, '/hammaga');
    await say(5000, '', undefined, { photo: [{ file_id: 'rasm_x' }], caption: 'Rasmli xabar' });
    expect(sent.some((m) => m.photo === 'rasm_x' && m.text === 'Rasmli xabar')).toBe(true);
    await say(5000, '/bekor');
    expect(last().text).toBe('Bekor qilindi.');
  });
});

describe('matnlar va tozalash', () => {
  test('har kalit ikkala tilda; o‘zbekchasida kirill yo‘q, ruschasida bor', () => {
    const neutral = new Set(['langUz', 'langRu', 'langName', 'langSaved', 'productStars']);
    for (const key of TEXT_KEYS) {
      const [uz, ru] = [bt('uz', key), bt('ru', key)];
      expect(uz.length, key).toBeGreaterThan(0);
      expect(ru.length, key).toBeGreaterThan(0);
      expect(CYR.test(uz), `${key}: ${uz}`).toBe(key === 'langRu' || key === 'langSaved' ? CYR.test(uz) : false);
      if (!neutral.has(key) && !/^cmd|^btnSalute$/.test(key)) expect(CYR.test(ru), `${key}: ${ru}`).toBe(true);
    }
  });
  test('olib tashlangan funksiyalar xabari yo‘q; do‘st xabarida shkala', () => {
    for (const kind of ['transfer', 'transfer_done', 'ad_live', 'ad_rejected']) expect(noteText({ kind, chat: 1, lang: 'uz' })).toBeUndefined();
    expect(noteText({ kind: 'referral', chat: 1, lang: 'ru', data: { invited: 3 } })).toBe('👥 Друг получил дом — монеты начислены!\nПриглашено: 3.');
  });
  test('bazadagi eski "uz / ru" matndan oluvchi tili', () => {
    expect(oneLang('✅ Nik sizga o‘tdi. /start yozing. / Ник ваш. Напишите /start.', 'ru')).toBe('Ник ваш. Напишите /start.');
    expect(oneLang('✅ Nik sizga o‘tdi. / Ник ваш.', 'uz')).toBe('✅ Nik sizga o‘tdi.');
    expect(oneLang('A / B', 'ru')).toBe('A / B');
  });
});

describe('bot profili (npm run bot:setup)', () => {
  const o = { siteUrl: 'https://shahar.test', apiUrl: 'https://api.test', webhookSecret: 'wh', adminTelegramId: 5000 };
  test('buyruqlar uz va ru, admin buyruqlari faqat egasining chatida; tavsif, Menu tugmasi, webhook', () => {
    const calls = setupCalls(o);
    const cmds = calls.filter(([m]) => m === 'setMyCommands').map(([, b]) => b);
    expect(cmds).toHaveLength(4);
    expect(cmds.filter((b) => (b.scope as { type: string }).type === 'default').every((b) => !(b.commands as { command: string }[]).some((c) => c.command === 'stat'))).toBe(true);
    expect(cmds.filter((b) => (b.scope as { type: string }).type === 'chat').every((b) => (b.scope as { chat_id: number }).chat_id === 5000 && (b.commands as { command: string }[]).some((c) => c.command === 'hammaga'))).toBe(true);
    expect(cmds.some((b) => b.language_code === 'ru')).toBe(true);
    expect(calls.find(([m]) => m === 'setMyDescription')?.[1].description).toBe(bt('uz', 'description'));
    expect(calls.find(([m]) => m === 'setChatMenuButton')?.[1]).toEqual({ menu_button: { type: 'web_app', text: '🏙 Shahar', web_app: { url: 'https://shahar.test/' } } });
    expect(calls.at(-1)).toEqual(['setWebhook', expect.objectContaining({ url: 'https://api.test/telegram/webhook', secret_token: 'wh' })]);
    expect(commandsFor('ru', false).map((c) => c.description)).toContain('Магазин');
  });
  test('takror ishga tushirilsa — xuddi shu chaqiruvlar (xavfsiz); xato bo‘lsa to‘xtaydi', async () => {
    const seen: string[] = [];
    const ok: typeof fetch = async (input) => { seen.push(String(input).split('/').at(-1)!); return new Response('{"ok":true}'); };
    const first = await botSetup('t', o, ok);
    const second = await botSetup('t', o, ok);
    expect(second).toEqual(first);
    expect(seen).toHaveLength(first.length * 2);
    const bad: typeof fetch = async () => new Response('{"ok":false,"description":"Unauthorized"}', { status: 401 });
    await expect(botSetup('t', o, bad)).rejects.toThrow('Unauthorized');
  });
});

describe('/bot/setup (server o\'zi sozlaydi)', () => {
  test('sirsiz — 403; sir bilan — hamma chaqiruv (token tashqariga chiqmaydi)', async () => {
    expect((await call('/bot/setup', {})).status).toBe(403);
    expect((await call('/bot/setup', {}, { 'x-setup-secret': 'xato' })).status).toBe(403);
    const seen: string[] = [];
    const fake: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.startsWith('https://api.telegram.org/')) { seen.push(url.split('/').at(-1)!); return new Response('{"ok":true}'); }
      return emuFetch(input, init);
    };
    const res = await handle(new Request('https://api.test/bot/setup', { method: 'POST', body: '{}', headers: { 'x-setup-secret': 'wh' } }), ctx({ fetch: fake }), () => undefined);
    expect(res.status).toBe(200);
    expect(seen).toContain('setWebhook');
    expect(seen).toContain('setChatMenuButton');
  });
});

describe('6f: premium xaridi botda (buy_<kod>)', () => {
  test('to‘lov o‘chiq — rasm, nom, narx va "Tez kunda" (tugmasiz)', async () => {
    await db.query("update settings set value = 'false' where key = 'payments_enabled'");
    await db.query("update decor_catalog set is_premium = true, price_uzs = 30000 where id = 'lux_superkar'");
    await newUser(4900, 'premium_xaridor');
    sent.length = 0;
    await say(4900, '/start buy_d_lux_superkar');
    const card = last();
    expect(card.photo).toMatch(/^https:\/\/shahar\.test\/assets\/decor\/.+\.webp$/);
    expect(card.text).toContain('30 000 so‘m');
    expect(card.text).toContain('150 ⭐');
    expect(card.text).toMatch(/tez kunda/i);
    expect(card.buttons ?? []).toEqual([]);
  });
  test('to‘lov yoqiq — "⭐ Stars bilan to‘lash" → hisob-faktura; paket ham', async () => {
    await db.query("update settings set value = 'true' where key = 'payments_enabled'");
    await say(4900, '/start buy_d_lux_superkar');
    expect(last().buttons?.map((b) => b.data)).toEqual(['pay:d_lux_superkar']);
    await tap(4900, 'pay:d_lux_superkar');
    sent.length = 0;
    await say(4900, '/start buy_pack3');
    expect(last().text).toContain('tanga');
    expect(last().buttons?.[0]?.data).toBe('pay:pack3');
    await db.query("update settings set value = 'false' where key = 'payments_enabled'");
  });
  test('egasi-admin — "Olish (admin)" (to‘lovsiz, is_admin, daromadga kirmaydi), keyin "Tayyor" + Shahar', async () => {
    await newUser(5000, 'egasi_nik');
    await say(5000, '/start buy_d_lux_superkar');
    expect(last().buttons?.map((b) => b.data)).toEqual(['abuy:d_lux_superkar']);
    expect(last().buttons?.[0]?.text).toBe('✅ Olish (admin)');
    await tap(5000, 'abuy:d_lux_superkar');
    expect(last().text).toBe('✅ Tayyor — saytda ko‘ring!');
    expect(last().buttons?.[0]?.text).toBe('🏙 Shahar');
    const rows = (await db.query("select o.is_test, o.is_admin from orders o join profiles p on p.user_id = o.user_id where p.telegram_id = 5000 and o.kind = 'decor'")).rows;
    expect(rows).toContainEqual({ is_test: false, is_admin: true });
    // Oddiy odam admin xaridini chaqira olmaydi.
    await tap(4900, 'abuy:d_lux_superkar');
    expect(last().text).not.toContain('Tayyor');
    await db.query("update decor_catalog set is_premium = false where id = 'lux_superkar'");
  });
});

describe('13-qadam: Telegram to‘lov talablari', () => {
  test('/paysupport — "to‘lov" belgili murojaat adminga; /terms — qoidalar havolasi; buyruqlar ro‘yxatida bor', async () => {
    await newUser(4950, 'tolov_savol');
    await say(4950, '/paysupport');
    expect(last().text).toContain('To‘lov bo‘yicha');
    await say(4950, 'Stars yechildi, tanga kelmadi');
    expect(sent.some((m) => m.chat === 5000 && m.text.includes('[to‘lov] Stars yechildi'))).toBe(true);
    await say(4950, '/terms');
    expect(last().text).toContain('/paysupport');
    expect(last().text).toContain('https://shahar.test/?panel=qoidalar&til=uz');
    expect(commandsFor('uz', false).map((c) => c.command)).toEqual(expect.arrayContaining(['paysupport', 'terms']));
  });
});

describe('Mini App ichida Stars', () => {
  test('/pay/stars/link: hisob havolasi (openInvoice uchun)', async () => {
    await db.query("update settings set value = 'true' where key = 'payments_enabled'");
    await newUser(4800, 'stars_nik');
    const link = sent.find((m) => m.buttons?.[0]?.url?.includes('kirish='))!.buttons![0]!.url!;
    const token = new URL(link).searchParams.get('kirish')!;
    const { token_hash: hash } = (await call('/auth/telegram/redeem', { token })).body as { token_hash: string };
    const jwt = ((await (await emu(new Request('http://emu/auth/v1/verify', { method: 'POST', body: JSON.stringify({ token_hash: hash }) }))).json()) as { access_token: string }).access_token;
    const res = await handle(new Request('https://api.test/pay/stars/link', { method: 'POST', body: JSON.stringify({ code: 'pack3' }), headers: { authorization: `Bearer ${jwt}` } }), ctx(), () => undefined);
    expect(((await res.json()) as { url: string }).url).toMatch(/^https:\/\/t\.me\/\$invoice_/);
    await db.query("update settings set value = 'false' where key = 'payments_enabled'");
  });
});
