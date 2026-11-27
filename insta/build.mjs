/** Instagram postlari (16-qadam): `npm run insta` — dev server (`DEMO=1`) ishlab turishi kerak (faqat lokal; ishlab chiqarish bazasiga tegilmaydi).
 *  1) docs/insta/matnlar.md → postlar va slaydlar; 2) kadrlar — saytning Foto rejimi grafikasi (A — oltin soat + maket, D — tun), 4:5, 2× supersampling;
 *  3) shablon (insta/shablon.mjs) → docs/insta/postlar/NN/K.png (1080 × 1350); 4) docs/insta/korinish.png — 3×3 to'r.
 *  Kadrlar docs/insta/kadrlar/ da keshlanadi; `--yangi` — qaytadan olinadi. */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { gridHtml, slideHtml } from './shablon.mjs';

const root = path.join(import.meta.dirname, '..');
const SITE = process.env.SITE_URL ?? 'http://localhost:5173';
const OUT = path.join(root, 'docs/insta');
const FRAMES = path.join(OUT, 'kadrlar');
const isFresh = process.argv.includes('--yangi');
/** Qurilish effekti kadri: kamera uchib bo'lgach, uy ko'tarilayotgan payt. */
const BUILD_SHOT_MS = 4200;

// ---------- 1. matnlar.md ----------
export const parsePosts = (md) => md.split(/^## /m).slice(1).map((block) => {
  const [head, ...lines] = block.split('\n');
  const [id, title] = head.split(' · ').map((x) => x.trim());
  const field = (key) => {
    const i = lines.findIndex((l) => l.startsWith(`${key}:`));
    if (i < 0) return '';
    const rest = [lines[i].slice(key.length + 1).trim()];
    for (let j = i + 1; j < lines.length && lines[j].trim() && !/^[a-z]+:|^- /.test(lines[j]); j++) rest.push(lines[j].trim());
    return rest.join('\n');
  };
  const slides = lines.filter((l) => l.startsWith('- tur:')).map((l) => Object.fromEntries(l.slice(2).split(' | ').map((kv) => { const k = kv.indexOf(':'); return [kv.slice(0, k).trim(), kv.slice(k + 1).trim()]; })));
  return { id, title, izoh: field('izoh'), xeshteglar: field('xeshteglar'), slides };
});

// ---------- 2. Kadrlar ----------
/** Umumiy niklar (halollik: haqiqiy odam nikiga o'xshamasin). */
const NICKS = ['sening_niking', 'dostim_uyi', 'qoshnim', 'yangi_qoshni', 'mahalla_guli', 'bogbon', 'tinch_hovli', 'kun_nuri', 'oltin_uy', 'yashil_hovli', 'shirin_uy', 'kichik_bog',
  'gul_hovli', 'ona_uyi', 'yorug_uy', 'shahar_ahli', 'quyoshli_uy', 'mehmon_uyi', 'ishkom_uy', 'baxtli_uy', 'chinor_tagi', 'anor_bog'];
const A = (tilt = 'high') => ({ light: 'golden', tilt });
const D = (tilt = 'mid') => ({ light: 'night', tilt });
/** Kadr: kamera (spot — eng zich mahalla, house — undagi uy, free — yaqin bo'sh joy) va Foto sozlamasi; `prep` — uy holati;
 *  `nicks`: 'all' — hamma uyda nik, 'one' — faqat asosiy uyda, sukut — yo'q (sarlavha ortida chalkashlik bo'lmasin). */
