/** Interfeys skrinshotlari: docs/chat/ui-*.png va ekran-*.png (o'z vaqtinchalik serverida). Ishga tushirish: npm run screens */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { helpers, launch, root, startServers } from './harness.mjs';

const out = process.argv[2] ?? path.join(root, 'docs/chat');
mkdirSync(out, { recursive: true });
const server = await startServers({ base: 8807, site: 5193 });
const browser = await launch();
const { SITE } = server;
const { open, register, raise } = helpers(server);
const PHONE = { width: 390, height: 844 };
const SMALL = { width: 360, height: 640 };
const LOGIN = 'ai_nabiyev7';
const TG = 7_000_007;
const make = async (viewport, { isPhone = true, lang = 'uz', storage } = {}) => {
  const ctx = await browser.newContext({ viewport, isMobile: isPhone, hasTouch: isPhone, deviceScaleFactor: 2, ...(storage ? { storageState: storage } : {}) });
  await ctx.addInitScript((l) => {
    localStorage.setItem('quality', 'mid');
    localStorage.setItem('lang', l);
    localStorage.setItem('intro', '1');
    localStorage.setItem('theme', localStorage.getItem('theme') ?? 'light');
  }, lang);
  return ctx.newPage();
};
const day = (page, v = 0.45) => page.evaluate((f) => { window.__director.dayFraction = f; }, v);
const shot = async (page, name, wait = 900) => {
  await page.waitForTimeout(wait);
  // Hujjatlar papkasi og'irlashmasin: rang jadvalli PNG.
  await sharp(await page.screenshot()).png({ palette: true, quality: 85 }).toFile(path.join(out, `${name}.png`));
};
const panel = (page, p) => page.evaluate((x) => window.__app.setState({ panel: x, trail: [] }), p);
const view = (page, v) => page.evaluate((x) => Object.assign(window.__city, { view: x, flight: null }), v);
/** Uchastkaga qiyalab qaragan kamera. */
const lookAt = (page, id, height = 24) => page.evaluate(([i, h]) => {
  const p = window.__app.getState().plotById.get(i);
  const yaw = (p.rot * Math.PI) / 2;
  Object.assign(window.__city, { view: { x: p.x + Math.sin(yaw) * 6, z: p.z + Math.cos(yaw) * 6, yaw: yaw + 0.35, height: h }, flight: null });
}, [id, height]);
/** Atrofida qo'shnisi ko'p bo'sh hovli. */
const freePlot = (page) => page.evaluate(() => {
  const s = window.__app.getState();
  const taken = (p) => [...s.houses.keys()].filter((id) => { const q = s.plotById.get(id); return Math.hypot(q.x - p.x, q.z - p.z) < 60; }).length;
  return s.plan.plots.filter((p) => p.districtId === 1 && p.type === 'hovli' && p.rot === 0 && !s.houses.has(p.id)).sort((a, b) => taken(b) - taken(a))[0].id;
});
const PANELS = (id) => [
  ['ui-uyim', { kind: 'me' }], ['ui-mening-uyim', { kind: 'plot', id }], ['ui-bezash', { kind: 'yard', id }], ['ui-yozuv', { kind: 'bio', id }], ['ui-menyu', { kind: 'menu' }], ['ui-sozlamalar', { kind: 'settings' }],
  ['ui-xabarlar', { kind: 'notes' }], ['ui-tanga', { kind: 'coins' }], ['ui-xarita', { kind: 'map' }], ['ui-chat', { kind: 'chat' }], ['ui-top', { kind: 'rank' }], ['ui-boshqa-uy', { kind: 'plot', id: 'P0001' }],
  ['ui-mashinalar', { kind: 'cars' }], ['ui-sovga', { kind: 'gifts' }], ['ui-davlat-binosi', { kind: 'civic', id: 'hokimiyat' }], ['ui-kocha', { kind: 'street', id: 3 }], ['ui-yordam', { kind: 'help' }],
];

const guestScreens = async () => {
  const guide = await make(PHONE);
  await guide.addInitScript(() => localStorage.removeItem('intro'));
  await guide.goto(SITE);
  await guide.locator('.guide').waitFor({ timeout: 60_000 });
  await day(guide);
  await shot(guide, 'ui-korsatma', 1500);
  await guide.context().close();
  const guest = await make(PHONE);
  await open(guest);
  await day(guest);
  await view(guest, { x: 0, z: 60, yaw: 0, height: 70 });
  await shot(guest, 'ui-mehmon', 2500);
  const id = await freePlot(guest);
  await lookAt(guest, id, 26);
  await guest.waitForTimeout(1500);
  await panel(guest, { kind: 'plot', id });
  await shot(guest, 'ui-bosh-joy', 1500);
  await guest.getByRole('button', { name: 'Shu yerda bepul uy qurish' }).click();
  await shot(guest, 'ui-kirish');
  await register(guest, TG, LOGIN);
  await guest.getByRole('button', { name: 'Shu yerda bepul uy qurish' }).click();
  await shot(guest, 'ui-uy-qurish');
  await guest.locator('.sheet form button[type=submit]').click();
  await guest.getByRole('heading', { name: /Tabriklaymiz/ }).waitFor({ timeout: 20_000 });
  await shot(guest, 'ui-tabrik');
  await raise(guest, TG, 5, 1250);
  const storage = await guest.context().storageState();
  await guest.context().close();
  return { id, storage };
};

