import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { decodePlan, encodePlan, type EncodedPlan } from '../src/masterplan/codec.ts';
import { generateMasterPlan } from '../src/masterplan/generate.ts';
import { inLake, inPlaza, terrainHeight } from '../src/masterplan/geometry.ts';
import { SpatialIndex, footprint, frontOf, boxContains } from '../src/city.ts';

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
    const distance = plan.districts.map(({ rect: [a, b, c, d] }) =>
      Math.hypot(Math.max(a, -c, 0), Math.max(b, -d, 0)));
    expect([...distance].sort((x, y) => x - y)).toEqual(distance);
  });

  test('manzillar takrorlanmaydi va raqamlar musbat', () => {
    const keys = plan.plots.map((p) => `${p.streetId}/${p.number}/${p.unit}`);
    expect(new Set(keys).size).toBe(5000);
    expect(plan.plots.every((p) => p.number > 0)).toBe(true);
  });

  test('uchastkalar bir-biriga, yo‘lga, ko‘lga va maydonga tegmaydi', () => {
    const solid = [
      ...plan.plots.filter((p) => p.unit <= 1).map((p) => ({ id: p.id, ...footprint(p) })),
      ...plan.expansions.map((e) => ({ id: e.id, ...footprint(e) })),
      ...plan.commerce.filter((c) => c.type !== 'bilbord').map((c) => ({ id: c.id, ...footprint(c) })),
    ];
    const index = new SpatialIndex(solid);
    const overlaps: string[] = [];
    for (const a of solid) {
      for (const b of index.query(a.x, a.z, 60)) {
        if (a.id < b.id && Math.abs(a.x - b.x) < a.hx + b.hx - 0.15 && Math.abs(a.z - b.z) < a.hz + b.hz - 0.15) overlaps.push(`${a.id}-${b.id}`);
      }
      for (const r of plan.roads) {
        if (Math.abs(a.x - r.x) < a.hx + r.w / 2 - 0.15 && Math.abs(a.z - r.z) < a.hz + r.d / 2 - 0.15) overlaps.push(`${a.id}-yo'l`);
      }
      if (inLake(a.x, a.z)) overlaps.push(`${a.id}-ko'l`);
    }
    expect(overlaps).toEqual([]);
    expect(plan.plots.some((p) => inPlaza(p.x, p.z))).toBe(false);
  });

  test('har hovli tuman chegarasi ichida', () => {
    for (const p of plan.plots) {
      const r = plan.districts[p.districtId - 1]!.rect;
      expect(p.x >= r[0] && p.x <= r[2] && p.z >= r[1] && p.z <= r[3]).toBe(true);
    }
  });

  test('har uchastka oldida yo‘l bor', () => {
    const orphan = plan.plots.filter((p) => p.type !== 'kvartira').filter((p) => {
      const f = frontOf(p, 4);
      return !plan.roads.some((r) => boxContains({ x: r.x, z: r.z, hx: r.w / 2, hz: r.d / 2 }, f.x, f.z, 3));
    });
    expect(orphan.map((p) => p.id)).toEqual([]);
  });

  test('tepalik balandligi silliq va faqat NE burchakda', () => {
    expect(terrainHeight(0, 0)).toBe(0);
    expect(terrainHeight(770, -770)).toBeGreaterThan(20);
    for (let x = 520; x < 1100; x += 2) expect(Math.abs(terrainHeight(x, -770) - terrainHeight(x + 2, -770))).toBeLessThan(1);
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
