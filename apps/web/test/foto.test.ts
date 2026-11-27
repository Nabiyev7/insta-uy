/** 17-qadam: Foto rejimi — oltin soat, tun, maket effekti, format va kadr o'lchami. */
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { FORMAT_SIZE, GOLDEN, NIGHT, PHOTO_DEFAULT, aspectOf, frameRect, gradeOf, lightOf, renderScale, sunDirection, tiltOf } from '../src/logic/photo.ts';

describe('yorug‘lik', () => {
  test('oltin soat: quyosh ~20° balandlikda, iliq (≈ #FFC98A), osmon pastda iliq — tepada och ko‘k', () => {
    const elevation = (Math.asin(GOLDEN.sun[1]) * 180) / Math.PI;
    expect(elevation).toBeGreaterThanOrEqual(18);
    expect(elevation).toBeLessThanOrEqual(22);
    expect(GOLDEN.sunColor.map((c) => Math.round(c * 255))).toEqual([255, 201, 138]);
    expect(GOLDEN.skyHorizon[0]).toBeGreaterThan(GOLDEN.skyHorizon[2]);
    expect(GOLDEN.skyTop[2]).toBeGreaterThan(GOLDEN.skyTop[0]);
    expect(GOLDEN.night).toBe(0);
  });
  test('tun: derazalar yonadi (night = 1), osmon to‘q ko‘k, bloom bor; "Hozirgi" — o‘yindagi vaqt', () => {
    expect(NIGHT.night).toBe(1);
    expect(NIGHT.skyTop[2]).toBeGreaterThan(NIGHT.skyTop[0]);
    expect(Math.max(...NIGHT.skyTop)).toBeLessThan(0.3);
    expect(gradeOf('night', 'mid').bloom).toBeGreaterThan(0);
    expect(gradeOf('golden', 'off').bloom).toBe(0);
    expect(lightOf('now')).toBeNull();
    expect(lightOf('golden')).toBe(GOLDEN);
  });
  test('quyosh yo‘nalishi — birlik vektor', () => {
    const [x, y, z] = sunDirection(20, 35);
    expect(Math.hypot(x, y, z)).toBeCloseTo(1);
  });
});

describe('maket effekti', () => {
  test('kuchi: yo‘q < past < o‘rta < kuchli; to‘yinganlik +10–15%; tasma kamera qiyaligiga qarab', () => {
    const b = (['off', 'low', 'mid', 'high'] as const).map((t) => tiltOf(t, 0.5).blur);
    expect(b[0]).toBe(0);
    expect(b[1]! < b[2]! && b[2]! < b[3]!).toBe(true);
    const sat = gradeOf('now', 'mid').saturation;
    expect(sat).toBeGreaterThanOrEqual(1.1);
    expect(sat).toBeLessThanOrEqual(1.15);
    expect(tiltOf('mid', 1.1).focus).toBeGreaterThan(tiltOf('mid', 0.3).focus);
  });
});

describe('format va kadr', () => {
  test('9:16 → 1080×1920, 4:5 → 1080×1350, 1:1 → 1080×1080; standart — 9:16 (stories)', () => {
    expect(FORMAT_SIZE).toEqual({ '9:16': { w: 1080, h: 1920 }, '4:5': { w: 1080, h: 1350 }, '1:1': { w: 1080, h: 1080 } });
    expect(PHOTO_DEFAULT.format).toBe('9:16');
    expect(PHOTO_DEFAULT.light).toBe('now');
    expect(PHOTO_DEFAULT.tilt).toBe('off');
  });
  test('ramka ekran markazida va formatning nisbatida (ekrandagi ramka = natija kadri)', () => {
    const r = frameRect(390, 844, aspectOf('9:16'));
    expect(r.w / r.h).toBeCloseTo(9 / 16);
    expect(r.w).toBeLessThanOrEqual(390);
    expect(r.x).toBeCloseTo((390 - r.w) / 2);
    const wide = frameRect(1280, 800, aspectOf('1:1'));
    expect(wide).toMatchObject({ w: 800, h: 800, y: 0 });
  });
  test('supersampling: 2× (kuchsizda 1,5×), natijadan kichik bo‘lmasin, GPU chegarasidan oshmasin', () => {
    expect(renderScale(2000, 1080, false)).toBe(2);
    expect(renderScale(2000, 1080, true)).toBe(1.5);
    expect(renderScale(400, 1080, false)).toBeCloseTo(2.7);
    expect(renderScale(3000, 1080, false, 4096, 3000)).toBeCloseTo(4096 / 3000);
  });
});

describe('o‘yin rejimi o‘zgarmaydi', () => {
  test('effektlar faqat Foto rejimida (PhotoLayer), video yozuvida yo‘q', () => {
    const layer = readFileSync(new URL('../src/world/PhotoLayer.tsx', import.meta.url), 'utf8');
    expect(layer).toMatch(/const isFx = isPhoto && director\.pose === null/);
    const city = readFileSync(new URL('../src/world/CityLayer.tsx', import.meta.url), 'utf8');
    expect(city).toMatch(/app\.isPhoto && director\.pose === null \? lightOf/);
  });
});
