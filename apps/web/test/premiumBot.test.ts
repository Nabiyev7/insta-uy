/** 6f, 3-band: saytdagi Premium bo'limi faqat ko'rsatadi — to'lov oynasi (karta, openInvoice) chaqirilmaydi, xarid botda. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const source = readFileSync(new URL('../src/ui/PremiumShop.tsx', import.meta.url), 'utf8');

describe('Premium — xarid botda', () => {
  test('to‘lov komponentlari ishlatilmaydi', () => {
    expect(source).not.toMatch(/<PayButtons|createOrder|openInvoice|payStars/);
  });
  test('tugma botga chuqur havola: t.me/<bot>?start=buy_<kod>; Mini App ichida openTelegramLink', () => {
    expect(source).toContain('`https://t.me/${bot}?start=buy_${code}`');
    expect(source).toContain('openTelegramLink(url)');
    expect(source).toContain("t('buyInBot')");
    expect(source).toContain("t('soon')");
  });
});
