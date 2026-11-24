"""1–3 levellar (yorug' uslub): kichik uy, L shaklidagi shinam uy, ikki qanotli hovli uy. Old tomoni -Y, hovli 24×34 m."""
from kit_core import BASE, COARSE, CURB, FRAME, M_ROOF, M_WALL, PLAIN, PLASTER, ROOF, WHITE, Model
from kit_style import bush, chimney, column, door, flower_bed, frame_box, gable, lantern, lean_to, steps, walls, window


def level1() -> Model:
    """Kichik uy — uslub-v2.blend dagi "Uy L1": 10,5×8,5 m, ikki nishabli tom, ustunli ayvoncha."""
    m = Model('house1', 5.0)
    walls(m, -5.25, -4.25, 5.25, 4.25, 3.55)
    gable(m, -5.25, -4.25, 5.25, 4.25, 3.55, 2.06)
    chimney(m, 3.0, 1.6, 4.4, 6.75)
    # ayvoncha
    m.bevel = 0.05
    m.box(-2.1, -6.65, 0, 2.1, -4.3, 0.45, PLAIN, BASE)
    m.bevel = 0.0
    steps(m, -1.1, 1.1, -6.65, 0.34, 1, 0.6)
    for x in (-1.8, 1.8):
        column(m, x, -6.4, 0.45, 2.95)
    lean_to(m, -2.1, 2.1, -4.25, -6.85, 3.55, 2.9)
    door(m, -4.25, 0, 0.5)
    for s in (-1, 1):
        window(m, 'f', -4.25, s * 3.3, 1.3, shutters=True)
        for y in (-1.9, 1.9):
            window(m, 'r' if s > 0 else 'l', s * 5.25, y, 1.3, cross=False)
        window(m, 'b', 4.25, s * 2.6, 1.3, cross=False)
        bush(m, s * 4.65, -4.95, seed=1)
        bush(m, s * 3.45, -4.95, seed=2)
        flower_bed(m, s * 3.4, -5.95, 2.4, 1 if s > 0 else 0)
    return m


def carport(m: Model, x0: float, x1: float, y0: float, y1: float, z: float) -> None:
    """Soyabonli mashina joyi: beton maydoncha, to'rt ustun, yengil tom."""
    m.box(x0, y0 - 1.6, 0, x1, y1, 0.08, PLAIN, CURB)
    for y in (y0 + 0.3, y1 - 0.3):
        m.cbox(x1 - 0.25, y, 0, 0.24, 0.24, z, PLAIN, FRAME)
    m.cbox(x0 + 0.2, y0 + 0.3, 0, 0.24, 0.24, z, PLAIN, FRAME)
    m.box(x0, y0, z, x1 + 0.3, y1, z + 0.16, PLAIN, FRAME, bottom=True)
    m.box(x0, y0 - 0.15, z + 0.16, x1 + 0.45, y1 + 0.15, z + 0.3, ROOF, WHITE, M_ROOF)


