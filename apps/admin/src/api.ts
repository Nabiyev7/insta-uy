import { createClient } from '@supabase/supabase-js';
import { loginEmail } from '../../../packages/shared/src/index.ts';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL || location.origin;
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
const API_URL: string = import.meta.env.VITE_API_URL || location.origin;
export const FILES = `${URL_BASE}/storage/v1/object/public/`;
export const supabase = createClient(URL_BASE, import.meta.env.VITE_SUPABASE_ANON_KEY || 'missing-anon-key', { auth: { storageKey: 'shahar-admin' } });

export const rpc = async <T,>(fn: string, args: Readonly<Record<string, unknown>> = {}): Promise<T> => {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
};
export const signIn = async (login: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(login.trim().toLowerCase()), password });
  if (error) throw new Error("Login yoki parol noto'g'ri");
};
/** Botning /admin havolasi (?kirish=...): bir martalik, manzildan darhol olib tashlanadi. */
export const signInFromLink = async (): Promise<boolean> => {
  const url = new URL(location.href);
  const token = url.searchParams.get('kirish');
  if (token === null) return false;
  url.searchParams.delete('kirish');
  history.replaceState(null, '', url.pathname + url.search + url.hash);
  const res = await fetch(`${API_URL}/auth/telegram/redeem`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token }) });
  const body = (await res.json().catch(() => ({}))) as { token_hash?: string };
  if (!body.token_hash) throw new Error('Havola eskirgan yoki ishlatilgan — botga qaytadan /admin yozing');
  const { error } = await supabase.auth.verifyOtp({ token_hash: body.token_hash, type: 'magiclink' });
  if (error) throw new Error('Havola eskirgan yoki ishlatilgan — botga qaytadan /admin yozing');
  return true;
};
/** Server yo'li (masalan Stars qaytarish) — admin sessiyasi bilan. */
export const serverPost = async (path: string, body: unknown): Promise<unknown> => {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify(body) });
  const out = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(out.error ?? `HTTP ${res.status}`);
  return out;
};
/** Server javobi rasm bo'lsa (nizo dalili). */
export const serverBlob = async (path: string, body: unknown): Promise<Blob> => {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${API_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${data.session?.access_token ?? ''}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
};
export interface Me { readonly login: string; readonly role: 'moderator' | 'admin'; readonly perms: readonly string[] }
