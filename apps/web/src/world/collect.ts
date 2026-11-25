/** Ko'rinishga qarab chiziladigan narsalar ro'yxati: uylar, daraxtlar, binolar, yorliqlar. */
import { CIVIC, LUXE_MODELS, isFreeType, type Building, type MasterPlan, type Plot, type SpatialIndex } from '../../../../packages/shared/src/index.ts';
import type { Item } from '../logic/item.ts';
import { BOARD, buildingItem, houseItem, houseTop, plotItems, shellSize, type HouseState } from '../logic/placement.ts';
import { distanceFrom, type View } from '../logic/view.ts';
import type { LabelInfo } from './labels.ts';
import type { SignInfo } from './signs.ts';

const BIG = new Set(['crane', 'office', 'office_low', 'bank', 'agentlik', 'novostroyka', 'choyxona', 'maktab', 'stadium', 'bridge', 'hero_statue', 'plaza_fountain', 'billboard', 'kafe', 'sport']);
const TREES: Readonly<Record<string, string>> = { tree_chinor: 'tree_chinor_lod', tree_round: 'tree_round_lod', tree_wide: 'tree_round_lod', tree_tall: 'tree_terak_lod', tree_terak: 'tree_terak_lod', tree_archa: 'tree_archa' };
/** Uzoq shakli balandroq chizilgan daraxtlar shu nisbatda kichrayadi. */
const TREE_FIT: Readonly<Record<string, number>> = { tree_tall: 0.72 };
/** Yaqinda to'liq, uzoqda sodda shakl. */
const CIVIC_LODS: Readonly<Record<string, string>> = Object.fromEntries(CIVIC.map((c) => [c.id, `${c.id}_lod`]));
const FAR_LODS: Readonly<Record<string, string>> = { shop: 'shop_lod', office_low: 'office_low_lod' };
const LUXE_LODS: Readonly<Record<string, string>> = Object.fromEntries([...LUXE_MODELS].map((m) => [m, `${m}_lod`]));
/** Lyuks bezak shu masofadan (mayda bezaklar ko'rinadigan masofaning ulushi) sodda shaklda. */
const LUXE_NEAR = 0.6;
/** "+" belgisi yorliqlar ko'rinadigan masofaning shuncha baravarigacha (baland ko'rinishda yo'q). */
const MARKER_RANGE = 1.8;
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
  /** Hozir qurilayotgan uchastka: taxtachasi va daraxti ko'rinmaydi. */
  readonly building: string | null;
  /** Uchastka bo'yicha kesh: yaqin (to'liq) va uzoq (bitta) ko'rinish. */
  readonly full: Map<string, readonly Item[]>;
  readonly simple: Map<string, Item>;
}

