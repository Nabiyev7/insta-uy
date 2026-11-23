"""Markaz binolari: 3 davlat binosi (milliy uslub) va 12 burchak minorasining yangi ko'rinishlari (zamonaviy).

Old tomoni -Y. Minoralar 1 masshtabda BASE_HEIGHT balandlikda, instance `sy` bilan cho'ziladi.
"""
import math

from kit_core import (CARVED, COARSE, CONCRETE, FACADE, GLASS, M_GLOW, M_NONE, M_SOFT, M_WALL, NAQSH, PLAIN, PLASTER, STONE, WHITE, Model)
from kit_houses import TRIM

IVORY = '#f7f1e3'
SAND = '#e2c08e'  # och qumrang: qizil g'isht teksturasi to'q qilib yuborgani uchun suvoq ustida
BLUE = '#2a8fb0'
GOLD = '#d9a93f'
LAMP = '#ffe2a0'
WOOD_DARK = '#9a6a3c'
FACE = 12.0


def pillar(m: Model, x: float, y: float, z0: float, z1: float, r: float, color: str = IVORY, n: int = 8) -> None:
    m.cbox(x, y, z0, r * 2.8, r * 2.8, 0.5, STONE, '#e6dcc8')
    m.cyl(x, y, z0 + 0.5, z1 - 0.6, r, r * 0.85, n, PLASTER, color, cap=False)
    m.cbox(x, y, z1 - 0.6, r * 2.8, r * 2.8, 0.6, STONE, TRIM, bottom=True)


def stairs(m: Model, half: float, y: float, z: float, n: int, depth: float = 0.7) -> None:
    """Old zinapoya: y — zinaning yuqori cheti, pastga -Y tomon tushadi."""
    for i in range(n):
        top = z * (n - i) / (n + 1)
        m.box(-half - i * 0.3, y - depth * (i + 1), 0, half + i * 0.3, y - depth * i, top, STONE, '#ddd2bd')


def band(m: Model, x0: float, y0: float, x1: float, y1: float, z: float, h: float) -> None:
    """Bino atrofidagi ko'k naqsh tasma."""
    step = h * 2
    for a, b, fixed, axis in ((x0, x1, y0 - 0.06, 'f'), (x1, x0, y1 + 0.06, 'b'), (y1, y0, x0 - 0.06, 'l'), (y0, y1, x1 + 0.06, 'r')):
        n = max(1, round(abs(b - a) / step / 2))
        for i in range(n):
            u0, u1 = a + (b - a) * i / n, a + (b - a) * (i + 1) / n
            p = [(u, fixed) if axis in 'fb' else (fixed, u) for u in (u0, u1)]
            (ax, ay), (bx, by) = p
            q = [(ax, ay, z), (bx, by, z), (bx, by, z + h), (ax, ay, z + h)]
            m.panel(q, NAQSH)


def rows(m: Model, axis: str, at: float, centres: list[float], half: float, floors: list[tuple[float, float]]) -> None:
    for z0, z1 in floors:
        for c in centres:
            m.window(axis, at, c - half, c + half, z0, z1)


def spire(m: Model, x: float, y: float, z: float, h: float) -> None:
    m.cyl(x, y, z, z + h * 0.3, 0.35, 0.35, 6, PLAIN, GOLD)
    m.cyl(x, y, z + h * 0.3, z + h, 0.25, 0.0, 6, PLAIN, GOLD)


