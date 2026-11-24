"""15 ta yangi bezak (5-leveldan) — uslub-v2.blend dagi bezak_lib funksiyalaridan. Old tomoni -Y; har biri ≤ 300 uchburchak (basseyn, besedka ≤ 500)."""
import math
import random

from kit_core import COARSE, LEAF, LEAVES, M_GLOW, PLAIN, Model

WOOD_A, WOOD_B = '#9a6438', '#7e4f2b'
ROOF_DARK, CREAM, STONE_GREY, CONCRETE_A = '#4b5663', '#f7f2ea', '#a39b90', '#cfcac2'
WATER, WATER_B, METAL, EMBER = '#4fb6e8', '#7fd0f0', '#3a3f45', '#ff8a3d'
BLOOMS = ('#ff8fb1', '#ffcf4d', '#b58cff', '#fffffe')
TRUNK_A, PALM, PALM_TRUNK, FIR = '#7a5133', '#5daa3c', '#a07a52', '#2f7a44'
TYRE = '#222326'


def gem(m: Model, x: float, y: float, z: float, r: float, color: str, squash: float = 1.0) -> None:
    """Sakkiz yoqli kichik sharcha (meva, gul)."""
    m.cyl(x, y, z, z + r * squash, r, 0.0, 4, PLAIN, color)
    ring = [(x + math.cos(math.pi / 2 * i) * r, y + math.sin(math.pi / 2 * i) * r, z) for i in range(4)]
    for i in range(4):
        m.poly([ring[(i + 1) % 4], ring[i], (x, y, z - r * squash)], PLAIN, color)


def cone_roof(m: Model, x: float, y: float, z: float, r: float, h: float, color: str, n: int = 10) -> None:
    """Soyabon: ustidan ham, ostidan ham ko'rinadi."""
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p = [(x + math.cos(a) * r, y + math.sin(a) * r, z), (x + math.cos(b) * r, y + math.sin(b) * r, z), (x, y, z + h)]
        m.poly(p, PLAIN, color)
        m.poly(p[::-1], PLAIN, color)


# ---------- Dam olish ----------
def dam_besedka() -> Model:
    m = Model('dam_besedka', COARSE)
    m.box(-2.1, -2.1, 0, 2.1, 2.1, 0.25, PLAIN, WOOD_A)
    for dx in (-1.8, 1.8):
        for dy in (-1.8, 1.8):
            m.cbox(dx, dy, 0.25, 0.2, 0.2, 2.5, PLAIN, WOOD_B, top=False)
    m.box(-2.4, -2.4, 2.7, 2.4, 2.4, 2.84, PLAIN, ROOF_DARK, bottom=True, top=False)
    c = [(-2.4, -2.4, 2.84), (2.4, -2.4, 2.84), (2.4, 2.4, 2.84), (-2.4, 2.4, 2.84)]
    for i in range(4):
        m.poly([c[i], c[(i + 1) % 4], (0, 0, 4.05)], PLAIN, ROOF_DARK)
    m.cbox(0, 0, 0.25, 1.6, 1.0, 0.75, PLAIN, WOOD_B)
    for dy in (-0.95, 0.95):
        m.cbox(0, dy, 0.25, 1.6, 0.4, 0.45, PLAIN, WOOD_A)
    for x0, y0, x1, y1 in ((-1.75, 1.75, 1.75, 1.85), (-1.85, -1.75, -1.75, 1.75), (1.75, -1.75, 1.85, 1.75)):
        m.box(x0, y0, 0.9, x1, y1, 1.0, PLAIN, WOOD_B, bottom=True)
    m.cbox(0, 0, 2.3, 0.24, 0.24, 0.3, PLAIN, '#ffe9a8', M_GLOW)
    return m


def dam_mangal() -> Model:
    m = Model('dam_mangal', COARSE)
    m.box(-0.95, -0.37, 0.8, 0.95, 0.37, 1.2, PLAIN, METAL, bottom=True)
    for x in (-0.77, 0.77):
        m.cbox(x, 0, 0, 0.1, 0.5, 0.8, PLAIN, METAL, top=False)
    for i in range(5):
        m.cbox(-0.64 + i * 0.32, 0, 1.2, 0.2, 0.45, 0.08, PLAIN, '#2b2b2c')
    m.blob(0, 0, 1.36, 0.26, EMBER, 3, 0.7, PLAIN)
    m.cbox(1.35, 0, 0, 0.55, 0.6, 0.85, PLAIN, WOOD_A)
    return m


