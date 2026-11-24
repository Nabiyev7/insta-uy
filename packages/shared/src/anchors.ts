/** Hovlidagi bezak joylari (nuqtalar). 25×34 m lik o'lchov to'rida chizilgan, villa va qasrda shu nisbatda kattalashadi. */
import { DECOR_LEVEL, MAX_TIER } from './catalog.ts';

/** Nuqta turi: qaysi bezak qayerga sig'ishini belgilaydi. left/right — old hovli, corner — daraxtli burchak, gate_side — darvoza yoni. */
export type SpotKind = 'fence' | 'gate' | 'path' | 'lamps' | 'luxe' | 'sign' | 'left' | 'right' | 'gate_side' | 'corner' | 'car' | 'pet' | 'roof';
export interface Anchor {
  readonly id: string;
  readonly kind: SpotKind;
  /** Hovli markazidan: x o'ngga, z ko'chaga (metr). */
  readonly x: number;
  readonly z: number;
  /** Band qiladigan joy: eni × chuqurligi. Panjara, yo'lak kabi butun hovliga tegishlilarida 0. */
  readonly w: number;
  readonly d: number;
  readonly minLevel: number;
  readonly uz: string;
  readonly ru: string;
}
const anchor = (id: string, kind: SpotKind, minLevel: number, x: number, z: number, w: number, d: number, uz: string, ru: string): Anchor => ({ id, kind, x, z, w, d, minLevel, uz, ru });

/** 5–10-levelda bir xil nuqtalar; koordinatalari shu levellarning hech birida uyga, yo'lakka va avtomobil yo'liga tegmaydi. */
export const ANCHORS: readonly Anchor[] = [
  anchor('fence', 'fence', DECOR_LEVEL, 0, 0, 0, 0, 'Panjara', 'Забор'),
  anchor('gate', 'gate', DECOR_LEVEL, 0, 17, 0, 0, 'Darvoza', 'Ворота'),
  anchor('path', 'path', DECOR_LEVEL, 0, 7.8, 0, 0, "Yo'lak", 'Дорожка'),
  anchor('lamps', 'lamps', DECOR_LEVEL, 0, 9.3, 0, 0, "Yo'lak chiroqlari", 'Фонари у дорожки'),
  anchor('luxe', 'luxe', 6, 0, -7.5, 0, 0, 'Uy atrofi yoritilishi', 'Подсветка дома'),
  anchor('roof', 'roof', DECOR_LEVEL, 0, -7.5, 0, 0, 'Tom', 'Крыша'),
  anchor('sign', 'sign', 1, -2.8, 16.2, 1, 0.5, 'Darvoza yoni: lavha', 'У ворот: табличка'),
  anchor('garaj_oldi', 'car', DECOR_LEVEL, 8, 6.7, 3, 5.6, 'Garaj oldi: mashina', 'У гаража: машина'),
  anchor('old_hovli_chap', 'left', DECOR_LEVEL, -5.6, 8.6, 7.2, 7, 'Old hovli, chapda', 'Передний двор, слева'),
  anchor('old_hovli_ong', 'right', DECOR_LEVEL, 3.15, 8.6, 3.4, 4, "Old hovli, o'ngda", 'Передний двор, справа'),
  anchor('darvoza_yoni', 'gate_side', DECOR_LEVEL, -4.6, 14.8, 3.2, 1.6, 'Darvoza yonida', 'Рядом с воротами'),
  anchor('burchak_1', 'corner', DECOR_LEVEL, -10.5, 14.4, 2.6, 2.6, 'Old burchak, chapda', 'Передний угол, слева'),
  anchor('burchak_2', 'corner', DECOR_LEVEL, 3.15, 14, 2.6, 2.6, "Old burchak, o'ngda", 'Передний угол, справа'),
  anchor('burchak_3', 'corner', DECOR_LEVEL, -10.5, -15.1, 2.2, 2.2, 'Orqa burchak, chapda', 'Задний угол, слева'),
  anchor('burchak_4', 'corner', DECOR_LEVEL, 10.5, -15.1, 2.2, 2.2, "Orqa burchak, o'ngda", 'Задний угол, справа'),
  anchor('p1', 'pet', DECOR_LEVEL, -2.6, 3.6, 1.2, 1.2, 'Eshik oldi', 'У двери'),
  anchor('p2', 'pet', 6, 2.6, 3.6, 1.2, 1.2, 'Eshik oldi, o‘ngda', 'У двери, справа'),
];
/** Nuqtalar chizilgan hovli o'lchami, m. */
export const REF_YARD = { w: 25, d: 34 } as const;
export const anchorById = (id: string): Anchor | undefined => ANCHORS.find((a) => a.id === id);
export const openAnchors = (level: number): readonly Anchor[] => ANCHORS.filter((a) => a.minLevel <= level);

/** Level bo'yicha hovli bezaklari soni (indeks = level − 1), nik lavhasisiz. Amaldagi qiymat bazada (`decor_slots`); ikkalasi bir xilligini test tekshiradi. */
export const DEFAULT_DECOR_SLOTS = [0, 0, 0, 0, 8, 10, 12, 14, 15, 16] as const;
export const MAX_DECOR_SLOTS = 20;
export const decorSlots = (level: number, custom: readonly number[] = DEFAULT_DECOR_SLOTS): number =>
  Math.min(MAX_DECOR_SLOTS, custom[Math.max(1, Math.min(MAX_TIER, level)) - 1] ?? DEFAULT_DECOR_SLOTS[0]);

/** Joy hisobiga kiradigan bezaklar soni: nik lavhasi bundan mustasno. */
export const usedSlots = (places: Readonly<Record<string, string>>): number => Object.keys(places).filter((id) => anchorById(id)?.kind !== 'sign').length;

/** Qo'yilgan bezak: "nuqta:bezak". */
export interface Placed { readonly anchor: string; readonly decor: string }
export const parsePlaced = (list: readonly string[]): Placed[] => list.flatMap((s) => {
  const i = s.indexOf(':');
  return i > 0 ? [{ anchor: s.slice(0, i), decor: s.slice(i + 1) }] : [];
});

/** Leveldan tekin keladigan hovli bezaklari turadigan nuqta: egasi shu nuqtaga o'zinikini qo'ysa, tekini yo'qoladi. */
export const FREE_ANCHOR: Readonly<Record<string, string>> = {
  path_stone: 'path', light_lamps: 'lamps', light_luxe: 'luxe', tree_round: 'burchak_1', tree_wide: 'burchak_2', tree_tall: 'burchak_3', tree_slim: 'burchak_4', gul_zor: 'darvoza_yoni', water_fountain: 'old_hovli_ong',
};
