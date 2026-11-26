/** Narx yulduzda (serverdagi `private.stars_of` bilan bir xil). Sof hisob. */
export const starsFromUzs = (uzs: number, rate = 200): number => Math.max(1, Math.ceil(uzs / Math.max(1, rate)));
