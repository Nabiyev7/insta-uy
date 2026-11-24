"""9 ta lyuks bezak (7-leveldan) — uslub-v2.blend dagi bezak_lib funksiyalaridan. Old tomoni -Y; har biri ≤ 600 uchburchak (basseyn, pavilyon ≤ 900). Har birining uzoq shakli — `_lod`."""
import math

from kit_core import COARSE, LEAF, M_GLOW, M_SOFT, PLAIN, Model
from kit_yard import auto, cone_roof, gem

GOLD, MARBLE, MARBLE_B, BLACK = '#d9a93f', '#f4f1ec', '#e3ddd3', '#1e2024'
DARK_WOOD, LEATHER, AQUA, NEON = '#6e4428', '#e8dcc7', '#3fc3e6', '#ffd27a'
LIMO, SUPER, SILVER, DARK_GLASS = '#15171b', '#f2b705', '#c9ced6', '#23282e'
ROSE, LAVENDER, BONSAI, BUSH, SOIL_A, CYPRESS, STEM = '#d8324a', '#9b7bd9', '#3e8e4e', '#3f8f3a', '#8c5e3c', '#2f7a44', '#7a5133'
PARASOL, SPRAY = '#f6f1e7', '#a6e6f5'


def quad(m: Model, x0: float, y0: float, x1: float, y1: float, z: float, color: str, mask: float = 0.0) -> None:
    m.poly([(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)], PLAIN, color, mask)


def disc(m: Model, x: float, y: float, z: float, r: float, color: str, n: int, mask: float = 0.0) -> None:
    m.poly_fan([(x + math.cos(2 * math.pi * i / n) * r, y + math.sin(2 * math.pi * i / n) * r, z) for i in range(n)], PLAIN, color, mask)


def ring(m: Model, z: float, inner: float, outer: float, color: str, n: int) -> None:
    for i in range(n):
        a, b = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        m.poly([(math.cos(a) * inner, math.sin(a) * inner, z), (math.cos(a) * outer, math.sin(a) * outer, z), (math.cos(b) * outer, math.sin(b) * outer, z), (math.cos(b) * inner, math.sin(b) * inner, z)], PLAIN, color)


# ---------- Pavilyon ----------
def pavilion_frame(m: Model, is_lod: bool) -> None:
    for dx in (-2.5, 2.5) if is_lod else (-2.5, 0, 2.5):
        for dy in (-2.3, 2.7):
            m.cyl(dx, dy, 0.35, 3.35, 0.2, 0.2, 4 if is_lod else 8, PLAIN, MARBLE, cap=False)
            if not is_lod:
                m.cyl(dx, dy, 0.35, 0.55, 0.3, 0.26, 8, PLAIN, MARBLE_B, cap=False)
                m.cyl(dx, dy, 3.12, 3.35, 0.22, 0.32, 8, PLAIN, GOLD, cap=False)
    for dy in (-2.3, 2.7):
        m.box(-2.8, dy - 0.2, 3.35, 2.8, dy + 0.2, 3.7, PLAIN, MARBLE, bottom=not is_lod)
    for dx in (-2.5, 2.5):
        m.box(dx - 0.2, -2.1, 3.35, dx + 0.2, 2.5, 3.7, PLAIN, MARBLE, bottom=not is_lod)
    for i in range(4 if is_lod else 8):
        x = -2.45 + i * (1.63 if is_lod else 0.7)
        m.box(x - 0.09, -2.6, 3.7, x + 0.09, 3.0, 3.86, PLAIN, DARK_WOOD, bottom=True)


