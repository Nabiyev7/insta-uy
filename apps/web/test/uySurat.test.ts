/** 19-qadam (1): "Uyimni suratga olish" — kamera faqat o'z uyi atrofida. */
import { describe, expect, test } from 'vitest';
import { PITCH_MAX, PITCH_MIN, PITCH_START, orbitPose, startOrbit, stepOrbit } from '../src/logic/houseOrbit.ts';

const plot = { id: 'P0001', x: 100, z: -50, w: 25, d: 34, rot: 1 };
const still = { panX: 0, panY: 0, zoomBy: 1, twist: 0 };

describe('uy atrofida orbit', () => {
  test('boshlanishi: markaz — uy, ~40° pastga, masofa uchastkaga qarab (hovli kadrda)', () => {
    const o = startOrbit(plot, 2);
    expect([o.x, o.z, o.plot]).toEqual([100, -50, 'P0001']);
    expect((o.pitch * 180) / Math.PI).toBeCloseTo(40);
    expect(o.pitch).toBe(PITCH_START);
    expect(o.dist).toBeGreaterThan(34);
    expect(o.minDist).toBeLessThan(o.dist);
    expect(o.maxDist).toBeGreaterThan(o.dist);
  });
  test('360° aylanadi, burchak 25°–65° ichida, yaqinlashtirish cheklangan; markaz hech qachon siljimaydi', () => {
    let o = startOrbit(plot, 0);
    for (let i = 0; i < 200; i++) o = stepOrbit(o, { panX: 40, panY: 30, zoomBy: 0.8, twist: 0 });
    expect(o.pitch).toBe(PITCH_MAX);
    expect(o.dist).toBe(o.minDist);
    expect([o.x, o.z]).toEqual([100, -50]);
    for (let i = 0; i < 200; i++) o = stepOrbit(o, { panX: -40, panY: -30, zoomBy: 1.3, twist: 0.1 });
    expect(o.pitch).toBe(PITCH_MIN);
    expect(o.dist).toBe(o.maxDist);
    expect(stepOrbit(o, still)).toEqual(o);
  });
  test('kamera uyga qaraydi va masofa saqlanadi', () => {
    const o = stepOrbit(startOrbit(plot, 0), { panX: 300, panY: 0, zoomBy: 1, twist: 0 });
    const p = orbitPose(o);
    expect([p.tx, p.ty, p.tz]).toEqual([o.x, o.y, o.z]);
    expect(Math.hypot(p.x - o.x, p.y - o.y, p.z - o.z)).toBeCloseTo(o.dist);
    expect(p.y).toBeGreaterThan(o.y);
  });
});
