"""Juft levellar (2, 4, 6, 8, 10): asosiy uyning kuchaytirilgan ko'rinishi. Bo'yiga emas, hashamatga o'sadi."""
from kit_core import (BRICK, CARVED, CONCRETE, GLASS, LEAF, M_GLOW, M_ROOF, M_WALL, NAQSH, PLAIN, PLASTER, ROOF, SOIL, STONE, WHITE, WOOD, Model)
from kit_houses import TRIM, ayvon, frieze, house1, house2, house3, house4, house5, walls

GOLD = '#d9a93f'
LAMP = '#ffe2a0'
SHUTTER = '#2f6f72'


def shutters(m: Model, y: float, lo: float, hi: float, z0: float, z1: float, color: str = SHUTTER) -> None:
    """Old derazaning ikki yonidagi qopqalar."""
    for a, b in ((lo - 0.38, lo - 0.04), (hi + 0.04, hi + 0.38)):
        m.box(a, y - 0.1, z0, b, y, z1, WOOD, color)


def finial(m: Model, x: float, y: float, z: float, h: float = 0.8) -> None:
    """Tom uchidagi oltin qubba."""
    m.cyl(x, y, z, z + h * 0.35, 0.2, 0.2, 6, PLAIN, GOLD)
    m.cyl(x, y, z + h * 0.35, z + h, 0.14, 0.0, 6, PLAIN, GOLD)


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


def level2() -> Model:
    m = house1('house2')
    ayvon(m, 0.6, 4, -4.4, -2.6, 2.7, 3)
    m.poly([(0.9, -4.8, 2.95), (4.3, -4.8, 2.95), (4.3, -2.6, 3.25), (0.9, -2.6, 3.25)], ROOF, WHITE, M_ROOF)
    m.box(-4, -4.46, 2.5, 4, -4.4, 2.72, CARVED, WHITE, bottom=True)
    shutters(m, -2.6, 1.5, 3.1, 1.1, 2.4)
    # yon xona (oshxona)
    walls(m, 4, -0.8, 4.8, 3.0, 2.5)
    m.poly([(4, -1.0, 2.9), (5.0, -1.0, 2.45), (5.0, 3.2, 2.45), (4, 3.2, 2.9)], ROOF, WHITE, M_ROOF)
    m.window('r', 4.8, 0.4, 1.8, 1.0, 2.1)
    steps(m, -3.0, -1.8, -4.4, 0.35, 2)
    for x in (-3.2, 2.2):
        planter(m, x, -4.75, 0, 0.8)
    lantern(m, -1.5, -2.6, 2.1)
    return m


def level4() -> Model:
    m = house2('house4')
    frieze(m, 1.8, 5.5, -5, 2.78)
    for x in (1.75, 5.3):
        m.box(x - 0.08, -5.12, 0, x + 0.28, -4.8, 3.2, BRICK)
    shutters(m, -5, 2.7, 4.6, 1.0, 2.6)
    for a, b in ((-4.8, -3.2), (0, 1.4)):
        m.box(a - 0.15, -1.66, 2.66, b + 0.15, -1.5, 2.86, CARVED, WHITE, bottom=True)
    # shiypon — ochiq yozgi ayvon
    m.box(-5.6, -5.2, 0, -2.6, -3.6, 0.35, STONE, '#d8cbb5', top_layer=WOOD)
    for x in (-5.35, -2.85):
        m.column(x, -4.95, 0.35, 2.9)
    m.box(-5.6, -5.1, 2.9, -2.6, -4.8, 3.2, CARVED, WHITE, bottom=True)
    frieze(m, -5.6, -2.6, -5.1, 3.2, 0.3)
    m.hip(-5.6, -5.2, -2.6, -3.4, 3.46, 0.9, 0.35)
    finial(m, -4.1, -4.3, 4.6, 0.7)
    finial(m, -2.5, 1.5, 5.6)
    finial(m, 2.5, 1.5, 5.6)
    steps(m, -2.0, -0.8, -3.6, 0.35, 2)
    planter(m, 0.6, -3.95, 0, 1.0, '#e0b030')
    planter(m, 3.65, -5.45, 0, 1.6)
    for x in (-2.2, 2.2):
        lantern(m, x, -1.5 if x < 0 else -5, 2.2)
    return m


