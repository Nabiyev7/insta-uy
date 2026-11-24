/** Kvartal ichida uchastka qatorlari: orqama-orqa juft qatorlar va ular orasidagi ichki ko'chalar. */
import type { Rot } from '../types.ts';
import { STREET } from './geometry.ts';
import { boxInCurves, clipRoad, isInnerRoadBlocked, roadAt, type NetRoad } from './network.ts';
import { boxTouches, type Box4 } from './zones.ts';

/** Generator ichidagi vaqtinchalik uchastka joyi. */
export interface Spot {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
  readonly streetKey: string;
  /** Qator kaliti va undagi indeks — qo'shnilarni topish uchun. */
  readonly row: string;
  readonly index: number;
}
export interface LayoutResult { readonly spots: readonly Spot[]; readonly roads: readonly NetRoad[] }
export interface PlotSize { readonly w: number; readonly d: number }
export interface LayoutInput {
  readonly id: string;
  readonly rect: Box4;
  readonly size: PlotSize;
  /** Atrofdagi tayyor yo'llar. */
  readonly around: readonly NetRoad[];
}

interface Row { readonly at: number; /** +1: v o'sadigan tomonga qaraydi. */ readonly faces: 1 | -1 }
interface Pattern { readonly rows: readonly Row[]; readonly streets: readonly number[] }

/** Qatorlar ketma-ketligi: `isOut` — birinchi qator chetdagi yo'lga qaraydi. */
const patternOf = (v0: number, length: number, depth: number, isOut: boolean, count: number): Pattern | null => {
  const facing = Array.from({ length: count }, (_, i): 1 | -1 => ((i % 2 === 0) === isOut ? -1 : 1));
  const streetAfter = (i: number): boolean => facing[i] === 1 && i < count - 1;
  const used = count * depth + facing.filter((_, i) => streetAfter(i)).length * STREET;
  const slack = length - used;
  if (slack < 0 || count === 0) return null;
  // Oxirgi qator chetdagi yo'lga qarasa, ortiqcha joy uning orqasiga tushadi.
  const gapAt = facing[count - 1] === 1 && count > 1 ? count - 1 : -1;
  const rows: Row[] = [];
  const streets: number[] = [];
  let v = v0;
  facing.forEach((f, i) => {
    if (i === gapAt) v += slack;
    rows.push({ at: v + depth / 2, faces: f });
    v += depth;
    if (!streetAfter(i)) return;
    streets.push(v + STREET / 2);
    v += STREET;
  });
  return { rows, streets };
};

/** Qator qaysi tomonga qarashi → uchastka burilishi. */
const ROT: readonly [Readonly<Record<1 | -1, Rot>>, Readonly<Record<1 | -1, Rot>>] = [{ 1: 0, [-1]: 2 }, { 1: 1, [-1]: 3 }];
const CROSS_FROM = 220;
/** Yo'l uchastka old chegarasidan shuncha uzoq bo'lsa ham oldida hisoblanadi (yo'lka). */
const FRONT_REACH = [3, 7, 11] as const;

