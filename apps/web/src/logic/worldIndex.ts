/** Bosh rejaning fazoviy indekslari va to'siqlar — bir marta quriladi, hamma qatlam ishlatadi. */
import { PLAZA_HALF, SpatialIndex, type Commerce, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { plotSolid, treeSolid } from './drive.ts';
import type { Item, Solid } from './item.ts';
import { buildingSolid, commerceSolid, houseSolid, staticItems, type HouseState } from './placement.ts';
import { PLAZA_SOLIDS } from './plaza.ts';

export interface WorldIndex { readonly plots: SpatialIndex<Plot>; readonly commerce: SpatialIndex<Commerce>; readonly statics: SpatialIndex<Item> }
const cache = new WeakMap<MasterPlan, WorldIndex>();

export const worldIndex = (plan: MasterPlan): WorldIndex => {
  const known = cache.get(plan);
  if (known) return known;
  const made: WorldIndex = {
    plots: new SpatialIndex(plan.plots.filter((p) => p.type !== 'kvartira')),
    commerce: new SpatialIndex(plan.commerce),
    statics: new SpatialIndex(staticItems(plan)),
  };
  cache.set(plan, made);
  return made;
};

const BUILDING_REACH = 40;
const PLAZA_REACH = PLAZA_HALF + 6;
const isSolid = (s: Solid | null): s is Solid => s !== null;

const sharedSolids = (plan: MasterPlan, x: number, z: number): Solid[] => [
  ...plan.buildings.filter((b) => Math.abs(b.x - x) < BUILDING_REACH && Math.abs(b.z - z) < BUILDING_REACH).map(buildingSolid),
  ...worldIndex(plan).commerce.query(x, z, BUILDING_REACH).map(commerceSolid).filter(isSolid),
  ...(Math.abs(x) < PLAZA_REACH && Math.abs(z) < PLAZA_REACH ? PLAZA_SOLIDS : []),
];
/** Piyoda uchun: uylar, binolar, maydon. */
export const walkSolids = (plan: MasterPlan, houses: ReadonlyMap<string, HouseState>, x: number, z: number, near: readonly Plot[]): Solid[] => [
  ...near.map((p) => { const s = houses.get(p.id); return s ? houseSolid(p, s) : null; }).filter(isSolid), ...sharedSolids(plan, x, z),
];
const CAR_PLOT_REACH = 60;
const CAR_TREE_REACH = 14;
/** Mashina uchun: uchastkalarning o'zi, binolar, daraxt va chiroqlar. */
export const carSolids = (plan: MasterPlan, x: number, z: number): Solid[] => [
  ...worldIndex(plan).plots.query(x, z, CAR_PLOT_REACH).map(plotSolid), ...sharedSolids(plan, x, z),
  ...worldIndex(plan).statics.query(x, z, CAR_TREE_REACH).map(treeSolid).filter(isSolid),
];
