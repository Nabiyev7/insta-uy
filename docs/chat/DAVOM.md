# DAVOM — ishni boshqa sessiya/agentda davom ettirish uchun

> Bu fayl yangi Claude (chat yoki Claude Code) yoki Antigravity/Gemini uchun. Avval shuni o'qi, keyin `CLAUDE.md` → `PLAN.md` → `docs/chat/ISHLAR.md`.

## Loyiha qisqacha
**CityLand UZ** — Instagram obunachilari uchun brauzerdagi 3D shahar (React + Three.js, Supabase, Cloudflare). Egasi — loyiha muallifi (dasturchi emas; sodda o'zbek tilida gaplashiladi, savollar variantlar bilan beriladi).

## Ish qanday tashkil qilingan
- **Rejalash** — Claude chat (egasi bilan qarorlar, Blender'da namunalar, promtlar yozish).
- **Kod** — Claude Code (yoki Antigravity), `docs/chat/ISHLAR.md` dagi ro'yxat bo'yicha, har qadam alohida promt fayl.
- Har qadamdan keyin: `tekshiruvchi` agenti (`.claude/agents/tekshiruvchi.md`), tuzatish, `PLAN.md` "Holat", git commit.
- Hal qilinmagan savollar → `docs/chat/SAVOLLAR.md`; hisobot → `docs/chat/HISOBOT.md`.

## Qayerda nima
| Fayl | Nima |
|---|---|
| `docs/chat/ISHLAR.md` | qadamlar ro'yxati, qaysi biri bajarilgan (`[x]`), "Joriy vazifa" |
| `docs/chat/BOSQICHLAR.md` | katta reja: 1 xarita → 2 uy olish → 3 tanga → 4 jonli shahar → 5 ishga tushirish |
| `docs/chat/BOSQICH-2-3-PROMT.md` | joriy katta vazifa (6-qadam) |
| `docs/chat/TANGA-NARXLAR.md`, `TOLOV.md` | tanga va pul qarorlari |
| `docs/chat/RAQOBAT.md` | raqobatchi (novaverse-uz) tahlili |
| `docs/chat/KEYINGI.md` | keyinga qoldirilgan g'oyalar |
| `blender/uslub-v2.blend` | yangi uslub namunalari (uylar 1, 4, 5; bezaklar; `bezak_lib` matni) |
| `blender/reja-v3.blend` | xarita variantlari (tanlangan: "Reja DE") |

## Asosiy qarorlar (2026-11-25 holatiga)
- Uslub umumiy, yorug', tekis ranglar; Farg'onaga bog'lanmagan.
- Shahar 3×3 km, to'rt markaz + yashil bulvar; bosh reja qulflangan (ochish faqat egasining "Qulfni ochishga ruxsat beraman" iborasi bilan).
- Shahar uysiz ochiladi; uy faqat egasi bo'lsa chiziladi. Bitta bepul uy (hovli, 1-level); qo'shimcha uylar pulga.
- Uy leveli 1–5 (6–10 keyin chiziladi); 5-leveldan 2 qavat; bezaklar tanga bilan 5-leveldan; pulga olingan narsaga level cheklovi yo'q.
- Uy/avatar ranglarini o'zgartirish yo'q; shikoyat bo'limi yo'q; nik tasdig'i yo'q.
- Kirish faqat Telegram bot orqali (Instagram bio → bot → shaxsiy havola). Bot username hali egasidan olinmagan.
- Tanga — asosiy valyuta; pul (Stars + so'm) ochilgandan 2–4 hafta keyin yoqiladi.

## Holat (2026-11-26, 07:20)
Bajarilgan: 6-qadam (A–F), 6a `TUZATISH-1`, 6b `QOSHIMCHA-1`, 6c `BOT-PROMT` (Mini App, til, menyu, kanal postlari, admin buyruqlari), 6d `TUZATISH-2` (do'kon 2 qator, so'm narxi yo'q, ⭐ Premium bo'lim, admin faqat egasi Telegram orqali, katta nik, analitika). Render sozlamasi (`render.yaml`) qo'shilgan.

Egasidan: bot **@Citylanduz_bot**, egasi Telegram ID **680462045**, kanal **@citylanduz**. Cloudflare, Supabase, Render akkauntlari ochilgan (GitHub orqali). Jonli server — Render bepul.

## Keyingi navbat
1. **6e `TUZATISH-3.md`** — uyi borlarga "+" belgilari ko'rinmasin; reyting oynasi yiqilmasin (himoyali mijoz, ErrorBoundary). Avval lokal `npm run dev` ni qayta ishga tushirish (eski migratsiyalar bilan ishlab turgan edi).
2. **12-qadam `INTERNET-PROMT.md`** — internetga chiqarish (beta). Egasi yonida: brauzer tasdiqlari, bot tokenini o'zi kiritadi, botni kanalga admin qiladi. Oxirida `SINOV-TELEFON.md` va telefonda sinov.
3. Beta 20–50 kishi → 7-qadam yuklama → ochilish.
4. Keyin (egasi bilan, Blender): premium uylar/bezaklar/mashinalar dizayni va narxi; 6–10-level uylar; avatar qaytarish; login+parol qaytarish (sayt yaxshi ishlay boshlagach). Hammasi `KEYINGI.md`.

## Ishlash tartibi (egasining talabi)
- Egasi bilan sodda o'zbekcha, qisqa; savollar variantli. Vizual narsadan oldin dizayn yo'nalishini so'ra.
- Claude Code: har qadamdan keyin faqat `npm test` + `typecheck` + commit; **tekshiruvchi agent faqat oxirida bir marta**.
