/** Jamoat joylarining yer qoplamasi: maydon, bulvar yo'laklari, markazlar, bog'. Yer va xarita shundan chizadi. */
import { CENTER_BOXES, PARK_R, PLAZA_R, SITES, ZONES, type Box4 } from '../../../../packages/shared/src/index.ts';

export const PAVE = { tile: '#f1e9da', path: '#e7dfd0', office: '#e6e9ec', sand: '#f3e6bf', asphalt: '#6b6e75', lawn: '#7fbf55', track: '#e2896b', water: '#7fc9ea', flower: '#f5c6d6' } as const;
export type PaveKind = keyof typeof PAVE;
export interface PaveRect { readonly box: Box4; readonly kind: PaveKind; /** 0 — pastki, 1 — ustiga chiziladigan. */ readonly level: 0 | 1 }
const rect = (kind: PaveKind, box: Box4, level: 0 | 1 = 0): PaveRect => ({ kind, box, level });
const around = (x: number, z: number, hx: number, hz: number): Box4 => [x - hx, z - hz, x + hx, z + hz];
const inset = ([a, b, c, d]: Box4, m: number): Box4 => [a + m, b + m, c - m, d - m];

const [BX0, , BX1, BZ] = ZONES.bulvar.rect;
const [, KZ0, KX] = ZONES.bulvarKichik.rect;
/** Bulvarlarning o'rta va yon yo'laklari. */
export const WALK = { main: 7, side: 58, sideHalf: 2.5, small: 5, smallSide: 38 } as const;
const CROSS_STEP = 150;
const boulevards = (): PaveRect[] => {
  const start = PLAZA_R - 2;
  const big = [[BX0, -start], [start, BX1]].flatMap(([a = 0, b = 0]) => [
    rect('tile', [a, -WALK.main, b, WALK.main], 1), ...[-1, 1].map((s) => rect('path', around((a + b) / 2, s * WALK.side, (b - a) / 2, WALK.sideHalf))),
    ...Array.from({ length: Math.floor((b - a) / CROSS_STEP) }, (_, i) => rect('path', around(a + (i + 0.5) * CROSS_STEP, 0, 2, BZ))),
  ]);
  const small = [[KZ0, -start], [start, -KZ0]].flatMap(([a = 0, b = 0]) => [
    rect('tile', [-WALK.small, a, WALK.small, b], 1), ...[-1, 1].map((s) => rect('path', around(s * WALK.smallSide, (a + b) / 2, 2, (b - a) / 2))),
    ...Array.from({ length: Math.floor((b - a) / CROSS_STEP) }, (_, i) => rect('path', around(0, a + (i + 0.5) * CROSS_STEP, KX, 2))),
  ]);
  return [...big, ...small];
};

/** Ma'muriy markaz: uch bino oldidagi maydoncha va ularga yo'laklar. */
const admin = (): PaveRect[] => [
  rect('tile', [-110, -1040, 110, -820]), rect('tile', around(-160, -940, 60, 28)), rect('tile', around(160, -940, 60, 28)), rect('tile', around(0, -1082, 34, 45)),
  rect('lawn', around(-62, -990, 40, 32), 1), rect('lawn', around(62, -990, 40, 32), 1), rect('lawn', around(-62, -872, 40, 40), 1), rect('lawn', around(62, -872, 40, 40), 1),
];
/** Savdo markazi: hammasi tosh maydon, g'arbda bozor, sharqda avtoturargoh. */
export const PARKING: Box4 = [120, 846, 262, 948];
const market = (): PaveRect[] => [rect('tile', inset(ZONES.savdo.rect, 2)), rect('asphalt', PARKING, 1), rect('lawn', around(-62, 896, 44, 46), 1), rect('lawn', around(60, 896, 40, 46), 1), rect('lawn', [-276, 826, -118, 838], 1), rect('lawn', [118, 826, 276, 838], 1), rect('lawn', [-280, 1104, 280, 1116], 1), rect('lawn', [-280, 1166, -24, 1177], 1), rect('lawn', [24, 1166, 280, 1177], 1), rect('lawn', [-56, 1072, 56, 1100], 1)];
/** Biznes markazi: och plitka, ichki yo'laklar asfalt. */
const business = (): PaveRect[] => [
  rect('office', inset(ZONES.biznes.rect, 2)), ...[-72, 72, 208].map((z) => rect('asphalt', [806, z - 5, 1112, z + 5], 1)),
  rect('lawn', [812, -290, 1110, -132], 1), rect('lawn', [812, 124, 1110, 168], 1), rect('lawn', [1142, -290, 1272, -76], 1), rect('sand', [1142, 84, 1272, 290], 1), rect('lawn', [1060, 176, 1110, 290], 1), rect('lawn', [812, 250, 1050, 290], 1),
];
/** Dam olish bog'i: aylanma yo'laklar, hovuz; janubda stadion joyi. */
export const STADIUM = { x: -1275, z: 150 } as const;
export const POND = { x: -1300, z: -150, r: 46 } as const;
const park = (): PaveRect[] => [
  rect('path', [-1500, -4, -1050, 4]), rect('path', [-1380, -300, -1372, 0]), rect('path', [-1160, -300, -1152, 300]), rect('path', [-1480, -304, -1070, -296]), rect('path', around(-1275, -50, 110, 3)), rect('path', [-1440, 296, -1080, 302]),
  rect('sand', around(STADIUM.x, STADIUM.z, 92, 72), 1),
];
const sites = (): PaveRect[] => [
  ...Object.entries(SITES).map(([id, box]) => rect(id === 'otochirish' ? 'office' : 'tile', inset(box, 1))), rect('asphalt', [704, 583, 739, 609], 1),
  rect('lawn', [-862, -144, -838, -110], 1), rect('lawn', [-800, -144, -776, -110], 1), rect('lawn', [-470, -138, -448, -110], 1), rect('lawn', [-410, -138, -389, -110], 1), rect('lawn', [389, -140, 410, -110], 1), rect('lawn', [446, -140, 470, -110], 1),
];
const centers = (): PaveRect[] => CENTER_BOXES.flatMap((b) => [rect('path', inset(b, 1)), rect('lawn', inset([b[0], b[1], b[2], b[1] + 10], 2), 1), rect('lawn', inset([b[0], b[3] - 10, b[2], b[3]], 2), 1)]);

export const PAVING: readonly PaveRect[] = [...boulevards(), ...admin(), ...market(), ...business(), ...park(), ...sites(), ...centers()];
/** Doiralar: [x, z, ichki r, tashqi r, tur, level]. */
export interface PaveRing { readonly x: number; readonly z: number; readonly r0: number; readonly r1: number; readonly kind: PaveKind; readonly level: 0 | 1 }
const ring = (kind: PaveKind, r0: number, r1: number, level: 0 | 1 = 0, x = 0, z = 0): PaveRing => ({ x, z, r0, r1, kind, level });
export const PAVE_RINGS: readonly PaveRing[] = [
  ring('tile', 0, PLAZA_R), ring('path', 14, 18, 1), ring('lawn', 34, 62, 1), ring('path', 66, 69, 1), ring('lawn', 92, 122, 1), ring('path', PARK_R - 34, PARK_R - 30),
  ring('water', 0, POND.r, 1, POND.x, POND.z), ring('path', POND.r, POND.r + 4, 1, POND.x, POND.z),
];
/** Maydondagi maysa halqalari orasidan o'tadigan yo'laklar (to'rt tomon va diagonallar). */
export const PLAZA_AISLES = { half: 9, angles: [0, 1, 2, 3, 4, 5, 6, 7].map((k) => (k * Math.PI) / 4) } as const;
