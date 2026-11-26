/** Ommaviy ma'lumot snapshoti (13-qadam, yuklama): GET /snap/<nom> — daqiqasiga ko'pi bilan 1 marta bazadan o'qiladi.
 *  Cloudflare'da Cache API (har ma'lumot markazida), Node'da (lokal) — xotira. ETag/304: o'zgarmagan bo'lsa ma'lumot qayta yuborilmaydi.
 *  Supabase'ga yuk odamlar soniga bog'liq emas. */
import { createHash } from 'node:crypto';
import { HttpError, type Ctx } from './types.ts';

export const SNAP_TTL_S = 60;
/** Faqat hammaga ochiq (anon) ma'lumot — shaxsiy narsa yo'q. */
const SNAPSHOTS: Readonly<Record<string, string>> = { city: 'api_city', boot: 'api_boot', catalog: 'api_catalog', sets: 'api_sets' };

interface Entry { readonly body: string; readonly etag: string; readonly at: number }
const memory = new Map<string, Entry>();
const edge = (): Cache | null => (typeof caches !== 'undefined' && 'default' in caches ? (caches as unknown as { default: Cache }).default : null);

const fresh = async (ctx: Ctx, name: string, fn: string, now: number): Promise<Entry> => {
  const known = memory.get(name);
  if (known && now - known.at < SNAP_TTL_S * 1000) return known;
  const cache = edge();
  const key = new Request(`https://snap.cache/${name}`);
  const hit = cache ? await cache.match(key) : undefined;
  if (hit) {
    const entry = { body: await hit.text(), etag: hit.headers.get('etag') ?? '', at: Number(hit.headers.get('x-at') ?? now) };
    memory.set(name, entry);
    return entry;
  }
  const body = JSON.stringify(await ctx.db.rpc(fn, {}));
  const entry = { body, etag: `"${createHash('sha256').update(body).digest('hex').slice(0, 20)}"`, at: now };
  memory.set(name, entry);
  if (cache) await cache.put(key, new Response(body, { headers: { etag: entry.etag, 'x-at': String(now), 'cache-control': `public, max-age=${SNAP_TTL_S}` } }));
  return entry;
};

export const snapshot = async (req: Request, ctx: Ctx, name: string, now = Date.now()): Promise<Response> => {
  const fn = SNAPSHOTS[name];
  if (!fn) throw new HttpError(404, 'not_found');
  const e = await fresh(ctx, name, fn, now);
  const headers = { etag: e.etag, 'cache-control': `public, max-age=${SNAP_TTL_S}, stale-while-revalidate=${SNAP_TTL_S * 5}`, 'content-type': 'application/json' };
  if (req.headers.get('if-none-match') === e.etag) return new Response(null, { status: 304, headers });
  return new Response(e.body, { headers });
};

/** Sinov uchun: xotira keshini tozalash. */
export const clearSnapshots = (): void => { memory.clear(); };
