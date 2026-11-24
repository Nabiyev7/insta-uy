"""4–5 levellar (zamonaviy bosqich) — uslub-v2.blend dagi "Uy L4" va "Uy L5". Old tomoni -Y, hovli 24×34 m; garaj o'qi x = 7.68 (avtomobil yo'li bilan bir chiziqda)."""
from kit_core import BASE, COARSE, CURB, M_DOOR, M_GLOW, M_NONE, M_ROOF, M_WALL, PLAIN, PLASTER, WHITE, Model
from kit_style import UV_FRAME, UV_GLASS, _mapped, _wall_box, _wall_point, bush, flower_bed, frame_box

TIMBER, TIMBER_DARK = '#9a6438', '#7e4f2b'
FLAT_ROOF = '#cfcfcf'  # yassi tom: tom rangidan to'qroq
LIP = '#dadada'
GARAGE_DOOR, GROOVE = '#eae5dd', '#beb9b1'
DARK_DOOR = '#373d43'
PLINTH = '#a59c91'
SLAB = '#f2ece2'
GLASS_RAIL = '#cde7f2'
LAMP = '#ffe9a8'


def pane(m: Model, axis: str, at: float, c: float, z0: float, w: float, h: float, mullions: int = 1) -> None:
    """Ramkali katta oyna (ramkasi uy egasi tanlagan rangda)."""
    half = w / 2
    frame_box(m, *_wall_box(m, axis, at, c - half, c + half, 0, 0.1, z0, z0 + h))
    g = half - 0.1

    def quad(u0: float, u1: float, d: float, uv: list, mask: float) -> None:
        pts = [_wall_point(axis, at, u, d, z) for u, z in ((u0, z0 + 0.1), (u1, z0 + 0.1), (u1, z0 + h - 0.1), (u0, z0 + h - 0.1))]
        _mapped(m, pts if axis in 'fr' else pts[::-1], uv, mask)

    quad(c - g, c + g, 0.13, UV_GLASS, M_GLOW)
    for i in range(mullions):
        u = c - half + w * (i + 1) / (mullions + 1)
        quad(u - 0.045, u + 0.045, 0.16, UV_FRAME, M_NONE)


def hip_roof(m: Model, x0: float, y0: float, x1: float, y1: float, z: float, h: float, over: float, t: float = 0.22) -> None:
    """Qalin qirrali to'rt nishabli tom."""
    m.box(x0 - over, y0 - over, z, x1 + over, y1 + over, z + t, PLAIN, LIP, M_ROOF, bottom=True, top=False)
    m.hip(x0, y0, x1, y1, z + t, h, over)


def slats(m: Model, x0: float, x1: float, y: float, z0: float, z1: float, step: float = 0.45) -> None:
    """Yog'och qoplama: taxta va reykalar."""
    m.box(x0, y - 0.1, z0, x1, y, z1, PLAIN, TIMBER, bottom=True)
    n = round((x1 - x0) / step)
    for i in range(n):
        x = x0 + (i + 0.5) * (x1 - x0) / n
        m.poly([(x - 0.07, y - 0.13, z0), (x + 0.07, y - 0.13, z0), (x + 0.07, y - 0.13, z1), (x - 0.07, y - 0.13, z1)], PLAIN, TIMBER_DARK)


def front_door(m: Model, c: float, y: float, z: float, w: float, h: float) -> None:
    m.panel([(c - w / 2, y - 0.17, z), (c + w / 2, y - 0.17, z), (c + w / 2, y - 0.17, z + h), (c - w / 2, y - 0.17, z + h)], PLAIN, DARK_DOOR, M_DOOR)
    m.cbox(c + w * 0.36, y - 0.21, z + 0.9, 0.08, 0.08, 0.5, PLAIN, '#d6d3cd')


def back_door(m: Model, c: float, y: float) -> None:
    m.panel([(c + 0.6, y + 0.06, 0.55), (c - 0.6, y + 0.06, 0.55), (c - 0.6, y + 0.06, 2.9), (c + 0.6, y + 0.06, 2.9)], PLAIN, DARK_DOOR, M_DOOR)
    m.box(c - 0.9, y, 0, c + 0.9, y + 0.9, 0.4, PLAIN, BASE)


