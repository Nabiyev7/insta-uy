"""Yangi bezaklar: zamonaviy (asosiy), bir nechta milliy, daraxt, hayvon va mavsumiy. Har biri ≤ 300 uchburchak, old tomoni -Y."""
import math
import random

from kit_core import BRICK, COARSE, CONCRETE, GLASS, LEAF, M_GLOW, PLAIN, PLASTER, SOIL, STONE, WOOD, Model

IRON = '#2b2b2e'
BARK = '#6b5238'
OAK = '#8a6238'
CLAY = '#c08a5e'
STEEL = '#b9bec4'
LAMP = '#ffe2a0'


def posts(m: Model, hx: float, hy: float, h: float, size: float = 0.14, color: str = OAK) -> None:
    for x in (-hx, hx):
        for y in (-hy, hy):
            m.cbox(x, y, 0, size, size, h, WOOD, color)


# ---------- Milliy ----------
def yard_tandir() -> Model:
    m = Model('yard_tandir', COARSE)
    m.box(-1.3, -0.9, 0, 1.3, 0.9, 0.5, BRICK, '#e0c3a0')
    m.cyl(0, 0, 0.5, 1.15, 0.75, 0.5, 10, PLASTER, CLAY, cap=False)
    m.cyl(0, 0, 1.15, 1.25, 0.5, 0.42, 10, PLASTER, '#8f5f3c', cap=False)
    m.cyl(0, 0, 0.9, 0.95, 0.42, 0.42, 8, PLAIN, '#2a1a12')
    m.cbox(0, -0.72, 0.55, 0.3, 0.12, 0.28, PLAIN, '#1c120c')
    for i, (x, z, r) in enumerate(((0, 1.6, 0.2), (0.12, 2.05, 0.28), (0.02, 2.6, 0.36))):
        m.blob(x, 0, z, r, '#cfccc8', 30 + i, 1.1, PLAIN)
    for i in range(3):
        m.cyl(-0.95 + i * 0.16, 0.5, 0.5, 0.56, 0.22, 0.2, 6, PLAIN, '#d9a15a')
    return m


def yard_tokzor() -> Model:
    """Tokzor: ikki qator tok."""
    m = Model('yard_tokzor', COARSE)
    for y in (-0.9, 0.9):
        for x in (-1.7, 0, 1.7):
            m.cbox(x, y, 0, 0.1, 0.1, 1.5, WOOD, BARK)
        for z in (0.8, 1.4):
            m.box(-1.7, y - 0.02, z, 1.7, y + 0.02, z + 0.04, PLAIN, IRON)
        for i, x in enumerate((-1.1, 0, 1.1)):
            m.blob(x, y, 1.1, 0.58, ['#5f8c3a', '#6d9a44'][i % 2], i + 40, 0.8)
            m.cyl(x + 0.1, y - 0.5, 0.72, 0.98, 0.03, 0.13, 4, PLAIN, '#4a2a5e', cap=False)
    return m


# ---------- Zamonaviy ----------
def yard_umbrella() -> Model:
    """Bog' soyaboni: stol va to'rt o'rindiq."""
    m = Model('yard_umbrella', COARSE)
    m.cyl(0, 0, 0, 0.1, 0.35, 0.35, 8, CONCRETE, '#8d8d90')
    m.cyl(0, 0, 0.1, 2.4, 0.05, 0.05, 6, PLAIN, '#f0f0f0', cap=False)
    n = 8
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p = [(math.cos(a) * 1.4, math.sin(a) * 1.4, 2.1), (math.cos(b) * 1.4, math.sin(b) * 1.4, 2.1), (0, 0, 2.55)]
        color = '#f3ead8' if i % 2 else '#d2573a'
        m.poly(p, PLAIN, color)
        m.poly(p[::-1], PLAIN, color)
    m.cyl(0, 0, 0.7, 0.76, 0.6, 0.6, 10, WOOD, '#c79a6a')
    for x, y in ((-0.95, 0), (0.95, 0), (0, -0.95), (0, 0.95)):
        m.cbox(x, y, 0.42, 0.42, 0.42, 0.06, WOOD, '#a3764a', bottom=True)
        m.cbox(x, y, 0, 0.3, 0.3, 0.42, PLAIN, '#e9e4da')
    return m


