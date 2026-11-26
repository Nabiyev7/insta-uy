# Tuzatish 4 — interfeys (egasi telefonda sinadi, 2026-11-26)

> Egasi Telegram Mini App'da sinab ko'rdi: hammasi yaxshi ishlayapti, ba'zi joylarni o'zgartirish kerak. Bu ro'yxat to'ldirib boriladi.

## 1. Tanga yuborish — olib tashlanadi (egasi)
Tanga o'tkazish (bir odamdan boshqasiga) **hamma joydan** olinadi:
- Sayt: Tanga oynasidagi "Tanga yuborish" bo'limi (`SocialPanels.tsx` → `SendCoins`), "Sovg'alar va o'tkazmalar" nomi → **"Sovg'alar"** (faqat bezak sovg'asi), xabarlar oynasidagi "Sizga tanga yuborishdi" turi (`NotesPanel.tsx`), Yordam va Qoidalar matnidagi eslatmalar.
- Bot: tanga yuborish haqidagi xabar va matnlar (bo'lsa).
- Admin panel: "Iqtisod"dagi o'tkazmalar bo'limi va sozlamalari (`Economy.tsx`) yashiriladi.
- Server: `my_send_coins` **o'chiriladi** — `coins_transfer_enabled` (sukut **false**) bayroqchasi ortida, o'chiq bo'lsa `forbidden`. Jadval va kod qoladi (keyin kerak bo'lsa yoqiladi). Admin sinov rejimida ham o'chiq.
- `docs/chat/TANGA-NARXLAR.md` dagi "Tanga o'tkazish" qoidasi — "olib tashlandi (2026-11-26)".
- Test: RPC o'chiq → rad; Tanga oynasida "Tanga yuborish" yo'q; i18n dagi ishlatilmay qolgan kalitlar testga to'sqinlik qilmasin.

## 2. Admin sinov rejimini o'chirganda ham "+" qolyapti (egasi)
`canClaimFree` (`logic/lively.ts`) `free_used` ga qaraydi, lekin admin sinov rejimida olgan uylar `is_test` — `free_used` o'rnatilmaydi. Natija: admin sinov rejimini o'chirsa ham "uy olmagan" bo'lib ko'rinadi, "+" va "Uy qurish" turaveradi.
- Qoida: **istalgan uyi bor** (sinov uyi ham) va sinov rejimi o'chiq bo'lsa → "+" yo'q, "Uy qurish" yo'q (oddiy odam ko'rinishi to'liq).
- Sinov rejimini almashtirganda belgilar darhol yangilanadi (sahifani qayta ochmasdan).
- Test: admin + sinov uyi + test_mode=false → markerlar yo'q; test_mode=true → bor.

## 3. Premium — sayt faqat ko'rsatadi, xarid botda (egasi)
- Saytdagi Do'kon → ⭐ Premium: tovarlar, rasmlar, narx (so'm va ⭐) **faqat ko'rinadi**. Tugma: **"Botda sotib olish"** → botga chuqur havola (`t.me/Citylanduz_bot?start=buy_<id>`; Mini App ichida `Telegram.WebApp.openTelegramLink`, brauzerda oddiy havola). Saytning o'zida to'lov oynasi (karta formasi, `openInvoice`) **yo'q**.
- Bot `buy_<id>` ni olganda: tovar rasmi, nomi, narxi va to'lov tugmalari (⭐ Stars; karta — yoqilgan bo'lsa). To'lovdan keyin tovar darhol hovlida/hisobda paydo bo'ladi, bot "✅ Tayyor — saytda ko'ring" + "🏙 Shahar" tugmasi.
- Bot menyusidagi "🛍 Do'kon" ham premium tovarlarni ko'rsatadi va xarid qiladi.
- `payments_enabled=false` bo'lsa: saytda tugma "Tez kunda" (botga yubormaydi), botda ham "Tez kunda". Admin sinov rejimida: botda "Sinov xaridi".
- Tanga paketlari ham shu tartibda (saytda ko'rinadi, xarid botda).
- Test: saytda premium tugmasi botga havola; to'lov komponenti saytda chaqirilmaydi; bot `buy_<id>` → invoice; to'lov o'chiq holatlari.

## 4. Sayt ba'zi tarmoqlarda Chrome'da ochilmayapti (tekshirish kerak)
Egasining kompyuterida (uy Wi-Fi) `https://citylanduz.pages.dev` **Chrome'da ochilmadi**: `ERR_QUIC_PROTOCOL_ERROR`, QUIC o'chirilsa `ERR_CONNECTION_RESET` (ECH va post-kvant kalitlarini o'chirish ham yordam bermadi). Shu kompyuterdan `curl` va PowerShell bilan esa 200 qaytadi; API (`workers.dev`) va Render ham javob beradi. Telegram Mini App ichida telefonda ishlagan. Taxmin: provayderning filtri Chrome ulanishini `*.pages.dev` ga uzmoqda.
- Sababini aniqla (DNS — Chrome secure DNS va tizim DNS boshqa IP beryaptimi; TLS; IPv6). `e2e/prod.mjs` ga `--disable-quic` qo'sh va xatoni aniq yozsin.
- Agar `*.pages.dev` ba'zi provayderlarda bloklangan bo'lsa — **yechim variantlarini `SAVOLLAR.md` ga yoz** (o'z domeni Cloudflare orqali: narxi; Cloudflare'da HTTP/3 o'chirish faqat o'z domenda mumkin; boshqa bepul xosting) — egasi tanlaydi, o'zing pullik narsa qilma.
- **Natija (egasi, 10:01): telefondagi Chrome'da sayt ochiladi.** Demak muammo faqat egasining kompyuteriga xos (antivirus/proksi/VPN, Chrome profili yoki shu kompyuterning tarmog'i). Shuning uchun: faqat `e2e/prod.mjs` ni mustahkamla (`--disable-quic`, xatoni aniq yozish, 3 marta qayta urinish) va kompyuterdagi sababni qisqa tekshir; domen masalasi beta paytida foydalanuvchilardan shikoyat bo'lsagina qaytadi.

## 5. Xazina ovi — vaqtincha olib tashlanadi (egasi)
Keyin qayta ko'rib chiqiladi, shuning uchun **kod qoladi**, `treasure_enabled` (sukut **false**) bayroqchasi ortida:
- Sayt: Tanga oynasidagi "Xazina ovi" bo'limi va "Xazina (kuniga 3 ta) +50" qatori, pastki karta (xazina kartasi), piyoda rejimidagi xazina belgisi/issiq-sovuq, Yordam va Qoidalar matni, ko'rsatma.
- Bot va kanal: xazina haqidagi matnlar.
- Server: `my_treasure_*` RPC'lar o'chiq bo'lsa `forbidden`; kunlik xazina yaratilmaydi (cron).
- Admin panel: sozlamada "Xazina ovi" yoqish/o'chirish (izoh bilan); boshqa xazina bo'limlari yashirin.
- `TANGA-NARXLAR.md` va `KEYINGI.md`: "Xazina ovi — vaqtincha o'chirilgan, keyin ko'rib chiqiladi (2026-11-26)".
- Test: bayroqcha false → RPC rad, UI'da xazina yo'q; true → hozirgidek ishlaydi.

## Qabul sharti
- `npm test`, `npm run typecheck`, tegishli e2e; `npm run screens`; deploy (12-qadam tartibida, GitHub push → avtomatik); `ISHLAR.md` [x]; commit: `fix: tuzatish 4 — tanga yuborish olib tashlandi, admin sinov rejimi o'chiq bo'lganda "+" yo'q, premium xarid botda`.
