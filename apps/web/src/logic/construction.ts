/** Uy qurilishi effekti: uy yerdan ko'tariladi, panjara o'sadi, chang bulutchalari. Sof hisob. */
import { hash01, padHeight, type Plot } from '../../../../packages/shared/src/index.ts';
import { item, toWorld, type Item } from './item.ts';
import { pickHeight, plotItems, shellSize, type HouseState } from './placement.ts';

/** Kamera uchastkaga yetib borguncha kutish va qurilish davomi, ms. */
export const FLIGHT_MS = 1100;
export const BUILD_MS = 2700;
export interface Construction { readonly plot: string; /** performance.now() — qurilish boshlanadigan payt. */ readonly at: number }

const RISE_SHARE = 0.78;
const YARD_FROM = 0.45;
const PUFFS = 30;
const PUFF_LIFE = 0.4;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));
const easeOut = (k: number): number => 1 - (1 - k) ** 3;

/** Egasi endi bo'lgan, hali yuklanmagan uy. */
export const freshHouse = (plot: string): HouseState => ({ plot, nick: null, tier: 1, wall: 0, roof: 0, decor: [], material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false });

const puffs = (p: Plot, t: number): Item[] => Array.from({ length: PUFFS }, (_, i) => {
  const life = (t - (i / PUFFS) * (1 - PUFF_LIFE)) / PUFF_LIFE;
  if (life <= 0 || life >= 1) return [];
  const a = (i / PUFFS) * Math.PI * 2 * 3 + hash01(`d${i}`);
  const r = 5.2 + hash01(`r${i}`) * 2.6 + life * 2.2;
  const [x, z] = toWorld(p, Math.cos(a) * r, -7.5 + Math.sin(a) * r * 0.8);
  const size = Math.sin(life * Math.PI) * (0.45 + hash01(`s${i}`) * 0.75);
  return [item('dust', x, z, { y: padHeight(p) + 0.2 + life * 2.6, yaw: a, sx: size, sy: size, sz: size })];
}).flat();

/** t — 0..1: qurilishning bajarilgan ulushi. */
export const constructionItems = (p: Plot, s: HouseState, t: number): Item[] => {
  const k = clamp01(t);
  const rise = easeOut(clamp01(k / RISE_SHARE));
  const grown = easeOut(clamp01((k - YARD_FROM) / (1 - YARD_FROM)));
  const [house, ...rest] = plotItems(p, s, true);
  const shell = rest.slice(0, shellSize(s.tier) - 1);
  const yard = rest.slice(shellSize(s.tier) - 1);
  const size = Math.max(0.01, grown);
  return [
    ...(house && k > 0 ? [{ ...house, y: house.y - (1 - rise) * pickHeight(p, s) * 1.25 }] : []),
    ...(grown > 0 ? [...shell.map((i) => ({ ...i, sy: i.sy * size })), ...yard.map((i) => ({ ...i, sx: i.sx * size, sy: i.sy * size, sz: i.model === 'path_stone' ? i.sz : i.sz * size }))] : []),
    ...puffs(p, k),
  ];
};
