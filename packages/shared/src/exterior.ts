/** Uyning tashqi ko'rinishi: devor materiali, deraza ramkasi va eshik rangi. Indekslar bazada saqlanadi. */
export const WALL_MATERIALS = [
  { key: 'suvoq', uz: 'Suvoq', ru: 'Штукатурка', layer: 1 },
  { key: 'gisht', uz: "G'isht", ru: 'Кирпич', layer: 2 },
  { key: 'tosh', uz: 'Tosh', ru: 'Камень', layer: 15 },
  { key: 'yogoch', uz: "Yog'och", ru: 'Дерево', layer: 4 },
] as const;
export const FRAME_COLORS = ['#ffffff', '#c9a27a', '#6b4423', '#3d4a52', '#2f6f72', '#2f5f9f', '#8a3b2e', '#3f7d4e'] as const;
export const DOOR_COLORS = ['#ffffff', '#b9825a', '#7a4f2a', '#3f2a1c', '#2f6f72', '#2f5f9f', '#9c2b34', '#3f7d4e'] as const;