const KADRLAR = {
  'tepa-oltin': { at: () => ({ x: 0, z: 140, yaw: 0.6, height: 230 }), photo: A('mid') },
  'tepa-oltin-2': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 0.3, height: 140 }), photo: A('mid') },
  'tepa-oltin-3': { at: () => ({ x: 0, z: 0, yaw: 2.2, height: 300 }), photo: A('low') },
  'mahalla-nik': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 0.7, height: 34 }), photo: A(), nicks: 'all' },
  'mahalla-nik-2': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 2.4, height: 38 }), photo: A(), nicks: 'all' },
  'mahalla-oltin': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 1.2, height: 55 }), photo: A() },
  'mahalla-oltin-2': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: -0.6, height: 70 }), photo: A('mid') },
  'bosh-joy': { at: (c) => ({ x: c.free.x, z: c.free.z, yaw: 0.7, height: 30 }), photo: { ...A('mid'), showMarks: true } },
  qurilish: { build: true, photo: A('mid'), nicks: 'one' },
  'nik-yaqin': { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 0.7, height: 16 }), photo: A(), prep: { nick: 'sening_niking', label: 'plain', tier: 4 }, nicks: 'one' },
  'nik-oltin': { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 1.1, height: 12 }), photo: A('mid'), prep: { nick: 'sening_niking', label: 'gold', tier: 5 }, nicks: 'one' },
  ...Object.fromEntries([1, 2, 3, 4, 5].map((tier) => [`level-${tier}`, { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 0.75, height: 22 }), photo: A('mid'), prep: { tier, decor: [], nick: 'sening_niking', label: 'plain' }, nicks: 'one' }])),
  bezaksiz: { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 0.75, height: 24 }), photo: A('mid'), prep: { tier: 5, decor: [], nick: 'sening_niking' }, nicks: 'one' },
  bezakli: { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 0.75, height: 24 }), photo: A('mid'), prep: { tier: 5, decor: 'full', nick: 'sening_niking' }, nicks: 'one' },
  'bezakli-tepa': { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 0.4, height: 42 }), photo: A(), prep: { tier: 5, decor: 'full', nick: 'sening_niking' }, nicks: 'one' },
  'bezakli-2': { at: (c) => ({ x: c.house.x, z: c.house.z, yaw: 2.1, height: 28 }), photo: A(), prep: { tier: 5, decor: 'full', nick: 'sening_niking' }, nicks: 'one' },
  'tun-1': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 0.7, height: 90 }), photo: D() },
  'tun-2': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 2.2, height: 30 }), photo: D() },
  'tun-3': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: -0.8, height: 45 }), photo: D('high') },
  'tun-4': { at: () => ({ x: 0, z: 140, yaw: 0.6, height: 170 }), photo: D() },
  'fon-oltin': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 0.9, height: 60 }), photo: A() },
  'fon-oltin-2': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 2.6, height: 80 }), photo: A('mid') },
  'fon-tun': { at: (c) => ({ x: c.spot.x, z: c.spot.z, yaw: 0.9, height: 60 }), photo: D() },
};
/** Bezakli hovli (5-level): yangi bezaklar — mashina, basseyn, stol, daraxtlar, gulzor, kuchuk, chiroqlar. */
const FULL_DECOR = ['garaj_oldi:avto_sedan', 'old_hovli_chap:dam_basseyn', 'old_hovli_ong:dam_stol', 'burchak_1:daraxt_olma', 'burchak_2:daraxt_gilos', 'burchak_3:daraxt_palma', 'darvoza_yoni:gul_zor', 'p1:pet_dog', 'lamps:light_lamps', 'path:path_stone', 'fence:fence_ornate', 'gate:gate_carved'];

const shootFrames = async (browser, ids) => {
  const ctx = await browser.newContext({ viewport: { width: 540, height: 675 }, deviceScaleFactor: 2 });
  await ctx.addInitScript(() => { localStorage.setItem('quality', 'high'); localStorage.setItem('intro', '1'); localStorage.setItem('theme', 'dark'); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('sahifa xatosi:', e.message));
  await page.goto(SITE);
  await page.locator('.topbar').waitFor({ timeout: 60_000 });
  await page.waitForFunction(() => window.__app.getState().houses.size > 50, null, { timeout: 60_000 });
  // Niklar umumiy so'zlarga almashtiriladi (faqat shu brauzerda).
  await page.evaluate((nicks) => {
    const s = window.__app.getState();
    window.__named = new Map([...s.houses].map(([id, h], i) => [id, { ...h, nick: nicks[i % nicks.length], badge: null, hearts: 0 }]));
  }, NICKS);
  const c = await page.evaluate(() => {
    const s = window.__app.getState();
    const pts = [...s.houses.keys()].map((id) => s.plotById.get(id)).filter((p) => p && p.type === 'hovli');
    let best = pts[0];
    let n = 0;
    for (const a of pts) { const k = pts.filter((b) => Math.hypot(a.x - b.x, a.z - b.z) < 45).length; if (k > n) { n = k; best = a; } }
    const open = new Set(s.boot.districts.filter((d) => d.open).map((d) => d.id));
    const free = s.plan.plots.filter((p) => p.type === 'hovli' && open.has(p.districtId) && !s.houses.has(p.id)).sort((a, b) => Math.hypot(a.x - best.x, a.z - best.z) - Math.hypot(b.x - best.x, b.z - best.z))[0];
    return { spot: { x: best.x, z: best.z }, house: { id: best.id, x: best.x, z: best.z }, free: { id: free.id, x: free.x, z: free.z } };
  });
  const base = await page.evaluate((id) => window.__named.get(id), c.house.id);
  for (const id of ids) {
    const k = KADRLAR[id];
    if (!k) throw new Error(`Noma'lum kadr: ${id}`);
    const prep = k.prep ? { ...base, ...k.prep, decor: k.prep.decor === 'full' ? FULL_DECOR : k.prep.decor ?? base.decor } : base;
    await page.evaluate(([hid, h, mode]) => {
      const m = new Map([...window.__named].map(([id, x]) => [id, mode === 'all' ? x : { ...x, nick: null }]));
      m.set(hid, mode === 'none' ? { ...h, nick: null } : h);
      window.__app.setState({ houses: m });
    }, [c.house.id, prep, k.nicks ?? 'none']);
    await page.evaluate((p) => window.__app.setState({ isPhoto: true, panel: null, photo: { format: '4:5', hasLink: false, hasSign: false, showMarks: false, ...p } }), k.photo);
    if (k.build) {
      // Qurilish effekti: bo'sh joyga "sening_niking" uyi ko'tarilmoqda (kamera o'zi uchib boradi).
      await page.evaluate(([plot, h]) => { const s = window.__app.getState(); const m = new Map(s.houses); m.set(plot, { ...h, plot, nick: 'sening_niking', tier: 1, decor: [] }); window.__app.setState({ houses: m }); window.__build(plot, 1); }, [c.free.id, base]);
      await page.waitForTimeout(BUILD_SHOT_MS);
    } else {
      await page.evaluate((v) => { window.__setMode('city'); Object.assign(window.__city, { view: v, flight: null }); }, k.at(c));
      await page.waitForTimeout(2600);
    }
    const b64 = await page.evaluate(async () => {
      const canvas = window.__shot();
      const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.94));
      const a = new Uint8Array(await blob.arrayBuffer());
      let s = '';
      for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000));
      return btoa(s);
    });
    writeFileSync(path.join(FRAMES, `${id}.jpg`), Buffer.from(b64, 'base64'));
    console.log(`kadr: ${id}`);
    // Qurilish tugashini kutadi (keyingi kadrlarga xalaqit bermasin).
    if (k.build) await page.waitForFunction(() => window.__app.getState().building === null, null, { timeout: 15_000 }).catch(() => undefined);
  }
  await ctx.close();
};

