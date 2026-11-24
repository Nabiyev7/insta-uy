"""Do'kon kartochkalari uchun bezaklarning shaffof fonli rasmlari. Ishga tushirish: npm run models (build-models.mjs)."""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from kit_core import rgb  # noqa: E402
from kit_show import build_kit  # noqa: E402

TEX_DIR, OUT_DIR = sys.argv[sys.argv.index('--') + 1:][:2]
SIZE = 192
MARGIN = 1.08
EYE = Vector((0.62, -1.0, 0.72)).normalized()
WALL, ROOF, FRAME = '#f7f2ea', '#d9604a', '#ffffff'
# Butun hovliga tegishli modellarning faqat bir bo'lagi ko'rsatiladi: model chetidan (x0, x1, y0, y1) metr.
CROP = {'fence': (0, 8, 0, 7), 'light_newyear': (0, 9, 0, 6), 'light_': (0, 9, 0, 2.5), 'path_stone': (0, 9, 0, 6)}
GATE = (-3, 3, -2, 2)


def crop_of(name: str, mesh) -> tuple | None:
    if name.startswith('gate'):
        return GATE
    if name == 'light_luxe':  # uy atrofidagi yer chiroqlaridan bittasi
        p = mesh.vertices[0].co
        return (p.x - 0.9, p.x + 0.9, p.y - 0.9, p.y + 0.9)
    box = next((b for key, b in CROP.items() if name.startswith(key)), None)
    if box is None:
        return None
    x, y = min(v.co.x for v in mesh.vertices), min(v.co.y for v in mesh.vertices)
    return (x + box[0] - 0.01, x + box[1], y + box[2] - 0.01, y + box[3])


def setup() -> tuple:
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = scene.render.resolution_y = SIZE
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGBA'
    scene.view_settings.view_transform = 'Standard'
    scene.eevee.taa_render_samples = 16
    world = bpy.data.worlds.new('osmon')
    world.use_nodes = True
    bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (0.9, 0.95, 1.0, 1)
    bg.inputs['Strength'].default_value = 0.75
    scene.world = world
    sun = bpy.data.lights.new('quyosh', 'SUN')
    sun.energy, sun.angle = 2.4, math.radians(6)
    light = bpy.data.objects.new('quyosh', sun)
    light.rotation_euler = (math.radians(42), math.radians(8), math.radians(-30))
    scene.collection.objects.link(light)
    data = bpy.data.cameras.new('kamera')
    data.type, data.clip_start, data.clip_end = 'ORTHO', 0.1, 500
    cam = bpy.data.objects.new('kamera', data)
    cam.rotation_euler = (-EYE).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(cam)
    scene.camera = cam
    return scene, cam


def aim(cam, mesh, name: str) -> None:
    """Kamera modelni (yoki kesilgan bo'lagini) to'liq ramkaga oladi."""
    box = crop_of(name, mesh)
    pts = [v.co for v in mesh.vertices if box is None or (box[0] <= v.co.x <= box[1] and box[2] <= v.co.y <= box[3])] or [v.co for v in mesh.vertices]
    turn = cam.rotation_euler.to_matrix()
    right, up = turn @ Vector((1, 0, 0)), turn @ Vector((0, 1, 0))
    xs, ys = [p.dot(right) for p in pts], [p.dot(up) for p in pts]
    centre = right * ((min(xs) + max(xs)) / 2) + up * ((min(ys) + max(ys)) / 2)
    cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys), 0.3) * MARGIN
    cam.location = centre + EYE * 120


def main() -> None:
    with open(os.path.join(TEX_DIR, 'icons.json'), encoding='utf8') as f:
        names = json.load(f)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene, cam = setup()
    kit = build_kit(TEX_DIR, set(names))
    for name in names:
        o = bpy.data.objects.new(name, kit[name])
        o['wall'], o['roof'], o['frame'] = rgb(WALL), rgb(ROOF), rgb(FRAME)
        scene.collection.objects.link(o)
        aim(cam, kit[name], name)
        scene.render.filepath = os.path.join(OUT_DIR, f'{name}.png')
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(o)
    print(f'KIT ikonkalar: {len(names)}')


main()
