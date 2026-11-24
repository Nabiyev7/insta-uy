import type { SpotKind } from './anchors.ts';
import type { Plot, PlotType } from './types.ts';

/** Uy levellari: bo'yiga emas, hashamatga o'sadi (PLAN.md §1). Har level oldingisidan kuchli. */
export const TIERS = [
  { id: 1, key: 'kichik', uz: 'Kichik uy', ru: 'Маленький дом' },
  { id: 2, key: 'ayvonli', uz: 'Ayvonli uy', ru: 'Дом с айваном' },
  { id: 3, key: 'hovli', uz: 'Hovli', ru: 'Двор' },
  { id: 4, key: 'chiroyli', uz: 'Chiroyli hovli', ru: 'Красивый двор' },
  { id: 5, key: 'katta', uz: 'Katta hovli', ru: 'Большой двор' },
  { id: 6, key: 'boy', uz: 'Boy hovli', ru: 'Богатый двор' },
  { id: 7, key: 'villa', uz: 'Villa', ru: 'Вилла' },
  { id: 8, key: 'lux_villa', uz: 'Hashamatli villa', ru: 'Роскошная вилла' },
  { id: 9, key: 'qasr', uz: 'Qasr', ru: 'Дворец' },
  { id: 10, key: 'saroy', uz: 'Shoh saroyi', ru: 'Царский дворец' },
] as const;
export type TierId = (typeof TIERS)[number]['id'];
export const MAX_TIER = TIERS.length;

export const MIN_TIER: Readonly<Record<PlotType, TierId>> = { hovli: 1, kvartira: 1, villa: 7, qasr: 9 };
/** Bepul olinadigan turlar. */
export const FREE_TYPES: readonly PlotType[] = ['hovli', 'kvartira'];
export const isFreeType = (t: PlotType): boolean => FREE_TYPES.includes(t);
export const canUpgrade = (t: PlotType): boolean => t !== 'kvartira';

/** Boshlang'ich narxlar (so'm). Amaldagi qiymatlar bazadagi `settings`da — admin o'zgartiradi. */
export const DEFAULT_PRICES = {
  base: { hovli: 30_000, kvartira: 20_000, villa: 150_000, qasr: 400_000 } satisfies Record<PlotType, number>,
  tierUp: { 2: 15_000, 3: 25_000, 4: 30_000, 5: 40_000, 6: 60_000, 7: 90_000, 8: 130_000, 9: 200_000, 10: 300_000 } as Readonly<Record<number, number>>,
  expansion: 80_000,
  streetName: 200_000,
  label: { silver: 15_000, gold: 40_000 },
  commerce: { dokon: 100_000, ofis: 250_000, bilbord: 150_000 },
} as const;

export const plotPrice = (p: Pick<Plot, 'type' | 'value'>, base: number = DEFAULT_PRICES.base[p.type], discountPct = 0): number =>
  Math.round((base * (1 + p.value / 50) * (1 - discountPct / 100)) / 1000) * 1000;

/** Bir xil model — rang bilan farqlanadi. */
export const WALL_COLORS = ['#e8d9c0', '#d9b99b', '#c98f6b', '#f1ece1', '#c9d3d6', '#b7c4a8', '#e3c07a', '#d7a9a0'] as const;
export const ROOF_COLORS = ['#8a4b38', '#6b3a34', '#4d5a63', '#3f5d4c', '#7a6652', '#5b4a68'] as const;

/** Bezak turi (do'kon bo'limi). Qaysi nuqtaga qo'yilishi `spots` da. */
export type DecorSlot = 'fence' | 'gate' | 'path' | 'tree' | 'yard' | 'water' | 'car' | 'light' | 'pet' | 'special' | 'sign' | 'roof';
export interface DecorItem {
  readonly id: string;
  readonly slot: DecorSlot;
  readonly uz: string;
  readonly ru: string;
  readonly priceUzs: number;
  readonly priceCoins: number;
  /** null = cheksiz; aks holda noyob, sanoqli. */
  readonly stock: number | null;
  /** 3D model (bitta modeldan bir necha tovar bo'lishi mumkin). */
  readonly model: string;
  /** Qaysi nuqta turlariga qo'yiladi. */
  readonly spots: readonly SpotKind[];
  /** Shu leveldan ochiladi. */
  readonly minLevel: number;
  /** Modelga beriladigan rang (faqat admin yaratgan tovarlarda). */
  readonly tint: string | null;
}
const SLOT_SPOTS: Readonly<Record<DecorSlot, readonly SpotKind[]>> = {
  fence: ['fence'], gate: ['gate'], path: ['path'], tree: ['small', 'medium', 'wall', 'back', 'big'], yard: ['medium', 'big'], water: ['medium', 'big'], car: ['car', 'big'], light: ['lamps'], pet: ['pet', 'small', 'medium'],
  special: ['medium', 'big'], sign: ['sign'], roof: ['roof'],
};
interface ItemOptions { readonly stock?: number; readonly spots?: readonly SpotKind[]; readonly minLevel?: number }
const item = (id: string, slot: DecorSlot, uz: string, ru: string, priceUzs: number, priceCoins: number, { stock, spots, minLevel = 1 }: ItemOptions = {}): DecorItem =>
  ({ id, slot, uz, ru, priceUzs, priceCoins, stock: stock ?? null, model: id, spots: spots ?? SLOT_SPOTS[slot], minLevel, tint: null });

