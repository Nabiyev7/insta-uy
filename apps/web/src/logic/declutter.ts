/** Ekrandagi yorliqlar ustma-ust tushmasin: ustuvorlik tartibida (o'z uyim, keyin yaqinrog'i) qabul qilinadi,
 *  avval qabul qilingan biror yorliq bilan kesishsa — yashiriladi. Oddiy ekran-to'r (grid) — yuzlab yorliq ham arzon. Sof hisob. */

export interface ScreenBox {
  /** Markaz (px) va o'lcham (px). */
  readonly cx: number; readonly cy: number; readonly w: number; readonly h: number;
}

/** Yorliqlarning eng kichik o'lchami (px, matn balandligi ~10 px) va eng kattasi (yaqinda, ~18 px matn). */
export const LABEL_MIN_PX = 17;
export const LABEL_MAX_PX = 30;
/** Shu masofagacha (m) yorliq eng katta. */
export const LABEL_NEAR_M = 60;

/** Kamera masofasiga qarab yorliq balandligi (px): yaqinda katta, uzoqlashgan sari kichrayadi, lekin `min` dan kichik emas. */
export const labelPx = (distance: number, max = LABEL_MAX_PX, min = LABEL_MIN_PX): number =>
  Math.max(min, Math.min(max, (max * LABEL_NEAR_M) / Math.max(1, distance)));

const CELL = 64;
const GAP = 2;
const overlaps = (a: ScreenBox, b: ScreenBox): boolean =>
  Math.abs(a.cx - b.cx) * 2 < a.w + b.w + GAP && Math.abs(a.cy - b.cy) * 2 < a.h + b.h + GAP;

/** `boxes` — ustuvorlik tartibida; `null` — ekranda emas (kamera orqasida). Qaytaradi: qabul qilinganlarning indekslari (ko'pi bilan `max`). */
export const declutter = (boxes: readonly (ScreenBox | null)[], max: number, screen: { readonly width: number; readonly height: number }): number[] => {
  const grid = new Map<number, ScreenBox[]>();
  const keep: number[] = [];
  const cols = Math.ceil(screen.width / CELL) + 2;
  const cellsOf = (b: ScreenBox): number[] => {
    const x0 = Math.floor((b.cx - b.w / 2) / CELL);
    const x1 = Math.floor((b.cx + b.w / 2) / CELL);
    const y0 = Math.floor((b.cy - b.h / 2) / CELL);
    const y1 = Math.floor((b.cy + b.h / 2) / CELL);
    const out: number[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(y * cols + x);
    return out;
  };
  for (const [i, b] of boxes.entries()) {
    if (keep.length >= max) break;
    if (!b || b.cx + b.w / 2 < 0 || b.cx - b.w / 2 > screen.width || b.cy + b.h / 2 < 0 || b.cy - b.h / 2 > screen.height) continue;
    const cells = cellsOf(b);
    if (cells.some((c) => grid.get(c)?.some((o) => overlaps(o, b)))) continue;
    keep.push(i);
    for (const c of cells) {
      const list = grid.get(c);
      if (list) list.push(b);
      else grid.set(c, [b]);
    }
  }
  return keep;
};
