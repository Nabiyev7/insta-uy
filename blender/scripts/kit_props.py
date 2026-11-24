"""Bezaklar, daraxtlar, mashinalar, shahar jihozlari."""
import math
import random

from kit_core import (BRICK, CARVED, COARSE, CONCRETE, FACADE, GRASS, LEAF, M_GLOW, M_ROOF, M_WALL, NAQSH, PLAIN, PLASTER, ROOF, SOIL, STONE, WHITE, WOOD, Model)

GOLD = '#d9a93f'
IRON = '#2b2b2e'
BARK = '#6b5238'
GATE = 4.0  # darvoza eni
W, D = 25.0, 34.0  # panjara shu o'lchamda; boshqa uchastkalarga masshtablanadi


def perimeter(m, draw, gap=GATE, inset=0.35, step=4.0):
    """draw(x0, y0, x1, y1) har bo'lak uchun; old tomonda darvoza joyi ochiq qoladi."""
    hw, hd = W / 2 - inset, D / 2 - inset
    runs = [((-hw, -hd), (-gap / 2, -hd)), ((gap / 2, -hd), (hw, -hd)), ((hw, -hd), (hw, hd)), ((hw, hd), (-hw, hd)), ((-hw, hd), (-hw, -hd))]
    for (ax, ay), (bx, by) in runs:
        n = max(1, round(math.hypot(bx - ax, by - ay) / step))
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            draw(ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1)


def slab(m, x0, y0, x1, y1, z0, z1, t, layer, color=WHITE, mask=0.0):
    a, b, c, d = min(x0, x1) - t, min(y0, y1) - t, max(x0, x1) + t, max(y0, y1) + t
    m.box(a, b, z0, c, d, z1, layer, color, mask)


def fence_low():
    """Past yog'och panjara (1-level)."""
    m = Model('fence_low', COARSE)
    def draw(x0, y0, x1, y1):
        m.cbox(x0, y0, 0, 0.16, 0.16, 1.0, WOOD, '#8a6238')
        for z in (0.25, 0.65):
            slab(m, x0, y0, x1, y1, z, z + 0.16, 0.03, WOOD, '#a3764a')
    perimeter(m, draw, step=5.8)
    return m


def fence_basic():
    """Suvoq devor, tepasi tosh (2–3 level)."""
    m = Model('fence_basic', COARSE)
    def draw(x0, y0, x1, y1):
        slab(m, x0, y0, x1, y1, 0, 1.4, 0.1, PLASTER, '#e6dccb', M_WALL)
        slab(m, x0, y0, x1, y1, 1.4, 1.5, 0.16, STONE, '#d8cbb5')
    perimeter(m, draw, step=17)
    return m


def fence_wood():
    m = Model('fence_wood', COARSE)
    def draw(x0, y0, x1, y1):
        m.cbox(x0, y0, 0, 0.18, 0.18, 1.5, WOOD, '#8a6238')
        slab(m, x0, y0, x1, y1, 0.15, 1.3, 0.04, WOOD, '#a3764a')
    perimeter(m, draw, step=4.4)
    return m


def fence_brick():
    m = Model('fence_brick', COARSE)
    def draw(x0, y0, x1, y1):
        slab(m, x0, y0, x1, y1, 0, 1.6, 0.14, BRICK)
        slab(m, x0, y0, x1, y1, 1.6, 1.72, 0.22, STONE, '#d8cbb5')
        m.cbox(x0, y0, 0, 0.5, 0.5, 2.0, BRICK)
    perimeter(m, draw, step=8.5)
    return m


def fence_ornate():
    m = Model('fence_ornate', COARSE)
    def draw(x0, y0, x1, y1):
        slab(m, x0, y0, x1, y1, 0, 0.6, 0.16, STONE, '#e6dcc8')
        slab(m, x0, y0, x1, y1, 0.75, 0.82, 0.03, PLAIN, IRON)
        slab(m, x0, y0, x1, y1, 1.75, 1.82, 0.03, PLAIN, GOLD)
        for i in range(1, 6):
            t = i / 6
            m.cbox(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, 0.6, 0.05, 0.05, 1.4, PLAIN, IRON, top=False)
        m.cbox(x0, y0, 0, 0.5, 0.5, 2.0, STONE, '#e6dcc8')
        m.cyl(x0, y0, 2.0, 2.5, 0.2, 0, 5, PLAIN, IRON)
    perimeter(m, draw, step=5.8)
    return m


