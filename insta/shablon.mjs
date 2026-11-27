/** Instagram slayd shabloni (16-qadam): 1080 × 1350, sayt shrifti (Golos Text), bitta oltin urg'u, pastda kichik logo va nuqtalar.
 *  Bitta fayl — hamma slayd turlari shu yerda. Kadr (3D shahar, Foto rejimi grafikasi) fon sifatida qo'yiladi. */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.join(import.meta.dirname, '..');
const font = (f) => pathToFileURL(path.join(root, 'node_modules/@fontsource-variable/golos-text/files', f)).href;
/** Saytdagi Tabler ikonalari (apps/web/src/ui/icons.tsx) — slaydda emoji o'rniga. */
const ICON_SRC = readFileSync(path.join(root, 'apps/web/src/ui/icons.tsx'), 'utf8');
export const icon = (name, size = 64, color = 'currentColor', width = 2) => {
  const d = new RegExp(`\\b${name}: '([^']+)'`).exec(ICON_SRC)?.[1] ?? '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
};
export const GOLD = '#f2c14e';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** `*so'z*` → oltin urg'u. */
const accent = (s) => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const CSS = `
@font-face { font-family: 'Golos'; src: url('${font('golos-text-latin-wght-normal.woff2')}') format('woff2'); font-weight: 400 900; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
@font-face { font-family: 'Golos'; src: url('${font('golos-text-latin-ext-wght-normal.woff2')}') format('woff2'); font-weight: 400 900; unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1350px; overflow: hidden; background: #10161e; }
body { position: relative; font-family: 'Golos', system-ui, sans-serif; color: #fff; -webkit-font-smoothing: antialiased; }
.bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.shade-top { position: absolute; inset: 0 0 auto 0; height: 620px; background: linear-gradient(rgba(6,10,16,0.5), rgba(6,10,16,0.18) 55%, rgba(6,10,16,0)); }
.shade-bottom { position: absolute; inset: auto 0 0 0; height: 300px; background: linear-gradient(rgba(6,10,16,0), rgba(6,10,16,0.42)); }
.shade-full { position: absolute; inset: 0; background: rgba(8,12,18,0.58); backdrop-filter: blur(6px); }
.text { position: absolute; left: 76px; right: 76px; top: 112px; }
h1 { font-size: 104px; line-height: 1.02; font-weight: 800; letter-spacing: -0.035em; text-wrap: balance; text-shadow: 0 4px 30px rgba(0,0,0,0.25); }
h1 em { font-style: normal; color: ${GOLD}; }
p.sub { margin-top: 26px; font-size: 40px; font-weight: 500; opacity: 0.94; text-shadow: 0 2px 18px rgba(0,0,0,0.35); }
.logo { position: absolute; left: 76px; bottom: 74px; display: flex; align-items: center; gap: 16px; font-size: 36px; font-weight: 800; }
.logo i { width: 34px; height: 34px; border-radius: 9px; background: ${GOLD}; display: inline-block; }
.dots { position: absolute; right: 76px; bottom: 86px; display: flex; gap: 14px; }
.dots b { width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,0.45); }
.dots b.on { background: #fff; }
.cta { position: absolute; left: 76px; right: 76px; bottom: 170px; display: flex; align-items: center; gap: 18px; padding: 28px 34px; border-radius: 28px; background: ${GOLD}; color: #1b1406; font-size: 42px; font-weight: 800; }
.cta svg { flex: none; }
.phone { position: absolute; left: 50%; top: 455px; transform: translateX(-50%); width: 560px; height: 760px; border-radius: 64px; background: #0e1621; border: 12px solid #1e2732; box-shadow: 0 40px 90px rgba(0,0,0,0.55); overflow: hidden; }
.phone header { height: 110px; padding: 34px 30px 0; display: flex; align-items: center; gap: 18px; background: #17212b; font-size: 30px; font-weight: 700; }
.phone header i { width: 58px; height: 58px; border-radius: 50%; background: ${GOLD}; display: grid; place-items: center; color: #1b1406; font-style: normal; font-size: 26px; font-weight: 900; }
.phone header small { display: block; font-size: 22px; font-weight: 500; opacity: 0.6; }
.chat { padding: 26px 22px; display: flex; flex-direction: column; gap: 16px; }
.msg { max-width: 82%; padding: 18px 22px; border-radius: 26px; font-size: 26px; line-height: 1.32; }
.msg.bot { background: #182533; border-bottom-left-radius: 8px; }
.msg.me { align-self: flex-end; background: #2b5278; border-bottom-right-radius: 8px; }
.buttons { display: grid; gap: 10px; max-width: 82%; }
.buttons span { display: block; text-align: center; padding: 16px; border-radius: 18px; background: #24384c; font-size: 25px; font-weight: 700; }
.big { position: absolute; left: 76px; right: 76px; top: 520px; display: flex; align-items: center; gap: 34px; }
.big .num { font-size: 210px; font-weight: 900; letter-spacing: -0.05em; color: ${GOLD}; line-height: 1; }
.big svg { flex: none; }
.big-sub { position: absolute; left: 76px; right: 76px; top: 790px; font-size: 44px; font-weight: 600; opacity: 0.92; }
.scale { position: absolute; left: 60px; right: 60px; top: 520px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.scale div { padding: 26px 18px 30px; border-radius: 32px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.18); text-align: center; }
.scale img { width: 220px; height: 220px; object-fit: contain; }
.scale b { display: block; font-size: 64px; font-weight: 900; color: ${GOLD}; }
.scale small { display: block; margin-top: 6px; font-size: 30px; font-weight: 600; }
.scale-line { position: absolute; left: 160px; right: 160px; top: 980px; height: 6px; border-radius: 3px; background: linear-gradient(90deg, ${GOLD}, rgba(242,193,78,0.3)); }
`;

