/** Manzil bo'yicha qidiruv (nik serverda qidiriladi). Sof hisob. */
import type { Plot } from '../../../../packages/shared/src/index.ts';

const MAX_FOUND = 12;
const plain = (s: string): string => s.toLowerCase().replace(/[‘’ʻʼ`']/g, "'").replace(/[.,\-–—]/g, ' ').replace(/\s+/g, ' ').trim();
/** Hamma so'zi manzilda uchragan uylar; "5" deb yozilsa "15" topilmasin — son to'liq mos kelishi kerak. */
export const findAddress = (q: string, plots: readonly Plot[], addressOf: (p: Plot) => string): readonly Plot[] => {
  const words = plain(q.replace(/^@/, '')).split(' ').filter(Boolean);
  if (words.length === 0 || !words.some((w) => /\d/.test(w) || w.length > 2)) return [];
  const out: Plot[] = [];
  for (const p of plots) {
    const parts = plain(addressOf(p)).split(' ');
    if (!words.every((w) => parts.some((x) => (/^\d+$/.test(w) ? x === w : x.startsWith(w))))) continue;
    out.push(p);
    if (out.length >= MAX_FOUND) break;
  }
  return out;
};
