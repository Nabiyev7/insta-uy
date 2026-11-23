/** Mini-xarita: shahar bir marta chiziladi, keyin faqat kesib ko'rsatiladi. */
import { CITY_HALF, HILL, HILL_EDGE, LAKE, PLAZA_HALF, rotatedSize } from '../../../../packages/shared/src/index.ts';
import { camera, player, remotes } from '../app/runtime.ts';
import { getApp } from '../app/store.ts';

export const MAP_SIZE = 1100;
const SPAN = (CITY_HALF + 50) * 2;
export const toMap = (v: number): number => ((v + SPAN / 2) / SPAN) * MAP_SIZE;
export const fromMap = (v: number): number => (v / MAP_SIZE) * SPAN - SPAN / 2;

const TIER_COLORS = ['#a9763f', '#a9763f', '#ad6d38', '#b5632f', '#b5562f', '#b5452f', '#a2394a', '#8f3fa0', '#7a35b0', '#d39b1f', '#f0b90b'];
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
  g.fillStyle = '#b9cf9c';
  g.fillRect(0, 0, MAP_SIZE, MAP_SIZE);
  const open = new Set(s.boot?.districts.filter((d) => d.open).map((d) => d.id));
  for (const d of s.plan.districts) {
    g.fillStyle = open.has(d.id) ? '#dfe6bd' : '#d3c3a3';
    g.fillRect(toMap(d.rect[0]), toMap(d.rect[1]), (d.rect[2] - d.rect[0]) * k, (d.rect[3] - d.rect[1]) * k);
  }
  const hill = g.createRadialGradient(toMap(HILL.x), toMap(HILL.z), 4, toMap(HILL.x), toMap(HILL.z), HILL.sigma * 1.65 * k);
  hill.addColorStop(0, 'rgba(120,100,60,0.55)');
  hill.addColorStop(1, 'rgba(120,100,60,0)');
  g.fillStyle = hill;
  g.fillRect(toMap(HILL_EDGE), toMap(-CITY_HALF), (CITY_HALF - HILL_EDGE) * k, (CITY_HALF - HILL_EDGE) * k);
  g.fillStyle = '#efe4cf';
  rect(0, 0, PLAZA_HALF * 2, PLAZA_HALF * 2);
  g.fillStyle = '#7f8488';
  for (const r of s.plan.roads) rect(r.x, r.z, r.w, r.d);
  g.fillStyle = '#4fa9c2';
  g.beginPath();
  g.ellipse(toMap(LAKE.x), toMap(LAKE.z), LAKE.rx * k, LAKE.rz * k, 0, 0, Math.PI * 2);
  g.fill();
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

const RADIUS = 130;

export const drawMinimap = (canvas: HTMLCanvasElement): void => {
  const g = canvas.getContext('2d');
  if (!g) return;
  const src = paint();
  const n = canvas.width;
  const k = MAP_SIZE / SPAN;
  const zoom = n / (RADIUS * 2 * k);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#b9cf9c';
  g.fillRect(0, 0, n, n);
  g.translate(n / 2, n / 2);
  g.rotate(camera.yaw);
  g.scale(zoom, zoom);
  g.drawImage(src, -toMap(player.x), -toMap(player.z));
  g.fillStyle = '#1f4fd0';
  for (const r of remotes.values()) {
    g.beginPath();
    g.arc(toMap(r.x) - toMap(player.x), toMap(r.z) - toMap(player.z), 1.6, 0, Math.PI * 2);
    g.fill();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  arrow(g, n / 2, n / 2, Math.PI - player.yaw + camera.yaw, 15);
};

export const drawBigMap = (canvas: HTMLCanvasElement): void => {
  const g = canvas.getContext('2d');
  if (!g) return;
  g.drawImage(paint(), 0, 0);
  const s = getApp();
  g.font = '600 25px "Unbounded Variable", system-ui';
  g.textAlign = 'center';
  for (const d of s.boot?.districts ?? []) {
    const r = s.plan?.districts.find((x) => x.id === d.id)?.rect;
    if (!r) continue;
    const name = (s.lang === 'uz' ? d.name_uz : d.name_ru).replace(/ mahallasi|Махалля /, '');
    const x = toMap((r[0] + r[2]) / 2);
    const y = toMap((r[1] + r[3]) / 2);
    g.lineWidth = 6;
    g.strokeStyle = 'rgba(255,252,244,0.9)';
    g.strokeText(d.open ? name : `🚧 ${name}`, x, y);
    g.fillStyle = d.open ? '#14545f' : '#7a5a3a';
    g.fillText(d.open ? name : `🚧 ${name}`, x, y);
  }
  for (const p of s.profile?.plots ?? []) {
    const plot = s.plotById.get(p.plot);
    if (plot) g.fillText('🏠', toMap(plot.x), toMap(plot.z));
  }
  arrow(g, toMap(player.x), toMap(player.z), Math.PI - player.yaw, 22);
};
