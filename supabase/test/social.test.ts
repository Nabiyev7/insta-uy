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
