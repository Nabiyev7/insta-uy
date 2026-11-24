"""Yangi shahar binolari (yorug' uslub): kasalxona, masjid, o't o'chirish bo'limi, teatr, univermag, bozor, kafe, maydonchalar. Old tomoni -Y."""
import math

from kit_center import gable_front, pillar, rows, stairs
from kit_core import BASE, COARSE, CURB, FRAME, GLASS, GLASS_BLUE, GRASS_A, IRON, LEAVES, M_GLOW, M_SOFT, PATH, PLAIN, PLASTER, STONE, WALL, WHITE, Model
from kit_props import car
from kit_style import FLOWERS, frame_box

RED = '#d9483b'
CROSS = '#e23b3b'
DOME = '#b9d7e2'
FACE = 14.0
SOFT = 0.18


def body(m: Model, x0: float, y0: float, x1: float, y1: float, h: float, color: str = WALL, parapet: float = 0.7) -> None:
    """Poydevorli, qirralari yumaloq asosiy hajm."""
    m.bevel = SOFT
    m.box(x0 - 0.3, y0 - 0.3, 0, x1 + 0.3, y1 + 0.3, 0.9, PLAIN, BASE)
    m.box(x0, y0, 0.9, x1, y1, h, PLASTER, color)
    m.bevel = 0.0
    m.box(x0 - 0.35, y0 - 0.35, h - 0.2, x1 + 0.35, y1 + 0.35, h + 0.2, PLAIN, FRAME, bottom=True)
    if parapet:
        m.box(x0 + 0.6, y0 + 0.6, h + 0.2, x1 - 0.6, y1 - 0.6, h + parapet, PLAIN, '#dfe3e6')


def cross(m: Model, x: float, y: float, z: float, r: float, t: float = 0.5) -> None:
    for a, b in ((r, r * 0.34), (r * 0.34, r)):
        m.box(x - a, y - t / 2, z - b, x + a, y + t / 2, z + b, PLAIN, CROSS, M_SOFT, bottom=True)


# ---------- Kasalxona ----------
def kasalxona() -> Model:
    """62×30 m: 4 qavatli o'rta qism, ikki 3 qavatli qanot, tepada qizil xoch, kirishda soyabon."""
    m = Model('kasalxona', FACE)
    body(m, -14, -9, 14, 13, 16.2)
    for s in (-1, 1):
        x0, x1 = sorted((s * 14, s * 31))
        body(m, x0, -6, x1, 10, 12.4)
        xs = [s * v for v in (16.6, 20.4, 24.2, 28)]
        floors = [(2.0, 4.0), (5.8, 7.8), (9.6, 11.4)]
        rows(m, 'f', -6, xs, 1.3, floors)
        rows(m, 'b', 10, xs, 1.3, floors)
        rows(m, 'r' if s > 0 else 'l', s * 31, [-3, 1, 5, 8], 1.0, floors)
        m.box(x0, -6.12, 4.6, x1, -6.0, 5.2, PLAIN, GLASS_BLUE)
        m.box(x0, -6.12, 8.4, x1, -6.0, 9.0, PLAIN, GLASS_BLUE)
        cross(m, s * 22.5, 2, 15.6, 2.0, 1.0)
    floors = [(6.2, 8.4), (9.8, 12.0), (13.2, 15.2)]
    rows(m, 'f', -9, [-10.5, -6.3, 6.3, 10.5], 1.5, floors)
    rows(m, 'f', -9, [-10.5, 10.5], 1.5, [(1.6, 4.2)])
    rows(m, 'b', 13, [-10, -5, 0, 5, 10], 1.4, [(2.2, 4.4), *floors])
    for axis, at in (('l', -14), ('r', 14)):
        rows(m, axis, at, [-7.4, 11.4], 0.9, [(13.2, 15.2)])
    # kirish: shisha va soyabon
    m.box(-4.6, -9.3, 0.9, 4.6, -9, 15.0, GLASS, WHITE)
    m.box(-7.5, -16, 4.4, 7.5, -9, 4.9, PLAIN, FRAME, bottom=True)
    m.box(-7.5, -16.1, 4.1, 7.5, -15.8, 5.1, PLAIN, CROSS, bottom=True)
    for x in (-6.8, 6.8):
        for y in (-15.2, -11):
            m.cyl(x, y, 0, 4.4, 0.25, 0.25, 8, PLAIN, FRAME, cap=False)
    m.box(-7.5, -16, 0, 7.5, -9, 0.16, PLAIN, CURB)
    # tom ustidagi xochli taxta
    m.box(-4.2, 0, 16.6, 4.2, 1.2, 24.6, PLAIN, WHITE, bottom=True)
    cross(m, 0, 0, 20.6, 3.0)
    cross(m, 0, 1.2, 20.6, 3.0)
    for x, y in ((-9, 8), (9, 8)):
        m.cbox(x, y, 16.6, 3.4, 3, 1.3, PLAIN, '#cfd6da')
    return m


