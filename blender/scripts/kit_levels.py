"""Uy levellari. Hozir faqat 1–5 eksport qilinadi (egasi, 2026-11-25); 6–10 modellari shu yerda qoladi — keyin MAX_LEVEL ni oshirish kifoya
(saytda `TIERS`, bazada `private.max_tier()` bilan birga)."""
from kit_core import GLASS, PLAIN, SOIL, STONE, WOOD, Model
from kit_houses import house4, moulding
from kit_levels_low import finial as plain_finial
from kit_levels_low import lantern, low_levels, planter, steps
from kit_palace import grand_palace, palace

GOLD = '#d9a93f'
MAX_LEVEL = 5


def finial(m: Model, x: float, y: float, z: float, h: float = 0.8) -> None:
    plain_finial(m, x, y, z, h, GOLD)


def level8() -> Model:
    m = house4('house8')
    wood = '#9a6a3c'
    # shisha zal va tosh burchaklar
    m.panel([(3.3, -5.08, 0.35), (6.2, -5.08, 0.35), (6.2, -5.08, 3.15), (3.3, -5.08, 3.15)], GLASS)
    for x in (3.0, 6.25):
        m.box(x - 0.1, -5.2, 0, x + 0.35, -4.8, 3.4, STONE, '#cbbfa9')
    moulding(m, 3.0, 6.5, -5.1, 3.15, 0.3)
    moulding(m, -6.7, 3.0, -5.2, 3.3, 0.3)
    # ikkinchi qavat soyaboni: ayvon ustida
    for x in (-6.3, -3.3, -0.3, 2.6):
        m.cyl(x, -4.9, 3.6, 6.1, 0.14, 0.12, 6, WOOD, wood, cap=False)
    m.box(-6.75, -5.25, 6.1, 3.05, -5.0, 6.35, WOOD, '#b98a5c', bottom=True)
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


def all_levels() -> list[Model]:
    """Eksport qilinadigan uy levellari: 1..MAX_LEVEL."""
    return [*low_levels(), house4('house7'), level8(), palace('house9'), grand_palace('house10')][:MAX_LEVEL]
