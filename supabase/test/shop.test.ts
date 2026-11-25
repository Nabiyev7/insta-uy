import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const anon = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'anon', null, fn, args) as Promise<T>;
const svc = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'service_role', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const user = async (role = 'user'): Promise<string> => {
  const id = randomUUID();
  await svc('svc_profile_create', { p_user: id, p_login: `xaridor${++n}`, p_ref: null, p_telegram: 900_000 + n });
  await sql('update profiles set role = $2, coins = 20000 where user_id = $1', [id, role]);
  return id;
};
const house = async (tier = 5): Promise<{ uid: string; plot: string; nick: string }> => {
  const uid = await user();
  const nick = `xarid_${n}`;
  const plot = (await sql("select id from plots p where district_id = 1 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
  await sql("insert into plot_state (plot_id, status, owner, instagram, tier) values ($1, 'owned', $2, $3, $4)", [plot, uid, nick, tier]);
  return { uid, plot, nick };
};
const qty = async (uid: string, id: string): Promise<number> => Number((await sql('select qty from owned_decor where user_id = $1 and decor_id = $2', [uid, id]))[0]?.qty ?? 0);

beforeAll(async () => { db = await openDb(); await db.query("update settings set value = 'true' where key = 'premium_house_enabled'"); });

describe('noyob raqamlangan bezaklar', () => {
  test('har nusxaga raqam beriladi va uy oynasida ko‘rinadi', async () => {
    const [a, b] = [await house(), await house()];
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'special_peacock' });
    await as(b.uid, 'my_buy_decor_coins', { p_id: 'special_peacock' });
    expect(await sql('select serial, owner from decor_serials where decor_id = $1 order by serial', ['special_peacock'])).toEqual([{ serial: 1, owner: a.uid }, { serial: 2, owner: b.uid }]);
    expect(await anon('api_plot', { p_plot: b.plot })).toMatchObject({ rare: [] });
    await as(b.uid, 'my_place_decor', { p_plot: b.plot, p_places: { old_hovli_ong: 'special_peacock' } });
    expect(await anon('api_plot', { p_plot: b.plot })).toMatchObject({ rare: [{ id: 'special_peacock', serial: 2, stock: 10 }] });
    expect(await as(b.uid, 'my_profile')).toMatchObject({ serials: { special_peacock: [2] } });
  });
  test('cheksiz bezakka raqam berilmaydi; akkaunt o‘chsa raqam ham o‘chadi', async () => {
    const a = await house();
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'daraxt_olma' });
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'special_peacock' });
    expect(await sql("select 1 from decor_serials where decor_id = 'daraxt_olma'")).toEqual([]);
    await svc('svc_delete_account', { p_user: a.uid });
    expect(await sql('select 1 from decor_serials where owner = $1', [a.uid])).toEqual([]);
  });
  test('o‘chgan raqam boshqaga qayta berilmaydi', async () => {
    const before = Number((await sql("select coalesce(max(serial), 0) m from decor_serials where decor_id = 'special_statue'"))[0]!.m);
    const a = await house(5);
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'special_statue' });
    expect(await sql('select serial from decor_serials where owner = $1 and decor_id = $2', [a.uid, 'special_statue'])).toEqual([{ serial: before + 1 }]);
    await svc('svc_delete_account', { p_user: a.uid });
    const b = await house(5);
    await as(b.uid, 'my_buy_decor_coins', { p_id: 'special_statue' });
    expect(await sql('select serial from decor_serials where owner = $1', [b.uid])).toEqual([{ serial: before + 2 }]);
  });
});

