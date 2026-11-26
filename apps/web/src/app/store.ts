import { create } from 'zustand';
import { decodePlan, type EncodedPlan, type Lang, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { setCatalog, type CatalogRow, type SetRow } from '../logic/decorCatalog.ts';
import type { Construction } from '../logic/construction.ts';
import type { HouseState } from '../logic/placement.ts';
import type { Mode } from './runtime.ts';
import { initialQuality, type QualityLevel } from '../logic/quality.ts';
import type { Kit } from '../world/kit.ts';
import { rpc, type Boot, type CityRow, type Profile, snap } from './api.ts';

export type Panel =
  | { readonly kind: 'plot' | 'bio' | 'yard'; readonly id: string } | { readonly kind: 'congrats'; readonly id: string; /** Bor bo'lsa — level oshdi, aks holda uy qurildi. */ readonly tier?: number }
  | { readonly kind: 'civic'; readonly id: string } | { readonly kind: 'gifts'; readonly to?: string } | { readonly kind: 'building'; readonly id: number } | { readonly kind: 'commerce'; readonly id: string } | { readonly kind: 'street'; readonly id: number }
  | { readonly kind: 'auth' | 'me' | 'map' | 'rank' | 'coins' | 'notes' | 'city' | 'gazette' | 'settings' | 'help' | 'rules' | 'avatar' | 'orders' | 'menu' | 'ads' | 'privacy' | 'chat' | 'shop' | 'cars' };
export type Stage = 'loading' | 'intro' | 'play' | 'error';
export interface Toast { readonly id: number; readonly text: string; readonly isError: boolean }
/** channel: 0 — umumiy, 1..12 — mahalla. */
export interface ChatLine { readonly id: string; readonly channel: number; readonly nick: string; readonly author: string; readonly text: string; readonly at: number }
/** Jim qilingan odam: kalit barqaror, nik faqat ko'rsatish uchun. */
export interface Muted { readonly author: string; readonly nick: string }

export const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // maxfiy rejim
  }
};
export const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // xotira yopiq — sozlama shu seansda qoladi
  }
};

const detectQuality = (): QualityLevel => {
  const saved = read('quality');
  if (saved === 'low' || saved === 'mid' || saved === 'high') return saved;
  const nav = navigator as Navigator & { deviceMemory?: number };
  return initialQuality({ cores: nav.hardwareConcurrency || 4, memoryGb: nav.deviceMemory ?? 8, isTouch: matchMedia('(pointer: coarse)').matches });
};

export type Theme = 'auto' | 'light' | 'dark';

const isMuted = (x: unknown): x is Muted => typeof x === 'object' && x !== null && typeof (x as Muted).author === 'string' && typeof (x as Muted).nick === 'string';
const readMuted = (): readonly Muted[] => {
  try {
    const list: unknown = JSON.parse(read('muted') || '[]');
    return Array.isArray(list) ? list.filter(isMuted) : [];
  } catch {
    return [];
  }
};

/** Sotib olishdan oldin sinab ko'rish: faqat shu odamda, saqlanmaydi. */
export interface Preview { readonly plot: string; readonly decor: string; readonly anchor: string }

export interface AppState {
  readonly stage: Stage;
  readonly progress: number;
  readonly error: string;
  readonly kit: Kit | null;
  readonly plan: MasterPlan | null;
  readonly plotById: ReadonlyMap<string, Plot>;
  readonly boot: Boot | null;
  readonly houses: ReadonlyMap<string, HouseState>;
  readonly profile: Profile | null;
  /** Kirganmi — hali noma'lum (sessiya bor, profil kelmagan; Mini App kirishi davom etyapti), mehmon yoki kirgan. Noma'lumda "+" chizilmaydi. */
  readonly authState: AuthState;
  readonly panel: Panel | null;
  /** Orqaga qaytish yo'li: ochiq oynadan oldingilari. */
  readonly trail: readonly Panel[];
  readonly toasts: readonly Toast[];
  readonly lang: Lang;
  readonly quality: QualityLevel;
  readonly isAutoQuality: boolean;
  readonly isSound: boolean;
  readonly theme: Theme;
  readonly isLeftHand: boolean;
  readonly isOffline: boolean;
  /** Pastdagi karta: hozir qurilgan uy yoki oshgan level. */
  readonly cheer: { readonly plot: string; readonly tier: number; readonly isBuilt: boolean } | null;
  /** Hozir topilgan xazina (tanga). */
  readonly treasure: number | null;
  /** Tasdiq oynasi (askConfirm). */
  readonly ask: { readonly text: string; readonly isDanger: boolean; readonly resolve: (isYes: boolean) => void } | null;
  /** Ko'rib bo'lingan yangi bezaklar. */
  readonly seenNew: readonly string[];
  readonly isPhoto: boolean;
  /** Ekranni tozalash: hamma tugmalar yashirin, faqat shahar. */
  readonly isClean: boolean;
  readonly district: number;
  readonly street: number;
  readonly online: number;
  /** Jonli server (ko'p o'yinchi): uxlab qolgan bo'lsa — ulanmoqda, sayt yakka rejimda ishlayveradi. */
  readonly isLiveWaking: boolean;
  readonly catalog: readonly CatalogRow[];
  readonly sets: readonly SetRow[];
  readonly preview: Preview | null;
  /** Hozir qurilayotgan uy (effekt). */
  readonly building: Construction | null;
  readonly chat: readonly ChatLine[];
  readonly unread: number;
  readonly muted: readonly Muted[];
  readonly myAuthor: string;
  readonly mode: Mode;
  readonly fps: number;
}

