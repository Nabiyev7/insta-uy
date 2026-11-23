"""Ishga tushirish: blender -b --factory-startup -P blender/scripts/build_city_kit.py -- <chiqish.glb>"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from kit_houses import all_buildings  # noqa: E402
from kit_levels import all_levels  # noqa: E402
from kit_props import all_props  # noqa: E402

MAX_SIZE = {'x': 7.7, 'front': 8.0, 'back': 6.7}


def check_level(model):
    """Har level eng kichik uchastkaga sig'ishi shart (PLAN.md §2.5)."""
    pts = [p for poly in model.polys for p in poly[0]]
    if max(abs(p.x) for p in pts) > MAX_SIZE['x'] or min(p.y for p in pts) < -MAX_SIZE['front'] or max(p.y for p in pts) > MAX_SIZE['back']:
        raise ValueError(f'{model.name}: uchastkaga sig\'maydi')



def main():
    out = sys.argv[sys.argv.index('--') + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    total = 0
    levels = all_levels()
    for model in levels:
        check_level(model)
    for model in levels + all_buildings() + all_props():
        obj = model.build()
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
        total += tris
        print(f'KIT {model.name}: {tris}')
    print(f'KIT jami: {total}')
    bpy.ops.export_scene.gltf(
        filepath=out, export_format='GLB', export_yup=True, export_normals=True, export_texcoords=True,
        export_vertex_color='ACTIVE', export_materials='EXPORT', export_animations=False, export_apply=False,
    )


main()