def wall_lamp(m: Model, x: float, y: float, z: float) -> None:
    m.cbox(x, y - 0.1, z, 0.2, 0.2, 0.32, PLAIN, LAMP, M_GLOW)


def porch(m: Model, x0: float, x1: float, y: float, depth: float, z: float) -> None:
    m.bevel = 0.04
    m.box(x0, y - depth, 0, x1, y, z, PLAIN, BASE)
    m.bevel = 0.0
    m.box(x0 + 0.4, y - depth - 0.75, 0, x1 - 0.4, y - depth, z * 0.5, PLAIN, CURB)


def garage(m: Model, x0: float, x1: float, y0: float, y1: float, h: float, door: float) -> None:
    m.bevel = 0.06
    m.box(x0, y0, 0, x1, y1, h, PLASTER, WHITE, M_WALL, top=False)
    m.bevel = 0.0
    m.box(x0, y0 - 0.2, h, x1 + 0.15, y1 + 0.2, h + 0.28, PLAIN, FLAT_ROOF, M_ROOF, bottom=True)
    mid = (x0 + x1) / 2
    m.box(mid - door / 2, y0 - 0.1, 0.05, mid + door / 2, y0, h - 0.5, PLAIN, GARAGE_DOOR)
    for i in range(1, 5):
        z = 0.05 + (h - 0.55) * i / 5
        m.poly([(mid - door / 2, y0 - 0.12, z), (mid + door / 2, y0 - 0.12, z), (mid + door / 2, y0 - 0.12, z + 0.06), (mid - door / 2, y0 - 0.12, z + 0.06)], PLAIN, GROOVE)
    for s in (-1, 1):
        wall_lamp(m, mid + s * (door / 2 + 0.22), y0, h - 0.75)
    for dy in (-1.7, 1.7):
        pane(m, 'r', x1, (y0 + y1) / 2 + dy, 1.4, 1.6, 1.1)
    pane(m, 'b', y1, mid, 1.4, 1.8, 1.1)


def stack(m: Model, x: float, y: float, z0: float, z1: float) -> None:
    m.bevel = 0.04
    m.cbox(x, y, z0, 0.9, 0.9, z1 - z0, PLAIN, PLINTH)
    m.bevel = 0.0


def pergola(m: Model, x0: float, x1: float, y0: float, y1: float, z: float) -> None:
    """Yog'och terassa va ustidagi pergola."""
    m.box(x0, y0, 0, x1, y1, 0.4, PLAIN, TIMBER)
    n = round((y1 - y0) / 0.55)
    for i in range(1, n):
        y = y0 + (y1 - y0) * i / n
        m.poly([(x0, y - 0.03, 0.42), (x1, y - 0.03, 0.42), (x1, y + 0.03, 0.42), (x0, y + 0.03, 0.42)], PLAIN, TIMBER_DARK)
    for k in (0.06, 0.5, 0.94):
        y = y0 + (y1 - y0) * k
        for x in (x0 + 0.2, x1 - 0.2):
            m.cbox(x, y, 0.4, 0.18, 0.18, z - 0.4, PLAIN, TIMBER_DARK, top=False)
        m.box(x0, y - 0.08, z, x1, y + 0.08, z + 0.2, PLAIN, TIMBER_DARK, bottom=True)
    for i in range(6):
        x = x0 + 0.15 + (x1 - x0 - 0.3) * i / 5
        m.box(x - 0.05, y0 + 0.2, z + 0.2, x + 0.05, y1 - 0.2, z + 0.32, PLAIN, TIMBER, bottom=True)


