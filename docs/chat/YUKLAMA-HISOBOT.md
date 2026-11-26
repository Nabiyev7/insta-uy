# Yuklama hisoboti (13-qadam, C) — 2026-11-26

## Nima qilindi (ochilishdan oldin minimal)
1. **Snapshot** (`server/src/snapshot.ts`): `GET /snap/city|boot|catalog|sets`:
   - Worker bazadan daqiqasiga ko'pi bilan **1 marta** o'qiydi (Cloudflare Cache API, har ma'lumot markazida).
   - Sayt shundan oladi; ma'lumot o'zgarmasa **304** qaytadi va qayta yuborilmaydi.
   - Server javob bermasa, sayt to'g'ridan-to'g'ri bazaga o'tadi.
   - Natija: **Supabase'ga yuk odamlar soniga bog'liq emas.**
2. **Yangilash oralig'i:** uylar 2 daqiqada, umumiy sozlamalar 5 daqiqada bir (oldin ikkalasi ham har daqiqada).
3. **`my_ping`** (kunlik faollik): oldin har 45 soniyada edi, endi kuniga har tuman uchun **1 marta**.
4. **Chat** xonalarga bo'lingan: 0 — umumiy, 1–12 — mahalla (`server/src/realtime/chat.ts`) — tekshirildi.

## Sinov: `node e2e/load.mjs 500 300` (lokal kompyuter, o'z vaqtinchalik serveri)
500 ta virtual foydalanuvchi, 5 daqiqa. Har biri:
- jonli serverga ulanadi va soniyasiga 8 marta harakat yuboradi (sayt kabi);
- har daqiqada `/snap/city` va `/snap/boot` ni ETag bilan so'raydi.

| Ko'rsatkich | Natija |
|---|---|
| Ulangan (oxirida) | **500 / 500**, ulanish xatosi 0, uzilish 0 |
| Harakat yuborildi | 1 137 533 (≈ 3 800 / soniya) |
| Boshqalarning harakati qabul qilindi | 1 128 986 (har kishiga ≈ 7,5 / soniya) |
| Snapshot so'rovi | 4 756 ta, shundan **4 754 tasi 304** (ma'lumot qayta yuborilmadi), xato 0 |
| Snapshot javob vaqti | p50 2 ms · p95 19 ms · p99 24 ms |

Eslatma: bu lokal kompyuterda. Render bepul serveri (0,1 CPU, 512 MB) ancha kuchsiz — haqiqiy chegara pastroq bo'ladi.

## Bepul tariflar bilan taqqoslash (taxmin)
| Xizmat | Bepul chegara | Bizdagi sarf | Qancha yetadi |
|---|---|---|---|
| **Cloudflare Workers** | 100 000 so'rov / kun | 1 faol kishi-soat ≈ 30 (uylar) + 12 (sozlamalar) + ~5 (bot, kirish, xato) ≈ **47 so'rov** | ≈ **2 100 kishi-soat / kun** (masalan, 6 000 kishi × 20 daqiqa). Bundan oshsa, sayt `/snap` o'rniga to'g'ridan-to'g'ri bazaga o'tadi (ishlayveradi, lekin Supabase yuki oshadi) |
| **Supabase** (bepul) | 500 MB baza; 5 GB chiqish trafigi / oy | Snapshot tufayli ommaviy o'qish ≈ 4 so'rov/daqiqa × ma'lumot markazlari soni; shaxsiy so'rovlar (kirish, xarid, bezash) — harakat bo'lganda | Baza hajmi `/stat` da ko'rinadi (MB va %); 80% ga yetsa — pullik tarif ($25/oy) yoki eski jurnallarni tozalash |
| **Render** (bepul web servis) | 750 soat/oy (bitta servis 24/7 = 744 ✓), 512 MB RAM, 0,1 CPU, **100 GB chiqish / oy** | Har kishiga ~8 "snap" xabari / soniya (yaqindagi o'yinchilar). 50 ta bir vaqtda o'ynasa ≈ 1–2 GB / soat | **Asosiy cheklov — trafik:** o'rtacha 30–50 kishi bir vaqtda bo'lsa oyiga yetadi. Ko'p bo'lsa: Render Starter ($7/oy) yoki tikni 8 → 4 / soniya ga tushirish (admin sozlamasi emas, kod — keyin) |
| **Cloudflare Pages** | statik fayllar — cheklovsiz | sayt fayllari | ✓ |

## Xulosa
- Ochilish uchun yetarli: bir vaqtda **yuzlab** kishini lokal sinovda xatosiz ko'tardi. Baza yuki odamlar soniga bog'liq emas.
- Ochilishdan keyin kuzatish kerak (`/stat`, Render panelidagi Bandwidth, Cloudflare'dagi Workers so'rovlari):
  - Workers kunlik so'rovlari 80% dan oshsa, Workers Paid ($5/oy, 10 mln so'rov).
  - Render trafigi 70 GB/oy dan oshsa, Render Starter yoki tikni kamaytirish.
- Bu qarorlar egasiniki (SAVOLLAR.md, 13-qadam bo'limi).
