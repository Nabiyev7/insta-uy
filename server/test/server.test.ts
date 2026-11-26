import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { openDb } from '../dev/db.ts';
import { createEmulator, makeKeys } from '../dev/supabase-emu.ts';
import { handle } from '../src/app.ts';
import { backup, collectComments, runCron, sendVideos } from '../src/cron.ts';
import { parseBankMessage } from '../src/payments/bank.ts';
import { supabaseBackend } from '../src/supabase.ts';
import { telegramApi } from '../src/telegram.ts';
import type { Ctx, Env, Telegram, TgButton } from '../src/types.ts';
import { md5 } from '../src/util.ts';

const keys = makeKeys('test-secret');
const ENV: Env = {
  SUPABASE_URL: 'http://emu', SUPABASE_SERVICE_KEY: keys.service, SITE_URL: 'https://shahar.test', ALLOWED_ORIGINS: 'https://shahar.test', HASH_SECRET: 'h',
  TELEGRAM_BOT: 'shahar_bot', ADMIN_URL: 'https://admin.test', TELEGRAM_WEBHOOK_SECRET: 'wh', ADMIN_TELEGRAM_ID: '1', BANK_BOT: 'bankbot', BANK_SECRET: 'bs', PAYME_KEY: 'pk', CLICK_SECRET: 'cs', CLICK_SERVICE_ID: '77',
  META_TOKEN: 'mt', META_MEDIA_IDS: '123, bad', DEV: '1',
};
let db: PGlite;
let emu: (req: Request) => Promise<Response>;
const sent: { chat: number | string; text: string; buttons?: readonly TgButton[] }[] = [];
const errors: unknown[] = [];
const members = new Set<number>();
const tg: Telegram = {
  send: async (chat, text, buttons) => { sent.push({ chat, text, ...(buttons ? { buttons } : {}) }); },
  answer: async (_id, text) => { sent.push({ chat: 0, text }); },
  video: async (chat, url) => { sent.push({ chat, text: url }); },
  isMember: async (_channel, user) => members.has(user),
  invoice: async (chat, title, _d, payload, stars) => { sent.push({ chat, text: `invoice:${payload}:${stars}:${title}` }); },
  preCheckout: async (_id, isOk) => { sent.push({ chat: 0, text: `precheckout:${String(isOk)}` }); },
  refundStars: async (user, charge) => { refunds.push(`${user}:${charge}`); },
  document: async (chat, name, data) => { docs.push({ chat, name, size: data.length }); },
  sendId: async (chat, text) => { sent.push({ chat, text }); return 9000 + sent.length; },
  photo: async (chat, fileId, caption) => { sent.push({ chat, text: `photo:${fileId}:${caption}` }); return 9000 + sent.length; },
  download: async (fileId) => (fileId === 'rasm_1' ? new Uint8Array([1, 2, 3]) : null),
};
const docs: { chat: number; name: string; size: number }[] = [];
const refunds: string[] = [];
const emuFetch: typeof fetch = (input, init) => emu(new Request(input as string, init));
let ipN = 0;
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ env: ENV, db: supabaseBackend(ENV, emuFetch), tg, ip: `10.0.0.${++ipN}`, fetch: emuFetch, ...over });
const call = async (p: string, body?: unknown, headers: Record<string, string> = {}, c = ctx()): Promise<{ status: number; body: Record<string, unknown>; headers: Headers }> => {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const res = await handle(new Request(`https://api.test${p}`, body === undefined ? { headers } : { method: 'POST', body: raw, headers }), c, (_m, e) => errors.push(e));
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text.startsWith('{') ? (JSON.parse(text) as Record<string, unknown>) : { text } };
};
const signIn = async (login: string, password: string): Promise<string | undefined> => {
  const res = await emu(new Request('http://emu/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: `${login}@login.citylanduz.uz`, password }) }));
  return ((await res.json()) as { access_token?: string }).access_token;
};
const userRpc = async (jwt: string, fn: string, args: unknown = {}): Promise<Record<string, unknown>> =>
  (await (await emu(new Request(`http://emu/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args), headers: { authorization: `Bearer ${jwt}` } }))).json()) as Record<string, unknown>;
const webhook = (update: unknown): ReturnType<typeof call> => call('/telegram/webhook', update, { 'x-telegram-bot-api-secret-token': 'wh' });
const message = (id: number, text: string, extra = {}): unknown => ({ message: { message_id: 1, from: { id, first_name: 'Ali' }, chat: { id, type: 'private' }, text, ...extra } });
const linkToken = (): string => /kirish=([0-9a-f]{32})/.exec(sent.at(-1)?.buttons?.[0]?.url ?? '')?.[1] ?? '';
const redeem = async (token: string): Promise<string> => {
  const r = (await call('/auth/telegram/redeem', { token })).body as { token_hash?: string };
  if (!r.token_hash) return '';
  const res = await emu(new Request('http://emu/auth/v1/verify', { method: 'POST', body: JSON.stringify({ token_hash: r.token_hash }) }));
  return ((await res.json()) as { access_token: string }).access_token;
};
/** Bot orqali yangi akkaunt: /start → nik → havola → sessiya. */
/** Nik → tasdiq ("Ha, to'g'ri") → akkaunt. */
const confirmNick = (id: number, c?: Ctx): ReturnType<typeof call> => call('/telegram/webhook', { callback_query: { id: 'n', from: { id, first_name: 'S' }, data: 'nick_ok' } }, { 'x-telegram-bot-api-secret-token': 'wh' }, c);
const botUser = async (id: number, nick: string): Promise<string> => {
  await webhook(message(id, '/start login'));
  await webhook(message(id, nick));
  await confirmNick(id);
  return redeem(linkToken());
};
/** Telegramsiz eski (parolli) akkaunt — faqat ulash sinovi uchun. */
const legacyUser = async (login: string, password: string): Promise<string> => {
  const user = await supabaseBackend(ENV, emuFetch).createUser(`${login}@login.citylanduz.uz`, password);
  await db.query('select public.svc_profile_create($1, $2)', [user.id, login]);
  return (await signIn(login, password))!;
};

beforeAll(async () => {
  db = await openDb();
  emu = createEmulator(db, keys, path.join(tmpdir(), `shahar-test-${process.pid}`));
  await db.query("update settings set value = 'true' where key = 'payments_enabled'");
});
/* Har test o'z egasini o'zi belgilaydi (egasi yozilmagan — admin roli yetadi). */
beforeEach(async () => { await db.query('delete from private.owner'); });

describe('kirish faqat Telegram bot orqali', () => {
  test('eski yo‘llar: so‘rov-kutish yo‘q (404); parol yo‘li bayroqcha ortida (403)', async () => {
    for (const p of ['/auth/telegram/start', '/auth/telegram/poll']) expect((await call(p, {})).status).toBe(404);
    for (const p of ['/auth/register', '/auth/reset/start', '/auth/reset/finish']) expect((await call(p, {})).status).toBe(403);
  });
  test('webhook siri majburiy', async () => {
    expect((await call('/telegram/webhook', message(5, '/start'))).status).toBe(403);
    expect((await call('/telegram/webhook', message(5, '/start'), { 'x-telegram-bot-api-secret-token': 'wrong' })).status).toBe(403);
  });
  test('yangi odam: nik so‘raladi → akkaunt → bir martalik havola → sessiya', async () => {
    await webhook(message(700, '/start login'));
    expect(sent.at(-1)!.text).toContain('Instagram nikingizni');
    await webhook(message(700, 'a b c'));
    expect(sent.at(-1)!.text).toContain('lotin');
    await webhook(message(700, 'ali..vali'));
    expect(sent.at(-1)!.text).toContain('ikki nuqta');
    await webhook(message(700, 'https://instagram.com/Ali.Karimov.'));
    // Tasdiq qadami: akkaunt hali yo'q, Instagram havolasi bor.
    expect(sent.at(-1)!.buttons!.map((b) => b.url ?? b.data)).toEqual(['https://instagram.com/ali.karimov', 'nick_ok', 'nick_again']);
    expect((await db.query("select 1 from profiles where telegram_id = 700")).rows).toHaveLength(0);
    await confirmNick(700);
    const token = linkToken();
    expect(sent.at(-1)!.buttons![0]!.url).toBe(`https://shahar.test/?kirish=${token}`);
    const jwt = await redeem(token);
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ login: 'tg700', instagram: 'ali.karimov', telegram: true });
    expect((await call('/auth/telegram/redeem', { token })).body).toEqual({ error: 'expired' });
    expect((await call('/auth/telegram/redeem', { token: 'x' })).body.error).toBe('bad_format');
  });
  test('band nik rad etiladi; qaytgan odamga darhol havola', async () => {
    await webhook(message(701, '/start'));
    await webhook(message(701, 'ali.karimov'));
    expect(sent.at(-1)!.text).toContain('band');
    expect(sent.at(-1)!.buttons!.map((b) => b.data)).toEqual(['claim']);
    await webhook(message(700, '/start'));
    expect(await redeem(linkToken())).toBeTruthy();
    await webhook({ callback_query: { id: 'c', from: { id: 700, first_name: 'Ali' }, data: 'open' } });
    expect(linkToken()).toMatch(/^[0-9a-f]{32}$/);
  });
  test('taklif havolasi: /start r_kod', async () => {
    const inviter = await botUser(710, 'taklifchi');
    const ref = ((await userRpc(inviter, 'my_profile')) as { ref: string }).ref;
    await webhook(message(711, `/start r_${ref}`));
    await webhook(message(711, 'mehmon_tg'));
    await confirmNick(711);
    const [row] = (await db.query<{ referred_by: string }>("select referred_by from profiles where login = 'tg711'")).rows;
    expect(row?.referred_by).toBeTruthy();
  });
  test('eski akkauntni ulash: tasdiq tugmasi', async () => {
    const jwt = await legacyUser('eski_1', 'eskiparol1');
    expect((await call('/auth/telegram/link', {})).status).toBe(401);
    const link = (await call('/auth/telegram/link', {}, { authorization: `Bearer ${jwt}` })).body as { url: string };
    const token = link.url.split('link_')[1]!;
    await webhook(message(801, `/start link_${token}`));
    await webhook({ callback_query: { id: 'c', from: { id: 801, first_name: 'T' }, data: `ok:${token}` } });
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ telegram: true });
    await webhook(message(801, '/start'));
    expect(linkToken()).toMatch(/^[0-9a-f]{32}$/);
  });
  test('kutish ro‘yxati, yordam adminga, noma’lum matn — menyu', async () => {
    await webhook(message(900, '/start wait'));
    expect(sent.at(-1)!.text).toContain('(1)');
    await webhook(message(900, '/yordam Uyim qani?'));
    expect(sent.some((m) => m.chat === 1 && m.text.includes('Uyim qani?'))).toBe(true);
    await webhook(message(700, 'salom'));
    expect(sent.at(-1)!.text).toContain('/yordam');
  });
  test('/admin: faqat egasi (ADMIN_TELEGRAM_ID + admin roli); boshqalarga "Bunday buyruq yo‘q"', async () => {
    await webhook(message(700, '/admin'));
    expect(sent.at(-1)!.text).toContain('Bunday buyruq yo‘q');
    expect(sent.at(-1)!.buttons ?? []).toEqual([]);
    await db.query("update profiles set role = 'moderator' where telegram_id = 700");
    await webhook(message(700, '/admin'));
    expect(sent.at(-1)!.text).toContain('Bunday buyruq yo‘q');
    await db.query("update profiles set role = 'admin' where telegram_id = 700");
    await webhook(message(700, '/admin'));
    expect(sent.at(-1)!.text).toContain('Bunday buyruq yo‘q');
    await db.query("update profiles set role = 'user' where telegram_id = 700");
    const c = ctx({ env: { ...ENV, ADMIN_TELEGRAM_ID: '700' } });
    await db.query("update profiles set role = 'admin' where telegram_id = 700");
    await call('/telegram/webhook', message(700, '/admin'), { 'x-telegram-bot-api-secret-token': 'wh' }, c);
    const url = sent.at(-1)!.buttons![0]!.url!;
    expect(url).toMatch(/^https:\/\/admin\.test\/\?kirish=[0-9a-f]{32}$/);
    expect(await redeem(url.split('kirish=')[1]!)).toBeTruthy();
    await db.query("update profiles set role = 'user' where telegram_id = 700");
  });
  test('lokal bot sinovi faqat DEV=1 da', async () => {
    expect((await call('/dev/telegram', message(720, '/start'))).body).toMatchObject({ sent: [{ text: expect.stringContaining('Instagram') }] });
    expect((await call('/dev/telegram', message(720, '/start'), {}, ctx({ env: { ...ENV, DEV: '' } }))).status).toBe(404);
  });
  test('Bot API: 403 yutiladi, 500 xato', async () => {
    const urls: string[] = [];
    const api = (status: number): Telegram => telegramApi('T', async (u) => { urls.push(String(u)); return new Response('{}', { status }); });
    await api(200).send(1, 'x', [{ text: 'a', url: 'https://a' }, { text: 'b', data: 'd' }]);
    await api(403).answer('1', 'x');
    await expect(api(500).video(1, 'u', 'c')).rejects.toThrow('500');
    expect(urls[0]).toBe('https://api.telegram.org/botT/sendMessage');
  });
});