const LABEL_GAP = 2;
const labelOf = (p: Plot, s: HouseState): LabelInfo => {
  const top = houseTop(p, s);
  const size = p.type === 'qasr' ? 1.5 : p.type === 'villa' ? 1.2 : 1;
  return { key: p.id, text: `@${s.nick} · L${s.tier}${s.isTest ? ' · SINOV' : ''}`, kind: s.label, badge: s.badge, hearts: s.hearts, x: top.x, y: top.y + LABEL_GAP * size, z: top.z, size };
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

interface PlotResult { readonly items: Item[]; readonly labels: readonly LabelInfo[]; readonly signs: readonly SignInfo[]; /** Ko'rinayotgan "Bo'sh joy" taxtachalari. */ readonly boards: readonly Item[]; /** "+" belgisi chiqadigan bo'sh joylar, yaqinidan. */ readonly free: readonly Plot[] }

/** Lavhali uylar: yozuv modelning old yuzasida turadi. */
const SIGN_MODEL = 'sign_nick';
const SIGN_FACE = { y: 2.16, out: 0.07 } as const;
const signOf = (p: Plot, s: HouseState, list: readonly Item[]): SignInfo | null => {
  const board = s.nick ? list.find((i) => i.model === SIGN_MODEL) : undefined;
  return board && s.nick ? { key: p.id, text: `@${s.nick}`, x: board.x + Math.sin(board.yaw) * SIGN_FACE.out, y: board.y + SIGN_FACE.y, z: board.z + Math.cos(board.yaw) * SIGN_FACE.out, yaw: board.yaw } : null;
};
/** Uzoq shakllar bir marta yasaladi: har kadrda minglab yangi obyekt yaratilmasin. */
const lodCache = new WeakMap<Item, Item>();
const asLod = (it: Item, model: string, k = 1): Item => {
  const known = lodCache.get(it);
  if (known) return known;
  const made: Item = { ...it, model, sy: it.sy * k };
  lodCache.set(it, made);
  return made;
};
/** Bo'sh uchastka: daraxtlar (uzoqda sodda), taxtacha faqat yaqinda. Yopiq tumanda — qurilish belgilari. */
const collectEmpty = (v: View, src: CollectSource, p: Plot, d: number, items: Item[], boards: Item[]): void => {
  if (src.building === p.id) return;
  for (const it of fullItems(src, p, undefined)) {
    if (it.model === BOARD) {
      if (d >= v.detail) continue;
      boards.push(it);
      items.push(it);
      continue;
    }
    const lod = d < v.near ? undefined : TREES[it.model];
    if (d < v.near || lod) items.push(lod ? asLod(it, lod) : it);
  }
};
/** Yaqin hovlidagi hamma bezak; lyukslari sal uzoqda sodda shaklda. */
const pushYard = (items: Item[], list: readonly Item[], isFar: boolean): void => {
  for (const it of list) {
    const lod = isFar ? LUXE_LODS[it.model] : undefined;
    items.push(lod ? asLod(it, lod) : it);
  }
};
const collectPlots = (v: View, src: CollectSource, maxLabels: number): PlotResult => {
  const items: Item[] = [];
  const labels: { readonly d: number; readonly info: LabelInfo }[] = [];
  const signs: { readonly d: number; readonly info: SignInfo }[] = [];
  const boards: Item[] = [];
  const free: { readonly d: number; readonly p: Plot }[] = [];
  for (const p of src.plots.query(v.x, v.z, v.radius)) {
    if (v.isHidden(p.x, p.z)) continue;
    const s = src.houses.get(p.id);
    const d = distanceFrom(v, p.x, p.z);
    if (!s) {
      const isOpen = src.open.has(p.districtId);
      if (d < (isOpen ? v.tree : v.near)) collectEmpty(v, src, p, d, items, boards);
      if (isOpen && isFreeType(p.type) && d < Math.min(v.near, v.label * MARKER_RANGE) && src.building !== p.id) free.push({ d, p });
      continue;
    }
    if (d < v.near) {
      const list = fullItems(src, p, s);
      if (d < v.detail) pushYard(items, list, d > v.detail * LUXE_NEAR);
      else items.push(...list.slice(0, shellSize(s.tier)));
      const sign = d < v.detail ? signOf(p, s, list) : null;
      if (sign) signs.push({ d, info: sign });
    } else items.push(simpleItem(src, p, s, v.isSimple));
    if (s.nick && d < v.label) labels.push({ d, info: labelOf(p, s) });
  }
  labels.sort((a, b) => a.d - b.d);
  signs.sort((a, b) => a.d - b.d);
  return { items, labels: labels.slice(0, maxLabels).map((l) => l.info), signs: signs.map((x) => x.info), boards, free: free.sort((a, b) => a.d - b.d).map((x) => x.p) };
};

const staticItem = (v: View, it: Item, d: number): Item | null => {
  const civic = CIVIC_LODS[it.model];
  if (civic) return d < v.near * CIVIC_NEAR ? it : asLod(it, civic);
  if (d < v.near || BIG.has(it.model)) return it;
  const tree = TREES[it.model];
  if (tree) return d < v.tree ? asLod(it, tree, TREE_FIT[it.model]) : null;
  if (it.model === 'hedge' || it.model === 'flower_ring' || it.model === 'bolalar' || it.model.startsWith('car_') || it.model === 'foundation') return d < v.tree * 0.6 ? it : null;
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
  return [lod && distanceFrom(v, it.x, it.z) > v.near * 1.4 ? asLod(it, lod) : it];
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
    labels: plots.labels, signs: plots.signs, boards: plots.boards, free: plots.free,
    items: [
      ...plots.items, ...collectStatics(v, src.statics.query(v.x, v.z, v.far)), ...collectStatics({ ...v, near: v.near * 1.6 }, src.extras.query(v.x, v.z, v.far)),
      ...collectCommerce(v, src.commerce.query(v.x, v.z, v.far)), ...collectBuildings(v, src.plan.buildings),
    ],
  };
};
