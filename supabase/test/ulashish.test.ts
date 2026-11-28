/** 19-qadam (2): bot rasmni yuborishi uchun ma'lumot — faqat server (service_role). */
import { randomUUID } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, test } from 'vitest';
import { openDb, rpc } from '../../server/dev/db.ts';

let db: PGlite;
beforeAll(async () => { db = await openDb(); });

describe('svc_photo_ctx', () => {
  test('Telegram ID, taklif kodi va til; mijozga yopiq; bloklanganga — yo‘q', async () => {
    const uid = randomUUID();
    await rpc(db, 'service_role', null, 'svc_profile_create', { p_user: uid, p_login: 'surat_odam', p_ref: null, p_telegram: 551_001, p_instagram: 'surat_odam' });
    const r = (await rpc(db, 'service_role', null, 'svc_photo_ctx', { p_user: uid })) as Record<string, unknown>;
    expect(r).toMatchObject({ telegram: 551_001, lang: 'uz' });
    expect(String(r.ref)).toMatch(/^\w+$/);
    await expect(rpc(db, 'authenticated', uid, 'svc_photo_ctx', { p_user: uid })).rejects.toThrow();
    await db.query('update profiles set is_banned = true where user_id = $1', [uid]);
    expect(await rpc(db, 'service_role', null, 'svc_photo_ctx', { p_user: uid })).toBeNull();
  });
});
