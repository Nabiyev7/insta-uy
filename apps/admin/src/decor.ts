/** Bezaklar bo'limining sof hisoblari (testlanadi): ro'yxat filtri, level taklifi, Toshkent vaqti. */
import { ANCHORS, SLOT_SPOTS, levelForPrice, type DecorSlot } from '../../../packages/shared/src/index.ts';

export interface DecorRow {
  readonly id: string; readonly slot: DecorSlot; readonly model_id: string; readonly name_uz: string; readonly name_ru: string; readonly price_uzs: number; readonly price_coins: number;
  readonly stock: number | null; readonly sold: number; readonly min_level: number; readonly level_auto: boolean; readonly season_from: string | null; readonly season_to: string | null;
  readonly set_id: string | null; readonly is_new: boolean; readonly is_active: boolean; readonly is_archived: boolean; readonly is_premium: boolean; readonly tint: string | null; readonly sort: number;
  readonly discount: { readonly id: number; readonly pct: number; readonly starts: string; readonly ends: string; readonly live: boolean } | null;
}
export const SLOT_NAMES: Readonly<Record<DecorSlot, string>> = {
  fence: 'Panjara', gate: 'Darvoza', path: "Yo'lak", tree: 'Daraxt', yard: 'Hovli', water: 'Suv', car: 'Mashina', light: 'Chiroq', pet: 'Hayvon', special: 'Maxsus', sign: 'Lavha', roof: 'Tom',
};

/** Level taklifi (server ham shu qoidada hisoblaydi): narx bo'yicha va nuqtalari ochiladigan leveldan past emas. */
export const levelHint = (coins: number, id: string, slot: DecorSlot): number => {
  const spots = SLOT_SPOTS[slot];
  const spot = id === 'sign_nick' ? 1 : Math.min(5, ...ANCHORS.filter((a) => spots.includes(a.kind)).map((a) => a.minLevel));
  return Math.max(levelForPrice(coins, id), spot);
};


export type Tab = 'decor' | 'premium' | 'archive';
export const TABS: readonly (readonly [Tab, string])[] = [['decor', 'Bezaklar'], ['premium', '⭐ Premium'], ['archive', 'Arxiv']];
export type Sort = 'sort' | 'price' | 'level' | 'sold';
const SORTS: Readonly<Record<Sort, (a: DecorRow, b: DecorRow) => number>> = {
  sort: (a, b) => a.sort - b.sort, price: (a, b) => a.price_coins - b.price_coins, level: (a, b) => a.min_level - b.min_level || a.price_coins - b.price_coins, sold: (a, b) => b.sold - a.sold,
};
export interface Filter { readonly q: string; readonly slot: string; readonly level: string; readonly state: '' | 'on' | 'off'; readonly sort: Sort }
export const NO_FILTER: Filter = { q: '', slot: '', level: '', state: '', sort: 'sort' };

/** Tab va filtr bo'yicha ro'yxat (sof hisob). */
export const visibleRows = (rows: readonly DecorRow[], tab: Tab, f: Filter): readonly DecorRow[] => {
  const q = f.q.trim().toLowerCase();
  return rows.filter((r) => (tab === 'archive' ? r.is_archived : !r.is_archived && r.is_premium === (tab === 'premium')))
    .filter((r) => !q || r.name_uz.toLowerCase().includes(q) || r.name_ru.toLowerCase().includes(q) || r.id.includes(q))
    .filter((r) => !f.slot || r.slot === f.slot).filter((r) => !f.level || r.min_level === Number(f.level))
    .filter((r) => !f.state || r.is_active === (f.state === 'on'))
    .toSorted(SORTS[f.sort]);
};


/** `datetime-local` qiymati Toshkent vaqtida (UTC+5, yozgi vaqt yo'q) → ISO. */
export const tashkentIso = (local: string): string => new Date(`${local}:00+05:00`).toISOString();
/** Hozirdan `hours` soat keyin — `datetime-local` uchun Toshkent vaqtida. */
export const tashkentLocal = (hours = 0, now = Date.now()): string => new Date(now + hours * 3_600_000 + 5 * 3_600_000).toISOString().slice(0, 16);

