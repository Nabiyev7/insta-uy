/** Zaxiradan tiklash (bir buyruq): npm run restore -- cityland-2026-11-26.json.gz
 *  Telegram'ga kelgan zaxira (.json yoki .json.gz; bo'laklar bo'lsa avval birlashtiring) → `<fayl>.tiklash.sql`.
 *  Shu SQL ni Supabase → SQL Editor ga qo'yib "Run" bosasiz (bo'sh bazaga, migratsiyalardan keyin). Mavjud qatorlarga tegmaydi (on conflict do nothing). */
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

/** Tartib muhim: bog'liq jadvallar keyin. */
export const ORDER = ['settings', 'districts', 'streets', 'profiles', 'plot_state', 'owned_decor', 'decor_catalog', 'orders', 'payments', 'commerce_state', 'map_versions', 'map_objects', 'projects', 'project_contributions', 'ownership_log', 'waitlist', 'gazette'];
/** `generated always` id li jadvallar. */
const IDENTITY = new Set(['payments', 'projects', 'map_versions', 'map_objects', 'ownership_log', 'project_contributions', 'gazette']);

const quote = (s) => `'${s.replaceAll("'", "''")}'`;
export const restoreSql = (backup) => {
  const parts = ['-- CityLand UZ: zaxiradan tiklash', `-- Zaxira vaqti: ${backup.at ?? '?'}`, 'begin;'];
  for (const table of ORDER) {
    const rows = backup[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const over = IDENTITY.has(table) ? ' overriding system value' : '';
    parts.push(`insert into public.${table}${over} select * from jsonb_populate_recordset(null::public.${table}, ${quote(JSON.stringify(rows))}::jsonb) on conflict do nothing;`);
  }
  parts.push('commit;');
  return parts.join('\n');
};

const file = process.argv[2];
if (file) {
  const raw = readFileSync(file);
  const text = file.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
  const out = `${file.replace(/\.gz$/, '')}.tiklash.sql`;
  writeFileSync(out, restoreSql(JSON.parse(text)));
  process.stdout.write(`Tayyor: ${out}\nSupabase → SQL Editor → faylni qo'ying → Run.\n`);
}