describe('bank xabari', () => {
  test.each([
    ['Kirim: 50 017.00 UZS\nKarta *1234\nQoldiq: 1 250 000.00 UZS', 50017], ['Пополнение счёта 62 431,00 сум', 62431], ["➕ 120017 so'm kartaga", 120017], ['Зачисление +75 250.00 UZS', 75250],
  ])('%s', (t, amount) => expect(parseBankMessage(t)?.amount).toBe(amount));
  test.each(['Chiqim: 50 017.00 UZS', 'Покупка 50 017.00 UZS', 'Kirim: 50 017.50 UZS', 'Kirim: 17 UZS', 'salom', "Kirim: so'm"])('rad: %s', (t) => expect(parseBankMessage(t)).toBeNull());
});

describe('to‘lovlar', () => {
  let jwt = '';
  const order = async (provider: string): Promise<{ id: string; amount: number }> => {
    await db.query("update settings set value = to_jsonb($1::text) where key = 'payment_provider'", [provider]);
    return (await userRpc(jwt, 'my_order', { p_kind: 'decor', p_payload: { id: 'sign_nick' } })) as { id: string; amount: number };
  };
  beforeAll(async () => {
    jwt = await botUser(1200, 'xaridor');
  });

  test('karta: sir, mos summa, takror', async () => {
    const o = await order('card');
    const text = `Kirim: ${o.amount} UZS 12:01`;
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'no' })).status).toBe(403);
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'bs' })).body).toMatchObject({ result: 'paid', order: o.id });
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'bs' })).body).toEqual({ result: 'duplicate' });
    expect((await call('/pay/card', { text: 'Chiqim 5000 UZS' }, { 'x-bank-secret': 'bs' })).body).toEqual({ result: 'ignored' });
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ decor: { sign_nick: 1 } });
  });
  test('bank botidan forward faqat admindan qabul qilinadi', async () => {
    const o = await order('card');
    const fwd = { forward_origin: { sender_user: { username: 'BankBot' } } };
    await webhook(message(555, `Kirim: ${o.amount} UZS`, fwd));
    expect(((await userRpc(jwt, 'my_orders')) as unknown as { id: string; status: string }[]).find((x) => x.id === o.id)?.status).toBe('pending');
    await webhook(message(1, `Kirim: ${o.amount} UZS a`, { forward_origin: { sender_user: { username: 'evil' } } }));
    await webhook(message(1, `Kirim: ${o.amount} UZS`, fwd));
    expect(sent.at(-1)!.text).toContain('paid');
    await webhook(message(1, 'tushunarsiz', fwd));
    expect(sent.at(-1)!.text).toContain('topilmadi');
  });
  test('Payme to‘liq sikl', async () => {
    const o = await order('payme');
    const head = { authorization: `Basic ${btoa('Paycom:pk')}` };
    const rpcCall = async (method: string, params: unknown, h = head): Promise<Record<string, Record<string, unknown>>> => (await call('/pay/payme', { id: 1, method, params }, h)).body as never;
    const account = { order: o.id };
    expect((await rpcCall('CheckPerformTransaction', { amount: o.amount * 100, account }, { authorization: 'Basic !!' })).error!.code).toBe(-32504);
    expect((await rpcCall('CheckPerformTransaction', { amount: 1, account })).error!.code).toBe(-31001);
    expect((await rpcCall('CheckPerformTransaction', { amount: 100, account })).error!.code).toBe(-31001);
    expect((await rpcCall('CheckPerformTransaction', { amount: 100, account: { order: 'x' } })).error!.code).toBe(-31050);
    expect((await rpcCall('CheckPerformTransaction', { amount: o.amount * 100, account })).result).toEqual({ allow: true });
    expect((await rpcCall('CreateTransaction', { id: 't1', time: Date.now(), amount: 100, account })).error!.code).toBe(-31001);
    expect((await rpcCall('CreateTransaction', { id: 't1', time: Date.now(), amount: o.amount * 100, account })).result).toMatchObject({ state: 1 });
    expect((await rpcCall('CreateTransaction', { id: 't2', time: Date.now(), amount: o.amount * 100, account })).error!.code).toBe(-31099);
    expect((await rpcCall('PerformTransaction', { id: 't1' })).result).toMatchObject({ state: 2 });
    expect((await rpcCall('PerformTransaction', { id: 't1' })).result).toMatchObject({ state: 2 });
    expect((await rpcCall('CancelTransaction', { id: 't1', reason: 5 })).error!.code).toBe(-31007);
    expect((await rpcCall('CheckTransaction', { id: 't1' })).result).toMatchObject({ state: 2 });
    expect((await rpcCall('CheckTransaction', { id: 'zz' })).error!.code).toBe(-31003);
    expect((await rpcCall('CheckTransaction', {})).error!.code).toBe(-31003);
    expect((await rpcCall('GetStatement', { from: 0, to: Date.now() + 1000 })).result!.transactions).toHaveLength(1);
    expect((await rpcCall('toString', {})).error!.code).toBe(-32601);
    expect(((await call('/pay/payme', '{', head)).body.error as { code: number }).code).toBe(-32700);
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ decor: { sign_nick: 3 } });
    const o2 = await order('payme');
    await rpcCall('CreateTransaction', { id: 't3', time: Date.now(), amount: o2.amount * 100, account: { order: o2.id } });
    expect((await rpcCall('CancelTransaction', { id: 't3', reason: 3 })).result).toMatchObject({ state: -1 });
    expect((await rpcCall('PerformTransaction', { id: 't3' })).error!.code).toBe(-31008);
  });
  test('Click imzo, summa, to‘liq sikl', async () => {
    const o = await order('click');
    const send = async (action: string, over: Record<string, string> = {}, secret = 'cs'): Promise<number> => {
      const p: Record<string, string> = { click_trans_id: 'c1', service_id: '77', merchant_trans_id: o.id, amount: String(o.amount), action, error: '0', sign_time: '2026-11-23 10:00:00', ...over };
      if (action === '1') p.merchant_prepare_id ??= 'c1';
      p.sign_string = md5(p.click_trans_id! + p.service_id + secret + p.merchant_trans_id + (action === '1' ? p.merchant_prepare_id : '') + p.amount + action + p.sign_time);
      return (await call(`/pay/click/${action === '0' ? 'prepare' : 'complete'}`, new URLSearchParams(p).toString())).body.error as number;
    };
    expect(await send('0', {}, 'wrong')).toBe(-1);
    expect(await send('0', { amount: '1' })).toBe(-2);
    expect(await send('0', { merchant_trans_id: 'x' })).toBe(-5);
    expect(await send('1')).toBe(-6);
    expect(await send('0')).toBe(0);
    expect(await send('1')).toBe(0);
    expect(await send('1')).toBe(-4);
    expect(await send('0')).toBe(-4);
    expect((await call('/pay/click/prepare', 'a=1')).body.error).toBe(-8);
    const o2 = await order('click');
    expect(await send('0', { click_trans_id: 'c2', merchant_trans_id: o2.id, amount: String(o2.amount) })).toBe(0);
    expect(await send('1', { click_trans_id: 'c2', merchant_prepare_id: 'c2', merchant_trans_id: o2.id, amount: String(o2.amount), error: '-5017' })).toBe(-9);
  });
  test('sozlanmagan provayder 404', async () => {
    expect((await call('/pay/payme', {}, {}, ctx({ env: { ...ENV, PAYME_KEY: '' } }))).status).toBe(404);
  });
});

