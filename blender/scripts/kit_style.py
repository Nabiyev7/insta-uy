"""Yorug' uslub bo'laklari: ikki nishabli tom, haqiqiy derazalar, buta, gulzor, yumaloq daraxt (namuna: uslub-v2.blend, "Uy L1")."""
from kit_core import BASE, CURB, DOOR, FRAME, GRASS_A, LEAF, LEAVES, M_DOOR, M_GLOW, M_NONE, M_ROOF, M_WALL, PATH, PLAIN, PLASTER, ROOF, SHUTTER_BLUE, TRUNK, WHITE, WINDOW, Model

# Deraza teksturasida: oyna va ramka joyi (rangi va tungi nuri shundan olinadi)
UV_GLASS = [(0.2, 0.6), (0.4, 0.6), (0.4, 0.8), (0.2, 0.8)]
UV_FRAME = [(0.015, 0.4), (0.03, 0.4), (0.03, 0.6), (0.015, 0.6)]
RIB = '#dadada'  # tom qatorlari: tom rangidan sal to'qroq
FLOWERS = ('#f2789f', '#ffd044', '#b58cff')
BUSH = ('#3f8f37', '#4e9f3d')


def _mapped(m: Model, pts: list, uv: list, mask: float) -> None:
    from mathutils import Vector
    from kit_core import rgb
    m.polys.append(([Vector(p) for p in pts], uv, WINDOW, mask, rgb(WHITE), None))


