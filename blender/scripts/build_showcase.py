"""Ko'rgazma fayli. Ishga tushirish: npm run showcase (build-showcase.mjs ma'lumot va teksturalarni tayyorlaydi)."""
import json
import math
import os
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.dont_write_bytecode = True

from kit_core import rgb  # noqa: E402
from kit_center import all_center  # noqa: E402
from kit_decor import all_decor  # noqa: E402
from kit_houses import all_buildings  # noqa: E402
from kit_levels import all_levels  # noqa: E402
from kit_props import all_props  # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:]
DIR, OUT = ARGS[0], ARGS[1]
LAYERS = ['tekis', 'suvoq', 'gisht', 'tom', 'yogoch', 'asfalt', 'maysa', 'beton', 'barg', 'deraza', 'naqsh', 'oyma', 'fasad', 'shisha', 'tuproq', 'tosh']
TINT = {1: 'wall', 2: 'roof'}
ORDER_STEP = 0.03


def principled(m):
    m.use_nodes = True
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def material(layer, mask):
    """Har (tekstura, rang turi) uchun bitta material: tekstura x AO rangi x uyning tanlangan rangi."""
    tint = TINT.get(mask)
    name = LAYERS[layer] + (f'_{tint}' if tint else '')
    m = bpy.data.materials.get(name)
    if m:
        return m
    m = bpy.data.materials.new(name)
    bsdf = principled(m)
    nt = m.node_tree
    bsdf.inputs['Roughness'].default_value = 0.35 if LAYERS[layer] in ('deraza', 'shisha') else 0.9
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(os.path.join(DIR, f't{layer}.png'), check_existing=True)
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


def assign(mesh, keys):
    """keys[i] = i-poligon (layer, mask)."""
    mesh.materials.clear()
    slots = {}
    for key in keys:
        if key not in slots:
            slots[key] = len(slots)
            mesh.materials.append(material(*key))
    mesh.polygons.foreach_set('material_index', [slots[k] for k in keys])
    mesh.update()


def build_kit():
    kit = {}
    for model in all_levels() + all_buildings() + all_center() + all_props() + all_decor():
        obj = model.build()
        assign(obj.data, [(p[2], round(p[3] * 4)) for p in model.polys])
        kit[model.name] = obj.data
        bpy.data.objects.remove(obj)
    return kit


def to_blender(x, y, z):
    return (x, -z, y)