def prezident() -> Model:
    """50×36 m, 3 qavat, 8 ustunli ayvon, katta ko'k gumbaz (uchi 34 m)."""
    m = Model('prezident', FACE)
    m.box(-25, -14.2, 0, 25, 18, 1.6, STONE, '#e6dcc8')
    stairs(m, 15, -14.2, 1.6, 5)
    m.box(-24, -9, 1.6, 24, 17, 18.6, PLASTER, IVORY, top=False)
    m.box(-24.2, -9.2, 1.6, 24.2, 17.2, 3.0, STONE, '#d9cfbd', top=False)
    band(m, -24, -9, 24, 17, 16.9, 1.4)
    m.box(-25, -10, 18.6, 25, 18, 19.6, STONE, TRIM, bottom=True)
    m.box(-24.4, -9.4, 19.6, 24.4, 17.4, 20.6, PLASTER, IVORY, top_layer=CONCRETE)
    # ayvon
    for i in range(8):
        pillar(m, -14 + i * 4, -12.8, 1.6, 15.4, 0.75)
    m.box(-16, -14, 15.4, 16, -9, 17.2, PLASTER, IVORY, bottom=True)
    for i in range(10):
        a = -15.6 + i * 3.12
        m.panel([(a, -14.06, 15.6), (a + 3.12, -14.06, 15.6), (a + 3.12, -14.06, 17.0), (a, -14.06, 17.0)], NAQSH)
    m.box(-16.5, -14.4, 17.2, 16.5, -8.8, 18.0, STONE, TRIM, bottom=True)
    # peshtoq darvozasi
    m.box(-4.4, -9.6, 1.6, 4.4, -9, 13.6, PLASTER, TRIM)
    m.panel([(-3.8, -9.66, 9.0), (3.8, -9.66, 9.0), (3.8, -9.66, 13.0), (-3.8, -9.66, 13.0)], NAQSH)
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.05, s * 2.4))
        m.panel([(x0, -9.66, 1.6), (x1, -9.66, 1.6), (x1, -9.66, 8.4), (x0, -9.66, 8.4)], CARVED)
        m.cbox(s * 3.2, -9.9, 6, 0.5, 0.5, 1.0, PLAIN, LAMP, M_GLOW)
    floors = [(3.6, 7.0), (8.6, 12.0), (13.2, 16.2)]
    rows(m, 'f', -9, [-21, -17.6, -12, -8, 8, 12, 17.6, 21], 1.1, floors)
    rows(m, 'b', 17, [-21, -15, -9, -3, 3, 9, 15, 21], 1.2, floors)
    for axis, at in (('l', -24), ('r', 24)):
        rows(m, axis, at, [-6, -1, 4, 9, 14], 1.2, floors)
    # gumbaz
    m.cyl(0, 4, 20.6, 22.2, 9.4, 9.0, 16, PLASTER, IVORY, cap=False)
    m.cyl(0, 4, 22.2, 24.6, 8.4, 8.4, 16, NAQSH, WHITE, cap=False)
    m.cyl(0, 4, 24.6, 25.2, 8.9, 8.9, 16, PLAIN, LAMP, M_GLOW)
    m.dome(0, 4, 25.0, 8.2, 16, 5, PLAIN, BLUE, M_SOFT, 0.98)
    spire(m, 0, 4, 33.0, 1.6)
    for s in (-1, 1):
        m.cyl(s * 18, 4, 20.6, 22.4, 3.2, 3.2, 10, NAQSH, WHITE, cap=False)
        m.dome(s * 18, 4, 22.4, 3.2, 10, 3, PLAIN, BLUE, M_SOFT, 0.95)
        spire(m, s * 18, 4, 25.3, 1.2)
    return m


def prezident_lod() -> Model:
    m = Model('prezident_lod', COARSE)
    m.box(-25, -14.2, 0, 25, 18, 1.6, STONE, '#e6dcc8')
    m.box(-24, -9, 1.6, 24, 17, 20.6, PLASTER, IVORY, top_layer=CONCRETE)
    m.box(-16, -14, 15.4, 16, -9, 18, PLASTER, IVORY, bottom=True)
    for i in range(4):
        m.cyl(-14 + i * 9.3, -12.8, 1.6, 15.4, 0.8, 0.8, 4, PLASTER, IVORY, cap=False)
    m.window('f', -9, -22, 22, 4, 15)
    m.cyl(0, 4, 20.6, 25, 8.4, 8.4, 8, NAQSH, WHITE, cap=False)
    m.dome(0, 4, 25, 8.2, 8, 3, PLAIN, BLUE, M_SOFT, 0.98)
    return m


def clock(m: Model, axis: str, at: float, z: float, r: float) -> None:
    """Minora soati: oq siferblat (tunda yonadi) va ikki mil."""
    def pt(u: float, v: float, out: float) -> tuple[float, float, float]:
        return {'f': (u, at - out, z + v), 'b': (-u, at + out, z + v), 'l': (at - out, -u + 4, z + v), 'r': (at + out, u + 4, z + v)}[axis]

    n = 12
    ring = [(math.cos(2 * math.pi * i / n) * r, math.sin(2 * math.pi * i / n) * r) for i in range(n)]
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]
        m.poly([pt(0, 0, 0.1), pt(a[0], a[1], 0.1), pt(b[0], b[1], 0.1)], PLAIN, '#fff4d8', M_GLOW)
    for (u, v), w in (((0.0, 1.3), 0.14), ((0.9, 0.5), 0.18)):
        d = math.hypot(u, v)
        px, py = -v / d * w, u / d * w
        m.poly([pt(-px, -py, 0.16), pt(px, py, 0.16), pt(u + px, v + py, 0.16), pt(u - px, v - py, 0.16)][::-1], PLAIN, '#2b2b2e')
        m.poly([pt(-px, -py, 0.16), pt(px, py, 0.16), pt(u + px, v + py, 0.16), pt(u - px, v - py, 0.16)], PLAIN, '#2b2b2e')