export type AuthState = 'unknown' | 'guest' | 'user';
export const useApp = create<AppState>(() => ({
  stage: 'loading', progress: 0, error: '', kit: null, plan: null, plotById: new Map(), boot: null, houses: new Map(), profile: null, authState: 'unknown', panel: null, trail: [], toasts: [],
  lang: read('lang') === 'ru' ? 'ru' : 'uz', quality: detectQuality(), isAutoQuality: true, isSound: read('sound') === '1', theme: 'dark', isLeftHand: false, isOffline: !navigator.onLine, cheer: null, treasure: null, ask: null, seenNew: (read('seenNew') ?? '').split(',').filter(Boolean), isPhoto: false, isClean: false, district: 0, street: 0, online: 0, isLiveWaking: false, catalog: [], sets: [], preview: null, building: null, chat: [], unread: 0, muted: readMuted(), myAuthor: '', mode: 'city', fps: 0,
}));
export const setApp = useApp.setState;
export const getApp = useApp.getState;

let toastId = 0;
export const toast = (text: string, isError = false, ms = 4200): void => {
  const id = ++toastId;
  setApp((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, isError }] }));
  setTimeout(() => setApp((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
};
const sameAs = (a: Panel, b: Panel): boolean => JSON.stringify(a) === JSON.stringify(b);
const MAX_TRAIL = 12;
/** Oyna ochish: ustiga ochilsa oldingisi eslab qolinadi; null — hammasi yopiladi. */
export const openPanel = (panel: Panel | null): void => setApp((s) => {
  if (!panel) return { panel: null, trail: [] };
  if (!s.panel || sameAs(s.panel, panel)) return { panel, trail: s.panel ? s.trail : [] };
  // Yo'lda shu oyna bor bo'lsa, o'shangacha qaytiladi (aylanib qolmasin).
  const at = s.trail.findIndex((p) => sameAs(p, panel));
  return { panel, trail: at >= 0 ? s.trail.slice(0, at) : [...s.trail, s.panel].slice(-MAX_TRAIL) };
});
/** Pastki panel va shahardan bosilganda: yo'l boshidan boshlanadi. */
export const openRoot = (panel: Panel | null): void => setApp({ panel, trail: [] });
export const backPanel = (): void => setApp((s) => ({ panel: s.trail.at(-1) ?? null, trail: s.trail.slice(0, -1) }));
/** Kirish kerak bo'lgan joydan: kirgach o'sha oynaga qaytadi. */
export const openAuth = (next?: Panel): void => setApp((s) => {
  if (s.panel?.kind === 'auth') return {};
  const before = next ?? s.panel;
  return { panel: { kind: 'auth' }, trail: before ? [...s.trail, before].slice(-MAX_TRAIL) : [] };
});
export const finishAuth = (): void => setApp((s) => {
  if (s.panel?.kind !== 'auth') return {};
  return { panel: s.trail.at(-1) ?? { kind: 'me' }, trail: s.trail.slice(0, -1) };
});
export const markNewSeen = (ids: readonly string[]): void => setApp((s) => {
  const seenNew = [...new Set([...s.seenNew, ...ids])];
  write('seenNew', seenNew.join(','));
  return { seenNew };
});

/** Uy ranglari tanlanmaydi: har level o'z standart rangida (bazadagi eski qiymatlar e'tiborsiz). */
const toHouse = (r: CityRow): HouseState => ({ plot: r[0], nick: r[1], tier: r[2], wall: 0, roof: 0, decor: r[5], label: r[6], badge: r[7], status: r[8], expanded: r[9], material: 0, frame: 0, door: 0, hearts: r[13] ?? 0 });

export const loadPlan = async (): Promise<void> => {
  const res = await fetch('/assets/masterplan.json');
  if (!res.ok) throw new Error(`Bosh reja: ${res.status}`);
  const plan = decodePlan((await res.json()) as EncodedPlan);
  setApp({ plan, plotById: new Map(plan.plots.map((p) => [p.id, p])) });
};
export const refreshBoot = async (): Promise<Boot> => {
  const boot = await snap<Boot>('boot', 'api_boot');
  // O'zgarmagan bo'lsa eski obyekt qoladi — bilbord va xarita bekorga qayta qurilmasin.
  if (JSON.stringify(boot) !== JSON.stringify(getApp().boot)) setApp({ boot });
  return getApp().boot ?? boot;
};
export const refreshCatalog = async (): Promise<void> => {
  const [catalog, sets] = await Promise.all([snap<readonly CatalogRow[]>('catalog', 'api_catalog'), snap<readonly SetRow[]>('sets', 'api_sets')]);
  setCatalog(catalog);
  setApp({ catalog, sets });
};
let lastRows = '';
/** `snap` — davriy yangilash va birinchi yuklash (1 daqiqalik snapshot); sukut — o'z amalimizdan keyin to'g'ridan-to'g'ri bazadan (yangi uy darhol ko'rinsin). */
export const refreshHouses = async (source: 'snap' | 'live' = 'live'): Promise<void> => {
  const rows = source === 'snap' ? await snap<readonly CityRow[]>('city', 'api_city') : await rpc<readonly CityRow[]>('api_city');
  const text = JSON.stringify(rows);
  if (text === lastRows) return;
  lastRows = text;
  setApp({ houses: new Map(rows.map((r) => [r[0], toHouse(r)])) });
};
export const refreshProfile = async (): Promise<void> => {
  try {
    setApp({ profile: await rpc<Profile>('my_profile'), authState: 'user' });
  } catch (error: unknown) {
    // Internet uzilishi foydalanuvchini "chiqarib" yubormasin.
    if (error instanceof Error && /not_signed_in|banned|permission denied|JWT/.test(error.message)) setApp({ profile: null, authState: 'guest' });
  }
};
export const setting = <T,>(key: string, fallback: T): T => (getApp().boot?.settings[key] as T | undefined) ?? fallback;
