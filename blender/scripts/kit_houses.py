"""Umumiy uslubdagi uylar. Old tomoni -Y (glTF: +Z). Bu asosiy shakllar; levellar kit_levels*.py da."""
from kit_core import BRICK, COARSE, CONCRETE, FACADE, GLASS, M_GLOW, M_ROOF, M_WALL, PLAIN, PLASTER, ROOF, STONE, WHITE, WOOD, Model

TRIM = '#f3ead8'


def moulding(m, x0, x1, y, z, h=0.35):
    """Old devordagi oddiy karniz (bo'rtma hoshiya)."""
    m.box(x0, y - 0.09, z, x1, y, z + h, STONE, TRIM, bottom=True)


def walls(m, x0, y0, x1, y1, h, base=BRICK):
    m.box(x0 - 0.06, y0 - 0.06, 0, x1 + 0.06, y1 + 0.06, 0.6, base, '#d9c7b4')
    m.box(x0, y0, 0.6, x1, y1, h, PLASTER, WHITE, M_WALL, top=False)


def ayvon(m, x0, x1, y0, y1, h, cols):
    """Ustunli ayvon: yog'och pol va o'yma ustunlar."""
    m.box(x0, y0, 0, x1, y1, 0.35, STONE, '#d8cbb5', top_layer=WOOD)
    for i in range(cols):
        m.column(x0 + 0.3 + (x1 - x0 - 0.6) * i / max(1, cols - 1), y0 + 0.3, 0.35, h)
    m.box(x0, y0 + 0.12, h, x1, y0 + 0.45, h + 0.3, WOOD, '#b98a5c', bottom=True)


def house1(name):
    m = Model(name)
    walls(m, -4, -2.6, 4, 3.4, 3.0)
    ayvon(m, -4, 0.6, -4.4, -2.6, 2.7, 3)
    m.door(-2.4, -2.6)
    m.window('f', -2.6, -1.2, 0.2, 1.1, 2.4)
    m.window('f', -2.6, 1.5, 3.1, 1.1, 2.4)
    m.window('r', 4, -0.6, 0.8, 1.1, 2.4)
    m.window('l', -4, -0.4, 1.0, 1.1, 2.4)
    m.window('b', 3.4, -1, 0.6, 1.1, 2.4)
    m.poly([(-4.3, -4.8, 2.95), (0.9, -4.8, 2.95), (0.9, -2.6, 3.25), (-4.3, -2.6, 3.25)], ROOF, WHITE, M_ROOF)
    m.gable(-4, -2.6, 4, 3.4, 3.0, 1.9)
    m.cbox(2.2, 1.5, 3.6, 0.6, 0.6, 1.6, BRICK)
    return m


def house2(name):
    m = Model(name)
    walls(m, -5.5, -1.5, 5.5, 4.5, 3.2)
    walls(m, 1.8, -5, 5.5, -1.5, 3.2)
    ayvon(m, -5.5, 1.8, -3.6, -1.5, 2.9, 4)
    moulding(m, -5.5, 1.8, -3.48, 3.2)
    m.door(-1.4, -1.5)
    for a, b in ((-4.8, -3.2), (0, 1.4)):
        m.window('f', -1.5, a, b, 1.1, 2.6)
    m.window('f', -5, 2.7, 4.6, 1.0, 2.6)
    for y in (-3.8, 1.2):
        m.window('r', 5.5, y, y + 1.5, 1.1, 2.6)
    m.window('l', -5.5, 0.8, 2.3, 1.1, 2.6)
    for x in (-3.6, 0, 3):
        m.window('b', 4.5, x, x + 1.4, 1.1, 2.6)
    m.poly([(-5.9, -4.1, 3.45), (1.8, -4.1, 3.45), (1.8, -1.5, 3.75), (-5.9, -1.5, 3.75)], ROOF, WHITE, M_ROOF)
    m.hip(-5.5, -1.5, 5.5, 4.5, 3.2, 2.2)
    m.hip(1.8, -5, 5.5, -0.5, 3.22, 1.7, 0.5)
    m.cbox(-3, 2.4, 4, 0.7, 0.7, 1.7, BRICK)
    return m