def kasalxona_lod() -> Model:
    m = Model('kasalxona_lod', COARSE)
    m.box(-14, -9, 0, 14, 13, 16.4, PLASTER, WALL)
    for s in (-1, 1):
        x0, x1 = sorted((s * 14, s * 31))
        m.box(x0, -6, 0, x1, 10, 12.6, PLASTER, WALL)
        m.window('f', -6, x0 + 1, x1 - 1, 2, 11.4)
    m.window('f', -9, -12, 12, 5, 15)
    m.box(-7.5, -16, 4.2, 7.5, -9, 4.9, PLAIN, CROSS, bottom=True)
    m.box(-4.2, 0, 16.4, 4.2, 1.2, 24.6, PLAIN, WHITE)
    cross(m, 0, 0.3, 20.6, 3.0, 2.0)
    return m


# ---------- Masjid ----------
def arch(m: Model, x: float, y: float, z: float, w: float, h: float, color: str = GLASS_BLUE) -> None:
    """Old devordagi ravoqli tokcha (uchi ozgina o'tkir)."""
    half = w / 2
    frame_box(m, x - half - 0.3, y - 0.12, z, x + half + 0.3, y, z + h + half + 0.5)
    pts = [(x - half, y - 0.16, z), (x + half, y - 0.16, z), (x + half, y - 0.16, z + h)]
    pts += [(x + half * math.cos(t), y - 0.16, z + h + half * 1.15 * math.sin(t)) for t in (0.6, 1.2, math.pi / 2, 1.94, 2.54)]
    pts += [(x - half, y - 0.16, z + h)]
    m.poly_fan(pts, PLAIN, color, M_GLOW if color == GLASS_BLUE else 0.0)


def minaret(m: Model, x: float, y: float, n: int = 10) -> None:
    m.bevel = SOFT
    m.cbox(x, y, 0, 5, 5, 6, PLASTER, WALL)
    m.bevel = 0.0
    m.cyl(x, y, 6, 23, 1.9, 1.6, n, PLASTER, WALL, cap=False)
    m.cyl(x, y, 23, 23.8, 1.6, 2.7, n, PLAIN, FRAME)
    m.cyl(x, y, 23.8, 24.8, 2.6, 2.6, n, PLAIN, FRAME, cap=False)
    m.cyl(x, y, 23.8, 28.2, 1.3, 1.3, n, PLASTER, WALL, cap=False)
    m.cyl(x, y, 28.2, 28.8, 1.7, 1.7, n, PLAIN, FRAME)
    m.dome(x, y, 28.8, 1.5, n, 3, PLAIN, DOME, M_SOFT, 1.5)
    m.cyl(x, y, 31.0, 32.4, 0.12, 0.02, 5, PLAIN, '#e8c766')


