/** Katta xarita: shahar bir marta chiziladi, ustiga nomlar va o'yinchilar qo'yiladi. */
import { CENTER_BOXES, CITY_HALF, CIVIC, HILL, LAKE, PLAZA_R, RIVER, SITES, ZONES, civicRect, rotatedSize, type ZoneId } from '../../../../packages/shared/src/index.ts';
import { here, remotes } from '../app/runtime.ts';
import { getApp } from '../app/store.ts';
import { ICONS, type IconName } from './icons.tsx';

export const MAP_SIZE = 1100;
const SPAN = (CITY_HALF + 50) * 2;
export const toMap = (v: number): number => ((v + SPAN / 2) / SPAN) * MAP_SIZE;
export const fromMap = (v: number): number => (v / MAP_SIZE) * SPAN - SPAN / 2;

const TIER_COLORS = ['#e08a6d', '#e08a6d', '#de7c5e', '#d9604a', '#b5562f', '#b5452f', '#a2394a', '#8f3fa0', '#7a35b0', '#d39b1f', '#f0b90b'];
const ZONE_COLORS: readonly (readonly [ZoneId, string])[] = [['bulvar', '#7fc25a'], ['bulvarKichik', '#7fc25a'], ['mamuriy', '#f7c6bd'], ['biznes', '#bcd6f2'], ['savdo', '#e4c8ee'], ['dam', '#93d06f']];
let cache: { key: unknown; canvas: HTMLCanvasElement } | null = null;

const paint = (): HTMLCanvasElement => {
  const s = getApp();
  if (cache && cache.key === s.houses) return cache.canvas;
  const c = document.createElement('canvas');
  c.width = c.height = MAP_SIZE;
  const g = c.getContext('2d');
  if (!g || !s.plan) return c;
  const k = MAP_SIZE / SPAN;
  const rect = (x: number, z: number, w: number, d: number): void => g.fillRect(toMap(x - w / 2), toMap(z - d / 2), w * k, d * k);
  g.fillStyle = '#a5d283';
  g.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const box = ([x0, z0, x1, z1]: readonly [number, number, number, number]): void => g.fillRect(toMap(x0), toMap(z0), (x1 - x0) * k, (z1 - z0) * k);
  const disc = (x: number, z: number, r: number): void => { g.beginPath(); g.arc(toMap(x), toMap(z), r * k, 0, Math.PI * 2); g.fill(); };
  const open = new Set(s.boot?.districts.filter((d) => d.open).map((d) => d.id));
  for (const d of s.plan.districts) {
    g.fillStyle = open.has(d.id) ? '#d7edbf' : '#c3dfa8';
    d.rects.forEach(box);
  }
  const hill = g.createRadialGradient(toMap(HILL.x), toMap(HILL.z), 4, toMap(HILL.x), toMap(HILL.z), HILL.sigma * 1.65 * k);
  hill.addColorStop(0, 'rgba(120,100,60,0.45)');
  hill.addColorStop(1, 'rgba(120,100,60,0)');
  g.fillStyle = hill;
  box(ZONES.tepalik.rect);
  for (const [id, color] of ZONE_COLORS) { g.fillStyle = color; box(ZONES[id].rect); }
  g.fillStyle = '#f6d67a';
  [...Object.values(SITES), ...CENTER_BOXES].forEach(box);
  g.strokeStyle = '#b9dfa0';
  g.lineWidth = RIVER.half * 2 * k;
  g.beginPath();
  RIVER.points.forEach(([x, z], i) => { if (i) g.lineTo(toMap(x), toMap(z)); else g.moveTo(toMap(x), toMap(z)); });
  g.stroke();
  g.fillStyle = '#f6efe0';
  disc(0, 0, PLAZA_R);
  for (const r of s.plan.roads) {
    g.save();
    g.translate(toMap(r.x), toMap(r.z));
    g.rotate(r.angle ?? 0);
    g.fillStyle = r.kind === 'kocha' ? '#ffffff' : '#8b8f97';
    g.fillRect((-r.w / 2) * k, (-r.d / 2) * k, r.w * k, r.d * k);
    g.restore();
  }
  g.fillStyle = '#6dbfe6';
  disc(LAKE.x, LAKE.z, LAKE.rx);
  for (const p of s.plan.plots) {
    const h = s.houses.get(p.id);
    if (!h || p.type === 'kvartira') continue;
    const [w, d] = rotatedSize(p.w, p.d, p.rot);
    g.fillStyle = TIER_COLORS[h.tier] ?? '#a9763f';
    rect(p.x, p.z, w * 0.75, d * 0.6);
  }
  g.fillStyle = '#6f7f8f';
  for (const b of s.plan.buildings) rect(b.x, b.z, 44, 16);
  g.fillStyle = '#14545f';
  for (const q of s.plan.commerce) if (q.type !== 'bilbord') rect(q.x, q.z, q.w * 0.7, q.d * 0.7);
  g.fillStyle = '#b5483a';
  for (const q of CIVIC) { const r = civicRect(q); rect(r.x, r.z, r.hx * 2, r.hz * 2); }
  g.fillStyle = '#2f9fb5';
  g.beginPath();
  g.arc(toMap(0), toMap(0), 6, 0, Math.PI * 2);
  g.fill();
  cache = { key: s.houses, canvas: c };
  return c;
};