def lux_pavilyon(is_lod: bool = False) -> Model:
    m = Model('lux_pavilyon_lod' if is_lod else 'lux_pavilyon', COARSE)
    m.box(-3, -2.8, 0, 3, 3.2, 0.35, PLAIN, MARBLE)
    pavilion_frame(m, is_lod)
    m.box(-1.6, 2.2, 0.35, 1.6, 2.45, 1.3, PLAIN, LEATHER)
    m.box(-1.6, 1.3, 0.35, 1.6, 2.2, 0.8, PLAIN, LEATHER)
    if is_lod:
        return m
    m.box(-1.5, -3.35, 0, 1.5, -2.8, 0.18, PLAIN, MARBLE_B)
    for x in (-1.6, 1.35):
        m.box(x, 1.3, 0.8, x + 0.25, 2.2, 1.02, PLAIN, LEATHER)
    m.cbox(0, 0.1, 0.35, 1.6, 0.9, 0.4, PLAIN, BLACK)
    gem(m, 0, 0.1, 0.9, 0.16, GOLD)
    for dx in (-2.5, 0, 2.5):
        m.cbox(dx, -2.3, 2.86, 0.5, 0.5, 0.24, PLAIN, NEON, M_GLOW, bottom=True)
    m.cbox(0, 0.2, 3.1, 0.34, 0.34, 0.4, PLAIN, NEON, M_GLOW, bottom=True)
    m.cbox(0, 0.2, 3.5, 0.06, 0.06, 0.25, PLAIN, GOLD)
    return m


# ---------- Gril oshxona ----------
def lux_gril(is_lod: bool = False) -> Model:
    m = Model('lux_gril_lod' if is_lod else 'lux_gril', COARSE)
    m.box(-1.6, 0.0, 0, 1.6, 1.1, 0.95, PLAIN, MARBLE_B, top=False)
    m.box(-1.7, -0.1, 0.95, 1.7, 1.15, 1.04, PLAIN, BLACK, bottom=not is_lod)
    m.box(-1.75, -0.8, 2.6, 1.75, 1.7, 2.74, PLAIN, DARK_WOOD, bottom=True)
    for x in (-1.55, 1.55):
        m.cbox(x, 1.45, 0, 0.14, 0.14, 2.6, PLAIN, BLACK, top=False)
    m.box(-1.35, 0.15, 1.04, -0.1, 0.95, 1.4, PLAIN, SILVER)
    if is_lod:
        return m
    for i in range(7):
        x = -1.7 + i * 0.567
        m.box(x - 0.03, -0.8, 2.74, x + 0.03, 1.7, 2.8, PLAIN, '#5c3820')
    for x in (-1.55, 1.55):
        m.cbox(x, -0.04, 1.04, 0.1, 0.1, 1.56, PLAIN, BLACK, top=False)
    m.box(-1.35, 0.5, 1.4, -0.1, 0.95, 1.75, PLAIN, SILVER)
    m.box(-1.2, 0.05, 1.5, -0.25, 0.1, 1.56, PLAIN, BLACK, bottom=True)
    for i in range(4):
        x = -1.15 + i * 0.28
        m.box(x, 0.2, 1.4, x + 0.14, 0.45, 1.44, PLAIN, '#ff8a3d', M_GLOW)
    for z in (0.2, 0.72):
        m.box(-1.5, -0.03, z, 1.5, 0.0, z + 0.06, PLAIN, GOLD)
    m.cyl(0.55, 0.55, 1.04, 1.1, 0.24, 0.3, 8, PLAIN, SILVER)
    m.cbox(1.2, 0.6, 1.04, 0.35, 0.5, 0.22, PLAIN, DARK_WOOD)
    for x in (-1.1, 0.0, 1.1):
        m.cyl(x, -0.75, 0, 0.7, 0.07, 0.07, 5, PLAIN, BLACK, cap=False)
        m.cyl(x, -0.75, 0, 0.06, 0.24, 0.24, 8, PLAIN, BLACK)
        m.cyl(x, -0.75, 0.68, 0.8, 0.26, 0.24, 8, PLAIN, LEATHER)
    for x in (-0.9, 0.0, 0.9):
        m.cbox(x, 0.5, 2.3, 0.2, 0.2, 0.2, PLAIN, NEON, M_GLOW, bottom=True)
        m.cbox(x, 0.5, 2.5, 0.04, 0.04, 0.1, PLAIN, BLACK, top=False)
    return m


