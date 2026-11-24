/** Telefon va brauzerning "orqaga" tugmasi: avval ochiq oyna (yoki tasdiq so'rovi, foto, tozalangan ekran) yopiladi, hech narsa ochiq bo'lmasa sahifadan chiqiladi. */
import { backPanel, getApp, setApp, useApp } from './store.ts';

const MARK = 'cityland';
const hasOpen = (): boolean => {
  const s = getApp();
  return s.ask !== null || s.panel !== null || s.isPhoto || s.isClean;
};
const closeOne = (): void => {
  const s = getApp();
  if (s.ask) {
    setApp({ ask: null });
    s.ask.resolve(false);
  } else if (s.isClean) setApp({ isClean: false });
  else if (s.isPhoto) setApp({ isPhoto: false });
  else backPanel();
};
const isMarked = (): boolean => (history.state as { mark?: string } | null)?.mark === MARK;
const mark = (): void => { if (hasOpen() && !isMarked()) history.pushState({ mark: MARK }, ''); };

export const attachHistory = (): (() => void) => {
  const pop = (): void => {
    if (isMarked()) return;
    if (!hasOpen()) { history.back(); return; }
    closeOne();
    mark();
  };
  const off = useApp.subscribe(mark);
  addEventListener('popstate', pop);
  return () => {
    off();
    removeEventListener('popstate', pop);
  };
};