def collection(scene, name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c


def add_items(col, items, kit):
    for model, x, y, z, yaw, sx, sy, sz, wall, roof in items:
        o = bpy.data.objects.new(model, kit[model])
        o.location = to_blender(x, y, z)
        o.rotation_euler.z = yaw
        o.scale = (sx, sz, sy)
        o['wall'], o['roof'] = rgb(wall), rgb(roof)
        col.objects.link(o)


def overlaps(values, centre, radius):
    return max(values) > centre - radius and min(values) < centre + radius


def add_ground(col, chunks, clip, step):
    cx, cz, r = clip
    for n, c in enumerate(chunks):
        pos, uv, uv1, rgbs = c['pos'], c['uv'], c['uv1'], c['col']
        lift = c['order'] * step
        tris = [t for t in range(len(pos) // 9) if overlaps(pos[t * 9:t * 9 + 9:3], cx, r) and overlaps(pos[t * 9 + 2:t * 9 + 9:3], cz, r)]
        if not tris:
            continue
        idx = [t * 3 + k for t in tris for k in range(3)]
        mesh = bpy.data.meshes.new(f'yer{n}')
        mesh.from_pydata([(pos[i * 3], -pos[i * 3 + 2], pos[i * 3 + 1] + lift) for i in idx], [], [(i, i + 1, i + 2) for i in range(0, len(idx), 3)])
        mesh.uv_layers.new(name='uv0').data.foreach_set('uv', [v for i in idx for v in (uv[i * 2], uv[i * 2 + 1])])
        mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER').data.foreach_set('color', [v for i in idx for v in (*rgbs[i * 3:i * 3 + 3], 1)])
        assign(mesh, [(int(uv1[t * 6] * 16), 0) for t in tris])
        col.objects.link(bpy.data.objects.new(mesh.name, mesh))


def flat_material(name, color, rough=0.9, emit=0.0):
    m = bpy.data.materials.get(name)
    if m is None:
        m = bpy.data.materials.new(name)
        b = principled(m)
        b.inputs['Base Color'].default_value = (*rgb(color), 1)
        b.inputs['Roughness'].default_value = rough
        b.inputs['Emission Color'].default_value = (*rgb(color), 1)
        b.inputs['Emission Strength'].default_value = emit
    return m


def add_flat(col, name, points, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [list(range(len(points)))])
    mesh.materials.append(mat)
    col.objects.link(bpy.data.objects.new(name, mesh))


def add_lake(col, lake, z):
    n = 96
    ring = [2 * math.pi * i / n for i in range(n)]
    add_flat(col, 'kol', [(lake['x'] + math.cos(a) * lake['rx'], -lake['z'] + math.sin(a) * lake['rz'], z) for a in ring], flat_material('suv', '#3f9cb8', 0.12))


def add_floor(col, floor):
    x, z, r = floor
    add_flat(col, 'maydoncha', [(x - r, -z - r, -0.03), (x + r, -z - r, -0.03), (x + r, -z + r, -0.03), (x - r, -z + r, -0.03)], flat_material('maydoncha', '#b9c4a0'))


def add_labels(col, labels, is_map):
    for text, x, y, z, yaw, size in labels:
        c = bpy.data.curves.new(text, 'FONT')
        c.body, c.size, c.align_x = text, size, 'CENTER'
        c.extrude, c.resolution_u = size * 0.02, 2
        c.materials.append(flat_material('yozuv_xarita', '#fff6d8', emit=1.0) if is_map else flat_material('yozuv', '#5a1f14', emit=0.15))
        o = bpy.data.objects.new(text, c)
        o.location = to_blender(x, y, z)
        o.rotation_euler = (math.radians(50 if is_map else 60), 0, yaw)
        col.objects.link(o)


def light(scene):
    sun = bpy.data.lights.get('quyosh')
    if sun is None:
        sun = bpy.data.lights.new('quyosh', 'SUN')
        sun.energy, sun.angle, sun.color = 3.6, math.radians(1.5), (1, 0.94, 0.84)
    o = bpy.data.objects.new('quyosh', sun)
    o.rotation_euler = (math.radians(48), math.radians(12), math.radians(-38))
    scene.collection.objects.link(o)
    world = bpy.data.worlds.get('osmon')
    if world is None:
        world = bpy.data.worlds.new('osmon')
        world.use_nodes = True
        bg = next(n for n in world.node_tree.nodes if n.type == 'BACKGROUND')
        bg.inputs['Color'].default_value = (0.5, 0.7, 0.95, 1)
        bg.inputs['Strength'].default_value = 0.75
    scene.world = world


def camera(scene, spec):
    eye, target = (Vector(to_blender(*p)) for p in spec)
    data = bpy.data.cameras.new('kamera')
    data.lens, data.clip_start, data.clip_end = 32, 1, 8000
    o = bpy.data.objects.new('kamera', data)
    o.location = eye
    o.rotation_euler = (target - eye).to_track_quat('-Z', 'Y').to_euler()
    scene.collection.objects.link(o)
    scene.camera = o


def setup_render(scene):
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.exposure = -0.1
    scene.eevee.taa_render_samples = 32


def setup_view():
    for screen in bpy.data.screens:
        for area in screen.areas:
            if area.type != 'VIEW_3D':
                continue
            space = area.spaces.active
            space.clip_start, space.clip_end = 0.5, 8000
            space.shading.type = 'MATERIAL'
            space.shading.use_scene_lights = space.shading.use_scene_world = True
            space.overlay.show_floor = space.overlay.show_axis_x = space.overlay.show_axis_y = False
            space.overlay.show_extras = space.overlay.show_relationship_lines = False
            space.region_3d.view_perspective = 'CAMERA'


def main():
    with open(os.path.join(DIR, 'show.json'), encoding='utf8') as f:
        data = json.load(f)
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    first = bpy.context.scene
    kit = build_kit()
    for i, spec in enumerate(data['scenes']):
        scene = first if i == 0 else bpy.data.scenes.new(spec['name'])
        scene.name = spec['name']
        add_items(collection(scene, 'Modellar'), spec['items'], kit)
        ground = collection(scene, 'Yer')
        step = spec.get('lift', ORDER_STEP)
        if 'floor' in spec:
            add_floor(ground, spec['floor'])
        else:
            add_ground(ground, spec['ground'], spec['clip'], step)
        if spec.get('isLake'):
            add_lake(ground, data['lake'], step * 1.5)
        add_labels(collection(scene, 'Yozuvlar'), spec['labels'], i == len(data['scenes']) - 1)
        light(scene)
        camera(scene, spec['camera'])
        setup_render(scene)
        print(f"SHOW {spec['name']}: {len(spec['items'])} ta")
    bpy.context.window.scene = first
    setup_view()
    bpy.ops.wm.save_as_mainfile(filepath=OUT, compress=True)
    print(f'SHOW {OUT}: {os.path.getsize(OUT) // 1024} KB')
    if '--render' in ARGS:
        for i, scene in enumerate(bpy.data.scenes):
            scene.render.filepath = os.path.join(DIR, f'r{i}.png')
            bpy.ops.render.render(write_still=True, scene=scene.name)


main()