def dam_basseyn() -> Model:
    m = Model('dam_basseyn', COARSE)
    cx, w, d = 1.0, 3.8, 6.0
    x0, x1, y0, y1 = cx - w / 2, cx + w / 2, -d / 2, d / 2
    for a, b, c, e in ((x0 - 0.4, y0 - 0.4, x1 + 0.4, y0), (x0 - 0.4, y1, x1 + 0.4, y1 + 0.4), (x0 - 0.4, y0, x0, y1), (x1, y0, x1 + 0.4, y1)):
        m.box(a, b, 0, c, e, 0.2, PLAIN, CONCRETE_A)
    m.poly([(x0, y0, 0.12), (x1, y0, 0.12), (x1, y1, 0.12), (x0, y1, 0.12)], PLAIN, WATER)
    for i in range(3):
        y = y0 + d * (i + 1) / 4
        m.poly([(x0 + 0.5, y, 0.14), (x1 - 0.5, y, 0.14), (x1 - 0.5, y + 0.07, 0.14), (x0 + 0.5, y + 0.07, 0.14)], PLAIN, WATER_B)
    for x in (x1 - 0.65, x1 - 0.15):
        m.cbox(x, y0 - 0.15, 0.15, 0.07, 0.07, 0.75, PLAIN, METAL)
        m.box(x - 0.03, y0 - 0.15, 0.83, x + 0.03, y0 + 0.25, 0.9, PLAIN, METAL, bottom=True)
    lx = x0 - 1.15
    for y in (-1.1, 1.1):
        m.box(lx - 0.4, y - 0.95, 0.12, lx + 0.4, y + 0.95, 0.35, PLAIN, CREAM, bottom=True)
        m.box(lx - 0.4, y + 0.55, 0.35, lx + 0.4, y + 0.95, 0.62, PLAIN, CREAM)
    m.cyl(lx, 0, 0, 2.3, 0.05, 0.05, 6, PLAIN, METAL, cap=False)
    cone_roof(m, lx, 0, 2.1, 1.15, 0.5, '#2f8fbf')
    return m


def dam_stol() -> Model:
    m = Model('dam_stol', COARSE)
    m.cyl(0, 0, 0, 0.08, 0.5, 0.5, 10, PLAIN, CREAM)
    m.cyl(0, 0, 0.08, 2.5, 0.05, 0.05, 6, PLAIN, METAL, cap=False)
    m.cyl(0, 0, 0.7, 0.77, 0.75, 0.75, 12, PLAIN, CREAM)
    for a in range(4):
        c, s = math.cos(a * math.pi / 2), math.sin(a * math.pi / 2)
        x, y = c * 1.05, s * 1.05
        m.cbox(x, y, 0, 0.48, 0.48, 0.45, PLAIN, WOOD_A)
        m.cbox(x + c * 0.22, y + s * 0.22, 0.45, 0.08 if abs(c) > 0.5 else 0.48, 0.48 if abs(c) > 0.5 else 0.08, 0.5, PLAIN, WOOD_A)
    cone_roof(m, 0, 0, 2.2, 1.45, 0.5, '#f6f1e6', 12)
    return m


# ---------- Mashinalar ----------
def tyre(m: Model, x: float, y: float, r: float, w: float, n: int = 9, hub_color: str = '#c9ced3') -> None:
    """O'qi x bo'ylab g'ildirak, tashqi yuzasi diskli."""
    s = 1 if x > 0 else -1
    ring = [(math.cos(2 * math.pi * i / n) * r, math.sin(2 * math.pi * i / n) * r) for i in range(n)]
    xo, xi = x + s * w / 2, x - s * w / 2
    for i in range(n):
        (ay, az), (by, bz) = ring[i], ring[(i + 1) % n]
        side = [(xi, y + ay, r + az), (xi, y + by, r + bz), (xo, y + by, r + bz), (xo, y + ay, r + az)]
        m.poly(side[::-1] if s > 0 else side, PLAIN, TYRE)
    face = [(xo, y + a, r + b) for a, b in ring]
    m.poly_fan(face if s > 0 else face[::-1], PLAIN, TYRE, 0.0)
    hub = [(xo + s * 0.02, y + a * 0.55, r + b * 0.55) for a, b in ring[::2]]
    m.poly_fan(hub if s > 0 else hub[::-1], PLAIN, hub_color, 0.0)