export const DECOR: readonly DecorItem[] = [
  item('fence_wood', 'fence', "Yog'och panjara", 'Деревянный забор', 5_000, 100),
  item('fence_brick', 'fence', "G'isht devor", 'Кирпичная стена', 12_000, 260, { minLevel: 3 }),
  item('fence_ornate', 'fence', 'Temir panjara', 'Кованый забор', 25_000, 600, { minLevel: 6 }),
  item('gate_wood', 'gate', "Yog'och darvoza", 'Деревянные ворота', 6_000, 120),
  item('gate_carved', 'gate', 'Soyabonli darvoza', 'Ворота с навесом', 20_000, 450, { minLevel: 4 }),
  item('gate_gold', 'gate', 'Oltin darvoza', 'Золотые ворота', 60_000, 1500, { minLevel: 7 }),
  item('path_stone', 'path', "Tosh yo'lak", 'Каменная дорожка', 4_000, 80),
  item('tree_anor', 'tree', 'Anor', 'Гранат', 4_000, 80),
  item('tree_chinor', 'tree', 'Chinor', 'Чинара', 7_000, 150, { spots: ['medium', 'big'] }),
  item('tree_archa', 'tree', 'Archa', 'Ель', 7_000, 150),
  item('yard_sori', 'yard', "So'ri", 'Топчан', 8_000, 180),
  item('yard_tok', 'yard', 'Tok (ishkom)', 'Виноградник', 10_000, 220, { spots: ['big'], minLevel: 4 }),
  item('yard_flowers', 'yard', 'Gulzor', 'Цветник', 5_000, 100),
  item('water_pool', 'water', 'Hovuz', 'Бассейн', 45_000, 1000, { spots: ['big'], minLevel: 5 }),
  item('water_fountain', 'water', 'Kichik favvora', 'Фонтанчик', 35_000, 800, { minLevel: 5 }),
  item('car_van', 'car', 'Oq furgon', 'Белый фургон', 15_000, 350, { minLevel: 2 }),
  item('car_sedan', 'car', 'Sedan', 'Седан', 25_000, 600, { minLevel: 3 }),
  item('car_sport', 'car', 'Sport mashina', 'Спорткар', 70_000, 1800, { minLevel: 6 }),
  item('light_lamps', 'light', 'Hovli chiroqlari', 'Фонари', 8_000, 180, { minLevel: 3 }),
  item('light_luxe', 'light', 'Hashamatli yoritish', 'Роскошная подсветка', 30_000, 700, { spots: ['luxe'], minLevel: 6 }),
  item('pet_dog', 'pet', 'Kuchuk', 'Собака', 10_000, 220),
  item('pet_cat', 'pet', 'Mushuk', 'Кошка', 8_000, 180),
  item('special_peacock', 'special', 'Tovus (noyob)', 'Павлин (редкий)', 150_000, 4000, { stock: 10, spots: ['small', 'medium', 'big'], minLevel: 5 }),
  item('special_statue', 'special', 'Humo haykali (noyob)', 'Статуя Хумо (редкая)', 200_000, 5000, { stock: 10, minLevel: 6 }),
  item('special_yurt', 'special', "Navro'z o'tovi (mavsumiy)", 'Юрта Навруза (сезон)', 60_000, 1500, { stock: 100, spots: ['big'], minLevel: 4 }),
  item('sign_nick', 'sign', 'Nik lavhasi', 'Табличка с ником', 5_000, 100),
];
export const decorById = (id: string): DecorItem | undefined => DECOR.find((d) => d.id === id);

