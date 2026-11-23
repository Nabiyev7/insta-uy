import type { MasterPlan, Plot, Rot } from './types.ts';
import { rotatedSize, terrainHeight } from './masterplan/geometry.ts';

export type Lang = 'uz' | 'ru';

/** Ko'cha nomi: berilmagan bo'lsa "12-ko'cha". */
export const streetLabel = (streetId: number, name: string | null | undefined, lang: Lang): string =>
  name || (lang === 'uz' ? `${streetId}-ko'cha` : `${streetId}-я улица`);

/** "<Ko'cha nomi>, <raqam>-uy" (PLAN.md §3). */
export const plotAddress = (p: Pick<Plot, 'streetId' | 'number' | 'unit'>, name: string | null | undefined, lang: Lang): string => {
  const street = streetLabel(p.streetId, name, lang);
  const house = lang === 'uz' ? `${p.number}-uy` : `дом ${p.number}`;
  if (!p.unit) return `${street}, ${house}`;
  return `${street}, ${house}, ${lang === 'uz' ? `${p.unit}-xonadon` : `кв. ${p.unit}`}`;
};

/** Uchastka yer sathi: tepalikda har hovli o'z tekis maydonchasida — yer undan chiqib turmaydi (eng baland nuqta). */
export const padHeight = (p: { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly rot: Rot }): number => {
  if (terrainHeight(p.x, p.z) < 0.02) return 0;
  const [w, d] = rotatedSize(p.w, p.d, p.rot);
  const steps = [-0.5, -0.25, 0, 0.25, 0.5];
  return Math.max(...steps.flatMap((i) => steps.map((j) => terrainHeight(p.x + i * w, p.z + j * d)))) + 0.05;
};

export interface Box { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number }
export const footprint = (p: { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly rot: Rot }): Box => {
  const [w, d] = rotatedSize(p.w, p.d, p.rot);
  return { x: p.x, z: p.z, hx: w / 2, hz: d / 2 };
};
export const boxContains = (b: Box, x: number, z: number, margin = 0): boolean =>
  Math.abs(x - b.x) <= b.hx + margin && Math.abs(z - b.z) <= b.hz + margin;

/** Uchastka oldidagi (ko'chadagi) nuqta — teleport va video kamerasi uchun. */
export const frontOf = (p: Plot, distance = 5): { x: number; z: number; yaw: number } => {
  const yaw = (p.rot * Math.PI) / 2;
  const reach = p.d / 2 + distance;
  return { x: p.x + Math.sin(yaw) * reach, z: p.z + Math.cos(yaw) * reach, yaw };
};

/** Yacheykali fazoviy indeks: atrofdagi ob'ektlarni tez topish (chunk streaming asosi). */
export class SpatialIndex<T extends { readonly x: number; readonly z: number }> {
  private readonly cells = new Map<number, T[]>();
  private readonly size: number;
  constructor(items: readonly T[], size = 64) {
    this.size = size;
    for (const it of items) {
      const k = this.key(Math.floor(it.x / size), Math.floor(it.z / size));
      const list = this.cells.get(k);
      if (list) list.push(it);
      else this.cells.set(k, [it]);
    }
  }
  private key(cx: number, cz: number): number {
    return (cx + 512) * 1024 + (cz + 512);
  }
  query(x: number, z: number, radius: number): T[] {
    const out: T[] = [];
    const s = this.size;
    for (let cx = Math.floor((x - radius) / s); cx <= Math.floor((x + radius) / s); cx++) {
      for (let cz = Math.floor((z - radius) / s); cz <= Math.floor((z + radius) / s); cz++) {
        for (const it of this.cells.get(this.key(cx, cz)) ?? []) {
          if (Math.hypot(it.x - x, it.z - z) <= radius) out.push(it);
        }
      }
    }
    return out;
  }
}

export const districtAt = (plan: MasterPlan, x: number, z: number): number => {
  const d = plan.districts.find(({ rect }) => x >= rect[0] && x <= rect[2] && z >= rect[1] && z <= rect[3]);
  return d?.id ?? 0;
};

/** Toshkent (UTC+5) soati bo'yicha kun qismi 0..1. `minutesPerDay` berilsa tezlashtirilgan sikl. */
export const dayFraction = (nowMs: number, minutesPerDay = 0): number => {
  if (minutesPerDay > 0) {
    const period = minutesPerDay * 60_000;
    return (nowMs % period) / period;
  }
  const local = nowMs + 5 * 3_600_000;
  return (local % 86_400_000) / 86_400_000;
};

export type Season = 'bahor' | 'yoz' | 'kuz' | 'qish';
export type Holiday = 'yangi_yil' | 'navroz' | 'mustaqillik' | null;

export const seasonOf = (nowMs: number): Season => {
  const m = new Date(nowMs + 5 * 3_600_000).getUTCMonth();
  if (m >= 2 && m <= 4) return 'bahor';
  if (m >= 5 && m <= 7) return 'yoz';
  return m >= 8 && m <= 10 ? 'kuz' : 'qish';
};
export const holidayOf = (nowMs: number): Holiday => {
  const d = new Date(nowMs + 5 * 3_600_000);
  const md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
  if (md >= 1225 || md <= 105) return 'yangi_yil';
  if (md >= 319 && md <= 324) return 'navroz';
  return md >= 829 && md <= 903 ? 'mustaqillik' : null;
};

/** Kunlik deterministik ob-havo — hamma bir xil ko'radi, serversiz. */
export type Weather = 'ochiq' | 'bulut' | 'yomgir' | 'qor';
export const weatherOf = (nowMs: number): Weather => {
  const day = Math.floor((nowMs + 5 * 3_600_000) / 21_600_000);
  const h = Math.abs(Math.sin(day * 127.1 + 311.7) * 43758.5453) % 1;
  const season = seasonOf(nowMs);
  const wet = { bahor: 0.3, yoz: 0.05, kuz: 0.28, qish: 0.35 }[season];
  if (h < wet) return season === 'qish' ? 'qor' : 'yomgir';
  return h < wet + 0.25 ? 'bulut' : 'ochiq';
};

/** O'zgarmas tasodif: bir xil ID doim bir xil ko'rinish beradi. */
export const hash01 = (seed: string | number): number => {
  const s = String(seed);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  h ^= h >>> 15;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
};
