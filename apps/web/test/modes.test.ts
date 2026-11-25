import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { CITY_HALF, decodePlan, footprint, inLake, inTilted, SpatialIndex, type EncodedPlan } from '../../../packages/shared/src/index.ts';
import { MIN_HEIGHT, START_VIEW, cityPose, clampView, flightAt, framed, inWedge, metersPerPixel, pan, pitchOf, rotate, startFlight, viewOfPlot, wedgeOf, zoom } from '../src/logic/cityCamera.ts';
import { ANIM_CAR, CARS, animOfCar, carById, carOfAnim, ownedCars, plotSolid, roadSpot, stepCar, treeSolid, type CarState } from '../src/logic/drive.ts';
import { commerceItem, type HouseState } from '../src/logic/placement.ts';
import { closedDistrictItems } from '../src/logic/streets.ts';
import { item } from '../src/logic/item.ts';
import { QUALITY } from '../src/logic/quality.ts';
import { cityView, distanceFrom, groundView } from '../src/logic/view.ts';
import { carSolids, walkSolids, worldIndex } from '../src/logic/worldIndex.ts';
import { collect, type CollectSource } from '../src/world/collect.ts';

const plan = decodePlan(JSON.parse(readFileSync(new URL('../../../packages/shared/data/masterplan.json', import.meta.url), 'utf8')) as EncodedPlan);

describe('shahar kamerasi', () => {
  test('balandlik va shahar chegarasi', () => {
    expect(clampView({ x: 9999, z: -9999, yaw: 7, height: 5 }, 190)).toMatchObject({ x: CITY_HALF, z: -CITY_HALF, height: MIN_HEIGHT });
    expect(clampView({ ...START_VIEW, height: 9999 }, 190).height).toBe(190);
    expect(pitchOf(15)).toBeLessThan(pitchOf(200));
  });
  test('kamera nuqtaning orqasida va tepasida, pastda qiyaroq', () => {
    const p = cityPose({ x: 10, z: 20, yaw: 0, height: 100 });
    expect(p.z).toBeGreaterThan(20);
    expect(p.y).toBe(100);
    expect([p.tx, p.tz]).toEqual([10, 20]);
  });
  test('sudrash: barmoq o‘ngga — shahar o‘ngga (kamera chapga), pastga — oldinga', () => {
    expect(pan({ ...START_VIEW, yaw: 0 }, 10, 0).x).toBeCloseTo(-10);
    expect(pan({ ...START_VIEW, yaw: 0 }, 0, 10).z).toBeLessThan(-9);
    const turned = pan({ ...START_VIEW, yaw: Math.PI / 2 }, 10, 0);
    expect(turned.x).toBeCloseTo(0);
    expect(turned.z).toBeCloseTo(10);
    expect(zoom(START_VIEW, 0.5).height).toBe(START_VIEW.height / 2);
    expect(rotate(START_VIEW, 1).yaw).toBe(1);
    expect(metersPerPixel(START_VIEW, 60, 800)).toBeGreaterThan(metersPerPixel({ ...START_VIEW, height: 20 }, 60, 800));
  });
  test('uchish silliq, 1 soniyadan tez, aniq joyga qo‘nadi', () => {
    const to = viewOfPlot(plan.plots[500]!);
    const f = startFlight(START_VIEW, to, 1000);
    expect(f.ms).toBeLessThan(1000);
    expect(flightAt(f, 1000).view).toMatchObject({ x: START_VIEW.x, z: START_VIEW.z });
    const end = flightAt(f, 1001 + f.ms);
    expect(end.isDone).toBe(true);
    expect(end.view.x).toBeCloseTo(to.x);
    expect(end.view.height).toBeCloseTo(to.height);
  });
  test('uyga qaraganda kamera old tomonda', () => {
    const p = plan.plots.find((q) => q.type === 'hovli' && q.rot === 0)!;
    expect(cityPose(viewOfPlot(p)).z).toBeGreaterThan(p.z + p.d / 2);
    expect(viewOfPlot(plan.plots.find((q) => q.type === 'kvartira')!).height).toBeGreaterThan(30);
  });
  test('oyna ochilganda uy to‘silmaydi: telefonda nuqta pastga, kompyuterda o‘ngga suriladi', () => {
    const v = { x: 0, z: 0, yaw: 0, height: 22 };
    expect(framed(v, { width: 360, height: 640 }).z).toBeGreaterThan(5);
    expect(framed(v, { width: 1280, height: 720 }).x).toBeGreaterThan(5);
  });
  test('ko‘rinish uchburchagi: qaralgan nuqta ichida, orqa va yon tashqarida', () => {
    const w = wedgeOf({ x: 0, z: 0, yaw: 0, height: 100 }, 0.4);
    expect(inWedge(w, 0, 0)).toBe(true);
    expect(inWedge(w, 0, -400)).toBe(true);
    expect(inWedge(w, 0, 400)).toBe(false);
    expect(inWedge(w, 500, -100)).toBe(false);
  });
});