const build = (input: LayoutInput, isTurned: boolean, pattern: Pattern): LayoutResult => {
  const { rect: [x0, z0, x1, z1], size, around, id } = input;
  const [u0, u1, v0, v1] = isTurned ? [z0, z1, x0, x1] : [x0, x1, z0, z1];
  const segments = u1 - u0 > CROSS_FROM ? 2 : 1;
  const segLen = (u1 - u0 - (segments - 1) * STREET) / segments;
  const perSeg = Math.floor(segLen / size.w);
  if (perSeg === 0) return { spots: [], roads: [] };
  const pad = (segLen - perSeg * size.w) / 2;
  const roads = [
    ...pattern.streets.flatMap((v, i) => clipRoad(isTurned ? 'z' : 'x', u0, u1, v, STREET, 'kocha', `s:${id}:${i}`, isInnerRoadBlocked)),
    ...(segments === 2 ? clipRoad(isTurned ? 'x' : 'z', v0, v1, (u0 + u1) / 2, STREET, 'kocha', `c:${id}`, isInnerRoadBlocked) : []),
  ];
  const all = [...roads, ...around];
  const facing = new Set<NetRoad>();
  const spots = pattern.rows.flatMap((row, r) => Array.from({ length: segments * perSeg }, (_, n): Spot | null => {
    const s = Math.floor(n / perSeg);
    const i = n % perSeg;
    const u = u0 + s * (segLen + STREET) + pad + (i + 0.5) * size.w;
    const [x, z] = isTurned ? [row.at, u] : [u, row.at];
    const [hx, hz] = isTurned ? [size.d / 2, size.w / 2] : [size.w / 2, size.d / 2];
    if (boxInCurves(x, z, hx, hz)) return null;
    const road = FRONT_REACH.map((reach) => {
      const v = row.at + row.faces * (size.d / 2 + reach);
      return isTurned ? roadAt(all, v, u) : roadAt(all, u, v);
    }).find((q) => q !== undefined);
    if (!road) return null;
    facing.add(road);
    return { x, z, w: size.w, d: size.d, rot: ROT[isTurned ? 1 : 0][row.faces], streetKey: road.key, row: `${id}:${r}:${s}`, index: i };
  }).filter((q): q is Spot => q !== null));
  return { spots, roads: roads.filter((r) => (r.key.startsWith('c:') ? spots.length > 0 : facing.has(r))) };
};

const EMPTY: LayoutResult = { spots: [], roads: [] };
const best = (list: readonly LayoutResult[]): LayoutResult => list.reduce((a, b) => (b.spots.length > a.spots.length ? b : a), EMPTY);

/** Bitta to'rtburchakda eng ko'p uchastka sig'adigan joylashuv. */
const layoutRect = (input: LayoutInput): LayoutResult => {
  const [x0, z0, x1, z1] = input.rect;
  const variants = [false, true].flatMap((isTurned) => {
    const [v0, v1] = isTurned ? [x0, x1] : [z0, z1];
    const max = Math.floor((v1 - v0 + STREET) / input.size.d);
    return [true, false].flatMap((isOut) => Array.from({ length: max }, (_, i) => patternOf(v0, v1 - v0, input.size.d, isOut, i + 1))
      .filter((p): p is Pattern => p !== null).slice(-2).map((p) => build(input, isTurned, p)));
  });
  return best(variants);
};

const MIN_SIDE = 30;
const isUsable = ([x0, z0, x1, z1]: Box4): boolean => x1 - x0 >= MIN_SIDE && z1 - z0 >= MIN_SIDE;
const merge = (parts: readonly LayoutResult[]): LayoutResult => ({ spots: parts.flatMap((p) => p.spots), roads: parts.flatMap((p) => p.roads) });

/** Band joylarni (zona, bino) kesib tashlab, qolgan bo'laklarga alohida joylaydi; kesish tartibining eng yaxshisi tanlanadi. */
export const layoutCell = (input: LayoutInput, cutters: readonly Box4[]): LayoutResult => {
  const [x0, z0, x1, z1] = input.rect;
  if (!isUsable(input.rect)) return EMPTY;
  const hit = cutters.find((c) => boxTouches(c, (x0 + x1) / 2, (z0 + z1) / 2, (x1 - x0) / 2, (z1 - z0) / 2));
  if (!hit) return layoutRect(input);
  const rest = cutters.filter((c) => c !== hit);
  const [cx0, cz0, cx1, cz1] = [Math.max(x0, hit[0]), Math.max(z0, hit[1]), Math.min(x1, hit[2]), Math.min(z1, hit[3])];
  const splits: readonly (readonly Box4[])[] = [
    [[x0, z0, cx0, z1], [cx1, z0, x1, z1], [cx0, z0, cx1, cz0], [cx0, cz1, cx1, z1]],
    [[x0, z0, x1, cz0], [x0, cz1, x1, z1], [x0, cz0, cx0, cz1], [cx1, cz0, x1, cz1]],
  ];
  return best(splits.map((boxes) => merge(boxes.map((rect, i) => layoutCell({ ...input, id: `${input.id}${'abcd'[i]}`, rect }, rest)))));
};