def house3(name):
    m = Model(name)
    walls(m, -6.4, -1.4, 6.4, 5, 3.5)
    for s in (-1, 1):
        x0, x1 = sorted((s * 6.4, s * 2.9))
        walls(m, x0, -5.6, x1, -1.4, 3.5)
        moulding(m, x0, x1, -5.6, 3.0)
        m.window('f', -5.6, (x0 + x1) / 2 - 1, (x0 + x1) / 2 + 1, 1.0, 2.8)
        m.hip(x0, -5.6, x1, -0.4, 3.52, 1.8, 0.55)
        for y in (-4.4, 0.4):
            m.window('r' if s > 0 else 'l', s * 6.4, y, y + 1.6, 1.0, 2.8)
        m.box(x0 - 0.1, -5.75, 0, x0 + 0.35, -5.4, 3.5, BRICK)
        m.box(x1 - 0.35, -5.75, 0, x1 + 0.1, -5.4, 3.5, BRICK)
    ayvon(m, -2.9, 2.9, -4.0, -1.4, 3.2, 4)
    moulding(m, -2.9, 2.9, -3.88, 3.5, 0.4)
    m.poly([(-2.9, -4.5, 3.9), (2.9, -4.5, 3.9), (2.9, -1.4, 4.2), (-2.9, -1.4, 4.2)], ROOF, WHITE, M_ROOF)
    m.door(0, -1.4, 1.6, 2.6)
    for x in (-2.5, 1.1):
        m.window('f', -1.4, x, x + 1.4, 1.0, 2.8)
    for x in (-5, -2, 1, 3.6):
        m.window('b', 5, x, x + 1.4, 1.0, 2.8)
    m.hip(-6.4, -1.4, 6.4, 5, 3.5, 2.6)
    m.cbox(4, 2.5, 4.6, 0.8, 0.8, 1.9, BRICK)
    m.cbox(-4, 2.5, 4.6, 0.8, 0.8, 1.9, BRICK)
    return m


def house4(name):
    m = Model(name)
    walls(m, -6.5, -3, 3, 5.4, 3.4, STONE)
    walls(m, 3, -5, 6.5, 5.4, 3.4, STONE)
    m.box(-4.5, -2, 3.4, 5, 5, 6.4, PLASTER, WHITE, M_WALL, top=False)
    # ikkinchi qavat ayvoni
    m.box(-6.7, -5.2, 3.3, 3, -3, 3.6, CONCRETE, TRIM, bottom=True)
    for x in (-6.3, -3.3, -0.3, 2.6):
        m.column(x, -4.9, 0.2, 3.3, 0.2, TRIM, PLASTER)
        m.cbox(x, -5.05, 3.6, 0.2, 0.2, 1.0, STONE, TRIM)
    m.box(-6.6, -5.1, 4.3, 2.8, -5.0, 4.45, WOOD, '#b98a5c', bottom=True)
    m.box(-6.7, -5.2, 0, 3, -3, 0.2, STONE, '#d8cbb5')
    m.door(-1.6, -3, 1.8, 2.7)
    m.window('f', -3, -5.8, -3.2, 0.7, 3.0)
    m.window('f', -3, 0, 2.4, 0.7, 3.0)
    m.window('f', -5, 3.6, 5.9, 0.7, 3.0)
    m.window('f', -2, -3.9, -1.5, 3.7, 6.0)
    m.window('f', -2, -0.8, 1.6, 3.7, 6.0)
    m.window('f', -2, 2.3, 4.4, 4.2, 5.8)
    for y in (-3.5, 0, 3):
        m.window('r', 6.5, y, y + 1.8, 0.9, 2.9)
        m.window('l', -6.5, y + 0.8, y + 2.2, 0.9, 2.9)
    for x in (-5, -1.5, 2, 4.4):
        m.window('b', 5.4, x, x + 1.6, 0.9, 2.9)
        if x > -4 and x < 4:
            m.window('b', 5, x, x + 1.6, 4.1, 5.8)
    moulding(m, -4.5, 5, -2, 6.05, 0.35)
    m.hip(-4.5, -2, 5, 5, 6.4, 2.0, 0.8)
    m.hip(3, -5, 6.5, 5.4, 3.42, 1.2, 0.5)
    m.poly([(-6.9, -3.2, 3.62), (-4.5, -3.2, 3.62), (-4.5, 5.7, 3.62), (-6.9, 5.7, 3.62)], CONCRETE, TRIM)
    return m