describe('sahifalar va cron', () => {
  test('kutish ro‘yxati, OG, 404, CORS, xato yashirish', async () => {
    expect((await call('/waitlist', { instagram: 'https://instagram.com/kutgan_1/' })).body).toMatchObject({ ok: true });
    expect((await call('/waitlist', { instagram: 'su ka' })).status).toBe(400);
    const og = await call('/uy/P0001');
    expect(og.body.text).toContain('og:title');
    expect((await call('/uy/P9999')).status).toBe(404);
    expect((await call('/uy/XX')).status).toBe(404);
    expect((await call('/health')).body).toEqual({ ok: true });
    expect((await call('/nope')).status).toBe(404);
    expect((await call('/nope', {})).status).toBe(404);
    expect((await call('/health', undefined, { origin: 'https://shahar.test' })).headers.get('access-control-allow-origin')).toBe('https://shahar.test');
    expect((await call('/health', undefined, { origin: 'https://evil.test' })).headers.get('access-control-allow-origin')).toBeNull();
    const broken = ctx({ db: { ...ctx().db, rpc: async () => { throw new Error('maxfiy ichki xato'); } } });
    expect((await call('/uy/P0001', undefined, {}, broken)).body).toEqual({ error: 'server_error' });
    const opt = await handle(new Request('https://api.test/x', { method: 'OPTIONS' }), ctx(), () => undefined);
    expect(opt.status).toBe(204);
    expect((await handle(new Request('https://api.test/x', { method: 'PUT' }), ctx(), () => undefined)).status).toBe(405);
  });
  test('cron: tick, xabarlar, zaxira, kommentlar, video', async () => {
    expect(await runCron(ctx(), '*/10 * * * *')).toEqual([]);
    expect(await backup(ctx(), new Date('2026-11-23T00:00:00Z'))).toBe('2026-11-23.json');
    const meta: typeof fetch = async () => new Response(JSON.stringify({ data: [{ username: 'komment_1' }, { username: 'komment_1' }, {}] }));
    expect(await collectComments(ctx({ fetch: meta }))).toBe(1);
    expect(await collectComments(ctx({ env: { ...ENV, META_TOKEN: '' } }))).toBe(0);
    expect(await runCron(ctx({ fetch: async () => new Response('', { status: 500 }) }), '10 22 * * *')).toEqual(['comments: meta 123: 500']);
    await db.query("insert into video_jobs (status, file) values ('sent', 'https://x/v.mp4'), ('sent', 'lokal.mp4')");
    expect(await sendVideos(ctx())).toBe(1);
    expect(await sendVideos(ctx({ tg: null }))).toBe(0);
    await db.query("insert into notifications (user_id, kind, data) select user_id, 'referral', '{\"nick\":\"x\"}' from profiles where telegram_id = 700");
    await runCron(ctx(), '*/10 * * * *');
    expect(sent.some((m) => m.chat === 700 && m.text.includes('Do‘stingiz'))).toBe(true);
  });
  test('akkauntni o‘chirish', async () => {
    const jwt = await botUser(1300, 'ochir_1');
    expect((await call('/auth/delete', {}, { authorization: `Bearer ${jwt}` })).body).toEqual({ ok: true });
    await webhook(message(1300, '/start'));
    expect(sent.at(-1)!.text).toContain('Instagram nikingizni');
  });
});

