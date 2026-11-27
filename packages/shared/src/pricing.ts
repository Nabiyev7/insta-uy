/** Tanga narxlari va bezak leveli qoidalari (15-qadam, TUZATISH-6). Bazadagi `private.round_price` va `private.level_for_price` bilan bir xil (test tekshiradi). */

/** Yaxlitlash qadami: 1 000 gacha — 10, 1 000–9 999 — 50, 10 000 dan — 500. */
export const priceStep = (n: number): number => (n < 1000 ? 10 : n < 10_000 ? 50 : 500);

/** Qadamga yaxlitlash; o'rtada bo'lsa — juft tomonga (75 → 80, 225 → 220 — egasi jadvali shunday). */
export const roundPrice = (n: number): number => {
  const step = priceStep(n);
  const q = n / step;
  const lo = Math.floor(q);
  const frac = q - lo;
  const k = Math.abs(frac - 0.5) < 1e-9 ? (lo % 2 === 0 ? lo : lo + 1) : Math.round(q);
  return k * step;
};

/** 15-qadam: tanga bilan sotiladigan hamma narx × 0,5. */
export const halfPrice = (n: number): number => roundPrice(n * 0.5);

/** Chegirmali narx (server ham shu qoidada): foiz 5–90. */
export const discountedPrice = (n: number, pct: number): number => roundPrice((n * (100 - pct)) / 100);

/** Yangi tovar uchun level narxdan (yangi narxlarda): ≤ 75 → 1, ≤ 150 → 2, ≤ 325 → 3, ≤ 725 → 4, undan qimmat va hamma `lux_*` → 5. Nik lavhasi — doim 1. */
export const levelForPrice = (coins: number, id = ''): number => {
  if (id === 'sign_nick') return 1;
  if (id.startsWith('lux_')) return 5;
  return coins <= 75 ? 1 : coins <= 150 ? 2 : coins <= 325 ? 3 : coins <= 725 ? 4 : 5;
};

/** To'plam narxi: tarkibidagi narxlar yig'indisidan 20% chegirma. */
export const SET_DISCOUNT_PCT = 20;
