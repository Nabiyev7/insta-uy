/** Do'kon tablari va kartochka holati. Sof hisob. */
import { LUXE_MODELS, type DecorSlot } from '../../../../packages/shared/src/index.ts';
import type { CatalogRow, SetRow } from './decorCatalog.ts';
import { isOnSale } from './sale.ts';

export type ShopTab = 'sale' | 'new' | 'yard' | 'garden' | 'car' | 'luxe' | 'pet' | 'set' | 'special';
/** "Premium" bo'limi: faqat pulga (karta yoki Stars). */
export type PremiumTab = 'houses' | 'decor' | 'cars' | 'packs';
const inSlots = (...slots: readonly DecorSlot[]) => (c: CatalogRow): boolean => slots.includes(c.slot);
/** Gulzor va gul kamari (darvoza yonidagi gullar) — bog' bo'limida. */
const isFlower = (c: CatalogRow): boolean => c.slot === 'yard' && c.spots.includes('gate_side');
/** Maxsus: noyob, mavsumiy yoki raqamlangan. */
const isSpecial = (c: CatalogRow): boolean => c.slot === 'special' || c.from !== null || c.left !== null;

const FILTERS: readonly (readonly [Exclude<ShopTab, 'set'>, (c: CatalogRow) => boolean])[] = [
  // 15-qadam: "Chegirmalar" — birinchi, faqat chegirma bor bo'lsa ko'rinadi.
  ['sale', (c) => isOnSale(c)], ['new', (c) => c.isNew], ['yard', (c) => inSlots('yard', 'water', 'fence', 'gate', 'path', 'sign', 'light', 'roof')(c) && !isFlower(c)], ['garden', (c) => c.slot === 'tree' || isFlower(c)], ['car', inSlots('car')], ['luxe', (c) => LUXE_MODELS.has(c.model)],
  ['pet', inSlots('pet')], ['special', isSpecial],
];
const isPremium = (c: CatalogRow): boolean => c.premium === true;

export interface TabRows { readonly tab: ShopTab; readonly rows: readonly CatalogRow[]; readonly sets: readonly SetRow[] }
/** Bo'sh tab ko'rsatilmaydi. Mavsumi tugagan tovar do'konda ko'rinmaydi (admin panelda hammasi bor). */
export const shopTabs = (catalog: readonly CatalogRow[], sets: readonly SetRow[]): readonly TabRows[] => {
  const tabs = FILTERS.map(([tab, test]): TabRows => ({ tab, sets: [], rows: catalog.filter((c) => c.onSale && !isPremium(c) && test(c)) }));
  // Premium tovar tanga do'konida ham, to'plamda ham yo'q.
  const onSale = new Set(catalog.filter((c) => c.onSale && !isPremium(c)).map((c) => c.id));
  const setTab: TabRows = { tab: 'set', rows: [], sets: sets.filter((s) => s.items.length > 0 && s.items.every((id) => onSale.has(id))) };
  return [...tabs.slice(0, -1), setTab, ...tabs.slice(-1)].filter((t) => t.rows.length > 0 || t.sets.length > 0);
};

export interface PremiumRows { readonly tab: PremiumTab; readonly rows: readonly CatalogRow[] }
/** Premium bo'limining 4 tabi doim ko'rinadi (bo'shi — "Tez kunda" kartasi). Uylar — tovar qo'shilguncha bo'sh. */
export const premiumTabs = (catalog: readonly CatalogRow[]): readonly PremiumRows[] => {
  const rows = catalog.filter((c) => c.onSale && isPremium(c));
  return [{ tab: 'houses', rows: [] }, { tab: 'decor', rows: rows.filter((c) => c.slot !== 'car') }, { tab: 'cars', rows: rows.filter((c) => c.slot === 'car') }, { tab: 'packs', rows: [] }];
};

export type GoodState = 'free' | 'locked' | 'soldOut' | 'seasonOver';
/** Egasi-adminga va premium tovarda level qulfi yo'q (server ham shunday). */
export const goodState = (c: CatalogRow, level: number, isAdmin = false): GoodState => {
  if (!c.onSale) return 'seasonOver';
  if (c.left === 0) return 'soldOut';
  return c.min > 1 && level < c.min && !isAdmin && !isPremium(c) ? 'locked' : 'free';
};
