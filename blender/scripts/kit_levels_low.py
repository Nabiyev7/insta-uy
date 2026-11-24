"""6-level va umumiy bo'laklar (1–3 — kit_first.py, 4–5 — kit_modern.py). Oltin rang yo'q (u 7-leveldan)."""
from kit_core import BRICK, M_GLOW, M_ROOF, M_WALL, PLAIN, PLASTER, ROOF, SOIL, STONE, WHITE, WOOD, Model
from kit_first import first_levels
from kit_houses import TRIM, house3, moulding, walls
from kit_modern import level4, level5

COPPER = '#b0623a'
LAMP = '#ffe2a0'
SHUTTER = '#5e8fa8'
SHUTTER_RED = '#5e8fa8'
SCALE = 1.2  # eski uylardan shuncha keng


def shutters(m: Model, y: float, lo: float, hi: float, z0: float, z1: float, color: str = SHUTTER) -> None:
    """Old derazaning ikki yonidagi qopqalar."""
    for a, b in ((lo - 0.38, lo - 0.04), (hi + 0.04, hi + 0.38)):
        m.box(a, y - 0.1, z0, b, y, z1, WOOD, color)


def finial(m: Model, x: float, y: float, z: float, h: float = 0.8, color: str = COPPER) -> None:
    """Tom uchidagi qubba."""
    m.cyl(x, y, z, z + h * 0.35, 0.2, 0.2, 6, PLAIN, color)
    m.cyl(x, y, z + h * 0.35, z + h, 0.14, 0.0, 6, PLAIN, color)


def lantern(m: Model, x: float, y: float, z: float) -> None:
    """Devor chirog'i — tunda yonadi."""
    m.cbox(x, y - 0.14, z, 0.18, 0.18, 0.3, PLAIN, LAMP, M_GLOW)
    m.cbox(x, y - 0.14, z + 0.3, 0.28, 0.28, 0.08, PLAIN, '#2b2b2e')


def planter(m: Model, x: float, y: float, z: float, w: float = 0.9, bloom: str = '#d2477a') -> None:
    m.cbox(x, y, z, w, 0.5, 0.45, STONE, '#e6dcc8', top_layer=SOIL)
    m.blob(x - w * 0.2, y, z + 0.6, 0.28, '#5d8a3c', 5, 0.8)
    m.blob(x + w * 0.2, y, z + 0.62, 0.26, '#6f9440', 6, 0.8)
    m.blob(x, y - 0.1, z + 0.74, 0.14, bloom, 7, 1, PLAIN)


def steps(m: Model, x0: float, x1: float, y: float, z: float, n: int = 3) -> None:
    for i in range(n):
        m.box(x0 - i * 0.12, y - 0.3 * (i + 1), 0, x1 + i * 0.12, y - 0.3 * i, z * (n - i) / (n + 1), STONE, '#d8cbb5')


def side_windows(m: Model, half: float, ys: tuple[float, ...], w: float, z0: float, z1: float) -> None:
    """Ikki yon devorga bir xil derazalar."""
    for y in ys:
        m.window('r', half, y, y + w, z0, z1)
        m.window('l', -half, y, y + w, z0, z1)


def side_room(m: Model, side: int, half: float, y0: float, y1: float, depth: float = 1.6) -> None:
    """Yon xona (oshxona): pastroq, o'z tomi bilan."""
    x0, x1 = sorted((side * half, side * (half + depth)))
    walls(m, x0, y0, x1, y1, 2.5)
    inner, outer = side * half, side * (half + depth + 0.25)
    top, low = 2.95, 2.45
    pts = [(inner, y0 - 0.2, top), (outer, y0 - 0.2, low), (outer, y1 + 0.2, low), (inner, y1 + 0.2, top)]
    m.poly(pts if side > 0 else pts[::-1], ROOF, WHITE, M_ROOF)
    mid = (y0 + y1) / 2
    m.window('r' if side > 0 else 'l', side * (half + depth), mid - 0.7, mid + 0.7, 1.0, 2.1)


def hood(m: Model, y: float, lo: float, hi: float, z: float) -> None:
    """Deraza ustidagi o'yma peshtoqcha."""
    m.box(lo - 0.18, y - 0.18, z, hi + 0.18, y, z + 0.18, WOOD, '#b98a5c', bottom=True)


def big_house(name: str) -> Model:
    """6-level asosi: ikki qanotli, o'rtasi ayvonli uy."""
    m = house3(name)
    m.stretch(SCALE, SCALE)
    side_windows(m, 7.68, (2.9,), 1.6, 1.0, 2.8)
    m.window('b', 6.0, 5.9, 7.0, 1.0, 2.8)
    for s in (-1, 1):
        mid = s * 5.58
        shutters(m, -6.72, mid - 1.2, mid + 1.2, 1.0, 2.8, SHUTTER_RED)
        m.box(mid - 2.0, -6.9, 0.2, mid + 2.0, -6.72, 0.42, STONE, '#d8cbb5')
    return m


def level6() -> Model:
    m = big_house('house6')
    # ustunli kirish portiki va fronton
    for x in (-2.7, -1.1, 1.1, 2.7):
        m.cbox(x, -5.7, 0, 0.6, 0.6, 0.35, STONE, '#e6dcc8')
        m.cyl(x, -5.7, 0.35, 3.8, 0.26, 0.22, 8, PLASTER, '#f6eeda', cap=False)
        m.cbox(x, -5.7, 3.8, 0.6, 0.6, 0.25, STONE, TRIM, bottom=True)
    m.box(-3.2, -6.1, 4.05, 3.2, -4.9, 4.45, STONE, TRIM, bottom=True)
    m.poly([(-3.2, -6.1, 4.45), (3.2, -6.1, 4.45), (0, -6.1, 5.5)], PLASTER, '#f6eeda')
    for a in (-3.4, 3.4):
        p = [(a, -6.25, 4.4), (a, -3.4, 4.4), (0, -3.4, 5.6), (0, -6.25, 5.6)]
        m.poly(p if a > 0 else p[::-1], ROOF, WHITE, M_ROOF)
    for s in (-1, 1):
        lantern(m, s * 1.9, -1.68, 2.4)
    for s in (-1, 1):
        mid = s * 5.58
        hood(m, -6.72, mid - 1.5, mid + 1.5, 2.84)
        moulding(m, mid - 2.1, mid + 2.1, -6.72, 0.6, 0.3)
        planter(m, mid, -7.1, 0, 2.4, '#e5785f')
        finial(m, mid, -3.6, 5.2)
        finial(m, s * 3.8, 2.2, 6.0)
        side_room(m, s, 7.68, -1.2, 2.2, 0.9)
    # tom ustidagi yorug'lik fonari
    m.cbox(0, 2.2, 5.4, 2.4, 1.9, 1.0, PLASTER, WHITE, M_WALL)
    m.window('f', 1.25, -0.9, 0.9, 5.5, 6.3)
    m.hip(-1.2, 1.25, 1.2, 3.15, 6.4, 0.6, 0.25)
    finial(m, 0, 2.2, 6.95)
    steps(m, -1.7, 1.7, -6.1, 0.35, 2)
    return m


def low_levels() -> list[Model]:
    return [*first_levels(), level4(), level5(), level6()]
