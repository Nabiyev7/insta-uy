import { createClient } from '@supabase/supabase-js';
import { loginEmail } from '../../../packages/shared/src/index.ts';

const URL_BASE = import.meta.env.VITE_SUPABASE_URL || location.origin;
export const SITE_URL: string = import.meta.env.VITE_SITE_URL || 'http://localhost:5173';
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
export interface Me { readonly login: string; readonly role: 'moderator' | 'admin'; readonly perms: readonly string[] }
