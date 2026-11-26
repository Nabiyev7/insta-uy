/** 13-qadam (D3): zaxiradan tiklash SQL — haqiqiy bazada ishlaydi (bo'sh bazaga qatorlar qaytadi). */
import { describe, expect, test } from 'vitest';
import { openDb } from '../dev/db.ts';
// @ts-expect-error — .mjs skript (turlarsiz)
import { restoreSql } from '../../scripts/restore.mjs';

describe('zaxiradan tiklash', () => {
  test('svc_backup → SQL → boshqa bazada qatorlar paydo bo‘ladi; takror ishlatsa xato yo‘q', async () => {
    const source = await openDb();
    await source.query("select public.svc_profile_create('11111111-1111-1111-1111-111111111111', 'zaxira_odam', null, 777001, 'zaxira_nik')");
    const backup = (await source.query<{ b: Record<string, unknown> }>('select public.svc_backup() b')).rows[0]!.b;
    const sql = restoreSql(backup) as string;
    const target = await openDb();
    await target.exec(sql);
    await target.exec(sql);
    expect((await target.query("select instagram from profiles where login = 'zaxira_odam'")).rows).toEqual([{ instagram: 'zaxira_nik' }]);
  });
});