def wheel(m: Model, x: float, z: float, r: float) -> None:
    n = 10
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        q = [(x + math.cos(t) * k, 0, z + math.sin(t) * k) for t, k in ((a, r), (b, r), (b, r * 0.82), (a, r * 0.82))]
        m.poly(q, PLAIN, '#1c1c1e')
        m.poly(q[::-1], PLAIN, '#1c1c1e')


def bar(m: Model, a: tuple[float, float], b: tuple[float, float], color: str) -> None:
    (x0, z0), (x1, z1) = a, b
    d = math.hypot(x1 - x0, z1 - z0)
    ox, oz = -(z1 - z0) / d * 0.03, (x1 - x0) / d * 0.03
    q = [(x0 - ox, 0, z0 - oz), (x1 - ox, 0, z1 - oz), (x1 + ox, 0, z1 + oz), (x0 + ox, 0, z0 + oz)]
    m.poly([(x, -0.02, z) for x, _, z in q], PLAIN, color)
    m.poly([(x, 0.02, z) for x, _, z in q][::-1], PLAIN, color)


def yard_bike() -> Model:
    """Velosiped."""
    m = Model('yard_bike', COARSE)
    red = '#c0352b'
    wheel(m, -0.55, 0.34, 0.34)
    wheel(m, 0.55, 0.34, 0.34)
    for a, b in (((-0.55, 0.34), (-0.2, 0.8)), ((-0.2, 0.8), (0.38, 0.82)), ((0.38, 0.82), (0.0, 0.32)), ((0.0, 0.32), (-0.2, 0.8)), ((-0.55, 0.34), (0.0, 0.32)), ((0.55, 0.34), (0.36, 0.98))):
        bar(m, a, b, red)
    m.cbox(-0.22, 0, 0.84, 0.28, 0.12, 0.06, PLAIN, '#1c1c1e')
    m.cbox(0.36, 0, 0.96, 0.06, 0.5, 0.05, PLAIN, '#1c1c1e')
    m.cbox(0.0, 0, 0.28, 0.1, 0.28, 0.06, PLAIN, '#7f8a92')
    m.cbox(0.62, 0, 0.72, 0.28, 0.3, 0.24, WOOD, '#b07a44')
    return m


def sign_mailbox() -> Model:
    """Pochta qutisi."""
    m = Model('sign_mailbox', COARSE)
    m.cbox(0, 0, 0, 0.1, 0.1, 1.1, WOOD, OAK)
    m.box(-0.2, -0.3, 1.1, 0.2, 0.3, 1.4, PLAIN, '#2f5f9f', bottom=True)
    m.cyl(0, 0, 1.4, 1.41, 0.01, 0.01, 3)
    m.gable(-0.2, -0.3, 0.2, 0.3, 1.4, 0.14, 0.02, '#2f5f9f', '#2f5f9f')
    m.cbox(0.24, 0.05, 1.3, 0.04, 0.2, 0.28, PLAIN, '#d2573a')
    m.box(-0.14, -0.32, 1.16, 0.14, -0.3, 1.34, PLAIN, '#e9e4da')
    return m


