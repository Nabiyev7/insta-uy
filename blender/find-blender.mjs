/** Blender yo'li: BLENDER env yoki standart o'rnatish joyi. */
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const BASE = 'C:/Program Files/Blender Foundation';

export const findBlender = () => {
  if (process.env.BLENDER) return process.env.BLENDER;
  const dir = existsSync(BASE) ? readdirSync(BASE).sort().at(-1) : undefined;
  return dir ? path.join(BASE, dir, 'blender.exe') : 'blender';
};