def level4() -> Model:
    """Bezakli uy: bir qavat, polgacha oynalar, yog'och kirish, garaj, terassa va pergola."""
    m = Model('house4', 6.0)
    x0, x1, y0, y1 = -8.7, 5.08, -5.0, 5.0
    m.box(x0 - 0.15, y0 - 0.15, 0, x1 + 0.15, y1 + 0.15, 0.6, PLAIN, PLINTH)
    m.bevel = 0.06
    m.box(x0, y0, 0.6, x1, y1, 4.1, PLASTER, WHITE, M_WALL, top=False)
    m.bevel = 0.0
    m.box(x0 - 0.12, y0 - 0.12, 3.95, x1 + 0.12, y1 + 0.12, 4.13, PLAIN, SLAB)
    hip_roof(m, x0, y0, x1, y1, 4.12, 2.0, 0.75)
    stack(m, 2.4, 1.6, 4.9, 6.9)
    # kirish
    slats(m, -1.8, 1.8, y0, 0.6, 3.95)
    front_door(m, 0, y0, 0.6, 1.8, 2.5)
    m.box(-2.2, y0 - 2.4, 3.75, 2.2, y0, 3.95, PLAIN, SLAB, bottom=True)
    porch(m, -1.7, 1.7, y0, 2.4, 0.45)
    for s in (-1, 1):
        wall_lamp(m, s * 1.35, y0 - 0.1, 2.3)
    pane(m, 'f', y0, -6.9, 0.75, 2.3, 2.9)
    pane(m, 'f', y0, -3.8, 0.75, 2.3, 2.9)
    pane(m, 'f', y0, 3.45, 1.3, 2.2, 1.7)
    for y in (-2.5, 2.2):
        pane(m, 'l', x0, y, 0.75, 2.2, 2.9)
    pane(m, 'r', x1, 3.3, 1.5, 1.6, 1.6)
    # orqa tomon
    for x in (-6.8, -3.4, 2.9):
        pane(m, 'b', y1, x, 1.2, 2.0, 1.9)
    back_door(m, -0.4, y1)
    garage(m, x1, 10.28, -6.5, 1.5, 3.1, 4.0)
    pergola(m, -11.2, x0 - 0.1, -4.7, 4.7, 3.1)
    for x, seed in ((-8.0, 1), (-6.8, 2), (-5.5, 1), (2.7, 2), (3.9, 1)):
        bush(m, x, y0 - 0.85, seed=seed)
    flower_bed(m, -4.2, y0 - 1.2, 3.2)
    return m


def level5() -> Model:
    """Katta uy: ikki qavat, shishali balkon, ikkinchi qavatda yog'och qoplama, ikki mashinalik garaj."""
    m = Model('house5', 7.0)
    x0, x1, y0, y1, up = -9.5, 4.5, -5.5, 5.5, -5.9
    m.box(x0 - 0.15, y0 - 0.15, 0, x1 + 0.15, y1 + 0.15, 0.6, PLAIN, PLINTH)
    m.bevel = 0.06
    m.box(x0, y0, 0.6, x1, y1, 3.9, PLASTER, WHITE, M_WALL, top=False)
    m.bevel = 0.0
    m.box(x0 - 0.12, up - 0.12, 3.9, x1 + 0.12, y1 + 0.12, 4.15, PLAIN, '#3c4551', bottom=True)
    m.bevel = 0.06
    m.box(x0, up, 4.15, x1, y1, 7.25, PLASTER, WHITE, M_WALL, top=False)
    m.bevel = 0.0
    hip_roof(m, x0, up, x1, y1, 7.25, 1.75, 0.7)
    stack(m, 1.9, 2.5, 7.6, 9.7)
    # 1-qavat old tomoni
    m.box(-1.8, y0 - 0.13, 0.6, 1.2, y0, 3.9, PLAIN, TIMBER)
    front_door(m, -0.3, y0, 0.6, 1.6, 2.6)
    for x in (-1.5, 0.9):
        wall_lamp(m, x, y0 - 0.13, 2.4)
    porch(m, -1.9, 1.3, y0, 2.2, 0.55)
    m.box(-2.2, y0 - 2.4, 3.5, 1.6, y0, 3.7, PLAIN, SLAB, bottom=True)
    pane(m, 'f', y0, -6.9, 0.75, 3.4, 3.0)
    pane(m, 'f', y0, 2.85, 1.2, 2.2, 2.0)
    # 2-qavat old tomoni: yog'och, balkon
    slats(m, -9.3, -4.7, up, 4.2, 7.22, 0.5)
    pane(m, 'f', up - 0.1, -7.0, 4.95, 1.8, 1.5)
    pane(m, 'f', up, -0.5, 4.2, 2.8, 2.8)
    pane(m, 'f', up, 2.9, 4.65, 2.0, 2.0)
    m.box(-2.6, up - 1.6, 4.1, 1.7, up, 4.28, PLAIN, CURB, bottom=True)
    for a, b, c, d in ((-2.6, up - 1.58, 1.7, up - 1.52), (-2.6, up - 1.6, -2.54, up), (1.64, up - 1.6, 1.7, up)):
        m.box(a, b, 4.28, c, d, 5.25, PLAIN, GLASS_RAIL)
        m.box(a, b, 5.25, c, d, 5.33, PLAIN, '#3c4551')
    # yon va orqa tomonlar: ikkala qavatda oynalar
    for y, w, h, z in ((-2.0, 2.6, 3.0, 0.75), (2.5, 2.0, 2.0, 1.2)):
        pane(m, 'l', x0, y, z, w, h)
    for y in (-2.0, 2.5):
        pane(m, 'l', x0, y, 4.65, 2.0, 2.0)
        pane(m, 'r', x1, y, 4.65, 2.0, 2.0)
    pane(m, 'r', x1, 4.0, 1.2, 1.6, 2.0)
    for x in (-7.6, -4.9, -2.0, 1.0, 3.3):
        pane(m, 'b', y1, x, 4.65, 1.7, 2.0)
    for x, w in ((-7.6, 2.0), (-1.4, 1.8), (2.4, 2.0)):
        pane(m, 'b', y1, x, 1.2, w, 2.0)
    back_door(m, -4.5, y1)
    garage(m, x1, 10.86, -5.5, 2.5, 3.2, 5.2)
    for x, seed in ((-8.8, 1), (-7.6, 2), (-5.2, 1), (2.0, 2), (3.2, 1)):
        bush(m, x, y0 - 0.9, seed=seed)
    flower_bed(m, -6.9, y0 - 2.0, 3.6)
    return m


