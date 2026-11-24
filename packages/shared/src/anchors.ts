/** Hovlidagi bezak joylari (nuqtalar). 25×34 m hovliga chizilgan, villa va qasrda shu nisbatda kattalashadi. */
import { MAX_TIER } from './catalog.ts';

/** Nuqta turi: qaysi bezak qayerga sig'ishini belgilaydi. */
export type SpotKind = 'fence' | 'gate' | 'path' | 'lamps' | 'luxe' | 'sign' | 'small' | 'medium' | 'big' | 'car' | 'wall' | 'back' | 'pet' | 'roof';
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

export const ANCHORS: readonly Anchor[] = [
  anchor('fence', 'fence', 1, 0, 0, 0, 0, 'Panjara', 'Забор'),
  anchor('gate', 'gate', 1, 0, 17, 0, 0, 'Darvoza', 'Ворота'),
  anchor('path', 'path', 1, 0, 7.8, 0, 0, "Yo'lak", 'Дорожка'),
  anchor('lamps', 'lamps', 3, 0, 9.3, 0, 0, "Yo'lak chiroqlari", 'Фонари у дорожки'),
  anchor('luxe', 'luxe', 6, 0, -7.5, 0, 0, 'Uy atrofi yoritilishi', 'Подсветка дома'),
  anchor('sign', 'sign', 1, 2.75, 16.35, 1, 0.5, 'Darvoza yoni: lavha', 'У ворот: табличка'),
  anchor('s1', 'small', 1, -7.9, 14.7, 2.4, 2.4, 'Old hovli, chapda', 'Передний двор, слева'),
  anchor('s2', 'small', 1, 8.1, 14.7, 2.2, 2.4, "Old hovli, o'ngda", 'Передний двор, справа'),
  anchor('m1', 'medium', 1, -5.2, 10.9, 3.6, 3, 'Old hovli, yo‘lak yonida', 'У дорожки, слева'),
  anchor('p1', 'pet', 2, -2.5, 4.2, 1.2, 1.2, 'Eshik oldi', 'У двери'),
  anchor('car', 'car', 2, 5.1, 13.3, 2.4, 5, 'Darvoza yoni: mashina', 'У ворот: машина'),
  anchor('w1', 'wall', 3, -11, -2.2, 2, 2.4, "Chap devor bo'yi, oldi", 'У левой стены, спереди'),
  anchor('big1', 'big', 4, -7.4, 5.6, 6.8, 4.6, 'Katta joy, chapda', 'Большое место, слева'),
  anchor('w3', 'wall', 4, 11, -2.2, 2, 2.4, "O'ng devor bo'yi, oldi", 'У правой стены, спереди'),
  anchor('s3', 'small', 5, 8.1, 11.8, 2.2, 2.4, "Old hovli, o'rta", 'Передний двор, середина'),
  anchor('m2', 'medium', 5, 5.6, 9.2, 3.2, 2.6, "Yo'lak yonida, o'ngda", 'У дорожки, справа'),
  anchor('roof', 'roof', 5, 0, -7.5, 0, 0, 'Tom', 'Крыша'),
  anchor('p2', 'pet', 6, 2.5, 4.2, 1.2, 1.2, 'Eshik oldi, o‘ngda', 'У двери, справа'),
  anchor('w2', 'wall', 6, -11, -8.4, 2, 2.4, "Chap devor bo'yi, orqa", 'У левой стены, сзади'),
  anchor('w4', 'wall', 7, 11, -8.4, 2, 2.4, "O'ng devor bo'yi, orqa", 'У правой стены, сзади'),
  anchor('big2', 'big', 7, 6.7, 5.4, 6.6, 4.4, "Katta joy, o'ngda", 'Большое место, справа'),
  anchor('b1', 'back', 8, -11, -14.4, 2, 2.4, 'Orqa hovli, chapda', 'Задний двор, слева'),
  anchor('b2', 'back', 9, 11, -14.4, 2, 2.4, "Orqa hovli, o'ngda", 'Задний двор, справа'),
  anchor('s4', 'wall', 10, 10.8, 9.6, 1.9, 2.2, "Old hovli, o'ng chet", 'Передний двор, правый край'),
];
/** Nuqtalar chizilgan hovli o'lchami, m. */
export const REF_YARD = { w: 25, d: 34 } as const;
export const anchorById = (id: string): Anchor | undefined => ANCHORS.find((a) => a.id === id);
export const openAnchors = (level: number): readonly Anchor[] => ANCHORS.filter((a) => a.minLevel <= level);

/** Level bo'yicha qo'yish mumkin bo'lgan bezak soni (indeks = level − 1). Amaldagi qiymat bazada (`decor_slots`). */
export const DEFAULT_DECOR_SLOTS = [3, 4, 5, 6, 8, 10, 12, 14, 17, 20] as const;
export const MAX_DECOR_SLOTS = 20;
export const decorSlots = (level: number, custom: readonly number[] = DEFAULT_DECOR_SLOTS): number =>
  Math.min(MAX_DECOR_SLOTS, custom[Math.max(1, Math.min(MAX_TIER, level)) - 1] ?? DEFAULT_DECOR_SLOTS[0]);

/** Qo'yilgan bezak: "nuqta:bezak". */
export interface Placed { readonly anchor: string; readonly decor: string }
export const parsePlaced = (list: readonly string[]): Placed[] => list.flatMap((s) => {
  const i = s.indexOf(':');
  return i > 0 ? [{ anchor: s.slice(0, i), decor: s.slice(i + 1) }] : [];
});

/** Leveldan tekin keladigan bezaklar joyi — nuqtalar bilan ustma-ust tushmaydi: [x, z, w, d]. */
export const FREE_SPOTS: Readonly<Record<string, readonly [number, number, number, number]>> = {
  path_stone: [0, 7.8, 1.8, 17.6], tree_anor: [-10.7, 14.8, 2, 2], yard_flowers: [-4.6, 14.9, 3.2, 1.3], yard_sori: [-9.4, 10.9, 3, 2.6], tree_chinor: [10.2, 14.7, 1.6, 1.6],
  tree_archa: [11.2, 4.4, 1.4, 1.6], water_fountain: [10.7, 12.4, 2.8, 2.8], light_lamps: [0, 9.3, 0, 0], light_luxe: [0, -7.5, 0, 0],
};
