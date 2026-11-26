/** 6e (TUZATISH-3): bepul uyi borlarga bo'sh joy belgilari va "Bepul uy oling" kartasi chiqmaydi (14-qadam: admin ham — istisno yo'q). */
import { describe, expect, test } from 'vitest';
import { nextCard } from '../src/logic/cards.ts';
import { canClaimFree } from '../src/logic/lively.ts';

describe('uyi borlarga "+" ko‘rinmaydi', () => {
  test('mehmon va hali uy olmagan — belgilar bor; bepul uy olingan — yo‘q', () => {
    expect(canClaimFree(null)).toBe(true);
    expect(canClaimFree({ free_used: false })).toBe(true);
    expect(canClaimFree({ free_used: true })).toBe(false);
  });
  test('kamida 1 ta uy bor (admin bergan uy ham, free_used yo‘q) — belgilar yo‘q', () => {
    expect(canClaimFree({ free_used: false, plots: [{ plot: 'P0001' }] })).toBe(false);
    expect(canClaimFree({ free_used: false, plots: [] })).toBe(true);
  });
  test('pastki karta: bepul uy olinganida "Bepul uy oling" yo‘q', () => {
    const base = { isCity: true, isGuest: false, isDailyReady: false, hasCheer: false, hasTreasure: false, hasFresh: false };
    expect(nextCard({ ...base, hasHouse: false })).toBe('free');
    expect(nextCard({ ...base, hasHouse: !canClaimFree({ free_used: true }) })).toBeNull();
    expect(nextCard({ ...base, isGuest: true, hasHouse: false })).toBe('free');
  });
});
