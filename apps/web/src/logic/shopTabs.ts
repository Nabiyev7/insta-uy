/** Do'kon tablari va kartochka holati. Sof hisob. */
import { LUXE_LEVEL, type DecorSlot } from '../../../../packages/shared/src/index.ts';
import type { CatalogRow, SetRow } from './decorCatalog.ts';

export type ShopTab = 'new' | 'yard' | 'garden' | 'car' | 'luxe' | 'gate' | 'pet' | 'set' | 'special';
const inSlots = (...slots: readonly DecorSlot[]) => (c: CatalogRow): boolean => slots.includes(c.slot);
/** Gulzor va gul kamari (darvoza yonidagi gullar) — bog' bo'limida. */
const isFlower = (c: CatalogRow): boolean => c.slot === 'yard' && c.spots.includes('gate_side');
/** Maxsus: noyob, mavsumiy yoki raqamlangan. */
const isSpecial = (c: CatalogRow): boolean => c.slot === 'special' || c.from !== null || c.left !== null;

const FILTERS: readonly (readonly [Exclude<ShopTab, 'set'>, (c: CatalogRow) => boolean])[] = [
  ['new', (c) => c.isNew], ['yard', (c) => inSlots('yard', 'water')(c) && !isFlower(c)], ['garden', (c) => c.slot === 'tree' || isFlower(c)], ['car', inSlots('car')], ['luxe', (c) => c.min >= LUXE_LEVEL],
  ['gate', inSlots('fence', 'gate', 'path', 'sign', 'light', 'roof')], ['pet', inSlots('pet')], ['special', isSpecial],
];

export interface TabRows { readonly tab: ShopTab; readonly rows: readonly CatalogRow[]; readonly sets: readonly SetRow[] }
/** Bo'sh tab ko'rsatilmaydi. Mavsumi tugagan tovar faqat "Maxsus" da (kulrang) turadi. */
export const shopTabs = (catalog: readonly CatalogRow[], sets: readonly SetRow[]): readonly TabRows[] => {
  const tabs = FILTERS.map(([tab, test]): TabRows => ({ tab, sets: [], rows: catalog.filter((c) => (tab === 'special' ? c.active : c.onSale) && test(c)) }));
  const onSale = new Set(catalog.filter((c) => c.onSale).map((c) => c.id));
  const setTab: TabRows = { tab: 'set', rows: [], sets: sets.filter((s) => s.items.length > 0 && s.items.every((id) => onSale.has(id))) };
  return [...tabs.slice(0, -1), setTab, ...tabs.slice(-1)].filter((t) => t.rows.length > 0 || t.sets.length > 0);
};

export type GoodState = 'free' | 'locked' | 'soldOut' | 'seasonOver';
export const goodState = (c: CatalogRow, level: number): GoodState => {
  if (!c.onSale) return 'seasonOver';
  if (c.left === 0) return 'soldOut';
  return c.min > 1 && level < c.min ? 'locked' : 'free';
};
