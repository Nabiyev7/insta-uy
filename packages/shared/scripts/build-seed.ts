/** Bosh reja, katalog va so'z filtrini SQL ga aylantiradi: supabase/migrations/0007_masterplan.sql */
import { readFileSync, writeFileSync } from 'node:fs';
import { DECOR, BANNED_ROOTS, BANNED_WORDS, decodePlan, type EncodedPlan } from '../src/index.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const lit = (v: string | number | boolean | null): string => (v === null ? 'null' : typeof v === 'string' ? `'${v.replaceAll("'", "''")}'` : String(v));
const insert = (table: string, cols: string, rows: readonly (readonly (string | number | boolean | null)[])[]): string =>
  `insert into ${table} (${cols}) values\n${rows.map((r) => `(${r.map(lit).join(',')})`).join(',\n')};\n`;

const sql = [
  '-- AVTOMATIK: npm run seed. Qo‘lda tahrirlanmaydi.\n',
  insert('public.districts', 'id,zone,name_uz,name_ru,is_open', plan.districts.map((d) => [d.id, d.zone, d.nameUz, d.nameRu, d.id === 1])),
  insert('public.streets', 'id,district_id,kind,is_central', plan.streets.map((s) => [s.id, s.districtId, s.kind, s.central])),
  insert('public.plots', 'id,district_id,street_id,number,unit,type,x,z,w,d,rot,building,value',
    plan.plots.map((p) => [p.id, p.districtId, p.streetId, p.number, p.unit, p.type, p.x, p.z, p.w, p.d, p.rot, p.building, p.value])),
  insert('public.expansions', 'id,plot_id,x,z,w,d,rot', plan.expansions.map((e) => [e.id, e.plotId, e.x, e.z, e.w, e.d, e.rot])),
  insert('public.commerce', 'id,type,x,z,w,d,rot', plan.commerce.map((c) => [c.id, c.type, c.x, c.z, c.w, c.d, c.rot])),
  insert('public.roads', 'id,x,z,w,d', plan.roads.map((r, i) => [i + 1, r.x, r.z, r.w, r.d])),
  insert('public.decor_catalog', 'id,slot,price_uzs,price_coins,stock', DECOR.map((d) => [d.id, d.slot, d.priceUzs, d.priceCoins, d.stock])),
  insert('private.banned', 'root,whole_word', [...BANNED_ROOTS.map((r) => [r, false] as const), ...BANNED_WORDS.map((w) => [w, true] as const)]),
].join('\n');
writeFileSync(new URL('../../../supabase/migrations/0007_masterplan.sql', import.meta.url), sql);
