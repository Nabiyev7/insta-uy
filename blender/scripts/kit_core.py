"""Model quruvchi: to'rtburchaklar -> mesh (uv0 = metr, uv1 = qatlam/niqob, vertex rang = bake qilingan AO)."""
import math
import random

import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

# Tekstura qatlamlari (build-textures.mjs bilan bir xil tartib)
PLAIN, PLASTER, BRICK, ROOF, WOOD, ASPHALT, GRASS, CONCRETE, LEAF, WINDOW, NAQSH, CARVED, FACADE, GLASS, SOIL, STONE = range(16)
# Niqoblar: instance rangi qaysi qismga tegishli
M_NONE, M_WALL, M_ROOF, M_GLOW = 0.0, 0.25, 0.5, 0.75
TILE = {PLASTER: 3.0, BRICK: 2.0, ROOF: 2.2, WOOD: 1.6, ASPHALT: 4.0, GRASS: 5.0, CONCRETE: 3.0, LEAF: 2.2,
        NAQSH: 1.2, CARVED: 1.0, FACADE: 3.6, GLASS: 4.0, SOIL: 4.0, STONE: 2.5, PLAIN: 1.0, WINDOW: 1.0}
MAX_FACE = 3.0
COARSE = 99.0  # panjara va uzoq ko'rinishlar bo'linmaydi
AO_RAYS = 28
AO_DISTANCE = 3.5


def rgb(hex_color):
    """sRGB hex -> linear."""
    h = hex_color.lstrip('#')
    out = []
    for i in (0, 2, 4):
        c = int(h[i:i + 2], 16) / 255
        out.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return tuple(out)


WHITE = '#ffffff'