# ---------- Basseyn + jakuzi ----------
POOL = (-1.1, -3.1, 2.9, 2.3)
DECK = 0.4
LOUNGE = (-3.55, -1.75)


def lounger(m: Model, y: float) -> None:
    """Suyanchig'i ko'tarilgan shezlong (boshi panjara tomonda)."""
    x0, x1 = LOUNGE
    m.box(x0, y - 0.38, 0.1, x1, y + 0.38, 0.28, PLAIN, DARK_WOOD, bottom=True)
    m.box(x0 + 0.45, y - 0.34, 0.28, x1, y + 0.34, 0.4, PLAIN, LEATHER)
    a, b, c, d = (x0, y - 0.34), (x0 + 0.5, y - 0.34), (x0 + 0.5, y + 0.34), (x0, y + 0.34)
    low, high, seat = 0.4, 0.78, 0.28
    m.poly([(*a, high), (*b, low), (*c, low), (*d, high)], PLAIN, LEATHER)
    m.poly([(*d, high), (*d, seat), (*a, seat), (*a, high)], PLAIN, LEATHER)
    m.poly([(*a, seat), (*b, low), (*a, high)], PLAIN, LEATHER)
    m.poly([(*d, seat), (*d, high), (*c, low)], PLAIN, LEATHER)


def pool_lights(m: Model) -> None:
    """Mozaika chiziqlari, suv osti chiroqlari va jakuzi halqasi."""
    x0, y0, x1, y1 = POOL
    for i in range(1, 4):
        y = y0 + (y1 - y0) * i / 4
        quad(m, x0 + 0.5, y, x1 - 0.5, y + 0.06, 0.145, '#8fe0f2', M_SOFT)
    for i in range(5):
        x, y = x0 + 0.35 + i * 0.75, y0 + 0.5 + i
        quad(m, x, y0 + 0.04, x + 0.4, y0 + 0.12, 0.15, NEON, M_GLOW)
        quad(m, x0 + 0.04, y, x0 + 0.12, y + 0.4, 0.15, NEON, M_GLOW)
        if i < 3:
            quad(m, x, y1 - 0.12, x + 0.4, y1 - 0.04, 0.15, NEON, M_GLOW)
            quad(m, x1 - 0.12, y, x1 - 0.04, y + 0.4, 0.15, NEON, M_GLOW)
    for k in range(6):
        a = 2 * math.pi * k / 6
        m.cbox(2.25 + math.cos(a), 2.4 + math.sin(a), 0.5, 0.1, 0.1, 0.04, PLAIN, NEON, M_GLOW)
        gem(m, 2.25 + math.cos(a + 0.5) * 0.45, 2.4 + math.sin(a + 0.5) * 0.45, 0.54, 0.11, '#e9fbff', 0.6)


def lux_basseyn(is_lod: bool = False) -> Model:
    m = Model('lux_basseyn_lod' if is_lod else 'lux_basseyn', COARSE)
    x0, y0, x1, y1 = POOL
    for a, b, c, e in ((x0 - DECK, y0 - DECK, x1 + DECK, y0), (x0 - DECK, y1, x1 + DECK, y1 + DECK), (x0 - DECK, y0, x0, y1), (x1, y0, x1 + DECK, y1)):
        m.box(a, b, 0, c, e, 0.22, PLAIN, MARBLE)
    quad(m, x0, y0, x1, y1, 0.13, AQUA, M_SOFT)
    m.box(1.1, 1.3, 0, 3.4, 3.5, 0.5, PLAIN, MARBLE_B)
    disc(m, 2.25, 2.4, 0.53, 0.9, AQUA, 8 if is_lod else 14, M_SOFT)
    if is_lod:
        m.box(LOUNGE[0], -2.3, 0, LOUNGE[1], 2.3, 0.4, PLAIN, LEATHER)
        for y in (-1.5, 1.5):
            cone_roof(m, -2.5, y, 2.3, 1.1, 0.5, PARASOL, 6)
        return m
    pool_lights(m)
    m.box(1.3, 1.0, 0, 2.2, 1.3, 0.24, PLAIN, MARBLE)
    for y in (-2.25, -0.75, 0.75, 2.25):
        lounger(m, y)
    for y in (-1.5, 1.5):
        m.cyl(-2.5, y, 0, 2.5, 0.06, 0.06, 6, PLAIN, BLACK, cap=False)
        cone_roof(m, -2.5, y, 2.3, 1.1, 0.5, PARASOL, 12)
        gem(m, -2.5, y, 2.84, 0.08, GOLD)
    for x in (-1.05, 0.35):
        m.cyl(x, 3.1, 0, 0.55, 0.28, 0.36, 8, PLAIN, MARBLE_B)
        m.blob(x, 3.1, 0.95, 0.42, BONSAI, 3, 1, LEAF, 1, True, 0.03)
    return m


