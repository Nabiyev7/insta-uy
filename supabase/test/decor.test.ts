import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { ANCHORS, DECOR, DEFAULT_DECOR_SLOTS, MAX_TIER, TIER_COINS } from '../../packages/shared/src/index.ts';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let n = 0;
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const anon = <T = unknown>(fn: string, args: Row = {}): Promise<T> => rpc(db, 'anon', null, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const user = async (role = 'user'): Promise<string> => {
  const id = randomUUID();
  await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: id, p_login: `bezakchi${++n}`, p_ref: null });
  await sql('update profiles set role = $2, coins = 50000 where user_id = $1', [id, role]);
  return id;
};
const house = async (tier = 1): Promise<{ uid: string; plot: string }> => {
  const uid = await user();
  const plot = (await sql("select id from plots p where district_id = 1 and not exists (select 1 from plot_state s where s.plot_id = p.id) order by id limit 1"))[0]!.id as string;
  await sql("insert into plot_state (plot_id, status, owner, instagram, tier) values ($1, 'owned', $2, $3, $4)", [plot, uid, `bezak_${n}`, tier]);
  return { uid, plot };
};
const give = (uid: string, id: string, qty = 1): Promise<Row[]> => sql('insert into owned_decor (user_id, decor_id, qty) values ($1, $2, $3) on conflict (user_id, decor_id) do update set qty = $3', [uid, id, qty]);
const placesOf = async (plot: string): Promise<Row> => (await sql('select places, decor from plot_state where plot_id = $1', [plot]))[0]!;

beforeAll(async () => { db = await openDb(); });

describe('katalog bazada', () => {
  test('boshlang‘ich bezaklar va nuqtalar koddagi bilan bir xil', async () => {
    const rows = await sql('select id, slot, model_id, name_uz, name_ru, price_uzs, price_coins, stock, spots, min_level, is_active from decor_catalog order by sort, id');
    const seeded = DECOR.map((d) => ({ id: d.id, slot: d.slot, model_id: d.model, name_uz: d.uz, name_ru: d.ru, price_uzs: d.priceUzs, price_coins: d.priceCoins, stock: d.stock, spots: [...d.spots], min_level: d.minLevel, is_active: d.isActive }));
    for (const d of seeded) expect(rows.find((r) => r.id === d.id)).toEqual(d);
    expect(await sql('select id, kind, min_level from decor_anchors order by sort')).toEqual(ANCHORS.map((a) => ({ id: a.id, kind: a.kind, min_level: a.minLevel })));
  });
  test('eski 25 bezak ID lari saqlangan', async () => {
    const old = ['fence_wood', 'fence_brick', 'fence_ornate', 'gate_wood', 'gate_carved', 'gate_gold', 'path_stone', 'tree_anor', 'tree_chinor', 'tree_archa', 'yard_sori', 'yard_tok', 'yard_flowers', 'water_pool', 'water_fountain', 'car_van', 'car_sedan', 'car_sport', 'light_lamps', 'light_luxe', 'pet_dog', 'pet_cat', 'special_peacock', 'special_statue', 'special_yurt'];
    expect(await sql('select id from decor_catalog where id = any($1)', [old])).toHaveLength(25);
  });
  test('api_catalog ochiq, to‘liq', async () => {
    const list = await anon<Row[]>('api_catalog');
    expect(list.find((c) => c.id === 'water_pool')).toMatchObject({ onSale: false, active: false });
    expect(list.find((c) => c.id === 'gate_gold')).toMatchObject({ model: 'gate_gold', min: 5, onSale: true, active: true, spots: ['gate'], uz: 'Oltin darvoza', ru: 'Золотые ворота' });
  });
});

describe('level 1–5', () => {
  test('eng yuqori level va kuchaytirish narxi kod bilan bir xil', async () => {
    expect((await sql('select private.max_tier() v'))[0]!.v).toBe(MAX_TIER);
    const coins = (await sql("select value from settings where key = 'coins'"))[0]!.value as { tier: Record<string, number>; maxTier: number };
    expect(coins.maxTier).toBe(MAX_TIER);
    expect(Object.fromEntries(Object.entries(coins.tier).map(([k, v]) => [Number(k), v]))).toEqual(TIER_COINS);
  });
});

