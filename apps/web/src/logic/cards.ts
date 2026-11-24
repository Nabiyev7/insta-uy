/** Ekran pastida qaysi karta turishi: bittadan, ustuvorlik bo'yicha. Sof hisob. */
export type CardKind = 'cheer' | 'daily' | 'treasure' | 'fresh' | 'free';
export interface CardInput {
  readonly isCity: boolean; readonly isGuest: boolean; readonly hasHouse: boolean;
  readonly isDailyReady: boolean; readonly hasCheer: boolean; readonly hasTreasure: boolean; readonly hasFresh: boolean;
}
/** Sozlama bazadan kelmaguncha kunlik bonus hisobi. */
export const DAILY = { base: 10, step: 5 } as const;

/** Piyoda va mashinada joy kam: faqat hozirgina bo'lgan voqea (tabrik, xazina) chiqadi. */
export const nextCard = (c: CardInput): CardKind | null => {
  if (c.isGuest) return c.isCity ? 'free' : null;
  if (c.hasCheer) return 'cheer';
  if (!c.isCity) return c.hasTreasure ? 'treasure' : null;
  if (!c.hasHouse) return 'free';
  if (c.isDailyReady) return 'daily';
  if (c.hasTreasure) return 'treasure';
  return c.hasFresh ? 'fresh' : null;
};
