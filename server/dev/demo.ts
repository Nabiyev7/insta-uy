/** Lokal sinov uchun soxta aholi. Niklar aniq "demo_" bilan boshlanadi. */
import type { PGlite } from '@electric-sql/pglite';
import { DECOR, decodePlan, hash01, type EncodedPlan } from '../../packages/shared/src/index.ts';
import { readFileSync } from 'node:fs';

const pickDecor = (id: string, tier: number): string[] => {
  const wanted = DECOR.filter((d) => d.stock === null && hash01(`${id}:${d.id}`) < 0.06 + tier * 0.11);
  const bySlot = new Map(wanted.map((d) => [['tree', 'yard', 'light'].includes(d.slot) ? d.id : d.slot, d.id]));
  return [...bySlot.values()];
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
    const tier = h > 0.95 ? 5 : h > 0.86 ? 4 : h > 0.62 ? 3 : h > 0.3 ? 2 : 1;
    const label = tier === 5 ? 'gold' : tier === 4 ? 'silver' : 'plain';
    await db.query("insert into plot_state (plot_id, status, owner, instagram, bio, tier, wall, roof, decor, label) values ($1, 'owned', $2, $3, 'Demo aholi', $4, $5, $6, $7, $8)",
      [p.id, uid, `demo_${p.id.slice(1)}`, tier, Math.floor(hash01(`w${p.id}`) * 8), Math.floor(hash01(`r${p.id}`) * 6), pickDecor(p.id, tier), label]);
    n++;
  }
  return n;
};