describe('lyuks bezaklar', () => {
  test('1–4-level uyga tanga bilan sotilmaydi va qo‘yilmaydi, 5-levelda — mumkin; tanga kamayadi', async () => {
    for (const tier of [1, 4]) {
      const { uid, plot } = await house(tier);
      await expect(as(uid, 'my_buy_decor_coins', { p_id: 'lux_superkar' })).rejects.toThrow('level_low');
      await give(uid, 'lux_superkar');
      await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'lux_superkar' } })).rejects.toThrow('level_low');
    }
    const { uid, plot } = await house(5);
    expect(await as(uid, 'my_buy_decor_coins', { p_id: 'lux_superkar' })).toBe(35_000);
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'lux_superkar' } });
    expect((await placesOf(plot)).places).toEqual({ garaj_oldi: 'lux_superkar' });
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { old_hovli_chap: 'lux_superkar' } })).rejects.toThrow('wrong_spot');
  });
});

describe('joylash', () => {
  test('eski ma’lumot ko‘chadi: bezak yo‘qolmaydi', async () => {
    const { plot } = await house(5);
    await sql("update plot_state set decor = array['fence_wood','tree_anor','yard_sori','pet_dog','gate_wood'] where plot_id = $1", [plot]);
    const row = await placesOf(plot);
    expect(Object.values(row.places as Row).sort()).toEqual(['fence_wood', 'gate_wood', 'pet_dog', 'tree_anor', 'yard_sori']);
    expect([...(row.decor as string[])].sort()).toEqual(['fence_wood', 'gate_wood', 'pet_dog', 'tree_anor', 'yard_sori']);
    await sql("update plot_state set decor = '{}' where plot_id = $1", [plot]);
    expect(await placesOf(plot)).toEqual({ places: {}, decor: [] });
  });
  test('joyi kam bezaklar oldin joylashadi (sig‘magani qo‘lda qoladi)', async () => {
    const { plot } = await house(5);
    await sql("update plot_state set decor = array['tree_chinor','yard_sori','yard_tok','yard_flowers','water_pool'] where plot_id = $1", [plot]);
    // Old hovlida bitta chap va bitta o'ng nuqta bor: tanlovi kam tok chapni oladi, qolgani egasining qo'lida.
    const kept = (await placesOf(plot)).decor as string[];
    expect(kept).toHaveLength(2);
    expect(kept).toContain('yard_tok');
  });
  test('yopiq nuqtadagi eski bezakni ko‘chirish va olish mumkin', async () => {
    const { uid, plot } = await house(1);
    await give(uid, 'gate_gold');
    await give(uid, 'yard_sori');
    await sql('update plot_state set places = $2 where plot_id = $1', [plot, JSON.stringify({ old_hovli_chap: 'yard_sori', gate: 'gate_gold' })]);
    // 5-leveldan past uyda ko'chirib bo'lmaydi, faqat olib qo'yiladi.
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { old_hovli_ong: 'yard_sori', gate: 'gate_gold' } })).rejects.toThrow('level_low');
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { gate: 'gate_gold' } });
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: {} });
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { gate: 'gate_gold' } })).rejects.toThrow('level_low');
  });
  test('qo‘yish, ko‘chirish, olish', async () => {
    const { uid, plot } = await house(5);
    await give(uid, 'tree_anor', 2);
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { burchak_1: 'tree_anor', burchak_2: 'tree_anor' } });
    expect((await placesOf(plot)).decor).toEqual(['tree_anor', 'tree_anor']);
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { burchak_3: 'tree_anor' } });
    expect((await placesOf(plot)).places).toEqual({ burchak_3: 'tree_anor' });
    expect((await as<{ plots: Row[] }>(uid, 'my_profile')).plots[0]).toMatchObject({ places: { burchak_3: 'tree_anor' } });
    const city = await anon<unknown[][]>('api_city', { p_districts: [1] });
    expect(city.find((r) => r[0] === plot)?.[5]).toEqual(['burchak_3:tree_anor']);
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: {} });
    expect((await placesOf(plot)).decor).toEqual([]);
  });
  test('server qoidalari: egalik, nuqta turi, level, soni, format', async () => {
    const { uid, plot } = await house(5);
    const other = await user();
    const put = (places: unknown, who = uid): Promise<unknown> => as(who, 'my_place_decor', { p_plot: plot, p_places: places });
    await expect(put({ burchak_1: 'tree_anor' })).rejects.toThrow('not_owned');
    await give(uid, 'tree_anor');
    await expect(put({ burchak_1: 'tree_anor' }, other)).rejects.toThrow('not_owner');
    await expect(put({ burchak_1: 'tree_anor', burchak_2: 'tree_anor' })).rejects.toThrow('not_owned');
    await expect(put({ gate: 'tree_anor' })).rejects.toThrow('wrong_spot');
    for (const bad of [{ yoq: 'tree_anor' }, { burchak_1: 'yoq' }, { burchak_1: 5 }, ['burchak_1'], 'x', null]) await expect(put(bad)).rejects.toThrow('bad_format');
    const low = await house(4);
    await give(low.uid, 'gate_gold');
    await expect(as(low.uid, 'my_place_decor', { p_plot: low.plot, p_places: { gate: 'gate_gold' } })).rejects.toThrow('level_low');
    const full = { fence: 'fence_wood', gate: 'gate_wood', path: 'path_stone', lamps: 'light_lamps', old_hovli_chap: 'dam_basseyn', old_hovli_ong: 'dam_stol', garaj_oldi: 'avto_sport', darvoza_yoni: 'gul_kamar' };
    for (const id of [...Object.values(full), 'daraxt_gilos', 'sign_nick']) await give(uid, id);
    await sql("update settings set value = '[0,0,0,0,8]' where key = 'decor_slots'");
    await expect(put({ ...full, burchak_1: 'daraxt_gilos' })).rejects.toThrow('no_slots');
    await put(full);
    // Nik lavhasi joy hisobiga kirmaydi.
    await put({ ...full, sign: 'sign_nick' });
    const kv = (await sql("select id from plots where type = 'kvartira' limit 1"))[0]!.id as string;
    await sql("insert into plot_state (plot_id, status, owner) values ($1, 'owned', $2)", [kv, uid]);
    await expect(as(uid, 'my_place_decor', { p_plot: kv, p_places: {} })).rejects.toThrow('no_yard');
    await sql("update settings set value = $1::jsonb where key = 'decor_slots'", [JSON.stringify(DEFAULT_DECOR_SLOTS)]);
  });
  test('level bo‘yicha joy soni: 0,0,0,0,16; admin 20 dan oshira olmaydi', async () => {
    const at = async (tier: number): Promise<number> => (await sql('select private.decor_slots($1) v', [tier]))[0]!.v as number;
    // Bitta manba: baza sozlamasi va koddagi ro'yxat bir xil.
    expect((await sql("select value from settings where key = 'decor_slots'"))[0]!.value).toEqual([...DEFAULT_DECOR_SLOTS]);
    for (const [i, v] of DEFAULT_DECOR_SLOTS.entries()) expect(await at(i + 1)).toBe(v);
    await sql("update settings set value = '[0,0,0,0,99]' where key = 'decor_slots'");
    expect(await at(5)).toBe(20);
    expect(await at(10)).toBe(20);
    await sql(`update settings set value = '["a", 1]' where key = 'decor_slots'`);
    expect([await at(1), await at(2), await at(5)]).toEqual([0, 1, 0]);
    await sql("update settings set value = $1::jsonb where key = 'decor_slots'", [JSON.stringify(DEFAULT_DECOR_SLOTS)]);
  });
  test('bitta bezak ikki uyda bo‘lolmaydi', async () => {
    const { uid, plot } = await house(5);
    const second = (await sql("select id from plots p where district_id = 2 and not exists (select 1 from plot_state s where s.plot_id = p.id) limit 1"))[0]!.id as string;
    await sql("insert into plot_state (plot_id, status, owner, tier) values ($1, 'owned', $2, 5)", [second, uid]);
    await give(uid, 'pet_cat');
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { p1: 'pet_cat' } });
    await expect(as(uid, 'my_place_decor', { p_plot: second, p_places: { p1: 'pet_cat' } })).rejects.toThrow('not_owned');
  });
  test('ko‘p bezakli eski uy kamaytira oladi, ko‘paytira olmaydi', async () => {
    const { uid, plot } = await house(5);
    await sql("update settings set value = '[1,1,1,1,3]' where key = 'decor_slots'");
    for (const id of ['fence_wood', 'gate_wood', 'path_stone', 'tree_anor', 'yard_sori']) await give(uid, id);
    await sql("update plot_state set decor = array['fence_wood','gate_wood','path_stone','tree_anor'] where plot_id = $1", [plot]);
    const { places } = await placesOf(plot);
    await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { ...(places as Row), old_hovli_ong: 'yard_sori' } })).rejects.toThrow('no_slots');
    const { path: _path, ...fewer } = places as Record<string, string>;
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: fewer });
    await sql("update settings set value = $1::jsonb where key = 'decor_slots'", [JSON.stringify(DEFAULT_DECOR_SLOTS)]);
  });
});

