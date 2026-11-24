/** 16 qatlamli tekstura tasmasi — yorug', deyarli tekis ranglar (rasmsiz, protsedural SVG). Natija: apps/web/public/assets/tex.webp */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

export const SIZE = 128;
const VIEW = 256;
const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = path.join(root, 'apps/web/public/assets');

const flat = (color) => `<rect width="256" height="256" fill="${color}"/>`;
const lines = (n, color, isVertical, w = 5) => Array.from({ length: n }, (_, i) => (isVertical ? `<rect x="${(i * VIEW) / n}" width="${w}" height="256" fill="${color}"/>` : `<rect y="${(i * VIEW) / n}" width="256" height="${w}" fill="${color}"/>`)).join('');
const GLASS = '#9fd6ee';
const SHINE = '#b8e2f4';

const pane = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${GLASS}"/><polygon points="${x},${y + h * 0.55} ${x + w * 0.55},${y} ${x + w * 0.8},${y} ${x},${y + h * 0.8}" fill="${SHINE}"/>`;
const windowSvg = `${flat('#ffffff')}${pane(20, 16, 100, 106)}${pane(136, 16, 100, 106)}${pane(20, 134, 100, 100)}${pane(136, 134, 100, 100)}<rect y="246" width="256" height="10" fill="#d6d3cd"/>`;
const facadeSvg = `${flat('#ffffff')}<rect y="240" width="256" height="16" fill="#dcdad6"/>${[34, 144].map((x) => `<rect x="${x - 8}" y="48" width="94" height="146" fill="#f4f1ec"/>${pane(x, 56, 36, 130)}${pane(x + 42, 56, 36, 130)}<rect x="${x - 10}" y="190" width="98" height="10" fill="#d6d3cd"/>`).join('')}`;
const glassSvg = `${flat('#8fcbe6')}${['#8fcbe6', '#9bd3ea', '#86c4e2', '#a3d8ee'].map((c, i) => `<rect x="${i * 64}" width="64" height="256" fill="${c}"/>`).join('')}<polygon points="0,200 160,0 220,0 0,256" fill="#ffffff" opacity="0.14"/>${lines(4, '#ffffff', true, 5)}<rect width="256" height="14" fill="#ffffff"/>`;
const brickRow = (y, shift) => Array.from({ length: 5 }, (_, i) => `<rect x="${i * 64 - shift}" y="${y}" width="60" height="28" fill="${['#cf8468', '#c97b60', '#d48d70'][(i + y / 32) % 3 | 0]}"/>`).join('');
const brickSvg = `${flat('#e3b7a2')}${Array.from({ length: 8 }, (_, i) => brickRow(i * 32, i % 2 ? 32 : 0)).join('')}`;
const stoneSvg = `${flat('#ffffff')}${lines(4, '#e4e1dc', false, 4)}${lines(4, '#e4e1dc', true, 4)}`;
const star = (cx, cy, r, fill) => `<g transform="translate(${cx} ${cy})" fill="${fill}"><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}"/><rect x="${-r}" y="${-r}" width="${2 * r}" height="${2 * r}" transform="rotate(45)"/></g>`;
const naqshSvg = `${flat('#3fa3b5')}${[[0, 0], [256, 0], [0, 256], [256, 256], [128, 128]].map(([x, y]) => star(x, y, 60, '#fff4dc') + star(x, y, 46, '#2f86a8') + star(x, y, 24, '#f2c14e')).join('')}`;
const carvedSvg = `${flat('#c58a52')}<g fill="none" stroke="#a36c3a" stroke-width="8"><rect x="14" y="14" width="228" height="228"/>${[0, 1, 2, 3].map((i) => `<circle cx="${64 + (i % 2) * 128}" cy="${64 + Math.floor(i / 2) * 128}" r="38"/>`).join('')}</g>`;

/** Tartib kit_core.py dagi qatlamlar bilan bir xil. */
const LAYERS = [
  flat('#ffffff'), // 0 tekis
  flat('#ffffff'), // 1 suvoq
  brickSvg, // 2 g'isht
  `${flat('#ffffff')}${lines(4, '#e6e6e6', false, 8)}`, // 3 tom
  `${flat('#ffffff')}${lines(6, '#ececec', true, 4)}`, // 4 yog'och
  flat('#ffffff'), // 5 asfalt
  flat('#ffffff'), // 6 maysa
  flat('#ffffff'), // 7 beton
  flat('#ffffff'), // 8 barg
  windowSvg, // 9 deraza
  naqshSvg, // 10 naqsh
  carvedSvg, // 11 o'yma yog'och
  facadeSvg, // 12 ko'p qavatli fasad
  glassSvg, // 13 shisha fasad
  flat('#8a5a36'), // 14 tuproq
  stoneSvg, // 15 tosh plitka
];

const render = (body) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${SIZE}" height="${SIZE}">${body}</svg>`)).flatten({ background: '#ffffff' }).removeAlpha().raw().toBuffer();

const strips = await Promise.all(LAYERS.map(render));
await mkdir(outDir, { recursive: true });
await sharp(Buffer.concat(strips), { raw: { width: SIZE, height: SIZE * LAYERS.length, channels: 3 } }).webp({ lossless: true }).toFile(path.join(outDir, 'tex.webp'));
