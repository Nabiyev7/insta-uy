"""Farg'ona vodiysi ruhidagi uylar. Old tomoni -Y (glTF: +Z). Barchasi <= 13.5 x 12.5 m — eng kichik uchastkaga sig'adi."""
from kit_core import (BRICK, CARVED, CONCRETE, FACADE, GLASS, GRASS, M_GLOW, M_ROOF, M_WALL, NAQSH, PLAIN, PLASTER, ROOF, STONE, WHITE, WOOD, Model)

TRIM = '#f3ead8'


def frieze(m, x0, x1, y, z, h=0.35, layer=NAQSH):
    """Peshtoq bo'ylab naqsh tasmasi (old tomonda)."""
    n = max(1, round((x1 - x0) / h / 2))
    step = (x1 - x0) / n
    for i in range(n):
        a = x0 + i * step
        m.panel([(a, y - 0.05, z), (a + step, y - 0.05, z), (a + step, y - 0.05, z + h), (a, y - 0.05, z + h)], layer)


def walls(m, x0, y0, x1, y1, h, base=BRICK):
    m.box(x0 - 0.06, y0 - 0.06, 0, x1 + 0.06, y1 + 0.06, 0.6, base, '#d9c7b4')
    m.box(x0, y0, 0.6, x1, y1, h, PLASTER, WHITE, M_WALL, top=False)


def ayvon(m, x0, x1, y0, y1, h, cols):
    """Ustunli ayvon: yog'och pol va o'yma ustunlar."""
    m.box(x0, y0, 0, x1, y1, 0.35, STONE, '#d8cbb5', top_layer=WOOD)
    for i in range(cols):
        m.column(x0 + 0.3 + (x1 - x0 - 0.6) * i / max(1, cols - 1), y0 + 0.3, 0.35, h)
    m.box(x0, y0 + 0.12, h, x1, y0 + 0.45, h + 0.3, CARVED, WHITE, bottom=True)


def house1():
    m = Model('house1')
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


def house2():
    m = Model('house2')
    walls(m, -5.5, -1.5, 5.5, 4.5, 3.2)
    walls(m, 1.8, -5, 5.5, -1.5, 3.2)
    ayvon(m, -5.5, 1.8, -3.6, -1.5, 2.9, 4)
    frieze(m, -5.5, 1.8, -3.48, 3.2)
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


def house3():
    m = Model('house3')
    walls(m, -6.4, -1.4, 6.4, 5, 3.5)
    for s in (-1, 1):
        x0, x1 = sorted((s * 6.4, s * 2.9))
        walls(m, x0, -5.6, x1, -1.4, 3.5)
        frieze(m, x0, x1, -5.6, 3.0)
        m.window('f', -5.6, (x0 + x1) / 2 - 1, (x0 + x1) / 2 + 1, 1.0, 2.8)
        m.hip(x0, -5.6, x1, -0.4, 3.52, 1.8, 0.55)
        for y in (-4.4, 0.4):
            m.window('r' if s > 0 else 'l', s * 6.4, y, y + 1.6, 1.0, 2.8)
        m.box(x0 - 0.1, -5.75, 0, x0 + 0.35, -5.4, 3.5, BRICK)
        m.box(x1 - 0.35, -5.75, 0, x1 + 0.1, -5.4, 3.5, BRICK)
    ayvon(m, -2.9, 2.9, -4.0, -1.4, 3.2, 4)
    frieze(m, -2.9, 2.9, -3.88, 3.5, 0.4)
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


def house4():
    m = Model('house4')
    walls(m, -6.5, -3, 3, 5.4, 3.4, STONE)
    walls(m, 3, -5, 6.5, 5.4, 3.4, STONE)
    m.box(-4.5, -2, 3.4, 5, 5, 6.4, PLASTER, WHITE, M_WALL, top=False)
    # ikkinchi qavat ayvoni
    m.box(-6.7, -5.2, 3.3, 3, -3, 3.6, CONCRETE, TRIM, bottom=True)
    for x in (-6.3, -3.3, -0.3, 2.6):
        m.column(x, -4.9, 0.2, 3.3, 0.2, TRIM, PLASTER)
        m.cbox(x, -5.05, 3.6, 0.2, 0.2, 1.0, STONE, TRIM)
    m.box(-6.6, -5.1, 4.3, 2.8, -5.0, 4.45, CARVED, WHITE, bottom=True)
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
    frieze(m, -4.5, 5, -2, 6.05, 0.35)
    m.hip(-4.5, -2, 5, 5, 6.4, 2.0, 0.8)
    m.hip(3, -5, 6.5, 5.4, 3.42, 1.2, 0.5)
    m.poly([(-6.9, -3.2, 3.62), (-4.5, -3.2, 3.62), (-4.5, 5.7, 3.62), (-6.9, 5.7, 3.62)], CONCRETE, TRIM)
    return m