describe('ekran uchun ma’lumot', () => {
  test('asoschilar soni va kunlik bonus kuni', async () => {
    const before = (await anon<{ founders: { taken: number; limit: number } }>('api_boot')).founders;
    expect(before.limit).toBe(100);
    const uid = await user();
    await sql("update profiles set badges = array['asoschi'] where user_id = $1", [uid]);
    expect((await anon<{ founders: { taken: number } }>('api_boot')).founders.taken).toBe(before.taken + 1);
    const next = async (): Promise<number> => (await as<{ daily_next: number }>(uid, 'my_profile')).daily_next;
    expect(await next()).toBe(1);
    await sql('update profiles set last_daily = current_date - 1, streak = 3 where user_id = $1', [uid]);
    expect(await next()).toBe(4);
    await sql('update profiles set streak = 7 where user_id = $1', [uid]);
    expect(await next()).toBe(7);
    await sql('update profiles set last_daily = current_date - 3 where user_id = $1', [uid]);
    expect(await next()).toBe(1);
  });
});

describe('bezaklar faqat 5-leveldan', () => {
  test('1–4-levelda nik lavhasidan boshqasi qo‘yilmaydi va sotilmaydi; kvartira berilmaydi', async () => {
    for (const tier of [1, 4]) {
      const { uid, plot } = await house(tier);
      await give(uid, 'daraxt_olma');
      await give(uid, 'sign_nick');
      await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: { burchak_1: 'daraxt_olma' } })).rejects.toThrow('level_low');
      await expect(as(uid, 'my_buy_decor_coins', { p_id: 'dam_basseyn' })).rejects.toThrow('level_low');
      await as(uid, 'my_place_decor', { p_plot: plot, p_places: { sign: 'sign_nick' } });
    }
    const free = (await sql("select p.id from plots p join districts d on d.id = p.district_id where p.type = 'kvartira' limit 1"))[0]!.id as string;
    await expect(as(await user(), 'my_claim', { p_plot: free, p_instagram: 'kvartirachi' })).rejects.toThrow('apartments_closed');
    await expect(as(await user(), 'my_quote', { p_kind: 'plot', p_payload: { plot: free, instagram: 'kvartirachi' } })).rejects.toThrow('apartments_closed');
  });
  test('sotuvdan olingan eski bezak sotilmaydi, egasida qoladi va qo‘yiladi', async () => {
    const { uid, plot } = await house(5);
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'water_pool' })).rejects.toThrow('not_found');
    await give(uid, 'water_pool');
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { old_hovli_chap: 'water_pool' } });
  });
  test('yangi bezak faqat o‘z nuqtasiga qo‘yiladi', async () => {
    const { uid, plot } = await house(5);
    for (const id of ['avto_sedan', 'dam_basseyn', 'gul_kamar']) await give(uid, id);
    for (const places of [{ old_hovli_chap: 'avto_sedan' }, { burchak_1: 'dam_basseyn' }, { garaj_oldi: 'gul_kamar' }]) await expect(as(uid, 'my_place_decor', { p_plot: plot, p_places: places })).rejects.toThrow('wrong_spot');
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { garaj_oldi: 'avto_sedan', old_hovli_chap: 'dam_basseyn', darvoza_yoni: 'gul_kamar' } });
  });
});

