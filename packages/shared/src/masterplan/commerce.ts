/** Tijorat joylari (hozircha sotilmaydi): do'konlar savdo markazida, minoralar va ofislar biznes markazida, bilbordlar prospekt chetida. */
import type { Commerce, Rot } from '../types.ts';
import { AVENUE_LINES, CITY_HALF, boxHitsTilted } from './geometry.ts';
import { boxInCurves, type NetRoad } from './network.ts';

type CommerceDraft = Omit<Commerce, 'id'>;
const SHOP = { w: 18, d: 24, pitch: 24 } as const;
const OFFICE = { w: 36, d: 24 } as const;
const TOWER = 28;

/** Bir qator: `xs` markazlari, hammasi bir tomonga qaraydi. */
const row = (type: Commerce['type'], z: number, rot: Rot, xs: readonly number[], w: number, d: number): CommerceDraft[] => xs.map((x): CommerceDraft => ({ type, x, z, w, d, rot }));
const span = (from: number, n: number, pitch: number): number[] => Array.from({ length: n }, (_, i) => from + i * pitch);
const both = (xs: readonly number[]): number[] => [...xs.map((x) => -x).reverse(), ...xs];

/** Savdo markazi ichki yo'laklari (z) — do'konlar shularga qaraydi. */
export const MARKET_LANES = [997, 1065] as const;
/** Biznes markazidagi do'konlar yo'lagi. */
export const SHOP_LANE = 208;
const shops = (): CommerceDraft[] => {
  const sides = both(span(84, 8, SHOP.pitch));
  const rows = MARKET_LANES.flatMap((z) => [...row('dokon', z - 18, 0, sides, SHOP.w, SHOP.d), ...row('dokon', z + 18, 2, sides, SHOP.w, SHOP.d)]);
  const south = row('dokon', 1152, 2, both(span(36, 10, SHOP.pitch)), SHOP.w, SHOP.d);
  const business = [...row('dokon', SHOP_LANE + 18, 2, span(830, 8, 28), SHOP.w, SHOP.d), ...row('dokon', SHOP_LANE - 18, 0, span(830, 8, 28), SHOP.w, SHOP.d)];
  return [...rows, ...south, ...business];
};

/** Biznes markazi: bosh ko'cha (z = 0) bo'yida 12 minora, orqasida past ofislar. */
const towers = (): CommerceDraft[] => [...row('ofis', -42, 0, span(842, 6, 46), TOWER, TOWER), ...row('ofis', 42, 2, span(842, 6, 46), TOWER, TOWER)];
const offices = (): CommerceDraft[] => [
  ...row('ofis', -104, 0, span(838, 6, 44), OFFICE.w, OFFICE.d), ...row('ofis', 104, 2, span(838, 6, 44), OFFICE.w, OFFICE.d),
  ...row('ofis', -42, 0, [1160, 1206, 1252], OFFICE.w, OFFICE.d), ...row('ofis', 42, 2, [1160, 1206, 1252], OFFICE.w, OFFICE.d),
];

const BILLBOARDS = 40;
/** Bilbord ustuni yashil yo'lakda turadi, paneli (±4 m) hovliga kirmaydi. */
const BILLBOARD_SIDE = 9.9;
const BILLBOARD_STEP = 45;
const billboards = (roads: readonly NetRoad[]): CommerceDraft[] => {
  const lines = AVENUE_LINES.filter((l) => l !== 0);
  const spots = lines.flatMap((l) => span(-CITY_HALF + 60, 64, BILLBOARD_STEP).flatMap((u): CommerceDraft[] => [
    { type: 'bilbord', x: u, z: l + BILLBOARD_SIDE, w: 8, d: 2, rot: 3 }, { type: 'bilbord', x: l + BILLBOARD_SIDE, z: u, w: 8, d: 2, rot: 0 },
  ]));
  const isGood = (c: CommerceDraft): boolean => {
    const [hx, hz] = c.rot % 2 ? [2, 5] : [5, 2];
    const own = (r: NetRoad): boolean => r.kind === 'prospekt' && boxHitsTilted(c.x, c.z, hx, hz, r);
    const crossing = roads.some((r) => r.kind !== 'prospekt' && boxHitsTilted(c.x, c.z, hx + 6, hz + 6, r));
    const main = roads.filter(own);
    return main.length === 1 && !crossing && !boxInCurves(c.x, c.z, hx, hz) && Math.abs(Math.abs(c.x) - Math.abs(c.z)) > 40;
  };
  return spots.filter(isGood).sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || a.x - b.x || a.z - b.z)
    .filter((_, i) => i % 2 === 0).slice(0, BILLBOARDS);
};

export const planCommerce = (roads: readonly NetRoad[]): Commerce[] => {
  const groups = [shops(), towers(), offices(), billboards(roads)];
  return groups.flat().map((c, i): Commerce => ({ id: `B${String(i + 1).padStart(3, '0')}`, ...c }));
};
