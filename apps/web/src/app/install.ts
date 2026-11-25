/** "Bosh ekranga qo'shish": tashriflar soni, rad etilgan vaqt va Android tizim oynasi (beforeinstallprompt). */
import { isInstallDue } from '../logic/growth.ts';

interface InstallEvent extends Event { prompt(): Promise<void>; readonly userChoice: Promise<{ readonly outcome: string }> }
let deferred: InstallEvent | null = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e as InstallEvent; });

const num = (key: string): number | null => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
};
const save = (key: string, value: number): void => {
  try { localStorage.setItem(key, String(value)); } catch { /* maxfiy rejim */ }
};

/** Sessiyada bir marta tashrif hisoblanadi. */
export const countVisit = (): void => {
  try {
    if (sessionStorage.getItem('visited') === '1') return;
    sessionStorage.setItem('visited', '1');
  } catch {
    return;
  }
  save('visits', (num('visits') ?? 0) + 1);
};
export const hasInstallPrompt = (): boolean => deferred !== null;
export const installDue = (): boolean => !navigator.webdriver && isInstallDue(num('visits') ?? 0, num('installNo'), Date.now(), matchMedia('(display-mode: standalone)').matches);
export const dismissInstall = (): void => save('installNo', Date.now());
export const promptInstall = async (): Promise<void> => {
  if (!deferred) return;
  await deferred.prompt();
  const { outcome } = await deferred.userChoice;
  deferred = null;
  if (outcome !== 'accepted') dismissInstall();
};