const chats = {
  start: `<div class="msg me">/start</div>
    <div class="msg bot">Xush kelibsiz! CityLand UZ — Instagram obunachilari shahri.<br><br>Instagram nikingizni Instagram'dagidek to'liq va aniq yozing.</div>`,
  nik: `<div class="msg me">sening_niking</div>
    <div class="msg bot">Shu to'g'rimi? instagram.com/sening_niking</div>
    <div class="buttons"><span>Ha, to'g'ri</span><span>Qayta yozish</span></div>
    <div class="msg bot">Tayyor! Akkaunt ochildi. Pastdagi «Shahar» tugmasini bosing.</div>`,
};

/** Bitta slayd HTML. `s` — matnlar.md qatori, `frame` — kadr fayli (file:// URL), `icons` — sovg'a rasmlari (file:// URL). */
export const slideHtml = (s, { index, count, frame, isLast, gifts }) => {
  const dots = `<div class="dots">${Array.from({ length: count }, (_, i) => `<b class="${i === index ? 'on' : ''}"></b>`).join('')}</div>`;
  const logo = '<div class="logo"><i></i>CityLand UZ</div>';
  const dim = ['telefon', 'raqam', 'shkala'].includes(s.tur);
  const text = `<div class="text"><h1>${accent(s.sarlavha)}</h1>${s.matn && s.tur !== 'raqam' ? `<p class="sub">${accent(s.matn)}</p>` : ''}</div>`;
  let body = '';
  if (s.tur === 'telefon') body = `<div class="phone"><header><i>CL</i><div>CityLand UZ<small>bot</small></div></header><div class="chat">${chats[s.ekran] ?? ''}</div></div>`;
  if (s.tur === 'raqam') body = `<div class="big"><span class="num">${esc(s.raqam)}</span>${icon('coin', 150, GOLD, 1.7)}</div><p class="big-sub">${accent(s.matn)}</p>`;
  if (s.tur === 'shkala') body = `<div class="scale-line"></div><div class="scale">${gifts.map((g) => `<div><img src="${g.img}"><b>${g.n}</b><small>${g.label}</small></div>`).join('')}</div>`;
  const cta = isLast ? `<div class="cta">${icon('home', 52, '#1b1406', 2.4)}Uyingni ol → bio'dagi havola</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
    <img class="bg" src="${frame}">
    ${dim ? '<div class="shade-full"></div>' : '<div class="shade-top"></div><div class="shade-bottom"></div>'}
    ${text}${body}${cta}${logo}${dots}
  </body></html>`;
};

/** 3×3 to'r (egasi uchun oldindan ko'rish): 9 postning bosh slaydlari. */
export const gridHtml = (images) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; } body { width: 1080px; background: #fff; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; padding: 0; }
  img { width: 100%; aspect-ratio: 4 / 5; object-fit: cover; display: block; }
</style></head><body>${images.map((src) => `<img src="${src}">`).join('')}</body></html>`;