describe('sotuv va tashqi ko‘rinish', () => {
  test('level yetmasa sotilmaydi (tanga va buyurtma)', async () => {
    const { uid } = await house(4);
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'gate_gold' })).rejects.toThrow('level_low');
    await expect(sql("select private.quote(p, 'decor', '{\"id\":\"gate_gold\"}') from profiles p where user_id = $1", [uid])).rejects.toThrow('level_low');
    await sql('update plot_state set tier = 5 where owner = $1', [uid]);
    expect(await as(uid, 'my_buy_decor_coins', { p_id: 'gate_gold' })).toBe(48_500);
    await expect(as(await user(), 'my_buy_decor_coins', { p_id: 'avto_sedan' })).rejects.toThrow('level_low');
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'yoq' })).rejects.toThrow('not_found');
  });
  test('mavsumdan tashqarida sotilmaydi, olingani qoladi; yil oxiridan o‘tadi', async () => {
    const season = async (a: string, b: string, now: string): Promise<boolean> => (await sql('select private.in_season($1::date, $2::date, $3::date) v', [a, b, now]))[0]!.v as boolean;
    expect(await season('2026-12-20', '2027-01-10', '2030-12-31')).toBe(true);
    expect(await season('2026-12-20', '2027-01-10', '2030-01-05')).toBe(true);
    expect(await season('2026-12-20', '2027-01-10', '2030-02-05')).toBe(false);
    expect(await season('2026-03-10', '2026-03-31', '2030-03-21')).toBe(true);
    const { uid, plot } = await house(5);
    await sql("update decor_catalog set season_from = current_date + 30, season_to = current_date + 40 where id = 'special_yurt'");
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'special_yurt' })).rejects.toThrow('out_of_season');
    await give(uid, 'special_yurt');
    await as(uid, 'my_place_decor', { p_plot: plot, p_places: { old_hovli_chap: 'special_yurt' } });
    expect((await anon<Row[]>('api_catalog')).find((c) => c.id === 'special_yurt')).toMatchObject({ onSale: false, active: true });
    await sql("update decor_catalog set season_from = null, season_to = null where id = 'special_yurt'");
  });
  test('uy va avatar ranglari tanlanmaydi', async () => {
    const { uid, plot } = await house(1);
    expect(await sql("select 1 from pg_proc where proname = 'my_edit_house'")).toEqual([]);
    const row = (await anon<unknown[][]>('api_city', { p_districts: [1] })).find((r) => r[0] === plot)!;
    expect([row[3], row[4], ...row.slice(10)]).toEqual([0, 0, 0, 0, 0]);
    await as(uid, 'my_avatar', { p_avatar: { hat: 'doppi', outfit: 'chopon', skin: '#000000', top: '#ff0000' } });
    const look = (await sql('select avatar from profiles where user_id = $1', [uid]))[0]!.avatar as Row;
    expect(look).toMatchObject({ hat: 'doppi', outfit: 'chopon' });
    expect(look.skin).not.toBe('#000000');
    await as(uid, 'my_avatar', { p_avatar: { hat: 'kepka' } });
    expect((await sql('select avatar from profiles where user_id = $1', [uid]))[0]!.avatar).toEqual({ ...look, hat: 'kepka', outfit: 'oddiy' });
  });
});