def masjid() -> Model:
    """34×30 m zal, sodda gumbaz, bitta minora, oldida ravoqli ayvon."""
    m = Model('masjid', FACE)
    m.bevel = SOFT
    m.box(-19, -18, 0, 19, 17, 0.7, PLAIN, PATH)
    m.box(-16, -9, 0.7, 16, 15, 11, PLASTER, WALL)
    m.bevel = 0.0
    m.box(-16.5, -9.5, 10.8, 16.5, 15.5, 11.4, PLAIN, FRAME, bottom=True)
    # ayvon
    m.box(-12, -15, 8, 12, -9, 9, PLASTER, WALL, bottom=True)
    m.box(-12.4, -15.4, 9, 12.4, -8.8, 9.4, PLAIN, FRAME, bottom=True)
    for x in (-11.4, -7, -2.6, 2.6, 7, 11.4):
        m.cyl(x, -14.4, 0.7, 8, 0.42, 0.36, 8, PLAIN, FRAME, cap=False)
        m.cbox(x, -14.4, 7.4, 1.2, 1.2, 0.6, PLAIN, FRAME, bottom=True)
    # peshtoq (kirish)
    m.box(-5.4, -10, 0.7, 5.4, -8.8, 13.4, PLASTER, WALL)
    m.box(-5.7, -10.2, 13.2, 5.7, -8.6, 13.8, PLAIN, FRAME, bottom=True)
    arch(m, 0, -10, 0.9, 4.4, 5.2, '#8a6a4a')
    for s in (-1, 1):
        for x in (8, 12.6):
            arch(m, s * x, -9, 2.4, 1.8, 3.2)
        for y in (-5, 0, 5, 10):
            side = 'r' if s > 0 else 'l'
            m.window(side, s * 16, y, y + 2, 3, 8)
    for x in (-11, -4, 3, 10):
        m.window('b', 15, x, x + 2, 3, 8)
    # gumbaz
    m.cyl(0, 3, 11.4, 14.6, 9.0, 8.6, 16, PLASTER, WALL, cap=False)
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.2
        m.cbox(math.cos(a) * 8.75, 3 + math.sin(a) * 8.75, 12, 0.9, 0.9, 1.8, PLAIN, GLASS_BLUE, M_GLOW)
    m.cyl(0, 3, 14.6, 15.2, 9.2, 9.2, 16, PLAIN, FRAME)
    m.dome(0, 3, 15.2, 8.5, 16, 6, PLAIN, DOME, M_SOFT, 1.0)
    m.cyl(0, 3, 23.4, 26, 0.2, 0.03, 6, PLAIN, '#e8c766')
    minaret(m, 20.5, -6)
    return m


def masjid_lod() -> Model:
    m = Model('masjid_lod', COARSE)
    m.box(-19, -18, 0, 19, 17, 0.7, PLAIN, PATH)
    m.box(-16, -9, 0, 16, 15, 11.2, PLASTER, WALL)
    m.box(-12, -15, 8, 12, -9, 9.4, PLAIN, FRAME, bottom=True)
    m.box(-5.4, -10, 0, 5.4, -8.8, 13.6, PLASTER, WALL)
    m.cyl(0, 3, 11.2, 15, 8.8, 8.8, 8, PLASTER, WALL, cap=False)
    m.dome(0, 3, 15, 8.5, 10, 3, PLAIN, DOME, M_SOFT, 1.0)
    m.cyl(20.5, -6, 0, 24, 2.1, 1.7, 5, PLASTER, WALL, cap=False)
    m.cyl(20.5, -6, 24, 28.8, 1.7, 1.7, 5, PLAIN, FRAME)
    m.cyl(20.5, -6, 28.8, 32, 1.5, 0, 5, PLAIN, DOME)
    return m


