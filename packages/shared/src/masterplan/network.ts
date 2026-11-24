/** Yo'llar tarmog'i: katak prospektlar, 375 m ko'chalar, halqa, diagonallar, bulvar yon ko'chalari, zona atrofi. */
import type { Road, StreetKind } from '../types.ts';
import {
  AVENUE, AVENUE_LINES, CITY_HALF, DIAGONAL, LAKE, LAKE_ROAD, PARK_R, RING, RIVER, STREET, STREET_LINES, boxHitsTilted, inLake, inRiverbed, inTilted, type Tilted,
} from './geometry.ts';
import { ZONES, inBox, type ZoneId } from './zones.ts';

/** `key` — ko'cha kaliti: uchastka manzili shu kalitdan olinadi. */
export interface NetRoad extends Road { readonly key: string }

const ROAD_STEP = 4;
/** Uzun yo'lni to'siqlardan (ko'l, maydon, zona) tozalab bo'laklarga ajratadi. */
export const clipRoad = (
  axis: 'x' | 'z', from: number, to: number, fixed: number, width: number, kind: StreetKind, key: string, blocked: (x: number, z: number) => boolean,
): NetRoad[] => {
  const out: NetRoad[] = [];
  let start: number | null = null;
  const flush = (end: number): void => {
    if (start === null) return;
    const len = end - start;
    const mid = start + len / 2;
    if (len > ROAD_STEP * 2) out.push(axis === 'x' ? { x: mid, z: fixed, w: len, d: width, kind, key } : { x: fixed, z: mid, w: width, d: len, kind, key });
    start = null;
  };
  for (let p = from; p < to; p += ROAD_STEP) {
    const c = Math.min(p + ROAD_STEP / 2, to);
    const isBlocked = axis === 'x' ? blocked(c, fixed) : blocked(fixed, c);
    if (isBlocked) flush(p);
    else start ??= p;
  }
  flush(to);
  return out;
};

const M = STREET / 2;
const inZone = (id: ZoneId, x: number, z: number): boolean => inBox(ZONES[id].rect, x, z);
const inBulvar = (x: number, z: number): boolean => inZone('bulvar', x, z) || inZone('bulvarKichik', x, z);
/** Mashina kirmaydigan joylar: maydon, bulvarlar, bog', ko'l. */
export const isPedestrian = (x: number, z: number): boolean => Math.hypot(x, z) < PARK_R + M || inBulvar(x, z) || inZone('dam', x, z) || inLake(x, z, LAKE_ROAD - LAKE.rx);

/** Bosh o'q (x = 0) ma'muriy va savdo markazlariga kirmaydi: 1125-ko'chada tugaydi. */
const onAxis = (x: number, z: number): boolean => x === 0 && Math.abs(z) < 1125;

const gridRoads = (): NetRoad[] => {
  const E = CITY_HALF;
  const blocked = (x: number, z: number): boolean => isPedestrian(x, z) || onAxis(x, z);
  const line = (kind: StreetKind, width: number, tag: string) => (l: number): NetRoad[] => [
    ...clipRoad('x', -E, E, l, width, kind, `${tag}:x:${l}`, blocked), ...clipRoad('z', -E, E, l, width, kind, `${tag}:z:${l}`, blocked),
  ];
  return [...AVENUE_LINES.flatMap(line('prospekt', AVENUE, 'a')), ...STREET_LINES.flatMap(line('kocha', STREET, 'k'))];
};

const SEGMENTS = { ring: 72, lake: 48, arc: 8 } as const;
const arc = (cx: number, cz: number, r: number, width: number, from: number, to: number, n: number, kind: Road['kind'], key: string): NetRoad[] =>
  Array.from({ length: n }, (_, i): NetRoad => {
    const step = (to - from) / n;
    const t = from + (i + 0.5) * step;
    return { x: cx + Math.cos(t) * r, z: cz + Math.sin(t) * r, w: 2 * (r + width / 2) * Math.tan(step / 2) + 0.1, d: width, kind, key, angle: t + Math.PI / 2 };
  });
const TAU = Math.PI * 2;