/** Level bilan tekin keladigan hovli bezaklari: indeks = level. O'z joyida turadi, bezak joylari hisobiga kirmaydi. */
const GARDEN = ['path_stone', 'tree_anor'] as const;
const FLOWER_GARDEN = [...GARDEN, 'yard_flowers', 'yard_umbrella'] as const;
const RICH_GARDEN = [...FLOWER_GARDEN, 'light_lamps', 'tree_chinor'] as const;
const LUXE_GARDEN = [...RICH_GARDEN, 'tree_archa', 'light_luxe'] as const;
const LEVEL_YARD: readonly (readonly string[])[] = [
  [], GARDEN, GARDEN, [...GARDEN, 'yard_flowers'], FLOWER_GARDEN, FLOWER_GARDEN, RICH_GARDEN, [...RICH_GARDEN, 'tree_archa'],
  LUXE_GARDEN, LUXE_GARDEN, [...LUXE_GARDEN, 'water_fountain'],
];
/** Levelning o'z panjara va darvozasi (indeks = level): har biri oldingisidan yomon emas. Oltin darvoza faqat 9 dan. */
export const FENCE_RANK = ['fence_low', 'fence_basic', 'fence_brick', 'fence_ornate'] as const;
export const GATE_RANK = ['gate_basic', 'gate_wood', 'gate_wood_carved', 'gate_carved', 'gate_naqsh', 'gate_gold'] as const;
export const LEVEL_FENCE: readonly (typeof FENCE_RANK)[number][] = [
  'fence_low', 'fence_low', 'fence_basic', 'fence_basic', 'fence_brick', 'fence_brick', 'fence_brick', 'fence_ornate', 'fence_ornate', 'fence_ornate', 'fence_ornate',
];
export const LEVEL_GATE: readonly (typeof GATE_RANK)[number][] = [
  'gate_basic', 'gate_basic', 'gate_wood', 'gate_wood', 'gate_wood_carved', 'gate_carved', 'gate_carved', 'gate_naqsh', 'gate_naqsh', 'gate_gold', 'gate_gold',
];
export const levelYard = (tier: number): readonly string[] => LEVEL_YARD[tier] ?? [];

export const BADGES = {
  asoschi: { uz: 'Shahar asoschisi', ru: 'Основатель города', icon: '🏛️' },
  homiy: { uz: 'Homiy', ru: 'Спонсор', icon: '💎' },
  investor: { uz: 'Investor', ru: 'Инвестор', icon: '📈' },
  hokim: { uz: 'Shahar hokimi', ru: 'Хоким города', icon: '👑' },
  rais: { uz: 'Mahalla raisi', ru: 'Председатель махалли', icon: '⭐' },
} as const;
export type BadgeId = keyof typeof BADGES;
export type LabelKind = 'plain' | 'silver' | 'gold';

export const AVATAR_OPTIONS = {
  skin: ['#f1c9a5', '#e0ac7e', '#c58c5c', '#8d5a3a'],
  hair: ['#1d1512', '#3b2417', '#6b4423', '#b8863b', '#8a8a8a'],
  top: ['#1f6f8b', '#b5452f', '#3f7d4e', '#5a3e85', '#222831', '#e0b84f', '#f0f0f0'],
  pants: ['#26303c', '#4a3b2f', '#6b7280', '#1c1c1c'],
  hat: ['none', 'doppi', 'kepka'],
  outfit: ['oddiy', 'chopon'],
} as const;
export interface AvatarLook {
  readonly skin: string; readonly hair: string; readonly top: string; readonly pants: string;
  readonly hat: string; readonly outfit: string;
}
export const DEFAULT_AVATAR: AvatarLook = { skin: '#e0ac7e', hair: '#1d1512', top: '#1f6f8b', pants: '#26303c', hat: 'none', outfit: 'oddiy' };

export const sanitizeAvatar = (raw: unknown): AvatarLook => {
  const src = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const choose = (key: keyof AvatarLook): string => {
    const options: readonly string[] = AVATAR_OPTIONS[key];
    const v = src[key];
    return typeof v === 'string' && options.includes(v) ? v : DEFAULT_AVATAR[key];
  };
  return { skin: choose('skin'), hair: choose('hair'), top: choose('top'), pants: choose('pants'), hat: choose('hat'), outfit: choose('outfit') };
};
