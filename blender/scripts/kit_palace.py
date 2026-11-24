"""9–10 level: klassik uslubdagi saroy (ustunli portik, fronton, to'rt nishab tom). 10-levelda minorachalar, kupol va oltin hoshiya qo'shiladi."""
import math

from kit_core import M_DOOR, M_GLOW, M_ROOF, M_WALL, PLAIN, PLASTER, ROOF, STONE, WHITE, WOOD, Model
from kit_houses import TRIM, moulding
from kit_levels_low import lantern, planter

GOLD = '#d9a93f'
IVORY = '#f6eeda'


def classic_column(m: Model, x: float, y: float, z0: float, z1: float, r: float = 0.28, n: int = 8) -> None:
    m.cbox(x, y, z0, r * 2.6, r * 2.6, 0.3, STONE, '#e6dcc8')
    m.cyl(x, y, z0 + 0.3, z1 - 0.35, r, r * 0.84, n, PLASTER, IVORY, cap=False)
    m.cbox(x, y, z1 - 0.35, r * 2.6, r * 2.6, 0.35, STONE, TRIM, bottom=True)


def pediment(m: Model, x0: float, x1: float, y0: float, y1: float, z: float, h: float, color: str = IVORY) -> None:
    """Uchburchak fronton: old yuzasi y0 da, tomi orqaga (y1) boradi."""
    xm = (x0 + x1) / 2
    m.box(x0 - 0.2, y0 - 0.2, z, x1 + 0.2, y1, z + 0.35, STONE, TRIM, bottom=True)
    z += 0.35
    m.poly([(x0, y0, z), (x1, y0, z), (xm, y0, z + h)], PLASTER, color)
    for a, b in (((x0 - 0.3, y0 - 0.25), (x0 - 0.3, y1)), ((x1 + 0.3, y1), (x1 + 0.3, y0 - 0.25))):
        lo = [(a[0], a[1], z - 0.05), (b[0], b[1], z - 0.05)]
        m.poly([lo[1], lo[0], (xm, a[1], z + h + 0.12), (xm, b[1], z + h + 0.12)], ROOF, WHITE, M_ROOF)
        m.poly([lo[0], lo[1], (xm, b[1], z + h + 0.06), (xm, a[1], z + h + 0.06)], STONE, TRIM)


def balustrade(m: Model, x0: float, x1: float, y: float, z: float, n: int) -> None:
    for i in range(n + 1):
        m.cbox(x0 + (x1 - x0) * i / n, y, z, 0.16, 0.16, 0.55, STONE, TRIM)
    m.box(x0 - 0.1, y - 0.12, z + 0.55, x1 + 0.1, y + 0.12, z + 0.7, STONE, TRIM, bottom=True)


def palace(name: str) -> Model:
    m = Model(name)
    m.box(-6.9, -6, 0, 6.9, 6, 0.6, STONE, '#e6dcc8')
    m.box(-6.2, -3.6, 0.6, 6.2, 5.6, 6.8, PLASTER, WHITE, M_WALL, top=False)
    m.box(-6.3, -3.7, 0.6, 6.3, 5.7, 1.2, STONE, '#d9cfbd', top=False)
    m.box(-6.35, -3.75, 3.9, 6.35, 5.75, 4.15, STONE, TRIM, bottom=True)
    m.box(-6.6, -4.0, 6.8, 6.6, 6.0, 7.2, STONE, TRIM, bottom=True)
    m.hip(-6.3, -3.7, 6.3, 5.7, 7.2, 2.0, 0.15)
    for x in (-3.6, 3.6):
        m.cbox(x, 2.2, 7.9, 0.8, 0.8, 1.5, STONE, '#cbbfa9')
        # tomdagi derazacha
        m.box(x - 0.6, -2.9, 7.4, x + 0.6, -1.2, 8.3, PLASTER, WHITE, M_WALL, top=False)
        m.window('f', -2.9, x - 0.35, x + 0.35, 7.6, 8.2)
        m.hip(x - 0.6, -2.9, x + 0.6, -0.6, 8.3, 0.5, 0.12)
    # burchak ustunlari
    for x in (-6.2, 6.2):
        for y in (-3.6, 5.6):
            m.cbox(x, y, 1.2, 0.55, 0.55, 5.6, STONE, TRIM)
    # portik
    for x in (-3.4, -2.05, 2.05, 3.4):
        classic_column(m, x, -5.35, 0.6, 6.4, 0.3)
    m.box(-4.0, -5.75, 6.4, 4.0, -3.6, 6.8, STONE, TRIM, bottom=True)
    pediment(m, -4.0, 4.0, -5.75, -2.6, 6.8, 1.5)
    m.cyl(0, -5.79, 7.75, 7.76, 0.0, 0.0, 3)
    m.panel([(-1.3, -3.66, 0.6), (1.3, -3.66, 0.6), (1.3, -3.66, 4.0), (-1.3, -3.66, 4.0)], WOOD, '#c79a6a', M_DOOR)
    m.box(-1.6, -3.75, 4.0, 1.6, -3.6, 4.3, STONE, TRIM, bottom=True)
    m.box(-0.05, -3.72, 0.6, 0.05, -3.6, 4.0, PLAIN, '#5a3a22')
    for s in (-1, 1):
        for x in (2.0, 4.4):
            a, b = sorted((s * x, s * (x + 1.2)))
            m.window('f', -3.6, a, b, 1.5, 3.6)
            m.window('f', -3.6, a, b, 4.7, 6.3)
            moulding(m, a - 0.15, b + 0.15, -3.6, 3.65, 0.18)
        for y in (-2.6, 0.2, 3.0):
            side = 'r' if s > 0 else 'l'
            m.window(side, s * 6.2, y, y + 1.4, 1.5, 3.6)
            m.window(side, s * 6.2, y, y + 1.4, 4.7, 6.3)
        balustrade(m, *sorted((s * 4.3, s * 6.6)), -5.6, 0.6, 4)
        lantern(m, s * 1.9, -3.6, 2.6)
        planter(m, s * 5.2, -6.3, 0, 1.4)
    for x in (-4.8, -1.9, 1.0, 3.7):
        m.window('b', 5.6, x, x + 1.3, 1.5, 3.6)
        m.window('b', 5.6, x, x + 1.3, 4.7, 6.3)
    for i in range(3):
        m.box(-2.0 - i * 0.2, -6.1 - i * 0.35, 0, 2.0 + i * 0.2, -5.6, 0.6 - i * 0.18, STONE, '#d8cbb5')
    return m


