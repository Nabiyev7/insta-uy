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
  TELEGRAM_BOT: 'shahar_bot', ADMIN_URL: 'https://admin.test', TELEGRAM_WEBHOOK_SECRET: 'wh', ADMIN_TELEGRAM_ID: '1', BANK_BOT: 'bankbot', BANK_SECRET: 'bs', PAYME_KEY: 'pk', CLICK_SECRET: 'cs', CLICK_SERVICE_ID: '77',
  META_TOKEN: 'mt', META_MEDIA_IDS: '123, bad', DEV: '1',
};
let db: PGlite;
let emu: (req: Request) => Promise<Response>;
const sent: { chat: number; text: string; buttons?: readonly TgButton[] }[] = [];
const errors: unknown[] = [];
const members = new Set<number>();
const tg: Telegram = {
  send: async (chat, text, buttons) => { sent.push({ chat, text, ...(buttons ? { buttons } : {}) }); },
  answer: async (_id, text) => { sent.push({ chat: 0, text }); },
  video: async (chat, url) => { sent.push({ chat, text: url }); },
  isMember: async (_channel, user) => members.has(user),
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
const botUser = async (id: number, nick: string): Promise<string> => {
  await webhook(message(id, '/start login'));
  await webhook(message(id, nick));
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

describe('kirish faqat Telegram bot orqali', () => {
  test('eski yo‘llar yopiq: ro‘yxat, parolni tiklash, so‘rov-kutish', async () => {
    for (const p of ['/auth/register', '/auth/reset/start', '/auth/reset/finish', '/auth/telegram/start', '/auth/telegram/poll']) expect((await call(p, {})).status).toBe(404);
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
    await webhook(message(700, '@Ali.Karimov'));
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
  test('/admin: faqat admin va moderatorga admin panel havolasi', async () => {
    await webhook(message(700, '/admin'));
    expect(sent.at(-1)!.text).toContain('faqat adminlar');
    await db.query("update profiles set role = 'moderator' where telegram_id = 700");
    await webhook(message(700, '/admin'));
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