# ---------- O't o'chirish bo'limi ----------
def otochirish() -> Model:
    """34×18 m: uch eshikli garaj, xizmat xonasi va kuzatuv minorasi."""
    m = Model('otochirish', FACE)
    body(m, -17, -7, 9, 9, 7.2)
    m.box(-17.4, -7.2, 5.7, 9.4, -6.9, 6.9, PLAIN, RED)
    for i in range(3):
        x = -13 + i * 8.2
        m.box(x - 3.1, -7.25, 0.1, x + 3.1, -7, 5.2, PLAIN, FRAME, bottom=True)
        m.box(x - 2.7, -7.35, 0.1, x + 2.7, -7.1, 4.9, PLAIN, RED, bottom=True)
        for z in (1.3, 2.5):
            m.box(x - 2.7, -7.42, z, x + 2.7, -7.35, z + 0.12, PLAIN, '#b73a30')
        for k in (-1.7, 0, 1.7):
            m.box(x + k - 0.6, -7.42, 3.2, x + k + 0.6, -7.33, 4.2, PLAIN, GLASS_BLUE, M_GLOW)
    body(m, 9, -5, 17, 9, 10.4)
    rows(m, 'f', -5, [11.4, 14.8], 0.9, [(1.6, 3.6), (5.0, 7.0), (8.0, 9.6)])
    rows(m, 'r', 17, [-2, 2, 6], 0.9, [(1.6, 3.6), (5.0, 7.0), (8.0, 9.6)])
    rows(m, 'b', 9, [-14, -9, -4, 1, 6, 12], 1.1, [(2.4, 4.6)])
    rows(m, 'l', -17, [-3, 2, 6], 1.1, [(2.4, 4.6)])
    # minora
    m.bevel = SOFT
    m.box(10.4, 3, 10.4, 16, 8.4, 17.5, PLASTER, WALL)
    m.bevel = 0.0
    m.box(9.9, 2.5, 17.5, 16.5, 8.9, 18.1, PLAIN, RED, bottom=True)
    for x in (10.6, 15.8):
        for y in (3.2, 8.2):
            m.cbox(x, y, 18.1, 0.4, 0.4, 2.2, PLAIN, FRAME, top=False)
    m.cyl(13.2, 5.7, 20.3, 22.4, 4.6, 0.0, 4, PLAIN, RED)
    m.cyl(13.2, 5.7, 22.2, 24, 0.1, 0.03, 5, PLAIN, IRON)
    m.box(-17, -15, 0, 9, -7, 0.25, PLAIN, '#8a8d94')
    for i in range(4):
        x = -17.1 + i * 8.2
        m.box(x - 0.15, -15, 0.25, x + 0.15, -7.4, 0.3, PLAIN, WHITE)
    return m


def otochirish_lod() -> Model:
    m = Model('otochirish_lod', COARSE)
    m.box(-17, -7, 0, 9, 9, 7.4, PLASTER, WALL)
    m.box(-16, -7.2, 0, 8, -7, 5, PLAIN, RED)
    m.box(9, -5, 0, 17, 9, 10.6, PLASTER, WALL)
    m.box(10.4, 3, 10.4, 16, 8.4, 18, PLASTER, WALL)
    m.cyl(13.2, 5.7, 20.3, 22.4, 4.6, 0.0, 4, PLAIN, RED)
    m.box(-17, -15, 0, 9, -7, 0.12, PLAIN, '#8a8d94')
    return m


# ---------- Teatr / muzey ----------
def teatr() -> Model:
    """52×44 m klassik bino: 8 ustunli portik, fronton, orqada baland sahna."""
    m = Model('teatr', FACE)
    m.bevel = SOFT
    m.box(-25, -18, 0, 25, 24, 1.8, PLAIN, CURB)
    m.box(-22, -12, 1.8, 22, 22, 14.5, PLASTER, WALL)
    m.box(-12, 4, 14.5, 12, 21, 21, PLASTER, '#f3e3c3')
    m.bevel = 0.0
    stairs(m, 17, -18, 1.8, 5)
    m.box(-22.5, -12.5, 14.2, 22.5, 22.5, 14.9, PLAIN, FRAME, bottom=True)
    m.box(-12.4, 3.6, 20.8, 12.4, 21.4, 21.4, PLAIN, FRAME, bottom=True)
    for i in range(8):
        pillar(m, -14 + i * 4, -16.4, 1.8, 12.4, 0.7)
    m.box(-16, -17.4, 12.4, 16, -12, 13.8, PLASTER, WALL, bottom=True)
    m.box(-16.5, -17.8, 13.8, 16.5, -11.8, 14.4, PLAIN, FRAME, bottom=True)
    gable_front(m, -16, 16, -17.4, -8, 14.4, 4.0)
    for x in (-5, 0, 5):
        m.panel([(x - 1.4, -12.1, 1.8), (x + 1.4, -12.1, 1.8), (x + 1.4, -12.1, 7.4), (x - 1.4, -12.1, 7.4)], PLAIN, '#b5553f')
    floors = [(3.4, 6.6), (8.6, 11.8)]
    rows(m, 'f', -12, [-18.6, -14, -9.6, 9.6, 14, 18.6], 1.2, floors)
    for axis, at in (('l', -22), ('r', 22)):
        rows(m, axis, at, [-8, -2, 4, 10, 16], 1.3, floors)
    rows(m, 'b', 22, [-16, -8, 0, 8, 16], 1.4, floors)
    return m