describe('bo‘sh shahar', () => {
  const index = worldIndex(plan);
  const src = (building: string | null = null): CollectSource => ({ plots: index.plots, statics: new SpatialIndex([]), extras: new SpatialIndex([]), commerce: new SpatialIndex([]), plan: { ...plan, buildings: [] }, houses: new Map(), open: new Set([1]), building, full: new Map(), simple: new Map() });
  const p = plan.plots.find((q) => q.districtId === 1 && q.type === 'hovli')!;
  test('uy yo‘q; taxtacha yaqinda bor, uzoqda yo‘q; daraxt uzoqda sodda', () => {
    const near = collect(groundView({ x: p.x, z: p.z, yaw: 0, quality: QUALITY.mid, boost: 1, isVideo: false }), src(), 10);
    expect(near.items.some((i) => i.model.startsWith('house'))).toBe(false);
    expect(near.boards.length).toBeGreaterThan(0);
    expect(near.boards.every((b) => Math.hypot(b.x - p.x, b.z - p.z) < QUALITY.mid.detail + 25)).toBe(true);
    expect(near.items.some((i) => i.model === 'tree_round_lod')).toBe(true);
    expect(near.labels).toEqual([]);
    const high = collect(cityView({ x: p.x, z: p.z, yaw: 0, height: 150 }, QUALITY.mid, 0.6), src(), 10);
    expect(high.boards).toEqual([]);
  });
  test('yopiq tumanda taxtacha yo‘q, qurilayotgan uchastkada ham', () => {
    const closed = plan.plots.find((q) => q.districtId === 5 && q.type === 'hovli')!;
    expect(collect(groundView({ x: closed.x, z: closed.z, yaw: 0, quality: QUALITY.mid, boost: 1, isVideo: false }), src(), 10).boards).toEqual([]);
    const v = groundView({ x: p.x, z: p.z, yaw: 0, quality: QUALITY.mid, boost: 1, isVideo: false });
    expect(collect(v, src(p.id), 10).boards).toHaveLength(collect(v, src(), 10).boards.length - 1);
  });
});