# ---------- Marmar favvora ----------
def lux_favvora(is_lod: bool = False) -> Model:
    """Old hovli o'ngga mo'ljallangan o'lcham; chapda kattaroq turadi (placement.ts SPOT_SCALE)."""
    m = Model('lux_favvora_lod' if is_lod else 'lux_favvora', COARSE)
    n, k = (8, 6) if is_lod else (18, 12)
    m.cyl(0, 0, 0, 0.36, 1.65, 1.6, n, PLAIN, MARBLE, cap=False)
    ring(m, 0.36, 1.42, 1.6, MARBLE_B, n)
    disc(m, 0, 0, 0.32, 1.44, AQUA, n, M_SOFT)
    m.cyl(0, 0, 0.3, 1.0, 0.24, 0.16, 6 if is_lod else 8, PLAIN, MARBLE_B, cap=False)
    m.cyl(0, 0, 0.95, 1.12, 0.35, 0.86, k, PLAIN, MARBLE, cap=False)
    disc(m, 0, 0, 1.1, 0.82, AQUA, k, M_SOFT)
    m.cyl(0, 0, 1.1, 1.62, 0.15, 0.1, 6, PLAIN, MARBLE_B, cap=False)
    m.cyl(0, 0, 1.58, 1.72, 0.2, 0.5, k, PLAIN, MARBLE, cap=False)
    disc(m, 0, 0, 1.7, 0.47, AQUA, k, M_SOFT)
    m.cyl(0, 0, 1.7, 2.0, 0.08, 0.06, 5, PLAIN, GOLD, cap=False)
    if is_lod:
        gem(m, 0, 0, 2.1, 0.16, GOLD)
        return m
    m.blob(0, 0, 2.1, 0.15, GOLD, 2, 1, PLAIN, 1, True, 0.0)
    ring(m, 1.13, 0.8, 0.88, GOLD, k)
    for i in range(8):
        c, s = math.cos(2 * math.pi * i / 8), math.sin(2 * math.pi * i / 8)
        gem(m, c * 0.92, s * 0.92, 0.82, 0.09, SPRAY, 2.4)
        if i % 2 == 0:
            gem(m, c * 0.54, s * 0.54, 1.42, 0.06, SPRAY, 2.2)
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.3
        gem(m, math.cos(a) * 1.18, math.sin(a) * 1.18, 0.36, 0.12, GOLD, 0.5)
        m.cbox(math.cos(a + 0.5) * 1.5, math.sin(a + 0.5) * 1.5, 0.36, 0.12, 0.12, 0.05, PLAIN, NEON, M_GLOW)
    return m