const arrow = (g: CanvasRenderingContext2D, x: number, y: number, angle: number, size: number): void => {
  g.save();
  g.translate(x, y);
  g.rotate(angle);
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size * 0.7, size * 0.8);
  g.lineTo(0, size * 0.4);
  g.lineTo(-size * 0.7, size * 0.8);
  g.closePath();
  g.fillStyle = '#c23b22';
  g.strokeStyle = '#fff';
  g.lineWidth = 3;
  g.stroke();
  g.fill();
  g.restore();
};

/** Xaritadagi belgi (markazi x, y). */
const icon = (g: CanvasRenderingContext2D, name: IconName, x: number, y: number, size: number, color: string): void => {
  g.save();
  g.translate(x - size / 2, y - size / 2);
  g.scale(size / 24, size / 24);
  g.lineCap = g.lineJoin = 'round';
  const path = new Path2D(ICONS[name]);
  for (const [width, stroke] of [[6, 'rgba(255,252,244,0.95)'], [2.6, color]] as const) {
    g.lineWidth = width;
    g.strokeStyle = stroke;
    g.stroke(path);
  }
  g.restore();
};

export const drawBigMap = (canvas: HTMLCanvasElement): void => {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.drawImage(paint(), 0, 0);
  const s = getApp();
  g.font = '600 25px "Unbounded Variable", system-ui';
  g.textAlign = 'center';
  for (const d of s.boot?.districts ?? []) {
    const at = s.plan?.districts.find((x) => x.id === d.id)?.label;
    if (!at) continue;
    const name = (s.lang === 'uz' ? d.name_uz : d.name_ru).replace(/ mahallasi|Махалля /, '');
    const x = toMap(at[0]);
    const y = toMap(at[1]);
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(255,252,244,0.9)';
    g.strokeText(name, x, y);
    g.fillStyle = d.open ? '#1d5a63' : '#7a5a3a';
    g.fillText(name, x, y);
    if (!d.open) icon(g, 'lock', x, y - 40, 30, '#7a5a3a');
  }
  for (const p of s.profile?.plots ?? []) {
    const plot = s.plotById.get(p.plot);
    if (plot) icon(g, 'home', toMap(plot.x), toMap(plot.z), 44, '#d9604a');
  }
  g.fillStyle = '#1f4fd0';
  for (const r of remotes.values()) {
    g.beginPath();
    g.arc(toMap(r.x), toMap(r.z), 5, 0, Math.PI * 2);
    g.fill();
  }
  const at = here();
  arrow(g, toMap(at.x), toMap(at.z), Math.PI - at.yaw, 22);
};