// ---------- 3. Slaydlar ----------
const renderSlides = async (browser, posts) => {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const tmp = path.join(tmpdir(), 'cityland-insta');
  mkdirSync(tmp, { recursive: true });
  const decor = (id) => pathToFileURL(path.join(root, 'apps/web/public/assets/decor', `${id}.webp`)).href;
  const gifts = [{ n: '1', label: 'do\'st — gulzor', img: decor('gul_zor') }, { n: '3', label: 'do\'st — besedka', img: decor('dam_besedka') }, { n: '10', label: 'do\'st — sedan', img: decor('avto_sedan') }];
  const firsts = [];
  for (const post of posts) {
    const dir = path.join(OUT, 'postlar', post.id);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    for (const [i, s] of post.slides.entries()) {
      const html = slideHtml(s, { index: i, count: post.slides.length, frame: pathToFileURL(path.join(FRAMES, `${s.kadr}.jpg`)).href, isLast: i === post.slides.length - 1, gifts });
      const file = path.join(tmp, 'slayd.html');
      writeFileSync(file, html);
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.images].every((im) => im.complete));
      const out = path.join(dir, `${i + 1}.png`);
      await page.screenshot({ path: out });
      if (i === 0) firsts.push(out);
    }
    console.log(`post ${post.id}: ${post.slides.length} slayd`);
  }
  // 3×3 to'r: 9 postning bosh slaydlari.
  const grid = path.join(tmp, 'tor.html');
  writeFileSync(grid, gridHtml(firsts.map((f) => pathToFileURL(f).href)));
  await page.setViewportSize({ width: 1080, height: 1352 });
  await page.goto(pathToFileURL(grid).href);
  await page.waitForFunction(() => [...document.images].every((im) => im.complete));
  await page.screenshot({ path: path.join(OUT, 'korinish.png'), fullPage: true });
  await ctx.close();
};

// ---------- 4. Izohlar (post matni) ----------
const writeCaptions = (posts) => {
  const lines = ['# Postlar izohlari (avtomatik — `matnlar.md` dan; `npm run insta`)', ''];
  for (const p of posts) lines.push(`## ${p.id} · ${p.title}`, '', p.izoh, '', p.xeshteglar, '', `Slaydlar: \`postlar/${p.id}/1.png\` … \`${p.slides.length}.png\``, '');
  writeFileSync(path.join(OUT, 'izohlar.md'), lines.join('\n'));
};

const main = async () => {
  const posts = parsePosts(readFileSync(path.join(OUT, 'matnlar.md'), 'utf8'));
  mkdirSync(FRAMES, { recursive: true });
  const need = [...new Set(posts.flatMap((p) => p.slides.map((s) => s.kadr)))];
  const missing = need.filter((id) => isFresh || !existsSync(path.join(FRAMES, `${id}.jpg`)));
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    if (missing.length) await shootFrames(browser, missing);
    await renderSlides(browser, posts);
  } finally {
    await browser.close();
  }
  writeCaptions(posts);
  console.log(`Tayyor: ${posts.length} post, ${posts.reduce((n, p) => n + p.slides.length, 0)} slayd → docs/insta/postlar, docs/insta/korinish.png`);
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) await main();
