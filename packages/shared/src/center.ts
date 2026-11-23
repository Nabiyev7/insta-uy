/** Markaz: davlat binolari va 12 burchak minorasining ko'rinishi. Joylar (B101–B112) bosh rejada qulflangan, bu yerda faqat ko'rinish. */
import type { Rot } from './types.ts';

export type CivicId = 'prezident' | 'hokimiyat' | 'sud';
export interface Civic {
  readonly id: CivicId;
  readonly uz: string;
  readonly ru: string;
  readonly x: number;
  readonly z: number;
  readonly w: number;
  readonly d: number;
  readonly rot: Rot;
  readonly height: number;
  /** Bosganda ochiladigan oyna. */
  readonly panel: 'gazette' | 'city' | 'rules';
}
export const CIVIC: readonly Civic[] = [
  { id: 'prezident', uz: 'Prezident saroyi', ru: 'Президентский дворец', x: -59, z: -59, w: 50, d: 36, rot: 0, height: 34, panel: 'gazette' },
  { id: 'hokimiyat', uz: 'Shahar hokimiyati', ru: 'Мэрия города', x: 59, z: -59, w: 46, d: 32, rot: 0, height: 30, panel: 'city' },
  { id: 'sud', uz: 'Shahar sudi', ru: 'Городской суд', x: -59, z: 59, w: 44, d: 30, rot: 2, height: 16, panel: 'rules' },
];
export const civicById = (id: string): Civic | undefined => CIVIC.find((c) => c.id === id);

export type TowerLook = 'bank' | 'agentlik' | 'novostroyka' | 'office';
export const TOWER_NAMES: Readonly<Record<TowerLook, { readonly uz: string; readonly ru: string }>> = {
  bank: { uz: 'Shahar banki', ru: 'Городской банк' },
  agentlik: { uz: 'Agentlik', ru: 'Агентство' },
  novostroyka: { uz: 'Yangi turar-joy', ru: 'Новостройка' },
  office: { uz: 'Ofis markazi', ru: 'Офисный центр' },
};
export interface Tower { readonly look: TowerLook; readonly height: number; /** Shisha, panel yoki fasad rangi. */ readonly tint: string }
const tower = (look: TowerLook, height: number, tint: string): Tower => ({ look, height, tint });

/** Hozircha faqat ko'rinish uchun: sotilmaydi (PLAN §4, MARKAZ-PROMT). */
export const TOWERS: Readonly<Record<string, Tower>> = {
  B101: tower('bank', 48, '#ffffff'), B104: tower('bank', 52, '#ffffff'), B112: tower('bank', 44, '#ffffff'),
  B103: tower('agentlik', 32, '#d2573a'), B106: tower('agentlik', 30, '#e0a52f'), B109: tower('agentlik', 34, '#3f8f6a'),
  B107: tower('novostroyka', 56, '#f1ece1'), B110: tower('novostroyka', 52, '#e3cfae'),
  B102: tower('office', 36, '#a9cfe8'), B105: tower('office', 40, '#8fc7b8'), B108: tower('office', 44, '#c9b8dc'), B111: tower('office', 32, '#e2c79a'),
};
/** Modellarning 1 masshtabdagi balandligi, m. */
export const TOWER_BASE: Readonly<Record<TowerLook, number>> = { bank: 48, agentlik: 32, novostroyka: 56, office: 37.5 };
/** Binoning yerdagi yarim o'lchami (to'qnashuv uchun): [eni, chuqurligi]. */
export const TOWER_HALF: Readonly<Record<TowerLook, readonly [number, number]>> = { bank: [12, 12], agentlik: [11.3, 11.3], novostroyka: [12.6, 10.6], office: [12, 12] };
