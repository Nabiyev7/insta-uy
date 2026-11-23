import { tmpdir } from 'node:os';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
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
  TELEGRAM_BOT: 'shahar_bot', TELEGRAM_WEBHOOK_SECRET: 'wh', ADMIN_TELEGRAM_ID: '1', BANK_BOT: 'bankbot', BANK_SECRET: 'bs', PAYME_KEY: 'pk', CLICK_SECRET: 'cs', CLICK_SERVICE_ID: '77',
  META_TOKEN: 'mt', META_MEDIA_IDS: '123, bad',
};
let db: PGlite;
let emu: (req: Request) => Promise<Response>;
const sent: { chat: number; text: string; buttons?: readonly TgButton[] }[] = [];
const errors: unknown[] = [];
const tg: Telegram = {
  send: async (chat, text, buttons) => { sent.push({ chat, text, ...(buttons ? { buttons } : {}) }); },
  answer: async () => undefined,
  video: async (chat, url) => { sent.push({ chat, text: url }); },
};
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
  const res = await emu(new Request('http://emu/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email: `${login}@login.obunachilar-shahri.uz`, password }) }));
  return ((await res.json()) as { access_token?: string }).access_token;
};
const userRpc = async (jwt: string, fn: string, args: unknown = {}): Promise<Record<string, unknown>> =>
  (await (await emu(new Request(`http://emu/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args), headers: { authorization: `Bearer ${jwt}` } }))).json()) as Record<string, unknown>;
const webhook = (update: unknown): ReturnType<typeof call> => call('/telegram/webhook', update, { 'x-telegram-bot-api-secret-token': 'wh' });
const message = (id: number, text: string, extra = {}): unknown => ({ message: { message_id: 1, from: { id, first_name: 'Ali' }, chat: { id, type: 'private' }, text, ...extra } });

beforeAll(async () => {
  db = await openDb();
  emu = createEmulator(db, keys, path.join(tmpdir(), `shahar-test-${process.pid}`));
  await db.query("update settings set value = 'true' where key = 'payments_enabled'");
});

describe('ro‘yxatdan o‘tish', () => {
  test('yaratadi, kiradi, takror login rad etiladi', async () => {
    expect((await call('/auth/register', { login: 'Ali_1', password: 'parol12345' })).body).toEqual({ ok: true });
    expect(await signIn('ali_1', 'parol12345')).toBeTruthy();
    expect(await signIn('ali_1', 'xato')).toBeUndefined();
    expect((await call('/auth/register', { login: 'ali_1', password: 'parol12345' })).body).toEqual({ error: 'login_taken' });
  });
  test('validatsiya va noto‘g‘ri JSON', async () => {
    expect((await call('/auth/register', { login: '1', password: 'parol12345' })).body.error).toBe('login_too_short');
    expect((await call('/auth/register', { login: 'ali_2', password: '123' })).body.error).toBe('password_too_short');
    expect((await call('/auth/register', '{')).body.error).toBe('bad_json');
    expect((await call('/auth/register', { login: 5 })).body.error).toBe('bad_format');
    expect((await call('/auth/register', 'x'.repeat(20_000))).status).toBe(413);
  });
  test('bir IP dan cheklov', async () => {
    const c = ctx();
    const codes: number[] = [];
    for (let i = 0; i < 7; i++) codes.push((await call('/auth/register', { login: `lim_${i}`, password: 'parol12345' }, {}, c)).status);
    expect(codes.filter((s) => s === 429).length).toBe(2);
  });
  test('Turnstile', async () => {
    const verify = (success: boolean): typeof fetch => async () => new Response(JSON.stringify({ success }));
    const env = { ...ENV, TURNSTILE_SECRET: 'x' };
    expect((await call('/auth/register', { login: 'bot_1', password: 'parol12345' }, {}, ctx({ env, fetch: verify(false) }))).body.error).toBe('bot_check');
    expect((await call('/auth/register', { login: 'odam_1', password: 'parol12345' }, {}, ctx({ env, fetch: verify(true) }))).status).toBe(200);
  });
});

describe('Telegram', () => {
  test('webhook siri majburiy', async () => {
    expect((await call('/telegram/webhook', message(5, '/start'))).status).toBe(403);
    expect((await call('/telegram/webhook', message(5, '/start'), { 'x-telegram-bot-api-secret-token': 'wrong' })).status).toBe(403);
  });
  test('kirish: havola → tugma → sessiya, akkaunt avtomatik', async () => {
    const start = (await call('/auth/telegram/start', {})).body as { token: string; url: string };
    expect(start.url).toBe(`https://t.me/shahar_bot?start=login_${start.token}`);
    expect((await call('/auth/telegram/poll', { token: start.token })).body).toEqual({ state: 'waiting' });
    await webhook(message(700, `/start login_${start.token}`));
    const button = sent.at(-1)!.buttons![0]!;
    expect((await call('/auth/telegram/poll', { token: start.token })).body).toEqual({ state: 'waiting' });
    await webhook({ callback_query: { id: 'c', from: { id: 700, first_name: 'Ali' }, data: button.data } });
    const done = (await call('/auth/telegram/poll', { token: start.token })).body as { state: string; token_hash: string };
    expect(done.state).toBe('ok');
    const res = await emu(new Request('http://emu/auth/v1/verify', { method: 'POST', body: JSON.stringify({ token_hash: done.token_hash }) }));
    const jwt = ((await res.json()) as { access_token: string }).access_token;
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ login: 'tg700', telegram: true });
    expect((await call('/auth/telegram/poll', { token: start.token })).body).toEqual({ state: 'expired' });
  });
  test('ulash va parolni tiklash', async () => {
    await call('/auth/register', { login: 'tikla_1', password: 'eskiparol1' });
    const jwt = (await signIn('tikla_1', 'eskiparol1'))!;
    expect((await call('/auth/telegram/link', {})).status).toBe(401);
    const link = (await call('/auth/telegram/link', {}, { authorization: `Bearer ${jwt}` })).body as { url: string };
    const token = link.url.split('link_')[1]!;
    await webhook(message(801, `/start link_${token}`));
    await webhook({ callback_query: { id: 'c', from: { id: 801, first_name: 'T' }, data: `ok:${token}` } });
    expect((await call('/auth/reset/start', { login: 'yoq' })).body).toEqual((await call('/auth/reset/start', { login: 'tikla_1' })).body);
    await webhook(message(801, '/parol'));
    const code = /kodi: (\d{6})/.exec(sent.at(-1)!.text)![1]!;
    const wrong = code === '000000' ? '111111' : '000000';
    expect((await call('/auth/reset/finish', { login: 'tikla_1', code: wrong, password: 'yangiparol1' })).body.error).toBe('bad_code');
    expect((await call('/auth/reset/finish', { login: 'yoq_user', code, password: 'yangiparol1' })).body.error).toBe('bad_code');
    expect((await call('/auth/reset/finish', { login: 'tikla_1', code, password: 'yangiparol1' })).status).toBe(200);
    expect(await signIn('tikla_1', 'yangiparol1')).toBeTruthy();
    expect(await signIn('tikla_1', 'eskiparol1')).toBeUndefined();
  });
  test('yordam adminga boradi, noma’lum buyruq — menyu, ulanmagan /parol', async () => {
    await webhook(message(900, '/yordam Uyim qani?'));
    expect(sent.some((m) => m.chat === 1 && m.text.includes('Uyim qani?'))).toBe(true);
    await webhook(message(900, 'salom'));
    expect(sent.at(-1)!.text).toContain('/parol');
    await webhook(message(900, '/parol'));
    expect(sent.at(-1)!.text).toContain('ulanmagan');
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
    return (await userRpc(jwt, 'my_order', { p_kind: 'decor', p_payload: { id: 'tree_anor' } })) as { id: string; amount: number };
  };
  beforeAll(async () => {
    await call('/auth/register', { login: 'xaridor', password: 'parol12345' });
    jwt = (await signIn('xaridor', 'parol12345'))!;
  });

  test('karta: sir, mos summa, takror', async () => {
    const o = await order('card');
    const text = `Kirim: ${o.amount} UZS 12:01`;
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'no' })).status).toBe(403);
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'bs' })).body).toMatchObject({ result: 'paid', order: o.id });
    expect((await call('/pay/card', { text }, { 'x-bank-secret': 'bs' })).body).toEqual({ result: 'duplicate' });
    expect((await call('/pay/card', { text: 'Chiqim 5000 UZS' }, { 'x-bank-secret': 'bs' })).body).toEqual({ result: 'ignored' });
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ decor: { tree_anor: 1 } });
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
    expect(await userRpc(jwt, 'my_profile')).toMatchObject({ decor: { tree_anor: 3 } });
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
    await db.query("insert into notifications (user_id, kind) select user_id, 'approved' from profiles where telegram_id = 700");
    await runCron(ctx(), '*/10 * * * *');
    expect(sent.some((m) => m.chat === 700 && m.text.includes('tasdiqlandi'))).toBe(true);
  });
  test('akkauntni o‘chirish', async () => {
    await call('/auth/register', { login: 'ochir_1', password: 'parol12345' });
    const jwt = (await signIn('ochir_1', 'parol12345'))!;
    expect((await call('/auth/delete', {}, { authorization: `Bearer ${jwt}` })).body).toEqual({ ok: true });
    expect(await signIn('ochir_1', 'parol12345')).toBeUndefined();
  });
});
