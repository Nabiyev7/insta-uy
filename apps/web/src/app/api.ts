import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { loginEmail } from '../../../../packages/shared/src/index.ts';

/** Lokal muhitda vite proksi orqali bir xil manzil ishlatiladi. */
const origin = typeof location === 'undefined' ? 'http://localhost' : location.origin;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || origin;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key';
export const API_URL: string = import.meta.env.VITE_API_URL || origin;
export const REALTIME_URL: string = import.meta.env.VITE_REALTIME_URL || origin;
export const PUBLIC_FILES = `${SUPABASE_URL}/storage/v1/object/public/`;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { storageKey: 'shahar-auth' } });

export class ApiError extends Error {}

/** Bazaning xato kodi (masalan "nick_taken") — UI tarjima qiladi. */
export const rpc = async <T>(fn: string, args: Readonly<Record<string, unknown>> = {}): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new ApiError(error.message || 'network');
  return data as T;
};

export const post = async <T>(path: string, body: unknown, isAuthed = false): Promise<T> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (isAuthed) {
    const { data } = await supabase.auth.getSession();
    if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  }
  let res: Response;
  try {
    res = await fetch(API_URL + path, { method: 'POST', headers, body: JSON.stringify(body) });
  } catch {
    throw new ApiError('network');
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(data.error ?? 'network');
  return data as T;
};

export const signIn = async (login: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(login.trim().toLowerCase()), password });
  if (error) throw new ApiError(error.status === 400 ? 'bad_login' : 'network');
};
export const signInWithToken = async (tokenHash: string): Promise<void> => {
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' });
  if (error) throw new ApiError('expired');
};
export const signOut = async (): Promise<void> => {
  await supabase.auth.signOut();
};
export const onSession = (fn: (s: Session | null) => void): (() => void) => {
  const { data } = supabase.auth.onAuthStateChange((_e, s) => fn(s));
  return () => data.subscription.unsubscribe();
};

export const uploadAd = async (userId: string, blob: Blob): Promise<string> => {
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from('ads').upload(path, blob, { contentType: 'image/webp' });
  if (error) throw new ApiError('upload');
  return `ads/${path}`;
};

export interface Boot {
  readonly settings: Readonly<Record<string, unknown>>;
  readonly districts: readonly { readonly id: number; readonly open: boolean; readonly name_uz: string; readonly name_ru: string; readonly taken: number }[];
  readonly streets: Readonly<Record<string, string>>;
  readonly commerce: readonly { readonly id: string; readonly title: string; readonly image: string | null; readonly link: string | null }[];
  readonly objects: readonly { readonly id: number; readonly m: string; readonly x: number; readonly z: number; readonly r: number; readonly s: number }[];
  readonly projects: readonly { readonly id: number; readonly kind: 'bog' | 'stadion' | 'koprik'; readonly uz: string; readonly ru: string; readonly goal: number; readonly raised: number; readonly status: string }[];
  readonly hero: { readonly nick: string; readonly total: number } | null;
}
export interface MyPlot {
  readonly plot: string; readonly status: string; readonly address: string; readonly instagram: string | null; readonly bio: string; readonly tier: number; readonly wall: number; readonly roof: number;
  readonly decor: readonly string[]; readonly label: string; readonly has_expansion: boolean; readonly expansion: string | null;
}
export interface Profile {
  readonly id: string; readonly login: string; readonly instagram: string | null; readonly role: string; readonly badges: readonly string[]; readonly avatar: unknown; readonly telegram: boolean; readonly coins: number;
  readonly ref: string; readonly free_used: boolean; readonly streak: number; readonly daily_done: boolean; readonly invited: number; readonly plots: readonly MyPlot[]; readonly decor: Readonly<Record<string, number>>;
  readonly transfers: readonly { readonly id: string; readonly plot: string; readonly from: string; readonly message: string }[];
  readonly notes: readonly { readonly id: number; readonly kind: string; readonly data: Readonly<Record<string, unknown>>; readonly at: string }[];
}
export interface PlotInfo {
  readonly id: string; readonly district: number; readonly type: 'hovli' | 'kvartira' | 'villa' | 'qasr'; readonly value: number; readonly address: string; readonly open: boolean; readonly status: 'free' | 'reserved' | 'pending' | 'owned';
  readonly instagram: string | null; readonly bio: string | null; readonly tier: number | null; readonly decor: readonly string[] | null; readonly label: string | null; readonly badges: readonly string[]; readonly since: string | null; readonly price: number;
}
export type CityRow = readonly [string, string | null, number, number, number, readonly string[], 'plain' | 'silver' | 'gold', string | null, 'pending' | 'owned', boolean];
