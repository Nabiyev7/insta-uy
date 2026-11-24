# Yangi interfeys (CityLand UZ) — egasi tasdiqlagan namuna asosida

> Egasi bilan kelishilgan (2026-11-24). Namuna: `docs/chat/interfeys-namuna.png` (4 ekran: mehmon, bo'sh joy, uy egasi, do'kon).
> Maqsad: **yangi ko'rinish + hamma mavjud funksiya o'z joyini topadi va to'liq ishlaydi.** Hech bir funksiya yo'qolmasin (yashirilishi mumkin, o'chirilmaydi).
> Kod: `apps/web/src/ui/*`, `app/store.ts` (Panel turlari), `i18n.ts`, `styles.css`.

## 1. Uslub
- Yengil "oyna" panellar: oq ~88% shaffof, blur, yumaloq (14–22 px), yumshoq soya. Shahar orqada ko'rinib turadi.
- Ranglar: asosiy **#1D5A63** (to'q yashil-ko'k), urg'u **tilla #F2B33D → #EAA52A**, matn #1D2B2F / #6A787B, fon #FFFDF8, xavf #D9604A, muvaffaqiyat #2F6B1E/#E1F2D3. Tun rejimida panellar to'q (#1D2B2F 88%).
- Shrift: hozirgi (yumaloq sans), og'irligi 600–900; sarlavha 18–22, matn 13–15, kichik 11–12.
- **Belgilar faqat bitta to'plamdan** (hozirgi `icons.tsx`, yoki Tabler outline — bittasini tanla). Interfeysda emoji yo'q (💰, 🔒, ✨ va h.k. → belgi). Do'kon kartochkalarida emoji o'rniga bezakning **3D rasm-ikonkasi** (Blender'dan avtomatik render, `npm run models` jarayoniga qo'sh; ~128 px webp).
- Bosish maydoni ≥ 44 px; `safe-area-inset`; 360×640 va gorizontal holatda hech narsa bir-biriga tegmaydi; ekran o'rtasi bo'sh.

## 2. Ekran joylashuvi (har bir element qayerda)
| Joy | Mehmon | Uy egasi |
|---|---|---|
| Yuqori chap | joy nomi pill (bosilsa → `street`) | xuddi shu |
| Yuqori o'ng | ≡ menyu | **tanga pill** (son + ⊕ → `coins`), **qo'ng'iroq** (son: notes+transfers → yangi `notes` paneli), ≡ menyu |
| O'ng ustun (vertikal) | rejimlar: **Shahar** (bino belgisi), **Piyoda**, **Mashina** | xuddi shu |
| O'ng ustun ostida (faqat Piyoda) | kayfiyat, foto | xuddi shu |
| O'ng ustun ostida (faqat Mashina) | mashina tanlash (→ `cars`) | xuddi shu |
| Chap past (Piyoda/Mashina) | joystick (mashinada o'ngda tormoz) | xuddi shu |
| Pastdagi karta (bittadan, ustuvorlik bo'yicha) | "Bepul uy oling" + to'lish chizig'i (asoschilar N/100; tugasa — "Bo'sh joy tanlang") | tabrik → kunlik bonus → xazina topildi → yangi bezak e'loni |
| Pastki panel | Xarita · Chat · **[Telegram — kirish]** · Do'kon · Top | Xarita · Chat · **[Uyim]** · Do'kon · Top |

- Namunada "Shahar" rejimi uchun ko'z belgisi ishlatilgan — **tuzat**: Shahar rejimi = bino belgisi; ko'z belgisi = **ekranni tozalash** (hamma UI yashiriladi), u ≡ menyu ichida va foto rejimida.
- Chat tugmasida onlayn soni (yashil nuqta) va o'qilmagan xabar belgisi.
- Xarita paneli: to'liq xarita + **nik/manzil qidiruvi** (alohida qidiruv tugmasi kerak emas).
- Kirmagan odam Do'kon/Chat'ga yozish/Uyim'ni bossa → `auth` (Telegram) oynasi, keyin o'sha joyga qaytadi.

## 3. ≡ Menyu (to'liq ro'yxat, guruhlab)
- **Shahar**: Shahar ishlari (`city`: saylov, hokim, umumiy loyihalar), Gazeta (`gazette`), Telegram kanal havolasi (@citylanduz).
- **Men**: Avatar (`avatar`), Mashinalarim (`cars`), Tanga (`coins`).
- **Sozlamalar** (`settings`): til (uz/ru), sifat (avto/past/o'rta/yuqori), ovoz, tun rejimi, chap qo'l rejimi, bildirishnomalar, ekranni tozalash.
- **Yordam** (`help`), **Qoidalar** (`rules`), **Maxfiylik** (`privacy`).
- Kirgan bo'lsa pastda: Chiqish.

## 4. Pastdan chiqadigan oynalar (bottom sheet) — hammasi bir xil uslubda
| Panel | Ichida |
|---|---|
| Bo'sh uchastka (`plot`, egasiz) | manzil, "Bo'sh", masofa, 3 kartochka (o'lcham, qo'shnilar, asoschi bo'lsa), **"Shu yerda bepul uy qurish"**; yopiq tuman → "Tez kunda" |
| Boshqaning uyi (`plot`) | nik + Instagram havola, level nomi, nishonlar, yozuv, ♥ yurak (bor bo'lsa), ovoz, sovg'a, "Yaqindan ko'rish" (piyoda), shikoyat |
| O'z uyim (`plot` = mine) | level, "Ko'tarish" (narx, tanga), "Bezash" (→ `YardEditor`), ranglar, Stories, ulashish |
| Davlat binosi (`building`) | nomi + bog'langan oyna (gazeta / shahar ishlari / qoidalar) |
| Tijorat binosi (`commerce`) | nomi, "Sotuvda emas" |
| Ko'cha (`street`) | ko'cha nomi, ovoz berish (bor mantiq) |
| Tabrik (`congrats`) | uy qurildi / level oshdi + Stories tugmasi |

## 5. Uyim (`me`) — bo'limlar
Mening uyim (kartochka + uyga uchish) · Bezash · Ranglar va material · Stories · Do'stni taklif (havola + hisoblagich) · Sovg'alar va o'tkazmalar · Buyurtmalarim (`orders`) · Reklamalarim (`ads`) · Avatar · Sozlamalar · Chiqish · Akkauntni o'chirish (pastda, xavf rangida).

## 6. Do'kon — kategoriyalar
Yuqorida tanga soni; gorizontal **tablar**; har tabda 2 ustunli kartochkalar (rasm, nom, narx); pastda "Sinab ko'rish" + "Olish · N".
| Tab | Ichidagi `slot`lar / shart |
|---|---|
| **Yangi** | `isNew` (bo'lsa birinchi tab) |
| **Hovli** | `yard`, `water` (basseyn, besedka, mangal, stol, hovuz) |
| **Bog'** | `tree` + gulzor, gul kamari |
| **Mashina** | `car` |
| **Lyuks** | `min_level ≥ 7` (hamma slotlardan) |
| **Darvoza va yoritish** | `fence`, `gate`, `path`, `sign`, `light`, `roof` |
| **Hayvonlar** | `pet` |
| **To'plamlar** | `sets` (chegirma bilan) |
| **Maxsus** | `special`, mavsumiy, raqamlangan (N/10) |
- Bo'sh tab ko'rsatilmaydi. Kartochka holatlari: oddiy · "YANGI" · qulf ("5-levelda" / "7-levelda") · "Sizda bor" · "Tugadi" · mavsum tugagan.
- Kirmagan odam do'konni **ko'ra oladi**, "Olish" → `auth`.
- **Tekshir**: `packages/shared/src/anchors.ts` dagi `DEFAULT_DECOR_SLOTS = [1,1,1,1,8,…]` bilan bazadagi `decor_slots = [3,4,5,6,8,…]` mos emas. Qoida: hovli bezaklari **5-leveldan** (1–4-levelda 0 joy; ranglar/material/nik lavhasi bu hisobga kirmaydi). Ikkalasini shunga moslab bitta manbaga keltir va test qo'sh.

## 7. Qo'shimcha
- Yuklanish ekrani: CityLand UZ logo + progress; birinchi kirishda 3 qadamli ko'rsatma ("Aylanib ko'r → Joy tanla → Uyingni qur").
- Mikro-animatsiyalar: panel ochilishi (200 ms), tanga olinganda tangalar uchishi, tugmada bosilish effekti, telefon tebranishi (`navigator.vibrate`, bo'lsa).
- Bo'sh uchastkalar ustida sariq **+** belgisi (Shahar rejimida, yaqin masofada), tanlanganda sariq ramka.
- Xato/bo'sh holatlar: internet yo'q, server javob bermadi, ro'yxat bo'sh — har birida tushunarli matn (uz/ru) va "Qayta urinish".

## 8. Tekshiruv (hammasi ishlashi shart)
Playwright e2e (`e2e/`) da quyidagi oqimlar, telefon (360×640, 390×844) va kompyuter o'lchamida, uz va ru tilida:
1. Mehmon: ochiladi → karta ko'rinadi → bo'sh joy bosiladi → oyna → "qurish" → `auth`.
2. Kirish (dev rejim) → uy qurish → tabrik → uy ustida nik.
3. Rejimlar: Shahar ↔ Piyoda ↔ Mashina; joystick faqat kerakli rejimda; mashina tanlash.
4. Pastki panelning **har bir** tugmasi va **menyuning har bir** bandi o'z panelini ochadi va yopiladi (orqaga tugmasi ishlaydi).
5. Do'konning har bir tabi; qulf holatlari (1, 5, 7-level uy bilan); sotib olish → tanga kamayadi → bezak hovlida.
6. Uyim'ning har bir bo'limi; akkauntni o'chirish tasdiq oynasi.
7. Tanga pill, qo'ng'iroq, kunlik bonus kartasi.
8. Ekranni tozalash va qaytish; tun rejimi; sozlamalar saqlanishi.
9. Hech bir elementning boshqasini to'smasligi (avtomatik tekshiruv: tugmalar bounding box kesishmasligi).
- Har ekran uchun skrinshot: `docs/chat/ui-*.png` (`npm run screens` ni kengaytir).
- `npm test`, `npm run typecheck`, `npm run e2e`; `perf.mjs` yomonlashmagan (blur telefonda og'ir bo'lsa — past sifatda blur o'chadi, faqat shaffof fon); tekshiruvchi ✅; `PLAN.md` "Holat"; commit.
