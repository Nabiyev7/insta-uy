/** Piyoda/mashina paydo bo'ladigan joy: ochiq yerda va oldida kamida 8 m bo'sh yo'l (sof hisob). */
import type { Solid } from './item.ts';
import { movePlayer, type Point } from './motion.ts';

export const CLEAR_AHEAD = 8;
const STEP = 0.5;
const DIRECTIONS = 8;
const RINGS = [0, 3, 6, 10, 15, 21, 28] as const;

/** Shu yo'nalishda (yaw: oldinga = sin, cos) to'siqqa urilmay qancha yurish mumkin. */
export const clearDistance = (from: Point, yaw: number, solids: readonly Solid[], max = CLEAR_AHEAD): number => {
  const dx = Math.sin(yaw) * STEP;
  const dz = Math.cos(yaw) * STEP;
  let p = from;
  let gone = 0;
  while (gone < max) {
    const next = movePlayer(p, dx, dz, solids);
    const progress = (next.x - p.x) * Math.sin(yaw) + (next.z - p.z) * Math.cos(yaw);
    if (progress < STEP * 0.6) break;
    p = next;
    gone += progress;
  }
  return gone;
};

const settle = (p: Point, solids: readonly Solid[]): Point => [0, 1, 2, 3].reduce<Point>((q) => movePlayer(q, 0, 0, solids), p);
const angleGap = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** Kamera yo'nalishiga eng yaqin bo'sh tomon; joy tiqilgan bo'lsa — atrofdan (halqalar bo'yicha) ochiq joy. */
export const openSpawn = (start: Point, yaw: number, solids: readonly Solid[]): { readonly x: number; readonly z: number; readonly yaw: number } => {
  const yaws = Array.from({ length: DIRECTIONS }, (_, i) => yaw + (i * Math.PI * 2) / DIRECTIONS).sort((a, b) => angleGap(a, yaw) - angleGap(b, yaw));
  for (const r of RINGS) {
    const points = r === 0 ? [start] : Array.from({ length: DIRECTIONS }, (_, i) => ({ x: start.x + Math.sin(yaw + (i * Math.PI * 2) / DIRECTIONS) * r, z: start.z + Math.cos(yaw + (i * Math.PI * 2) / DIRECTIONS) * r }));
    for (const raw of points) {
      const p = settle(raw, solids);
      const ok = yaws.find((y) => clearDistance(p, y, solids) >= CLEAR_AHEAD);
      if (ok !== undefined) return { x: p.x, z: p.z, yaw: ok };
    }
  }
  const p = settle(start, solids);
  return { x: p.x, z: p.z, yaw };
};
