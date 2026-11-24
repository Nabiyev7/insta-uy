import { create } from 'zustand';
import { decodePlan, type EncodedPlan, type Lang, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { setCatalog, type CatalogRow } from '../logic/decorCatalog.ts';
import type { HouseState } from '../logic/placement.ts';
import type { Mode } from './runtime.ts';
import { initialQuality, type QualityLevel } from '../logic/quality.ts';
import type { Kit } from '../world/kit.ts';
import { rpc, type Boot, type CityRow, type Profile } from './api.ts';

export type Panel =
  | { readonly kind: 'plot'; readonly id: string } | { readonly kind: 'building'; readonly id: number } | { readonly kind: 'commerce'; readonly id: string } | { readonly kind: 'street'; readonly id: number }
  | { readonly kind: 'auth' | 'me' | 'map' | 'rank' | 'coins' | 'city' | 'gazette' | 'settings' | 'help' | 'rules' | 'avatar' | 'orders' | 'menu' | 'ads' | 'privacy' | 'chat' | 'shop' | 'cars' };
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

const isMuted = (x: unknown): x is Muted => typeof x === 'object' && x !== null && typeof (x as Muted).author === 'string' && typeof (x as Muted).nick === 'string';
const readMuted = (): readonly Muted[] => {
  try {
    const list: unknown = JSON.parse(read('muted') || '[]');
    return Array.isArray(list) ? list.filter(isMuted) : [];
  } catch {
    return [];
  }
};

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
  readonly panel: Panel | null;
  readonly toasts: readonly Toast[];
  readonly lang: Lang;
  readonly quality: QualityLevel;
  readonly isAutoQuality: boolean;
  readonly isSound: boolean;
  readonly isPhoto: boolean;
  readonly district: number;
  readonly street: number;
  readonly online: number;
  readonly catalog: readonly CatalogRow[];
  readonly chat: readonly ChatLine[];
  readonly unread: number;
  readonly muted: readonly Muted[];
  readonly myAuthor: string;
  readonly mode: Mode;
  readonly fps: number;
}

export const useApp = create<AppState>(() => ({
  stage: 'loading', progress: 0, error: '', kit: null, plan: null, plotById: new Map(), boot: null, houses: new Map(), profile: null, panel: null, toasts: [],
  lang: read('lang') === 'ru' ? 'ru' : 'uz', quality: detectQuality(), isAutoQuality: !read('quality'), isSound: read('sound') === '1', isPhoto: false, district: 0, street: 0, online: 0, catalog: [], chat: [], unread: 0, muted: readMuted(), myAuthor: '', mode: 'city', fps: 0,
}));
export const setApp = useApp.setState;
export const getApp = useApp.getState;

let toastId = 0;
export const toast = (text: string, isError = false): void => {
  const id = ++toastId;
  setApp((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, isError }] }));
  setTimeout(() => setApp((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4200);
};
export const openPanel = (panel: Panel | null): void => setApp({ panel });

const toHouse = (r: CityRow): HouseState => ({ plot: r[0], nick: r[1], tier: r[2], wall: r[3], roof: r[4], decor: r[5], label: r[6], badge: r[7], status: r[8], expanded: r[9], material: r[10], frame: r[11], door: r[12] });

export const loadPlan = async (): Promise<void> => {
  const res = await fetch('/assets/masterplan.json');
  if (!res.ok) throw new Error(`Bosh reja: ${res.status}`);
  const plan = decodePlan((await res.json()) as EncodedPlan);
  setApp({ plan, plotById: new Map(plan.plots.map((p) => [p.id, p])) });
};
export const refreshBoot = async (): Promise<Boot> => {
  const boot = await rpc<Boot>('api_boot');
  // O'zgarmagan bo'lsa eski obyekt qoladi — bilbord va xarita bekorga qayta qurilmasin.
  if (JSON.stringify(boot) !== JSON.stringify(getApp().boot)) setApp({ boot });
  return getApp().boot ?? boot;
};
export const refreshCatalog = async (): Promise<void> => {
  const catalog = await rpc<readonly CatalogRow[]>('api_catalog');
  setCatalog(catalog);
  setApp({ catalog });
};
let lastRows = '';
export const refreshHouses = async (): Promise<void> => {
  const rows = await rpc<readonly CityRow[]>('api_city');
  const text = JSON.stringify(rows);
  if (text === lastRows) return;
  lastRows = text;
  setApp({ houses: new Map(rows.map((r) => [r[0], toHouse(r)])) });
};
export const refreshProfile = async (): Promise<void> => {
  try {
    setApp({ profile: await rpc<Profile>('my_profile') });
  } catch (error: unknown) {
    // Internet uzilishi foydalanuvchini "chiqarib" yubormasin.
    if (error instanceof Error && /not_signed_in|banned|permission denied|JWT/.test(error.message)) setApp({ profile: null });
  }
};
export const setting = <T,>(key: string, fallback: T): T => (getApp().boot?.settings[key] as T | undefined) ?? fallback;
