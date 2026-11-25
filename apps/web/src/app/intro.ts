/** Kirish animatsiyasi (sessiyada bir marta): kamera baland nuqtadan aylanib, markaz, o'z uyi yoki ?uy= uyiga tushadi. Ekranga tegilsa — darhol to'xtaydi. */
import { viewOfPlot } from '../logic/cityCamera.ts';
import { INTRO_MS, introStart } from '../logic/growth.ts';
import { city } from './runtime.ts';
import { getApp } from './store.ts';

const KEY = 'flyIn';

export const playIntro = (plotId: string | null): void => {
  try {
    if (sessionStorage.getItem(KEY) === '1') return;
    sessionStorage.setItem(KEY, '1');
  } catch {
    return;
  }
  // Avtomatik sinovlarda (e2e) kamera joyida qolsin.
  if (navigator.webdriver) return;
  const { plotById, profile, quality } = getApp();
  const home = plotId ?? profile?.plots.find((p) => p.status === 'owned')?.plot ?? null;
  const plot = home ? plotById.get(home) : undefined;
  const to = plot ? viewOfPlot(plot) : city.view;
  const from = introStart(to);
  city.view = from;
  city.flight = { from, to, startedAt: performance.now(), ms: quality === 'low' ? INTRO_MS.low : INTRO_MS.normal };
  const stop = (): void => {
    if (city.flight?.to === to) { city.view = to; city.flight = null; }
    removeEventListener('pointerdown', stop, true);
  };
  addEventListener('pointerdown', stop, true);
};
