/** Umumiy foydalanuvchi amallari: borish, ulashish, stories rasmi. */
import { frontOf, plotAddress, type Plot } from '../../../../packages/shared/src/index.ts';
import { padHeight } from '../../../../packages/shared/src/city.ts';
import { director, player, snapshotters, teleport } from './runtime.ts';
import { getApp, openPanel } from './store.ts';

export const goToPlot = (id: string): void => {
  const p = getApp().plotById.get(id);
  if (!p) return;
  const f = frontOf(p, p.type === 'kvartira' ? 14 : 4);
  teleport(f.x, f.z, f.yaw + Math.PI);
  openPanel({ kind: 'plot', id });
};

export const addressOf = (p: Plot): string => {
  const s = getApp();
  return plotAddress(p, s.boot?.streets[String(p.streetId)], s.lang);
};

/** Eng yaqin bo'sh bepul uy. */
export const nearestFree = (): string | null => {
  const s = getApp();
  const open = new Set(s.boot?.districts.filter((d) => d.open).map((d) => d.id));
  const free = s.plan?.plots.filter((p) => open.has(p.districtId) && (p.type === 'hovli' || p.type === 'kvartira') && !s.houses.has(p.id)) ?? [];
  return free.reduce<{ id: string; d: number } | null>((best, p) => {
    const d = Math.hypot(p.x - player.x, p.z - player.z);
    return best && best.d <= d ? best : { id: p.id, d };
  }, null)?.id ?? null;
};

export const inviteUrl = (ref: string): string => `${location.origin}/?ref=${ref}`;
export const houseUrl = (id: string): string => `${import.meta.env.VITE_API_URL || location.origin}/uy/${id}`;

export const copyText = async (text: string): Promise<void> => {
  await navigator.clipboard.writeText(text);
};

const toBlob = (c: HTMLCanvasElement, type: string): Promise<Blob> =>
  new Promise((resolve, reject) => { c.toBlob((b) => (b ? resolve(b) : reject(new Error('unknown'))), type, 0.92); });

export const shareImage = async (canvas: HTMLCanvasElement, name: string): Promise<void> => {
  const blob = await toBlob(canvas, 'image/jpeg');
  const file = new File([blob], `${name}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
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
    g.fillStyle = 'rgba(253,246,230,0.75)';
    g.font = '500 40px "Golos Text Variable", system-ui';
    g.fillText(location.host, 90, 1780, 900);
    return c;
  } finally {
    director.pose = null;
    director.dayFraction = null;
  }
};
