import type { BadgeId } from '../../../../packages/shared/src/index.ts';
import type { IconName } from './icons.tsx';

/** Nishon belgilari (oynada va uy tepasidagi yorliqda bir xil). */
export const BADGE_ICONS: Readonly<Record<BadgeId, IconName>> = { asoschi: 'bank', homiy: 'diamond', investor: 'trend', hokim: 'crown', hovli: 'flower', rais: 'star', elchi10: 'telegram', elchi50: 'telegram', elchi100: 'telegram' };
