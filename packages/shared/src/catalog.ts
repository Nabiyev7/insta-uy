import type { SpotKind } from './anchors.ts';
import type { Plot, PlotType } from './types.ts';

/** Uy levellari 1–5: ko'pi bilan 2 qavat (5-level), asosan hashamatga o'sadi (PLAN.md §1). Har level oldingisidan kuchli.
 * 6–10 keyin qaytadi (egasi, 2026-11-25): shu ro'yxatga qator, `kit_levels.py` dagi MAX_LEVEL va bazadagi `private.max_tier()` birga o'zgaradi. */
export const TIERS = [
  { id: 1, key: 'kichik', uz: 'Kichik uy', ru: 'Маленький дом' },
  { id: 2, key: 'ayvonli', uz: 'Shinam uy', ru: 'Уютный дом' },
  { id: 3, key: 'hovli', uz: 'Hovli uy', ru: 'Дом с двором' },
  { id: 4, key: 'chiroyli', uz: 'Bezakli uy', ru: 'Нарядный дом' },
  { id: 5, key: 'katta', uz: 'Katta uy', ru: 'Большой дом' },
] as const;
export type TierId = (typeof TIERS)[number]['id'];
export const MAX_TIER = TIERS.length;
/** Bezaklar shu leveldan ochiladi (nik lavhasi bundan mustasno). */
export const DECOR_LEVEL = 5;
/** Lyuks bezaklar tanga bilan shu leveldan ochiladi (pulga — levelsiz). */
export const LUXE_LEVEL = 5;

/** Villa va qasr uchastkasida ham 1–5-level uylar turadi (uchastkasi katta). */
export const MIN_TIER: Readonly<Record<PlotType, TierId>> = { hovli: 1, kvartira: 1, villa: 1, qasr: 1 };
/** Bepul olinadigan turlar (kvartira hozircha berilmaydi — docs/chat/BOSQICH-2.md). */
export const FREE_TYPES: readonly PlotType[] = ['hovli'];
export const isFreeType = (t: PlotType): boolean => FREE_TYPES.includes(t);
export const canUpgrade = (t: PlotType): boolean => t !== 'kvartira';

/** Boshlang'ich narxlar (so'm). Amaldagi qiymatlar bazadagi `settings`da — admin o'zgartiradi. */
export const DEFAULT_PRICES = {
  base: { hovli: 30_000, kvartira: 20_000, villa: 150_000, qasr: 400_000 } satisfies Record<PlotType, number>,
  tierUp: { 2: 15_000, 3: 25_000, 4: 30_000, 5: 40_000 } as Readonly<Record<number, number>>,
  expansion: 80_000,
  streetName: 200_000,
  label: { silver: 15_000, gold: 40_000 },
  commerce: { dokon: 100_000, ofis: 250_000, bilbord: 150_000 },
} as const;

export const plotPrice = (p: Pick<Plot, 'type' | 'value'>, base: number = DEFAULT_PRICES.base[p.type], discountPct = 0): number =>
  Math.round((base * (1 + p.value / 50) * (1 - discountPct / 100)) / 1000) * 1000;

/** Bir xil model — rang bilan farqlanadi. */
export const WALL_COLORS = ['#f7f2ea', '#fbe6cc', '#f6d3bd', '#ffffff', '#d9eaf2', '#e0efd4', '#fdecb0', '#f7d6d2'] as const;
export const ROOF_COLORS = ['#d9604a', '#b5483a', '#5f7f95', '#4f9478', '#b98a5e', '#9486bd'] as const;
/** Tanlanmagan (0) tom va ramka — levelning o'z rangi: 4–5-level zamonaviy, to'q kulrang-ko'k. */
const MODERN_ROOF = '#4a5663';
const MODERN_FRAME = 3;
const isModern = (tier: number): boolean => tier === 4 || tier === 5;
export const roofColor = (tier: number, roof: number): string => (roof === 0 && isModern(tier) ? MODERN_ROOF : ROOF_COLORS[roof] ?? ROOF_COLORS[0]);
/** Zamonaviy uyda to'q ramka va oq ramka o'rin almashadi: standarti to'q, oqi ham tanlanadi. */
export const frameIndex = (tier: number, frame: number): number => {
  if (!isModern(tier)) return frame;
  return frame === 0 ? MODERN_FRAME : frame === MODERN_FRAME ? 0 : frame;
};

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
  /** false — sotuvdan olingan (olganlarda qoladi). */
  readonly isActive: boolean;
}
const SLOT_SPOTS: Readonly<Record<DecorSlot, readonly SpotKind[]>> = {
  fence: ['fence'], gate: ['gate'], path: ['path'], tree: ['corner', 'right', 'left'], yard: ['right', 'left'], water: ['right', 'left'], car: ['car', 'left'], light: ['lamps'], pet: ['pet', 'corner', 'right'],
  special: ['right', 'left'], sign: ['sign'], roof: ['roof'],
};
interface ItemOptions { readonly stock?: number; readonly spots?: readonly SpotKind[]; readonly minLevel?: number; readonly isActive?: boolean }
const item = (id: string, slot: DecorSlot, uz: string, ru: string, priceUzs: number, priceCoins: number, { stock, spots, minLevel = DECOR_LEVEL, isActive = true }: ItemOptions = {}): DecorItem =>
  ({ id, slot, uz, ru, priceUzs, priceCoins, stock: stock ?? null, model: id, spots: spots ?? SLOT_SPOTS[slot], minLevel: Math.min(minLevel, MAX_TIER), tint: null, isActive });