export const ringRoads = (): NetRoad[] => arc(0, 0, RING.r, RING.w, 0, TAU, SEGMENTS.ring, 'halqa', 'ring');
const lakeRoads = (): NetRoad[] => arc(LAKE.x, LAKE.z, LAKE_ROAD, STREET, 0, TAU, SEGMENTS.lake, 'kocha', 'lake');

export const diagonalRoads = (): NetRoad[] => {
  const end = CITY_HALF * Math.SQRT2;
  const lakeAt = Math.hypot(LAKE.x, LAKE.z);
  const part = (angle: number, from: number, to: number): NetRoad => {
    const mid = (from + to) / 2;
    return { x: Math.cos(angle) * mid, z: Math.sin(angle) * mid, w: to - from, d: DIAGONAL.w, kind: 'diagonal', key: `d:${Math.round((angle * 180) / Math.PI)}`, angle };
  };
  return [1, 3, 5, 7].flatMap((k) => {
    const angle = (k * Math.PI) / 4;
    // Janubi-sharqdagi prospekt ko'lga borib, narigi qirg'oqdan davom etadi.
    return k === 1 ? [part(angle, DIAGONAL.from, lakeAt - LAKE_ROAD), part(angle, lakeAt + LAKE_ROAD, end)] : [part(angle, DIAGONAL.from, end)];
  });
};

/** Bulvar chetidagi ko'chalar va maydon bog'ini aylanib o'tadigan yoylar. */
const boulevardRoads = (): NetRoad[] => {
  const [bx0, , bx1, bz] = ZONES.bulvar.rect;
  const [, kz0, kx, kz1] = ZONES.bulvarKichik.rect;
  const inPark = (x: number, z: number): boolean => Math.hypot(x, z) < PARK_R;
  const big = [-1, 1].flatMap((s) => clipRoad('x', bx0, bx1, s * (bz + M), STREET, 'kocha', `b:x:${s}`, inPark));
  const small = [-1, 1].flatMap((s) => clipRoad('z', kz0, kz1, s * (kx + M), STREET, 'kocha', `b:z:${s}`, (x, z) => inPark(x, z) || Math.abs(z) < bz));
  const a0 = Math.asin((bz + M) / PARK_R);
  const a1 = Math.acos((kx + M) / PARK_R);
  const arcs = [[a0, a1], [Math.PI - a1, Math.PI - a0], [Math.PI + a0, Math.PI + a1], [TAU - a1, TAU - a0]] as const;
  return [...big, ...small, ...arcs.flatMap(([from, to]) => arc(0, 0, PARK_R, STREET, from, to, SEGMENTS.arc, 'kocha', 'b:park'))];
};

type Side = 'n' | 's' | 'w' | 'e';
/** Zona atrofidagi ko'chalar (zonadan tashqarida). */
const AROUND: readonly (readonly [ZoneId, readonly Side[]])[] = [
  ['mamuriy', ['n', 's', 'w', 'e']], ['savdo', ['n', 's', 'w', 'e']], ['biznes', ['n', 's', 'w', 'e']], ['dam', ['n', 's', 'e']],
  ['tepalik', ['s', 'e']], ['kvartira1', ['s', 'w']], ['kvartira2', ['n', 'e']],
];
const aroundRoads = (): NetRoad[] => AROUND.flatMap(([id, sides]) => {
  const [x0, z0, x1, z1] = ZONES[id].rect;
  const E = CITY_HALF;
  const cut = (v: number): number => Math.max(-E, Math.min(E, v));
  const [a, b, c, d] = [cut(x0 - STREET), cut(x1 + STREET), cut(z0 - STREET), cut(z1 + STREET)];
  const make: Readonly<Record<Side, () => NetRoad[]>> = {
    n: () => clipRoad('x', a, b, z0 - M, STREET, 'kocha', `p:${id}:n`, inBulvar), s: () => clipRoad('x', a, b, z1 + M, STREET, 'kocha', `p:${id}:s`, inBulvar),
    w: () => clipRoad('z', c, d, x0 - M, STREET, 'kocha', `p:${id}:w`, inBulvar), e: () => clipRoad('z', c, d, x1 + M, STREET, 'kocha', `p:${id}:e`, inBulvar),
  };
  return sides.flatMap((s) => make[s]());
});

