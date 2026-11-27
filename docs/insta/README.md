# Instagram postlari (@citylanduz) — 16-qadam

- **Matnlar** (yagona manba): `matnlar.md` — sarlavha, kichik matn, kadr, izoh va xeshteglar. O'zgartirsangiz — `npm run insta`.
- **Izohlar** (post ostiga yoziladigan matn): `izohlar.md` (avtomatik).
- **Ko'rinish**: `korinish.png` — 9 postning bosh slaydlari 3×3 to'rda (1 → 9, chapdan o'ngga).
- **Slaydlar**: `postlar/01/1.png` … `postlar/09/N.png` (1080 × 1350, 34 ta, ≈ 34 MB) — gitda; `npm run insta` qayta yig'adi.
- **Kadrlar keshi**: `kadrlar/*.jpg` — `npm run insta -- --yangi` qaytadan oladi.

## Qanday yig'iladi
1. Lokal dev server demo aholi bilan: `DEMO=1 DEV_DATA=.dev-data-demo npm run dev` (ishlab chiqarish bazasiga tegilmaydi).
2. `npm run insta` — kadrlar saytning **Foto rejimi** grafikasida olinadi (A — oltin soat + maket, D — tun; 4:5, 2× supersampling), niklar umumiy so'zlarga almashtiriladi (`sening_niking`, `qoshnim`…), keyin shablon (`insta/shablon.mjs`) bilan slaydlar yig'iladi.
3. Kadr nomlari va kamera joylari: `insta/build.mjs` → `KADRLAR`.

Promo video va reels (INSTAGRAM-PROMT 2–3-bo'limlar) — hozircha qilinmagan.