def level6() -> Model:
    m = house3('house6')
    # peshtoq: naqshli kirish darvozasi
    for s in (-1, 1):
        x0, x1 = sorted((s * 1.5, s * 2.5))
        m.box(x0, -5.1, 0, x1, -4.1, 5.0, STONE, '#efe4cf')
        m.panel([(x0 + 0.15, -5.15, 0.7), (x1 - 0.15, -5.15, 0.7), (x1 - 0.15, -5.15, 2.4), (x0 + 0.15, -5.15, 2.4)], NAQSH)
        m.panel([(x0 + 0.15, -5.15, 2.5), (x1 - 0.15, -5.15, 2.5), (x1 - 0.15, -5.15, 4.2), (x0 + 0.15, -5.15, 4.2)], NAQSH)
        lantern(m, s * 2.0, -5.1, 4.35)
    m.box(-2.5, -5.1, 3.7, 2.5, -4.1, 5.0, STONE, '#efe4cf', bottom=True)
    frieze(m, -1.5, 1.5, -5.1, 3.85, 0.95)
    m.box(-2.75, -5.3, 5.0, 2.75, -3.9, 5.3, CARVED, WHITE, bottom=True)
    for x in (-2.4, 0, 2.4):
        finial(m, x, -4.6, 5.3, 0.75 if x else 1.1)
    for s in (-1, 1):
        mid = s * 4.65
        shutters(m, -5.6, mid - 1, mid + 1, 1.0, 2.8, '#7a3b2a')
        m.box(mid - 1.5, -5.78, 2.82, mid + 1.5, -5.6, 2.98, CARVED, WHITE, bottom=True)
        frieze(m, mid - 1.75, mid + 1.75, -5.6, 0.6, 0.3)
        planter(m, mid, -5.95, 0, 2.2, '#e0b030')
        finial(m, s * 4.65, -3.0, 5.2)
        finial(m, s * 3.2, 1.8, 6.0)
    # tom ustidagi yorug'lik fonari
    m.cbox(0, 1.8, 5.4, 2.0, 1.6, 1.0, PLASTER, WHITE, M_WALL)
    m.window('f', 1.0, -0.8, 0.8, 5.5, 6.3)
    m.hip(-1.0, 1.0, 1.0, 2.6, 6.4, 0.6, 0.25)
    finial(m, 0, 1.8, 6.95)
    steps(m, -1.4, 1.4, -5.1, 0.35, 2)
    return m


def level8() -> Model:
    m = house4('house8')
    wood = '#9a6a3c'
    # shisha zal va tosh burchaklar
    m.panel([(3.3, -5.08, 0.35), (6.2, -5.08, 0.35), (6.2, -5.08, 3.15), (3.3, -5.08, 3.15)], GLASS)
    for x in (3.0, 6.25):
        m.box(x - 0.1, -5.2, 0, x + 0.35, -4.8, 3.4, STONE, '#cbbfa9')
    frieze(m, 3.0, 6.5, -5.1, 3.15, 0.3)
    frieze(m, -6.7, 3.0, -5.2, 3.3, 0.3)
    # ikkinchi qavat soyaboni: ayvon ustida
    for x in (-6.3, -3.3, -0.3, 2.6):
        m.cyl(x, -4.9, 3.6, 6.1, 0.14, 0.12, 6, WOOD, wood, cap=False)
    m.box(-6.75, -5.25, 6.1, 3.05, -5.0, 6.35, CARVED, WHITE, bottom=True)
    for i in range(9):
        x = -6.5 + i * 1.15
        m.box(x, -5.4, 6.35, x + 0.22, -2.0, 6.5, WOOD, wood, bottom=True)
    m.box(-6.65, -5.14, 4.45, 2.85, -4.96, 4.56, PLAIN, GOLD, bottom=True)
    for x in (-5.6, -2.0, 1.4):
        planter(m, x, -4.55, 3.6, 1.2)
    # yassi tomdagi bog'
    for y in (-1.6, 0.6, 2.8, 4.8):
        m.cbox(-5.7, y, 3.64, 1.4, 1.2, 0.4, STONE, '#e6dcc8', top_layer=SOIL)
        m.blob(-5.7, y, 4.35, 0.55, '#5d8a3c', int(y * 10) + 20, 0.9)
    # oltin qubbalar, mo'ri, chiroqlar
    finial(m, -1.2, 1.5, 8.35)
    finial(m, 1.6, 1.5, 8.35)
    m.cbox(3.6, 3.4, 6.6, 0.8, 0.8, 1.9, STONE, '#cbbfa9')
    for x in (-2.9, -0.2):
        lantern(m, x, -3, 2.3)
    steps(m, -3.0, -0.2, -5.2, 0.3, 2)
    for x in (-5.0, 1.6):
        planter(m, x, -5.5, 0, 1.6, '#e0b030')
    return m