def hokimiyat() -> Model:
    """46×32 m, 3 qavat, qumrang g'isht, soat minorasi (30 m)."""
    m = Model('hokimiyat', FACE)
    m.box(-23, -12.6, 0, 23, 16, 1.2, STONE, '#d9cfbd')
    stairs(m, 12, -12.6, 1.2, 4)
    m.box(-22, -8, 1.2, 22, 15, 16.4, PLASTER, SAND, top=False)
    m.box(-22.2, -8.2, 1.2, 22.2, 15.2, 2.4, STONE, '#cbbfa9', top=False)
    m.box(-22.8, -8.8, 16.4, 22.8, 15.8, 17.2, STONE, TRIM, bottom=True)
    m.box(-22.3, -8.3, 17.2, 22.3, 15.3, 18.0, PLASTER, SAND, top_layer=CONCRETE)
    band(m, -22, -8, 22, 15, 15.2, 1.1)
    for z in (6.7, 11.4):
        m.box(-22.15, -8.15, z, 22.15, 15.15, z + 0.45, STONE, TRIM, top=True, bottom=True)
    # ayvon — 6 ustun
    for i in range(6):
        pillar(m, -10 + i * 4, -11.4, 1.2, 10.6, 0.6, TRIM)
    m.box(-12, -12.4, 10.6, 12, -8, 12.0, PLASTER, TRIM, bottom=True)
    for i in range(8):
        a = -11.6 + i * 2.9
        m.panel([(a, -12.46, 10.75), (a + 2.9, -12.46, 10.75), (a + 2.9, -12.46, 11.85), (a, -12.46, 11.85)], NAQSH)
    m.box(-12.5, -12.8, 12.0, 12.5, -7.8, 12.5, STONE, '#cbbfa9', bottom=True)
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.05, s * 1.8))
        m.panel([(x0, -8.1, 1.2), (x1, -8.1, 1.2), (x1, -8.1, 6.2), (x0, -8.1, 6.2)], CARVED)
        m.cbox(s * 2.6, -8.4, 4.4, 0.4, 0.4, 0.8, PLAIN, LAMP, M_GLOW)
    floors = [(2.9, 5.9), (7.7, 10.6), (12.2, 14.8)]
    rows(m, 'f', -8, [-19.5, -16, -8, -5, 5, 8, 16, 19.5], 1.0, floors)
    rows(m, 'f', -8, [-12.4, 12.4], 1.0, floors)
    rows(m, 'b', 15, [-18, -12, -6, 0, 6, 12, 18], 1.2, floors)
    for axis, at in (('l', -22), ('r', 22)):
        rows(m, axis, at, [-4.5, 0, 4.5, 9, 13], 1.0, floors)
    # deraza ustidagi naqsh
    for c in (-19.5, -16, 16, 19.5):
        for z in (6.0, 10.7):
            m.panel([(c - 1.2, -8.08, z), (c + 1.2, -8.08, z), (c + 1.2, -8.08, z + 0.6), (c - 1.2, -8.08, z + 0.6)], NAQSH)
    # soat minorasi
    m.box(-4.2, -0.2, 18.0, 4.2, 8.2, 26.2, PLASTER, SAND, top=False)
    for x in (-4.2, 4.2):
        for y in (-0.2, 8.2):
            m.cbox(x, y, 18.0, 0.9, 0.9, 8.6, STONE, TRIM)
    m.box(-4.8, -0.8, 26.2, 4.8, 8.8, 26.9, STONE, TRIM, bottom=True)
    for axis, at in (('f', -0.2), ('b', 8.2), ('l', -4.2), ('r', 4.2)):
        clock(m, axis, at, 22.6, 2.4)
    m.cyl(0, 4, 26.9, 27.5, 3.4, 3.4, 12, NAQSH, WHITE, cap=False)
    m.dome(0, 4, 27.4, 3.2, 12, 3, PLAIN, BLUE, M_SOFT, 0.75)
    spire(m, 0, 4, 29.7, 1.2)
    return m