describe('nima chiziladi', () => {
  const houses = new Map(plan.plots.filter((p) => p.districtId <= 4).map((p): [string, HouseState] => [p.id, { plot: p.id, nick: 'ali', tier: 3, wall: 0, roof: 0, decor: [], material: 0, frame: 0, door: 0, label: 'plain', badge: null, status: 'owned', expanded: false }]));
  const index = worldIndex(plan);
  const src = (): CollectSource => ({
    plots: index.plots, statics: index.statics, extras: new SpatialIndex(closedDistrictItems(plan, 7)), commerce: new SpatialIndex(plan.commerce.map(commerceItem)),
    plan, houses, open: new Set([1, 2, 3, 4]), building: null, full: new Map(), simple: new Map(),
  });
  const isFull = (m: string): boolean => /^house\d+$/.test(m);

  test('piyoda: yaqin uy to‘liq, uzoqdagi sodda, yorliqlar chegaralangan', () => {
    const v = groundView({ x: -70, z: -260, yaw: Math.PI, quality: QUALITY.low, boost: 1, isVideo: false });
    const { items, labels } = collect(v, src(), QUALITY.low.labels);
    expect(items.some((i) => isFull(i.model))).toBe(true);
    expect(items.some((i) => i.model === 'house3_lod')).toBe(true);
    expect(labels.length).toBeLessThanOrEqual(QUALITY.low.labels);
    expect(items.every((i) => Math.hypot(i.x - v.x, i.z - v.z) <= Math.max(v.radius, v.far) + 40)).toBe(true);
  });
  test('baland kamera: uylar faqat sodda, mayda bezak, odam va yorliq yo‘q', () => {
    for (const q of Object.values(QUALITY)) {
      const v = cityView({ x: -300, z: -300, yaw: 0.4, height: q.cityMax }, q, 0.4);
      const { items, labels } = collect(v, src(), q.labels);
      const models = new Set(items.map((i) => i.model));
      expect([...models].filter(isFull), q.level).toEqual([]);
      expect(labels).toEqual([]);
      expect([...models].some((m) => ['yard_flowers', 'street_lamp', 'bench', 'gate_basic'].includes(m))).toBe(false);
      expect(items.filter((i) => i.model.endsWith('_lod')).length).toBeGreaterThan(150);
    }
  });
  test('past kamera: yaqin uylar to‘liq va niki bilan; kesh ishlaydi', () => {
    const p = plan.plots.find((q) => q.districtId === 1)!;
    const s = src();
    const v = cityView(viewOfPlot(p), QUALITY.mid, 0.4);
    const first = collect(v, s, 16);
    expect(first.items.some((i) => isFull(i.model))).toBe(true);
    expect(first.labels.length).toBeGreaterThan(0);
    expect(s.full.size).toBeGreaterThan(0);
    expect(collect(v, s, 16).items.length).toBe(first.items.length);
    expect(distanceFrom(v, p.x, p.z)).toBeGreaterThan(20);
  });
  test('tepadan qaraganda 3–4 mahalla atrofi ko‘rinadi: radius ≥ 450 m', () => {
    for (const q of Object.values(QUALITY)) {
      expect(q.cityView).toBeGreaterThanOrEqual(450);
      const v = cityView({ x: 0, z: 0, yaw: 0, height: q.cityMax }, q, 0.4);
      expect(v.fogFar).toBeGreaterThan(v.fogNear);
    }
  });
});

