/** Bosh reja v3 ni SQL ga aylantiradi: supabase/migrations/0010_masterplan_v3.sql. Katalog va so'z filtri 0007 da (o'zgarmaydi). */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePlan, fromLocal, type EncodedPlan } from '../src/index.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const lit = (v: string | number | boolean | null): string => (v === null ? 'null' : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : String(v));
const insert = (table: string, cols: string, rows: readonly (readonly (string | number | boolean | null)[])[]): string =>
  `insert into ${table} (${cols}) values\n${rows.map((r) => `(${r.map(lit).join(',')})`).join(',\n')};\n`;

const LOCKS = [['districts', 'districts_locked'], ['plots', 'plots_locked'], ['expansions', 'expansions_locked'], ['commerce', 'commerce_locked'], ['roads', 'roads_locked'], ['streets', 'streets_locked']] as const;
const setLocks = (state: 'enable' | 'disable'): string => LOCKS.map(([t, trigger]) => `alter table public.${t} ${state} trigger ${trigger};`).join('\n');

/** Burilgan yo'l bazada mayda to'g'ri qutilarga bo'linadi (xarita muharriri va xazina shulardan foydalanadi). */
const SLAB = 8;
const tenth = (v: number): number => Math.round(v * 10) / 10;
const roadBoxes = plan.roads.flatMap((r) => {
  if (r.angle === undefined) return [{ x: r.x, z: r.z, w: r.w, d: r.d }];
  const n = Math.max(1, Math.ceil(r.w / SLAB));
  const len = r.w / n;
  const [c, s] = [Math.abs(Math.cos(r.angle)), Math.abs(Math.sin(r.angle))];
  return Array.from({ length: n }, (_, i) => {
    const [x, z] = fromLocal(r, (i + 0.5) * len - r.w / 2, 0);
    return { x: tenth(x), z: tenth(z), w: tenth(len * c + r.d * s), d: tenth(len * s + r.d * c) };
  });
});

const sql = [
  `-- AVTOMATIK: npm run seed. Qo‘lda tahrirlanmaydi.
-- Bosh reja v3 (to‘rt markaz + yashil bulvar): 2026-11-24 da loyiha egasining ruxsati bilan qayta chizildi (PLAN.md §2).
-- Himoya: kimdir uy yoki joy olgan bo'lsa, bu migratsiya ishlamaydi.
do $$ begin
  if exists (select 1 from public.plot_state) or exists (select 1 from public.commerce_state) or exists (select 1 from public.streets where name is not null or pending_name is not null)
    or exists (select 1 from public.map_objects)
    or exists (select 1 from public.orders where status in ('pending','paid')) then
    raise exception 'masterplan_v3: bazada aholi bor, bosh rejani almashtirib bo''lmaydi';
  end if;
end $$;

${setLocks('disable')}
delete from public.transfers;
delete from public.expansions;
delete from public.plots;
delete from public.streets;
delete from public.commerce;
delete from public.roads;
`,
  `${plan.districts.map((d) => `update public.districts set zone = ${lit(d.zone)}, name_uz = ${lit(d.nameUz)}, name_ru = ${lit(d.nameRu)} where id = ${d.id};`).join('\n')}\n`,
  insert('public.streets', 'id,district_id,kind,is_central', plan.streets.map((s) => [s.id, s.districtId, s.kind, s.central])),
  insert('public.plots', 'id,district_id,street_id,number,unit,type,x,z,w,d,rot,building,value',
    plan.plots.map((p) => [p.id, p.districtId, p.streetId, p.number, p.unit, p.type, p.x, p.z, p.w, p.d, p.rot, p.building, p.value])),
  insert('public.expansions', 'id,plot_id,x,z,w,d,rot', plan.expansions.map((e) => [e.id, e.plotId, e.x, e.z, e.w, e.d, e.rot])),
  insert('public.commerce', 'id,type,x,z,w,d,rot', plan.commerce.map((c) => [c.id, c.type, c.x, c.z, c.w, c.d, c.rot])),
  insert('public.roads', 'id,x,z,w,d', roadBoxes.map((r, i) => [i + 1, r.x, r.z, r.w, r.d])),
  `${setLocks('enable')}\n`,
].join('\n');
writeFileSync(new URL('../../../supabase/migrations/0010_masterplan_v3.sql', import.meta.url), sql);