def hokimiyat_lod() -> Model:
    m = Model('hokimiyat_lod', COARSE)
    m.box(-23, -12.6, 0, 23, 16, 1.2, STONE, '#d9cfbd')
    m.box(-22, -8, 1.2, 22, 15, 18, PLASTER, SAND, top_layer=CONCRETE)
    m.box(-12, -12.4, 10.6, 12, -8, 12.5, PLASTER, TRIM, bottom=True)
    m.window('f', -8, -20, 20, 3, 14.5)
    m.window('b', 15, -20, 20, 3, 14.5)
    m.box(-4.2, -0.2, 18, 4.2, 8.2, 26.9, PLASTER, SAND)
    m.dome(0, 4, 26.9, 3.2, 6, 2, PLAIN, BLUE, M_SOFT, 0.9)
    return m


def sud() -> Model:
    """44×30 m, 2 qavat, oq tosh, oldida 10 ustun, tekis tom ustida naqsh friz."""
    m = Model('sud', FACE)
    white = '#f2efe8'
    m.box(-22, -12.4, 0, 22, 15, 1.8, STONE, '#e6e1d6')
    stairs(m, 20, -12.4, 1.8, 4)
    m.box(-21, -6.6, 1.8, 21, 14, 13.2, STONE, white, top=False)
    for i in range(10):
        pillar(m, -18.9 + i * 4.2, -10.6, 1.8, 12.2, 0.7, white)
    m.box(-21.4, -12.2, 12.2, 21.4, 14.4, 13.4, STONE, white, bottom=True)
    band(m, -21.2, -12.0, 21.2, 14.2, 13.4, 1.5)
    m.box(-21.2, -12.0, 13.4, 21.2, 14.2, 14.9, STONE, white, top=False)
    m.box(-21.7, -12.4, 14.9, 21.7, 14.7, 15.5, STONE, TRIM, bottom=True, top_layer=CONCRETE)
    m.box(-8, -12.2, 15.5, 8, -10.8, 16.0, STONE, white)
    for s in (-1, 1):
        x0, x1 = sorted((s * 0.05, s * 1.7))
        m.panel([(x0, -6.7, 1.8), (x1, -6.7, 1.8), (x1, -6.7, 7.0), (x0, -6.7, 7.0)], CARVED)
        m.cbox(s * 2.6, -7.0, 5, 0.4, 0.4, 0.8, PLAIN, LAMP, M_GLOW)
    floors = [(3.2, 6.6), (8.2, 11.6)]
    rows(m, 'f', -6.6, [-18.9, -14.7, -10.5, -6.3, 6.3, 10.5, 14.7, 18.9], 1.1, floors)
    rows(m, 'f', -6.6, [-1.9, 1.9], 1.1, floors[1:])
    rows(m, 'b', 14, [-18, -12, -6, 0, 6, 12, 18], 1.2, floors)
    for axis, at in (('l', -21), ('r', 21)):
        rows(m, axis, at, [-4, 1, 6, 11], 1.2, floors)
    return m


def sud_lod() -> Model:
    m = Model('sud_lod', COARSE)
    m.box(-22, -12.4, 0, 22, 15, 1.8, STONE, '#e6e1d6')
    m.box(-21, -6.6, 1.8, 21, 14, 13, STONE, '#f2efe8', top=False)
    m.box(-21.4, -12.2, 12.2, 21.4, 14.4, 15.5, STONE, '#f2efe8', bottom=True, top_layer=CONCRETE)
    for i in range(5):
        m.cyl(-18.9 + i * 9.45, -10.6, 1.8, 12.2, 0.7, 0.7, 4, STONE, '#f2efe8', cap=False)
    m.window('f', -6.6, -20, 20, 3, 11.5)
    return m


def glass_box(m: Model, half: float, z0: float, z1: float, color: str, mask: float = M_NONE) -> None:
    m.box(-half, -half, z0, half, half, z1, GLASS, color, mask, top=False)