def gate(name, post_layer, post, leaf_layer, leaf, h, crown=None):
    m = Model(name)
    for s in (-1, 1):
        m.cbox(s * (GATE / 2 - 0.1), 0, 0, 0.5, 0.5, h, post_layer, post)
        m.cbox(s * (GATE / 2 - 0.1), 0, h, 0.7, 0.7, 0.2, STONE, '#e6dcc8')
        x0, x1 = sorted((s * 0.04, s * (GATE / 2 - 0.35)))
        for y, flip in ((-0.07, False), (0.07, True)):
            p = [(x0, y, 0.1), (x1, y, 0.1), (x1, y, h - 0.4), (x0, y, h - 0.4)]
            m.panel([p[1], p[0], p[3], p[2]] if flip else p, leaf_layer, leaf)
    if crown:
        m.box(-GATE / 2, -0.35, h + 0.2, GATE / 2, 0.35, h + 0.65, NAQSH, WHITE, bottom=True)
        m.box(-GATE / 2 - 0.2, -0.5, h + 0.65, GATE / 2 + 0.2, 0.5, h + 0.8, ROOF if crown != GOLD else PLAIN, crown, bottom=True)
        if crown == GOLD:
            m.dome(0, 0, h + 0.8, 0.6, 8, 3, PLAIN, GOLD)
    return m


def tree_chinor(name='tree_chinor', lod=False):
    m = Model(name)
    if lod:
        m.cyl(0, 0, 0, 3, 0.3, 0.2, 4, PLAIN, BARK, cap=False)
        m.blob(0, 0, 5, 2.9, '#6f9440', 3, 0.8, sub=1)
        return m
    m.cyl(0, 0, 0, 3.2, 0.38, 0.24, 7, WOOD, '#b7a78c', cap=False)
    for i, (x, y, z, r) in enumerate([(0, 0, 5.4, 2.2), (1.5, 0.5, 4.5, 1.6), (-1.4, 0.7, 4.7, 1.6), (0.2, -1.5, 4.4, 1.6), (0.3, 1.5, 4.9, 1.4)]):
        m.blob(x, y, z, r, ['#6f9440', '#7fa548', '#64893a', '#89ab4f', '#759a43'][i], i + 3)
    return m


def tree_terak(name='tree_terak', lod=False):
    m = Model(name)
    m.cyl(0, 0, 0, 1.6, 0.2, 0.16, 5, WOOD, '#c9bda5', cap=False)
    if lod:
        m.cyl(0, 0, 1, 9, 0.9, 0, 5, LEAF, '#7ea04c')
        return m
    for i in range(5):
        m.blob(0.12 * math.sin(i * 2), 0.12 * math.cos(i * 3), 2.2 + i * 1.6, 1.05 - i * 0.13, ['#7ea04c', '#89ab55', '#769846'][i % 3], i + 11, 1.2)
    return m


def tree_anor():
    m = Model('tree_anor')
    m.cyl(0, 0, 0, 1.1, 0.14, 0.1, 5, WOOD, BARK, cap=False)
    m.blob(0, 0, 1.9, 1.05, '#4f7a34', 21)
    m.blob(0.5, 0.3, 1.6, 0.7, '#5d8a3c', 22)
    rnd = random.Random(4)
    for _ in range(9):
        a, z = rnd.uniform(0, 6.28), rnd.uniform(1.3, 2.4)
        m.blob(math.cos(a) * 0.95, math.sin(a) * 0.95, z, 0.13, '#c0352b', 2, 1, PLAIN, 1)
    return m


def tree_archa():
    m = Model('tree_archa')
    m.cyl(0, 0, 0, 1, 0.16, 0.14, 5, WOOD, BARK, cap=False)
    for i in range(4):
        m.cyl(0, 0, 0.7 + i * 1.1, 2.4 + i * 1.15, 1.5 - i * 0.33, 0, 8, LEAF, ['#2f5a3a', '#376643', '#3f714a', '#477c51'][i])
    return m