def level10() -> Model:
    m = house5('house10')
    ivory = '#f6eeda'
    # bosh gumbaz belbog'i va oltin qubbasi
    m.cyl(0, 1, 8.2, 8.5, 2.85, 2.7, 12, PLAIN, GOLD)
    m.cyl(0, 1, 11.2, 13.0, 0.2, 0.0, 6, PLAIN, GOLD)
    for s in (-1, 1):
        # yon gumbazchalar
        m.cyl(s * 4.0, 1, 7.1, 7.8, 1.35, 1.35, 10, NAQSH, WHITE)
        m.dome(s * 4.0, 1, 7.8, 1.4, 10, 4, PLAIN, GOLD)
        finial(m, s * 4.0, 1, 9.3)
        # ikkinchi qavat kolonnadasi
        for x in (3.0, 4.2, 5.4):
            m.cyl(s * x, -5.35, 4.55, 6.5, 0.17, 0.13, 8, PLASTER, ivory, cap=False)
        x0, x1 = sorted((s * 2.4, s * 6.2))
        m.box(x0, -5.7, 6.5, x1, -3.6, 6.8, STONE, ivory, bottom=True)
        frieze(m, x0, x1, -5.7, 6.45, 0.35)
        m.box(x0, -5.75, 6.8, x1, -5.5, 6.95, PLAIN, GOLD)
        m.box(x0, -5.72, 5.1, x1, -5.62, 5.22, PLAIN, GOLD, bottom=True)
        # old burjlar — balandroq, oltin qubba
        m.cyl(s * 6.2, -5.3, 0, 8.0, 0.85, 0.75, 10, PLASTER, ivory)
        m.cyl(s * 6.2, -5.3, 4.2, 4.9, 0.95, 0.95, 10, NAQSH, WHITE, cap=False)
        m.cyl(s * 6.2, -5.3, 7.2, 8.0, 0.95, 0.95, 10, NAQSH, WHITE)
        m.dome(s * 6.2, -5.3, 8.0, 1.0, 10, 4, PLAIN, GOLD)
        finial(m, s * 6.2, -5.3, 9.05)
        m.dome(s * 5.9, 5.2, 7.8, 1.02, 8, 3, PLAIN, GOLD)
        # yon qanot lentalari
        m.box(*sorted((s * 6.18, s * 6.3))[:1], -3.6, 4.1, sorted((s * 6.18, s * 6.3))[1], 5.6, 4.4, PLAIN, GOLD, bottom=True)
        # bayroqlar
        m.cyl(s * 2.2, -4.6, 7.85, 10.4, 0.06, 0.05, 5, PLAIN, GOLD)
        flag = [(s * 2.2, -4.6, 9.5), (s * 2.2 + 1.2, -4.6, 9.4), (s * 2.2 + 1.2, -4.6, 10.1), (s * 2.2, -4.6, 10.2)]
        m.poly(flag, PLAIN, '#1f8fa5')
        m.poly(flag[::-1], PLAIN, '#1f8fa5')
        for x in (1.75, 2.6):
            lantern(m, s * x, -5.5 if x < 2.4 else -5.62, 3.4)
        planter(m, s * 3.8, -6.2, 0.6, 1.8)
        m.cbox(s * 2.7, -6.5, 0, 0.5, 0.5, 1.5, STONE, ivory)
        m.blob(s * 2.7, -6.5, 1.72, 0.26, GOLD, 3, 1, PLAIN)
    # peshtoq toji
    m.box(-2.0, -5.4, 7.85, 2.0, -3.8, 8.7, PLASTER, ivory)
    frieze(m, -2.0, 2.0, -5.4, 7.95, 0.65)
    m.box(-2.2, -5.55, 8.7, 2.2, -3.7, 8.95, PLAIN, GOLD, bottom=True)
    m.dome(0, -4.6, 8.95, 0.8, 10, 4)
    finial(m, 0, -4.6, 9.8, 1.0)
    # ark hoshiyasi va zina gilami
    for x in (-1.6, 1.5):
        m.box(x, -5.56, 0.6, x + 0.1, -5.44, 4.6, PLAIN, GOLD)
    m.box(-1.6, -5.56, 4.5, 1.6, -5.44, 4.65, PLAIN, GOLD, bottom=True)
    m.box(-0.8, -6.95, 0, 0.8, -5.5, 0.64, PLAIN, '#9c2b34')
    return m


def all_levels() -> list[Model]:
    """Uy levellari 1..10."""
    return [house1('house1'), level2(), house2('house3'), level4(), house3('house5'), level6(), house4('house7'), level8(), house5('house9'), level10()]