def yard_besedka() -> Model:
    m = Model('yard_besedka', COARSE)
    m.box(-1.9, -1.9, 0, 1.9, 1.9, 0.18, STONE, '#d8cbb5', top_layer=WOOD)
    posts(m, 1.7, 1.7, 2.5)
    m.box(-1.85, -1.85, 2.4, 1.85, 1.85, 2.55, WOOD, OAK, bottom=True)
    m.hip(-1.8, -1.8, 1.8, 1.8, 2.55, 1.0, 0.25, '#b86b4b')
    for s in (-1, 1):
        m.box(s * 1.7 - 0.05, -1.7, 0.18, s * 1.7 + 0.05, 1.7, 0.85, WOOD, '#a3764a')
        m.box(min(s * 1.2, s * 1.6), -1.4, 0.18, max(s * 1.2, s * 1.6), 1.4, 0.6, WOOD, '#8a6238')
    m.box(-1.7, 1.65, 0.18, 1.7, 1.75, 0.85, WOOD, '#a3764a')
    m.cbox(0, 0, 0.18, 1.2, 1.2, 0.62, WOOD, '#7a4f2a')
    m.cbox(0, 0, 2.1, 0.22, 0.22, 0.28, PLAIN, LAMP, M_GLOW)
    return m


def yard_mangal() -> Model:
    m = Model('yard_mangal', COARSE)
    for x in (-0.6, 0.6):
        for y in (-0.2, 0.2):
            m.cbox(x, y, 0, 0.06, 0.06, 0.75, PLAIN, IRON)
    m.box(-0.7, -0.28, 0.75, 0.7, 0.28, 0.95, PLAIN, '#3a3a3e', bottom=True)
    m.box(-0.62, -0.2, 0.95, 0.62, 0.2, 0.97, PLAIN, '#e0592a', M_GLOW)
    for i in range(6):
        x = -0.5 + i * 0.2
        m.box(x - 0.012, -0.4, 1.0, x + 0.012, 0.34, 1.02, PLAIN, STEEL)
        m.cbox(x, 0, 0.98, 0.07, 0.3, 0.07, PLAIN, '#8a4a2a')
    m.cbox(1.0, 0, 0, 0.4, 0.5, 0.8, WOOD, OAK)
    return m


def yard_batut() -> Model:
    m = Model('yard_batut', COARSE)
    n = 10
    m.cyl(0, 0, 0.55, 0.65, 1.55, 1.55, n, PLAIN, '#2f5f9f', cap=False)
    m.cyl(0, 0, 0.62, 0.64, 1.4, 1.4, n, PLAIN, '#26262a')
    for i in range(6):
        a = 2 * math.pi * i / 6
        x, y = math.cos(a) * 1.5, math.sin(a) * 1.5
        m.cbox(x, y, 0, 0.07, 0.07, 2.1, PLAIN, STEEL)
    for z in (1.2, 2.0):
        m.cyl(0, 0, z, z + 0.05, 1.5, 1.5, n, PLAIN, '#e0b030', cap=False)
    return m


def yard_basketball() -> Model:
    m = Model('yard_basketball', COARSE)
    m.cbox(0, 0.5, 0, 0.7, 0.5, 0.3, CONCRETE, '#8d8d90')
    m.cbox(0, 0.5, 0.3, 0.14, 0.14, 2.7, PLAIN, '#2f5f9f')
    m.box(-0.07, -0.1, 2.75, 0.07, 0.5, 2.88, PLAIN, '#2f5f9f', bottom=True)
    m.box(-0.75, -0.16, 2.3, 0.75, -0.1, 3.3, PLAIN, '#f5f2ea', bottom=True)
    m.box(-0.25, -0.18, 2.45, 0.25, -0.16, 2.8, PLAIN, '#d2573a', bottom=True)
    m.cyl(0, -0.42, 2.4, 2.45, 0.25, 0.25, 8, PLAIN, '#e0592a', cap=False)
    m.cyl(0, -0.42, 2.05, 2.4, 0.14, 0.25, 8, PLAIN, '#f0f0f0', cap=False)
    m.blob(0.5, -0.3, 0.13, 0.13, '#d2773a', 3, 1, PLAIN)
    return m


