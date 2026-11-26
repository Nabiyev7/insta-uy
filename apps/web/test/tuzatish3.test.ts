/** 6e (TUZATISH-3): bepul uyi borlarga bo'sh joy belgilari va "Bepul uy oling" kartasi chiqmaydi; sinov rejimida — chiqadi. */
import { describe, expect, test } from 'vitest';
import { nextCard } from '../src/logic/cards.ts';
import { canClaimFree } from '../src/logic/lively.ts';

describe('uyi borlarga "+" ko‘rinmaydi', () => {
  test('mehmon va hali uy olmagan — belgilar bor; bepul uy olingan — yo‘q; admin sinov rejimi — bor', () => {
    expect(canClaimFree(null)).toBe(true);
    expect(canClaimFree({ free_used: false })).toBe(true);
    expect(canClaimFree({ free_used: true })).toBe(false);
    expect(canClaimFree({ free_used: true, test_mode: false })).toBe(false);
    expect(canClaimFree({ free_used: true, test_mode: true })).toBe(true);
  });
  test('6f: admin sinov uyi bor (free_used yo‘q) va sinov rejimi o‘chiq — belgilar yo‘q; yoqiq — bor', () => {
    const testHouse = [{ plot: 'P0001', is_test: true }];
    expect(canClaimFree({ free_used: false, test_mode: false, plots: testHouse })).toBe(false);
    expect(canClaimFree({ free_used: false, test_mode: true, plots: testHouse })).toBe(true);
    expect(canClaimFree({ free_used: false, test_mode: false, plots: [] })).toBe(true);
  });
  test('pastki karta: bepul uy olinganida "Bepul uy oling" yo‘q', () => {
    const base = { isCity: true, isGuest: false, isDailyReady: false, hasCheer: false, hasTreasure: false, hasFresh: false };
    expect(nextCard({ ...base, hasHouse: false })).toBe('free');
    expect(nextCard({ ...base, hasHouse: !canClaimFree({ free_used: true }) })).toBeNull();
    expect(nextCard({ ...base, isGuest: true, hasHouse: false })).toBe('free');
  });
});
