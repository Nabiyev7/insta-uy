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
const KEYS: readonly Key[] = [
  key(0, '#0a1230', '#1b2747', '#8fa6dd', 0.8, 1.15), key(0.2, '#0c1533', '#22304f', '#8fa6dd', 0.8, 1.15), key(0.26, '#4a6ea8', '#f2b98a', '#ffc38a', 1.3, 1.1),
  key(0.34, '#5fa3dc', '#d6e6ee', '#fff0d6', 2.3, 1.15), key(0.5, '#4f9be0', '#cfe6f4', '#fff8ea', 2.6, 1.25), key(0.68, '#5fa0d8', '#e6dcc6', '#ffe6bd', 2.2, 1.1),
  key(0.77, '#51508f', '#f08f5c', '#ff9c5e', 1.3, 1.1), key(0.84, '#131b40', '#39395e', '#8fa6dd', 0.8, 1.1), key(1, '#0a1230', '#1b2747', '#8fa6dd', 0.8, 1.15),
];

/** Kun vaqti 0..1 (0 — yarim tun, 0.5 — tush). */
export const daylightAt = (fraction: number, weather: Weather = 'ochiq'): Daylight => {
  const f = ((fraction % 1) + 1) % 1;
  const i = Math.max(1, KEYS.findIndex((k) => k.at >= f));
  const a = KEYS[i - 1] ?? KEYS[0]!;
  const b = KEYS[i] ?? KEYS[KEYS.length - 1]!;
  const t = (f - a.at) / Math.max(1e-6, b.at - a.at);
  const night = 1 - smooth(0.22, 0.3, f) * (1 - smooth(0.74, 0.82, f));
  const isNight = night > 0.5;
  // Tunda oy, kunduz quyosh: ikkalasi ham sharqdan g'arbga.
  const arc = isNight ? ((f + 0.22) % 1) / 0.44 : (f - 0.26) / 0.5;
  const angle = Math.max(0.08, Math.min(0.92, arc)) * Math.PI;
  const overcast = weather === 'ochiq' ? 0 : weather === 'bulut' ? 0.45 : 0.75;
  const gray: Rgb = isNight ? [0.1, 0.12, 0.17] : [0.66, 0.7, 0.74];
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
  if (season === 'kuz') return [1.35, 0.85, 0.35];
  if (season === 'qish') return [0.8, 0.72, 0.6];
  return season === 'bahor' ? [1.1, 1.12, 0.85] : [1, 1, 1];
};