def house5():
    m = Model('house5')
    gold = '#d9a93f'
    m.box(-6.9, -6, 0, 6.9, 6, 0.6, STONE, '#e6dcc8')
    m.box(-6.2, -3.6, 0.6, 6.2, 5.6, 6.6, PLASTER, WHITE, M_WALL, top=False)
    m.box(-6.4, -3.8, 6.6, 6.4, 5.8, 7.1, STONE, TRIM, bottom=True)
    for x in range(-6, 7):
        m.cbox(x, -3.65, 7.1, 0.45, 0.3, 0.45, STONE, TRIM)
        m.cbox(x, 5.65, 7.1, 0.45, 0.3, 0.45, STONE, TRIM)
    # peshtoq (portal) va kolonnada
    m.box(-2.4, -5.4, 0.6, 2.4, -3.6, 7.6, PLASTER, TRIM, top=True)
    m.panel([(-2.1, -5.45, 4.9), (2.1, -5.45, 4.9), (2.1, -5.45, 7.2), (-2.1, -5.45, 7.2)], NAQSH)
    for x in (-2.2, 2.0):
        for z in (0.9, 2.9):
            m.panel([(x - 0.1, -5.45, z), (x + 0.3, -5.45, z), (x + 0.3, -5.45, z + 2), (x - 0.1, -5.45, z + 2)], NAQSH)
    m.panel([(-1.4, -5.46, 0.6), (1.4, -5.46, 0.6), (1.4, -5.46, 4.4), (-1.4, -5.46, 4.4)], CARVED)
    m.box(-2.6, -5.6, 7.6, 2.6, -3.5, 7.85, PLAIN, gold)
    for s in (-1, 1):
        for x in (3.0, 4.5, 6.0):
            m.column(s * x, -5.3, 0.6, 4.2, 0.22, TRIM, PLASTER)
        x0, x1 = sorted((s * 2.4, s * 6.5))
        m.box(x0, -5.7, 4.2, x1, -3.6, 4.55, STONE, TRIM, bottom=True)
        frieze(m, x0, x1, -5.7, 4.2, 0.35)
        for x in (3.0, 4.8):
            a, b = sorted((s * x, s * (x + 1.3)))
            m.window('f', -3.6, a, b, 1.2, 3.8)
            m.window('f', -3.6, a, b, 4.9, 6.3)
        for y in (-2.4, 0.4, 3.2):
            side = 'r' if s > 0 else 'l'
            m.window(side, s * 6.2, y, y + 1.4, 1.2, 3.8)
            m.window(side, s * 6.2, y, y + 1.4, 4.7, 6.3)
        # kichik burjlar
        m.cyl(s * 5.9, 5.2, 0.6, 7.8, 0.9, 0.9, 8, PLASTER, TRIM)
        m.dome(s * 5.9, 5.2, 7.8, 0.95, 8, 3)
        m.cyl(s * 5.9, -3.4, 4.55, 7.8, 0.8, 0.8, 8, PLASTER, TRIM)
        m.dome(s * 5.9, -3.4, 7.8, 0.85, 8, 3)
    for x in (-4.6, -1.8, 1, 3.6):
        m.window('b', 5.6, x, x + 1.3, 1.2, 3.8)
        m.window('b', 5.6, x, x + 1.3, 4.7, 6.3)
    m.cyl(0, 1, 7.1, 8.3, 2.5, 2.5, 12, NAQSH, WHITE)
    m.dome(0, 1, 8.3, 2.55, 12, 5)
    m.cyl(0, 1, 11.1, 12.2, 0.12, 0.02, 5, PLAIN, gold)
    for i in range(3):
        m.box(-1.8 - i * 0.2, -6.1 - i * 0.35, 0, 1.8 + i * 0.2, -5.4, 0.6 - i * 0.18, STONE, '#d8cbb5')
    return m


