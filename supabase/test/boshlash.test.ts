/** 14-qadam (3): sinov davri ma'lumotlarini o'chirish — egasi qoladi (noldan), ro'yxatdagilar o'chadi, kutish ro'yxati qoladi. */
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
const count = async (t: string): Promise<number> => (await sql(`select count(*)::int n from ${t}`))[0]!.n as number;
const user = async (tg: number): Promise<string> => {
  const uid = randomUUID();
  await svc('svc_profile_create', { p_user: uid, p_login: `bosh${++n}`, p_ref: null, p_telegram: tg, p_instagram: `bosh_${n}` });
  return uid;
};
const freeHovli = async (): Promise<string> => (await sql("select id from plots p where district_id = 1 and type = 'hovli' and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;

beforeAll(async () => { db = await openDb(); });

describe('ishga tushirish: sinov ma‘lumotlari o‘chadi', () => {
  test('uylar, bezaklar, buyurtmalar, yuraklar, faollik — 0; egasi noldan; boshqa akkaunt o‘chadi; tumanlar boshlang‘ich', async () => {
    const owner = await user(777_001);
    await svc('svc_set_owner', { p_telegram: 777_001 });
    const other = await user(777_002);
    await as(owner, 'my_claim', { p_plot: await freeHovli() });
    await as(other, 'my_claim', { p_plot: await freeHovli() });
    await as(owner, 'my_admin_purchase', { p_kind: 'coins', p_payload: { pack: 1 } });
    await as(owner, 'my_buy_decor_coins', { p_id: 'lux_superkar' });
    await as(other, 'my_heart', { p_plot: (await sql('select plot_id from plot_state where owner = $1', [owner]))[0]!.plot_id });
    await as(other, 'my_ping', { p_district: 1 });
    await sql("insert into waitlist (instagram) values ('kutayotgan_odam') on conflict do nothing");
    await sql('update districts set is_open = true where id = 2');
    expect(await count('plot_state')).toBe(2);
    expect(await count("profiles where 'asoschi' = any (badges)")).toBe(2);

    // Egasi bo'lmagan akkaunt bilan — rad; egasini o'chirib bo'lmaydi.
    await expect(svc('svc_launch_reset', { p_keep: other, p_delete: [] })).rejects.toThrow('forbidden');
    await expect(svc('svc_launch_reset', { p_keep: owner, p_delete: [owner] })).rejects.toThrow('bad_format');
    await expect(as(owner, 'svc_launch_reset', { p_keep: owner, p_delete: [] })).rejects.toThrow();

    const r = await svc<Row>('svc_launch_reset', { p_keep: owner, p_delete: [other] });
    expect(r).toMatchObject({ plot_state: 2, profiles: 1, kept: 1 });
    expect(r.orders).toBeGreaterThanOrEqual(1);
    for (const t of ['plot_state', 'owned_decor', 'orders', 'payments', 'hearts', 'daily_active', 'coin_ledger', 'notifications', 'channel_posts']) expect(await count(t), t).toBe(0);
    expect(await sql('select coins, badges, free_used, role from profiles where user_id = $1', [owner])).toEqual([{ coins: 0, badges: [], free_used: false, role: 'admin' }]);
    expect(await count('profiles where user_id = $1'.replace('$1', `'${other}'`))).toBe(0);
    expect(await sql('select id from districts where is_open order by id')).toEqual([{ id: 1 }]);
    expect(await count("waitlist where instagram = 'kutayotgan_odam'")).toBe(1);
    // "Shahar asoschisi" hisoblagichi 0 dan; egasi bepul uyini oddiy yo'l bilan oladi.
    expect(await count("profiles where 'asoschi' = any (badges)")).toBe(0);
    await as(owner, 'my_claim', { p_plot: await freeHovli() });
    expect(await count("profiles where 'asoschi' = any (badges)")).toBe(1);
    expect((await as<Row>(owner, 'admin_stats')).revenue).toBe(0);
  });
});

describe('Supabase pg_safeupdate', () => {
  test('tozalash funksiyasida har bir DELETE va UPDATE da WHERE bor', async () => {
    const src = ((await sql("select prosrc from pg_proc where proname = 'svc_launch_reset'"))[0]!.prosrc as string).replace(/--.*$/gm, '');
    const statements = (src.match(/(delete from|update public\.)[^;]*/gi) ?? []).map((x) => x.replace(/\s+/g, ' '));
    expect(statements.length).toBeGreaterThan(5);
    for (const st of statements) expect(st, st).toMatch(/where/i);
  });
});