def teatr_lod() -> Model:
    m = Model('teatr_lod', COARSE)
    m.box(-25, -18, 0, 25, 24, 1.8, PLAIN, CURB)
    m.box(-22, -12, 1.8, 22, 22, 14.7, PLASTER, WALL)
    m.box(-12, 4, 14.5, 12, 21, 21.2, PLASTER, '#f3e3c3')
    m.box(-16, -17.4, 12.4, 16, -12, 14.4, PLAIN, FRAME, bottom=True)
    for i in range(4):
        m.cyl(-14 + i * 9.3, -16.4, 1.8, 12.4, 0.8, 0.8, 4, PLASTER, WALL, cap=False)
    m.poly([(-16, -17.4, 14.4), (16, -17.4, 14.4), (0, -17.4, 18.4)], PLASTER, WALL)
    for a, b, za, zb in ((-16.5, 0, 14.3, 18.5), (0, 16.5, 18.5, 14.3)):
        m.poly([(a, -17.8, za), (b, -17.8, zb), (b, -8, zb), (a, -8, za)], PLAIN, BASE)
    m.window('f', -12, -20, 20, 3.4, 11.8)
    return m


# ---------- Savdo markazi ----------
def univermag() -> Model:
    """84×44 m: shisha vitrinali uch qavatli savdo uyi."""
    m = Model('univermag', FACE)
    body(m, -42, -18, 42, 22, 13.5, '#fbf7f0')
    m.box(-38, -18.4, 1.2, -11, -18, 11.6, GLASS, WHITE)
    m.box(11, -18.4, 1.2, 38, -18, 11.6, GLASS, WHITE)
    m.bevel = SOFT
    m.box(-10, -21, 0, 10, -17, 17.5, PLASTER, '#f2a65a')
    m.bevel = 0.0
    m.box(-7, -21.2, 0.6, 7, -21, 9, GLASS, WHITE)
    m.box(-7.6, -21.4, 11, 7.6, -21, 15, PLAIN, WHITE, M_SOFT)
    for i, color in enumerate(('#e2574c', '#f2c14e', '#4fa3c7')):
        m.cyl(-4.6 + i * 4.6, -21.5, 11.6, 14.4, 1.3, 1.3, 6, PLAIN, color, M_SOFT)
    for x0, x1 in ((-40, -11), (11, 40)):
        for i in range(6):
            a = x0 + (x1 - x0) * i / 6
            b = x0 + (x1 - x0) * (i + 1) / 6
            m.poly([(a, -20.6, 3.6), (b, -20.6, 3.6), (b, -18.3, 4.6), (a, -18.3, 4.6)], PLAIN, '#e2574c' if i % 2 else WHITE)
            m.poly([(a, -18.3, 4.58), (b, -18.3, 4.58), (b, -20.6, 3.58), (a, -20.6, 3.58)], PLAIN, '#c9c4bb')
    for axis, at in (('l', -42), ('r', 42)):
        rows(m, axis, at, [-11, -3, 5, 13], 2.2, [(2, 5), (7.4, 10.6)])
    rows(m, 'b', 22, [-34, -23, -11, 0, 11, 23, 34], 2.4, [(7.4, 10.6)])
    for x, y in ((-28, 8), (-10, 10), (12, 8), (28, 10)):
        m.cbox(x, y, 14.2, 6, 4, 1.6, PLAIN, '#cfd6da')
    m.box(-20, -2, 14.2, 20, 4, 15.6, GLASS, WHITE)
    return m


