"""1–6 levellar: 25×34 m hovliga mo'ljallangan, bo'yiga o'smaydigan bir qavatli uylar. Oltin rang yo'q (u 7-leveldan)."""
from kit_core import BRICK, M_GLOW, M_ROOF, M_WALL, PLAIN, PLASTER, ROOF, SOIL, STONE, WHITE, WOOD, Model
from kit_houses import TRIM, ayvon, house1, house2, house3, moulding, walls

COPPER = '#b0623a'
LAMP = '#ffe2a0'
SHUTTER = '#2f6f72'
SHUTTER_RED = '#7a3b2a'
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


def small_house(name: str) -> Model:
    """1- va 2-level asosi: nishab tomli uy, ayvoni bilan."""
    m = house1(name)
    m.stretch(SCALE, SCALE)
    side_windows(m, 4.8, (2.0,), 1.3, 1.1, 2.4)
    for x in (-3.7, 2.1):
        m.window('b', 4.08, x, x + 1.4, 1.1, 2.4)
    steps(m, -3.7, -2.1, -5.28, 0.35, 2)
    shutters(m, -3.12, 1.8, 3.72, 1.1, 2.4)
    return m


def level1() -> Model:
    m = small_house('house1')
    lantern(m, -1.9, -3.12, 2.1)
    # o'tin uyumi va suv bochkasi
    for i, z in ((0, 0), (1, 0), (2, 0), (0.5, 0.26), (1.5, 0.26)):
        m.box(4.9, 0.2 + i * 0.3, z, 5.7, 0.46 + i * 0.3, z + 0.26, WOOD, '#8a6238')
    m.cyl(4.2, -3.7, 0, 0.9, 0.36, 0.36, 8, WOOD, '#5f7f8a')
    return m


def level2() -> Model:
    m = small_house('house2')
    # old qanot: tepadan qaraganda L shakl
    walls(m, 1.1, -6.4, 4.8, -3.0, 3.05)
    m.hip(1.1, -6.4, 4.8, -2.0, 3.07, 2.0, 0.5)
    m.window('f', -6.4, 2.1, 3.8, 1.0, 2.45)
    shutters(m, -6.4, 2.1, 3.8, 1.0, 2.45)
    hood(m, -6.4, 2.1, 3.8, 2.5)
    m.window('r', 4.8, -5.6, -4.2, 1.1, 2.4)
    side_room(m, 1, 4.8, -0.9, 3.4, 1.1)
    side_room(m, -1, 4.8, -0.2, 3.4, 1.0)
    moulding(m, -4.8, 1.1, -5.32, 3.0, 0.3)
    m.cbox(-2.6, 1.8, 3.7, 0.7, 0.7, 1.6, BRICK)
    for x in (-4.2, 0.2):
        planter(m, x, -5.75, 0, 0.9)
    lantern(m, -1.9, -3.12, 2.1)
    lantern(m, 1.5, -6.4, 2.2)
    return m


def courtyard_house(name: str) -> Model:
    """3- va 4-level asosi: katta qanotli, to'rt nishab tomli uy."""
    m = house2(name)
    m.stretch(SCALE, SCALE)
    side_windows(m, 6.6, (3.4,), 1.4, 1.1, 2.6)
    m.window('b', 5.4, -6.0, -4.9, 1.1, 2.6)
    steps(m, -2.5, -0.9, -4.32, 0.35, 2)
    shutters(m, -6.0, 3.24, 5.52, 1.0, 2.6)
    m.cbox(4.6, 2.6, 4.2, 0.7, 0.7, 1.6, BRICK)
    return m


def level3() -> Model:
    m = courtyard_house('house3')
    hood(m, -6.0, 3.24, 5.52, 2.64)
    for x in (-5.2, 0.8):
        planter(m, x, -4.75, 0, 0.9)
    lantern(m, -0.6, -1.8, 2.2)
    return m


def level4() -> Model:
    m = courtyard_house('house4')
    moulding(m, 2.16, 6.6, -6.0, 2.78)
    for x in (2.1, 6.36):
        m.box(x - 0.08, -6.14, 0, x + 0.34, -5.76, 3.2, BRICK)
    for a, b in ((-5.76, -3.84), (0, 1.68)):
        hood(m, -1.8, a, b, 2.66)
    side_room(m, -1, 6.6, 0.4, 4.6, 1.4)
    # shiypon — ochiq yozgi ayvon
    m.box(-6.7, -6.3, 0, -3.1, -4.32, 0.35, STONE, '#d8cbb5', top_layer=WOOD)
    for x in (-6.4, -3.4):
        m.column(x, -6.0, 0.35, 2.9)
    m.box(-6.7, -6.2, 2.9, -3.1, -5.85, 3.2, WOOD, '#b98a5c', bottom=True)
    moulding(m, -6.7, -3.1, -6.2, 3.2, 0.3)
    m.hip(-6.7, -6.3, -3.1, -4.1, 3.46, 1.0, 0.35)
    finial(m, -4.9, -5.2, 4.7, 0.7)
    finial(m, -3.0, 1.8, 5.6)
    finial(m, 3.0, 1.8, 5.6)
    planter(m, 0.7, -4.75, 0, 1.0, '#e5785f')
    planter(m, 4.4, -6.5, 0, 1.6)
    lantern(m, -2.7, -1.8, 2.2)
    lantern(m, 2.6, -6.0, 2.2)
    return m


def big_house(name: str) -> Model:
    """5- va 6-level asosi: ikki qanotli, o'rtasi ayvonli uy."""
    m = house3(name)
    m.stretch(SCALE, SCALE)
    side_windows(m, 7.68, (2.9,), 1.6, 1.0, 2.8)
    m.window('b', 6.0, 5.9, 7.0, 1.0, 2.8)
    for s in (-1, 1):
        mid = s * 5.58
        shutters(m, -6.72, mid - 1.2, mid + 1.2, 1.0, 2.8, SHUTTER_RED)
        m.box(mid - 2.0, -6.9, 0.2, mid + 2.0, -6.72, 0.42, STONE, '#d8cbb5')
    return m


def level5() -> Model:
    m = big_house('house5')
    steps(m, -1.5, 1.5, -4.8, 0.35, 3)
    for x in (-2.6, 2.6):
        planter(m, x, -5.2, 0, 1.0)
    for s in (-1, 1):
        hood(m, -6.72, s * 5.58 - 1.2, s * 5.58 + 1.2, 2.84)
        lantern(m, s * 1.6, -1.68, 2.4)
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
    return [level1(), level2(), level3(), level4(), level5(), level6()]
