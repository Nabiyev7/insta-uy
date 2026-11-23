import { CITY_HALF, LAKE, inLake } from '../../../../packages/shared/src/index.ts';
import type { Solid } from './item.ts';

export const PLAYER_RADIUS = 0.45;
export const CITY_LIMIT = CITY_HALF + 60;

export interface Point { readonly x: number; readonly z: number }

/** To'siqdan sirpanib chiqaradi: eng qisqa o'q bo'ylab. */
const pushOut = (p: Point, s: Solid): Point => {
  const dx = p.x - s.x;
  const dz = p.z - s.z;
  const ox = s.hx + PLAYER_RADIUS - Math.abs(dx);
  const oz = s.hz + PLAYER_RADIUS - Math.abs(dz);
  if (ox <= 0 || oz <= 0) return p;
  return ox < oz ? { x: p.x + (dx < 0 ? -ox : ox), z: p.z } : { x: p.x, z: p.z + (dz < 0 ? -oz : oz) };
};

const keepOffLake = (p: Point, hasBridge: boolean): Point => {
  if (!inLake(p.x, p.z, 1)) return p;
  if (hasBridge && Math.abs(p.x - LAKE.x) < 4) return p;
  const a = Math.atan2((p.z - LAKE.z) / (LAKE.rz + 1), (p.x - LAKE.x) / (LAKE.rx + 1));
  return { x: LAKE.x + Math.cos(a) * (LAKE.rx + 1.05), z: LAKE.z + Math.sin(a) * (LAKE.rz + 1.05) };
};

export const movePlayer = (from: Point, dx: number, dz: number, solids: readonly Solid[], hasBridge = false): Point => {
  const target = { x: from.x + dx, z: from.z + dz };
  const pushed = solids.reduce(pushOut, target);
  const dry = keepOffLake(pushed, hasBridge);
  const clamp = (v: number): number => Math.max(-CITY_LIMIT, Math.min(CITY_LIMIT, v));
  return { x: clamp(dry.x), z: clamp(dry.z) };
};

/** Kamera va odam orasida devor bo'lsa, masofani qisqartiradi. */
export const cameraDistance = (from: Point, dirX: number, dirZ: number, wanted: number, height: number, solids: readonly Solid[]): number => {
  for (let d = 1; d <= wanted; d += 0.5) {
    const x = from.x + dirX * d;
    const z = from.z + dirZ * d;
    if (solids.some((s) => height < s.h && Math.abs(x - s.x) < s.hx + 0.3 && Math.abs(z - s.z) < s.hz + 0.3)) return Math.max(1.2, d - 0.6);
  }
  return wanted;
};

export interface Ray { readonly ox: number; readonly oy: number; readonly oz: number; readonly dx: number; readonly dy: number; readonly dz: number }
export interface PickBox { readonly id: string; readonly x: number; readonly z: number; readonly hx: number; readonly hz: number; readonly y0: number; readonly y1: number }

const slab = (o: number, d: number, lo: number, hi: number): readonly [number, number] => {
  if (Math.abs(d) < 1e-9) return o < lo || o > hi ? [Infinity, -Infinity] : [-Infinity, Infinity];
  const a = (lo - o) / d;
  const b = (hi - o) / d;
  return a < b ? [a, b] : [b, a];
};
export const rayBox = (r: Ray, b: PickBox): number | null => {
  const sx = slab(r.ox, r.dx, b.x - b.hx, b.x + b.hx);
  const sy = slab(r.oy, r.dy, b.y0, b.y1);
  const sz = slab(r.oz, r.dz, b.z - b.hz, b.z + b.hz);
  const near = Math.max(sx[0], sy[0], sz[0]);
  const far = Math.min(sx[1], sy[1], sz[1]);
  return near <= far && far > 0 ? Math.max(0, near) : null;
};
/** Uyni bosish: nur bilan kesishgan eng yaqin quti. */
export const pickNearest = (r: Ray, boxes: readonly PickBox[]): string | null => {
  let best: string | null = null;
  let bestT = Infinity;
  for (const b of boxes) {
    const t = rayBox(r, b);
    if (t !== null && t < bestT) {
      bestT = t;
      best = b.id;
    }
  }
  return best;
};

export const lerpAngle = (a: number, b: number, t: number): number => {
  const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
};
