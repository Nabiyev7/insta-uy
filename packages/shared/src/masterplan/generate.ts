import type { Building, Commerce, District, Expansion, MasterPlan, Plot, PlotType, Road, Street, Zone } from '../types.ts';
import { AVENUE, AVENUE_LINES, CELL, CITY_HALF, HILL, LAKE, PLAZA_HALF, STREET, inLake, inPlaza, rotatedSize } from './geometry.ts';
import { clipRoad, layoutGrid, type GridResult, type Spot } from './layout.ts';

const M = AVENUE / 2;
type Rect = readonly [number, number, number, number];

const cellRect = (cx: number, cz: number, spanX = 1): Rect => [
  cx * CELL + M, cz * CELL + M, (cx + spanX) * CELL - M, (cz + 1) * CELL - M,
];

interface DistrictSpec {
  readonly id: number;
  readonly zone: Zone;
  readonly cell: readonly [number, number];
  readonly span?: number;
  readonly transpose?: boolean;
  readonly nameUz: string;
  readonly nameRu: string;
}

/** Tartib = ochilish tartibi: markazdan tashqariga (PLAN.md §2.3). */
const SPECS: readonly DistrictSpec[] = [
  { id: 1, zone: 'mahalla', cell: [-1, -1], nameUz: 'Markaz mahallasi', nameRu: 'Махалля Марказ' },
  { id: 2, zone: 'mahalla', cell: [0, -1], transpose: true, nameUz: 'Chinor mahallasi', nameRu: 'Махалля Чинор' },
  { id: 3, zone: 'mahalla', cell: [0, 0], nameUz: 'Anorzor mahallasi', nameRu: 'Махалля Анорзор' },
  { id: 4, zone: 'mahalla', cell: [-1, 0], transpose: true, nameUz: 'Tokzor mahallasi', nameRu: 'Махалля Токзор' },
  { id: 5, zone: 'mahalla', cell: [-1, -2], nameUz: 'Navbahor mahallasi', nameRu: 'Махалля Навбахор' },
  { id: 6, zone: 'mahalla', cell: [-2, -1], transpose: true, nameUz: 'Gulobod mahallasi', nameRu: 'Махалля Гулобод' },
  { id: 7, zone: 'mahalla', cell: [1, -1], nameUz: 'Istiqlol mahallasi', nameRu: 'Махалля Истиклол' },
  { id: 8, zone: 'mahalla', cell: [1, 0], transpose: true, nameUz: "Do'stlik mahallasi", nameRu: 'Махалля Дустлик' },
  { id: 9, zone: 'kopqavatli', cell: [-2, 0], nameUz: 'Yangi turar-joy', nameRu: 'Новый квартал' },
  { id: 10, zone: 'tepalik', cell: [0, -2], span: 2, nameUz: 'Tepalik', nameRu: 'Холмы' },
  { id: 11, zone: 'kol', cell: [0, 1], span: 2, nameUz: "Ko'l bo'yi", nameRu: 'Озёрный' },
  { id: 12, zone: 'kopqavatli', cell: [-2, 1], nameUz: 'Baland uylar', nameRu: 'Высотки' },
];
const BUSINESS_RECT: Rect = cellRect(-1, 1);

const HOVLI = { w: 25, d: 34 } as const;
const VILLA = { w: 32, d: 44 } as const;
const QASR = { w: 42, d: 60 } as const;
/** Do'kon 18×24, lekin qo'shnilar orasi kengroq. */
const SHOP = { w: 18, d: 24, pitchW: 24, pitchD: 34 } as const;
/** Hovlilar maydon chetidan shuncha metr narida boshlanadi. */
const PLAZA_GAP = 3;
const PLOTS_PER_DISTRICT = 400;
/** Qasr to'ri tuman ID'siga qo'shiladigan siljish — ko'cha kalitlari to'qnashmasin. */
const HIGH_GRID_OFFSET = 100;

/** Bilbord ustuni yashil yo'lakda turadi, paneli (±4 m) hovliga kirmaydi. */
const BILLBOARD_SIDE = 9.9;
type Green = MasterPlan['greens'][number];
const COURTYARD = { away: 45, w: 80, d: 44 } as const;
const VALUE_REACH = 2100;
const HILL_REACH = 525;