describe('kanalga obuna bonusi', () => {
  test('sayt: obuna bo‘lmasa — yo‘q, bo‘lsa — 300 bir marta', async () => {
    const jwt = await botUser(1400, 'kanal_odam');
    const auth = { authorization: `Bearer ${jwt}` };
    expect((await call('/coins/channel', {}, auth)).body).toMatchObject({ error: 'not_subscribed' });
    members.add(1400);
    expect((await call('/coins/channel', {}, auth)).body).toMatchObject({ state: 'paid', gain: 300 });
    expect((await call('/coins/channel', {}, auth)).body).toMatchObject({ state: 'done' });
    expect((await call('/coins/channel', {})).status).toBe(401);
  });
  test('lokalda bot yo‘q: 503; DEV_CHANNEL_OK=1 da obuna "bor" (faqat DEV=1)', async () => {
    const jwt = await botUser(1402, 'kanal_odam3');
    const auth = { authorization: `Bearer ${jwt}` };
    expect((await call('/coins/channel', {}, auth, ctx({ tg: null }))).status).toBe(503);
    expect((await call('/coins/channel', {}, auth, ctx({ tg: null, env: { ...ENV, DEV: undefined, DEV_CHANNEL_OK: '1' } }))).status).toBe(503);
    expect((await call('/coins/channel', {}, auth, ctx({ tg: null, env: { ...ENV, DEV_CHANNEL_OK: '1' } }))).body).toMatchObject({ state: 'paid' });
  });
  test('bot: "Obuna bo‘ldim" tugmasi', async () => {
    await botUser(1401, 'kanal_odam2');
    const press = (): Promise<unknown> => webhook({ update_id: 1, callback_query: { id: 'c1', from: { id: 1401, first_name: 'K' }, data: 'chan' } });
    await press();
    expect(sent.at(-1)!.text).toContain('obuna');
    members.add(1401);
    await press();
    expect(sent.at(-1)!.text).toContain('+300');
  });
});

