/** Umumiy foydalanuvchi amallari: borish, ulashish, stories rasmi. */
import { ANCHORS, isFreeType, plotAddress, type Plot } from '../../../../packages/shared/src/index.ts';
import { padHeight } from '../../../../packages/shared/src/city.ts';
import { viewOfPlot } from '../logic/cityCamera.ts';
import { BUILD_MS, FLIGHT_MS } from '../logic/construction.ts';
import type { CatalogRow } from '../logic/decorCatalog.ts';
import { flyTo, goToHouse, setMode } from './modes.ts';
import { cancelBuildTimer, city, director, here, houseShot, session, snapshotters } from './runtime.ts';
import { startOrbit } from '../logic/houseOrbit.ts';
import { myRefLink, sharePhoto } from './share.ts';
import { getApp, openRoot, setApp } from './store.ts';
import { haptic } from './telegram.ts';

export const goToPlot = (id: string, isInstant = false): void => {
  const p = getApp().plotById.get(id);
  if (!p) return;
  goToHouse(p, isInstant);
  openRoot({ kind: 'plot', id });
};

export const addressOf = (p: Plot): string => {
  const s = getApp();
  return plotAddress(p, s.boot?.streets[String(p.streetId)], s.lang);
};

/** Eng yaqin bo'sh bepul uy. */
export const nearestFree = (): string | null => {
  const s = getApp();
  const at = here();
  const open = new Set(s.boot?.districts.filter((d) => d.open).map((d) => d.id));
  const free = s.plan?.plots.filter((p) => open.has(p.districtId) && isFreeType(p.type) && !s.houses.has(p.id)) ?? [];
  return free.reduce<{ id: string; d: number } | null>((best, p) => {
    const d = Math.hypot(p.x - at.x, p.z - at.z);
    return best && best.d <= d ? best : { id: p.id, d };
  }, null)?.id ?? null;
};

/** Bezakni o'z hovlisidagi mos (imkon bo'lsa bo'sh) nuqtada ko'rsatadi; kamera uyga uchadi. */
export const tryDecor = (row: CatalogRow): boolean => {
  const s = getApp();
  const mine = (s.profile?.plots ?? []).filter((p) => s.plotById.get(p.plot)?.type !== 'kvartira').sort((a, b) => b.tier - a.tier)[0];
  if (!mine) return false;
  const fit = ANCHORS.filter((a) => row.spots.includes(a.kind));
  const open = fit.filter((a) => a.minLevel <= mine.tier);
  const anchor = open.find((a) => !mine.places[a.id]) ?? open[0] ?? fit[0];
  const plot = s.plotById.get(mine.plot);
  if (!anchor || !plot) return false;
  setApp({ preview: { plot: mine.plot, decor: row.id, anchor: anchor.id }, panel: null });
  if (session.mode !== 'city') setMode('city');
  flyTo(viewOfPlot(plot));
  return true;
};

/** Uy olindi: kamera uchastkaga uchadi, uy quriladi, so'ng "Tabriklaymiz". */
/** Uy qurilishi (yangi uy yoki kuchaytirilgan level): kamera uchadi, uy ko'tariladi, so'ng tabrik. */
export const startConstruction = (p: Plot, tier?: number): void => {
  cancelBuildTimer();
  setApp({ building: { plot: p.id, at: performance.now() + FLIGHT_MS }, panel: null });
  if (session.mode !== 'city') setMode('city');
  flyTo(viewOfPlot(p));
  session.buildTimer = setTimeout(() => {
    session.buildTimer = null;
    buzz(BUZZ.big);
    const cheer = { plot: p.id, tier: tier ?? 1, isBuilt: !tier };
    // Shu orada boshqa oyna ochilgan bo'lsa — uni yopmaymiz: tabrik pastki kartada kutadi.
    if (getApp().panel !== null) { setApp({ building: null, cheer }); return; }
    const panel = tier ? { kind: 'congrats', id: p.id, tier } as const : { kind: 'congrats', id: p.id } as const;
    setApp({ building: null, cheer, panel, trail: [] });
  }, FLIGHT_MS + BUILD_MS);
};

/** Telefon tebranishi (qo'llasa). */
export const BUZZ = { tap: 10, coin: [12, 40, 12], big: [20, 60, 20, 60, 40] } as const;
export const buzz = (pattern: number | readonly number[]): void => {
  // Telegram ichida — uning tebranish API si.
  if (haptic(typeof pattern === 'number' ? 'light' : pattern.length > 3 ? 'heavy' : 'medium')) return;
  // Foydalanuvchi hali tegmagan bo'lsa brauzer rad etadi va konsolga yozadi.
  if (navigator.userActivation?.hasBeenActive) navigator.vibrate?.(typeof pattern === 'number' ? pattern : [...pattern]);
};

