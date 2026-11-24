"""Ishga tushirish: blender -b --factory-startup -P blender/scripts/build_city_kit.py -- <chiqish.glb>"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from kit_center import all_center  # noqa: E402
from kit_decor import all_decor  # noqa: E402
from kit_houses import all_buildings  # noqa: E402
from kit_levels import all_levels  # noqa: E402
from kit_props import all_props  # noqa: E402

# Hovli 25x34 m, uy markazi orqaga 7.5 m surilgan: 1–6 level o'z o'lchamida, 7–10 esa 1.2 baravar turadi.
LOW_SIZE = {'x': 10.5, 'front': 11.0, 'back': 8.5}
HIGH_SIZE = {'x': 7.7, 'front': 8.0, 'back': 6.7}
LOW_LEVELS = 6
MAX_TRIS = {'level': 2500, 'palace': 3500, 'civic': 2500, 'tower': 1000, 'decor': 300}
TOWERS = ('bank', 'agentlik', 'novostroyka')
PALACE_FROM = 9


def check_level(model, level):
    """Har level hovli uchastkasiga sig'ishi va uchburchak chegarasidan oshmasligi shart (PLAN.md §2.5, §12)."""
    size = LOW_SIZE if level <= LOW_LEVELS else HIGH_SIZE
    pts = [p for poly in model.polys for p in poly[0]]
    if max(abs(p.x) for p in pts) > size['x'] or min(p.y for p in pts) < -size['front'] or max(p.y for p in pts) > size['back']:
        raise ValueError(f'{model.name}: uchastkaga sig\'maydi')
    tris = sum(len(poly[0]) - 2 for poly in model.polys)
    if tris > MAX_TRIS['palace' if level >= PALACE_FROM else 'level']:
        raise ValueError(f'{model.name}: {tris} uchburchak — ko\'p')



def check_center(model):
    limit = MAX_TRIS['tower' if model.name in TOWERS else 'civic']
    tris = sum(len(poly[0]) - 2 for poly in model.polys)
    if tris > limit:
        raise ValueError(f'{model.name}: {tris} uchburchak > {limit}')


def check_decor(model):
    tris = sum(len(poly[0]) - 2 for poly in model.polys)
    if tris > MAX_TRIS['decor']:
        raise ValueError(f'{model.name}: {tris} uchburchak > {MAX_TRIS["decor"]}')


def main():
    out = sys.argv[sys.argv.index('--') + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    total = 0
    levels = all_levels()
    for level, model in enumerate(levels, 1):
        check_level(model, level)
    center = all_center()
    for model in center:
        check_center(model)
    decor = all_decor()
    for model in decor:
        check_decor(model)
    for model in levels + all_buildings() + center + all_props() + decor:
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