def cone_tower(m: Model, x: float, y: float) -> None:
    m.cyl(x, y, 0, 7.6, 0.95, 0.85, 10, PLASTER, IVORY, cap=False)
    for z in (4.0, 7.4):
        m.cyl(x, y, z, z + 0.25, 1.05, 1.05, 10, PLAIN, GOLD)
    m.cyl(x, y, 7.65, 9.6, 1.15, 0.0, 10, ROOF, WHITE, M_ROOF)
    m.cyl(x, y, 9.5, 10.1, 0.1, 0.0, 5, PLAIN, GOLD)
    m.window('f', y - 0.92, x - 0.3, x + 0.3, 4.9, 6.2)


def grand_palace(name: str) -> Model:
    m = palace(name)
    for s in (-1, 1):
        cone_tower(m, s * 6.15, -5.1)
        cone_tower(m, s * 5.9, 5.0)
        # oltin hoshiya va bayroqlar
        x0, x1 = sorted((s * 4.0, s * 6.6))
        m.box(x0, -4.08, 7.0, x1, -3.98, 7.2, PLAIN, GOLD, bottom=True)
        m.cyl(s * 3.9, -5.6, 8.0, 10.2, 0.06, 0.05, 5, PLAIN, GOLD)
        flag = [(s * 3.9, -5.6, 9.4), (s * 3.9 + 1.1, -5.6, 9.3), (s * 3.9 + 1.1, -5.6, 10.0), (s * 3.9, -5.6, 10.1)]
        m.poly(flag, PLAIN, '#2f6f9f')
        m.poly(flag[::-1], PLAIN, '#2f6f9f')
        classic_column(m, s * 2.7, -5.35, 0.6, 6.4, 0.3)
        planter(m, s * 3.4, -6.45, 0, 1.4, '#e5785f')
        m.cbox(s * 2.75, -6.6, 0, 0.5, 0.5, 1.4, STONE, IVORY)
        m.cbox(s * 2.75, -6.6, 1.4, 0.3, 0.3, 0.4, PLAIN, '#ffe2a0', M_GLOW)
    m.box(-4.0, -5.8, 6.72, 4.0, -5.7, 6.84, PLAIN, GOLD, bottom=True)
    # markaziy kupol
    m.cyl(0, 1, 8.6, 10.0, 1.9, 1.8, 12, PLASTER, IVORY, cap=False)
    for i in range(6):
        a = 2 * math.pi * i / 6 - math.pi / 2
        m.cbox(math.cos(a) * 1.86, 1 + math.sin(a) * 1.86, 8.8, 0.35, 0.35, 1.1, PLAIN, '#ffe2a0', M_GLOW)
    m.cyl(0, 1, 10.0, 10.25, 2.05, 2.05, 12, PLAIN, GOLD)
    m.dome(0, 1, 10.25, 1.85, 12, 4, PLAIN, '#f3eee2', height=0.95)
    m.cyl(0, 1, 11.95, 12.9, 0.16, 0.0, 6, PLAIN, GOLD)
    m.box(-0.8, -7.0, 0, 0.8, -5.6, 0.64, PLAIN, '#9c2b34')
    return m
