# Tuzatish 3 — uyi borlarga "+" ko'rinmasin (egasi, 2026-11-26)

Muammo: odam bepul uyini olgandan keyin ham bo'sh joylarda sariq **"+"** belgisi, ramka va "Bu joy sizni kutyapti" belgilari ko'rinib turibdi (`apps/web/src/world/markers.ts`, `CityLayer.tsx`). Bosganda faqat "Bepul uyingiz bor" chiqadi (`PlotPanel.tsx:24`) — bu chalg'itadi, odam yana uy olsa bo'ladi deb o'ylaydi.

Qoida: **`profile.free_used = true` bo'lsa** (bepul uy olingan) —
1. Bo'sh joylardagi **"+" belgisi, sariq ramka, yonib-o'chadigan "Bu joy sizni kutyapti" belgilari ko'rinmaydi** (markerlar qatlami umuman chizilmaydi — tezlik uchun ham yaxshi). Bo'sh joy taxtachasi oddiy ko'rinishda qolishi mumkin.
2. Bo'sh joyni bossa — faqat manzil va "Bo'sh joy" (uy qurish tugmasi va "Telegram orqali 10 soniyada" yozuvi yo'q). "Bepul uyingiz bor (1 kishiga 1 ta)" kichik izoh bo'lib qolsin.
3. Ekran tepasidagi "Bugun N kishi uy oldi" hisoblagichi bosilganda bo'sh joyga uchmaydi (uyi bor odamga — o'z uyiga), "Bepul uy oling" kartasi chiqmaydi.
4. Uy olingan zahoti (sahifani yangilamasdan) belgilar darhol yo'qoladi.
5. **Istisno — admin sinov rejimi** (`test_mode`): belgilar ko'rinaveradi, bir nechta uy olish mumkin.
6. Mehmon (kirmagan) va hali uy olmaganlarda — hozirgidek.
- Server allaqachon ikkinchi bepul uyni rad etadi (`e_free_used`) — tekshir va test qo'sh.
- Kelajakda premium uy (pulga) sotuvga chiqqanda — u faqat Do'kon → ⭐ Premium orqali olinadi, bo'sh joydagi "+" orqali emas.

## 2. Reyting oynasi buziladi (egasi topdi)
Sabab: lokal server eski migratsiyalar bilan ishlab turgan — `api_rankings` javobida `popular` yo'q, `RankPanel` (`SocialPanels.tsx`) esa `data?.popular.length` qiladi → oyna yiqiladi.
- Mijoz **himoyali** bo'lsin: serverdan kelgan har ro'yxat yo'q bo'lsa — bo'sh ro'yxat (`?? []`), oyna yiqilmasin; boshqa panellarda ham shunday joylarni qidir (`.length`, `.map` to'g'ridan-to'g'ri javob maydonida).
- Bitta panel xato bersa — butun ilova emas, faqat o'sha bo'lim "Yuklab bo'lmadi · Qayta urinish" ko'rsatsin (ErrorBoundary har oyna uchun).
- `npm run dev` ishga tushganda migratsiyalar qo'llanadi — README'ga: "Yangi kod tortilgandan keyin `npm run dev` ni qayta ishga tushiring".
- Test: `api_rankings` javobida maydon yo'q bo'lsa ham `RankPanel` chiziladi.

 (free_used → markerlar yo'q, test_mode → bor), e2e (uy olish → "+" yo'qoladi), `npm test`, `npm run typecheck`, skrinshot `ui-uyi-bor.png`, commit `fix: tuzatish 3 — uyi borlarga bo'sh joy belgilari ko'rinmaydi`.