def univermag_lod() -> Model:
    m = Model('univermag_lod', COARSE)
    m.box(-42, -18, 0, 42, 22, 13.7, PLASTER, '#fbf7f0')
    m.box(-10, -21, 0, 10, -17, 17.5, PLASTER, '#f2a65a')
    m.box(-38, -18.4, 1.2, 38, -18, 11.6, GLASS, WHITE)
    m.box(-40, -20.6, 3.6, 40, -18, 4.2, PLAIN, '#e2574c', bottom=True)
    m.box(-20, -2, 13.7, 20, 4, 15.4, GLASS, WHITE)
    return m


def bozor() -> Model:
    """64×40 m usti yopiq bozor: uch qatorli to'lqin tom, ustunlar, ichida rastalar."""
    m = Model('bozor', FACE)
    m.box(-32, -20, 0, 32, 20, 0.35, PLAIN, PATH)
    n = 6
    colors = ('#e2574c', '#f2c14e', '#4fa3c7')
    for k in range(3):
        cy = -13.3 + k * 13.3
        for x in (-30, -15, 0, 15, 30):
            for dy in (-6.2, 6.2):
                m.cyl(x, cy + dy, 0.35, 5.2, 0.22, 0.22, 6, PLAIN, FRAME, cap=False)
        for i in range(n):
            t0, t1 = math.pi * i / n, math.pi * (i + 1) / n
            y0, z0 = cy - math.cos(t0) * 6.6, 5.2 + math.sin(t0) * 3.0
            y1, z1 = cy - math.cos(t1) * 6.6, 5.2 + math.sin(t1) * 3.0
            m.poly([(-32, y0, z0), (32, y0, z0), (32, y1, z1), (-32, y1, z1)], PLAIN, colors[k] if i in (1, 4) else WHITE)
            m.poly([(-32, y1, z1 - 0.1), (32, y1, z1 - 0.1), (32, y0, z0 - 0.1), (-32, y0, z0 - 0.1)], PLAIN, '#e9e4da')
        for i in range(7):
            x = -27 + i * 9
            m.box(x - 2.2, cy - 1.4, 0.35, x + 2.2, cy + 1.4, 1.3, PLAIN, '#c9915a')
            m.box(x - 2.1, cy - 1.3, 1.3, x + 2.1, cy + 1.3, 1.55, PLAIN, ('#e2574c', '#f2c14e', '#65b547', '#f28f3b')[(i + k) % 4])
    m.box(-32.2, -20.4, 4.8, 32.2, -19.9, 6.2, PLAIN, WHITE, bottom=True)
    return m


def bozor_lod() -> Model:
    m = Model('bozor_lod', COARSE)
    for k, color in enumerate(('#e2574c', '#f2c14e', '#4fa3c7')):
        cy = -13.3 + k * 13.3
        pts = [(cy - 6.6, 5.2), (cy - 3.3, 7.6), (cy + 3.3, 7.6), (cy + 6.6, 5.2)]
        for i, c in enumerate((color, WHITE, color)):
            (y0, z0), (y1, z1) = pts[i], pts[i + 1]
            m.poly([(-32, y0, z0), (32, y0, z0), (32, y1, z1), (-32, y1, z1)], PLAIN, c)
    m.box(-31.5, -19, 0, 31.5, 19, 5, PLAIN, '#d9cfc2', top=False)
    return m


# ---------- Mahalla markazi ----------
def kafe() -> Model:
    """16×11 m kafe: katta oyna, rangli soyabon, oldida stollar."""
    m = Model('kafe', FACE)
    body(m, -8, -3, 8, 6, 4.6, '#fff1dc', 0.5)
    m.box(-7, -3.15, 0.9, 7, -3, 3.4, GLASS, WHITE)
    for i in range(8):
        a, b = -8 + i * 2, -6 + i * 2
        m.poly([(a, -5.4, 2.9), (b, -5.4, 2.9), (b, -3, 4.0), (a, -3, 4.0)], PLAIN, '#e2574c' if i % 2 else WHITE)
        m.poly([(a, -3, 3.98), (b, -3, 3.98), (b, -5.4, 2.88), (a, -5.4, 2.88)], PLAIN, '#d8d0c4')
    m.box(-9, -10, 0, 9, -3, 0.25, PLAIN, PATH)
    for i, x in enumerate((-6, 0, 6)):
        m.cyl(x, -7.6, 0.15, 2.5, 0.06, 0.06, 5, PLAIN, FRAME, cap=False)
        m.cyl(x, -7.6, 2.3, 3.0, 1.9, 0.05, 8, PLAIN, ('#4fa3c7', '#f2c14e', '#65b547')[i])
        m.cyl(x, -7.6, 0.15, 0.95, 0.7, 0.7, 8, PLAIN, WHITE)
    rows(m, 'l', -8, [1.5], 1.2, [(1.4, 3.2)])
    rows(m, 'r', 8, [1.5], 1.2, [(1.4, 3.2)])
    return m


