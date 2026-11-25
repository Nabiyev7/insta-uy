import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
let uid: string;
beforeAll(async () => {
  db = await openDb();
  uid = randomUUID();
  await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: uid, p_login: 'markazchi', p_ref: null, p_telegram: 900_001 });
});
const quote = (id: string): Promise<unknown> =>
  db.query("select private.quote(p, 'commerce', jsonb_build_object('id', $1::text)) q from public.profiles p where user_id = $2", [id, uid]);

describe('tijorat joylari sotuvda emas', () => {
  test('bazadagi ro‘yxat koddagi bilan bir xil', async () => {
    const { rows } = await db.query<{ value: string[] }>("select value from settings where key = 'commerce_closed'");
    const all = await db.query<{ id: string }>('select id from commerce order by id');
    expect(all.rows).toHaveLength(170);
    expect([...rows[0]!.value].sort()).toEqual(all.rows.map((r) => r.id));
  });
  test.each(['B001', 'B100', 'B101', 'B112', 'B130', 'B170'])('%s sotib olinmaydi', async (id) => {
    await expect(quote(id)).rejects.toThrow('not_for_sale');
    expect(await rpc(db, 'anon', null, 'api_commerce', { p_id: id })).toMatchObject({ id, free: false });
  });
  test('joylar bazada qoladi; ro‘yxatdan chiqarilsa yana sotiladi', async () => {
    const { rows } = await db.query<{ c: number }>("select count(*)::int c from commerce where id between 'B101' and 'B112'");
    expect(rows[0]!.c).toBe(12);
    await db.query("update settings set value = value - 'B113' where key = 'commerce_closed'");
    await expect(quote('B113')).resolves.toBeDefined();
    await expect(quote('B114')).rejects.toThrow('not_for_sale');
  });
  test('ichki narx funksiyasi ochiq emas', async () => {
    const { rows } = await db.query("select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'private' and proname in ('quote','quote_base') and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))");
    expect(rows).toEqual([]);
  });
});
