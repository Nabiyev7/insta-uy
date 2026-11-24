import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { decodePlan, padHeight, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { constructionItems, freshHouse } from '../src/logic/construction.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);
const p = plan.plots.find((q) => q.type === 'hovli')!;
const at = (t: number) => constructionItems(p, freshHouse(p.id), t);

describe('uy qurilishi effekti', () => {
  test('boshida uy yo‘q, oxirida 1-level uy joyida va chang yo‘q', () => {
    expect(at(-1)).toEqual([]);
    expect(at(0).some((i) => i.model === 'house1')).toBe(false);
    const end = at(1);
    expect(end.map((i) => i.model).slice(0, 3)).toEqual(['house1', 'fence_low', 'gate_open']);
    expect(end[0]!.y).toBeCloseTo(padHeight(p));
    expect(end.every((i) => i.sy > 0.5)).toBe(true);
    expect(end.some((i) => i.model === 'dust')).toBe(false);
  });
  test('uy pastdan to‘xtovsiz ko‘tariladi, o‘rtada chang bor', () => {
    const heights = [0.1, 0.25, 0.4, 0.6, 0.8].map((t) => at(t)[0]!.y);
    heights.slice(1).forEach((y, i) => expect(y).toBeGreaterThan(heights[i]!));
    expect(heights[0]!).toBeLessThan(padHeight(p) - 1);
    const dust = at(0.4).filter((i) => i.model === 'dust');
    expect(dust.length).toBeGreaterThan(3);
    expect(dust.every((i) => Math.hypot(i.x - p.x, i.z - p.z) < 26)).toBe(true);
  });
});