describe('Telegram Stars do‘koni', () => {
  const pre = (from: number, order: string, stars: number): unknown => ({ update_id: 2, pre_checkout_query: { id: 'pq', from: { id: from, first_name: 'S' }, currency: 'XTR', total_amount: stars, invoice_payload: order } });
  const paid = (from: number, order: string, stars: number, charge: string): unknown =>
    message(from, '', { successful_payment: { currency: 'XTR', total_amount: stars, invoice_payload: order, telegram_payment_charge_id: charge } });
  test('to‘lov o‘chiq bo‘lsa — "tez kunda"', async () => {
    await db.query("update settings set value = 'false' where key = 'payments_enabled'");
    await botUser(1500, 'yulduz_odam');
    await webhook(message(1500, '/start buy_pack1'));
    expect(sent.at(-1)!.text).toContain('tez kunda');
  });
  test('buy_pack1 → hisob (50⭐) → tekshiruv → to‘lov → tanga; qaytarish', async () => {
    await db.query("update settings set value = 'true' where key = 'payments_enabled'");
    await botUser(1501, 'yulduz_odam2');
    await webhook(message(1501, '/start buy_pack1'));
    expect(sent.at(-1)!.text).toContain('karta');
    await webhook(message(1501, '/dokon'));
    expect(sent.at(-1)!.buttons!.map((b) => b.data)).toEqual(['buy:pack3', 'buy:pack4', 'buy:pack5', 'buy:salute', undefined]);
    await webhook(message(1501, '/start buy_pack3'));
    const [, order, stars] = /^invoice:([0-9a-f-]{36}):(\d+):/.exec(sent.at(-1)!.text)!;
    expect(stars).toBe('60');
    await webhook(pre(1501, order!, 59));
    expect(sent.at(-1)!.text).toBe('precheckout:false');
    await webhook(pre(1501, order!, 60));
    expect(sent.at(-1)!.text).toBe('precheckout:true');
    await webhook(paid(1501, order!, 60, 'ch_1'));
    await webhook(paid(1501, order!, 60, 'ch_1'));
    const coins = async (): Promise<number> => (await db.query<{ coins: number }>('select coins from profiles where telegram_id = 1501')).rows[0]!.coins;
    expect(await coins()).toBe(3000);
    // Qaytarish: faqat admin; Stars — Telegram orqali.
    const payment = (await db.query<{ id: number }>("select id from payments where provider = 'stars' and external_id = 'ch_1'")).rows[0]!.id;
    const jwt = await botUser(1502, 'yulduz_admin');
    expect((await call('/pay/refund', { payment }, { authorization: `Bearer ${jwt}` })).body).toMatchObject({ error: 'forbidden' });
    await db.query("update profiles set role = 'admin' where telegram_id = 1502");
    expect((await call('/pay/refund', { payment }, { authorization: `Bearer ${jwt}` })).body).toMatchObject({ ok: true, provider: 'stars' });
    expect(refunds).toContain('1501:ch_1');
    expect(await coins()).toBe(0);
    await db.query("update settings set value = 'false' where key = 'payments_enabled'");
  });
  test('/dokon menyusi va salyut buyrug‘i', async () => {
    await webhook(message(1501, '/dokon'));
    expect(sent.at(-1)!.buttons!.map((b) => b.data)).toContain('buy:pack4');
    await webhook(message(1501, '/start buy_salute'));
    expect(sent.at(-1)!.text).toContain('/salyut');
  });
});