const never = (): boolean => false;
const dist = (x: number, z: number, cx = 0, cz = 0): number => Math.hypot(x - cx, z - cz);
const round1 = (v: number): number => Math.round(v * 10) / 10;
const lakeDistance = (x: number, z: number): number => Math.hypot((x - LAKE.x) / LAKE.rx, (z - LAKE.z) / LAKE.rz);
const districtRect = (s: DistrictSpec): Rect => cellRect(s.cell[0], s.cell[1], s.span ?? 1);

/** Joy qiymati 0..100: markaz, ko'l bo'yi, tepalik qimmatroq. */
const plotValue = (type: PlotType, x: number, z: number): number => {
  const centre = Math.max(0, 1 - dist(x, z) / VALUE_REACH);
  const lake = type === 'villa' ? Math.max(0, 1 - (lakeDistance(x, z) - 1) / 0.8) : 0;
  const hill = type === 'qasr' ? Math.max(0, 1 - dist(x, z, HILL.x, HILL.z) / HILL_REACH) : 0;
  return Math.round(Math.min(100, centre * 60 + Math.max(lake, hill) * 70));
};

const pick = (spots: readonly Spot[], n: number, score: (s: Spot) => number, what: string): { used: Spot[]; rest: Spot[] } => {
  if (spots.length < n) throw new Error(`${what}: ${spots.length} joy bor, ${n} kerak`);
  const sorted = [...spots].sort((a, b) => score(a) - score(b) || a.x - b.x || a.z - b.z);
  return { used: sorted.slice(0, n), rest: sorted.slice(n) };
};

interface Draft { readonly spot: Spot; readonly type: PlotType; readonly districtId: number }
interface HousePlan { readonly roads: readonly Road[]; readonly drafts: readonly Draft[]; readonly rest: readonly Spot[] }

const draftsOf = (spots: readonly Spot[], type: PlotType, districtId: number): Draft[] =>
  spots.map((spot): Draft => ({ spot, type, districtId }));

const planMahalla = (s: DistrictSpec): HousePlan => {
  const grid = layoutGrid({
    district: s.id, rect: districtRect(s), plotW: HOVLI.w, plotD: HOVLI.d, crossStreets: 1, transpose: s.transpose ?? false, slack: 'outer',
    blocked: (x, z, w, d) => Math.abs(x) - w / 2 < PLAZA_HALF + PLAZA_GAP && Math.abs(z) - d / 2 < PLAZA_HALF + PLAZA_GAP, roadBlocked: (x, z) => inPlaza(x, z),
  });
  const { used, rest } = pick(grid.spots, PLOTS_PER_DISTRICT, (p) => dist(p.x, p.z), `tuman ${s.id}`);
  return { roads: grid.roads, drafts: draftsOf(used, 'hovli', s.id), rest };
};

const planLake = (s: DistrictSpec): HousePlan => {
  const grid = layoutGrid({
    district: s.id, rect: districtRect(s), plotW: VILLA.w, plotD: VILLA.d, crossStreets: 3, transpose: false, slack: 'even',
    blocked: (x, z, w, d) => inLake(x, z, Math.hypot(w, d) / 2 + 4), roadBlocked: (x, z) => inLake(x, z, 9),
  });
  // Oldidagi ko'cha ko'l tufayli uzilgan joylar uchastka bo'la olmaydi.
  const hasRoad = (p: Spot): boolean => {
    const yaw = (p.rot * Math.PI) / 2;
    const reach = p.d / 2 + STREET / 2;
    return !inLake(p.x + Math.sin(yaw) * reach, p.z + Math.cos(yaw) * reach, 9 + p.w * 1.5);
  };
  const { used, rest } = pick(grid.spots.filter(hasRoad), PLOTS_PER_DISTRICT, (p) => lakeDistance(p.x, p.z), "ko'l");
  return { roads: grid.roads, drafts: draftsOf(used, 'villa', s.id), rest };
};

