/** CHAT-UCHUN.md uchun butun shaharning koordinatali chizmasi: docs/chat/shahar-reja.png */
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CENTER_BOXES, CITY_HALF, CIVIC, LAKE, PLAZA_R, RIVER, SITES, ZONES, civicRect, decodePlan, rotatedSize } from '../packages/shared/src/index.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = decodePlan(JSON.parse(readFileSync(path.join(root, 'packages/shared/data/masterplan.json'), 'utf8')));
const SIZE = 2000;
const SPAN = CITY_HALF * 2 + 100;
const K = SIZE / SPAN;
const GRID = 250;
const DISTRICT = ['#e6a08a', '#e0c080', '#b8d080', '#80c8a8', '#80b8d8', '#d090c8', '#a0a0e0', '#d8a060', '#c0a040', '#b070b0', '#607090', '#708090'];
const ZONE = { bulvar: '#6fb050', bulvarKichik: '#6fb050', mamuriy: '#f2b0a8', biznes: '#a8c8f2', savdo: '#d8b0e6', dam: '#8fd070' };

const at = (v) => (v + SPAN / 2) * K;
const box = ([x0, z0, x1, z1], fill) => `<rect x="${at(x0)}" y="${at(z0)}" width="${(x1 - x0) * K}" height="${(z1 - z0) * K}" fill="${fill}"/>`;
const tilted = (r, fill) => `<rect x="${(-r.w / 2) * K}" y="${(-r.d / 2) * K}" width="${r.w * K}" height="${r.d * K}" fill="${fill}" transform="translate(${at(r.x)} ${at(r.z)}) rotate(${((r.angle ?? 0) * 180) / Math.PI})"/>`;
const placed = (p, fill) => { const [w, d] = rotatedSize(p.w, p.d, p.rot); return tilted({ x: p.x, z: p.z, w: w - 1.5, d: d - 1.5 }, fill); };
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll("'", '&#39;');
const text = (x, z, s, size = 22, color = '#1c2b20') => `<text x="${at(x)}" y="${at(z)}" font-size="${size}" fill="${color}" stroke="#ffffffcc" stroke-width="5" paint-order="stroke" text-anchor="middle" font-family="Segoe UI, Arial" font-weight="700">${esc(s)}</text>`;
const ticks = Array.from({ length: (CITY_HALF * 2) / GRID + 1 }, (_, i) => -CITY_HALF + i * GRID);
const grid = ticks.map((v) => `<line x1="${at(v)}" y1="0" x2="${at(v)}" y2="${SIZE}" stroke="#00000026"/><line x1="0" y1="${at(v)}" x2="${SIZE}" y2="${at(v)}" stroke="#00000026"/>${text(v, -CITY_HALF - 20, String(v), 15, '#a00')}${text(-CITY_HALF - 20, v, String(v), 15, '#a00')}`).join('');
const middle = ([x0, z0, x1, z1]) => [(x0 + x1) / 2, (z0 + z1) / 2];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="#b4d894"/>
${Object.entries(ZONE).map(([id, c]) => box(ZONES[id].rect, c)).join('')}
${[...Object.values(SITES), ...CENTER_BOXES].map((b) => box(b, '#f4d670')).join('')}
<polyline points="${RIVER.points.map(([x, z]) => `${at(x)},${at(z)}`).join(' ')}" fill="none" stroke="#c8ecb0" stroke-width="${RIVER.half * 2 * K}"/>
<circle cx="${at(0)}" cy="${at(0)}" r="${PLAZA_R * K}" fill="#f6efe0"/>
${plan.roads.map((r) => tilted(r, r.kind === 'kocha' ? '#8e929a' : '#63666d')).join('')}
<circle cx="${at(LAKE.x)}" cy="${at(LAKE.z)}" r="${LAKE.rx * K}" fill="#70c0ea"/>
${plan.plots.filter((p) => p.unit <= 1).map((p) => placed(p, DISTRICT[p.districtId - 1])).join('')}
${plan.commerce.map((c) => placed(c, c.type === 'bilbord' ? '#e02020' : '#205a78')).join('')}
${CIVIC.map((c) => { const r = civicRect(c); return box([r.x - r.hx, r.z - r.hz, r.x + r.hx, r.z + r.hz], '#b5483a'); }).join('')}
${grid}
${plan.districts.map((d) => text(d.label[0], d.label[1], `${d.id}. ${d.nameUz.replace(' mahallasi', '')}`, 26)).join('')}
${['mamuriy', 'biznes', 'savdo', 'dam'].map((id) => { const [x, z] = middle(ZONES[id].rect); return text(x, z + 130, ZONES[id].uz, 24, '#14545f'); }).join('')}
${CIVIC.map((c) => text(c.x, c.z - 34, c.uz, 15, '#7a1f12')).join('')}${text(0, 10, 'Maydon', 22, '#14545f')}
</svg>`;

const out = path.join(root, 'docs/chat');
mkdirSync(out, { recursive: true });
await sharp(Buffer.from(svg)).png({ palette: true }).toFile(path.join(out, 'shahar-reja.png'));