def yard_sori():
    m = Model('yard_sori')
    for x in (-1.3, 1.3):
        for y in (-1, 1):
            m.cbox(x, y, 0, 0.14, 0.14, 0.5, WOOD, '#7a4f2a')
    m.box(-1.5, -1.2, 0.45, 1.5, 1.2, 0.58, WOOD, '#99683a', bottom=True)
    m.box(-1.4, -1.1, 0.58, 1.4, 1.1, 0.68, NAQSH, '#e5785f')
    m.box(-1.5, 1.1, 0.58, 1.5, 1.2, 1.1, CARVED)
    m.box(-1.5, -1.2, 0.58, -1.4, 1.2, 1.1, CARVED)
    m.box(1.4, -1.2, 0.58, 1.5, 1.2, 1.1, CARVED)
    m.cbox(0, 0, 0.68, 0.9, 0.9, 0.25, WOOD, '#6d4423')
    m.cyl(0.1, 0.05, 0.93, 1.12, 0.13, 0.1, 6, PLAIN, '#1d4f9c')
    return m


def yard_tok():
    m = Model('yard_tok')
    for x in (-2, 2):
        for y in (-1.6, 1.6):
            m.cbox(x, y, 0, 0.12, 0.12, 2.5, WOOD, '#7a5a38')
    for y in (-1.6, 0, 1.6):
        m.box(-2.2, y - 0.05, 2.5, 2.2, y + 0.05, 2.6, WOOD, '#7a5a38', bottom=True)
    rnd = random.Random(9)
    for i in range(9):
        m.blob(-1.8 + (i % 3) * 1.8, -1.4 + (i // 3) * 1.4, 2.65, 0.95, ['#5f8c3a', '#6d9a44', '#557f33'][i % 3], i, 0.35)
    for _ in range(10):
        m.cyl(rnd.uniform(-1.8, 1.8), rnd.uniform(-1.4, 1.4), 2.0, 2.4, 0.03, 0.14, 5, PLAIN, rnd.choice(['#4a2a5e', '#8fae3a']))
    return m


def yard_flowers():
    m = Model('yard_flowers')
    m.box(-1.6, -0.6, 0, 1.6, 0.6, 0.22, BRICK, top_layer=SOIL)
    rnd = random.Random(5)
    for _ in range(22):
        x, y = rnd.uniform(-1.4, 1.4), rnd.uniform(-0.45, 0.45)
        m.cyl(x, y, 0.2, 0.55, 0.02, 0.1, 4, LEAF, '#5d8a3c')
        m.cyl(x, y, 0.5, 0.64, 0.05, 0.13, 5, PLAIN, rnd.choice(['#d8373a', '#f2c230', '#e66fa5', '#f5f0e6', '#9a4fc0']))
    return m


def water_pool():
    m = Model('water_pool')
    m.box(-3, -1.8, 0, 3, 1.8, 0.14, STONE, '#e6dcc8')
    m.poly([(-2.6, -1.4, 0.17), (2.6, -1.4, 0.17), (2.6, 1.4, 0.17), (-2.6, 1.4, 0.17)], PLAIN, '#3fb3cf')
    for x in (-2.2, -1.8):
        m.cbox(x, 1.5, 0.1, 0.05, 0.05, 0.9, PLAIN, '#d5dade')
    return m


def fountain(name, r, tiers):
    m = Model(name)
    n = 16 if r > 3 else 10
    m.cyl(0, 0, 0, 0.6, r, r, n, STONE, '#e6dcc8')
    m.cyl(0, 0, 0.6, 0.64, r * 0.9, r * 0.9, n, PLAIN, '#3fb3cf')
    z = 0.6
    for i in range(tiers):
        k = r * 0.42 / (i + 1)
        m.cyl(0, 0, z, z + r * 0.28, k * 0.25, k * 0.2, 8, NAQSH)
        z += r * 0.28
        m.cyl(0, 0, z, z + r * 0.08, k * 0.5, k, n, STONE, '#efe6d4')
        m.cyl(0, 0, z + r * 0.08, z + r * 0.085, k * 0.9, k * 0.9, n, PLAIN, '#69cbe0')
        z += r * 0.08
    m.cyl(0, 0, z, z + r * 0.35, 0.12 * r / 2, 0.02, 6, PLAIN, '#cdeff7')
    return m


def car(name, length, width, body_h, cab, color, roof_color=None):
    """Uzunasi -Y ga qaragan umumiy mashina (brendsiz)."""
    m = Model(name)
    hl, hw = length / 2, width / 2
    m.box(-hw, -hl, 0.28, hw, hl, body_h, PLAIN, color, bottom=True)
    y0, y1, h = cab
    inset = 0.12
    a = [(-hw, y0, body_h), (hw, y0, body_h), (hw, y1, body_h), (-hw, y1, body_h)]
    b = [(-hw + inset, y0 + 0.45, h), (hw - inset, y0 + 0.45, h), (hw - inset, y1 - 0.2, h), (-hw + inset, y1 - 0.2, h)]
    for i in range(4):
        j = (i + 1) % 4
        m.poly([a[i], a[j], b[j], b[i]], PLAIN, '#22303c')
    m.poly(b, PLAIN, roof_color or color)
    for x in (-hw + 0.02, hw - 0.02):
        for y in (-hl * 0.62, hl * 0.62):
            m.box(x - 0.1, y - 0.3, 0.02, x + 0.1, y + 0.3, 0.6, PLAIN, '#1c1c1e')
    for x in (-hw + 0.3, hw - 0.3):
        m.panel([(x - 0.18, -hl - 0.02, 0.55), (x + 0.18, -hl - 0.02, 0.55), (x + 0.18, -hl - 0.02, 0.75), (x - 0.18, -hl - 0.02, 0.75)], PLAIN, '#fff4d0')
        m.panel([(x + 0.18, hl + 0.02, 0.55), (x - 0.18, hl + 0.02, 0.55), (x - 0.18, hl + 0.02, 0.75), (x + 0.18, hl + 0.02, 0.75)], PLAIN, '#c0202a')
    return m


def lamp(name, h, color=IRON, head='#ffe9b0'):
    m = Model(name)
    m.cyl(0, 0, 0, 0.3, 0.16, 0.12, 6, STONE, '#8d867a')
    m.cyl(0, 0, 0.3, h, 0.06, 0.05, 5, PLAIN, color, cap=False)
    # M_GLOW + PLAIN = tunda yonadigan fonar
    for p in ([(-0.22, -0.22), (0.22, -0.22)], [(0.22, -0.22), (0.22, 0.22)], [(0.22, 0.22), (-0.22, 0.22)], [(-0.22, 0.22), (-0.22, -0.22)]):
        (ax, ay), (bx, by) = p
        m.poly([(ax * 0.7, ay * 0.7, h), (bx * 0.7, by * 0.7, h), (bx, by, h + 0.5), (ax, ay, h + 0.5)], PLAIN, head, M_GLOW)
    m.cyl(0, 0, h + 0.5, h + 0.75, 0.36, 0.02, 4, PLAIN, color)
    return m


def light_luxe():
    """Uy atrofidagi yer chiroqlari."""
    m = Model('light_luxe')
    for x in (-6.5, -2.2, 2.2, 6.5):
        for y in (-7, 7):
            m.cyl(x, y, 0, 0.5, 0.12, 0.12, 6, PLAIN, IRON, cap=False)
            m.cyl(x, y, 0.5, 0.75, 0.16, 0.16, 6, PLAIN, '#ffd98a', M_GLOW)
    return m


def light_lamps():
    m = Model('light_lamps')
    for x in (-2.6, 2.6):
        for y in (-3, 3):
            m.cyl(x, y, 0, 1.1, 0.04, 0.04, 5, PLAIN, IRON, cap=False)
            m.cyl(x, y, 1.1, 1.35, 0.14, 0.1, 6, PLAIN, '#ffe3a0', M_GLOW)
    return m


def animal(name, color, s=1.0, tail_up=False):
    m = Model(name)
    m.box(-0.14 * s, -0.4 * s, 0.28 * s, 0.14 * s, 0.4 * s, 0.6 * s, PLAIN, color, bottom=True)
    m.box(-0.13 * s, -0.68 * s, 0.5 * s, 0.13 * s, -0.36 * s, 0.82 * s, PLAIN, color, bottom=True)
    m.box(-0.07 * s, -0.8 * s, 0.52 * s, 0.07 * s, -0.66 * s, 0.64 * s, PLAIN, '#3a2a20')
    for x in (-0.1, 0.1):
        m.cyl(x * s, -0.5 * s, 0.8 * s, 0.94 * s, 0.06 * s, 0, 4, PLAIN, color)
        for y in (-0.3, 0.3):
            m.cbox(x * s, y * s, 0, 0.08 * s, 0.08 * s, 0.3 * s, PLAIN, color)
    m.box(-0.03 * s, 0.38 * s, 0.5 * s, 0.03 * s, 0.46 * s, (1.0 if tail_up else 0.75) * s, PLAIN, color)
    return m


def peacock():
    m = Model('special_peacock')
    m.blob(0, 0, 0.6, 0.3, '#1d5fa8', 2, 1, PLAIN)
    m.cyl(0, -0.22, 0.7, 1.15, 0.1, 0.06, 6, PLAIN, '#1d5fa8')
    m.blob(0, -0.25, 1.2, 0.11, '#1d6fb8', 2, 1, PLAIN)
    for i in range(9):
        a = math.pi * (0.1 + 0.8 * i / 8)
        c, s = math.cos(a), math.sin(a)
        p = [(0.1 * c - 0.1 * s, 0.25, 0.6 + 0.1 * s + 0.1 * c), (0.1 * c + 0.1 * s, 0.25, 0.6 + 0.1 * s - 0.1 * c), (1.3 * c + 0.22 * s, 0.45, 0.6 + 1.3 * s - 0.22 * c), (1.3 * c - 0.22 * s, 0.45, 0.6 + 1.3 * s + 0.22 * c)]
        m.poly(p[::-1], PLAIN, '#1f8f5f' if i % 2 else '#197a78')
        m.poly(p, PLAIN, '#1f8f5f' if i % 2 else '#197a78')
    for x in (-0.1, 0.1):
        m.cbox(x, 0, 0, 0.04, 0.04, 0.4, PLAIN, '#b58a3a')
    return m


def statue(name, h=2.2):
    m = Model(name)
    m.cbox(0, 0, 0, 1.6, 1.6, 0.5, STONE, '#d8cbb5')
    m.cbox(0, 0, 0.5, 1.1, 1.1, h * 0.6, STONE, '#e6dcc8')
    z = 0.5 + h * 0.6
    m.cbox(0, 0, z, 0.5, 0.4, h * 0.45, PLAIN, GOLD)
    m.blob(0, 0, z + h * 0.6, 0.26, GOLD, 2, 1, PLAIN)
    for s in (-1, 1):
        p = [(s * 0.2, 0.05, z + h * 0.3), (s * 1.5, 0.2, z + h * 0.75), (s * 1.1, 0.25, z + h * 0.35), (s * 0.3, 0.1, z + h * 0.1)]
        m.poly(p, PLAIN, GOLD)
        m.poly(p[::-1], PLAIN, GOLD)
    return m


def hero_statue():
    m = Model('hero_statue')
    for i in range(3):
        m.cbox(0, 0, i * 0.35, 5 - i, 5 - i, 0.35, STONE, '#e6dcc8')
    m.cbox(0, 0, 1.05, 2, 2, 3, NAQSH, '#e8dcc0')
    m.cbox(0, 0, 4.05, 2.3, 2.3, 0.3, PLAIN, GOLD)
    for s in (-1, 1):
        m.cbox(s * 0.22, 0, 4.35, 0.34, 0.4, 1.5, PLAIN, '#9c7a3a')
        m.cbox(s * 0.62, 0, 5.9, 0.28, 0.34, 1.3, PLAIN, '#a8853f')
    m.cbox(0, 0, 5.8, 0.95, 0.5, 1.5, PLAIN, '#a8853f')
    m.blob(0, 0, 7.75, 0.42, '#b08c44', 2, 1.1, PLAIN)
    m.cyl(0, 0, 7.95, 8.3, 0.4, 0.34, 8, PLAIN, '#6d5527')
    return m


def yurt():
    m = Model('special_yurt')
    m.cyl(0, 0, 0, 1.6, 2, 2, 12, PLASTER, '#efe6d4', cap=False)
    m.cyl(0, 0, 0.9, 1.2, 2.03, 2.03, 12, NAQSH, '#e5785f', cap=False)
    m.cyl(0, 0, 1.6, 2.9, 2.1, 0.4, 12, PLASTER, '#e3d8c2')
    m.panel([(-0.5, -2.06, 0), (0.5, -2.06, 0), (0.5, -2.06, 1.5), (-0.5, -2.06, 1.5)], CARVED)
    return m


def path_stone():
    m = Model('path_stone')
    m.box(-0.9, -8.8, 0, 0.9, 8.8, 0.06, STONE, '#e6dcc8')
    return m


def sign_nick():
    """Darvoza yonidagi nik lavhasi: yozuvi saytda qo'yiladi."""
    m = Model('sign_nick')
    for x in (-0.42, 0.42):
        m.cbox(x, 0.05, 0, 0.08, 0.08, 1.5, WOOD, '#7a4f2a')
    m.box(-0.62, -0.04, 0.8, 0.62, 0.04, 1.4, WOOD, '#8a6238', bottom=True)
    m.panel([(-0.56, -0.05, 0.86), (0.56, -0.05, 0.86), (0.56, -0.05, 1.34), (-0.56, -0.05, 1.34)], PLAIN, '#f6ead0')
    return m


def bench():
    m = Model('bench')
    m.box(-1, -0.25, 0.42, 1, 0.25, 0.5, WOOD, '#99683a', bottom=True)
    m.box(-1, 0.2, 0.6, 1, 0.27, 1.0, WOOD, '#99683a', bottom=True)
    for x in (-0.8, 0.8):
        m.box(x - 0.05, -0.2, 0, x + 0.05, 0.25, 0.9, PLAIN, IRON)
    return m


def billboard():
    m = Model('billboard')
    m.cyl(0, 0.2, 0, 4.2, 0.22, 0.18, 8, PLAIN, '#5b6066', cap=False)
    m.box(-4, 0, 4.2, 4, 0.4, 7.4, PLAIN, '#3a3f45', bottom=True)
    return m


def choyxona():
    m = Model('choyxona')
    m.box(-9, -7, 0, 9, 7, 0.5, STONE, '#e6dcc8', top_layer=WOOD)
    for x in (-8, -4, 0, 4, 8):
        for y in (-6, 6):
            m.column(x, y, 0.5, 4.3, 0.2)
    m.box(-8.4, -6.4, 4.3, 8.4, -5.8, 4.8, CARVED, WHITE, bottom=True)
    m.box(-8.4, 5.8, 4.3, 8.4, 6.4, 4.8, CARVED, WHITE, bottom=True)
    m.hip(-9, -7, 9, 7, 4.8, 3, 0.8, '#3f7f8c')
    m.box(-8, 2, 0.5, 8, 6, 4, PLASTER, '#efe6d4')
    for x in (-5, 0, 5):
        m.cbox(x, -2.5, 0.5, 2.6, 2.2, 0.5, WOOD, '#99683a')
        m.cbox(x, -2.5, 1.0, 2.4, 2.0, 0.08, NAQSH, '#e5785f')
    return m


def bozor_stall():
    m = Model('bozor_stall')
    m.box(-1.5, -0.7, 0, 1.5, 0.7, 0.9, WOOD, '#99683a')
    rnd = random.Random(3)
    for i in range(14):
        m.blob(-1.3 + (i % 7) * 0.43, -0.3 + (i // 7) * 0.55, 1.0, 0.2, rnd.choice(['#d8373a', '#f2c230', '#6da544', '#e8852f']), i, 0.8, PLAIN)
    for x in (-1.5, 1.5):
        for y in (-0.8, 0.8):
            m.cbox(x, y, 0, 0.08, 0.08, 2.4, WOOD, '#7a5a38')
    m.poly([(-1.8, -1.2, 2.2), (1.8, -1.2, 2.2), (1.8, 1.2, 2.7), (-1.8, 1.2, 2.7)], NAQSH, '#f0d9b0')
    m.poly([(-1.8, 1.2, 2.69), (1.8, 1.2, 2.69), (1.8, -1.2, 2.19), (-1.8, -1.2, 2.19)], PLAIN, '#c9a878')
    return m


def maktab():
    m = Model('maktab')
    m.box(-20, -7, 0, 20, 7, 0.8, BRICK)
    m.box(-20, -7, 0.8, 20, 7, 7.2, FACADE, WHITE, M_WALL, top_layer=CONCRETE)
    m.box(-20.4, -7.4, 7.2, 20.4, 7.4, 7.8, CONCRETE, '#e6dcc8', bottom=True)
    m.box(-4, -10, 4.2, 4, -7, 4.6, CONCRETE, '#e6dcc8', bottom=True)
    for x in (-3.5, -1.2, 1.2, 3.5):
        m.column(x, -9.6, 0, 4.2, 0.24, '#f3ead8', PLASTER)
    m.panel([(-3, -7.06, 4.9), (3, -7.06, 4.9), (3, -7.06, 6.6), (-3, -7.06, 6.6)], NAQSH)
    return m


def crane():
    m = Model('crane')
    yellow = '#e3a52c'
    m.cbox(0, 0, 0, 4, 4, 1, CONCRETE)
    for s in ((-0.7, -0.7), (0.7, -0.7), (0.7, 0.7), (-0.7, 0.7)):
        m.cbox(s[0], s[1], 1, 0.2, 0.2, 30, PLAIN, yellow)
    for i in range(10):
        z = 2 + i * 3
        m.box(-0.8, -0.8, z, 0.8, -0.7, z + 0.15, PLAIN, yellow, bottom=True)
        m.box(-0.8, 0.7, z, 0.8, 0.8, z + 0.15, PLAIN, yellow, bottom=True)
    m.box(-0.4, -24, 31, 0.4, 9, 31.7, PLAIN, yellow, bottom=True)
    m.cbox(0, 8, 29.5, 1.6, 2, 1.6, CONCRETE)
    m.cbox(0, 0, 31.7, 1.2, 1.2, 3, PLAIN, yellow)
    m.cbox(0, -18, 18, 0.06, 0.06, 13, PLAIN, IRON)
    m.cbox(0, -18, 17, 2.5, 1, 1, BRICK)
    return m


def barrier():
    """8 m to'siq bo'lagi — yopiq tuman chegarasi."""
    m = Model('barrier')
    for i in range(4):
        m.box(-4 + i * 2, -0.05, 0.1, -2.04 + i * 2, 0.05, 2.1, PLAIN, '#2f7f8c' if i % 2 else '#e9e3d6', bottom=True)
    m.cbox(-4, 0, 0, 0.12, 0.12, 2.3, PLAIN, '#8d867a')
    m.box(-4, -0.06, 1.6, 4, 0.06, 1.75, PLAIN, '#e3a52c')
    return m


def foundation():
    """Qurilayotgan (yopiq) yoki bo'sh uchastka poydevori."""
    m = Model('foundation')
    m.box(-5, -4, 0, 5, 4, 0.3, CONCRETE, '#bdb4a4')
    m.box(-5, -4, 0.3, -4.7, 4, 1.4, BRICK)
    m.box(-5, 3.7, 0.3, 2, 4, 1.0, BRICK)
    m.box(1, -5.8, 0, 3, -4.8, 0.7, BRICK)
    return m


def stadium():
    m = Model('stadium')
    n = 24
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        def at(t, r, z):
            return (math.cos(t) * r * 1.35, math.sin(t) * r, z)
        m.poly([at(a, 34, 0.5), at(b, 34, 0.5), at(b, 50, 12), at(a, 50, 12)], PLAIN, '#2f7f8c' if i % 2 else '#e9e3d6')
        m.poly([at(b, 51, 0), at(a, 51, 0), at(a, 51, 13), at(b, 51, 13)][::-1], FACADE, '#e6dcc8')
        m.poly([at(a, 44, 16), at(b, 44, 16), at(b, 53, 14), at(a, 53, 14)], CONCRETE, '#d8cbb5')
        m.poly([at(b, 44, 15.8), at(a, 44, 15.8), at(a, 53, 13.8), at(b, 53, 13.8)], CONCRETE, '#b7ad9c')
    m.poly([(-36, -24, 0.12), (36, -24, 0.12), (36, 24, 0.12), (-36, 24, 0.12)], GRASS, '#b9e08a')
    return m


def bridge():
    """Ko'l ustidan piyodalar ko'prigi (Y bo'ylab 216 m)."""
    m = Model('bridge')
    m.box(-3.6, -108, 0.02, 3.6, 108, 0.1, STONE, '#e6dcc8')
    for s in (-1, 1):
        m.box(s * 3.6 - 0.15, -108, 0.1, s * 3.6 + 0.15, 108, 1.0, NAQSH)
        for i in range(13):
            y = -108 + i * 18
            m.cyl(s * 3.6, y, 0, 3.4, 0.14, 0.1, 6, PLAIN, IRON, cap=False)
            m.cyl(s * 3.6, y, 3.4, 3.9, 0.22, 0.3, 6, PLAIN, '#ffe9b0', M_GLOW)
    return m


def forsale():
    m = Model('forsale')
    m.cbox(0, 0, 0, 0.12, 0.12, 1.9, WOOD, '#7a5a38')
    m.box(-0.8, -0.1, 1.0, 0.8, -0.06, 1.8, PLAIN, '#2e9b5b', bottom=True)
    m.box(-0.8, -0.06, 1.0, 0.8, -0.02, 1.8, WOOD, '#99683a', bottom=True)
    return m


def pigeon():
    m = Model('pigeon')
    m.blob(0, 0, 0.16, 0.12, '#9aa3ad', 2, 0.8, PLAIN)
    m.blob(0, -0.12, 0.27, 0.06, '#6f7f8f', 2, 1, PLAIN)
    for s in (-1, 1):
        p = [(s * 0.08, -0.08, 0.2), (s * 0.4, 0.02, 0.22), (s * 0.34, 0.12, 0.2), (s * 0.08, 0.1, 0.18)]
        m.poly(p, PLAIN, '#c3cad2')
        m.poly(p[::-1], PLAIN, '#c3cad2')
    return m


def all_props():
    return [
        fence_low(), fence_basic(), fence_wood(), fence_brick(), fence_ornate(),
        gate('gate_basic', PLASTER, '#e6dccb', PLAIN, '#4a6b7a', 1.9),
        gate('gate_wood', WOOD, '#7a4f2a', WOOD, '#a3764a', 2.1),
        gate('gate_wood_carved', WOOD, '#7a4f2a', CARVED, '#e0b98a', 2.3),
        gate('gate_naqsh', STONE, '#efe4cf', CARVED, WHITE, 2.6, '#2f6f72'),
        gate('gate_carved', BRICK, WHITE, CARVED, WHITE, 2.4, '#8a4b38'),
        gate('gate_gold', STONE, '#f0e6d2', CARVED, '#ffd27a', 2.8, GOLD),
        path_stone(), tree_anor(), tree_chinor(), tree_chinor('tree_chinor_lod', True), tree_terak(), tree_terak('tree_terak_lod', True), tree_archa(),
        yard_sori(), yard_tok(), yard_flowers(), water_pool(), fountain('water_fountain', 1.4, 1), fountain('plaza_fountain', 11, 3),
        car('car_van', 3.4, 1.5, 0.95, (-1.65, 1.65, 1.85), '#eef0f0'), car('car_sedan', 4.4, 1.75, 0.85, (-1.1, 1.5, 1.45), '#c9ced2'),
        car('car_sport', 4.4, 1.85, 0.72, (-0.7, 1.3, 1.18), '#c22a2a', '#151515'),
        lamp('street_lamp', 4.6), light_lamps(), light_luxe(), animal('pet_dog', '#b5854f'), animal('pet_cat', '#d09a5a', 0.6, True),
        peacock(), statue('special_statue'), hero_statue(), yurt(), bench(), billboard(), choyxona(), bozor_stall(), maktab(), crane(), barrier(),
        sign_nick(), foundation(), forsale(), pigeon(), stadium(), bridge(),
    ]
