/** FAQAT LOKAL: Supabase REST/Auth/Storage emulyatori (PGlite ustida). Ishlab chiqarishda ishlatilmaydi. */
import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';
import { rpc, RpcError, type DbRole } from './db.ts';

export interface EmuKeys { readonly anon: string; readonly service: string; readonly secret: string }

const b64 = (s: string | Buffer): string => Buffer.from(s).toString('base64url');
const sign = (secret: string, data: string): string => createHmac('sha256', secret).update(data).digest('base64url');
export const makeJwt = (secret: string, claims: Record<string, unknown>, seconds = 3600): string => {
  const now = Math.floor(Date.now() / 1000);
  const head = `${b64('{"alg":"HS256","typ":"JWT"}')}.${b64(JSON.stringify({ iat: now, exp: now + seconds, ...claims }))}`;
  return `${head}.${sign(secret, head)}`;
};
const readJwt = (secret: string, jwt: string): { sub?: string; role?: string } | null => {
  const [h, p, s] = jwt.split('.');
  if (!h || !p || !s) return null;
  const expected = Buffer.from(sign(secret, `${h}.${p}`));
  const given = Buffer.from(s);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const claims = JSON.parse(Buffer.from(p, 'base64url').toString()) as { exp: number; sub?: string; role?: string };
  return claims.exp * 1000 > Date.now() ? claims : null;
};
export const makeKeys = (secret: string): EmuKeys => {
  const year = 31_536_000;
  return { secret, anon: makeJwt(secret, { role: 'anon' }, year), service: makeJwt(secret, { role: 'service_role' }, year) };
};

const hashPassword = (pw: string, salt = randomBytes(16).toString('hex')): string => `${salt}:${scryptSync(pw, salt, 32).toString('hex')}`;
const checkPassword = (pw: string, stored: string): boolean => {
  const salt = stored.split(':')[0] ?? '';
  return timingSafeEqual(Buffer.from(hashPassword(pw, salt)), Buffer.from(stored));
};

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS' };
const reply = (data: unknown, status = 200): Response =>
  new Response(status === 204 ? null : JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } });

interface UserRow { readonly id: string; readonly email: string; readonly password: string }
const MIME: Readonly<Record<string, string>> = { '.mp4': 'video/mp4', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' };

export const createEmulator = (db: PGlite, keys: EmuKeys, storageDir: string): ((req: Request) => Promise<Response>) => {
  const refresh = new Map<string, string>();
  const magic = new Map<string, string>();

  const userBy = async (col: 'id' | 'email', v: string): Promise<UserRow | undefined> =>
    (await db.query<UserRow>(`select id, email, password from auth.users where ${col}::text = $1`, [v])).rows[0];
  const publicUser = (u: UserRow): Record<string, unknown> => ({ id: u.id, email: u.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: new Date(0).toISOString() });
  const session = (u: UserRow): Record<string, unknown> => {
    const token = randomUUID();
    refresh.set(token, u.id);
    return {
      access_token: makeJwt(keys.secret, { sub: u.id, role: 'authenticated', email: u.email, aud: 'authenticated' }), token_type: 'bearer', expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: token, user: publicUser(u),
    };
  };
  const caller = (req: Request): { role: DbRole; sub: string | null } => {
    const jwt = (req.headers.get('authorization') ?? `Bearer ${req.headers.get('apikey') ?? ''}`).replace(/^Bearer /, '');
    const claims = readJwt(keys.secret, jwt);
    const role = claims?.role;
    return { role: role === 'service_role' || role === 'authenticated' ? role : 'anon', sub: claims?.sub ?? null };
  };

  const authRoute = async (req: Request, p: string, url: URL): Promise<Response> => {
    const body = (req.method === 'POST' || req.method === 'PUT' ? await req.json().catch(() => ({})) : {}) as Record<string, string>;
    const me = caller(req);
    if (p === 'token') {
      if (url.searchParams.get('grant_type') === 'password') {
        const u = await userBy('email', body.email ?? '');
        if (!u || !checkPassword(body.password ?? '', u.password)) return reply({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
        return reply(session(u));
      }
      const id = refresh.get(body.refresh_token ?? '');
      const u = id ? await userBy('id', id) : undefined;
      refresh.delete(body.refresh_token ?? '');
      return u ? reply(session(u)) : reply({ error_code: 'refresh_token_not_found', msg: 'bad refresh' }, 400);
    }
    if (p === 'verify') {
      const email = magic.get(body.token_hash ?? '');
      magic.delete(body.token_hash ?? '');
      const u = email ? await userBy('email', email) : undefined;
      return u ? reply(session(u)) : reply({ error_code: 'otp_expired', msg: 'expired' }, 403);
    }
    if (p === 'logout') return reply(null, 204);
    if (p === 'user') {
      const u = me.sub ? await userBy('id', me.sub) : undefined;
      return u ? reply(publicUser(u)) : reply({ msg: 'unauthorized' }, 401);
    }
    if (me.role !== 'service_role') return reply({ msg: 'forbidden' }, 403);
    if (p === 'admin/users' && req.method === 'POST') {
      const { rows } = await db.query<UserRow>('insert into auth.users (email, password) values ($1, $2) on conflict (email) do nothing returning id, email, password', [body.email, hashPassword(body.password ?? '')]);
      return rows[0] ? reply(publicUser(rows[0])) : reply({ msg: 'email_exists' }, 422);
    }
    if (p === 'admin/generate_link') {
      const token = randomUUID();
      magic.set(token, body.email ?? '');
      return reply({ hashed_token: token });
    }
    const id = /^admin\/users\/([0-9a-f-]{36})$/.exec(p)?.[1];
    if (!id) return reply({ msg: 'not_found' }, 404);
    if (req.method === 'PUT') await db.query('update auth.users set password = $2 where id = $1', [id, hashPassword(body.password ?? '')]);
    if (req.method === 'DELETE') { await db.query('delete from auth.users where id = $1', [id]); return reply({}); }
    const u = await userBy('id', id);
    return u ? reply(publicUser(u)) : reply({ msg: 'not_found' }, 404);
  };

  const storageRoute = async (req: Request, p: string): Promise<Response> => {
    const rel = decodeURIComponent(p.replace(/^object\/(public\/)?/, ''));
    if (!/^(ads|videos|backups)\/[\w./-]+$/.test(rel) || rel.includes('..')) return reply({ message: 'bad path' }, 400);
    const file = path.join(storageDir, rel);
    if (req.method === 'GET') {
      if (!p.startsWith('object/public/') || rel.startsWith('backups/')) return reply({ message: 'forbidden' }, 403);
      try {
        return new Response(new Uint8Array(await readFile(file)), { headers: { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream', ...CORS } });
      } catch {
        return reply({ message: 'not found' }, 404);
      }
    }
    const me = caller(req);
    const isOwnAd = me.role === 'authenticated' && rel.startsWith(`ads/${me.sub}/`);
    if (me.role !== 'service_role' && !isOwnAd) return reply({ message: 'forbidden' }, 403);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await req.arrayBuffer()));
    return reply({ Key: rel });
  };

  return async (req) => {
    if (req.method === 'OPTIONS') return reply(null, 204);
    const url = new URL(req.url);
    const fn = /^\/rest\/v1\/rpc\/(\w+)$/.exec(url.pathname)?.[1];
    if (fn && req.method === 'POST') {
      const { role, sub } = caller(req);
      const text = await req.text();
      try {
        return reply(await rpc(db, role, sub, fn, text ? (JSON.parse(text) as Record<string, unknown>) : {}));
      } catch (error: unknown) {
        if (error instanceof RpcError) return reply({ message: error.message, code: error.code }, error.code === '42501' ? 403 : 400);
        throw error;
      }
    }
    if (url.pathname.startsWith('/auth/v1/')) return authRoute(req, url.pathname.slice(9), url);
    if (url.pathname.startsWith('/storage/v1/')) return storageRoute(req, url.pathname.slice(12));
    return reply({ message: 'not found' }, 404);
  };
};