const planHill = (s: DistrictSpec): HousePlan => {
  const base = { crossStreets: 1, transpose: false, slack: 'even' as const, blocked: never, roadBlocked: never };
  const low: GridResult = layoutGrid({ ...base, district: s.id, rect: cellRect(0, -2), plotW: HOVLI.w, plotD: HOVLI.d });
  const high: GridResult = layoutGrid({ ...base, district: s.id + HIGH_GRID_OFFSET, rect: cellRect(1, -2), plotW: QASR.w, plotD: QASR.d });
  const a = pick(low.spots, 300, (p) => dist(p.x, p.z), 'tepalik hovli');
  const b = pick(high.spots, 100, (p) => dist(p.x, p.z, HILL.x, HILL.z), 'tepalik qasr');
  return {
    roads: [...low.roads, ...high.roads],
    drafts: [...draftsOf(a.used, 'hovli', s.id), ...draftsOf(b.used, 'qasr', s.id)],
    rest: [...a.rest, ...b.rest],
  };
};

const HOUSE_PLANNERS: Record<Exclude<Zone, 'kopqavatli'>, (s: DistrictSpec) => HousePlan> = {
  mahalla: planMahalla, kol: planLake, tepalik: planHill,
};

/** 10 ta 9-qavatli (36 xonadon) + 7 ta 5-qavatli (20 xonadon) = 500. */
const planApartments = (s: DistrictSpec, firstId: number): { buildings: Building[]; roads: Road[] } => {
  const [x0, z0, x1, z1] = districtRect(s);
  const cols = 5;
  const rows = 4;
  const stepX = (x1 - x0) / cols;
  const stepZ = (z1 - z0) / rows;
  const cells = Array.from({ length: cols * rows }, (_, i) => ({
    x: round1(x0 + ((i % cols) + 0.5) * stepX), z: round1(z0 + (Math.floor(i / cols) + 0.5) * stepZ),
  })).sort((a, b) => dist(a.x, a.z) - dist(b.x, b.z) || a.x - b.x);
  const buildings = cells.slice(0, 17).map((c, i): Building => ({
    id: firstId + i, districtId: s.id, x: c.x, z: c.z, rot: c.z > (z0 + z1) / 2 ? 2 : 0, floors: i < 10 ? 9 : 5,
  }));
  const roads = [1, 2, 3].flatMap((r) => clipRoad('x', x0, x1, z0 + r * stepZ, STREET, 'kocha', never));
  return { buildings, roads };
};

type CommerceDraft = Omit<Commerce, 'id'>;

const plazaOffices = (): CommerceDraft[] => {
  const ring = PLAZA_HALF - 17;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const;
  const offsets = [[ring, ring], [ring, ring - 34], [ring - 34, ring]] as const;
  return corners.flatMap(([sx, sz]) => offsets.map(([ox, oz]): CommerceDraft => ({
    type: 'ofis', x: sx * ox, z: sz * oz, w: 28, d: 28, rot: sz < 0 ? 0 : 2,
  })));
};

/** Ofis eni 36 m — bir qatordagi ikki qo'shni joy birlashadi. */
const businessOffices = (spots: readonly Spot[], count: number): { offices: CommerceDraft[]; rest: Spot[] } => {
  const byRow = new Map(spots.map((s) => [`${s.row}:${s.index}`, s]));
  const taken = new Set<Spot>();
  const out: CommerceDraft[] = [];
  for (const s of spots) {
    if (out.length >= count) break;
    const next = byRow.get(`${s.row}:${s.index + 1}`);
    if (taken.has(s) || !next || taken.has(next)) continue;
    taken.add(s).add(next);
    out.push({ type: 'ofis', x: round1((s.x + next.x) / 2), z: round1(s.z), w: 36, d: 24, rot: s.rot });
  }
  return { offices: out, rest: spots.filter((s) => !taken.has(s)) };
};

/** Bilbordlar ikki markaziy prospekt chetida, chorrahalardan tashqarida. */
const billboards = (): CommerceDraft[] =>
  Array.from({ length: 40 }, (_, i): CommerceDraft => {
    const onX = i % 2 === 0;
    const k = Math.floor(i / 2);
    const along = (k % 2 === 0 ? 1 : -1) * (150 + Math.floor(k / 2) * 80);
    return { type: 'bilbord', x: onX ? along : BILLBOARD_SIDE, z: onX ? BILLBOARD_SIDE : along, w: 8, d: 2, rot: onX ? 3 : 0 };
  });

