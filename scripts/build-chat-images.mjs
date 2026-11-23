/** CHAT-UCHUN.md uchun markazning koordinatali chizmasi: docs/chat/markaz-reja.png */
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PLAZA_HALF, decodePlan, rotatedSize } from '../packages/shared/src/index.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const plan = decodePlan(JSON.parse(readFileSync(path.join(root, 'packages/shared/data/masterplan.json'), 'utf8')));
const HALF = 280;
const SCALE = 3;
const GRID = 25;
const SIZE = HALF * 2 * SCALE;
const COLORS = { hovli: '#d8b98a', villa: '#b98ad8', qasr: '#e0b030', kvartira: '#999', dokon: '#2f9f7f', ofis: '#2f5f9f', bilbord: '#c0352b' };

const at = (v) => (v + HALF) * SCALE;
const rect = (x, z, w, d, fill, extra = '') => `<rect x="${at(x - w / 2)}" y="${at(z - d / 2)}" width="${w * SCALE}" height="${d * SCALE}" fill="${fill}" ${extra}/>`;
const text = (x, z, s, size = 20, color = '#222') => `<text x="${at(x)}" y="${at(z)}" font-size="${size}" fill="${color}" text-anchor="middle" dominant-baseline="middle" font-family="Segoe UI, Arial" font-weight="600">${s}</text>`;
const isNear = (o) => Math.abs(o.x) < HALF + 20 && Math.abs(o.z) < HALF + 20;

const ticks = Array.from({ length: Math.floor((HALF * 2) / GRID) + 1 }, (_, i) => -275 + i * GRID).filter((v) => v <= 275);
const grid = ticks.map((v) => {
  const isBold = v % 125 === 0;
  const style = `stroke="${isBold ? '#00000055' : '#00000018'}" stroke-width="${isBold ? 2 : 1}"`;
  return `<line x1="${at(v)}" y1="0" x2="${at(v)}" y2="${SIZE}" ${style}/><line x1="0" y1="${at(v)}" x2="${SIZE}" y2="${at(v)}" ${style}/>`
    + (v % 50 === 0 ? text(v, -274, v, 17, '#a00') + text(-270, v, v, 17, '#a00') : '');
}).join('');

const plaza = [
  ['Favvora', 0, 0, 22, 22], ['Haykal', 0, -55, 5, 5], ['Choyxona', -40, 62, 14, 18], ['Maktab', 40, -82, 40, 18], ['Bozor', 37, 54, 34, 22], ['Parking', -38, -76, 20, 18],
].map(([label, x, z, w, d]) => rect(x, z, w, d, '#e58f3f') + text(x, z - d / 2 - 5, label, 17)).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="100%" height="100%" fill="#cfe0b4"/>
${plan.roads.filter((r) => isNear({ x: Math.max(Math.abs(r.x) - r.w / 2, 0), z: Math.max(Math.abs(r.z) - r.d / 2, 0) })).map((r) => rect(r.x, r.z, r.w, r.d, r.kind === 'prospekt' ? '#7d7d84' : '#a5a5aa')).join('')}
${plan.plots.filter(isNear).map((p) => { const [w, d] = rotatedSize(p.w, p.d, p.rot); return rect(p.x, p.z, w - 1, d - 1, COLORS[p.type]); }).join('')}
${rect(0, 0, PLAZA_HALF * 2, PLAZA_HALF * 2, '#f3ead6', 'stroke="#a00" stroke-width="4"')}
${plaza}
${plan.commerce.filter(isNear).map((c) => { const [w, d] = rotatedSize(c.w, c.d, c.rot); return rect(c.x, c.z, w, d, COLORS[c.type]) + (c.type === 'ofis' ? text(c.x, c.z, c.id, 18, '#fff') : ''); }).join('')}
${grid}
${text(0, -115, 'SHIMOL (-z)', 22, '#a00')}${text(0, 115, 'JANUB (+z)', 22, '#a00')}${text(-98, -10, "G'ARB (-x)", 20, '#a00')}${text(98, -10, 'SHARQ (+x)', 20, '#a00')}
</svg>`;

const out = path.join(root, 'docs/chat');
mkdirSync(out, { recursive: true });
await sharp(Buffer.from(svg)).png({ palette: true }).toFile(path.join(out, 'markaz-reja.png'));