def auto(name: str, length: float, width: float, body_h: float, cab_h: float, cab: float, shift: float, color: str, bevel: float, glass: str = '#cde7f2', hub: str = '#c9ced3', wheel: float = 0.37) -> Model:
    """Yumaloq qirrali umumiy mashina (brendsiz)."""
    m = Model(name, COARSE)
    hl, hw, z0 = length / 2, width / 2, 0.35
    m.bevel = bevel
    m.box(-hw, -hl, z0, hw, hl, z0 + body_h, PLAIN, color, bottom=True)
    m.bevel = 0.0
    zb, zt = z0 + body_h, z0 + body_h + cab_h
    y0, y1 = shift - cab / 2, shift + cab / 2
    a = [(-hw + 0.1, y0, zb), (hw - 0.1, y0, zb), (hw - 0.1, y1, zb), (-hw + 0.1, y1, zb)]
    b = [(-hw + 0.2, y0 + 0.35, zt), (hw - 0.2, y0 + 0.35, zt), (hw - 0.2, y1 - 0.25, zt), (-hw + 0.2, y1 - 0.25, zt)]
    for i in range(4):
        j = (i + 1) % 4
        m.poly([a[i], a[j], b[j], b[i]], PLAIN, glass)
    m.box(-hw + 0.16, y0 + 0.3, zt, hw - 0.16, y1 - 0.2, zt + 0.1, PLAIN, color, bottom=True)
    lamp_z = z0 + body_h * 0.55
    for s in (-1, 1):
        x = s * (hw - 0.14)
        m.box(x - 0.06, shift - 0.06, zb, x + 0.06, shift + 0.06, zt, PLAIN, color, top=False)
        c = s * 0.6
        m.panel([(c - 0.21, -hl - 0.02, lamp_z), (c + 0.21, -hl - 0.02, lamp_z), (c + 0.21, -hl - 0.02, lamp_z + 0.16), (c - 0.21, -hl - 0.02, lamp_z + 0.16)], PLAIN, '#fff4cc', M_GLOW)
        m.panel([(c + 0.21, hl + 0.02, lamp_z), (c - 0.21, hl + 0.02, lamp_z), (c - 0.21, hl + 0.02, lamp_z + 0.14), (c + 0.21, hl + 0.02, lamp_z + 0.14)], PLAIN, '#d13a30')
        for y in (-length * 0.31, length * 0.31):
            tyre(m, s * (hw - 0.1), y, wheel, 0.26, hub_color=hub)
    return m


# ---------- Tabiat ----------
def fruit(name: str, color: str, seed: int) -> Model:
    m = Model(name)
    m.cyl(0, 0, 0, 1.6, 0.2, 0.15, 6, PLAIN, TRUNK_A, cap=False)
    for i, (x, y, z, r, c, sub) in enumerate(((0, 0, 2.3, 1.3, 0, 2), (0.5, -0.3, 2.7, 0.95, 1, 2), (-0.5, 0.3, 2.95, 0.8, 2, 1), (0, 0.2, 3.3, 0.66, 1, 1))):
        m.blob(x, y, z, r, LEAVES[c], seed + i, 0.98, LEAF, sub, True, 0.04)
    rnd = random.Random(seed)
    for i in range(9):
        a, e = 2 * math.pi * (i + rnd.uniform(-0.3, 0.3)) / 9, rnd.uniform(-0.35, 0.75)
        gem(m, math.cos(a) * 1.32 * math.cos(e * 0.7), math.sin(a) * 1.32 * math.cos(e * 0.7), 2.4 + math.sin(e) * 1.05, 0.18, color)
    return m


def daraxt_archa() -> Model:
    m = Model('daraxt_archa')
    m.cyl(0, 0, 0, 0.8, 0.18, 0.18, 7, PLAIN, TRUNK_A, cap=False)
    for i, (r, h) in enumerate(((1.4, 1.6), (1.1, 1.4), (0.8, 1.2), (0.5, 1.0))):
        z = 0.7 + i * 0.85
        m.cyl(0, 0, z, z + h, r, 0.0, 10, LEAF, FIR if i % 2 == 0 else '#368a4e')
        m.poly_fan([(math.cos(-2 * math.pi * k / 10) * r, math.sin(-2 * math.pi * k / 10) * r, z) for k in range(10)], LEAF, '#256637', 0.0)
    return m


