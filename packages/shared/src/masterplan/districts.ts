/** Tumanlar: qaysi kvartallar kimga tegishli. Tartib = ochilish tartibi: markazdan tashqariga (PLAN.md §2.3). */
import type { Zone } from '../types.ts';
import { AVENUE, BLOCK, CITY_HALF, STREET, STREET_LINES } from './geometry.ts';
import { CENTER_BOXES, SITES, ZONES, type Box4, type ZoneId } from './zones.ts';

export interface DistrictSpec {
  readonly id: number;
  readonly zone: Zone;
  readonly nameUz: string;
  readonly nameRu: string;
  /** Hovli (yoki villa) kvartallari: [ustun, qator], 0..7 — shimoli-g'arbdan. */
  readonly cells: readonly (readonly [number, number])[];
  /** Tuman hududi (xarita va "yopiq tuman" uchun). */
  readonly rects: readonly Box4[];
}

const at = (i: number): number => -CITY_HALF + i * BLOCK;
const cellBox = ([i, j]: readonly [number, number]): Box4 => [at(i), at(j), at(i + 1), at(j + 1)];
const mahalla = (id: number, nameUz: string, nameRu: string, cells: DistrictSpec['cells'], rects?: readonly Box4[]): DistrictSpec => ({
  id, zone: 'mahalla', nameUz: `${nameUz} mahallasi`, nameRu: `Махалля ${nameRu}`, cells, rects: rects ?? cells.map(cellBox),
});

export const SPECS: readonly DistrictSpec[] = [
  mahalla(1, 'Markaz', 'Марказ', [[2, 2], [3, 2], [4, 2], [5, 2], [3, 3], [4, 3]]),
  mahalla(2, 'Anorzor', 'Анорзор', [[2, 5], [3, 5], [4, 5], [5, 5], [3, 4], [4, 4]]),
  mahalla(3, 'Tokzor', 'Токзор', [[0, 3], [1, 3], [2, 3], [0, 4], [1, 4], [2, 4], [1, 5]]),
  mahalla(4, 'Chinor', 'Чинор', [[5, 3], [6, 3], [7, 3], [5, 4], [6, 4], [7, 4], [6, 2], [7, 2]]),
  mahalla(5, 'Navbahor', 'Навбахор', [[2, 0], [3, 0], [2, 1], [3, 1], [4, 1]]),
  mahalla(6, "Do'stlik", 'Дустлик', [[3, 6], [4, 6], [2, 7], [3, 7], [4, 7]]),
  mahalla(7, 'Istiqlol', 'Истиклол', [[4, 0], [5, 0], [5, 1], [6, 0], [6, 1], [7, 1]], [
    ...([[4, 0], [5, 0], [5, 1]] as const).map(cellBox), [750, -1500, 988, -750], [988, -988, 1500, -750],
  ]),
  mahalla(8, 'Gulobod', 'Гулобод', [[0, 5], [0, 6], [1, 6], [2, 6], [1, 7]], [
    ...([[0, 5], [2, 6]] as const).map(cellBox), [-1500, 750, -750, 988], [-988, 988, -750, 1500],
  ]),
  { id: 9, zone: 'tepalik', nameUz: 'Tepalik', nameRu: 'Холмы', cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]], rects: [[-1500, -1500, -750, -375]] },
  { id: 10, zone: 'kol', nameUz: "Ko'l bo'yi", nameRu: 'Озёрный', cells: [[6, 5], [7, 5], [6, 6], [7, 6], [6, 7], [7, 7], [5, 6], [5, 7]], rects: [[750, 375, 1500, 1500], [375, 750, 750, 1500]] },
  { id: 11, zone: 'kopqavatli', nameUz: 'Yangi turar-joy', nameRu: 'Новый квартал', cells: [], rects: [ZONES.kvartira1.rect] },
  { id: 12, zone: 'kopqavatli', nameUz: 'Baland uylar', nameRu: 'Высотки', cells: [], rects: [ZONES.kvartira2.rect] },
];

/** Chiziqning uchastkalar tomonidagi yarim eni: chekka — 0, bosh o'q (bulvar) — 0, prospekt — 14, ko'cha — 6. */
const halfWidth = (v: number): number => {
  if (Math.abs(v) === CITY_HALF) return 0;
  return (STREET_LINES as readonly number[]).includes(v) ? STREET / 2 : AVENUE / 2;
};
/** Kvartalning yo'llardan ichkari qismi. */
export const cellInner = (cell: readonly [number, number]): Box4 => {
  const [x0, z0, x1, z1] = cellBox(cell);
  return [x0 + halfWidth(x0), z0 + halfWidth(z0), x1 - halfWidth(x1), z1 - halfWidth(z1)];
};

const grow = (id: ZoneId, m: number): Box4 => {
  const [x0, z0, x1, z1] = ZONES[id].rect;
  return [x0 - m, z0 - m, x1 + m, z1 + m];
};
const PUBLIC: readonly ZoneId[] = ['bulvar', 'bulvarKichik', 'mamuriy', 'biznes', 'savdo', 'dam'];
/** Uchastka qo'yilmaydigan zonalar (atrofidagi ko'chasi bilan) va binolar. */
export const CUTTERS: readonly Box4[] = [...PUBLIC.map((id) => grow(id, STREET)), ...Object.values(SITES), ...CENTER_BOXES];
/** Hovlilar qasr va ko'p qavatli zonalarga ham kirmaydi. */
export const HOVLI_CUTTERS: readonly Box4[] = [...CUTTERS, ...(['tepalik', 'kvartira1', 'kvartira2'] as const).map((id) => grow(id, STREET))];