const planCommerce = (): { commerce: Commerce[]; roads: readonly Road[]; rest: readonly Spot[] } => {
  const grid = layoutGrid({
    district: 90, rect: BUSINESS_RECT, plotW: SHOP.pitchW, plotD: SHOP.pitchD, crossStreets: 1, transpose: false, slack: 'even', blocked: never, roadBlocked: never,
  });
  const { used, rest } = pick(grid.spots, 100, (p) => dist(p.x, p.z), "do'kon");
  const shops = used.map((s): CommerceDraft => ({ type: 'dokon', x: round1(s.x), z: round1(s.z), w: SHOP.w, d: SHOP.d, rot: s.rot }));
  const business = businessOffices(rest, 18);
  const all = [...shops, ...plazaOffices(), ...business.offices, ...billboards()];
  return { commerce: all.map((c, i): Commerce => ({ id: `B${String(i + 1).padStart(3, '0')}`, ...c })), roads: grid.roads, rest: business.rest };
};

/** Tumanlararo prospektlar; ko'l tumani ichidan o'tmaydi. */
const avenueRoads = (): Road[] => {
  const blocked = (x: number, z: number): boolean => inPlaza(x, z) || (x === CELL && z > CELL + M - 2 && z < CITY_HALF - M);
  return AVENUE_LINES.flatMap((l) => [
    ...clipRoad('x', -CITY_HALF - M, CITY_HALF + M, l, AVENUE, 'prospekt', blocked),
    ...clipRoad('z', -CITY_HALF - M, CITY_HALF + M, l, AVENUE, 'prospekt', blocked),
  ]);
};

const streetWeight = (key: string): number => {
  const [t, a, b] = key.split(':');
  return t === 'a' ? Math.abs(Number(b)) + (a === 'x' ? 0.1 : 0) : 10_000 + Number(a) * 100 + Number(b) * 0.01;
};

const resolveStreets = (keys: readonly string[]): { streets: Street[]; byKey: Map<string, number> } => {
  const sorted = [...new Set(keys)].sort((a, b) => streetWeight(a) - streetWeight(b) || (a < b ? -1 : 1));
  const streets = sorted.map((k, i): Street => {
    const [t, a, b] = k.split(':');
    const isAvenue = t === 'a';
    const raw = isAvenue ? 0 : Number(a);
    return {
      id: i + 1, districtId: raw > HIGH_GRID_OFFSET ? raw - HIGH_GRID_OFFSET : raw,
      kind: isAvenue ? 'prospekt' : 'kocha', central: isAvenue && Number(b) === 0,
    };
  });
  return { streets, byKey: new Map(sorted.map((k, i) => [k, i + 1])) };
};

/** Ko'cha bo'ylab: bir tomoni toq, ikkinchisi juft raqamlar. */
const assignNumbers = (drafts: readonly Draft[]): Map<Spot, number> => {
  const groups = Map.groupBy(drafts, (d) => `${d.spot.streetKey}|${d.spot.rot >= 2 ? 2 : 1}`);
  const out = new Map<Spot, number>();
  for (const [key, list] of groups) {
    const first = Number(key.at(-1));
    const isAlongX = (list[0]?.spot.rot ?? 0) % 2 === 0;
    [...list]
      .sort((a, b) => (isAlongX ? a.spot.x - b.spot.x : a.spot.z - b.spot.z))
      .forEach((d, i) => out.set(d.spot, i * 2 + first));
  }
  return out;
};

type RestByDistrict = ReadonlyMap<number, readonly Spot[]>;

/** Bo'sh qolgan qo'shni joy — oldindan belgilangan hovli kengaytirish joyi. */
const buildExpansions = (drafts: readonly Draft[], rest: RestByDistrict, idOf: ReadonlyMap<Spot, string>): { expansions: Expansion[]; left: Spot[] } => {
  const expansions: Expansion[] = [];
  const left: Spot[] = [];
  const used = new Set<string>();
  for (const [districtId, spots] of rest) {
    const own = new Map(drafts.filter((d) => d.districtId === districtId).map((d) => [`${d.spot.w}|${d.spot.row}:${d.spot.index}`, d.spot]));
    for (const s of spots) {
      const plotId = [s.index - 1, s.index + 1]
        .map((i) => own.get(`${s.w}|${s.row}:${i}`))
        .map((n) => (n ? idOf.get(n) : undefined))
        .find((id) => id !== undefined && !used.has(id));
      if (!plotId) { left.push(s); continue; }
      used.add(plotId);
      expansions.push({ id: `E${String(expansions.length + 1).padStart(3, '0')}`, plotId, x: round1(s.x), z: round1(s.z), w: s.w, d: s.d, rot: s.rot });
    }
  }
  return { expansions, left };
};

