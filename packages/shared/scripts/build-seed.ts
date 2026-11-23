/** Bosh reja v2 ni SQL ga aylantiradi: supabase/migrations/0010_masterplan_v2.sql. Katalog va so'z filtri 0007 da (o'zgarmaydi). */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePlan, type EncodedPlan } from '../src/index.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const lit = (v: string | number | boolean | null): string => (v === null ? 'null' : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : String(v));
const insert = (table: string, cols: string, rows: readonly (readonly (string | number | boolean | null)[])[]): string =>
  `insert into ${table} (${cols}) values\n${rows.map((r) => `(${r.map(lit).join(',')})`).join(',\n')};\n`;

const LOCKS = [['plots', 'plots_locked'], ['expansions', 'expansions_locked'], ['commerce', 'commerce_locked'], ['roads', 'roads_locked'], ['streets', 'streets_locked']] as const;
const setLocks = (state: 'enable' | 'disable'): string => LOCKS.map(([t, trigger]) => `alter table public.${t} ${state} trigger ${trigger};`).join('\n');

const sql = [
  `-- AVTOMATIK: npm run seed. Qo‘lda tahrirlanmaydi.
-- Bosh reja v2: 2026-11-24 da loyiha egasining bir martalik ruxsati bilan qayta chizildi (PLAN.md §2).
-- Himoya: kimdir uy yoki joy olgan bo'lsa, bu migratsiya ishlamaydi.
do $$ begin
  if exists (select 1 from public.plot_state) or exists (select 1 from public.commerce_state) or exists (select 1 from public.streets where name is not null or pending_name is not null)
    or exists (select 1 from public.map_objects)
    or exists (select 1 from public.orders where status in ('pending','paid')) then
    raise exception 'masterplan_v2: bazada aholi bor, bosh rejani almashtirib bo''lmaydi';
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
  insert('public.streets', 'id,district_id,kind,is_central', plan.streets.map((s) => [s.id, s.districtId, s.kind, s.central])),
  insert('public.plots', 'id,district_id,street_id,number,unit,type,x,z,w,d,rot,building,value',
    plan.plots.map((p) => [p.id, p.districtId, p.streetId, p.number, p.unit, p.type, p.x, p.z, p.w, p.d, p.rot, p.building, p.value])),
  insert('public.expansions', 'id,plot_id,x,z,w,d,rot', plan.expansions.map((e) => [e.id, e.plotId, e.x, e.z, e.w, e.d, e.rot])),
  insert('public.commerce', 'id,type,x,z,w,d,rot', plan.commerce.map((c) => [c.id, c.type, c.x, c.z, c.w, c.d, c.rot])),
  insert('public.roads', 'id,x,z,w,d', plan.roads.map((r, i) => [i + 1, r.x, r.z, r.w, r.d])),
  `${setLocks('enable')}\n`,
].join('\n');
writeFileSync(new URL('../../../supabase/migrations/0010_masterplan_v2.sql', import.meta.url), sql);
