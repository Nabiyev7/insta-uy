/** Chegirma: do'kon kartasidagi foiz va tugashiga qolgan vaqt ("2 kun 5 soat"). Narx serverda hisoblanadi — bu faqat ko'rsatish. Sof hisob. */

export interface SaleInfo { readonly sale?: number; readonly saleEnds?: string; readonly oldCoins?: number }
export interface TimeWords { readonly day: string; readonly hour: string; readonly min: string }

/** Chegirma hozir amalda bo'lsa (sahifa uzoq ochiq turganda tugagani ham hisobga olinadi). */
export const isOnSale = (r: SaleInfo, now = Date.now()): boolean =>
  typeof r.sale === 'number' && r.sale > 0 && typeof r.saleEnds === 'string' && Date.parse(r.saleEnds) > now;

/** Ikki eng katta birlik: "2 kun 5 soat", "3 soat 10 daqiqa", "7 daqiqa" (kamida 1 daqiqa). */
export const timeLeft = (endsIso: string, now: number, w: TimeWords): string => {
  const mins = Math.max(1, Math.floor((Date.parse(endsIso) - now) / 60_000));
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h > 0 ? `${d} ${w.day} ${h} ${w.hour}` : `${d} ${w.day}`;
  if (h > 0) return m > 0 ? `${h} ${w.hour} ${m} ${w.min}` : `${h} ${w.hour}`;
  return `${m} ${w.min}`;
};