def frame_box(m: Model, x0: float, y0: float, z0: float, x1: float, y1: float, z1: float) -> None:
    """Ramka rangi uy egasi tanlovidan olinadigan quti."""
    a = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)]
    b = [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    for i in range(4):
        j = (i + 1) % 4
        _mapped(m, [a[i], a[j], b[j], b[i]], UV_FRAME, M_NONE)
    _mapped(m, b, UV_FRAME, M_NONE)


def _wall_point(axis: str, at: float, u: float, out: float, z: float) -> tuple[float, float, float]:
    return {'f': (u, at - out, z), 'b': (u, at + out, z), 'l': (at - out, u, z), 'r': (at + out, u, z)}[axis]


def _wall_box(m: Model, axis: str, at: float, u0: float, u1: float, d0: float, d1: float, z0: float, z1: float) -> tuple[float, ...]:
    p, q = _wall_point(axis, at, u0, d0, z0), _wall_point(axis, at, u1, d1, z1)
    return (*(min(a, b) for a, b in zip(p, q)), *(max(a, b) for a, b in zip(p, q)))


def window(m: Model, axis: str, at: float, c: float, z0: float, w: float = 1.5, h: float = 1.5, shutters: bool = False, cross: bool = True) -> None:
    """Oq ramkali, oynasi ko'k deraza; c — markazi, at — devor koordinatasi."""
    half = w / 2
    frame_box(m, *_wall_box(m, axis, at, c - half, c + half, 0, 0.1, z0, z0 + h))
    frame_box(m, *_wall_box(m, axis, at, c - half - 0.1, c + half + 0.1, 0, 0.25, z0 - 0.12, z0))
    g = half - 0.13
    pts = [_wall_point(axis, at, u, 0.13, z) for u, z in ((c - g, z0 + 0.1), (c + g, z0 + 0.1), (c + g, z0 + h - 0.1), (c - g, z0 + h - 0.1))]
    _mapped(m, pts if axis in 'fr' else pts[::-1], UV_GLASS, M_GLOW)
    if cross:
        frame_box(m, *_wall_box(m, axis, at, c - 0.04, c + 0.04, 0.13, 0.17, z0 + 0.1, z0 + h - 0.1))
        frame_box(m, *_wall_box(m, axis, at, c - g, c + g, 0.13, 0.17, z0 + h / 2 - 0.04, z0 + h / 2 + 0.04))
    if shutters:
        for s in (-1, 1):
            mid = c + s * (half + 0.25)
            m.box(*_wall_box(m, axis, at, mid - 0.225, mid + 0.225, 0, 0.1, z0, z0 + h), PLAIN, SHUTTER_BLUE)


def door(m: Model, y: float, c: float, z: float, w: float = 1.1, h: float = 2.2) -> None:
    frame_box(m, c - w / 2 - 0.15, y - 0.06, z - 0.05, c + w / 2 + 0.15, y, z + h + 0.15)
    m.panel([(c - w / 2, y - 0.09, z), (c + w / 2, y - 0.09, z), (c + w / 2, y - 0.09, z + h), (c - w / 2, y - 0.09, z + h)], PLAIN, DOOR, M_DOOR)
    m.cbox(c + w * 0.36, y - 0.13, z + 1.0, 0.1, 0.08, 0.1, PLAIN, '#ffd044')


def walls(m: Model, x0: float, y0: float, x1: float, y1: float, h: float, base: float = 0.45) -> None:
    """Poydevor, devor va oq karniz."""
    m.bevel = 0.06
    m.box(x0 - 0.15, y0 - 0.15, 0, x1 + 0.15, y1 + 0.15, base, PLAIN, BASE)
    m.box(x0, y0, base, x1, y1, h, PLASTER, WHITE, M_WALL, top=False)
    m.bevel = 0.0
    m.box(x0 - 0.12, y0 - 0.12, h - 0.16, x1 + 0.12, y1 + 0.12, h + 0.02, PLAIN, FRAME, bottom=True)


def gable(m: Model, x0: float, y0: float, x1: float, y1: float, z: float, h: float, axis: str = 'x', over: float = 0.7, ribs: int = 4, trim: tuple[bool, bool] = (True, True)) -> None:
    """Ikki nishabli tom: qalinligi, qatorlari, tizmasi va frontoni bilan. axis — tizma yo'nalishi; trim — qaysi uchida fronton bor."""
    flip = axis == 'y'
    u0, u1, v0, v1 = (y0, y1, x0, x1) if flip else (x0, x1, y0, y1)

    def at(u: float, v: float, w: float) -> tuple[float, float, float]:
        return (v, u, w) if flip else (u, v, w)

    def face(pts: list, layer: int, color: str, mask: float) -> None:
        m.poly(pts[::-1] if flip else pts, layer, color, mask)

    vm, half = (v0 + v1) / 2, (v1 - v0) / 2
    slope = h / half
    a, b = u0 - over * (1 if trim[0] else 0), u1 + over * (1 if trim[1] else 0)
    drop = over * slope
    t = 0.24
    for s in (-1, 1):
        edge = vm + s * (half + over)
        low = [at(a, edge, z - drop + t), at(b, edge, z - drop + t)]
        ridge = [at(b, vm, z + h + t), at(a, vm, z + h + t)]
        under = [at(a, edge, z - drop), at(b, edge, z - drop), at(b, vm, z + h), at(a, vm, z + h)]
        quad = [*low, *ridge]
        face(quad if s < 0 else quad[::-1], ROOF, WHITE, M_ROOF)
        face(under[::-1] if s < 0 else under, PLAIN, '#efe9df', M_NONE)
        lip = [at(a, edge, z - drop), at(b, edge, z - drop), at(b, edge, z - drop + t), at(a, edge, z - drop + t)]
        face(lip if s < 0 else lip[::-1], PLAIN, RIB, M_ROOF)
        for u, sign in ((a, -1), (b, 1)):
            cap = [at(u, edge, z - drop), at(u, edge, z - drop + t), at(u, vm, z + h + t), at(u, vm, z + h)]
            face(cap if s * sign > 0 else cap[::-1], PLAIN, RIB, M_ROOF)
        for i in range(1, ribs + 1):
            k = i / (ribs + 1)
            v, zz = edge + (vm - edge) * k, z - drop + t + (h + drop) * k
            dv, dz = -s * 0.12, 0.12 * slope
            lipq = [at(a, v, zz), at(b, v, zz), at(b, v, zz + 0.08), at(a, v, zz + 0.08)]
            topq = [at(a, v, zz + 0.08), at(b, v, zz + 0.08), at(b, v + dv, zz + dz + 0.01), at(a, v + dv, zz + dz + 0.01)]
            face(lipq if s < 0 else lipq[::-1], PLAIN, RIB, M_ROOF)
            face(topq if s < 0 else topq[::-1], PLAIN, '#e6e6e6', M_ROOF)
    for u, sign, has in ((u0, -1, trim[0]), (u1, 1, trim[1])):
        if has:
            tri = [at(u, v0, z), at(u, v1, z), at(u, vm, z + h)]
            face(tri if sign > 0 else tri[::-1], PLASTER, WHITE, M_WALL)
    p, q = at(a - 0.05, vm - 0.17, z + h + t - 0.06), at(b + 0.05, vm + 0.17, z + h + t + 0.16)
    m.box(*(min(i, j) for i, j in zip(p, q)), *(max(i, j) for i, j in zip(p, q)), PLAIN, RIB, M_ROOF)


def chimney(m: Model, x: float, y: float, z0: float, z1: float) -> None:
    m.bevel = 0.04
    m.cbox(x, y, z0, 0.8, 0.8, z1 - z0, PLAIN, '#b5614a', top=False)
    m.bevel = 0.0
    m.cbox(x, y, z1, 1.0, 1.0, 0.15, PLAIN, BASE, bottom=True)


def column(m: Model, x: float, y: float, z0: float, z1: float, r: float = 0.13) -> None:
    m.cyl(x, y, z0, z1, r, r, 8, PLAIN, FRAME, cap=False)


def bush(m: Model, x: float, y: float, z: float = 0.42, r: float = 0.62, seed: int = 1) -> None:
    m.blob(x, y, z, r, BUSH[seed % 2], seed, 0.82, LEAF, 2)


def flower_bed(m: Model, x: float, y: float, w: float = 2.4, seed: int = 0) -> None:
    m.box(x - w / 2, y - 0.45, 0, x + w / 2, y + 0.45, 0.25, PLAIN, '#8a5a36')
    n = max(3, round(w / 0.36))
    for i in range(n):
        fx = x - w / 2 + 0.25 + (w - 0.5) * i / (n - 1)
        fy = y + 0.14 * (1 if (i + seed) % 2 else -1)
        m.blob(fx, fy, 0.38, 0.18, FLOWERS[(i * 2 + seed) % 3], 2, 1, PLAIN, 1)


def lantern(m: Model, x: float, y: float, z: float) -> None:
    m.cbox(x, y - 0.14, z, 0.2, 0.2, 0.32, PLAIN, '#fff0c4', M_GLOW)
    m.cbox(x, y - 0.14, z + 0.32, 0.3, 0.3, 0.08, PLAIN, '#4a4f57')


def steps(m: Model, x0: float, x1: float, y: float, z: float, n: int = 2, depth: float = 0.45) -> None:
    """Zina: y — yuqori cheti, -Y ga tushadi."""
    for i in range(n):
        top = z * (n - i) / (n + 1)
        m.box(x0 - i * 0.12, y - depth * (i + 1), 0, x1 + i * 0.12, y - depth * i, top, PLAIN, CURB)


def lean_to(m: Model, x0: float, x1: float, y_wall: float, y_out: float, z_wall: float, z_out: float, t: float = 0.2, over: float = 0.3) -> None:
    """Devorga suyangan bir nishab tom (ayvon usti)."""
    a, b = x0 - over, x1 + over
    top = [(a, y_out, z_out + t), (b, y_out, z_out + t), (b, y_wall, z_wall + t), (a, y_wall, z_wall + t)]
    m.poly(top, ROOF, WHITE, M_ROOF)
    m.poly([(a, y_wall, z_wall), (b, y_wall, z_wall), (b, y_out, z_out), (a, y_out, z_out)], PLAIN, '#efe9df')
    m.poly([(a, y_out, z_out), (b, y_out, z_out), (b, y_out, z_out + t), (a, y_out, z_out + t)], PLAIN, RIB, M_ROOF)
    m.poly([(b, y_out, z_out), (b, y_wall, z_wall), (b, y_wall, z_wall + t), (b, y_out, z_out + t)], PLAIN, RIB, M_ROOF)
    m.poly([(a, y_wall, z_wall), (a, y_out, z_out), (a, y_out, z_out + t), (a, y_wall, z_wall + t)], PLAIN, RIB, M_ROOF)


# ---------- Daraxtlar ----------
def crown(m: Model, blobs: tuple[tuple[float, float, float, float, int], ...], sub: int = 2, seed: int = 3) -> None:
    for i, (x, y, z, r, c) in enumerate(blobs):
        m.blob(x, y, z, r, LEAVES[c], seed + i, 0.98, LEAF, sub, True, 0.04)


def tree(name: str, blobs: tuple[tuple[float, float, float, float, int], ...], trunk: float, r: float = 0.25, sub: int = 2) -> Model:
    """3–4 yumaloq barg to'dasidan iborat stilize daraxt."""
    m = Model(name)
    m.cyl(0, 0, 0, trunk, r, r * 0.75, 7, PLAIN, TRUNK, cap=False)
    crown(m, blobs, sub)
    return m


ROUND = ((0, 0, 2.7, 1.65, 0), (0.75, -0.4, 3.2, 1.18, 1), (-0.65, 0.35, 3.5, 1.02, 2), (0, 0.2, 4.0, 0.85, 1))
WIDE = ((0, 0, 2.9, 1.7, 0), (1.15, 0.3, 2.9, 1.2, 1), (-1.1, -0.2, 3.1, 1.2, 2), (0.1, 0.1, 3.9, 1.1, 1))
TALL = ((0, 0, 2.4, 1.25, 0), (0.15, -0.1, 3.5, 1.15, 1), (-0.1, 0.1, 4.6, 0.9, 2), (0, 0, 5.4, 0.55, 1))
SLIM = ((0, 0, 2.2, 1.05, 1), (0.1, 0.1, 3.1, 0.95, 2), (-0.1, 0, 3.9, 0.7, 0))
BIG = ((0, 0, 4.4, 2.3, 0), (1.5, 0.4, 4.7, 1.7, 1), (-1.4, -0.4, 5.0, 1.6, 2), (0.1, 0.5, 6.0, 1.5, 1))


def trees() -> list[Model]:
    """Hovli va ko'cha daraxtlari; _lod — uzoqdan ko'rinadigani."""
    return [
        tree('tree_round', ROUND, 2.0), tree('tree_wide', WIDE, 2.0, 0.28), tree('tree_tall', TALL, 1.7, 0.2), tree('tree_slim', SLIM, 1.5, 0.18),
        tree('tree_chinor', BIG, 3.2, 0.36),
        tree('tree_chinor_lod', ((0, 0, 4.5, 2.5, 0), (0.5, 0.2, 5.6, 1.8, 2)), 2.6, 0.3, 1),
        tree('tree_round_lod', ((0, 0, 2.9, 1.75, 0), (0.3, 0.1, 3.6, 1.2, 2)), 1.6, 0.2, 1),
        tree('tree_terak', ((0, 0, 2.6, 1.05, 0), (0.1, 0.05, 4.2, 1.1, 1), (-0.05, 0, 5.9, 0.95, 2), (0, 0, 7.3, 0.65, 1)), 1.8, 0.2),
        tree('tree_terak_lod', ((0, 0, 3.2, 1.1, 0), (0, 0, 5.6, 1.15, 1)), 1.8, 0.2, 1),
    ]


def path_stone() -> Model:
    """Qadam toshlari: darvozadan eshikkacha."""
    m = Model('path_stone')
    for i in range(9):
        y = -8.1 + i * 1.95
        dx, w, d = ((0.08, 1.6, 1.15), (-0.06, 1.5, 1.2), (0.02, 1.55, 1.1))[i % 3]
        m.cbox(dx, y, 0, w, d, 0.12, PLAIN, PATH)
    return m


def lawn_patch(m: Model, x: float, y: float, r: float) -> None:
    m.cyl(x, y, 0, 0.05, r, r * 0.8, 9, PLAIN, GRASS_A)