def sport() -> Model:
    """44×26 m sport maydoni: futbol va basketbol chiziqlari, darvozalar, halqalar."""
    m = Model('sport', COARSE)
    m.box(-22, -13, 0, 22, 13, 0.3, PLAIN, '#d97a5a')
    m.box(-20, -11, 0.3, 20, 11, 0.34, PLAIN, '#5fb0c9')
    z = 0.4
    for x0, y0, x1, y1 in ((-19, -10, 19, -9.7), (-19, 9.7, 19, 10), (-19, -10, -18.7, 10), (18.7, -10, 19, 10), (-0.15, -10, 0.15, 10), (-19, -4, -14, -3.7), (-19, 3.7, -14, 4), (-14.3, -4, -14, 4), (14, -4, 19, -3.7), (14, 3.7, 19, 4), (14, -4, 14.3, 4)):
        m.box(x0, y0, 0.33, x1, y1, z, PLAIN, WHITE)
    for i in range(12):
        a, b = 2 * math.pi * i / 12, 2 * math.pi * (i + 1) / 12
        pts = [(math.cos(t) * r, math.sin(t) * r, z) for t, r in ((a, 2.9), (a, 3.2), (b, 3.2), (b, 2.9))]
        m.poly(pts, PLAIN, WHITE)
    for s in (-1, 1):
        for y in (-2.4, 2.4):
            m.cbox(s * 19.2, y, 0.1, 0.16, 0.16, 2.4, PLAIN, WHITE)
        m.box(s * 19.2 - 0.08, -2.4, 2.4, s * 19.2 + 0.08, 2.4, 2.56, PLAIN, WHITE, bottom=True)
        m.cbox(s * 20.6, 0, 0.1, 0.2, 0.2, 3.6, PLAIN, IRON)
        m.cbox(s * 20.2, 0, 3.0, 0.1, 1.8, 1.2, PLAIN, WHITE, bottom=True)
        m.cyl(s * 19.8, 0, 3.05, 3.15, 0.3, 0.3, 6, PLAIN, '#e2574c', cap=False)
    return m