const apartmentKey = (b: Building): string => `s:${b.districtId}:${Math.round(b.z / 10) + 200}`;

const buildPlots = (drafts: readonly Draft[], buildings: readonly Building[], byKey: ReadonlyMap<string, number>): { plots: Plot[]; idOf: Map<Spot, string> } => {
  const numbers = assignNumbers(drafts);
  const plots: Plot[] = [];
  const idOf = new Map<Spot, string>();
  const houseCount = new Map<string, number>();
  const nextId = (): string => `P${String(plots.length + 1).padStart(4, '0')}`;
  const street = (key: string): number => {
    const id = byKey.get(key);
    if (id === undefined) throw new Error(`Ko'cha topilmadi: ${key}`);
    return id;
  };
  for (const s of SPECS) {
    for (const d of drafts.filter((x) => x.districtId === s.id)) {
      const { spot } = d;
      const id = nextId();
      idOf.set(spot, id);
      plots.push({
        id, districtId: s.id, streetId: street(spot.streetKey), number: numbers.get(spot) ?? 0, unit: 0, type: d.type,
        x: round1(spot.x), z: round1(spot.z), w: spot.w, d: spot.d, rot: spot.rot, building: 0, value: plotValue(d.type, spot.x, spot.z),
      });
    }
    for (const b of buildings.filter((x) => x.districtId === s.id)) {
      const key = apartmentKey(b);
      const number = (houseCount.get(key) ?? 0) + 1;
      houseCount.set(key, number);
      for (let unit = 1; unit <= b.floors * 4; unit++) {
        plots.push({
          id: nextId(), districtId: s.id, streetId: street(key), number, unit, type: 'kvartira',
          x: b.x, z: b.z, w: 44, d: 16, rot: b.rot, building: b.id, value: plotValue('kvartira', b.x, b.z),
        });
      }
    }
  }
  return { plots, idOf };
};

const greenOf = (s: Spot): Green => {
  const [w, d] = rotatedSize(s.w, s.d, s.rot);
  return [round1(s.x), round1(s.z), w, d];
};
/** Ko'p qavatli uy hovlisi — fasad oldidagi bog'cha. */
const courtyardOf = (b: Building): Green => [b.x, round1(b.z + (b.rot === 0 ? COURTYARD.away : -COURTYARD.away)), COURTYARD.w, COURTYARD.d];

export const generateMasterPlan = (): MasterPlan => {
  const drafts: Draft[] = [];
  const rest = new Map<number, readonly Spot[]>();
  const roads: Road[] = avenueRoads();
  const buildings: Building[] = [];

  for (const s of SPECS) {
    if (s.zone === 'kopqavatli') {
      const r = planApartments(s, buildings.length + 1);
      roads.push(...r.roads);
      buildings.push(...r.buildings);
      continue;
    }
    const r = HOUSE_PLANNERS[s.zone](s);
    roads.push(...r.roads);
    drafts.push(...r.drafts);
    rest.set(s.id, r.rest);
  }
  const { streets, byKey } = resolveStreets([...drafts.map((d) => d.spot.streetKey), ...buildings.map(apartmentKey)]);
  const { plots, idOf } = buildPlots(drafts, buildings, byKey);
  const { expansions, left } = buildExpansions(drafts, rest, idOf);
  const business = planCommerce();

  return {
    version: 2,
    districts: SPECS.map((s): District => ({ id: s.id, zone: s.zone, nameUz: s.nameUz, nameRu: s.nameRu, rect: districtRect(s) })),
    streets, plots, buildings, expansions,
    commerce: business.commerce,
    roads: [...roads, ...business.roads].map((r): Road => ({ ...r, x: round1(r.x), z: round1(r.z), w: round1(r.w), d: round1(r.d) })),
    greens: [...[...left, ...business.rest].map(greenOf), ...buildings.map(courtyardOf)],
  };
};
