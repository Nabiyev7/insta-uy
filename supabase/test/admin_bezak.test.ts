/** 15-qadam (5): admin — Bezaklar: ro'yxat, arxiv, ommaviy amallar, yangi tovar (kategoriyadan joy nuqtalari), jurnal. */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { SLOT_SPOTS } from '../../packages/shared/src/catalog.ts';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let admin = '';
type Row = Record<string, unknown>;
const as = <T = unknown>(uid: string, fn: string, args: Row = {}): Promise<T> => rpc(db, 'authenticated', uid, fn, args) as Promise<T>;
const sql = async (q: string, p: unknown[] = []): Promise<Row[]> => (await db.query<Row>(q, p)).rows;
const one = async (id: string): Promise<Row> => (await sql('select * from decor_catalog where id = $1', [id]))[0]!;

beforeAll(async () => {
  db = await openDb();
  admin = randomUUID();
  await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: admin, p_login: 'bezak_admin', p_ref: null, p_telegram: 660_001, p_instagram: null });
  await sql("update profiles set role = 'admin' where user_id = $1", [admin]);
});

describe('admin: Bezaklar', () => {
  test('arxivda eski tovarlar (sotuvda emas), asosiy ro‘yxatdan ajratiladi; ro‘yxatda chegirma va "avto"', async () => {
    const list = await as<Row[]>(admin, 'admin_decor_list');
    const archived = list.filter((r) => r.is_archived).map((r) => r.id).sort();
    expect(archived).toEqual(['car_sedan', 'car_sport', 'car_van', 'tree_archa', 'tree_olma', 'tree_orik', 'water_fountain', 'water_pool', 'yard_besedka', 'yard_flowers', 'yard_garage', 'yard_mangal', 'yard_umbrella']);
    expect(list.filter((r) => r.is_archived).every((r) => r.is_active === false)).toBe(true);
    expect(list.find((r) => r.id === 'lux_jip')).toMatchObject({ level_auto: true, discount: null });
    await as(admin, 'admin_discount_set', { p_ids: ['pet_cat'], p_pct: 25, p_starts: new Date(Date.now() - 60_000).toISOString(), p_ends: new Date(Date.now() + 3_600_000).toISOString() });
    expect((await as<Row[]>(admin, 'admin_decor_list')).find((r) => r.id === 'pet_cat')!.discount).toMatchObject({ pct: 25, live: true });
  });
  test('ommaviy: narx +20% (yaxlitlanadi, avto level ham), avto levelga qaytarish, yashirish/ko‘rsatish, arxiv', async () => {
    expect(await as(admin, 'admin_decor_bulk', { p_ids: ['pet_dog', 'pet_sheep'], p_action: 'price_pct', p_value: 20 })).toBe(2);
    expect(await one('pet_dog')).toMatchObject({ price_coins: 130 });
    expect(await one('pet_sheep')).toMatchObject({ price_coins: 140 });
    await as(admin, 'admin_decor_bulk', { p_ids: ['yard_tandir'], p_action: 'level_auto' });
    expect(await one('yard_tandir')).toMatchObject({ level_auto: true, min_level: 2 });
    await as(admin, 'admin_decor_bulk', { p_ids: ['pet_hens'], p_action: 'hide' });
    expect(await one('pet_hens')).toMatchObject({ is_active: false, is_archived: false });
    await as(admin, 'admin_decor_bulk', { p_ids: ['pet_hens'], p_action: 'archive' });
    expect(await one('pet_hens')).toMatchObject({ is_active: false, is_archived: true });
    await as(admin, 'admin_decor_bulk', { p_ids: ['pet_hens'], p_action: 'show' });
    expect(await one('pet_hens')).toMatchObject({ is_active: true, is_archived: false });
    await expect(as(admin, 'admin_decor_bulk', { p_ids: ['pet_dog'], p_action: 'price_pct', p_value: 500 })).rejects.toThrow('bad_format');
    await expect(as(admin, 'admin_decor_bulk', { p_ids: ['pet_dog'], p_action: 'boshqa' })).rejects.toThrow('bad_format');
  });
  test('yangi tovar: model + nom + kategoriya (joy nuqtalari kategoriyadan) + narx → level avtomatik; jurnalda', async () => {
    await as(admin, 'admin_decor_save', { p: { id: 'yangi_skameyka', model_id: 'yard_sori', name_uz: 'Skameyka', name_ru: 'Скамейка', price_coins: 300, price_uzs: 0, slot: 'tree', is_new: true } });
    expect(await one('yangi_skameyka')).toMatchObject({ slot: 'tree', spots: ['corner', 'right', 'left'], min_level: 3, level_auto: true, is_active: true, is_archived: false });
    await expect(as(admin, 'admin_decor_save', { p: { id: 'yangi_skameyka', slot: 'yoq' } })).rejects.toThrow('bad_format');
    const log = (await sql("select action from audit_log where action like 'decor:%' or action like 'discount:%'")).map((r) => r.action);
    expect(log).toEqual(expect.arrayContaining(['decor:save', 'decor:bulk', 'discount:set']));
  });
  test('kategoriya → nuqtalar bazada va kodda bir xil; oddiy odam ommaviy amal qila olmaydi', async () => {
    for (const [slot, spots] of Object.entries(SLOT_SPOTS)) expect((await sql('select private.slot_spots($1) s', [slot]))[0]!.s, slot).toEqual([...spots]);
    const u = randomUUID();
    await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: u, p_login: 'oddiy_bezak', p_ref: null, p_telegram: 660_002, p_instagram: null });
    await expect(as(u, 'admin_decor_bulk', { p_ids: ['pet_dog'], p_action: 'hide' })).rejects.toThrow('forbidden');
    await expect(as(u, 'admin_decor_list')).rejects.toThrow('forbidden');
  });
});
