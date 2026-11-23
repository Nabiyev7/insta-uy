/** Lokal Postgres (PGlite) + Supabase muhitining minimal nusxasi. Migratsiyalar aynan ishlab chiqarishdagidek ishlaydi. */
import { readFileSync, readdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const MIGRATIONS = new URL('../../supabase/migrations/', import.meta.url);

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  create schema auth;
  grant usage on schema auth to anon, authenticated, service_role;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text not null unique, password text not null, created_at timestamptz not null default now());
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.sub', true), '')::uuid $$;
`;

export type DbRole = 'anon' | 'authenticated' | 'service_role';

export const openDb = async (dataDir?: string): Promise<PGlite> => {
  const db = new PGlite(dataDir);
  await db.waitReady;
  const { rows } = await db.query<{ n: number }>("select count(*)::int as n from pg_namespace where nspname = 'auth'");
  if (rows[0]?.n) return db;
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    try {
      await db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
    } catch (error: unknown) {
      throw new Error(`Migratsiya ${file}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return db;
};

export class RpcError extends Error {
  readonly code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const NAME = /^[a-z_][a-z0-9_]*$/;

const argTypes = new WeakMap<PGlite, Map<string, Map<string, string>>>();
const typesOf = async (db: PGlite, fn: string): Promise<Map<string, string>> => {
  const cache = argTypes.get(db) ?? new Map<string, Map<string, string>>();
  argTypes.set(db, cache);
  const known = cache.get(fn);
  if (known) return known;
  const { rows } = await db.query<{ name: string; type: string }>(
    `select a.name, format_type(t.oid, null) as type from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
     unnest(p.proargnames, p.proargtypes::oid[]) as a(name, oid) join pg_type t on t.oid = a.oid where n.nspname = 'public' and p.proname = $1`, [fn]);
  const map = new Map(rows.map((r) => [r.name, r.type]));
  cache.set(fn, map);
  return map;
};

/** PostgREST'ning rpc chaqiruviga teng: rol va JWT sub bilan, tranzaksiyada. */
export const rpc = async (db: PGlite, role: DbRole, sub: string | null, fn: string, args: Readonly<Record<string, unknown>> = {}): Promise<unknown> => {
  if (!NAME.test(fn)) throw new RpcError('not_found', '404');
  const types = await typesOf(db, fn);
  const names = Object.keys(args).filter((k) => args[k] !== undefined);
  if (names.some((n) => !types.has(n))) throw new RpcError(`no such argument in ${fn}`, 'PGRST202');
  const values = names.map((n) => {
    const v = args[n];
    return types.get(n) === 'jsonb' && v !== null ? JSON.stringify(v) : v;
  });
  try {
    return await db.transaction(async (tx) => {
      await tx.query("select set_config('request.jwt.sub', $1, true)", [sub ?? '']);
      await tx.exec(`set local role ${role}`);
      const { rows } = await tx.query<{ r: unknown }>(`select public.${fn}(${names.map((n, i) => `${n} => $${i + 1}::${types.get(n)}`).join(', ')}) as r`, values);
      return rows[0]?.r ?? null;
    });
  } catch (error: unknown) {
    const e = error as { message?: string; code?: string };
    throw new RpcError(e.message ?? 'db_error', e.code ?? '500');
  }
};