def modern_lods() -> list[Model]:
    """Uzoqdan: 4 — past va keng, garaji bilan; 5 — ikki qavatli."""
    four = Model('house4_lod', COARSE)
    four.box(-8.7, -5, 0, 5.08, 5, 4.15, PLASTER, WHITE, M_WALL, top=False)
    four.hip(-8.7, -5, 5.08, 5, 4.15, 2.2, 0.75)
    four.box(5.08, -6.5, 0, 10.28, 1.5, 3.1, PLASTER, WHITE, M_WALL, top=False)
    four.box(5.08, -6.7, 3.1, 10.43, 1.7, 3.38, PLAIN, FLAT_ROOF, M_ROOF)
    four.box(-11.2, -4.7, 3.1, -8.7, 4.7, 3.3, PLAIN, TIMBER, bottom=True)
    four.window('f', -5, -8, -2.7, 0.8, 3.6)
    four.window('b', 5, -7.8, 3.9, 1.2, 3.1)
    four.box(5.7, -6.6, 0.05, 9.7, -6.5, 2.6, PLAIN, GARAGE_DOOR)
    five = Model('house5_lod', COARSE)
    five.box(-9.5, -5.6, 0, 4.5, 5.5, 7.4, PLASTER, WHITE, M_WALL, top=False)
    five.box(-9.62, -5.75, 3.9, 4.62, 5.62, 4.15, PLAIN, '#3c4551', top=False)
    five.hip(-9.5, -5.6, 4.5, 5.5, 7.3, 1.95, 0.7)
    five.box(4.5, -5.5, 0, 10.86, 2.5, 3.2, PLASTER, WHITE, M_WALL, top=False)
    five.box(4.5, -5.7, 3.2, 11.0, 2.7, 3.48, PLAIN, FLAT_ROOF, M_ROOF)
    five.box(-9.3, -5.75, 4.2, -4.7, -5.6, 7.2, PLAIN, TIMBER)
    five.window('f', -5.6, -8.6, -5.2, 0.8, 3.7)
    five.window('f', -5.6, -1.9, 3.8, 4.4, 6.8)
    five.window('b', 5.5, -8.4, 4.0, 4.6, 6.6)
    five.box(5.1, -5.6, 0.05, 10.3, -5.5, 2.7, PLAIN, GARAGE_DOOR)
    return [four, five]
