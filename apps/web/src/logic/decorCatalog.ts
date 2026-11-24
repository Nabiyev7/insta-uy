/** Amaldagi bezak katalogi: bazadan keladi, yuklanguncha (va sinovda) boshlang'ich ro'yxat ishlaydi. */
import { DECOR, type DecorItem, type DecorSlot, type SpotKind } from '../../../../packages/shared/src/index.ts';

export interface CatalogRow {
  readonly id: string; readonly slot: DecorSlot; readonly model: string; readonly uz: string; readonly ru: string; readonly uzs: number; readonly coins: number; readonly left: number | null;
  readonly spots: readonly SpotKind[]; readonly min: number; readonly from: string | null; readonly to: string | null; readonly set: string | null; readonly isNew: boolean; readonly tint: string | null; readonly onSale: boolean;
  /** Admin sotuvga qo'ygan (mavsumi tugagan bo'lishi mumkin — u holda onSale = false). */
  readonly active: boolean;
}
export interface SetRow { readonly id: string; readonly uz: string; readonly ru: string; readonly discount: number; readonly coins: number; readonly items: readonly string[] }
const toItem = (r: CatalogRow): DecorItem => ({ id: r.id, slot: r.slot, uz: r.uz, ru: r.ru, priceUzs: r.uzs, priceCoins: r.coins, stock: r.left, model: r.model, spots: r.spots, minLevel: r.min, tint: r.tint, isActive: r.onSale });

let current: ReadonlyMap<string, DecorItem> = new Map(DECOR.map((d) => [d.id, d]));
export const setCatalog = (rows: readonly CatalogRow[]): void => { current = new Map(rows.map((r) => [r.id, toItem(r)])); };
export const decorOf = (id: string): DecorItem | undefined => current.get(id);