describe('admin', () => {
  test('mavjud modeldan yangi tovar, tahrirlash, yashirish', async () => {
    const a = await user('admin');
    await as(a, 'admin_decor_save', { p: { id: 'tree_anor_oltin', model_id: 'tree_anor', name_uz: 'Oltin anor', name_ru: 'Золотой гранат', price_coins: 999, stock: 5, min_level: 9, tint: '#FFCC00', is_new: true, season_from: '2026-12-20', season_to: '2026-01-10' } });
    expect((await sql("select slot, spots, price_coins, stock, min_level, tint, is_new from decor_catalog where id = 'tree_anor_oltin'"))[0]).toMatchObject({ slot: 'tree', price_coins: 999, stock: 5, min_level: 5, tint: '#ffcc00', is_new: true });
    await as(a, 'admin_decor_save', { p: { id: 'tree_anor_oltin', is_active: false, stock: null, season_from: '', season_to: '' } });
    expect((await sql("select stock, is_active, season_from, name_uz, price_coins from decor_catalog where id = 'tree_anor_oltin'"))[0]).toEqual({ stock: null, is_active: false, season_from: null, name_uz: 'Oltin anor', price_coins: 999 });
    const { uid } = await house(5);
    await expect(as(uid, 'my_buy_decor_coins', { p_id: 'tree_anor_oltin' })).rejects.toThrow('not_found');
  });
  test('xato va ruxsat', async () => {
    const a = await user('admin');
    const save = (p: Row, who = a): Promise<unknown> => as(who, 'admin_decor_save', { p });
    await expect(save({ id: 'x', model_id: 'tree_anor', name_uz: 'A', name_ru: 'A' })).rejects.toThrow('bad_format');
    await expect(save({ id: 'yangi_model', model_id: 'yoq_model', name_uz: 'A', name_ru: 'A' })).rejects.toThrow('not_found');
    await expect(save({ id: 'yomon_soz', model_id: 'tree_anor', name_uz: 'suka', name_ru: 'A' })).rejects.toThrow('banned_word');
    await expect(save({ id: 'yomon_rang', model_id: 'tree_anor', name_uz: 'A', name_ru: 'A', tint: 'red' })).rejects.toThrow();
    const mod = await user('moderator');
    await sql("update profiles set perms = array['settings'] where user_id = $1", [mod]);
    await expect(save({ id: 'mod_tovar', model_id: 'tree_anor', name_uz: 'A', name_ru: 'A' }, mod)).rejects.toThrow('forbidden');
    await expect(save({ id: 'user_tovar', model_id: 'tree_anor', name_uz: 'A', name_ru: 'A' }, await user())).rejects.toThrow('forbidden');
  });
});