def roof_solar() -> Model:
    """Tomga o'rnatiladigan qiya quyosh panellari (qiyaligi ~26°)."""
    m = Model('roof_solar', COARSE)
    for x in (-1.2, 0.04):
        a, b = x, x + 1.16
        p = [(a, -0.75, 0.12), (b, -0.75, 0.12), (b, 0.6, 0.78), (a, 0.6, 0.78)]
        m.panel(p, GLASS, '#2a4f86')
        m.poly([(q[0], q[1], q[2] - 0.05) for q in p][::-1], PLAIN, STEEL)
    for x in (-1.1, 0, 1.1):
        m.cbox(x, 0.5, 0, 0.06, 0.06, 0.7, PLAIN, STEEL)
        m.cbox(x, -0.68, 0, 0.06, 0.06, 0.12, PLAIN, STEEL)
    m.box(-1.22, -0.8, 0.06, 1.22, -0.72, 0.14, PLAIN, STEEL, bottom=True)
    return m


def yard_garage() -> Model:
    m = Model('yard_garage', COARSE)
    m.box(-1.9, -2.1, 0, 1.9, 2.1, 2.5, PLASTER, '#e8dcc8', top=False)
    m.box(-2.0, -2.2, 2.5, 2.0, 2.2, 2.7, CONCRETE, '#b9ae9c', bottom=True)
    for i in range(5):
        z = 0.1 + i * 0.42
        m.box(-1.5, -2.16, z, 1.5, -2.1, z + 0.38, PLAIN, '#7f8a92' if i % 2 else '#8d989f', bottom=True)
    m.box(-1.65, -2.18, 2.2, 1.65, -2.1, 2.36, PLAIN, '#3a3f45', bottom=True)
    m.cbox(1.72, -2.18, 2.05, 0.16, 0.14, 0.24, PLAIN, LAMP, M_GLOW)
    m.window('r', 1.9, -0.5, 0.6, 1.2, 1.9)
    return m


def yard_hammock() -> Model:
    m = Model('yard_hammock', COARSE)
    for s in (-1, 1):
        m.box(min(s * 1.35, s * 1.5), -0.5, 0, max(s * 1.35, s * 1.5), 0.5, 0.1, WOOD, OAK)
        m.cbox(s * 1.42, 0, 0.1, 0.12, 0.12, 1.45, WOOD, OAK)
    m.box(-1.4, -0.06, 0, 1.4, 0.06, 0.1, WOOD, OAK)
    xs = [-1.35, -0.8, -0.27, 0.27, 0.8, 1.35]
    zs = [1.3, 0.85, 0.66, 0.66, 0.85, 1.3]
    for i in range(5):
        w0, w1 = (0.08 if i == 0 else 0.42), (0.08 if i == 4 else 0.42)
        p = [(xs[i], -w0, zs[i]), (xs[i + 1], -w1, zs[i + 1]), (xs[i + 1], w1, zs[i + 1]), (xs[i], w0, zs[i])]
        color = ['#d2573a', '#f3ead8'][i % 2]
        m.poly(p, PLAIN, color)
        m.poly(p[::-1], PLAIN, color)
    m.cbox(-0.75, 0, 0.86, 0.3, 0.5, 0.12, PLAIN, '#2f6f72')
    return m