const BANK = RIVER.half + M;
const BANK_OVERLAP = 5;
/** Daryo yo'lagining ikki qirg'og'idagi ko'chalar: shahar chetida va ko'l ko'chasida tugaydi. */
const bankRoads = (): NetRoad[] => {
  const p: readonly (readonly [number, number])[] = RIVER.points;
  return p.slice(1).flatMap(([bx, bz], i) => {
    const [ax, az] = p[i] ?? [bx, bz];
    const len = Math.hypot(bx - ax, bz - az);
    const [ux, uz] = [(bx - ax) / len, (bz - az) / len];
    return [-1, 1].flatMap((side): NetRoad[] => {
      const at = (t: number): readonly [number, number] => [ax + ux * t - uz * BANK * side, az + uz * t + ux * BANK * side];
      const isOn = (t: number): boolean => { const [x, z] = at(t); return x < CITY_HALF - M && Math.hypot(x - LAKE.x, z - LAKE.z) > LAKE_ROAD; };
      const steps = Array.from({ length: Math.floor(len) + 1 }, (_, t) => t).filter(isOn);
      const [from, to] = [(steps[0] ?? 0) - BANK_OVERLAP, (steps.at(-1) ?? 0) + BANK_OVERLAP];
      if (steps.length < ROAD_STEP) return [];
      const [x, z] = at((from + to) / 2);
      return [{ x, z, w: to - from, d: STREET, kind: 'kocha', key: `r:${side}:${i}`, angle: Math.atan2(uz, ux) }];
    });
  });
};

export const networkRoads = (): NetRoad[] => [...gridRoads(), ...ringRoads(), ...diagonalRoads(), ...boulevardRoads(), ...aroundRoads(), ...lakeRoads(), ...bankRoads()];

/** Daryo yo'lagi (qirg'oq ko'chalari bilan) burilgan to'rtburchaklar sifatida. */
export const riverStrips = (): Tilted[] => {
  const p: readonly (readonly [number, number])[] = RIVER.points;
  return p.slice(1).map(([bx, bz], i): Tilted => {
    const [ax, az] = p[i] ?? [bx, bz];
    return { x: (ax + bx) / 2, z: (az + bz) / 2, w: Math.hypot(bx - ax, bz - az), d: (RIVER.half + STREET) * 2, angle: Math.atan2(bz - az, bx - ax) };
  });
};
const STRIPS = riverStrips();
const JOINTS: readonly (readonly [number, number])[] = RIVER.points;
/** Quti bilan nuqta orasidagi eng qisqa va eng uzun masofa. */
export const boxReach = (cx: number, cz: number, x: number, z: number, hx: number, hz: number): readonly [number, number] => {
  const [dx, dz] = [Math.abs(x - cx), Math.abs(z - cz)];
  return [Math.hypot(Math.max(0, dx - hx), Math.max(0, dz - hz)), Math.hypot(dx + hx, dz + hz)];
};
export const boxInRiver = (x: number, z: number, hx: number, hz: number): boolean =>
  STRIPS.some((s) => boxHitsTilted(x, z, hx, hz, s)) || JOINTS.some(([jx, jz]) => boxReach(jx, jz, x, z, hx, hz)[0] < RIVER.half + STREET);

const DIAGONALS = diagonalRoads();
/** Uchastka tegmasligi kerak bo'lgan qiyshiq narsalar: halqa, diagonal, daryo, ko'l, maydon bog'i. */
export const boxInCurves = (x: number, z: number, hx: number, hz: number): boolean => {
  const [near, far] = boxReach(0, 0, x, z, hx, hz);
  if (near < PARK_R + M) return true;
  if (near < RING.r + RING.w / 2 && far > RING.r - RING.w / 2) return true;
  if (boxReach(LAKE.x, LAKE.z, x, z, hx, hz)[0] < LAKE_ROAD + M) return true;
  return DIAGONALS.some((d) => boxHitsTilted(x, z, hx, hz, d)) || boxInRiver(x, z, hx, hz);
};
/** Ichki ko'cha kirmaydigan joylar. */
export const isInnerRoadBlocked = (x: number, z: number): boolean => isPedestrian(x, z) || inRiverbed(x, z);
export const roadAt = (roads: readonly NetRoad[], x: number, z: number): NetRoad | undefined => roads.find((r) => inTilted(r, x, z));
