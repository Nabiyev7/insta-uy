import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const user = async (ref: string | null = null): Promise<string> => {
  const uid = randomUUID();
  await svc('svc_profile_create', { p_user: uid, p_login: `ijtimoiy${++n}`, p_ref: ref, p_telegram: 980_000 + n, p_instagram: `ijtimoiy_${n}` });
  return uid;
};
const claim = async (uid: string): Promise<string> => {
  const plot = (await sql("select id from plots p where type = 'hovli' and district_id in (select id from districts where is_open) and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
  await as(uid, 'my_claim', { p_plot: plot });
  return plot;
};

beforeAll(async () => { db = await openDb(); });

describe('yurak', () => {
  test('har uyga bir marta, o‘ziga emas; "Eng mashhur" reytingi; uy bo‘shasa — nol', async () => {
    const owner = await user();
    const plot = await claim(owner);
    const [a, b] = [await user(), await user()];
    await expect(as(owner, 'my_heart', { p_plot: plot })).rejects.toThrow('self_heart');
    expect(await as(a, 'my_heart', { p_plot: plot })).toBe(1);
    await expect(as(a, 'my_heart', { p_plot: plot })).rejects.toThrow('already_claimed');
    expect(await as(b, 'my_heart', { p_plot: plot })).toBe(2);
    expect(await as(a, 'api_plot', { p_plot: plot })).toMatchObject({ hearts: 2, hearted: true });
    expect(((await svc<{ popular: Row[] }>('api_rankings')).popular)[0]).toMatchObject({ plot, hearts: 2 });
    await sql("select private.release_plot($1, 'admin')", [plot]);
    expect(await sql('select count(*)::int n from hearts where plot_id = $1', [plot])).toEqual([{ n: 0 }]);
  });
});

describe('referal sovg‘alari', () => {
  test('1-do‘st — gulzor, 3-do‘st — besedka (pulli nusxa, har qanday levelda qo‘yiladi)', async () => {
    const host = await user();
    const ref = (await sql('select ref_code from profiles where user_id = $1', [host]))[0]!.ref_code as string;
    for (let i = 0; i < 3; i++) await claim(await user(ref));
    expect(await sql("select decor_id, qty, paid from owned_decor where user_id = $1 order by decor_id", [host])).toEqual([
      { decor_id: 'dam_besedka', qty: 1, paid: 1 }, { decor_id: 'gul_zor', qty: 1, paid: 1 },
    ]);
    expect((await sql('select coins from profiles where user_id = $1', [host]))[0]!.coins).toBe(1500);
  });
});

describe('Elchi nishoni', () => {
  test('10-do‘st uy olganda — "elchi10"', async () => {
    const host = await user();
    const ref = (await sql('select ref_code from profiles where user_id = $1', [host]))[0]!.ref_code as string;
    for (let i = 0; i < 9; i++) await sql('update profiles set referred_by = $1, referral_paid = true where user_id = $2', [host, await user()]);
    await claim(await user(ref));
    expect((await sql('select badges from profiles where user_id = $1', [host]))[0]!.badges).toContain('elchi10');
  });
});

describe('xabar yuborish va so‘rovnoma (baza)', () => {
  const queued = async (): Promise<number[]> => (await sql('select chat from broadcast_queue order by id')).map((r) => Number(r.chat));
  test('faqat admin; bildirishnomani o‘chirganlarga umumiy xabar bormaydi; tuman va kutish ro‘yxati', async () => {
    const admin = await user();
    const plain = await user();
    await expect(as(plain, 'admin_broadcast', { p_text: 'Salom', p_target: 'all' })).rejects.toThrow();
    await sql("update profiles set role = 'admin' where user_id = $1", [admin]);
    await sql('update profiles set wants_news = false where user_id = $1', [plain]);
    await sql('delete from broadcast_queue');
    await as(admin, 'admin_broadcast', { p_text: 'Salom', p_target: 'all' });
    const tgOf = async (u: string): Promise<number> => Number((await sql('select telegram_id from profiles where user_id = $1', [u]))[0]!.telegram_id);
    expect(await queued()).toContain(await tgOf(admin));
    expect(await queued()).not.toContain(await tgOf(plain));
    await sql('delete from broadcast_queue');
    const owner = await user();
    const plot = await claim(owner);
    const district = (await sql('select district_id from plots where id = $1', [plot]))[0]!.district_id as number;
    await as(admin, 'admin_broadcast', { p_text: 'Mahalla', p_target: 'district', p_district: district });
    expect(await queued()).toContain(await tgOf(owner));
    expect(await queued()).not.toContain(await tgOf(admin)); // uyi yo'q — tuman xabari bormaydi
    await sql('delete from broadcast_queue');
    await sql('insert into tg_waitlist (telegram_id) values (77777) on conflict do nothing');
    await as(admin, 'admin_broadcast', { p_text: 'Ochildi!', p_target: 'waitlist' });
    expect(await queued()).toContain(77777);
    await expect(as(admin, 'admin_poll', { p_question: 'Savol', p_options: ['Bitta'] })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_poll', { p_question: 'Savol', p_options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_poll', { p_question: 'Savol', p_options: ['a', 'b'], p_target: 'hech' })).rejects.toThrow('bad_format');
    const poll = await as<number>(admin, 'admin_poll', { p_question: 'Savol', p_options: ['a', 'b'] });
    await as(admin, 'admin_poll_close', { p_id: poll });
    expect(await svc('svc_poll_vote', { p_telegram: 77777, p_poll: poll, p_option: 1 })).toBe('closed');
  });
});