def bank() -> Model:
    """Minora 48 m: 2 qavat tosh asos, to'q ko'k-yashil shisha, pog'onali toj."""
    m = Model('bank', FACE)
    glass = '#2f8c86'
    m.box(-12, -12, 0, 12, 12, 8, STONE, '#d9cfbd', top_layer=CONCRETE)
    m.box(-12.3, -12.3, 7.6, 12.3, 12.3, 8.3, STONE, TRIM, bottom=True)
    for x in (-9, -6, 6, 9):
        m.window('f', -12, x - 1.1, x + 1.1, 1, 6.6)
        for axis, at in (('l', -12), ('r', 12), ('b', 12)):
            m.window(axis, at, x - 1.1, x + 1.1, 1, 6.6)
    m.window('f', -12, -3, 3, 0.2, 5)
    m.box(-5, -13.9, 5.2, 5, -12, 5.7, CONCRETE, '#3a3f45', bottom=True)
    for x in (-4.6, 4.6):
        m.cyl(x, -13.5, 0, 5.2, 0.25, 0.25, 6, PLAIN, '#c9c9cc', cap=False)
    m.box(-5, -13.95, 5.7, 5, -13.8, 6.4, PLAIN, LAMP, M_GLOW)
    glass_box(m, 10.2, 8, 40, glass)
    for s in (-1, 1):
        for t in (-1, 1):
            m.cbox(s * 10.1, t * 10.1, 8, 1.1, 1.1, 32.6, CONCRETE, '#e9e4da')
    for z in (18.6, 29.2):
        m.box(-10.4, -10.4, z, 10.4, 10.4, z + 0.6, CONCRETE, '#e9e4da', top=False)
    # pog'onali toj
    for i, half in enumerate((10.6, 8.4, 6.0)):
        z = 40 + i * 2.4
        m.box(-half, -half, z, half, half, z + 2.4, CONCRETE if i % 2 == 0 else GLASS, '#e9e4da' if i % 2 == 0 else glass, bottom=i == 0)
        m.box(-half, -half - 0.08, z + 2.0, half, -half + 0.1, z + 2.3, PLAIN, LAMP, M_GLOW)
    m.cyl(0, 0, 47.2, 48, 0.4, 0.1, 5, PLAIN, GOLD)
    return m


def agentlik() -> Model:
    """Past-o'rta bino 32 m: beton ramka, shisha, yonida rangli vertikal panel."""
    m = Model('agentlik', FACE)
    glass_box(m, 10.4, 0, 30.4, '#9fc4d8')
    for s in (-1, 1):
        for t in (-1, 0, 1):
            m.cbox(s * 10.6, t * 10.6, 0, 1.2, 1.2, 31, CONCRETE, '#ece7dd')
            if t == 0:
                m.cbox(0, s * 10.6, 0, 1.2, 1.2, 31, CONCRETE, '#ece7dd')
    for i in range(5):
        z = 4.6 + i * 5.2
        m.box(-11.1, -11.1, z, 11.1, 11.1, z + 0.8, CONCRETE, '#ece7dd', top=True, bottom=True)
    m.box(-11.3, -11.3, 30.4, 11.3, 11.3, 31.2, CONCRETE, '#ece7dd', bottom=True)
    m.cbox(3, 2, 31.2, 6, 6, 0.8, CONCRETE, '#cfc5b3')
    # rangli panel (rangi instance'dan)
    m.box(11.2, -8, 2, 11.9, -2, 31.6, PLAIN, WHITE, M_WALL, bottom=True)
    m.box(-8, -11.9, 24.5, -2, -11.2, 29, PLAIN, WHITE, M_WALL, bottom=True)
    m.box(-4, -14, 3.6, 4, -11, 4.0, CONCRETE, '#3a3f45', bottom=True)
    m.window('f', -10.4, -3, 3, 0.2, 3.5)
    return m


def novostroyka() -> Model:
    """Turar-joy 56 m: fasad, balkon chiziqlari, pastda vitrina."""
    m = Model('novostroyka', FACE)
    m.box(-12, -9.5, 0, 12, 9.5, 4.4, GLASS, '#bcd6de', top_layer=CONCRETE)
    for x in (-12, -4, 4, 12):
        m.cbox(x, -9.5, 0, 0.8, 0.8, 4.4, CONCRETE, '#ece7dd')
    m.box(-12.6, -10.6, 4.4, 12.6, 10, 5.0, CONCRETE, '#3a3f45', bottom=True)
    m.box(-11.4, -9, 5, 11.4, 9, 53, FACADE, WHITE, M_WALL, top=False)
    for x in (-7.6, 7.6):
        m.box(x - 2.4, -10.3, 5, x + 2.4, -9, 53, PLASTER, WHITE, M_WALL, top=True)
        for i in range(8):
            z = 6.2 + i * 5.9
            m.box(x - 2.6, -11.2, z, x + 2.6, -10.2, z + 1.1, GLASS, '#d5e6ea', bottom=True)
    m.box(-2, -9.4, 5, 2, -9, 55, GLASS, '#8fb3c0')
    m.box(-11.8, -9.4, 53, 11.8, 9.4, 54, CONCRETE, '#ece7dd', bottom=True)
    m.cbox(-5, 1, 54, 5, 6, 2, PLASTER, '#cfc5b3')
    m.cbox(5, 1, 54, 5, 6, 2, PLASTER, '#cfc5b3')
    return m


def all_center() -> list[Model]:
    return [prezident(), hokimiyat(), sud(), prezident_lod(), hokimiyat_lod(), sud_lod(), bank(), agentlik(), novostroyka()]