def yard_playground() -> Model:
    """Bolalar maydonchasi: tepalik, arg'imchoq, qumloq."""
    m = Model('yard_playground', COARSE)
    m.box(-3.0, -2.0, 0, 3.0, 2.0, 0.04, PLAIN, '#7fb08a')
    for x in (-2.5, -1.5):
        for y in (0.2, 1.2):
            m.cbox(x, y, 0, 0.12, 0.12, 2.3, PLAIN, '#e0b030')
    m.box(-2.55, 0.15, 1.2, -1.45, 1.25, 1.3, PLAIN, '#d2573a', bottom=True)
    m.hip(-2.5, 0.2, -1.5, 1.2, 2.3, 0.6, 0.15, '#3f8fc0')
    slide = [(-2.3, 0.2, 1.3), (-1.7, 0.2, 1.3), (-1.7, -1.7, 0.15), (-2.3, -1.7, 0.15)]
    m.poly(slide, PLAIN, '#f3cd68')
    m.poly(slide[::-1], PLAIN, '#f3cd68')
    for x in (0.2, 2.6):
        for y in (-0.5, 0.9):
            m.box(x - 0.06, min(y, 0.2) - 0.06, 0, x + 0.06, min(y, 0.2) + 0.06, 0.4, PLAIN, '#2f5f9f')
        m.cbox(x, 0.2, 0, 0.12, 0.12, 2.3, PLAIN, '#2f5f9f')
    m.box(0.15, 0.14, 2.2, 2.65, 0.26, 2.32, PLAIN, '#2f5f9f', bottom=True)
    for x in (0.9, 1.9):
        for dx in (-0.2, 0.2):
            m.cbox(x + dx, 0.2, 0.6, 0.03, 0.03, 1.6, PLAIN, IRON)
        m.cbox(x, 0.2, 0.55, 0.5, 0.25, 0.06, PLAIN, '#d2573a')
    m.box(0.6, -1.8, 0.04, 2.6, -0.7, 0.2, WOOD, OAK, top_layer=SOIL)
    return m


def pet_house() -> Model:
    """It uyi."""
    m = Model('pet_house', COARSE)
    m.box(-0.45, -0.5, 0, 0.45, 0.5, 0.6, WOOD, '#b07a44', top=False)
    m.gable(-0.45, -0.5, 0.45, 0.5, 0.6, 0.4, 0.1, '#a8452f', '#b07a44')
    m.cbox(0, -0.5, 0.02, 0.4, 0.04, 0.42, PLAIN, '#1c120c')
    m.cyl(0.35, -0.75, 0, 0.1, 0.12, 0.14, 6, PLAIN, STEEL)
    return m


# ---------- Daraxtlar ----------
def fruit_tree(name: str, leaf: str, leaf2: str, fruit: str, seed: int, shape: float = 0.85, count: int = 7) -> Model:
    m = Model(name)
    m.cyl(0, 0, 0, 1.2, 0.16, 0.1, 5, WOOD, BARK, cap=False)
    m.blob(0, 0, 2.0, 0.95, leaf, seed, shape)
    m.blob(-0.4, 0.25, 1.7, 0.62, leaf2, seed + 1)
    rnd = random.Random(seed)
    for _ in range(count):
        a, z = rnd.uniform(0, 6.28), rnd.uniform(1.5, 2.5)
        m.cyl(math.cos(a) * 0.86, math.sin(a) * 0.86, z, z + 0.2, 0.1, 0.06, 5, PLAIN, fruit)
    return m


# ---------- Hayvonlar ----------
def legs(m: Model, hx: float, hy: float, h: float, size: float, color: str) -> None:
    for x in (-hx, hx):
        for y in (-hy, hy):
            m.cbox(x, y, 0, size, size, h, PLAIN, color)


def pet_sheep() -> Model:
    m = Model('pet_sheep', COARSE)
    legs(m, 0.16, 0.28, 0.32, 0.08, '#3a2f28')
    m.blob(0, 0.04, 0.58, 0.4, '#efe9dd', 51, 0.8, PLAIN)
    m.box(-0.11, -0.62, 0.55, 0.11, -0.3, 0.82, PLAIN, '#3a2f28', bottom=True)
    for s in (-1, 1):
        m.cbox(s * 0.16, -0.4, 0.72, 0.12, 0.08, 0.06, PLAIN, '#3a2f28')
    return m


def pet_hens() -> Model:
    """Uchta tovuq."""
    m = Model('pet_hens', COARSE)
    for x, y, color in ((-0.4, 0.1, '#f3ead8'), (0.35, 0.25, '#b5602f'), (0.0, -0.4, '#3a2f28')):
        m.cbox(x, y, 0, 0.05, 0.05, 0.14, PLAIN, '#e0a52f')
        m.cbox(x, y, 0.13, 0.2, 0.32, 0.22, PLAIN, color, bottom=True)
        m.cbox(x, y - 0.16, 0.3, 0.11, 0.11, 0.18, PLAIN, color)
        m.cbox(x, y - 0.24, 0.36, 0.05, 0.08, 0.04, PLAIN, '#e0a52f')
        m.cbox(x, y - 0.16, 0.48, 0.04, 0.1, 0.06, PLAIN, '#c0352b')
        m.cbox(x, y + 0.2, 0.28, 0.06, 0.1, 0.18, PLAIN, color)
    return m