def level2() -> Model:
    """Shinam uy: 15×13 m, oldinga chiqqan qanoti (L shakl) va yonida soyabonli mashina joyi."""
    m = Model('house2', 5.0)
    walls(m, -8.6, -1.5, 6.4, 6.5, 3.6)
    walls(m, -8.6, -6.5, -2.8, -1.4, 3.6)
    gable(m, -8.6, -1.5, 6.4, 6.5, 3.6, 2.2)
    gable(m, -8.6, -6.5, -2.8, 2.2, 3.6, 1.9, 'y', trim=(True, False), ribs=3)
    window(m, 'f', -6.5, -5.7, 1.25, 2.4, 1.7, shutters=True)
    frame_box(m, -6.1, -6.56, 4.1, -5.3, -6.5, 4.75)
    chimney(m, 3.4, 4.0, 4.6, 7.0)
    # ayvon qanot yonida
    m.bevel = 0.05
    m.box(-2.6, -4.3, 0, 4.0, -1.6, 0.45, PLAIN, BASE)
    m.bevel = 0.0
    steps(m, -0.6, 1.4, -4.3, 0.36, 2)
    for x in (-0.9, 1.7, 3.7):
        column(m, x, -4.0, 0.45, 2.95)
    lean_to(m, -2.6, 4.0, -1.5, -4.5, 3.6, 2.9)
    door(m, -1.5, 0.4, 0.5, 1.2, 2.3)
    window(m, 'f', -1.5, -1.5, 1.3, 1.3, 1.5)
    window(m, 'f', -1.5, 2.8, 1.3, 1.6, 1.5)
    window(m, 'f', -1.5, 5.3, 1.3, 1.2, 1.5, cross=False)
    for y in (-4.4, 0.6, 4.2):
        window(m, 'l', -8.6, y, 1.3, cross=False)
    window(m, 'r', 6.4, 4.6, 1.3, cross=False)
    for x in (-5.6, -1.0, 3.6):
        window(m, 'b', 6.5, x, 1.3, cross=False)
    carport(m, 6.5, 9.4, -1.6, 4.6, 2.75)
    for x, y, seed in ((-8.0, -7.2, 1), (-3.4, -7.2, 2), (4.9, -2.2, 1), (6.0, -2.2, 2)):
        bush(m, x, y, seed=seed)
    flower_bed(m, -5.7, -7.2, 3.2)
    flower_bed(m, 2.8, -5.2, 2.2, 1)
    lantern(m, -0.6, -1.5, 2.1)
    return m


def dormer(m: Model, x: float, y: float, z: float) -> None:
    """Tomdagi mansarda oynasi."""
    m.box(x - 1.1, y, z, x + 1.1, y + 2.6, z + 1.4, PLASTER, WHITE, M_WALL, top=False)
    gable(m, x - 1.1, y, x + 1.1, y + 3.0, z + 1.4, 0.8, 'y', over=0.25, ribs=0, trim=(True, False))
    window(m, 'f', y, x, z + 0.25, 1.2, 1.05)


def level3() -> Model:
    """Hovli uy: 17×14 m, ikki qanot, o'rtada keng veranda, tomda mansarda oynasi."""
    m = Model('house3', 5.0)
    walls(m, -8.5, -1.2, 8.5, 7.0, 3.8)
    walls(m, -8.5, -6.8, -3.6, -1.1, 3.8)
    walls(m, 3.6, -6.8, 8.5, -1.1, 3.8)
    gable(m, -8.5, -1.2, 8.5, 7.0, 3.8, 2.7, ribs=5)
    for x0, x1 in ((-8.5, -3.6), (3.6, 8.5)):
        mid = (x0 + x1) / 2
        gable(m, x0, -6.8, x1, 2.4, 3.8, 1.75, 'y', trim=(True, False), ribs=3)
        window(m, 'f', -6.8, mid, 1.25, 2.2, 1.8, shutters=True)
        frame_box(m, mid - 0.45, -6.86, 4.25, mid + 0.45, -6.8, 4.8)
        flower_bed(m, mid, -7.5, 3.0, 1 if x0 > 0 else 0)
        for x in (x0 + 0.5, x1 - 0.5):
            bush(m, x, -7.5, seed=1 if x > mid else 2)
    dormer(m, 0, 0.6, 4.3)
    chimney(m, -5.2, 4.2, 5.4, 7.8)
    chimney(m, 5.2, 4.2, 5.4, 7.8)
    # veranda
    m.bevel = 0.05
    m.box(-3.5, -5.0, 0, 3.5, -1.2, 0.5, PLAIN, BASE)
    m.bevel = 0.0
    steps(m, -1.5, 1.5, -5.0, 0.42, 2)
    for x in (-3.1, -1.2, 1.2, 3.1):
        column(m, x, -4.7, 0.5, 3.15, 0.15)
    for x0, x1 in ((-3.1, -1.2), (1.2, 3.1)):
        m.box(x0, -4.74, 1.15, x1, -4.66, 1.25, PLAIN, FRAME, bottom=True)
        for i in range(1, 4):
            m.cbox(x0 + (x1 - x0) * i / 4, -4.7, 0.5, 0.08, 0.08, 0.65, PLAIN, FRAME, top=False)
    lean_to(m, -3.5, 3.5, -1.2, -5.2, 3.8, 3.1, over=0.05)
    door(m, -1.2, 0, 0.55, 1.6, 2.4)
    for s in (-1, 1):
        window(m, 'f', -1.2, s * 2.2, 1.3, 1.4, 1.6)
        lantern(m, s * 1.15, -1.2, 2.2)
        for y in (-4.4, 0.8, 4.6):
            window(m, 'r' if s > 0 else 'l', s * 8.5, y, 1.35, cross=False)
        window(m, 'b', 7.0, s * 5.2, 1.35, cross=False)
    window(m, 'b', 7.0, 0, 1.35, 2.0, 1.6)
    return m