def lod(src, name, x0, y0, x1, y1, h, roof_h, roof=True):
    """Uzoqdagi sodda shakl."""
    m = Model(name)
    m.box(x0, y0, 0, x1, y1, h, PLASTER, '#e9e2d4', M_WALL, top=not roof, top_layer=CONCRETE)
    if roof:
        m.hip(x0, y0, x1, y1, h, roof_h, 0.4)
    m.window('f', y0, x0 + 1, x1 - 1, 1, h - 0.8)
    m.window('b', y1, x0 + 1, x1 - 1, 1, h - 0.8)
    return m


def apartment(floors):
    m = Model(f'apt{floors}')
    h = floors * 3 + 0.9
    m.box(-22, -8, 0.9, 22, 8, h, FACADE, WHITE, M_WALL, top=False)
    m.box(-22.2, -8.2, 0, 22.2, 8.2, 0.9, BRICK)
    m.box(-22.3, -8.3, h, 22.3, 8.3, h + 0.6, CONCRETE, '#b9ae9c')
    for x in (-16.5, -5.5, 5.5, 16.5):
        m.box(x - 1.6, -9.6, 2.9, x + 1.6, -8, 3.2, CONCRETE, TRIM, bottom=True)
        m.panel([(x - 1, -8.06, 0.2), (x + 1, -8.06, 0.2), (x + 1, -8.06, 2.7), (x - 1, -8.06, 2.7)], CARVED)
        for f in range(1, floors):
            z = 0.9 + f * 3
            m.box(x + 2.2, -9.2, z, x + 5.2, -8, z + 1.0, PLASTER, WHITE, M_ROOF, bottom=True)
        m.cbox(x, 2, h + 0.6, 2.4, 2.4, 1.6, PLASTER, '#cfc5b3')
    return m


def apartment_lod(floors):
    m = Model(f'apt{floors}_lod')
    m.box(-22, -8, 0, 22, 8, floors * 3 + 1.4, FACADE, WHITE, M_WALL, top_layer=CONCRETE)
    return m


def office():
    """28x28 minora; balandligi instance masshtabi bilan (1 = 36 m)."""
    m = Model('office')
    m.box(-12, -12, 0, 12, 12, 4, STONE, '#d9cfbd')
    m.box(-10.5, -10.5, 4, 10.5, 10.5, 34, GLASS, WHITE, top=False)
    m.box(-11, -11, 33.4, 11, 11, 35, CONCRETE, '#cfc5b3', bottom=True)
    for x in (-10.7, 10.7):
        for y in (-10.7, 10.7):
            m.cbox(x, y, 0, 1, 1, 35, PLASTER, TRIM)
    frieze(m, -6, 6, -12, 2.9, 0.9)
    m.window('f', -12, -4, 4, 0.2, 2.8)
    m.cbox(0, 0, 35, 8, 8, 2.5, PLASTER, '#cfc5b3')
    return m


def office_low():
    m = Model('office_low')
    m.box(-15, -8, 0, 15, 8, 13, GLASS, WHITE, M_GLOW, top_layer=CONCRETE)
    m.box(-15.3, -8.3, 13, 15.3, 8.3, 13.7, CONCRETE, TRIM, bottom=True)
    m.box(-4, -9.6, 3.4, 4, -8, 3.8, CARVED, WHITE, bottom=True)
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


def all_houses():
    grass_free = [house1(), house2(), house3(), house4(), house5()]
    lods = [
        lod(None, 'house1_lod', -4, -2.6, 4, 3.4, 3, 1.9), lod(None, 'house2_lod', -5.5, -3, 5.5, 4.5, 3.3, 2.2),
        lod(None, 'house3_lod', -6.4, -4, 6.4, 5, 3.6, 2.6), lod(None, 'house4_lod', -6.5, -4, 6.5, 5.4, 5.4, 2.2),
        lod(None, 'house5_lod', -6.2, -4.5, 6.2, 5.6, 7, 2.6),
    ]
    return grass_free + lods + [apartment(5), apartment(9), apartment_lod(5), apartment_lod(9), office(), office_low(), shop()]
