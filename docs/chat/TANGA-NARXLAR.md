# Tanga: topish va narxlar (2-variant, tezroq o'sish — 2026-11-24; narxlar yangilandi 2026-11-27)

> **2026-11-27 (15-qadam, TUZATISH-6): tanga bilan sotiladigan hamma narx × 0,5.**
> - Yaxlitlash: 1 000 gacha — 10 ga, 1 000–9 999 — 50 ga, 10 000 dan — 500 ga (o'rtada — juftga: 75 → 80, 225 → 220).
> - Har tovarning narxi va leveli: `TUZATISH-6.md` 6-band jadvali; amaldagisi bazada, admin → Bezaklar.
> - To'plamlar: sotuvdagi tarkib yig'indisidan 20% chegirma (avtomatik).
> - Tanga **topish** miqdorlari va premium (Stars) tovar narxlari o'zgarmadi.

> Hammasi admin panelda o'zgartiriladi. Mo'ljal: odam **1-kuniyoq** natija ko'radi (2-level), **1 haftada** 3-level, **1 oyda** 5-level. Eng yuqori levellar — eng faol va ko'p do'st taklif qilganlar uchun (bir necha oy).

## Topish
| Qayerdan | Tanga |
|---|---|
| Birinchi 100 kishi (bir marta) | 1 000 |
| Kunlik kirish | 100 |
| Ketma-ket 7 kun kirish (bonus) | +300 |
| Telegram kanalga obuna (bir marta) | 300 |
| Do'st taklifi (do'st uy olsa) | 500 |
| "Haftaning hovlisi" g'olibi | 2 000 |
| Xazina ovi (bitta topilma) — **vaqtincha o'chirilgan, keyin ko'rib chiqiladi (2026-11-26)**, `treasure_enabled=false` | 50, kuniga ko'pi bilan 3 ta |

Har kuni kirib, xazina izlaydigan odam: kuniga ~250, haftasiga ~2 000, oyiga ~8 000–9 000 (+ referallar).

## Uy levellari
> 2026-11-25: hozircha faqat **1–5-level**. 6–10 qatorlari — keyin, yangi modellar chizilgach.

| Level | Narx | Jami (1 dan) | Faol odamga qancha vaqt |
|---|---|---|---|
| 1 | tekin | 0 | darhol |
| 2 | 150 *(oldin 300)* | 150 | 1-kun |
| 3 | 500 *(oldin 1 000)* | 650 | ~3 kun |
| 4 | 1 000 *(oldin 2 000)* | 1 650 | ~1 hafta |
| 5 | 1 750 *(oldin 3 500)* | 3 400 | ~2 hafta |
| 6 *(hozircha yopiq)* | 5 000 | 11 800 | ~1,5 oy |
| 7 | 7 000 | 18 800 | ~2,5 oy |
| 8 | 9 500 | 28 300 | ~3,5 oy |
| 9 | 12 500 | 40 800 | ~5 oy |
| 10 | 16 000 | 56 800 | ~6–7 oy (do'st taklif qilsa 2–3 oy) |

## Bezaklar
| Toifa | Misollar | Narx |
|---|---|---|
| Oddiy | gul, kichik daraxt, panjara, o'rindiq | 40–150 *(oldin 80–300)* |
| O'rta | besedka, mangal, batut, hovuz, it uyi | 200–400 *(oldin 400–800)* |
| Katta | mashina, bolalar maydonchasi, ot | 500–1 250 *(oldin 1 000–2 500)* |
| Mavsumiy (vaqtincha) | Navro'z, Yangi yil, Hayit | 250–750 *(oldin 500–1 500)* |
| Noyob va lyuks | tovus, haykal, lyuks mashinalar, basseyn | 1 500–7 500 *(oldin 3 000–15 000)* |

### Tanga paketlari (Telegram Stars, 2026-11-27)
| Paket | Oldin | Hozir |
|---|---|---|
| 1 | 3 000 tanga — 60 ⭐ | **5 000 tanga — 50 ⭐** |
| 2 (Ommabop) | 7 000 — 125 ⭐ | **12 000 — 100 ⭐** |
| 3 (Eng foydali) | 16 000 — 250 ⭐ | **28 000 — 200 ⭐** |

## Boshqalar
> Uy va avatar ranglarini o'zgartirish **olib tashlandi** (2026-11-25).

| Narsa | Narx |
|---|---|
| Darvozadagi nik lavhasi | 100 *(oldin 200)* |
| Salyut (24 soat, tanga bilan) | 1 000 *(oldin 2 000)* |
| Avatar kiyimlari | oddiylari tekin, qolganlari 100–500 |
| Markaziy ko'cha nomi | 10 000 |

## Qoidalar (egasi bilan kelishilgan)
- Pul birligining nomi: **Tanga** (ruscha: монеты).
- **Kunlik seriya:** bir kun kirilmasa — seriya darhol noldan boshlanadi.
- **Tanga o'tkazish — olib tashlandi (2026-11-26).** Kod qoladi, `coins_transfer_enabled=false`; quyidagi qoidalar faqat qayta yoqilsa amal qiladi:
  - bir odam kuniga ko'pi bilan **500 tanga** yubora oladi va **1 000 tanga** qabul qila oladi;
  - komissiya yo'q (yuborilgan miqdor to'liq yetib boradi);
  - faqat uyi va Telegram'i bor akkauntlar orasida; o'ziga (bir qurilma) yuborib bo'lmaydi;
  - hamma o'tkazmalar admin panelda ko'rinadi, shubhali akkauntni bloklash mumkin;
  - vaqtga bog'liq cheklov yo'q (yangi akkaunt ham yubora oladi).
- **Uy bo'shatilganda tanga/level/bezaklar:** keyin hal qilinadi.
