/** Avtomatik sifat: FPS tushsa pasayadi, uzoq barqaror bo'lsa ko'tariladi (PLAN §12). */
export type QualityLevel = 'low' | 'mid' | 'high';
export interface Quality {
  readonly level: QualityLevel;
  readonly dpr: number;
  readonly near: number;
  /** Hovlidagi mayda bezaklar ko'rinadigan masofa. */
  readonly detail: number;
  readonly mid: number;
  readonly fog: number;
  /** Shahar rejimi: eng yuqori balandlik, ko'rinish radiusi va daraxtlar masofasi. */
  readonly cityMax: number;
  readonly cityView: number;
  readonly cityTree: number;
  readonly labels: number;
  readonly hasShadows: boolean;
  readonly npcs: number;
  readonly particles: number;
}
export const QUALITY: Readonly<Record<QualityLevel, Quality>> = {
  low: { level: 'low', dpr: 0.85, near: 46, detail: 32, mid: 150, fog: 190, cityMax: 190, cityView: 480, cityTree: 190, labels: 8, hasShadows: false, npcs: 6, particles: 0 },
  mid: { level: 'mid', dpr: 1.25, near: 80, detail: 60, mid: 260, fog: 330, cityMax: 240, cityView: 600, cityTree: 340, labels: 16, hasShadows: false, npcs: 14, particles: 500 },
  high: { level: 'high', dpr: 2, near: 130, detail: 110, mid: 480, fog: 640, cityMax: 300, cityView: 800, cityTree: 560, labels: 26, hasShadows: true, npcs: 24, particles: 1400 },
};
const ORDER: readonly QualityLevel[] = ['low', 'mid', 'high'];

export interface DeviceHints { readonly cores: number; readonly memoryGb: number; readonly isTouch: boolean }
export const initialQuality = (d: DeviceHints): QualityLevel => {
  if (d.memoryGb <= 3 || d.cores <= 4) return 'low';
  return d.isTouch ? 'mid' : 'high';
};

const WINDOW_MS = 2500;
const LOW_FPS = 29;
const HIGH_FPS = 56;
const CALM_WINDOWS = 6;

export interface GovernorState { readonly level: QualityLevel; readonly frames: number; readonly elapsed: number; readonly calm: number; readonly ceiling: QualityLevel }
export const startGovernor = (level: QualityLevel): GovernorState => ({ level, frames: 0, elapsed: 0, calm: 0, ceiling: 'high' });

export const stepGovernor = (s: GovernorState, deltaMs: number): GovernorState => {
  // Yashirin vkladkadan qaytgandagi uzun kadr hisobga olinmaydi.
  if (deltaMs > 500) return { ...s, frames: 0, elapsed: 0 };
  const frames = s.frames + 1;
  const elapsed = s.elapsed + deltaMs;
  if (elapsed < WINDOW_MS) return { ...s, frames, elapsed };
  const fps = (frames * 1000) / elapsed;
  const i = ORDER.indexOf(s.level);
  if (fps < LOW_FPS && i > 0) {
    const level = ORDER[i - 1] ?? 'low';
    return { level, frames: 0, elapsed: 0, calm: 0, ceiling: level }; // qayta ko'tarilib tebranmasin
  }
  const calm = fps > HIGH_FPS ? s.calm + 1 : 0;
  if (calm >= CALM_WINDOWS && i < ORDER.indexOf(s.ceiling)) return { ...s, level: ORDER[i + 1] ?? 'high', frames: 0, elapsed: 0, calm: 0 };
  return { ...s, frames: 0, elapsed: 0, calm };
};