def pet_horse() -> Model:
    m = Model('pet_horse', COARSE)
    brown, mane = '#8a5530', '#2a1a12'
    legs(m, 0.2, 0.55, 0.95, 0.15, brown)
    m.box(-0.3, -0.75, 0.85, 0.3, 0.75, 1.45, PLAIN, brown, bottom=True)
    neck = [(-0.14, -0.75, 1.15), (0.14, -0.75, 1.15), (0.14, -0.4, 1.4), (-0.14, -0.4, 1.4)]
    top = [(-0.12, -1.0, 1.85), (0.12, -1.0, 1.85), (0.12, -0.72, 2.0), (-0.12, -0.72, 2.0)]
    for i in range(4):
        j = (i + 1) % 4
        m.poly([neck[i], neck[j], top[j], top[i]], PLAIN, brown)
    m.box(-0.13, -1.35, 1.65, 0.13, -0.75, 1.98, PLAIN, brown, bottom=True)
    m.box(-0.05, -0.8, 1.5, 0.05, -0.5, 2.08, PLAIN, mane)
    m.cbox(0, 0.82, 0.75, 0.1, 0.1, 0.65, PLAIN, mane)
    m.box(-0.32, -0.25, 1.45, 0.32, 0.3, 1.5, PLAIN, '#9c2b34')
    for s in (-1, 1):
        m.cbox(s * 0.08, -0.82, 1.98, 0.06, 0.06, 0.14, PLAIN, brown)
    return m


def pet_dovecote() -> Model:
    """Kaptarxona."""
    m = Model('pet_dovecote', COARSE)
    m.cbox(0, 0, 0, 0.18, 0.18, 1.9, WOOD, OAK)
    m.box(-0.6, -0.5, 1.9, 0.6, 0.5, 2.7, WOOD, '#e6d6b8', bottom=True)
    m.gable(-0.6, -0.5, 0.6, 0.5, 2.7, 0.5, 0.12, '#3f7f8c', '#e6d6b8')
    for x in (-0.3, 0.3):
        m.cbox(x, -0.5, 2.1, 0.22, 0.04, 0.3, PLAIN, '#2a1a12')
        m.cbox(x, -0.6, 2.04, 0.3, 0.2, 0.04, WOOD, OAK)
    for x, y, z in ((-0.3, -0.62, 2.1), (0.1, 0, 3.22), (0.75, 0.2, 0.02)):
        m.cbox(x, y, z, 0.12, 0.24, 0.14, PLAIN, '#cfd4da', bottom=True)
        m.cbox(x, y - 0.13, z + 0.1, 0.08, 0.09, 0.1, PLAIN, '#8d98a5')
    return m


# ---------- Mavsumiy ----------
def special_sumalak() -> Model:
    """Navro'z: katta sumalak qozoni."""
    m = Model('special_sumalak', COARSE)
    for i in range(6):
        a = 2 * math.pi * i / 6
        m.cbox(math.cos(a) * 0.75, math.sin(a) * 0.75, 0, 0.3, 0.3, 0.5, STONE, '#8d867a')
    m.cbox(0, 0, 0, 0.6, 0.6, 0.35, PLAIN, '#f08a2a', M_GLOW)
    m.cyl(0, 0, 0.45, 1.0, 0.7, 1.05, 12, PLAIN, '#26262a', cap=False)
    m.cyl(0, 0, 0.92, 0.95, 0.96, 0.96, 12, PLAIN, '#7a4320')
    m.box(-0.03, -0.1, 0.9, 0.03, 0.02, 2.1, WOOD, OAK)
    for s in (-1, 1):
        m.cbox(s * 1.2, 0.5, 0, 0.5, 0.4, 0.35, WOOD, OAK)
        m.cyl(s * 1.2, 0.5, 0.35, 0.5, 0.14, 0.2, 6, PLAIN, '#6d9a44')
    return m


