/** Shahar zonalari: to'rt markaz, yashil bulvar, bog', tepalik, ko'l bo'yi. Faqat joylar — hisob boshqa faylda. */
export type Box4 = readonly [minX: number, minZ: number, maxX: number, maxZ: number];
export type ZoneId = 'bulvar' | 'bulvarKichik' | 'mamuriy' | 'biznes' | 'savdo' | 'dam' | 'tepalik' | 'kvartira1' | 'kvartira2' | 'kol';
export interface CityZone { readonly id: ZoneId; readonly uz: string; readonly ru: string; readonly rect: Box4 }

export const ZONES: Readonly<Record<ZoneId, CityZone>> = {
  bulvar: { id: 'bulvar', uz: 'Katta yashil bulvar', ru: 'Большой зелёный бульвар', rect: [-1050, -90, 800, 90] },
  bulvarKichik: { id: 'bulvarKichik', uz: 'Kichik bulvar', ru: 'Малый бульвар', rect: [-55, -820, 55, 820] },
  mamuriy: { id: 'mamuriy', uz: "Ma'muriy markaz", ru: 'Административный центр', rect: [-288, -1180, 288, -820] },
  biznes: { id: 'biznes', uz: 'Biznes markazi', ru: 'Деловой центр', rect: [800, -300, 1280, 300] },
  savdo: { id: 'savdo', uz: 'Savdo markazi', ru: 'Торговый центр', rect: [-288, 820, 288, 1180] },
  dam: { id: 'dam', uz: "Dam olish bog'i", ru: 'Парк отдыха', rect: [-1500, -320, -1050, 320] },
  tepalik: { id: 'tepalik', uz: 'Tepalik', ru: 'Холмы', rect: [-1500, -1500, -880, -880] },
  kvartira1: { id: 'kvartira1', uz: 'Yangi turar-joy', ru: 'Новый квартал', rect: [1000, -1500, 1500, -1000] },
  kvartira2: { id: 'kvartira2', uz: 'Baland uylar', ru: 'Высотки', rect: [-1500, 1000, -1000, 1500] },
  kol: { id: 'kol', uz: "Ko'l bo'yi", ru: 'Озёрный', rect: [750, 375, 1500, 1500] },
};

/** Mahalla markazlari (maktab, kafe, do'kon, sport, bolalar maydonchasi), har biri 100×100 m. */
export const CENTER_SIZE = 100;
/** Halqa yo'l, diagonal va ko'chalar ichidan o'tmasin deb rejadagi nuqtalardan surilgan (docs/chat/SAVOLLAR.md). */
export const MAHALLA_CENTERS: readonly (readonly [number, number])[] = [
  [-596, -433], [596, -433], [596, 433], [-596, 433], [-686, -1067], [686, -1067], [-686, 1067], [686, 1067],
];
export type SiteId = 'kasalxona' | 'teatr' | 'masjid' | 'otochirish';
/** Alohida katta binolar uchun hovlisi bilan ajratilgan joy. */
export const SITES: Readonly<Record<SiteId, Box4>> = {
  kasalxona: [-868, -222, -770, -104],
  teatr: [-476, -222, -383, -104],
  masjid: [383, -222, 476, -104],
  otochirish: [650, 566, 720, 626],
};
const centerBox = ([x, z]: readonly [number, number]): Box4 => [x - CENTER_SIZE / 2, z - CENTER_SIZE / 2, x + CENTER_SIZE / 2, z + CENTER_SIZE / 2];
export const CENTER_BOXES: readonly Box4[] = MAHALLA_CENTERS.map(centerBox);
/** Hovli qo'yilmaydigan, o'z binolari bor joylar. */
export const RESERVED: readonly Box4[] = [
  ...(['bulvar', 'bulvarKichik', 'mamuriy', 'biznes', 'savdo', 'dam'] as const).map((id) => ZONES[id].rect), ...Object.values(SITES), ...CENTER_BOXES,
];
export const inBox = (b: Box4, x: number, z: number, margin = 0): boolean => x > b[0] - margin && x < b[2] + margin && z > b[1] - margin && z < b[3] + margin;
export const boxTouches = (b: Box4, x: number, z: number, hx: number, hz: number): boolean => x + hx > b[0] && x - hx < b[2] && z + hz > b[1] && z - hz < b[3];