describe('to‘plamlar', () => {
  test('chegirmali narx, hammasi beriladi', async () => {
    const { uid } = await house(5);
    const set = (await anon<Row[]>('api_sets')).find((s) => s.id === 'dam_olish')!;
    expect([...(set.items as string[])].sort()).toEqual(['dam_besedka', 'dam_mangal', 'gul_zor', 'yard_hammock']);
    const full = 600 + 150 + 240 + 400;
    expect(set.coins).toBe(Math.ceil(full * 0.8));
    expect(await as(uid, 'my_buy_set_coins', { p_set: 'dam_olish' })).toBe(20_000 - Math.ceil(full * 0.8));
    for (const id of set.items as string[]) expect(await qty(uid, id)).toBe(1);
  });
  test('level yetmasa, tanga yetmasa, yopiq bo‘lsa — hech narsa berilmaydi', async () => {
    const low = await house(2);
    await expect(as(low.uid, 'my_buy_set_coins', { p_set: 'dam_olish' })).rejects.toThrow('level_low');
    const poor = await house(5);
    await sql('update profiles set coins = 10 where user_id = $1', [poor.uid]);
    await expect(as(poor.uid, 'my_buy_set_coins', { p_set: 'dam_olish' })).rejects.toThrow('not_enough_coins');
    expect(await qty(poor.uid, 'dam_mangal')).toBe(0);
    await expect(as(poor.uid, 'my_buy_set_coins', { p_set: 'yoq' })).rejects.toThrow('not_found');
    const admin = await user('admin');
    await as(admin, 'admin_set_save', { p_id: 'dam_olish', p_uz: 'Dam', p_ru: 'Отдых', p_discount: 20, p_active: false });
    await expect(as(poor.uid, 'my_buy_set_coins', { p_set: 'dam_olish' })).rejects.toThrow('not_found');
    await expect(as(poor.uid, 'admin_set_save', { p_id: 'x_set', p_uz: 'A', p_ru: 'A', p_discount: 1, p_active: true })).rejects.toThrow('forbidden');
    await expect(as(admin, 'admin_set_save', { p_id: 'x_set', p_uz: 'A', p_ru: 'A', p_discount: 99, p_active: true })).rejects.toThrow();
    expect(await as<Row[]>(admin, 'admin_sets')).toHaveLength(2);
  });
});

describe('sovg‘a', () => {
  test('nik bo‘yicha, raqami bilan birga, xabar bilan', async () => {
    const [a, b] = [await house(), await house()];
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'special_peacock' });
    const serial = (await sql('select serial from decor_serials where owner = $1', [a.uid]))[0]!.serial;
    expect(await as(a.uid, 'my_gift_decor', { p_id: 'special_peacock', p_to: `@${b.nick.toUpperCase()}`, p_message: 'Tabriklayman' })).toBe(b.nick);
    expect([await qty(a.uid, 'special_peacock'), await qty(b.uid, 'special_peacock')]).toEqual([0, 1]);
    expect(await sql('select serial from decor_serials where owner = $1', [b.uid])).toEqual([{ serial }]);
    expect((await as<{ notes: Row[] }>(b.uid, 'my_profile')).notes[0]).toMatchObject({ kind: 'decor_gift', data: { decor: 'special_peacock', message: 'Tabriklayman', serial } });
  });
  test('hovlidagini, yo‘g‘ini, o‘ziga, yo‘q odamga, yomon so‘z bilan bo‘lmaydi', async () => {
    const [a, b] = [await house(), await house()];
    const gift = (p: Row): Promise<unknown> => as(a.uid, 'my_gift_decor', { p_id: 'tree_tut', p_to: b.nick, ...p });
    await expect(gift({})).rejects.toThrow('not_owned');
    await as(a.uid, 'my_buy_decor_coins', { p_id: 'tree_tut' });
    await as(a.uid, 'my_place_decor', { p_plot: a.plot, p_places: { burchak_1: 'tree_tut' } });
    await expect(gift({})).rejects.toThrow('decor_in_use');
    await as(a.uid, 'my_place_decor', { p_plot: a.plot, p_places: {} });
    await expect(gift({ p_to: a.nick })).rejects.toThrow('user_not_found');
    await expect(gift({ p_to: 'yoq_odam' })).rejects.toThrow('user_not_found');
    await expect(gift({ p_message: 'suka' })).rejects.toThrow('banned_word');
    expect(await qty(a.uid, 'tree_tut')).toBe(1);
    await gift({});
    expect(await qty(b.uid, 'tree_tut')).toBe(1);
  });
});

describe('yangilik xabari', () => {
  test('faqat Telegrami bor va o‘chirmaganlarga', async () => {
    const admin = await user('admin');
    const [yes, no, none] = [await user(), await user(), await user()];
    await sql('update profiles set telegram_id = null where user_id <> all($1::uuid[])', [[yes, no]]);
    await as(no, 'my_news', { p_on: false });
    expect(await as(admin, 'admin_decor_announce', { p_id: 'yard_tandir' })).toBe(1);
    const got = (await sql("select user_id from notifications where kind = 'new_decor'")).map((r) => r.user_id);
    expect(got).toEqual([yes]);
    expect(got).not.toContain(none);
    await expect(as(yes, 'admin_decor_announce', { p_id: 'yard_tandir' })).rejects.toThrow('forbidden');
    await expect(as(admin, 'admin_decor_announce', { p_id: 'yoq' })).rejects.toThrow('not_found');
  });
});

