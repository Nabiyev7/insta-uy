import type { MasterPlan, Plot, PlotType, Rot } from '../types.ts';

const TYPES: readonly PlotType[] = ['hovli', 'kvartira', 'villa', 'qasr'];
type PlotRow = readonly number[];
export interface EncodedPlan extends Omit<MasterPlan, 'plots'> { readonly plots: readonly PlotRow[] }

/** Uchastkalar sonlar massiviga siqiladi; ID tartib raqamidan tiklanadi. */
export const encodePlan = (p: MasterPlan): EncodedPlan => ({
  ...p,
  plots: p.plots.map((q): PlotRow => [
    q.districtId, q.streetId, q.number, q.unit, TYPES.indexOf(q.type), q.x, q.z, q.w, q.d, q.rot, q.building, q.value,
  ]),
});

const decodeRow = (r: PlotRow, i: number): Plot => {
  const [districtId = 0, streetId = 0, number = 0, unit = 0, type = 0, x = 0, z = 0, w = 0, d = 0, rot = 0, building = 0, value = 0] = r;
  return {
    id: `P${String(i + 1).padStart(4, '0')}`, districtId, streetId, number, unit, type: TYPES[type] ?? 'hovli',
    x, z, w, d, rot: rot as Rot, building, value,
  };
};

export const decodePlan = (e: EncodedPlan): MasterPlan => ({ ...e, plots: e.plots.map(decodeRow) });