export const DECOR: readonly DecorItem[] = [
  item('fence_wood', 'fence', "Yog'och panjara", 'Деревянный забор', 5_000, 100),
  item('fence_brick', 'fence', "G'isht devor", 'Кирпичная стена', 12_000, 260),
  item('fence_ornate', 'fence', 'Temir panjara', 'Кованый забор', 25_000, 600, { minLevel: 6 }),
  item('gate_wood', 'gate', "Yog'och darvoza", 'Деревянные ворота', 6_000, 120),
  item('gate_carved', 'gate', 'Soyabonli darvoza', 'Ворота с навесом', 20_000, 450),
  item('gate_gold', 'gate', 'Oltin darvoza', 'Золотые ворота', 60_000, 1500, { minLevel: 7 }),
  item('path_stone', 'path', "Tosh yo'lak", 'Каменная дорожка', 4_000, 80),
  item('tree_anor', 'tree', 'Anor', 'Гранат', 4_000, 80),
  item('tree_chinor', 'tree', 'Chinor', 'Чинара', 7_000, 150, { spots: ['right', 'left'] }),
  item('tree_archa', 'tree', 'Archa', 'Ель', 7_000, 150, { isActive: false }),
  item('yard_sori', 'yard', "So'ri", 'Топчан', 8_000, 180),
  item('yard_tok', 'yard', 'Tok (ishkom)', 'Виноградник', 10_000, 220, { spots: ['left'] }),
  item('yard_flowers', 'yard', 'Gulzor', 'Цветник', 5_000, 100, { isActive: false }),
  item('water_pool', 'water', 'Hovuz', 'Бассейн', 45_000, 1000, { spots: ['left'], isActive: false }),
  item('water_fountain', 'water', 'Kichik favvora', 'Фонтанчик', 35_000, 800, { isActive: false }),
  item('car_van', 'car', 'Oq furgon', 'Белый фургон', 15_000, 350, { isActive: false }),
  item('car_sedan', 'car', 'Sedan', 'Седан', 25_000, 600, { isActive: false }),
  item('car_sport', 'car', 'Sport mashina', 'Спорткар', 70_000, 1800, { minLevel: 6, isActive: false }),
  item('light_lamps', 'light', 'Hovli chiroqlari', 'Фонари', 8_000, 180),
  item('light_luxe', 'light', 'Hashamatli yoritish', 'Роскошная подсветка', 30_000, 700, { spots: ['luxe'], minLevel: 6 }),
  item('pet_dog', 'pet', 'Kuchuk', 'Собака', 10_000, 220),
  item('pet_cat', 'pet', 'Mushuk', 'Кошка', 8_000, 180),
  item('special_peacock', 'special', 'Tovus (noyob)', 'Павлин (редкий)', 150_000, 4000, { stock: 10, spots: ['corner', 'right', 'left'] }),
  item('special_statue', 'special', 'Humo haykali (noyob)', 'Статуя Хумо (редкая)', 200_000, 5000, { stock: 10, minLevel: 6 }),
  item('special_yurt', 'special', "Navro'z o'tovi (mavsumiy)", 'Юрта Навруза (сезон)', 60_000, 1500, { stock: 100, spots: ['left'] }),
  item('sign_nick', 'sign', 'Nik lavhasi', 'Табличка с ником', 5_000, 100, { minLevel: 1 }),
  item('yard_tandir', 'yard', 'Tandir', 'Тандыр', 15_000, 300, { spots: ['corner', 'right', 'left'] }),
  item('yard_tokzor', 'yard', 'Tokzor', 'Виноградные ряды', 15_000, 300),
  item('yard_umbrella', 'yard', "Bog' soyaboni", 'Садовый зонт', 12_000, 240, { isActive: false }),
  item('yard_bike', 'yard', 'Velosiped', 'Велосипед', 8_000, 160, { spots: ['corner', 'right'] }),
  item('sign_mailbox', 'sign', 'Pochta qutisi', 'Почтовый ящик', 4_000, 80, { spots: ['sign', 'pet', 'corner'] }),
  item('yard_besedka', 'yard', 'Besedka', 'Беседка', 30_000, 600, { spots: ['left'], isActive: false }),
  item('yard_mangal', 'yard', 'Mangal', 'Мангал', 10_000, 200, { spots: ['corner', 'right', 'left'], isActive: false }),
  item('yard_batut', 'yard', 'Batut', 'Батут', 25_000, 500, { spots: ['left'] }),
  item('yard_basketball', 'yard', 'Basketbol halqasi', 'Баскетбольное кольцо', 15_000, 300, { spots: ['corner', 'right', 'left'] }),
  item('roof_solar', 'roof', 'Quyosh panellari', 'Солнечные панели', 40_000, 800),
  item('yard_garage', 'car', 'Garaj', 'Гараж', 50_000, 1000, { spots: ['left'], minLevel: 6, isActive: false }),
  item('yard_hammock', 'yard', 'Hamak', 'Гамак', 12_000, 240),
  item('yard_playground', 'yard', 'Bolalar maydonchasi', 'Детская площадка', 40_000, 800, { spots: ['left'] }),
  item('pet_house', 'pet', 'It uyi', 'Конура', 8_000, 160, { spots: ['pet', 'corner'] }),
  item('tree_orik', 'tree', "O'rik", 'Абрикос', 5_000, 100, { isActive: false }),
  item('tree_olma', 'tree', 'Olma', 'Яблоня', 5_000, 100, { isActive: false }),
  item('tree_tut', 'tree', 'Tut', 'Тутовник', 6_000, 120),
  item('tree_behi', 'tree', 'Behi', 'Айва', 6_000, 120),
  item('pet_sheep', 'pet', "Qo'y", 'Овца', 12_000, 240),
  item('pet_hens', 'pet', 'Tovuqlar', 'Куры', 8_000, 160),
  item('pet_horse', 'pet', 'Ot', 'Лошадь', 60_000, 1200, { spots: ['corner', 'right', 'left'], minLevel: 6 }),
  item('pet_dovecote', 'pet', 'Kaptarxona', 'Голубятня', 20_000, 400, { spots: ['corner', 'right'] }),
  item('special_sumalak', 'special', "Sumalak qozoni (Navro'z)", 'Котёл сумаляка (Навруз)', 20_000, 400),
  item('light_newyear', 'light', 'Yangi yil chiroqlari', 'Новогодние огни', 12_000, 240),
  item('tree_newyear', 'special', 'Yangi yil archasi', 'Новогодняя ёлка', 20_000, 400, { spots: ['corner', 'right', 'left'] }),
  item('light_hayit', 'light', 'Hayit fonarlari', 'Фонари на Хайит', 15_000, 300),
  item('dam_besedka', 'yard', 'Besedka', 'Беседка', 30_000, 600, { spots: ['left'] }),
  item('dam_mangal', 'yard', 'Mangal', 'Мангал', 20_000, 400, { spots: ['right'] }),
  item('dam_basseyn', 'water', 'Basseyn', 'Бассейн', 75_000, 1500, { spots: ['left'] }),
  item('dam_stol', 'yard', 'Soyabonli stol', 'Стол с зонтом', 25_000, 500, { spots: ['right'] }),
  item('avto_sedan', 'car', 'Sedan', 'Седан', 60_000, 1200, { spots: ['car'] }),
  item('avto_krossover', 'car', 'Krossover', 'Кроссовер', 90_000, 1800, { spots: ['car'] }),
  item('avto_sport', 'car', 'Sport mashina', 'Спорткар', 125_000, 2500, { spots: ['car'] }),
  item('daraxt_olma', 'tree', 'Olma daraxti', 'Яблоня', 10_000, 200, { spots: ['corner'] }),
  item('daraxt_orik', 'tree', "O'rik daraxti", 'Абрикос', 10_000, 200, { spots: ['corner'] }),
  item('daraxt_gilos', 'tree', 'Gilos daraxti', 'Черешня', 10_000, 200, { spots: ['corner'] }),
  item('daraxt_archa', 'tree', 'Archa', 'Ель', 10_000, 200, { spots: ['corner'] }),
  item('daraxt_palma', 'tree', 'Palma', 'Пальма', 15_000, 300, { spots: ['corner'] }),
  item('gul_zor', 'yard', 'Gulzor', 'Цветник', 7_500, 150, { spots: ['gate_side'] }),
  item('gul_kamar', 'yard', 'Gul kamari', 'Цветочная арка', 15_000, 300, { spots: ['gate_side'] }),
  item('suv_hovuz', 'water', 'Hovuz va favvora', 'Пруд с фонтаном', 40_000, 800, { spots: ['left'] }),
  item('lux_pavilyon', 'yard', 'Pavilyon', 'Павильон', 400_000, 8000, { spots: ['left'], minLevel: LUXE_LEVEL }),
  item('lux_gril', 'yard', 'Gril oshxona', 'Гриль-кухня', 200_000, 4000, { spots: ['right'], minLevel: LUXE_LEVEL }),
  item('lux_basseyn', 'water', 'Lyuks basseyn va jakuzi', 'Люкс-бассейн с джакузи', 500_000, 10_000, { spots: ['left'], minLevel: LUXE_LEVEL }),
  item('lux_favvora', 'water', 'Marmar favvora', 'Мраморный фонтан', 300_000, 6000, { spots: ['right', 'left'], minLevel: LUXE_LEVEL }),
  item('lux_bog', 'yard', "Fransuz bog'i", 'Французский сад', 250_000, 5000, { spots: ['right', 'left'], minLevel: LUXE_LEVEL }),
  item('lux_limuzin', 'car', 'Limuzin', 'Лимузин', 600_000, 12_000, { spots: ['car'], minLevel: LUXE_LEVEL }),
  item('lux_superkar', 'car', 'Superkar', 'Суперкар', 750_000, 15_000, { spots: ['car'], minLevel: LUXE_LEVEL }),
  item('lux_jip', 'car', 'Lyuks jip', 'Люкс-внедорожник', 500_000, 10_000, { spots: ['car'], minLevel: LUXE_LEVEL }),
  item('lux_daraxt', 'tree', 'Tuvakdagi daraxt', 'Дерево в кадке', 150_000, 3000, { spots: ['corner', 'pet'], minLevel: LUXE_LEVEL }),
];
/** Tarmoqdagi holat kodi: 0–5 odam, 6 — shaharga tepadan qarayapti, `carBase` dan boshlab mashinalar. `cars` — `drive.ts` dagi CARS soni (test tekshiradi). */
export const ANIM = { away: 6, carBase: 10, cars: 10 } as const;
export const MAX_ANIM = ANIM.carBase + ANIM.cars - 1;
/** Kuchaytirish narxi (tanga): kalit — keyingi level. Amaldagisi bazada (`coins.tier`, admin "Iqtisod"). */
export const TIER_COINS: Readonly<Record<number, number>> = { 2: 300, 3: 1000, 4: 2000, 5: 3500 };

