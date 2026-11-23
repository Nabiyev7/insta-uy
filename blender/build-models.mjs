/** Blender → GLB → meshopt. Blender yo'li: BLENDER env yoki standart o'rnatish joyi. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NodeIO } from '@gltf-transform/core';
import { EXTMeshoptCompression, KHRMeshQuantization } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const root = fileURLToPath(new URL('..', import.meta.url));
const findBlender = () => {
  if (process.env.BLENDER) return process.env.BLENDER;
  const base = 'C:/Program Files/Blender Foundation';
  const dir = existsSync(base) ? readdirSync(base).sort().at(-1) : undefined;
  return dir ? path.join(base, dir, 'blender.exe') : 'blender';
};

mkdirSync(path.join(root, 'assets'), { recursive: true });
mkdirSync(path.join(root, 'apps/web/public/assets'), { recursive: true });
const raw = path.join(root, 'assets/city-kit.glb');
const out = path.join(root, 'apps/web/public/assets/city-kit.glb');

const log = execFileSync(findBlender(), ['-b', '--factory-startup', '-P', path.join(root, 'blender/scripts/build_city_kit.py'), '--', raw], { encoding: 'utf8' });
process.stdout.write(`${log.split('\n').filter((l) => /^KIT|Error|Traceback|File "/.test(l)).join('\n')}\n`);

await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization]).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(raw);
for (const mesh of doc.getRoot().listMeshes()) {
  const semantics = mesh.listPrimitives()[0]?.listSemantics() ?? [];
  for (const need of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'TEXCOORD_1', 'COLOR_0']) {
    if (!semantics.includes(need)) throw new Error(`${mesh.getName()}: ${need} yo'q (${semantics})`);
  }
}
await doc.transform(dedup(), weld(), prune({ keepAttributes: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium', quantizeTexcoord: 14, quantizeColor: 8, quantizePosition: 14 }));
await io.write(out, doc);
process.stdout.write(`${out}: ${(statSync(out).size / 1024).toFixed(0)} KB\n`);