def bolalar() -> Model:
    """22×16 m bolalar maydonchasi: tepalik-uycha, sirpanchiq, arg'imchoq, qumloq."""
    m = Model('bolalar', COARSE)
    m.box(-11, -8, 0, 11, 8, 0.3, PLAIN, '#f3d9a0')
    for x in (-5, -2.6):
        for y in (-1.2, 1.2):
            m.cbox(x, y, 0, 0.18, 0.18, 3.4, PLAIN, '#4fa3c7')
    m.box(-5.1, -1.3, 1.6, -2.5, 1.3, 1.75, PLAIN, '#f2c14e', bottom=True)
    m.cyl(-3.8, 0, 3.3, 4.6, 2.2, 0.0, 4, PLAIN, '#e2574c')
    slide = [(-2.5, -0.6, 1.7), (1.4, -0.6, 0.25), (1.4, 0.6, 0.25), (-2.5, 0.6, 1.7)]
    m.poly(slide, PLAIN, '#65b547')
    m.poly(slide[::-1], PLAIN, '#4e9f3d')
    for s in (-1, 1):
        m.cbox(-5.6, s * 0.5, 0, 0.1, 0.1, 1.7, PLAIN, FRAME)
    for x in (4, 9):
        for dy in (-1.2, 1.2):
            m.poly([(x - 0.1, 3 + dy, 0), (x + 0.1, 3 + dy, 0), (x + 0.1, 3, 3.2), (x - 0.1, 3, 3.2)], PLAIN, '#e2574c')
            m.poly([(x - 0.1, 3, 3.2), (x + 0.1, 3, 3.2), (x + 0.1, 3 + dy, 0), (x - 0.1, 3 + dy, 0)], PLAIN, '#e2574c')
    m.box(4, 2.9, 3.1, 9, 3.1, 3.3, PLAIN, '#e2574c', bottom=True)
    for x in (5.6, 7.4):
        m.box(x - 0.4, 2.8, 0.7, x + 0.4, 3.2, 0.78, PLAIN, '#4fa3c7', bottom=True)
        for d in (-0.35, 0.35):
            m.cbox(x + d, 3, 0.7, 0.05, 0.05, 2.4, PLAIN, IRON, top=False)
    m.box(3, -6, 0.3, 8.4, -2, 0.6, PLAIN, '#c9915a')
    m.box(3.3, -5.7, 0.6, 8.1, -2.3, 0.63, PLAIN, '#ffe7b0')
    for i, (x, y) in enumerate(((-8.5, 5), (-5, 5.4), (-8.5, -5))):
        m.blob(x, y, 0.5, 0.7, ('#e2574c', '#f2c14e', '#4fa3c7')[i], i, 0.9, PLAIN, 1)
    return m


# ---------- Bulvar va maydon ----------
def hedge() -> Model:
    """8 m tekis qirqilgan buta qatori."""
    m = Model('hedge', COARSE)
    m.bevel = 0.14
    m.box(-4, -0.55, 0, 4, 0.55, 0.95, PLAIN, LEAVES[0])
    return m


def flower_ring() -> Model:
    """Doira gulzor, r = 3 m."""
    m = Model('flower_ring', COARSE)
    m.cyl(0, 0, 0, 0.3, 3, 3, 12, PLAIN, CURB)
    m.cyl(0, 0, 0.3, 0.42, 2.7, 2.6, 12, PLAIN, GRASS_A)
    for r, n, c in ((2.1, 9, 0), (1.2, 5, 1)):
        for i in range(n):
            a = 2 * math.pi * i / n
            m.blob(math.cos(a) * r, math.sin(a) * r, 0.5, 0.36, FLOWERS[c], 2, 1, PLAIN, 1)
    m.blob(0, 0, 0.8, 0.5, LEAVES[1], 3, 0.9)
    return m


def vehicles() -> list[Model]:
    amb = car('car_ambulance', 5.4, 2.1, 1.3, (-2.4, 2.6, 2.5), '#ffffff')
    amb.box(-1.06, -1.2, 0.85, 1.06, 2.2, 1.1, PLAIN, CROSS)
    amb.cbox(0, -0.6, 2.5, 1.2, 0.5, 0.24, PLAIN, '#4fa3e0', M_GLOW)
    fire = car('car_fire', 7.6, 2.5, 1.7, (-3.6, -1.2, 2.9), RED)
    fire.box(-1.22, -0.9, 1.7, 1.22, 3.7, 2.7, PLAIN, RED)
    fire.box(-1.26, -3.8, 0.95, 1.26, 3.82, 1.2, PLAIN, WHITE)
    fire.box(-0.5, -2.6, 2.95, 0.5, 3.6, 3.15, PLAIN, '#d6d9dc', bottom=True)
    fire.cbox(0, -2.4, 2.9, 1.4, 0.4, 0.26, PLAIN, '#4fa3e0', M_GLOW)
    return [amb, fire]


def new_buildings() -> list[Model]:
    """Uchburchak chegarasi ostidagi binolar."""
    return [kasalxona(), masjid(), otochirish(), teatr(), univermag(), bozor()]


def city_models() -> list[Model]:
    return [
        *new_buildings(), kasalxona_lod(), masjid_lod(), otochirish_lod(), teatr_lod(), univermag_lod(), bozor_lod(),
        kafe(), sport(), bolalar(), hedge(), flower_ring(), *vehicles(),
    ]
