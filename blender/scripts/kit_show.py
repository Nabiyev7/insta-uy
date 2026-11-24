"""Modellarni Blender ko'rinishida (teksturali material bilan) yasash: ko'rgazma va do'kon rasm-ikonkalari uchun."""
import os

import bpy

from kit_center import all_center
from kit_city import city_models
from kit_decor import all_decor
from kit_houses import all_buildings
from kit_levels import all_levels
from kit_lux import lux_decor
from kit_props import all_props
from kit_yard import yard_decor

LAYERS = ['tekis', 'suvoq', 'gisht', 'tom', 'yogoch', 'asfalt', 'maysa', 'beton', 'barg', 'deraza', 'naqsh', 'oyma', 'fasad', 'shisha', 'tuproq', 'tosh']
TINT = {1: 'wall', 2: 'roof'}


def principled(m):
    m.use_nodes = True
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def material(layer, mask, tex_dir):
    """Har (tekstura, rang turi) uchun bitta material: tekstura x AO rangi x uyning tanlangan rangi."""
    tint = 'frame' if LAYERS[layer] == 'deraza' and mask == 0 else TINT.get(mask)
    name = LAYERS[layer] + (f'_{tint}' if tint else '')
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    bsdf = principled(m)
    nt = m.node_tree
    bsdf.inputs['Roughness'].default_value = 0.35 if LAYERS[layer] in ('deraza', 'shisha') else 0.9
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(tex_dir, f't{layer}.png'), check_existing=True)
    tex.image.pack()
    uv = nt.nodes.new('ShaderNodeUVMap')
    uv.uv_map = 'uv0'
    nt.links.new(uv.outputs['UV'], tex.inputs['Vector'])
    out = tex.outputs['Color']
    factors = [('GEOMETRY', 'Col')] + ([('OBJECT', tint)] if tint else [])
    for kind, attr in factors:
        a = nt.nodes.new('ShaderNodeAttribute')
        a.attribute_type, a.attribute_name = kind, attr
        mul = nt.nodes.new('ShaderNodeVectorMath')
        mul.operation = 'MULTIPLY'
        nt.links.new(out, mul.inputs[0])
        nt.links.new(a.outputs['Vector' if kind == 'OBJECT' else 'Color'], mul.inputs[1])
        out = mul.outputs['Vector']
    nt.links.new(out, bsdf.inputs['Base Color'])
    return m


def assign(mesh, keys, tex_dir):
    """keys[i] = i-poligon (layer, mask)."""
    mesh.materials.clear()
    slots = {}
    for key in keys:
        if key not in slots:
            slots[key] = len(slots)
            mesh.materials.append(material(*key, tex_dir))
    mesh.polygons.foreach_set('material_index', [slots[k] for k in keys])
    mesh.update()


def build_kit(tex_dir, only=None):
    kit = {}
    for model in all_levels() + all_buildings() + all_center() + city_models() + all_props() + all_decor() + yard_decor() + lux_decor():
        if only is not None and model.name not in only:
            continue
        obj = model.build()
        assign(obj.data, [(p[2], round(p[3] * 4)) for p in model.polys], tex_dir)
        kit[model.name] = obj.data
        bpy.data.objects.remove(obj)
    return kit
