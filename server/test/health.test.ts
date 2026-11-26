/** 13-qadam (D): sog'liq tekshiruvi — 2 marta ketma-ket xato bo'lsa egasiga xabar, soatiga ko'pi bilan 1 ta; Render ping. */
import { describe, expect, test } from 'vitest';
import { healthCheck, targets, type Target } from '../src/health.ts';
import type { Ctx, Telegram } from '../src/types.ts';

const sent: { chat: number | string; text: string }[] = [];
const tg = { send: async (chat: number | string, text: string) => { sent.push({ chat, text }); } } as unknown as Telegram;
const ctx = (over: Partial<Ctx> = {}): Ctx => ({ env: { ADMIN_TELEGRAM_ID: '42', SITE_URL: 'https://sayt.test', REALTIME_URL: 'https://jonli.test' }, db: { rpc: async () => { throw new Error('baza yo‘q'); } }, tg, ip: '1', fetch, ...over } as unknown as Ctx);
const target = (name: string, results: boolean[]): Target => ({ name, check: async () => results.shift() ?? true });

describe('sog‘liq tekshiruvi', () => {
  test('hammasi ishlasa — xabar yo‘q', async () => {
    sent.length = 0;
    expect(await healthCheck(ctx(), [target('Sayt', [true])], 0)).toEqual([]);
    expect(sent).toEqual([]);
  });
  test('bir marta xato, qayta tekshirganda ishladi — xabar yo‘q (tasodifiy uzilish)', async () => {
    sent.length = 0;
    expect(await healthCheck(ctx(), [target('Sayt', [false, true])], 0)).toEqual([]);
    expect(sent).toEqual([]);
  });
  test('bazada: bir soatda bitta (svc_health_alert); baza ishlamasa — xotira', async () => {
    sent.length = 0;
    const answers = [true, false];
    const withDb = ctx({ db: { rpc: async () => answers.shift() } } as unknown as Partial<Ctx>);
    await healthCheck(withDb, [target('Sayt', [false, false])], 0);
    await healthCheck(withDb, [target('Sayt', [false, false])], 0);
    expect(sent).toHaveLength(1);
  });
  test('2 marta ketma-ket xato — egasiga "⚠️ … ishlamayapti"; bir soat ichida takror yuborilmaydi', async () => {
    sent.length = 0;
    expect(await healthCheck(ctx(), [target('Jonli server (Render)', [false, false])], 0, 1_000)).toEqual(['Jonli server (Render)']);
    expect(sent).toEqual([{ chat: 42, text: expect.stringContaining('⚠️ Jonli server (Render) ishlamayapti') }]);
    await healthCheck(ctx(), [target('Jonli server (Render)', [false, false])], 0, 1_000 + 30 * 60_000);
    expect(sent).toHaveLength(1);
    await healthCheck(ctx(), [target('Jonli server (Render)', [false, false])], 0, 1_000 + 61 * 60_000);
    expect(sent).toHaveLength(2);
  });
  test('tekshiriladiganlar: sayt, Supabase, jonli server (Render uxlamasin)', async () => {
    const seen: string[] = [];
    const fake: typeof fetch = async (input) => { seen.push(String(input)); return new Response('ok'); };
    const list = targets(ctx({ fetch: fake, db: { rpc: async () => [] } } as unknown as Partial<Ctx>));
    expect(list.map((t) => t.name)).toEqual(['Sayt', 'Baza (Supabase)', 'Jonli server (Render)']);
    for (const t of list) expect(await t.check()).toBe(true);
    expect(seen).toEqual(['https://sayt.test', 'https://jonli.test']);
  });
});
