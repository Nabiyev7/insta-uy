/** 13-qadam (C): snapshot — daqiqasiga 1 marta bazadan, ETag/304, faqat ochiq ma'lumot. */
import { beforeEach, describe, expect, test } from 'vitest';
import { SNAP_TTL_S, clearSnapshots, snapshot } from '../src/snapshot.ts';
import type { Backend, Ctx } from '../src/types.ts';

let calls: string[] = [];
let data: unknown = [['P0001', 'nik']];
const db = { rpc: async (fn: string) => { calls.push(fn); return data; } } as unknown as Backend;
const ctx = { env: {}, db, tg: null, ip: '1', fetch } as unknown as Ctx;
const get = (name: string, etag?: string): Request => new Request(`https://api.test/snap/${name}`, etag ? { headers: { 'if-none-match': etag } } : {});

beforeEach(() => { calls = []; clearSnapshots(); data = [['P0001', 'nik']]; });

describe('snapshot', () => {
  test('bir daqiqa ichida bazaga bitta so‘rov (1 000 ta odam bo‘lsa ham)', async () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 1000; i++) await snapshot(get('city'), ctx, 'city', t0 + i);
    expect(calls).toEqual(['api_city']);
    await snapshot(get('city'), ctx, 'city', t0 + SNAP_TTL_S * 1000 + 1);
    expect(calls).toEqual(['api_city', 'api_city']);
  });
  test('ETag: o‘zgarmagan bo‘lsa 304 (ma‘lumot yuborilmaydi), o‘zgarsa yangisi', async () => {
    const first = await snapshot(get('boot'), ctx, 'boot', 0);
    const etag = first.headers.get('etag')!;
    expect(await first.json()).toEqual([['P0001', 'nik']]);
    expect(first.headers.get('cache-control')).toContain('max-age=60');
    const same = await snapshot(get('boot', etag), ctx, 'boot', 10);
    expect(same.status).toBe(304);
    data = [['P0002', 'yangi']];
    const next = await snapshot(get('boot', etag), ctx, 'boot', SNAP_TTL_S * 1000 + 5);
    expect(next.status).toBe(200);
    expect(next.headers.get('etag')).not.toBe(etag);
  });
  test('faqat ochiq ma‘lumot: noma‘lum nom — 404', async () => {
    await expect(snapshot(get('profiles'), ctx, 'profiles')).rejects.toThrow('not_found');
    expect(calls).toEqual([]);
  });
});