def _far_wing(m: Model, x0: float, y0: float, x1: float, y1: float, h: float, roof: float) -> None:
    m.box(x0, y0, 0, x1, y1, h, PLASTER, WHITE, M_WALL, top=False)
    m.gable_y(x0, y0, x1, y1, h, roof)


def first_lods() -> list[Model]:
    """Uzoqdan: 1 — to'rtburchak, 2 — L shakl va soyabon, 3 — U shakl va mansarda."""
    one = Model('house1_lod', COARSE)
    one.box(-5.25, -4.25, 0, 5.25, 4.25, 3.6, PLASTER, WHITE, M_WALL, top=False)
    one.gable(-5.25, -4.25, 5.25, 4.25, 3.55, 2.2, 0.6)
    one.box(-2.2, -6.7, 2.9, 2.2, -4.2, 3.2, ROOF, WHITE, M_ROOF, bottom=True)
    one.window('f', -4.25, -4, 4, 1.1, 2.9)
    two = Model('house2_lod', COARSE)
    two.box(-8.6, -1.5, 0, 6.4, 6.5, 3.7, PLASTER, WHITE, M_WALL, top=False)
    two.gable(-8.6, -1.5, 6.4, 6.5, 3.6, 2.4, 0.6)
    _far_wing(two, -8.6, -6.5, -2.8, 1.5, 3.6, 2.0)
    two.box(-2.6, -4.5, 2.95, 4.2, -1.5, 3.2, ROOF, WHITE, M_ROOF, bottom=True)
    two.box(6.5, -1.8, 2.75, 9.8, 4.7, 3.05, ROOF, WHITE, M_ROOF, bottom=True)
    two.window('f', -6.5, -7.2, -4.2, 1.1, 2.9)
    two.window('f', -1.5, -2, 6, 1.1, 2.9)
    three = Model('house3_lod', COARSE)
    three.box(-8.5, -1.2, 0, 8.5, 7, 3.9, PLASTER, WHITE, M_WALL, top=False)
    three.gable(-8.5, -1.2, 8.5, 7, 3.8, 2.9, 0.6)
    for x0, x1 in ((-8.5, -3.6), (3.6, 8.5)):
        _far_wing(three, x0, -6.8, x1, 2, 3.8, 1.9)
        three.window('f', -6.8, x0 + 1, x1 - 1, 1.1, 3)
    three.box(-3.5, -5.2, 3.1, 3.5, -1.2, 3.5, ROOF, WHITE, M_ROOF, bottom=True)
    three.box(-1.1, 0.6, 4.4, 1.1, 2.6, 5.9, PLASTER, WHITE, M_WALL)
    return [one, two, three]


def first_levels() -> list[Model]:
    return [level1(), level2(), level3()]
