import type { Season, Weather } from '../../../../packages/shared/src/index.ts';

export type Rgb = readonly [number, number, number];
export interface Daylight {
  readonly sun: readonly [number, number, number];
  readonly sunColor: Rgb;
  readonly sunIntensity: number;
  readonly skyTop: Rgb;
  readonly skyHorizon: Rgb;
  readonly ambient: number;
  /** 0 kunduz … 1 tun. */
  readonly night: number;
}

const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smooth = (a: number, b: number, v: number): number => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

interface Key { readonly at: number; readonly top: Rgb; readonly horizon: Rgb; readonly sun: Rgb; readonly power: number; readonly ambient: number }
const key = (at: number, top: string, horizon: string, sun: string, power: number, ambient: number): Key => ({ at, top: hex(top), horizon: hex(horizon), sun: hex(sun), power, ambient });
/** Kunduz uzun, tun qisqa va yorug' (sutkaning ~28%): shahar ko'pincha ochiq kunda ko'rinsin. */
const KEYS: readonly Key[] = [
  key(0, '#2b4788', '#5a78ba', '#c6d5ff', 0.75, 1.0), key(0.1, '#2d498a', '#5f7dbe', '#c6d5ff', 0.75, 1.0), key(0.15, '#78a6e0', '#dfeaf7', '#fff2e0', 1.1, 1.1),
  key(0.24, '#63b2f0', '#d9effb', '#fff8ec', 1.5, 1.2), key(0.5, '#4fa9f0', '#d6eefc', '#fffaf0', 1.65, 1.22), key(0.78, '#62b0ee', '#dcedf7', '#fff6e8', 1.5, 1.2),
  key(0.86, '#8a9fd8', '#f5e0d8', '#ffeedd', 1.1, 1.1), key(0.92, '#3a5597', '#7a93ca', '#c6d5ff', 0.8, 1.0), key(1, '#2b4788', '#5a78ba', '#c6d5ff', 0.75, 1.0),
];

const DAWN = [0.1, 0.17] as const;
const DUSK = [0.85, 0.92] as const;
const NIGHT_HALF = 0.13;
/** Kun vaqti 0..1 (0 — yarim tun, 0.5 — tush). */
export const daylightAt = (fraction: number, weather: Weather = 'ochiq'): Daylight => {
  const f = ((fraction % 1) + 1) % 1;
  const i = Math.max(1, KEYS.findIndex((k) => k.at >= f));
  const a = KEYS[i - 1] ?? KEYS[0]!;
  const b = KEYS[i] ?? KEYS[KEYS.length - 1]!;
  const t = (f - a.at) / Math.max(1e-6, b.at - a.at);
  const night = 1 - smooth(DAWN[0], DAWN[1], f) * (1 - smooth(DUSK[0], DUSK[1], f));
  const isNight = night > 0.5;
  // Tunda oy, kunduz quyosh: ikkalasi ham sharqdan g'arbga.
  const arc = isNight ? ((f + NIGHT_HALF) % 1) / (NIGHT_HALF * 2) : (f - NIGHT_HALF) / (1 - NIGHT_HALF * 2);
  const angle = Math.max(0.08, Math.min(0.92, arc)) * Math.PI;
  const overcast = weather === 'ochiq' ? 0 : weather === 'bulut' ? 0.45 : 0.75;
  const gray: Rgb = isNight ? [0.2, 0.24, 0.34] : [0.76, 0.82, 0.87];
  return {
    sun: [Math.cos(angle), Math.sin(angle) * 0.9 + 0.1, 0.35],
    sunColor: mix(a.sun, b.sun, t),
    sunIntensity: (a.power + (b.power - a.power) * t) * (1 - overcast * 0.7),
    skyTop: mix(mix(a.top, b.top, t), gray, overcast * 0.8),
    skyHorizon: mix(mix(a.horizon, b.horizon, t), gray, overcast * 0.7),
    ambient: (a.ambient + (b.ambient - a.ambient) * t) * (1 + overcast * 0.1),
    night,
  };
};

export const snowAmount = (season: Season, weather: Weather): number => (weather === 'qor' ? 0.85 : season === 'qish' ? 0.35 : 0);
export const leafTint = (season: Season): Rgb => {
  if (season === 'kuz') return [1.18, 1.02, 0.68];
  if (season === 'qish') return [0.9, 0.92, 0.88];
  return season === 'bahor' ? [1.08, 1.06, 0.95] : [1, 1, 1];
};