def daraxt_palma() -> Model:
    m = Model('daraxt_palma')
    for i in range(5):
        x, z = i * 0.06, i * 0.82
        m.cyl(x, 0, z, z + 0.86, 0.21 - i * 0.016, 0.17 - i * 0.016, 7, PLAIN, PALM_TRUNK, cap=False)
    tx, tz = 0.3, 4.1
    for k in range(8):
        a = 2 * math.pi * k / 8
        c, s = math.cos(a), math.sin(a)
        for (u0, w0, z0), (u1, w1, z1) in (((0.1, 0.12, tz), (0.8, 0.28, tz + 0.1)), ((0.8, 0.28, tz + 0.1), (1.45, 0.1, tz - 0.55))):
            p = [(tx + c * u - s * v, s * u + c * v, z) for u, v, z in ((u0, -w0, z0), (u1, -w1, z1), (u1, w1, z1), (u0, w0, z0))]
            m.poly(p, LEAF, PALM if k % 2 else '#6cb94a')
            m.poly(p[::-1], LEAF, '#4c9632')
    m.blob(tx, 0, tz, 0.22, PALM_TRUNK, 4, 1, PLAIN)
    return m


def gul_zor() -> Model:
    m = Model('gul_zor', COARSE)
    m.bevel = 0.05
    m.box(-1.5, -0.5, 0, 1.5, 0.5, 0.3, PLAIN, '#8c5e3d')
    m.bevel = 0.0
    rnd = random.Random(5)
    for i in range(10):
        m.blob(-1.28 + i * 0.285, rnd.uniform(-0.25, 0.25), 0.46, 0.18, BLOOMS[(i * 3) % 4], i, 1, PLAIN)
    return m


def gul_kamar() -> Model:
    m = Model('gul_kamar', COARSE)
    for s in (-1, 1):
        m.cbox(s * 1.1, 0, 0, 0.1, 0.1, 1.4, PLAIN, '#fffffe', top=False)
        m.blob(s * 1.1, 0, 0.5, 0.3, LEAVES[0], 3, 1.3, LEAF)
    for i in range(9):
        a = math.pi * i / 8
        m.blob(math.cos(a) * 1.1, 0, math.sin(a) * 1.1 + 1.35, 0.32, LEAVES[1 + i % 2], i + 5, 1, LEAF)
    for i in range(5):
        a = math.pi * (i + 0.5) / 5
        gem(m, math.cos(a) * 1.18, -0.28, math.sin(a) * 1.15 + 1.4, 0.15, BLOOMS[0] if i % 2 else BLOOMS[3])
    return m


def suv_hovuz() -> Model:
    m = Model('suv_hovuz', COARSE)
    n = 14
    m.poly_fan([(math.cos(2 * math.pi * i / n) * 1.6, math.sin(2 * math.pi * i / n) * 1.5, 0.08) for i in range(n)], PLAIN, WATER_B, 0.0)
    for i in range(12):
        a = 2 * math.pi * i / 12
        m.cyl(math.cos(a) * 1.5, math.sin(a) * 1.4, 0, 0.2 + 0.05 * (i % 3), 0.34, 0.2, 5, PLAIN, STONE_GREY if i % 2 else '#b7aea2')
    m.cyl(0, 0, 0, 0.5, 0.35, 0.3, 7, PLAIN, STONE_GREY, cap=False)
    m.cyl(0, 0, 0.45, 0.65, 0.3, 0.58, 8, PLAIN, '#b7aea2')
    gem(m, 0, 0, 0.95, 0.2, '#cdeff7', 1.6)
    for x, y in ((0.85, 0.35), (-0.75, -0.5)):
        gem(m, x, y, 0.1, 0.15, '#ff8a1e', 0.4)
    return m


def yard_decor() -> list[Model]:
    """Yangi bezaklar (tartibi katalogdagi bilan bir xil)."""
    return [
        dam_besedka(), dam_mangal(), dam_basseyn(), dam_stol(),
        auto('avto_sedan', 4.4, 1.9, 0.62, 0.6, 2.4, 0.25, '#2f6fd6', 0.12), auto('avto_krossover', 4.6, 2.0, 0.8, 0.72, 2.9, 0.25, '#f2f0ec', 0.14), auto('avto_sport', 4.3, 1.95, 0.5, 0.45, 2.0, 0.35, '#e33b2e', 0.09),
        fruit('daraxt_olma', '#d93a3a', 11), fruit('daraxt_orik', '#f2a33a', 12), fruit('daraxt_gilos', '#9e1b32', 13), daraxt_archa(), daraxt_palma(), gul_zor(), gul_kamar(), suv_hovuz(),
    ]
