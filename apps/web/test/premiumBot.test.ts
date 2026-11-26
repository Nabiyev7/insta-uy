/** 13-qadam (A): saytda pul to'lovi komponenti yo'q — hamma pulli xarid botda (Telegram Stars). */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = path.join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : [];
});
const all = files(src).map((p) => ({ p: path.relative(src, p), s: readFileSync(p, 'utf8') }));
const botBuy = readFileSync(path.join(src, 'ui/BotBuy.tsx'), 'utf8');

describe('saytda pul to‘lovi yo‘q, xarid botda', () => {
  test('to‘lov komponentlari (karta buyurtmasi, PayButtons, openInvoice) saytning hech bir faylida yo‘q', () => {
    for (const f of all) expect(f.s, f.p).not.toMatch(/PayButtons|createOrder|openInvoice|payStars|'my_order'|\/pay\/stars\/link/);
  });
  test('BotBuy: botga chuqur havola t.me/<bot>?start=buy_<kod>; Mini App ichida openTelegramLink; to‘lov o‘chiq — "Tez kunda"', () => {
    expect(botBuy).toContain('`https://t.me/${bot}?start=buy_${code}`');
    expect(botBuy).toContain('openTelegramLink(url)');
    expect(botBuy).toContain("t('buyInBot')");
    expect(botBuy).toContain("t('soon')");
  });
  test('salyut, tanga paketlari, premium, level — BotBuy orqali', () => {
    const uses = all.filter((f) => f.s.includes('<BotBuy')).map((f) => f.p.split(path.sep).join('/'));
    expect(uses).toEqual(expect.arrayContaining(['ui/PremiumShop.tsx', 'ui/SocialPanels.tsx', 'ui/HousePanels.tsx', 'ui/PlotPanel.tsx']));
  });
});