const ownerScreens = async ({ id, storage }) => {
  const me = await make(PHONE, { storage });
  await open(me);
  await me.waitForFunction(() => window.__app.getState().profile?.plots[0]?.tier === 5);
  await day(me);
  await lookAt(me, id, 26);
  await shot(me, 'ui-egasi', 3000);
  // 6e: bepul uyi bor — atrofdagi bo'sh joylarda "+" va "kutyapti" belgilari yo'q.
  await lookAt(me, id, 60);
  await shot(me, 'ui-uyi-bor', 2000);
  await lookAt(me, id, 26);
  for (const [name, p] of PANELS(id)) {
    await panel(me, p);
    await shot(me, name, 1300);
  }
  await panel(me, { kind: 'shop' });
  for (const [tab, name] of [['Hovli', 'ui-dokon'], ['Lyuks', 'ui-dokon-lyuks'], ['Mashina', 'ui-dokon-mashina'], ['To‘plamlar', 'ui-dokon-toplam'], ['Maxsus', 'ui-dokon-maxsus']]) {
    await me.getByRole('tab', { name: tab, exact: true }).click();
    await shot(me, name, 1300);
  }
  await panel(me, null);
  for (const [mode, name] of [['walk', 'ui-piyoda'], ['drive', 'ui-mashina']]) {
    await me.evaluate((m) => window.__setMode(m), mode);
    await shot(me, name, 2200);
  }
  await me.evaluate(() => window.__setMode('city'));
  await me.evaluate(() => window.__app.setState({ theme: 'dark' }));
  await day(me, 0.02);
  await lookAt(me, id, 26);
  await shot(me, 'ui-tun', 2500);
  await panel(me, { kind: 'me' });
  await shot(me, 'ui-tun-uyim');
  await me.context().close();
};

/** Rus tili, kompyuter, yotiq va eng kichik telefon. */
const otherScreens = async ({ id, storage }) => {
  const ru = await make(PHONE, { lang: 'ru' });
  await open(ru);
  await day(ru);
  await lookAt(ru, id, 30);
  await shot(ru, 'ui-ru-mehmon', 2500);
  await panel(ru, { kind: 'shop' });
  await shot(ru, 'ui-ru-dokon', 1300);
  await ru.context().close();
  const desk = await make({ width: 1280, height: 720 }, { isPhone: false, storage });
  await open(desk);
  await day(desk);
  await lookAt(desk, id, 30);
  await panel(desk, { kind: 'shop' });
  await shot(desk, 'ui-kompyuter', 3000);
  await desk.context().close();
  for (const [viewport, suffix] of [[SMALL, ''], [{ width: 640, height: 360 }, '-yotiq']]) {
    const small = await make(viewport, { storage });
    await open(small);
    await day(small);
    await small.waitForFunction(() => window.__app.getState().profile !== null);
    for (const [mode, name] of [['city', 'shahar'], ['walk', 'piyoda'], ['drive', 'mashina']]) {
      if (mode === 'city') await lookAt(small, id, 26);
      await small.evaluate((m) => window.__setMode(m), mode);
      await shot(small, `ekran-${name}${suffix}`, 2300);
    }
    await small.context().close();
  }
};

/** Admin sinov rejimi: 1-level uy, lyuks bezaklarda qulf yo'q ("Olish · Sinov — bepul"). */
const testerScreens = async () => {
  const { token } = await fetch(`${server.API}/dev/admin`, { method: 'POST', body: '{}' }).then((r) => r.json());
  const page = await make(PHONE);
  await page.goto(`${SITE}/?kirish=${token}`);
  await page.waitForFunction(() => window.__app?.getState().profile?.test_mode === true, null, { timeout: 60_000 });
  const plot = await page.evaluate(() => { const s = window.__app.getState(); return s.plan.plots.find((q) => q.districtId === 1 && q.type === 'hovli' && !s.houses.has(q.id)).id; });
  await server.call('my_claim', { p_plot: plot }, await server.tgToken(1));
  await page.reload();
  await page.waitForFunction(() => (window.__app?.getState().profile?.plots.length ?? 0) > 0, null, { timeout: 60_000 });
  await day(page);
  await panel(page, { kind: 'shop' });
  await page.getByRole('tab', { name: 'Lyuks', exact: true }).click();
  await shot(page, 'ui-dokon-sinov', 1300);
  await page.context().close();
};

try {
  const owner = await guestScreens();
  await ownerScreens(owner);
  await otherScreens(owner);
  await testerScreens();
} finally {
  await browser.close();
  await server.stop();
}