def lod(name, body, h, roof_h, gable=False, wing=None, portico=False, grand=False):
    """Uzoqdagi sodda shakl. body/wing = (x0, y0, x1, y1)."""
    m = Model(name, COARSE)
    x0, y0, x1, y1 = body
    m.box(x0, y0, 0, x1, y1, h, PLASTER, '#e9e2d4', M_WALL, top=False)
    (m.gable if gable else m.hip)(x0, y0, x1, y1, h, roof_h, 0.4)
    if wing:
        a, b, c, d = wing
        wh = min(h, 3.4)
        m.box(a, b, 0, c, d, wh, PLASTER, '#e9e2d4', M_WALL, top=False)
        m.hip(a, b, c, d, wh, roof_h * 0.75, 0.4)
    if portico:
        m.box(-4, y0 - 1.9, h - 0.6, 4, y0, h, STONE, TRIM, bottom=True)
        for x in (-3.4, 3.4):
            m.cyl(x, y0 - 1.5, 0, h - 0.6, 0.35, 0.3, 4, PLASTER, TRIM, cap=False)
    if grand:
        for s in (-1, 1):
            m.cyl(s * (x1 - 0.2), y0 - 1.2, 0, h + 0.6, 0.95, 0.85, 5, PLASTER, TRIM, cap=False)
            m.cyl(s * (x1 - 0.2), y0 - 1.2, h + 0.6, h + 2.6, 1.15, 0, 5, ROOF, WHITE, M_ROOF)
        m.cyl(0, 1, h + 1.2, h + 2.8, 1.85, 1.85, 6, PLASTER, TRIM, cap=False)
        m.dome(0, 1, h + 2.8, 1.85, 6, 2, PLAIN, '#f3eee2')
    m.window('f', y0, x0 + 1, x1 - 1, 1, min(h, 3.4) - 0.8)
    m.window('b', y1, x0 + 1, x1 - 1, 1, min(h, 3.4) - 0.8)
    return m


def house_lods():
    """Har levelga bitta uzoq ko'rinish: shakli tepadan ham farqlanadi."""
    return [
        lod('house1_lod', (-4.8, -3.1, 4.8, 4.1), 3, 1.9, gable=True),
        lod('house2_lod', (-4.8, -3.1, 4.8, 4.1), 3, 1.9, gable=True, wing=(1.1, -6.4, 4.8, -2.0)),
        lod('house3_lod', (-6.6, -1.8, 6.6, 5.4), 3.2, 2.2, wing=(2.2, -6.0, 6.6, -0.6)),
        lod('house4_lod', (-6.6, -1.8, 6.6, 5.4), 3.2, 2.4, wing=(-6.7, -6.3, -3.1, -3.0)),
        lod('house5_lod', (-7.7, -4.2, 7.7, 6.0), 3.5, 2.6),
        lod('house6_lod', (-7.7, -4.2, 7.7, 6.0), 3.5, 2.8, wing=(-3.0, -6.1, 3.0, -3.5)),
        lod('house7_lod', (-4.5, -2, 5, 5), 6.4, 2.0, wing=(-6.5, -5, 6.5, -1)),
        lod('house8_lod', (-5.5, -3, 5.5, 5.2), 6.4, 2.2, wing=(-6.6, -5.2, 6.5, -2)),
        lod('house9_lod', (-6.2, -3.7, 6.2, 5.6), 7.1, 2.0, portico=True),
        lod('house10_lod', (-6.2, -3.7, 6.2, 5.6), 7.1, 2.0, portico=True, grand=True),
    ]


def apartment(floors):
    m = Model(f'apt{floors}')
    h = floors * 3 + 0.9
    m.box(-22, -8, 0.9, 22, 8, h, FACADE, WHITE, M_WALL, top=False)
    m.box(-22.2, -8.2, 0, 22.2, 8.2, 0.9, BRICK)
    m.box(-22.3, -8.3, h, 22.3, 8.3, h + 0.6, CONCRETE, '#b9ae9c')
    for x in (-16.5, -5.5, 5.5, 16.5):
        m.box(x - 1.6, -9.6, 2.9, x + 1.6, -8, 3.2, CONCRETE, TRIM, bottom=True)
        m.panel([(x - 1, -8.06, 0.2), (x + 1, -8.06, 0.2), (x + 1, -8.06, 2.7), (x - 1, -8.06, 2.7)], WOOD, '#8a6a4a')
        for f in range(1, floors):
            z = 0.9 + f * 3
            m.box(x + 2.2, -9.2, z, x + 5.2, -8, z + 1.0, PLASTER, WHITE, M_ROOF, bottom=True)
        m.cbox(x, 2, h + 0.6, 2.4, 2.4, 1.6, PLASTER, '#cfc5b3')
    return m


