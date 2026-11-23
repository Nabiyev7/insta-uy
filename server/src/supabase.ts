import { HttpError, type AuthUser, type Backend, type Env } from './types.ts';

interface ApiError { readonly message?: string; readonly msg?: string; readonly code?: string | number }

/** Supabase REST/Auth/Storage — kutubxonasiz, Worker'da ham Node'da ham ishlaydi. */
export const supabaseBackend = (env: Env, fetcher: typeof fetch = fetch): Backend => {
  const base = env.SUPABASE_URL.replace(/\/$/, '');
  const auth = { apikey: env.SUPABASE_SERVICE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}` };

  const call = async (path: string, init: RequestInit): Promise<unknown> => {
    const res = await fetcher(base + path, { ...init, headers: { 'content-type': 'application/json', ...auth, ...init.headers } });
    const text = await res.text();
    const data: unknown = text ? JSON.parse(text) : null;
    if (res.ok) return data;
    const e = (data ?? {}) as ApiError;
    throw new HttpError(res.status >= 500 ? 502 : 400, e.message ?? e.msg ?? 'upstream');
  };
  const post = (path: string, body: unknown, method = 'POST'): Promise<unknown> => call(path, { method, body: JSON.stringify(body) });
  const toUser = (raw: unknown): AuthUser => {
    const u = raw as { id: string; email?: string };
    return { id: u.id, email: u.email ?? '' };
  };

  return {
    rpc: async <T>(fn: string, args: Readonly<Record<string, unknown>> = {}) => (await post(`/rest/v1/rpc/${fn}`, args)) as T,
    createUser: async (email, password) => toUser(await post('/auth/v1/admin/users', { email, password, email_confirm: true })),
    setPassword: async (id, password) => { await post(`/auth/v1/admin/users/${id}`, { password }, 'PUT'); },
    deleteUser: async (id) => { await call(`/auth/v1/admin/users/${id}`, { method: 'DELETE' }); },
    magicToken: async (email) => {
      const r = (await post('/auth/v1/admin/generate_link', { type: 'magiclink', email })) as { hashed_token?: string; properties?: { hashed_token: string } };
      const token = r.hashed_token ?? r.properties?.hashed_token;
      if (!token) throw new HttpError(502, 'upstream');
      return token;
    },
    userByJwt: async (jwt) => {
      const res = await fetcher(`${base}/auth/v1/user`, { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: `Bearer ${jwt}` } });
      return res.ok ? toUser(await res.json()) : null;
    },
    emailOf: async (id) => {
      const u = toUser(await call(`/auth/v1/admin/users/${id}`, { method: 'GET' }));
      return u.email || null;
    },
    putFile: async (bucket, path, body, contentType) => {
      await call(`/storage/v1/object/${bucket}/${path}`, { method: 'POST', body, headers: { 'content-type': contentType, 'x-upsert': 'true' } });
    },
  };
};