def light_newyear() -> Model:
    """Yangi yil: rangli chiroqlar (yo'lak bo'ylab)."""
    m = Model('light_newyear', COARSE)
    colors = ['#ff5a4a', '#ffd24a', '#5ad06a', '#5aa0ff']
    for s in (-1, 1):
        for y in (-3, 3):
            m.cbox(s * 2.6, y, 0, 0.08, 0.08, 1.7, PLAIN, IRON)
        m.box(s * 2.6 - 0.01, -3, 1.6, s * 2.6 + 0.01, 3, 1.63, PLAIN, IRON, bottom=True)
        for i in range(9):
            m.cbox(s * 2.6, -2.7 + i * 0.67, 1.38, 0.14, 0.14, 0.2, PLAIN, colors[i % 4], M_GLOW)
    return m


def tree_newyear() -> Model:
    """Bezatilgan archa."""
    m = Model('tree_newyear', COARSE)
    m.cyl(0, 0, 0, 0.6, 0.13, 0.11, 5, WOOD, BARK, cap=False)
    for i in range(4):
        m.cyl(0, 0, 0.5 + i * 0.75, 1.7 + i * 0.78, 1.1 - i * 0.24, 0, 7, LEAF, ['#2f5a3a', '#376643', '#3f714a', '#477c51'][i])
    colors = ['#ff5a4a', '#ffd24a', '#5aa0ff']
    for i in range(12):
        a = i * 2.4
        r, z = 0.95 - (i // 4) * 0.25, 0.75 + (i // 4) * 0.78
        m.cbox(math.cos(a) * r, math.sin(a) * r, z, 0.14, 0.14, 0.14, PLAIN, colors[i % 3], M_GLOW)
    m.cyl(0, 0, 4.0, 4.4, 0.18, 0, 5, PLAIN, '#ffd24a', M_GLOW)
    return m


def light_hayit() -> Model:
    """Hayit: osma fonarlar."""
    m = Model('light_hayit', COARSE)
    for s in (-1, 1):
        for y in (-2.6, 0, 2.6):
            m.cbox(s * 2.5, y, 0, 0.09, 0.09, 1.8, WOOD, OAK)
            m.box(min(s * 2.1, s * 2.5), y - 0.04, 1.74, max(s * 2.1, s * 2.5), y + 0.04, 1.82, WOOD, OAK, bottom=True)
            m.cyl(s * 2.15, y, 1.28, 1.6, 0.16, 0.2, 5, PLAIN, '#ffd98a', M_GLOW, cap=False)
            m.cyl(s * 2.15, y, 1.6, 1.76, 0.22, 0.0, 5, PLAIN, '#2f8f9f')
    return m


def all_decor() -> list[Model]:
    return [
        yard_tandir(), yard_tokzor(), yard_umbrella(), yard_bike(), sign_mailbox(),
        yard_besedka(), yard_mangal(), yard_batut(), yard_basketball(), roof_solar(), yard_garage(), yard_hammock(), yard_playground(), pet_house(),
        fruit_tree('tree_orik', '#7a9a44', '#8aa850', '#f0a030', 61), fruit_tree('tree_olma', '#5d8a3c', '#6f9440', '#d8373a', 63),
        fruit_tree('tree_tut', '#4f7f3a', '#5d8a44', '#3a1a2e', 65, 1.0), fruit_tree('tree_behi', '#7f9a58', '#8fa868', '#e8c840', 67, 0.8),
        pet_sheep(), pet_hens(), pet_horse(), pet_dovecote(),
        special_sumalak(), light_newyear(), tree_newyear(), light_hayit(),
    ]
