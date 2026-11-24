/** Shahar binolari: to'rt markazga tarqalgan jamoat binolari va biznes markazi minoralari. Faqat ko'rinish — joylari bosh rejada ajratilgan. */
import { rotatedSize } from './masterplan/geometry.ts';
import { ZONES, inBox, type CityZone } from './masterplan/zones.ts';
import type { Rot } from './types.ts';

export type CivicId = 'prezident' | 'hokimiyat' | 'sud' | 'kasalxona' | 'teatr' | 'masjid' | 'otochirish' | 'univermag' | 'bozor';
export type CivicPanel = 'gazette' | 'city' | 'rules';
export interface Civic {
  readonly id: CivicId;
  readonly uz: string;
  readonly ru: string;
  readonly x: number;
  readonly z: number;
  /** Modelning eni va chuqurligi (rot'dan oldin). */
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
  readonly height: number;
  /** Bosganda ochiladigan oyna; yo'q bo'lsa faqat nomi chiqadi. */
  readonly panel: CivicPanel | null;
}
const civic = (id: CivicId, uz: string, ru: string, [x, z]: readonly [number, number], [w, d, height]: readonly [number, number, number], rot: Rot, panel: CivicPanel | null = null): Civic => ({ id, uz, ru, x, z, w, d, rot, height, panel });

export const CIVIC: readonly Civic[] = [
  // Ma'muriy markaz: uchalasi kichik maydonchaga qaraydi.
  civic('prezident', 'Prezident saroyi', 'Президентский дворец', [-180, -940], [50, 36, 34], 1, 'gazette'),
  civic('hokimiyat', 'Shahar hokimiyati', 'Мэрия города', [0, -1090], [46, 32, 30], 0, 'city'),
  civic('sud', 'Shahar sudi', 'Городской суд', [180, -940], [44, 30, 16], 3, 'rules'),
  civic('kasalxona', 'Kasalxona', 'Больница', [-819, -165], [63, 30, 25], 0),
  civic('teatr', 'Teatr va muzey', 'Театр и музей', [-429, -168], [51, 46, 22], 0),
  civic('masjid', 'Masjid', 'Мечеть', [428, -165], [43, 36, 32], 0),
  civic('otochirish', "O't o'chirish bo'limi", 'Пожарная часть', [690, 596], [36, 25, 24], 1),
  civic('univermag', 'Univermag', 'Универмаг', [0, 1040], [86, 45, 18], 2),
  civic('bozor', 'Bozor', 'Рынок', [-178, 900], [66, 42, 9], 0),
];
export const civicById = (id: string): Civic | undefined => CIVIC.find((c) => c.id === id);
/** Binoning yerdagi izi: markazi va yarim o'lchamlari. */
export const civicRect = (c: Civic): { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number } => {
  const [w, d] = rotatedSize(c.w, c.d, c.rot);
  return { x: c.x, z: c.z, hx: w / 2, hz: d / 2 };
};
/** Shu nuqta qaysi zonada (markaz, bulvar, bog'...). Mahallalarda undefined. */
export const zoneAt = (x: number, z: number): CityZone | undefined => Object.values(ZONES).find((q) => q.id !== 'kol' && q.id !== 'tepalik' && inBox(q.rect, x, z));

export type TowerLook = 'bank' | 'agentlik' | 'novostroyka' | 'office';
export const TOWER_NAMES: Readonly<Record<TowerLook, { readonly uz: string; readonly ru: string }>> = {
  bank: { uz: 'Shahar banki', ru: 'Городской банк' },
  agentlik: { uz: 'Agentlik', ru: 'Агентство' },
  novostroyka: { uz: 'Yangi turar-joy', ru: 'Новостройка' },
  office: { uz: 'Ofis markazi', ru: 'Офисный центр' },
};
export interface Tower { readonly look: TowerLook; readonly height: number; /** Shisha, panel yoki fasad rangi. */ readonly tint: string }
const tower = (look: TowerLook, height: number, tint: string): Tower => ({ look, height, tint });

/** Hozircha faqat ko'rinish uchun: sotilmaydi (PLAN §4). */
export const TOWERS: Readonly<Record<string, Tower>> = {
  B101: tower('bank', 48, '#ffffff'), B104: tower('bank', 52, '#ffffff'), B112: tower('bank', 44, '#ffffff'),
  B103: tower('agentlik', 32, '#e2674a'), B106: tower('agentlik', 30, '#f2c14e'), B109: tower('agentlik', 34, '#4fa27c'),
  B107: tower('novostroyka', 56, '#fdf8ee'), B110: tower('novostroyka', 52, '#f7e6c6'),
  B102: tower('office', 36, '#c9e4f4'), B105: tower('office', 40, '#bfe6d8'), B108: tower('office', 44, '#ddd2ee'), B111: tower('office', 32, '#f4e2b8'),
};
/** Modellarning 1 masshtabdagi balandligi, m. */
export const TOWER_BASE: Readonly<Record<TowerLook, number>> = { bank: 48, agentlik: 32, novostroyka: 56, office: 37.5 };
/** Binoning yerdagi yarim o'lchami (to'qnashuv uchun): [eni, chuqurligi]. */
export const TOWER_HALF: Readonly<Record<TowerLook, readonly [number, number]>> = { bank: [12, 12], agentlik: [11.3, 11.3], novostroyka: [12.6, 10.6], office: [12, 12] };