describe('mashina', () => {
  const spec = carById('oddiy');
  const start: CarState = { x: 0, z: 0, yaw: 0, speed: 0 };
  const drive = (s: CarState, input: { gas: number; steer: number; isBraking: boolean }, seconds: number, solids = [] as Parameters<typeof stepCar>[4]): CarState => {
    let c = s;
    for (let i = 0; i < seconds * 60; i++) c = stepCar(c, input, 1 / 60, spec, solids);
    return c;
  };
  test('gaz bilan tezlashadi: piyodadan 4–5 barobar tez', () => {
    const c = drive(start, { gas: 1, steer: 0, isBraking: false }, 5);
    expect(c.speed).toBeCloseTo(spec.top);
    for (const c of CARS) { expect(c.top / 4.2).toBeGreaterThanOrEqual(4); expect(c.top / 4.2).toBeLessThanOrEqual(5.01); }
    expect(c.z).toBeGreaterThan(40);
    expect(drive(c, { gas: 0, steer: 0, isBraking: true }, 1.2).speed).toBe(0);
    expect(drive(c, { gas: 0, steer: 0, isBraking: false }, 1).speed).toBeLessThan(c.speed);
    expect(drive(start, { gas: -1, steer: 0, isBraking: false }, 4).speed).toBeGreaterThanOrEqual(-6);
  });
  test('o‘ngga burilsa o‘ngga ketadi; joyida turganda burilmaydi', () => {
    // yaw 0 — +z ga qaraydi, o'ng tomoni -x
    expect(drive(start, { gas: 1, steer: 1, isBraking: false }, 1).x).toBeLessThan(-0.5);
    expect(drive(start, { gas: 0, steer: 1, isBraking: false }, 1).yaw).toBe(0);
  });
  test('devorga to‘g‘ridan urilsa to‘xtaydi, ichiga kirmaydi', () => {
    const wall = { x: 0, z: 30, hx: 20, hz: 2, h: 4 };
    const c = drive(start, { gas: 1, steer: 0, isBraking: false }, 6, [wall]);
    expect(c.z).toBeLessThan(25.9); // burni ham devordan tashqarida
    expect(Math.abs(c.speed)).toBeLessThan(1);
  });
  test('uchastkaga kirmaydi, ko‘lga tushmaydi, daraxtga uriladi', () => {
    const p = plan.plots[0]!;
    const f = footprint(p);
    const s = plotSolid(p);
    expect([s.hx, s.hz]).toEqual([f.hx, f.hz]);
    expect(treeSolid(item('tree_chinor', 1, 2))).toMatchObject({ x: 1, z: 2 });
    expect(treeSolid(item('bench', 1, 2))).toBeNull();
    expect(carSolids(plan, p.x, p.z).length).toBeGreaterThan(4);
    expect(walkSolids(plan, new Map(), 0, 0, []).length).toBeGreaterThanOrEqual(1);
    const lake = drive({ x: 1220, z: 1020, yaw: 0, speed: 10 }, { gas: 1, steer: 0, isBraking: false }, 10);
    expect(inLake(lake.x, lake.z)).toBe(false);
  });
  test('mashina eng yaqin yo‘lda paydo bo‘ladi', () => {
    for (const [x, z] of [[-29, -145], [0, 0], [460, 460], [1220, 1030], [-1150, -1150]] as const) {
      const s = roadSpot(plan.roads, x, z);
      expect(plan.roads.some((r) => inTilted(r, s.x, s.z))).toBe(true);
    }
    expect(roadSpot([], 5, 6)).toEqual({ x: 5, z: 6, yaw: 0, speed: 0 });
  });
  test('bepul va sotib olingan mashinalar, tarmoq kodi', () => {
    expect(ownedCars(undefined).map((c) => c.id)).toEqual(['oddiy']);
    expect(ownedCars({ car_sport: 1, car_sedan: 0 }).map((c) => c.id)).toEqual(['oddiy', 'sport']);
    expect(carById('yoq').id).toBe('oddiy');
    for (const c of CARS) expect(carOfAnim(animOfCar(c.id))).toBe(c);
    expect(carOfAnim(3)).toBeNull();
    expect(carOfAnim(ANIM_CAR + 50)).toBeNull();
    expect(CARS.every((c) => c.uz && c.ru)).toBe(true);
  });
});

describe('mashinalar bitta manbadan', () => {
  test('nom do‘kon (katalog) bilan bir xil; tezlik: oddiy < sedan < krossover < sport < jip < limuzin < superkar', async () => {
    const { DECOR } = await import('../../../packages/shared/src/index.ts');
    for (const c of CARS) if (c.decor) expect(c.uz).toBe(DECOR.find((d) => d.id === c.decor)!.uz);
    const top = (id: string): number => carById(id).top;
    const order = ['oddiy', 'yangi_sedan', 'krossover', 'yangi_sport', 'jip', 'limuzin', 'superkar'];
    for (let i = 1; i < order.length; i++) expect(top(order[i]!)).toBeGreaterThan(top(order[i - 1]!));
  });
});