/** Uyni yaqindan ko'rish: piyoda eshik oldida. */
export const walkTo = (id: string): void => {
  const p = getApp().plotById.get(id);
  if (!p) return;
  openRoot(null);
  if (session.mode !== 'walk') setMode('walk');
  goToHouse(p);
};


export const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

const wait = (ms: number): Promise<void> => new Promise((r) => { setTimeout(r, ms); });
const cover = (g: CanvasRenderingContext2D, src: HTMLCanvasElement, x: number, y: number, w: number, h: number): void => {
  const k = Math.max(w / src.width, h / src.height);
  const sw = w / k;
  const sh = h / k;
  g.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, x, y, w, h);
};

/** "Mening uyim" — 1080x1920 stories rasmi (PLAN v1). */
export const storyImage = async (plot: Plot, nick: string): Promise<HTMLCanvasElement> => {
  const yaw = (plot.rot * Math.PI) / 2 + 0.45;
  const r = Math.max(plot.w, plot.d) * 1.05;
  const y = padHeight(plot);
  director.pose = { x: plot.x + Math.sin(yaw) * r, y: y + r * 0.38, z: plot.z + Math.cos(yaw) * r, tx: plot.x, ty: y + (plot.type === 'kvartira' ? 10 : 2.5), tz: plot.z };
  director.dayFraction = 0.72;
  try {
    await wait(700);
    const shot = snapshotters.capture?.();
    if (!shot) throw new Error('unknown');
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = 1920;
    const g = c.getContext('2d');
    if (!g) throw new Error('unknown');
    await document.fonts.load('700 80px "Unbounded Variable"').catch(() => undefined);
    cover(g, shot, 0, 0, 1080, 1920);
    const shade = g.createLinearGradient(0, 1150, 0, 1920);
    shade.addColorStop(0, 'rgba(10,45,52,0)');
    shade.addColorStop(0.55, 'rgba(10,45,52,0.9)');
    shade.addColorStop(1, 'rgba(10,45,52,1)');
    g.fillStyle = shade;
    g.fillRect(0, 1150, 1080, 770);
    g.fillStyle = '#f3cd68';
    g.fillRect(90, 1440, 130, 12);
    g.font = '600 44px "Golos Text Variable", system-ui';
    g.fillText(getApp().lang === 'uz' ? 'Mening uyim' : 'Мой дом', 90, 1410);
    g.fillStyle = '#fdf6e6';
    let size = 92;
    do {
      g.font = `700 ${size}px "Unbounded Variable", system-ui`;
      size -= 4;
    } while (size > 36 && g.measureText(`@${nick}`).width > 900);
    g.fillText(`@${nick}`, 90, 1560);
    g.font = '500 46px "Golos Text Variable", system-ui';
    g.fillText(addressOf(plot), 90, 1640, 900);
    // Logo (yuqorida) va shaxsiy taklif havolasi (pastda; Instagram "Havola" stikeri uchun nusxalanadi).
    g.fillStyle = 'rgba(10,45,52,0.72)';
    g.beginPath();
    g.roundRect(70, 90, 520, 110, 55);
    g.fill();
    g.fillStyle = '#f3cd68';
    g.font = '700 54px "Unbounded Variable", system-ui';
    g.fillText('CityLand UZ', 112, 165, 450);
    const ref = getApp().profile?.ref;
    g.fillStyle = 'rgba(253,246,230,0.8)';
    g.font = '500 40px "Golos Text Variable", system-ui';
    g.fillText(ref ? myRefLink().replace(/^https?:\/\//, '') : location.host, 90, 1780, 900);
    return c;
  } finally {
    director.pose = null;
    director.dayFraction = null;
  }
};

/** Stories rasmi: oyna bir lahza yashirinadi, rasm olinadi, so'ng oyna (orqaga yo'li bilan) qaytadi. */
export const shareStory = async (id: string, nick: string): Promise<void> => {
  const { panel, trail, plotById } = getApp();
  const plot = plotById.get(id);
  if (!plot) return;
  setApp({ panel: null });
  const canvas = await storyImage(plot, nick).finally(() => setApp({ panel, trail }));
  // Havola nusxalanadi va ko'rsatma chiqadi (share.ts), rasm muhitga qarab ulashiladi.
  await sharePhoto(canvas);
};

/** "Uyimni suratga olish": Foto rejimi uy rejimida — kamera o'z uyiga yuqori-yon burchakdan, faqat uy atrofida aylanadi. */
export const openHousePhoto = (plotId: string): void => {
  const p = getApp().plotById.get(plotId);
  if (!p) return;
  if (session.mode !== 'city') setMode('city');
  city.flight = null;
  houseShot.orbit = startOrbit(p, padHeight(p));
  setApp({ isPhoto: true, isClean: false, panel: null, trail: [] });
};