# ---------- Fransuz bog'i ----------
def lux_bog(is_lod: bool = False) -> Model:
    """Old hovli o'ngga mo'ljallangan o'lcham (3,3 x 3,7); chapda kattaroq turadi (placement.ts SPOT_SCALE)."""
    m = Model('lux_bog_lod' if is_lod else 'lux_bog', COARSE)
    m.box(-1.65, -1.85, 0, 1.65, 1.85, 0.12, PLAIN, MARBLE)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy, color = sx * 0.92, sy * 1.02, ROSE if sx * sy > 0 else LAVENDER
            m.box(cx - 0.62, cy - 0.72, 0.12, cx + 0.62, cy + 0.72, 0.22, PLAIN, color if is_lod else SOIL_A)
            m.cyl(sx * 1.5, sy * 1.7, 0.1, 1.65, 0.2, 0.0, 5 if is_lod else 8, LEAF, CYPRESS)
            for i in range(0 if is_lod else 12):
                gem(m, cx - 0.45 + (i % 3) * 0.45, cy - 0.52 + (i // 3) * 0.35, 0.32, 0.17, color if i % 2 == 0 else BUSH, 0.8)
    m.cyl(0, 0, 0.12, 0.2, 0.46, 0.46, 8, PLAIN, MARBLE_B)
    m.cyl(0, 0, 0.2, 0.62, 0.24, 0.2, 8, PLAIN, MARBLE_B)
    if is_lod:
        gem(m, 0, 0, 0.92, 0.28, GOLD, 1.3)
        return m
    m.blob(0, 0, 0.92, 0.26, GOLD, 2, 1.3, PLAIN, 1, True, 0.0)
    gem(m, 0, 0, 1.32, 0.1, GOLD)
    for sy in (-1, 1):
        m.cbox(0, sy * 1.6, 0.12, 0.14, 0.14, 0.3, PLAIN, NEON, M_GLOW)
    return m


# ---------- Mashinalar ----------
def grille(m: Model, width: float, hl: float, z: float) -> None:
    m.box(-width / 2, -hl - 0.05, z, width / 2, -hl + 0.01, z + 0.22, PLAIN, SILVER, bottom=True)
    for i in range(5):
        x = -width / 2 + width * (i + 0.5) / 5
        m.box(x - 0.03, -hl - 0.06, z + 0.02, x + 0.03, -hl - 0.05, z + 0.2, PLAIN, BLACK)


def lux_limuzin() -> Model:
    m = auto('lux_limuzin', 5.4, 2.0, 0.7, 0.58, 3.1, 0.2, LIMO, 0.14, hub=GOLD)
    grille(m, 1.0, 2.7, 0.52)
    for s in (-1, 1):
        m.box(s - 0.02, -2.3, 0.62, s + 0.02, 2.3, 0.67, PLAIN, GOLD, bottom=True)
        for y in (-0.55, 1.0):
            m.box(s * 0.86 - 0.06, y - 0.06, 1.05, s * 0.86 + 0.06, y + 0.06, 1.63, PLAIN, LIMO, top=False)
    m.box(-0.9, -2.73, 0.36, 0.9, -2.66, 0.44, PLAIN, GOLD, bottom=True)
    gem(m, 0, -2.45, 1.11, 0.07, GOLD)
    return m


def lux_superkar() -> Model:
    m = auto('lux_superkar', 4.6, 2.05, 0.46, 0.42, 1.8, 0.35, SUPER, 0.09, glass=DARK_GLASS, hub=SILVER)
    m.box(-0.5, -2.33, 0.4, 0.5, -2.29, 0.58, PLAIN, BLACK, bottom=True)
    m.box(-0.98, 1.95, 1.08, 0.98, 2.3, 1.14, PLAIN, BLACK, bottom=True)
    m.box(-1.02, -2.36, 0.3, 1.02, -2.2, 0.36, PLAIN, BLACK, bottom=True)
    for s in (-1, 1):
        m.cbox(s * 0.7, 2.1, 0.8, 0.08, 0.2, 0.28, PLAIN, BLACK)
        m.cbox(s * 0.98, 1.0, 0.5, 0.12, 0.4, 0.2, PLAIN, BLACK, bottom=True)
        m.cbox(s * 0.3, 2.3, 0.42, 0.14, 0.06, 0.1, PLAIN, SILVER)
        m.cbox(s * 0.28, -1.4, 0.812, 0.16, 1.5, 0.008, PLAIN, BLACK)
    return m


def lux_jip() -> Model:
    m = auto('lux_jip', 4.95, 2.05, 0.98, 0.74, 3.1, 0.3, SILVER, 0.12, glass=DARK_GLASS, hub=GOLD, wheel=0.43)
    grille(m, 1.2, 2.475, 0.72)
    for s in (-1, 1):
        m.cbox(s * 1.05, 0, 0.34, 0.12, 2.2, 0.08, PLAIN, BLACK, bottom=True)
        m.cbox(s * 0.75, 0.3, 2.16, 0.08, 2.4, 0.08, PLAIN, BLACK)
        for y in (-0.3, 1.0):
            m.cbox(s * 0.89, y, 1.33, 0.1, 0.12, 0.74, PLAIN, SILVER, top=False)
        m.cbox(s * 1.1, -0.88, 1.4, 0.2, 0.15, 0.16, PLAIN, SILVER, bottom=True)
    m.box(-0.95, -2.54, 0.4, 0.95, -2.42, 0.6, PLAIN, BLACK, bottom=True)
    m.box(-0.55, 2.47, 0.75, 0.55, 2.62, 1.3, PLAIN, BLACK, bottom=True)
    return m


def car_lod(name: str, length: float, width: float, body: float, top: float, cab: float, shift: float, color: str, glass: str) -> Model:
    m = Model(f'{name}_lod', COARSE)
    hl, hw = length / 2, width / 2
    y0, y1 = shift - cab / 2 + 0.2, shift + cab / 2 - 0.2
    m.box(-hw, -hl, 0.3, hw, hl, body, PLAIN, color)
    m.box(-hw + 0.14, y0, body, hw - 0.14, y1, top, PLAIN, glass, top=False)
    quad(m, -hw + 0.14, y0, hw - 0.14, y1, top, color)
    for s in (-1, 1):
        for y in (-length * 0.31, length * 0.31):
            m.cbox(s * (hw - 0.03), y, 0.02, 0.14, 0.68, 0.68, PLAIN, '#222326')
    return m


# ---------- Tuvakdagi daraxt ----------
def lux_daraxt(is_lod: bool = False) -> Model:
    m = Model('lux_daraxt_lod' if is_lod else 'lux_daraxt')
    n = 6 if is_lod else 12
    m.cyl(0, 0, 0, 0.8, 0.62, 0.8, n, PLAIN, MARBLE, cap=False)
    m.cyl(0, 0, 0.74, 0.86, 0.84, 0.84, n, PLAIN, GOLD)
    m.cyl(0, 0, 0.86, 2.2, 0.12, 0.1, 5, PLAIN, STEM, cap=False)
    m.blob(0, 0, 2.95, 0.98, BONSAI, 3, 1, LEAF, 1 if is_lod else 2, True, 0.015)
    if not is_lod:
        m.cyl(0, 0, 0, 0.08, 0.7, 0.7, n, PLAIN, GOLD, cap=False)
        for k in range(6):
            a = 2 * math.pi * k / 6
            gem(m, math.cos(a) * 0.55, math.sin(a) * 0.55, 0.9, 0.16, '#ff8fb1' if k % 2 else '#fffffe', 0.8)
    return m


def lux_decor() -> list[Model]:
    """Lyuks bezaklar (tartibi katalogdagi bilan bir xil)."""
    return [lux_pavilyon(), lux_gril(), lux_basseyn(), lux_favvora(), lux_bog(), lux_limuzin(), lux_superkar(), lux_jip(), lux_daraxt()]


def lux_lods() -> list[Model]:
    return [
        lux_pavilyon(True), lux_gril(True), lux_basseyn(True), lux_favvora(True), lux_bog(True),
        car_lod('lux_limuzin', 5.4, 2.0, 1.05, 1.73, 3.1, 0.2, LIMO, '#cde7f2'), car_lod('lux_superkar', 4.6, 2.05, 0.81, 1.33, 1.8, 0.35, SUPER, DARK_GLASS),
        car_lod('lux_jip', 4.95, 2.05, 1.33, 2.17, 3.1, 0.3, SILVER, DARK_GLASS), lux_daraxt(True),
    ]
