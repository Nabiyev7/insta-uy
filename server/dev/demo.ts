/** Lokal sinov uchun soxta aholi. Niklar aniq "demo_" bilan boshlanadi. */
import type { PGlite } from '@electric-sql/pglite';
import { DECOR, MAX_TIER, decodePlan, decorSlots, hash01, openAnchors, type EncodedPlan } from '../../packages/shared/src/index.ts';
import { readFileSync } from 'node:fs';

/** Level ruxsat bergan nuqtalarga mos bezaklar: {nuqta: bezak}. */
const pickPlaces = (id: string, tier: number): Record<string, string> => {
  const open = [...openAnchors(tier)].sort((a, b) => hash01(`${id}${a.id}`) - hash01(`${id}${b.id}`)).slice(0, Math.floor(decorSlots(tier) * hash01(`n${id}`)));
  return Object.fromEntries(open.flatMap((a) => {
    const fit = DECOR.filter((d) => d.isActive && d.stock === null && d.minLevel <= tier && d.spots.includes(a.kind));
    const d = fit[Math.floor(hash01(`d${id}${a.id}`) * fit.length)];
    return d ? [[a.id, d.id]] : [];
  }));
};

export const seedDemo = async (db: PGlite, share = 0.55): Promise<number> => {
  const plan = decodePlan(JSON.parse(readFileSync(new URL('../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
  await db.query('update districts set is_open = true, opened_at = now() where id = 2');
  const { rows } = await db.query<{ id: string }>("insert into auth.users (email, password) values ('demo@demo.local', 'x:y') returning id");
  const uid = rows[0]?.id;
  await db.query("insert into profiles (user_id, login, ref_code, free_used) values ($1, 'demo', 'demodemo', true)", [uid]);
  let n = 0;
  for (const p of plan.plots.filter((q) => q.districtId <= 2 && hash01(`own:${q.id}`) < share)) {
    const h = hash01(p.id);
    const tier = 1 + Math.floor(h ** 1.7 * MAX_TIER);
    const label = tier >= 9 ? 'gold' : tier >= 7 ? 'silver' : 'plain';
    await db.query("insert into plot_state (plot_id, status, owner, instagram, bio, tier, wall, roof, places, wall_material, frame, door, label) values ($1, 'owned', $2, $3, 'Demo aholi', $4, $5, $6, $7, $8, $9, $10, $11)",
      [p.id, uid, `demo_${p.id.slice(1)}`, tier, Math.floor(hash01(`w${p.id}`) * 8), Math.floor(hash01(`r${p.id}`) * 2) * Math.floor(hash01(`q${p.id}`) * 6), JSON.stringify(pickPlaces(p.id, tier)), Math.floor(hash01(`m${p.id}`) ** 2 * 4), Math.floor(hash01(`f${p.id}`) ** 2 * 8), Math.floor(hash01(`e${p.id}`) * 8), label]);
    n++;
  }
  return n;
};
