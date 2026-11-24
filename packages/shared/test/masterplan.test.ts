import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { decodePlan, encodePlan, type EncodedPlan } from '../src/masterplan/codec.ts';
import { generateMasterPlan } from '../src/masterplan/generate.ts';
import { CITY_HALF, HILL, LAKE, PLAZA_R, RING, boxHitsTilted, fromLocal, inLake, inPlaza, inRiverbed, inTilted, terrainHeight } from '../src/masterplan/geometry.ts';
import { RESERVED, ZONES, boxTouches, inBox } from '../src/masterplan/zones.ts';
import { SpatialIndex, footprint, frontOf } from '../src/city.ts';

const raw = readFileSync(new URL('../data/masterplan.json', import.meta.url), 'utf8');
const lock = readFileSync(new URL('../data/masterplan.lock', import.meta.url), 'utf8').trim();
const plan = decodePlan(JSON.parse(raw) as EncodedPlan);

describe('qulflangan bosh reja', () => {
  test('xesh hech qachon o‘zgarmaydi', () => {
    expect(createHash('sha256').update(raw).digest('hex')).toBe(lock);
  });

  test('generator qulflangan faylni aynan qayta yaratadi', () => {
    expect(JSON.stringify(encodePlan(generateMasterPlan()))).toBe(raw);
  });

  test('5000 uchastka: 3500/1000/400/100', () => {
    const count = (t: string): number => plan.plots.filter((p) => p.type === t).length;
    expect(plan.plots).toHaveLength(5000);
    expect([count('hovli'), count('kvartira'), count('villa'), count('qasr')]).toEqual([3500, 1000, 400, 100]);
  });

  test('12 tuman, har biri 400–500 uchastka', () => {
    expect(plan.districts).toHaveLength(12);
    for (const d of plan.districts) {
      const n = plan.plots.filter((p) => p.districtId === d.id).length;
      expect(n).toBeGreaterThanOrEqual(400);
      expect(n).toBeLessThanOrEqual(500);
    }
  });

  test('tumanlar markazdan tashqariga ochiladi', () => {
    const distance = plan.districts.map(({ rects }) => Math.min(...rects.map(([a, b, c, d]) => Math.hypot(Math.max(a, -c, 0), Math.max(b, -d, 0)))));
    expect([...distance].sort((x, y) => x - y)).toEqual(distance);
  });

  test('manzillar takrorlanmaydi va raqamlar musbat', () => {
    const keys = plan.plots.map((p) => `${p.streetId}/${p.number}/${p.unit}`);
    expect(new Set(keys).size).toBe(5000);
    expect(plan.plots.every((p) => p.number > 0)).toBe(true);
  });

  const solid = [
    ...plan.plots.filter((p) => p.unit <= 1).map((p) => ({ id: p.id, ...footprint(p) })),
    ...plan.expansions.map((e) => ({ id: e.id, ...footprint(e) })),
    ...plan.commerce.filter((c) => c.type !== 'bilbord').map((c) => ({ id: c.id, ...footprint(c) })),
  ];

  test('uchastkalar bir-biriga tegmaydi', () => {
    const index = new SpatialIndex(solid);
    const overlaps = solid.flatMap((a) => index.query(a.x, a.z, 80)
      .filter((b) => a.id < b.id && Math.abs(a.x - b.x) < a.hx + b.hx - 0.15 && Math.abs(a.z - b.z) < a.hz + b.hz - 0.15).map((b) => `${a.id}-${b.id}`));
    expect(overlaps).toEqual([]);
  });

  test('uchastkalar yo‘llarga (halqa va diagonallarga ham) tegmaydi', () => {
    const hits = solid.flatMap((a) => plan.roads.filter((r) => boxHitsTilted(a.x, a.z, a.hx, a.hz, r, 0.15)).map((r) => `${a.id}-${r.kind}@${r.x},${r.z}`));
    expect(hits).toEqual([]);
  });

  test('uchastkalar daryo yo‘lagi, ko‘l va maydonga tegmaydi', () => {
    const points = (a: (typeof solid)[number]): (readonly [number, number])[] => [-1, -0.5, 0, 0.5, 1].flatMap((i) => [-1, -0.5, 0, 0.5, 1].map((j) => [a.x + i * a.hx, a.z + j * a.hz] as const));
    const wet = solid.filter((a) => points(a).some(([x, z]) => inRiverbed(x, z) || inLake(x, z) || inPlaza(x, z)));
    expect(wet.map((a) => a.id)).toEqual([]);
  });

  test('uy uchastkalari to‘rt markaz, bulvarlar, katta binolar va mahalla markazlariga kirmaydi', () => {
    const hits = plan.plots.filter((p) => p.unit <= 1).filter((p) => { const f = footprint(p); return RESERVED.some((b) => boxTouches(b, f.x, f.z, f.hx - 0.1, f.hz - 0.1)); });
    expect(hits.map((p) => p.id)).toEqual([]);
  });

  test('yo‘llar maydon, bulvar va bog‘ ustidan o‘tmaydi (bulvarni faqat halqa kesadi)', () => {
    const walk = [ZONES.bulvar, ZONES.bulvarKichik, ZONES.dam].map((z) => z.rect);
    const bad = plan.roads.filter((r) => r.kind !== 'halqa').filter((r) => walk.some((b) => inBox(b, r.x, r.z, -7)) || Math.hypot(r.x, r.z) < PLAZA_R);
    expect(bad).toEqual([]);
    expect(plan.roads.filter((r) => r.kind === 'halqa').every((r) => Math.abs(Math.hypot(r.x, r.z) - RING.r) < 1)).toBe(true);
    expect(plan.roads.filter((r) => r.kind === 'diagonal')).toHaveLength(5);
  });

  test('yo‘l tarmog‘i yaxlit: hamma uchastkaga borsa bo‘ladi', () => {
    const { roads } = plan;
    const points = roads.map((r) => {
      const out: (readonly [number, number])[] = [];
      for (let u = -r.w / 2; u <= r.w / 2; u += 4) for (let v = -r.d / 2; v <= r.d / 2; v += 4) out.push(fromLocal(r, u, v));
      return out;
    });
    const touches = (i: number, j: number): boolean => {
      const [a, b] = [roads[i]!, roads[j]!];
      if (Math.hypot(a.x - b.x, a.z - b.z) > (Math.hypot(a.w, a.d) + Math.hypot(b.w, b.d)) / 2 + 4) return false;
      return points[i]!.some(([x, z]) => inTilted(b, x, z, 2.5)) || points[j]!.some(([x, z]) => inTilted(a, x, z, 2.5));
    };
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length > 0) {
      const i = queue.pop()!;
      roads.forEach((_, j) => { if (!seen.has(j) && touches(i, j)) { seen.add(j); queue.push(j); } });
    }
    expect(roads.filter((_, i) => !seen.has(i))).toEqual([]);
  });

  test('har hovli tuman chegarasi ichida', () => {
    const outside = plan.plots.filter((p) => !plan.districts[p.districtId - 1]!.rects.some((r) => p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3]));
    expect(outside.map((p) => p.id)).toEqual([]);
  });

  test('har uchastka oldida yo‘l bor', () => {
    const orphan = plan.plots.filter((p) => p.type !== 'kvartira').filter((p) => ![3, 7, 11].some((d) => { const f = frontOf(p, d); return plan.roads.some((r) => inTilted(r, f.x, f.z, 0.5)); }));
    expect(orphan.map((p) => p.id)).toEqual([]);
  });

  test('tepalik balandligi silliq va faqat shimoli-g‘arb burchakda', () => {
    expect(terrainHeight(0, 0)).toBe(0);
    expect(terrainHeight(HILL.x, HILL.z)).toBeGreaterThan(25);
    expect(terrainHeight(-HILL.x, HILL.z)).toBe(0);
    for (let x = -750; x > -CITY_HALF - 100; x -= 2) expect(Math.abs(terrainHeight(x, HILL.z) - terrainHeight(x - 2, HILL.z))).toBeLessThan(1);
  });

  test('bilbordlar hech bir uchastkaga kirmaydi', () => {
    const boards = plan.commerce.filter((c) => c.type === 'bilbord').map(footprint);
    const hits = plan.plots.filter((p) => p.unit <= 1).filter((p) => { const f = footprint(p); return boards.some((b) => Math.abs(b.x - f.x) < b.hx + f.hx && Math.abs(b.z - f.z) < b.hz + f.hz); });
    expect(boards).toHaveLength(40);
    expect(hits.map((p) => p.id)).toEqual([]);
  });

  test('v3: hovli 24×34, villa 30×42, qasr 40×56; shahar 3×3 km', () => {
    expect(plan.version).toBe(3);
    expect(CITY_HALF).toBe(1500);
    const target = { hovli: [24, 34], villa: [30, 42], qasr: [40, 56], kvartira: [44, 16] } as const;
    expect(plan.plots.filter((p) => p.w !== target[p.type][0] || p.d !== target[p.type][1])).toEqual([]);
  });

  test('tijorat joylari savdo va biznes markazlarida', () => {
    const shops = plan.commerce.filter((c) => c.type === 'dokon');
    const offices = plan.commerce.filter((c) => c.type === 'ofis');
    expect([shops.length, offices.length, plan.commerce.length]).toEqual([100, 30, 170]);
    const within = (c: { readonly x: number; readonly z: number }, ...ids: ('savdo' | 'biznes')[]): boolean => ids.some((id) => inBox(ZONES[id].rect, c.x, c.z));
    expect(shops.every((c) => within(c, 'savdo', 'biznes'))).toBe(true);
    expect(offices.every((c) => within(c, 'biznes'))).toBe(true);
    expect(offices.slice(0, 12).map((c) => c.id)).toEqual(Array.from({ length: 12 }, (_, i) => `B${101 + i}`));
  });

  test('birinchi kelganlarga markazga yaqin joy yetarli', () => {
    expect(plan.plots.filter((p) => p.type === 'hovli' && p.districtId <= 2 && Math.hypot(p.x, p.z) < 450).length).toBeGreaterThanOrEqual(100);
    expect(plan.plots.filter((p) => p.type === 'villa').every((p) => Math.hypot(p.x - LAKE.x, p.z - LAKE.z) < 1000)).toBe(true);
    expect(plan.plots.filter((p) => p.type === 'qasr').every((p) => inBox(ZONES.tepalik.rect, p.x, p.z))).toBe(true);
  });

  test('kengaytirish joyi bitta uchastkaga bittadan', () => {
    expect(new Set(plan.expansions.map((e) => e.plotId)).size).toBe(plan.expansions.length);
  });

  test('100–200 tijorat joyi', () => {
    expect(plan.commerce.length).toBeGreaterThanOrEqual(100);
    expect(plan.commerce.length).toBeLessThanOrEqual(200);
    expect(new Set(plan.commerce.map((c) => `${c.x},${c.z}`)).size).toBe(plan.commerce.length);
  });
});