export const decorById = (id: string): DecorItem | undefined => DECOR.find((d) => d.id === id);

/** Uzoq shakli (`_lod`) bor lyuks modellar. */
export const LUXE_MODELS: ReadonlySet<string> = new Set(DECOR.filter((d) => d.id.startsWith('lux_')).map((d) => d.model));

/** Level bilan tekin keladigan hovli bezaklari: indeks = level. 1–5 — standart hovli; bezak joylari hisobiga kirmaydi. */
const GARDEN = ['path_stone', 'tree_round', 'tree_wide', 'tree_tall', 'tree_slim'] as const;
const LAMP_GARDEN = [...GARDEN, 'light_lamps'] as const;
const LEVEL_YARD: readonly (readonly string[])[] = [[], GARDEN, GARDEN, GARDEN, GARDEN, LAMP_GARDEN];
/** Avtomobil yo'li (indeks = level): 2–4 bitta, 5 ikki mashinalik. */
export const LEVEL_DRIVE: readonly (string | null)[] = [null, null, 'drive_narrow', 'drive_narrow', 'drive_narrow', 'drive_wide'];
/** Levelning o'z panjara va darvozasi (indeks = level): har biri oldingisidan yomon emas. Temir panjara va oltin darvoza — bezak sifatida. */
export const FENCE_RANK = ['fence_low', 'fence_basic', 'fence_brick', 'fence_ornate'] as const;
export const GATE_RANK = ['gate_open', 'gate_basic', 'gate_wood', 'gate_slat', 'gate_carved', 'gate_naqsh', 'gate_gold'] as const;
export const LEVEL_FENCE: readonly (typeof FENCE_RANK)[number][] = [
  'fence_low', 'fence_low', 'fence_basic', 'fence_basic', 'fence_brick', 'fence_brick',
];
export const LEVEL_GATE: readonly (typeof GATE_RANK)[number][] = [
  'gate_open', 'gate_open', 'gate_basic', 'gate_wood', 'gate_slat', 'gate_slat',
];
export const levelYard = (tier: number): readonly string[] => LEVEL_YARD[tier] ?? [];

export const BADGES = {
  asoschi: { uz: 'Shahar asoschisi', ru: 'Основатель города' },
  homiy: { uz: 'Homiy', ru: 'Спонсор' },
  investor: { uz: 'Investor', ru: 'Инвестор' },
  hokim: { uz: 'Shahar hokimi', ru: 'Хоким города' },
  hovli: { uz: 'Haftaning hovlisi', ru: 'Двор недели' },
  rais: { uz: 'Mahalla raisi', ru: 'Председатель махалли' },
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
