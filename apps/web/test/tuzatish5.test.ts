/** 14-qadam (TUZATISH-5): haqiqiy loyiha — saytda, admin panelda va botda "sinov/test" so'zi va belgisi yo'q; admin huquqlari doimiy. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { isOwnerAdmin } from '../src/logic/admin.ts';
import { goodState } from '../src/logic/shopTabs.ts';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const filesOf = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? filesOf(p) : /\.(tsx?|css)$/.test(f) ? [p] : []; });
/** Izohlarsiz kod (izohlarda "sinov" so'zi bo'lishi mumkin — ular foydalanuvchiga ko'rinmaydi). */
const code = (p: string): string => readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('"sinov" so‘zi foydalanuvchiga ko‘rinmaydi', () => {
  test('sayt va admin panel kodida (izohlardan tashqari) "sinov", "SINOV", "тест" yo‘q', () => {
    const files = [...filesOf(join(ROOT, 'apps/web/src')), ...filesOf(join(ROOT, 'apps/admin/src'))];
    const bad = files.filter((p) => /sinov|тест/i.test(code(p)));
    expect(bad).toEqual([]);
  });
  test('sayt matnlari va bot matnlarida "test" ham yo‘q', () => {
    for (const p of ['apps/web/src/app/i18n.ts', 'server/src/botText.ts']) {
      const texts = code(join(ROOT, p)).match(/\[\s*(['"`])[^\]]*\]/g) ?? [];
      expect(texts.filter((x) => /sinov|test|тест|🧪/i.test(x)), p).toEqual([]);
    }
  });
  test('eski "sinov rejimi" chaqiruvlari yo‘q (my_test_*, svc_test_purchase, test_mode)', () => {
    const files = [...filesOf(join(ROOT, 'apps/web/src')), ...filesOf(join(ROOT, 'apps/admin/src')), ...filesOf(join(ROOT, 'server/src'))];
    expect(files.filter((p) => /my_test_|svc_test_purchase|svc_is_tester_tg|admin_test_cleanup|test_mode|tbuy:/.test(code(p)))).toEqual([]);
  });
});

describe('egasi-admin', () => {
  test('faqat server "owner" desa — admin (rol yozuvi yetmaydi)', () => {
    expect(isOwnerAdmin(null)).toBe(false);
    expect(isOwnerAdmin({})).toBe(false);
    expect(isOwnerAdmin({ owner: true })).toBe(true);
  });
  test('adminga lyuks bezak 1-level uyda ham qulfsiz', () => {
    const lux = { id: 'lux_superkar', min: 5, onSale: true, left: null } as unknown as Parameters<typeof goodState>[0];
    expect(goodState(lux, 1, false)).toBe('locked');
    expect(goodState(lux, 1, true)).toBe('free');
  });
});

describe('"+" — uyi bor hech kimga (admin ham) chiqmaydi', () => {
  test('mehmon — bor; kirgan va uysiz — bor; uyi bor yoki bepul uyini olgan — yo‘q', async () => {
    const { showClaimMarks } = await import('../src/logic/lively.ts');
    expect(showClaimMarks('guest', null)).toBe(true);
    expect(showClaimMarks('user', { free_used: false, plots: [] })).toBe(true);
    expect(showClaimMarks('user', { free_used: true, plots: [] })).toBe(false);
    expect(showClaimMarks('user', { free_used: false, plots: [{ plot: 'P0001' }] })).toBe(false);
  });
  test('profil hali kelmagan (sessiya bor, Mini App kirishi, internet uzilgan) — yo‘q', async () => {
    const { showClaimMarks } = await import('../src/logic/lively.ts');
    expect(showClaimMarks('unknown', null)).toBe(false);
    expect(showClaimMarks('user', null)).toBe(false);
  });
  test('belgilarning hammasi bitta qoidadan: "+", ramka, "Bu joy sizni kutyapti" va pastki karta', () => {
    const layer = readFileSync(join(ROOT, 'apps/web/src/world/CityLayer.tsx'), 'utf8');
    expect(layer).not.toMatch(/canClaimFree\(/);
    expect(layer.match(/showClaimMarks\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(readFileSync(join(ROOT, 'apps/web/src/ui/BottomCard.tsx'), 'utf8')).toContain('showClaimMarks(authState, profile)');
  });
});
