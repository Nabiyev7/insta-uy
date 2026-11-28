/** O'sish funksiyalari uchun sof hisoblar: taklif shkalasi, "Bosh ekranga qo'shish" kartasi, kirish animatsiyasi. */
import type { CityView } from './cityCamera.ts';

export interface ReferralStep { readonly at: number; readonly decor: string; readonly isDone: boolean }
/** Sozlama `referral_gifts` ({"1":"gul_zor","3":"dam_besedka","10":"avto_sedan"}) → shkala va keyingi sovg'agacha nechta qoldi. */
export const referralSteps = (invited: number, gifts: Readonly<Record<string, string>>): { readonly steps: readonly ReferralStep[]; readonly left: number | null } => {
  const steps = Object.entries(gifts).map(([k, decor]) => ({ at: Number(k), decor, isDone: invited >= Number(k) })).filter((s) => Number.isInteger(s.at) && s.at > 0).sort((a, b) => a.at - b.at);
  const next = steps.find((s) => !s.isDone);
  return { steps, left: next ? next.at - invited : null };
};

export interface CoinStep { readonly at: number; readonly coins: number; readonly isDone: boolean }
/** 19-qadam: bosqich bonuslari (sozlama `coins.referralSteps`: {"3":2000,"10":6000,"25":15000,"50":40000}) → shkala va keyingi bosqichgacha nechta qoldi. */
export const coinSteps = (invited: number, steps: Readonly<Record<string, number>>): { readonly steps: readonly CoinStep[]; readonly left: number | null } => {
  const list = Object.entries(steps).map(([k, coins]) => ({ at: Number(k), coins: Number(coins), isDone: invited >= Number(k) }))
    .filter((s) => Number.isInteger(s.at) && s.at > 0 && s.coins > 0).sort((a, b) => a.at - b.at);
  const next = list.find((s) => !s.isDone);
  return { steps: list, left: next ? next.at - invited : null };
};

export const INSTALL_PAUSE_MS = 14 * 24 * 3600 * 1000;
/** Ikkinchi kirishdan (birinchisida emas); rad etilsa 14 kun chiqmaydi; allaqachon o'rnatilgan bo'lsa — yo'q. */
export const isInstallDue = (visits: number, dismissedAt: number | null, now: number, isStandalone: boolean): boolean =>
  !isStandalone && visits >= 2 && (dismissedAt === null || now - dismissedAt >= INSTALL_PAUSE_MS);

export type InstallWay = 'prompt' | 'ios' | 'instagram' | 'none';
/** Qaysi ko'rsatma: Android (tizim oynasi), iPhone (2 qadam), Instagram ichki brauzeri ("Chrome'da ochish"). */
export const installWay = (userAgent: string, hasPrompt: boolean): InstallWay => {
  if (/Instagram/i.test(userAgent)) return 'instagram';
  if (hasPrompt) return 'prompt';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  return 'none';
};

export const INTRO_MS = { low: 2000, normal: 3500 } as const;
/** Kirish animatsiyasi: baland nuqtadan aylanib, maqsadga tushadi. */
export const introStart = (to: CityView): CityView => ({ ...to, yaw: to.yaw - 1.3, height: Math.min(to.height * 3 + 260, 520) });
