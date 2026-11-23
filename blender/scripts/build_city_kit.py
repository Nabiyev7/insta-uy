"""Ishga tushirish: blender -b --factory-startup -P blender/scripts/build_city_kit.py -- <chiqish.glb>"""
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from kit_houses import all_houses  # noqa: E402
from kit_props import all_props  # noqa: E402


def main():
    out = sys.argv[sys.argv.index('--') + 1]
    bpy.ops.wm.read_factory_settings(use_empty=True)
    total = 0
    for model in all_houses() + all_props():
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
