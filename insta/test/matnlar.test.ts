/** 16-qadam: Instagram postlari — matnlar.md to'g'ri: 9 post, 3–5 slayd, kadr mavjud, 5–8 xeshteg, emoji va soxta da'vo yo'q, oxirida chaqiriq. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
// @ts-expect-error — .mjs skript (turlarsiz)
import { KADRLAR, parsePosts } from '../build.mjs';
// @ts-expect-error — .mjs skript (turlarsiz)
import { slideHtml } from '../shablon.mjs';

interface Slide { readonly tur: string; readonly sarlavha: string; readonly matn?: string; readonly kadr: string; readonly ekran?: string; readonly raqam?: string }
interface Post { readonly id: string; readonly title: string; readonly izoh: string; readonly xeshteglar: string; readonly slides: readonly Slide[] }
const posts = parsePosts(readFileSync(new URL('../../docs/insta/matnlar.md', import.meta.url), 'utf8')) as readonly Post[];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('matnlar.md', () => {
  test('9 post (01–09), har birida 3–5 slayd', () => {
    expect(posts.map((p) => p.id)).toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09']);
    for (const p of posts) expect(p.slides.length, p.id).toBeGreaterThanOrEqual(3);
    for (const p of posts) expect(p.slides.length, p.id).toBeLessThanOrEqual(5);
  });
  test('har slaydda sarlavha (2–6 so‘z) va mavjud kadr; turlar ma‘lum', () => {
    for (const p of posts) for (const s of p.slides) {
      expect(Object.keys(KADRLAR), `${p.id}: ${s.kadr}`).toContain(s.kadr);
      expect(['kadr', 'telefon', 'raqam', 'shkala', 'chaqiriq'], `${p.id}: ${s.tur}`).toContain(s.tur);
      const words = s.sarlavha.replace(/\*/g, '').split(/\s+/).filter((w) => w !== '—' && w !== '–');
      expect(words.length, `${p.id}: ${s.sarlavha}`).toBeGreaterThanOrEqual(1);
      expect(words.length, `${p.id}: ${s.sarlavha}`).toBeLessThanOrEqual(6);
    }
  });
  test('izoh 2–4 qator, oxirida chaqiriq; 5–8 xeshteg, #citylanduz bor', () => {
    for (const p of posts) {
      const lines = p.izoh.split('\n').filter(Boolean);
      expect(lines.length, p.id).toBeGreaterThanOrEqual(2);
      expect(lines.length, p.id).toBeLessThanOrEqual(4);
      expect(lines.at(-1), p.id).toBe("Bio'dagi havola orqali bepul uyingni ol.");
      const tags = p.xeshteglar.split(/\s+/).filter((t) => t.startsWith('#'));
      expect(tags.length, p.id).toBeGreaterThanOrEqual(5);
      expect(tags.length, p.id).toBeLessThanOrEqual(8);
      expect(tags).toContain('#citylanduz');
    }
  });
  test('halollik: emoji yo‘q, "N kishi yashaydi" kabi da‘vo yo‘q; faqat o‘zbekcha (kirill yo‘q)', () => {
    const all = posts.map((p) => [p.izoh, ...p.slides.flatMap((s) => [s.sarlavha, s.matn ?? ''])].join('\n')).join('\n');
    expect(all).not.toMatch(EMOJI);
    expect(all).not.toMatch(/kishi yashaydi|allaqachon \d/i);
    expect(all).not.toMatch(/[Ѐ-ӿ]/);
  });
  test('shablon: oltin urg‘u, logo, nuqtalar; oxirgi slaydda "Uyingni ol → bio‘dagi havola"', () => {
    const html = slideHtml({ tur: 'kadr', sarlavha: 'Seniki *qaysi?*', matn: 'x', kadr: 'bosh-joy' }, { index: 1, count: 4, frame: 'file:///x.jpg', isLast: true, gifts: [] }) as string;
    expect(html).toContain('<em>qaysi?</em>');
    expect(html).toContain('CityLand UZ');
    expect(html.match(/<b class="/g)?.length).toBe(4);
    expect(html).toContain("Uyingni ol → bio'dagi havola");
  });
});
