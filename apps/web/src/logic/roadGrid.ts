/** Yo'llarni tez topish: 50 m yacheykalarga bo'lingan ro'yxat (har nuqta uchun yuzlab yo'lni tekshirmaslik uchun). */
import { inTilted, type MasterPlan, type Road } from '../../../../packages/shared/src/index.ts';

const CELL = 50;
const REACH = 20;
type Grid = ReadonlyMap<string, readonly Road[]>;
const cache = new WeakMap<MasterPlan, Grid>();
const cellOf = (v: number): number => Math.floor(v / CELL);

const build = (plan: MasterPlan): Grid => {
  const cells = new Map<string, Road[]>();
  for (const r of plan.roads) {
    const a = r.angle ?? 0;
    const [c, s] = [Math.abs(Math.cos(a)), Math.abs(Math.sin(a))];
    const hx = (r.w * c + r.d * s) / 2 + REACH;
    const hz = (r.w * s + r.d * c) / 2 + REACH;
    for (let i = cellOf(r.x - hx); i <= cellOf(r.x + hx); i++) {
      for (let j = cellOf(r.z - hz); j <= cellOf(r.z + hz); j++) {
        // Qiyshiq yo'lning qutisi katta: yacheykaga haqiqatan yaqinligi tekshiriladi.
        if (a !== 0 && !inTilted(r, (i + 0.5) * CELL, (j + 0.5) * CELL, CELL + REACH)) continue;
        const key = `${i},${j}`;
        const list = cells.get(key);
        if (list) list.push(r);
        else cells.set(key, [r]);
      }
    }
  }
  return cells;
};
/** Shu nuqta atrofidagi (20 m gacha) yo'llar. */
export const roadsNear = (plan: MasterPlan, x: number, z: number): readonly Road[] => {
  const grid = cache.get(plan) ?? build(plan);
  cache.set(plan, grid);
  return grid.get(`${cellOf(x)},${cellOf(z)}`) ?? [];
};
export const isOnRoad = (plan: MasterPlan, x: number, z: number, margin = 0, isOwn: (r: Road) => boolean = () => false): boolean =>
  roadsNear(plan, x, z).some((r) => !isOwn(r) && inTilted(r, x, z, margin));