describe('zaxira Telegramga', () => {
  test('siqilgan zaxira adminning Telegramiga; katta bo‘lsa bo‘laklab', async () => {
    const { backup, chunks, gzip } = await import('../src/cron.ts');
    await backup(ctx(), new Date('2026-11-25T22:10:00Z'));
    expect(docs.at(-1)).toMatchObject({ chat: 1, name: 'cityland-2026-11-25.json.gz' });
    const packed = await gzip('salom '.repeat(1000));
    expect(packed[0]).toBe(0x1f);
    expect(chunks(new Uint8Array(10), 4).map((c) => c.length)).toEqual([4, 4, 2]);
  });
});

describe('xabar yuborish va so‘rovnoma', () => {
  test('admin so‘rovnomasi navbat bilan boradi, tugma bilan ovoz', async () => {
    const { flushBroadcast } = await import('../src/telegram.ts');
    await botUser(1600, 'sorov_odam');
    const admin = (await db.query<{ user_id: string }>('select user_id from profiles where telegram_id = 1600')).rows[0]!.user_id;
    await db.query("update profiles set role = 'admin' where user_id = $1", [admin]);
    const { rpc } = await import('../dev/db.ts');
    const poll = await rpc(db, 'authenticated', admin, 'admin_poll', { p_question: 'Qaysi bog‘?', p_options: ['Olma', 'Anor'] }) as number;
    const before = sent.length;
    expect(await flushBroadcast(ctx(), 0)).toBeGreaterThan(0);
    const msg = sent.slice(before).find((m) => m.chat === 1600)!;
    expect(msg.buttons!.map((b) => b.data)).toEqual([`poll:${poll}:1`, `poll:${poll}:2`]);
    await webhook({ update_id: 3, callback_query: { id: 'v1', from: { id: 1600, first_name: 'S' }, data: `poll:${poll}:2` } });
    expect(sent.at(-1)!.text).toContain('Anor');
    expect((await db.query('select option from poll_votes where poll_id = $1', [poll])).rows).toEqual([{ option: 2 }]);
  });
});

