import type { Road, Rot, StreetKind } from '../types.ts';
import { AVENUE, STREET } from './geometry.ts';

/** Generator ichidagi vaqtinchalik uchastka joyi. */
export interface Spot {
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
  /** Ko'cha kaliti: "a:z:0" (prospekt) yoki "s:<tuman>:<n>". */
  readonly streetKey: string;
  /** Qator kaliti va undagi indeks — qo'shnilarni topish uchun. */
  readonly row: string;
  readonly index: number;
}
export interface GridSpec {
  readonly district: number;
  readonly rect: readonly [number, number, number, number];
  readonly plotW: number;
  readonly plotD: number;
  readonly crossStreets: number;
  readonly transpose: boolean;
  readonly blocked: (x: number, z: number, w: number, d: number) => boolean;
  readonly roadBlocked: (x: number, z: number) => boolean;
}
export interface GridResult {
  readonly spots: readonly Spot[];
  readonly roads: readonly Road[];
}

const ROAD_STEP = 4;

/** Uzun yo'lni to'siqlardan (ko'l, maydon) tozalab bo'laklarga ajratadi. */
export const clipRoad = (
  axis: 'x' | 'z', from: number, to: number, fixed: number, width: number,
  kind: StreetKind, blocked: (x: number, z: number) => boolean,
): Road[] => {
  const out: Road[] = [];
  let start: number | null = null;
  const flush = (end: number): void => {
    if (start === null) return;
    const len = end - start;
    const mid = start + len / 2;
    if (len > ROAD_STEP * 2) {
      out.push(axis === 'x' ? { x: mid, z: fixed, w: len, d: width, kind } : { x: fixed, z: mid, w: width, d: len, kind });
    }
    start = null;
  };
  for (let p = from; p < to; p += ROAD_STEP) {
    const c = p + ROAD_STEP / 2;
    const isBlocked = axis === 'x' ? blocked(c, fixed) : blocked(fixed, c);
    if (isBlocked) flush(p);
    else start ??= p;
  }
  flush(to);
  return out;
};

/** Ikki qatorli (orqama-orqa) kvartallar to'ri. Mahalliy o'qlar: u — ko'cha bo'ylab, v — ko'ndalang. */
export const layoutGrid = (spec: GridSpec): GridResult => {
  const [x0, z0, x1, z1] = spec.rect;
  const t = spec.transpose;
  const [u0, u1, v0, v1] = t ? [z0, z1, x0, x1] : [x0, x1, z0, z1];
  const lenU = u1 - u0;
  const lenV = v1 - v0;
  const blockD = spec.plotD * 2;
  const blocks = Math.floor((lenV + STREET) / (blockD + STREET));
  const usedV = blocks * blockD + (blocks - 1) * STREET;
  const startV = v0 + (lenV - usedV) / 2;
  const segments = spec.crossStreets + 1;
  const segLen = (lenU - spec.crossStreets * STREET) / segments;
  const perSeg = Math.floor(segLen / spec.plotW);
  const pad = (segLen - perSeg * spec.plotW) / 2;

  const toXZ = (u: number, v: number): readonly [number, number] => (t ? [v, u] : [u, v]);
  // Chekka qatorlar tashqi prospektga qaraydi; prospekt o'qi tuman chetidan AVENUE/2 tashqarida.
  const avenueKey = (v: number): string => `a:${t ? 'x' : 'z'}:${Math.round(v)}`;
  const streetKeyOf = (b: number, side: number): string => {
    if (side === 0) return b === 0 ? avenueKey(v0 - AVENUE / 2) : `s:${spec.district}:${b}`;
    return b === blocks - 1 ? avenueKey(v1 + AVENUE / 2) : `s:${spec.district}:${b + 1}`;
  };

  const rowSpots = (b: number, side: number): Spot[] => {
    const v = startV + b * (blockD + STREET) + spec.plotD * (side + 0.5);
    const rot: Rot = side === 0 ? (t ? 3 : 2) : (t ? 1 : 0);
    const out: Spot[] = [];
    for (let s = 0; s < segments; s++) {
      const su = u0 + s * (segLen + STREET) + pad;
      for (let i = 0; i < perSeg; i++) {
        const [x, z] = toXZ(su + (i + 0.5) * spec.plotW, v);
        const [w, d] = t ? [spec.plotD, spec.plotW] : [spec.plotW, spec.plotD];
        if (spec.blocked(x, z, w, d)) continue;
        out.push({ x, z, w: spec.plotW, d: spec.plotD, rot, streetKey: streetKeyOf(b, side), row: `${b}:${side}:${s}`, index: i });
      }
    }
    return out;
  };

  const spots: Spot[] = [];
  const roads: Road[] = [];
  for (let b = 0; b < blocks; b++) {
    spots.push(...rowSpots(b, 0), ...rowSpots(b, 1));
    if (b === 0) continue;
    const v = startV + b * (blockD + STREET) - STREET / 2;
    roads.push(...clipRoad(t ? 'z' : 'x', u0, u1, v, STREET, 'kocha', spec.roadBlocked));
  }
  for (let s = 1; s < segments; s++) {
    const u = u0 + s * segLen + (s - 0.5) * STREET;
    roads.push(...clipRoad(t ? 'x' : 'z', v0, v1, u, STREET, 'kocha', spec.roadBlocked));
  }
  return { spots, roads };
};
