/** Bo'sh shahar jonliroq: markazga yaqin bo'sh joylar belgisi, "bugun N kishi uy oldi" va "@nik hozirgina uy oldi" xabari. Sof hisob. */
import { isFreeType, type Plot } from '../../../../packages/shared/src/index.ts';

interface ClaimProfile { readonly free_used: boolean; readonly test_mode?: boolean }
/** Bepul uy hali olinmaganmi (mehmon ham)? Admin sinov rejimida — doim ha (bir nechta uy). */
export const canClaimFree = (p: ClaimProfile | null | undefined): boolean => !p || !p.free_used || p.test_mode === true;

/** Belgi shuncha joyda (tezlik uchun). */
export const WAITING_MAX = 20;
/** Yangi uy xabari daqiqasiga ko'pi bilan 1 ta. */
export const NEWS_GAP_MS = 60_000;

/** Ochiq tumanlardagi, markaziy maydonga eng yaqin bo'sh bepul joylar. */
export const waitingPlots = (plots: readonly Plot[], taken: ReadonlySet<string> | ReadonlyMap<string, unknown>, open: ReadonlySet<number>, max = WAITING_MAX): readonly Plot[] =>
  plots.filter((p) => open.has(p.districtId) && isFreeType(p.type) && !taken.has(p.id))
    .map((p) => ({ p, d: Math.hypot(p.x, p.z) })).sort((a, b) => a.d - b.d).slice(0, max).map((x) => x.p);

export interface HousesCount { readonly today: number; readonly total: number }
/** Hisoblagich matni: 0 bo'lsa — "Birinchilardan bo'ling!". */
export const countLine = (c: HousesCount | undefined, words: { readonly today: string; readonly first: string }): string =>
  !c || c.total === 0 ? words.first : words.today.replace('{n}', String(c.today)).replace('{m}', String(c.total));

interface HouseLike { readonly nick: string | null }
/** Oxirgi yangilanishda paydo bo'lgan (o'zimniki emas) uy egasining niki — xabar uchun; tez-tez bo'lsa null. */
/** `before` = null — birinchi yuklanish (hamma uy "yangi" emas). */
export const newNeighbourNick = (before: ReadonlyMap<string, HouseLike> | null, after: ReadonlyMap<string, HouseLike>, mine: ReadonlySet<string>, lastAt: number, now: number): string | null => {
  if (!before || now - lastAt < NEWS_GAP_MS) return null;
  for (const [id, h] of after) if (!before.has(id) && !mine.has(id) && h.nick) return h.nick;
  return null;
};