describe('login + parol (password_login bayroqchasi)', () => {
  test('o‘chiq (sukut): ro‘yxat va tiklash 403, bot /parol — "o‘chirilgan"', async () => {
    expect(await call('/auth/register', { login: 'parolli_1', password: 'parol12345' })).toMatchObject({ status: 403, body: { error: 'password_off' } });
    expect((await call('/auth/reset/start', { login: 'x' })).status).toBe(403);
    expect((await call('/auth/reset/finish', { login: 'x', code: '123456', password: 'parol12345' })).status).toBe(403);
    await webhook(message(1700, '/parol'));
    expect(sent.at(-1)!.text).toContain('o‘chirilgan');
  });
  test('yoqiq: ro‘yxat, kirish, bot kodi bilan parol tiklash', async () => {
    await db.query("update settings set value = 'true' where key = 'password_login'");
    expect((await call('/auth/register', { login: 'parolli_2', password: 'parol12345' })).body).toEqual({ ok: true });
    expect(await signIn('parolli_2', 'parol12345')).toBeTruthy();
    expect((await call('/auth/register', { login: 'parolli_2', password: 'parol12345' })).status).toBe(409);
    await db.query("update profiles set telegram_id = 1701 where login = 'parolli_2'");
    await webhook(message(1701, '/parol'));
    const code = /kodi: (\d{6})/.exec(sent.at(-1)!.text)![1]!;
    expect((await call('/auth/reset/finish', { login: 'parolli_2', code, password: 'yangi_parol_9' })).body).toEqual({ ok: true });
    expect(await signIn('parolli_2', 'yangi_parol_9')).toBeTruthy();
    await db.query("update settings set value = 'false' where key = 'password_login'");
  });
});

describe('admin qanday kiradi', () => {
  test('ADMIN_TELEGRAM_ID birinchi kirishdayoq admin bo‘ladi', async () => {
    const c = ctx({ env: { ...ENV, ADMIN_TELEGRAM_ID: '1800' } });
    await call('/telegram/webhook', message(1800, '/start login'), { 'x-telegram-bot-api-secret-token': 'wh' }, c);
    await call('/telegram/webhook', message(1800, 'egasi_nik'), { 'x-telegram-bot-api-secret-token': 'wh' }, c);
    await confirmNick(1800, c);
    expect((await db.query("select role from profiles where telegram_id = 1800")).rows).toEqual([{ role: 'admin' }]);
    await webhook(message(1801, '/start login'));
    await webhook(message(1801, 'oddiy_nik'));
    await confirmNick(1801);
    expect((await db.query("select role from profiles where telegram_id = 1801")).rows).toEqual([{ role: 'user' }]);
  });
  test('lokal "Admin sifatida kirish": faqat DEV=1, aks holda 404', async () => {
    expect((await call('/dev/admin', {}, {}, ctx({ env: { ...ENV, DEV: undefined } }))).status).toBe(404);
    const r = await call('/dev/admin', {}, {}, ctx({ env: { ...ENV, ADMIN_TELEGRAM_ID: '1802' } }));
    const token = (r.body as { token: string }).token;
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(await redeem(token)).toBeTruthy();
    expect((await db.query("select role from profiles where telegram_id = 1802")).rows).toEqual([{ role: 'admin' }]);
  });
});