describe('haftaning hovlisi', () => {
  test('dushanba: o‘tgan hafta eng ko‘p yurak olgan uylar bot so‘rovnomasiga; o‘ziga ovoz yo‘q; 48 soatdan keyin g‘olib — bir marta', async () => {
    for (const t of ['yard_polls', 'yard_winners', 'broadcast_queue']) await sql(`delete from ${t}`);
    const [a, b, c] = [await house(), await house(), await house()];
    const fans = [await user(), await user(), await user()];
    const lastWeek = "(private.this_week() - 5)::timestamp at time zone 'Asia/Tashkent'";
    for (const [k, plot] of [[3, a.plot], [2, b.plot], [1, c.plot]] as const) for (const f of fans.slice(0, k)) await sql(`insert into hearts (plot_id, user_id, at) values ($1, $2, ${lastWeek})`, [plot, f]);
    await svc('svc_tick');
    const poll = (await sql('select poll_id, plots, status from yard_polls'))[0]!;
    expect(poll).toMatchObject({ plots: [a.plot, b.plot, c.plot], status: 'open' });
    expect((await sql('select count(*)::int n from broadcast_queue q join broadcasts br on br.id = q.broadcast_id where br.poll_id = $1', [poll.poll_id]))[0]!.n).toBeGreaterThan(0);
    const tgOf = async (uid: string): Promise<number> => Number((await sql('select telegram_id from profiles where user_id = $1', [uid]))[0]!.telegram_id);
    expect(await svc('svc_poll_vote', { p_telegram: await tgOf(a.uid), p_poll: poll.poll_id, p_option: 1 })).toBe('own');
    for (const f of fans) await svc('svc_poll_vote', { p_telegram: await tgOf(f), p_poll: poll.poll_id, p_option: 2 });
    await sql("update yard_polls set ends_at = now() - interval '1 minute'");
    const coins = async (): Promise<number> => (await sql('select coins from profiles where user_id = $1', [b.uid]))[0]!.coins as number;
    const before = await coins();
    await svc('svc_tick');
    await svc('svc_tick');
    expect(await sql('select plot_id, votes from yard_winners')).toEqual([{ plot_id: b.plot, votes: 3 }]);
    expect(await coins()).toBe(before + 2000);
    expect((await as<{ badges: string[] }>(b.uid, 'my_profile')).badges).toContain('hovli');
    expect(await sql("select count(*)::int c from notifications where kind = 'yard_winner'")).toEqual([{ c: 1 }]);
    expect(await sql("select count(*)::int c from broadcast_queue where chat = 0")).toEqual([{ c: 1 }]);
    expect((await anon<{ winners: Row[] }>('api_yards')).winners[0]).toMatchObject({ plot: b.plot, votes: 3 });
  });
  test('admin nomzodlarni qo‘lda almashtirib, so‘rovnomani boshlaydi', async () => {
    const admin = await user();
    await sql("update profiles set role = 'admin' where user_id = $1", [admin]);
    const [a, b] = [await house(), await house()];
    await expect(as(admin, 'admin_yard_start', { p_plots: [a.plot] })).rejects.toThrow('bad_format');
    await as(admin, 'admin_yard_start', { p_plots: [a.plot, b.plot] });
    expect((await sql("select plots, status from yard_polls order by week desc limit 1"))[0]).toEqual({ plots: [a.plot, b.plot], status: 'open' });
  });
  test('jadvallar yopiq, ichki funksiya chaqirilmaydi', async () => {
    const u = await user();
    for (const t of ['decor_serials', 'decor_sets', 'decor_anchors', 'yard_votes', 'yard_winners']) {
      await expect(db.transaction(async (tx) => { await tx.exec('set local role authenticated'); await tx.query(`select * from public.${t}`); }), t).rejects.toThrow(/permission denied/);
    }
    await expect(as(u, 'svc_tick')).rejects.toThrow(/permission denied/);
  });
});
