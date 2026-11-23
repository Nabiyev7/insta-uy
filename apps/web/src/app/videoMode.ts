/** Video rejimi (?video=1): Playwright kadrma-kadr so'raydi, sahifa 1080x1920 JPEG qaytaradi (PLAN §7). */
import { frameAt } from '../logic/cameraPath.ts';
import { addressOf } from './actions.ts';
import { director, snapshotters } from './runtime.ts';
import { getApp, setApp } from './store.ts';

export interface VideoStyle { readonly title?: string; readonly text?: string; readonly seconds?: number; readonly time?: number }
export interface VideoApi {
  setup(plots: readonly string[], style: VideoStyle): Promise<{ total: number }>;
  frame(seconds: number): Promise<string>;
}
declare global {
  interface Window { __video?: VideoApi }
}

const W = 1080;
const H = 1920;
const PER_HOUSE = 4;
const raf = (): Promise<void> => new Promise((r) => { requestAnimationFrame(() => r()); });

const fitFont = (g: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number): void => {
  let s = size;
  do {
    g.font = `${weight} ${s}px "Unbounded Variable", system-ui`;
    s -= 3;
  } while (s > 24 && g.measureText(text).width > max);
};

const drawText = (g: CanvasRenderingContext2D, seconds: number, total: number, style: VideoStyle, nick: string, address: string, alpha: number): void => {
  g.textAlign = 'center';
  if (style.title && seconds < 2.4) {
    g.globalAlpha = Math.min(1, seconds / 0.4) * Math.min(1, (2.4 - seconds) / 0.4);
    g.fillStyle = '#14545f';
    g.fillRect(0, 300, W, 190);
    g.fillStyle = '#f3cd68';
    g.fillRect(0, 490, W, 10);
    g.fillStyle = '#fdf6e6';
    fitFont(g, style.title, 700, 76, W - 120);
    g.fillText(style.title, W / 2, 420);
  }
  if (alpha > 0 && nick) {
    g.globalAlpha = alpha;
    const y = 1440 + (1 - alpha) * 40;
    const shade = g.createLinearGradient(0, 1250, 0, H);
    shade.addColorStop(0, 'rgba(10,45,52,0)');
    shade.addColorStop(1, 'rgba(10,45,52,0.92)');
    g.fillStyle = shade;
    g.fillRect(0, 1250, W, H - 1250);
    g.fillStyle = '#fdf6e6';
    fitFont(g, `@${nick}`, 700, 96, W - 120);
    g.fillText(`@${nick}`, W / 2, y);
    g.font = '500 46px "Golos Text Variable", system-ui';
    g.fillStyle = '#f3cd68';
    g.fillText(address, W / 2, y + 80, W - 100);
  }
  if (style.text) {
    g.globalAlpha = 0.95;
    g.fillStyle = '#fdf6e6';
    g.font = '600 42px "Golos Text Variable", system-ui';
    g.fillText(style.text, W / 2, 1700, W - 120);
  }
  g.globalAlpha = Math.min(1, (total - seconds) / 0.4);
  if (g.globalAlpha < 1) {
    const a = 1 - g.globalAlpha;
    g.globalAlpha = a;
    g.fillStyle = '#14545f';
    g.fillRect(0, 0, W, H);
  }
  g.globalAlpha = 1;
};

export const exposeVideoApi = (): void => {
  setApp({ isPhoto: true, quality: 'high', isAutoQuality: false });
  document.documentElement.classList.add('video');
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext('2d');
  let plots: string[] = [];
  let style: VideoStyle = {};
  let total = PER_HOUSE;
  window.__video = {
    setup: async (ids, next) => {
      plots = ids.filter((id) => getApp().plotById.has(id));
      if (plots.length === 0) throw new Error("uy yo'q");
      style = next;
      total = next.seconds ?? plots.length * PER_HOUSE;
      director.dayFraction = next.time ?? 0.42;
      await document.fonts.load('700 80px "Unbounded Variable"');
      const list = plots.map((id) => getApp().plotById.get(id)!);
      director.pose = frameAt(list, 0, total).pose;
      for (let i = 0; i < 40; i++) await raf(); // bo'laklar va teksturalar tayyor bo'lsin
      return { total };
    },
    frame: async (seconds) => {
      const list = plots.map((id) => getApp().plotById.get(id)!);
      const f = frameAt(list, seconds, total);
      director.pose = f.pose;
      await raf();
      await raf();
      const shot = snapshotters.capture?.();
      const plot = list[f.index];
      if (!shot || !g || !plot) throw new Error('kadr olinmadi');
      const k = Math.max(W / shot.width, H / shot.height);
      g.drawImage(shot, (W - shot.width * k) / 2, (H - shot.height * k) / 2, shot.width * k, shot.height * k);
      drawText(g, seconds, total, style, getApp().houses.get(plot.id)?.nick ?? '', addressOf(plot), f.labelAlpha);
      return canvas.toDataURL('image/jpeg', 0.93).slice(23);
    },
  };
};