class Model:
    """Bitta model = bitta primitiv (bitta draw call)."""

    def __init__(self, name, max_face=MAX_FACE):
        self.name = name
        self.max_face = max_face  # katta yuzalar AO uchun shu o'lchamda bo'linadi
        self.polys = []  # (points, uvs, layer, mask, color)

    def poly(self, pts, layer=PLAIN, color=WHITE, mask=M_NONE, fit=False):
        pts = [Vector(p) for p in pts]
        if len(pts) == 4:
            self._grid(pts, layer, color, mask, fit)
            return
        self._emit(pts, self._box_uv(pts, layer), layer, color, mask)

    def _grid(self, p, layer, color, mask, fit):
        nu = max(1, math.ceil((p[1] - p[0]).length / self.max_face - 0.2))
        nv = max(1, math.ceil((p[3] - p[0]).length / self.max_face - 0.2))
        def at(u, v):
            return p[0].lerp(p[1], u).lerp(p[3].lerp(p[2], u), v)
        for i in range(nu):
            for j in range(nv):
                cs = [(i / nu, j / nv), ((i + 1) / nu, j / nv), ((i + 1) / nu, (j + 1) / nv), (i / nu, (j + 1) / nv)]
                pts = [at(u, v) for u, v in cs]
                self._emit(pts, cs if fit else self._box_uv(pts, layer), layer, color, mask)

    def _emit(self, pts, uvs, layer, color, mask):
        self.polys.append((pts, uvs, layer, mask, rgb(color)))

    @staticmethod
    def _box_uv(pts, layer):
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        s = TILE[layer]
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        if az >= ax and az >= ay:
            return [(q.x / s, q.y / s) for q in pts]
        # Qiya tomlar: balandlik bo'ylab cho'zilmasin
        horizontal = (lambda q: q.x) if ay >= ax else (lambda q: q.y)
        return [(horizontal(q) / s, q.z / s) for q in pts]

    def box(self, x0, y0, z0, x1, y1, z1, layer=PLAIN, color=WHITE, mask=M_NONE, bottom=False, top=True, top_layer=None):
        a = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)]
        b = [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
        for i in range(4):
            j = (i + 1) % 4
            self.poly([a[i], a[j], b[j], b[i]], layer, color, mask)
        if top:
            self.poly(b, layer if top_layer is None else top_layer, color, mask)
        if bottom:
            self.poly(a[::-1], layer, color, mask)

    def cbox(self, cx, cy, z0, sx, sy, sz, *args, **kw):
        self.box(cx - sx / 2, cy - sy / 2, z0, cx + sx / 2, cy + sy / 2, z0 + sz, *args, **kw)

    def cyl(self, cx, cy, z0, z1, r0, r1=None, n=8, layer=PLAIN, color=WHITE, mask=M_NONE, cap=True):
        r1 = r0 if r1 is None else r1
        ring = [(math.cos(2 * math.pi * i / n), math.sin(2 * math.pi * i / n)) for i in range(n)]
        for i in range(n):
            a, b = ring[i], ring[(i + 1) % n]
            p = [(cx + a[0] * r0, cy + a[1] * r0, z0), (cx + b[0] * r0, cy + b[1] * r0, z0)]
            if r1 > 0.001:
                self.poly(p + [(cx + b[0] * r1, cy + b[1] * r1, z1), (cx + a[0] * r1, cy + a[1] * r1, z1)], layer, color, mask)
            else:
                self.poly(p + [(cx, cy, z1)], layer, color, mask)
        if cap and r1 > 0.001:
            self.poly_fan([(cx + a[0] * r1, cy + a[1] * r1, z1) for a in ring], layer, color, mask)

    def poly_fan(self, pts, layer, color, mask):
        for i in range(1, len(pts) - 1):
            self.poly([pts[0], pts[i], pts[i + 1]], layer, color, mask)

    def dome(self, cx, cy, z0, r, n=10, rows=4, layer=NAQSH, color=WHITE, mask=M_NONE, height=1.15):
        def pt(i, j):
            a, t = 2 * math.pi * i / n, (math.pi / 2) * j / rows
            return (cx + math.cos(a) * math.cos(t) * r, cy + math.sin(a) * math.cos(t) * r, z0 + math.sin(t) * r * height)
        for j in range(rows):
            for i in range(n):
                p = [pt(i, j), pt(i + 1, j)]
                self.poly(p + ([pt(i, j + 1)] if j == rows - 1 else [pt(i + 1, j + 1), pt(i, j + 1)]), layer, color, mask)

    def blob(self, cx, cy, cz, r, color, seed=1, squash=0.85, layer=LEAF, sub=1):
        """Notekis ikosfera — barg to'plami."""
        import bmesh
        rnd = random.Random(seed)
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
        shift = {v.index: 1 + rnd.uniform(-0.14, 0.14) for v in bm.verts}
        for f in bm.faces:
            self.poly([(cx + v.co.x * shift[v.index], cy + v.co.y * shift[v.index], cz + v.co.z * squash * shift[v.index]) for v in f.verts], layer, color)
        bm.free()

    def gable(self, x0, y0, x1, y1, z, h, over=0.5, color=WHITE, wall='#ffffff'):
        ym = (y0 + y1) / 2
        a, b, c, d = x0 - over, y0 - over, x1 + over, y1 + over
        self.poly([(a, b, z), (c, b, z), (c, ym, z + h), (a, ym, z + h)], ROOF, color, M_ROOF)
        self.poly([(c, d, z), (a, d, z), (a, ym, z + h), (c, ym, z + h)], ROOF, color, M_ROOF)
        self.poly([(x1, y0, z), (x1, y1, z), (x1, ym, z + h * 0.94)], PLASTER, wall, M_WALL)
        self.poly([(x0, y1, z), (x0, y0, z), (x0, ym, z + h * 0.94)], PLASTER, wall, M_WALL)
        self.poly([(a, d, z), (c, d, z), (c, b, z), (a, b, z)], WOOD, '#8a6a48')

    def hip(self, x0, y0, x1, y1, z, h, over=0.6, color=WHITE):
        a, b, c, d = x0 - over, y0 - over, x1 + over, y1 + over
        run = min(c - a, d - b) / 2
        if c - a >= d - b:
            r0, r1 = (a + run, (b + d) / 2, z + h), (c - run, (b + d) / 2, z + h)
            faces = [[(a, b, z), (c, b, z), r1, r0], [(c, d, z), (a, d, z), r0, r1], [(c, b, z), (c, d, z), r1], [(a, d, z), (a, b, z), r0]]
        else:
            r0, r1 = ((a + c) / 2, b + run, z + h), ((a + c) / 2, d - run, z + h)
            faces = [[(c, b, z), (c, d, z), r1, r0], [(a, d, z), (a, b, z), r0, r1], [(a, b, z), (c, b, z), r0], [(c, d, z), (a, d, z), r1]]
        for f in faces:
            self.poly(f, ROOF, color, M_ROOF)
        self.poly([(a, d, z), (c, d, z), (c, b, z), (a, b, z)], WOOD, '#8a6a48')

    def window(self, axis, at, lo, hi, z0, z1, out=0.04):
        """axis: 'f' (old, -y), 'b' (+y), 'l' (-x), 'r' (+x). `at` - devor koordinatasi."""
        if axis == 'f':
            p = [(lo, at - out, z0), (hi, at - out, z0), (hi, at - out, z1), (lo, at - out, z1)]
        elif axis == 'b':
            p = [(hi, at + out, z0), (lo, at + out, z0), (lo, at + out, z1), (hi, at + out, z1)]
        elif axis == 'l':
            p = [(at - out, hi, z0), (at - out, lo, z0), (at - out, lo, z1), (at - out, hi, z1)]
        else:
            p = [(at + out, lo, z0), (at + out, hi, z0), (at + out, hi, z1), (at + out, lo, z1)]
        self.polys.append(([Vector(q) for q in p], [(0, 0), (1, 0), (1, 1), (0, 1)], WINDOW, M_GLOW, rgb(WHITE)))

    def panel(self, p, layer, color=WHITE):
        self.polys.append(([Vector(q) for q in p], [(0, 0), (1, 0), (1, 1), (0, 1)], layer, M_NONE, rgb(color)))

    def door(self, cx, at, w=1.2, h=2.3, color=WHITE):
        self.panel([(cx - w / 2, at - 0.05, 0.15), (cx + w / 2, at - 0.05, 0.15), (cx + w / 2, at - 0.05, h + 0.15), (cx - w / 2, at - 0.05, h + 0.15)], CARVED, color)

    def column(self, cx, cy, z0, z1, r=0.14, color='#8a5a30', layer=WOOD):
        self.cbox(cx, cy, z0, r * 3.2, r * 3.2, 0.25, STONE, '#cbbfa9')
        self.cyl(cx, cy, z0 + 0.25, z1 - 0.25, r * 1.15, r * 0.8, 6, layer, color, cap=False)
        self.cbox(cx, cy, z1 - 0.28, r * 3.4, r * 3.4, 0.28, CARVED, WHITE)

    def stretch(self, fx, fy):
        """Hozirgacha chizilgan qismni eniga va chuqurligiga kengaytiradi (bo'yi o'zgarmaydi)."""
        self.polys = [([Vector((p.x * fx, p.y * fy, p.z)) for p in pts], *rest) for pts, *rest in self.polys]

    # ---- mesh ----
    def _ao(self, ground):
        verts, faces = [], []
        for pts, *_ in self.polys:
            base = len(verts)
            verts += [p.copy() for p in pts]
            faces.append(list(range(base, base + len(pts))))
        if ground:
            b = len(verts)
            verts += [Vector(v) for v in ((-90, -90, 0), (90, -90, 0), (90, 90, 0), (-90, 90, 0))]
            faces.append([b, b + 1, b + 2, b + 3])
        tree = BVHTree.FromPolygons(verts, faces)
        rnd = random.Random(7)
        dirs = []
        while len(dirs) < AO_RAYS:
            v = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
            if 0.05 < v.length < 1:
                dirs.append(v.normalized())
        out = []
        for pts, *_ in self.polys:
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized()
            centre = sum(pts, Vector()) / len(pts)
            row = []
            for p in pts:
                origin = p.lerp(centre, 0.06) + n * 0.03
                hit = total = 0.0
                for d in dirs:
                    w = d.dot(n)
                    if w <= 0.05:
                        continue
                    total += w
                    loc, _n, _i, dist = tree.ray_cast(origin, d, AO_DISTANCE)
                    if loc is not None:
                        hit += w * (1 - dist / AO_DISTANCE) ** 0.5
                row.append(1 - 0.5 * hit / max(total, 0.001))
            out.append(row)
        return out

    def build(self, ground=True):
        ao = self._ao(ground)
        verts, faces = [], []
        for pts, *_ in self.polys:
            b = len(verts)
            verts += [tuple(p) for p in pts]
            faces.append(tuple(range(b, b + len(pts))))
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(verts, [], faces)
        uv0 = mesh.uv_layers.new(name='uv0')
        uv1 = mesh.uv_layers.new(name='uv1')
        col = mesh.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        k = 0
        for (pts, uvs, layer, mask, c), shade in zip(self.polys, ao):
            for i in range(len(pts)):
                uv0.data[k].uv = uvs[i]
                uv1.data[k].uv = ((layer + 0.5) / 16, 1 - mask)  # glTF eksport v ni ag'daradi
                col.data[k].color = (c[0] * shade[i], c[1] * shade[i], c[2] * shade[i], 1)
                k += 1
        mesh.color_attributes.active_color = col
        mesh.materials.append(kit_material())
        obj = bpy.data.objects.new(self.name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        return obj


def kit_material():
    m = bpy.data.materials.get('kit')
    if m is None:
        m = bpy.data.materials.new('kit')
        m.use_backface_culling = True
    return m