describe('adminga yozish va nik nizosi (bot)', () => {
  const photoMsg = (id: number, file: string, extra = {}): unknown => ({ message: { message_id: 2, from: { id, first_name: 'R' }, chat: { id, type: 'private' }, photo: [{ file_id: 'kichik' }, { file_id: file }], ...extra } });
  test('murojaat → admin "reply" → foydalanuvchiga; rasm; paneldan javob', async () => {
    await botUser(2100, 'murojaatchi');
    await webhook({ callback_query: { id: 's', from: { id: 2100, first_name: 'M' }, data: 'support' } });
    expect(sent.at(-1)!.text).toContain('Savolingiz');
    await webhook(message(2100, 'Uyim ko‘rinmayapti'));
    const toAdmin = sent.filter((m) => m.chat === 1).at(-1)!;
    expect(toAdmin.text).toContain('@murojaatchi');
    const adminMsgId = sent.length + 9000 - (sent.length - sent.indexOf(toAdmin)) + 1;
    await webhook(photoMsg(2100, 'rasm_1', { caption: 'mana' }));
    expect(sent.some((m) => m.chat === 1 && m.text.startsWith('photo:rasm_1'))).toBe(true);
    await webhook(message(1, 'Tuzatdik', { reply_to_message: { message_id: adminMsgId } }));
    expect(sent.some((m) => m.chat === 2100 && m.text.includes('Admin javobi'))).toBe(true);
    const jwt = await botUser(2101, 'panel_admin');
    await db.query("update profiles set role = 'admin' where telegram_id = 2101");
    const ticket = (await db.query<{ id: number }>('select id from support_tickets where telegram_id = 2100 order by id desc limit 1')).rows[0]!.id;
    expect((await call('/admin/support/reply', { ticket, text: 'Paneldan' }, { authorization: `Bearer ${jwt}` })).body).toEqual({ ok: true });
    expect(sent.at(-1)).toMatchObject({ chat: 2100 });
  });
  test('band nik: "Bu nik meniki" → dalil (rasm) → admin panelda ko‘rinadi', async () => {
    await botUser(2200, 'haqiqiy_nik');
    await webhook(message(2201, '/start login'));
    await webhook(message(2201, 'haqiqiy_nik'));
    await webhook({ callback_query: { id: 'c', from: { id: 2201, first_name: 'D' }, data: 'claim' } });
    expect(sent.at(-1)!.text).toContain('Profilni tahrirlash');
    await webhook(message(2201, 'matn'));
    expect(sent.at(-1)!.text).toContain('rasm');
    await webhook(photoMsg(2201, 'rasm_1'));
    expect(sent.at(-1)!.text).toContain('Dalil qabul qilindi');
    const id = (await db.query<{ id: number }>("select id from nick_disputes where nick = 'haqiqiy_nik'")).rows[0]!.id;
    const jwt = await botUser(2202, 'nizo_admin');
    await db.query("update profiles set role = 'admin' where telegram_id = 2202");
    const res = await handle(new Request('https://api.test/admin/dispute/proof', { method: 'POST', body: JSON.stringify({ id, side: 'claimant' }), headers: { authorization: `Bearer ${jwt}` } }), ctx(), () => undefined);
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe('nizodan keyin eski egasi', () => {
  test('/start bossa ham yangi nik so‘raladi, yozgach uy ustida yangi nik', async () => {
    await botUser(2300, 'eski_egasi_nik');
    const owner = (await db.query<{ user_id: string }>('select user_id from profiles where telegram_id = 2300')).rows[0]!.user_id;
    await db.query("insert into nick_disputes (nick, claimant_tg, owner, status) values ('eski_egasi_nik', 2301, $1, 'sent')", [owner]);
    const id = (await db.query<{ id: number }>("select id from nick_disputes where nick = 'eski_egasi_nik'")).rows[0]!.id;
    await db.query('select private.dispute_grant($1, null)', [id]);
    await webhook(message(2300, '/start'));
    expect(sent.at(-1)!.text).toContain('Yangi Instagram nikingizni');
    await webhook(message(2300, 'yangi_egasi_nik'));
    expect(sent.at(-1)!.text).toContain('@yangi_egasi_nik');
    expect((await db.query('select instagram from profiles where telegram_id = 2300')).rows).toEqual([{ instagram: 'yangi_egasi_nik' }]);
    await webhook(message(2302, '/start'));
    await webhook(message(2302, 'boshqa_nik'));
    await confirmNick(2302);
    await webhook(message(2302, '/start'));
    expect(sent.at(-1)!.buttons![0]!.url).toContain('kirish=');
  });
});

