/** Ko'rinishga qarab chiziladigan narsalar ro'yxati: uylar, daraxtlar, binolar, yorliqlar. */
import { CIVIC, padHeight, type Building, type MasterPlan, type Plot, type SpatialIndex } from '../../../../packages/shared/src/index.ts';
import { toWorld, type Item } from '../logic/item.ts';
import { PLOT_SHELL, buildingItem, houseItem, plotItems, type HouseState } from '../logic/placement.ts';
import { distanceFrom, type View } from '../logic/view.ts';
import type { LabelInfo } from './labels.ts';
import type { SignInfo } from './signs.ts';

const BIG = new Set(['crane', 'office', 'office_low', 'bank', 'agentlik', 'novostroyka', 'choyxona', 'maktab', 'stadium', 'bridge', 'hero_statue', 'plaza_fountain', 'billboard']);
const TREES: Readonly<Record<string, string>> = { tree_chinor: 'tree_chinor_lod', tree_terak: 'tree_terak_lod', tree_archa: 'tree_archa' };
/** Yaqinda to'liq, uzoqda sodda shakl. */
const CIVIC_LODS: Readonly<Record<string, string>> = Object.fromEntries(CIVIC.map((c) => [c.id, `${c.id}_lod`]));
const FAR_LODS: Readonly<Record<string, string>> = { shop: 'shop_lod', office_low: 'office_low_lod' };
const CIVIC_NEAR = 2.2;
const CIVIC_SLACK = 25;
const BARRIER_FAR = 150;

export interface CollectSource {
  readonly plots: SpatialIndex<Plot>;
  readonly statics: SpatialIndex<Item>;
  readonly extras: SpatialIndex<Item>;
  readonly commerce: SpatialIndex<Item>;
  readonly plan: MasterPlan;
  readonly houses: ReadonlyMap<string, HouseState>;
  readonly open: ReadonlySet<number>;
  /** Uchastka bo'yicha kesh: yaqin (to'liq) va uzoq (bitta) ko'rinish. */
  readonly full: Map<string, readonly Item[]>;
  readonly simple: Map<string, Item>;
}

const labelOf = (p: Plot, s: HouseState): LabelInfo => {
  const [x, z] = toWorld(p, 0, p.d / 2 - 1);
  const size = p.type === 'qasr' ? 1.5 : p.type === 'villa' ? 1.2 : 1;
  return { key: p.id, text: `@${s.nick} · ${s.tier}★`, kind: s.label, badge: s.badge, x, y: padHeight(p) + 4.7 * size, z, size };
};

const fullItems = (src: CollectSource, p: Plot, s: HouseState | undefined): readonly Item[] => {
  const known = src.full.get(p.id);
  if (known) return known;
  const made = plotItems(p, s, src.open.has(p.districtId));
  src.full.set(p.id, made);
  return made;
};
const simpleItem = (src: CollectSource, p: Plot, s: HouseState, isSimple: boolean): Item => {
  const known = src.simple.get(p.id);
  if (known) return known;
  const made = houseItem(p, s, true, isSimple);
  src.simple.set(p.id, made);
  return made;
};

interface PlotResult { readonly items: Item[]; readonly labels: readonly LabelInfo[]; readonly signs: readonly SignInfo[] }

/** Lavhali uylar: yozuv modelning old yuzasida turadi. */
const SIGN_MODEL = 'sign_nick';
const SIGN_FACE = { y: 1.1, out: 0.07 } as const;
const signOf = (p: Plot, s: HouseState, list: readonly Item[]): SignInfo | null => {
  const board = s.nick ? list.find((i) => i.model === SIGN_MODEL) : undefined;
  return board && s.nick ? { key: p.id, text: `@${s.nick}`, x: board.x + Math.sin(board.yaw) * SIGN_FACE.out, y: board.y + SIGN_FACE.y, z: board.z + Math.cos(board.yaw) * SIGN_FACE.out, yaw: board.yaw } : null;
};
const collectPlots = (v: View, src: CollectSource, maxLabels: number): PlotResult => {
  const items: Item[] = [];
  const labels: { readonly d: number; readonly info: LabelInfo }[] = [];
  const signs: { readonly d: number; readonly info: SignInfo }[] = [];
  for (const p of src.plots.query(v.x, v.z, v.radius)) {
    if (v.isHidden(p.x, p.z)) continue;
    const s = src.houses.get(p.id);
    const d = distanceFrom(v, p.x, p.z);
    if (d < v.near) {
      const list = fullItems(src, p, s);
      items.push(...(d < v.detail ? list : list.slice(0, PLOT_SHELL)));
      const sign = s && d < v.detail ? signOf(p, s, list) : null;
      if (sign) signs.push({ d, info: sign });
    } else if (s) items.push(simpleItem(src, p, s, v.isSimple));
    if (s?.nick && d < v.label) labels.push({ d, info: labelOf(p, s) });
  }
  labels.sort((a, b) => a.d - b.d);
  signs.sort((a, b) => a.d - b.d);
  return { items, labels: labels.slice(0, maxLabels).map((l) => l.info), signs: signs.map((x) => x.info) };
};

const staticItem = (v: View, it: Item, d: number): Item | null => {
  const civic = CIVIC_LODS[it.model];
  if (civic) return d < v.near * CIVIC_NEAR ? it : { ...it, model: civic };
  if (d < v.near || BIG.has(it.model)) return it;
  const tree = TREES[it.model];
  if (tree) return d < v.tree ? { ...it, model: tree } : null;
  if (it.model === 'barrier') return d < Math.max(v.small, BARRIER_FAR) ? it : null;
  return it.model === 'street_lamp' && d < v.small ? it : null;
};
const collectStatics = (v: View, list: readonly Item[]): Item[] => list.flatMap((it) => {
  if (v.isHidden(it.x, it.z, CIVIC_LODS[it.model] ? CIVIC_SLACK : 0)) return [];
  const shown = staticItem(v, it, distanceFrom(v, it.x, it.z));
  return shown ? [shown] : [];
});

const collectCommerce = (v: View, list: readonly Item[]): Item[] => list.flatMap((it) => {
  if (v.isHidden(it.x, it.z)) return [];
  const lod = FAR_LODS[it.model];
  return [lod && distanceFrom(v, it.x, it.z) > v.near * 1.4 ? { ...it, model: lod } : it];
});
const BUILDING_SLACK = 25;
const collectBuildings = (v: View, list: readonly Building[]): Item[] => list.flatMap((b) => {
  const d = Math.hypot(b.x - v.x, b.z - v.z);
  if (d >= v.far || v.isHidden(b.x, b.z, BUILDING_SLACK)) return [];
  return [buildingItem(b, distanceFrom(v, b.x, b.z) > v.near * 2)];
});

export const collect = (v: View, src: CollectSource, maxLabels: number): PlotResult => {
  const plots = collectPlots(v, src, maxLabels);
  return {
    labels: plots.labels, signs: plots.signs,
    items: [
      ...plots.items, ...collectStatics(v, src.statics.query(v.x, v.z, v.far)), ...collectStatics({ ...v, near: v.near * 1.6 }, src.extras.query(v.x, v.z, v.far)),
      ...collectCommerce(v, src.commerce.query(v.x, v.z, v.far)), ...collectBuildings(v, src.plan.buildings),
    ],
  };
};