def apartment_lod(floors):
    m = Model(f'apt{floors}_lod', COARSE)
    m.box(-22, -8, 0, 22, 8, floors * 3 + 1.4, FACADE, WHITE, M_WALL, top_layer=CONCRETE)
    return m


def office():
    """28x28 minora; balandligi instance masshtabi bilan (1 = 36 m)."""
    m = Model('office', 12.0)
    m.box(-12, -12, 0, 12, 12, 4, STONE, '#d9cfbd')
    m.box(-10.5, -10.5, 4, 10.5, 10.5, 34, GLASS, WHITE, M_WALL, top=False)
    m.box(-11, -11, 33.4, 11, 11, 35, CONCRETE, '#cfc5b3', bottom=True)
    for x in (-10.7, 10.7):
        for y in (-10.7, 10.7):
            m.cbox(x, y, 0, 1, 1, 35, PLASTER, TRIM)
    moulding(m, -6, 6, -12, 2.9, 0.9)
    m.window('f', -12, -4, 4, 0.2, 2.8)
    m.cbox(0, 0, 35, 8, 8, 2.5, PLASTER, '#cfc5b3')
    return m


def office_low():
    m = Model('office_low')
    m.box(-15, -8, 0, 15, 8, 13, GLASS, WHITE, M_GLOW, top_layer=CONCRETE)
    m.box(-15.3, -8.3, 13, 15.3, 8.3, 13.7, CONCRETE, TRIM, bottom=True)
    m.box(-4, -9.6, 3.4, 4, -8, 3.8, WOOD, '#b98a5c', bottom=True)
    for x in (-3.6, 3.6):
        m.column(x, -9.3, 0, 3.4, 0.2, TRIM, PLASTER)
    return m


def shop():
    m = Model('shop')
    walls(m, -7.5, -5, 7.5, 7, 4.4)
    m.box(-7.8, -5.3, 4.4, 7.8, 7.3, 4.9, CONCRETE, TRIM)
    m.window('f', -5, -6.6, -1.4, 0.6, 3.0)
    m.window('f', -5, 1.4, 6.6, 0.6, 3.0)
    m.door(0, -5, 1.8, 2.6)
    for i in range(6):
        a, b = -7.2 + i * 2.4, -4.8 + i * 2.4
        m.poly([(a, -7.0, 2.9), (b, -7.0, 2.9), (b, -5, 3.5), (a, -5, 3.5)], PLAIN, '#b5452f' if i % 2 else '#f0e6d2')
        m.poly([(a, -5, 3.48), (b, -5, 3.48), (b, -7.0, 2.88), (a, -7.0, 2.88)], PLAIN, '#8a3524' if i % 2 else '#c9c0ae')
    m.box(-5, -5.25, 3.6, 5, -5.02, 4.8, PLASTER, WHITE, M_ROOF)
    return m


def far_boxes():
    """Tepadan ko'rilganda do'kon va past ofislar uchun eng sodda shakl."""
    s = Model('shop_lod', COARSE)
    s.box(-7.5, -5, 0, 7.5, 7, 4.7, PLASTER, '#e9e2d4', M_WALL, top_layer=CONCRETE)
    s.box(-5, -5.25, 3.6, 5, -5.02, 4.8, PLASTER, WHITE, M_ROOF)
    o = Model('office_low_lod', COARSE)
    o.box(-15, -8, 0, 15, 8, 13.7, GLASS, WHITE, M_GLOW, top_layer=CONCRETE)
    return [s, o]


def all_buildings():
    """Uzoq ko'rinishlar va ko'p qavatli binolar."""
    return house_lods() + [apartment(5), apartment(9), apartment_lod(5), apartment_lod(9), office(), office_low(), shop(), *far_boxes()]
