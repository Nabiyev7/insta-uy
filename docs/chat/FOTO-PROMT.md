# Foto rejimi — "oltin soat" va maket (tilt-shift) grafikasi (egasi, 2026-11-27)

> Maqsad: odam saytdagi **Foto** rejimida o'z uyini Instagram postlaridagidek chiroyli suratga olsin (uslub A — "oltin soat + maket", D — "tun"; namunalar `docs/insta/namuna/uslub-A-oltin.png`, `uslub-D-tun.png`). Oddiy o'yin rejimi va tezligi **o'zgarmaydi** — effektlar faqat Foto rejimida.
> Hozirgi Foto rejimi: `ui/Hud.tsx` (`isPhoto`, `photo-bar`). Har banddan keyin `npm test` + `typecheck` + commit; tekshiruvchi oxirida bir marta; push.

## 1. Foto rejimi paneli
Foto rejimiga o'tganda pastda ixcham panel (to'q, minimalistik, sayt uslubida):
- **Yorug'lik**: `Hozirgi` · `Oltin soat` · `Tun` (3 ta tugma).
- **Maket effekti** (tilt-shift): yoqish/o'chirish + kuchi (past / o'rta / kuchli).
- **Format**: `9:16` (stories, standart) · `4:5` (post) · `1:1` — ekranda ramka ko'rsatiladi.
- **Suratga olish** (katta tugma) → natija oynasi: rasm + `Saqlash` + `Ulashish` (Web Share API; Telegram Mini App'da — `shareToStory`/fayl yuborish imkoni bo'lsa, bo'lmasa saqlash).
- Kamera hozirgidek erkin (surish, yaqinlashtirish); "Mening uyim" tugmasi kamerani o'z uyiga chiroyli burchakdan olib keladi.

## 2. "Oltin soat" va "Tun"
- **Oltin soat**: quyosh past (balandligi ~18–22°, uzun soyalar), rangi iliq (≈ #FFC98A), osmon gradient (pastda iliq to'q sariq → tepada och ko'k), yorug'lik kuchliroq kontrast; yengil iliq "color grading" (soyalar biroz ko'kimtir, yorug' joylar iliq). Soyalar shu kadr uchun yuqori sifatda (shadow map 4096, yumshoq PCF).
- **Tun**: mavjud tungi holat (derazalar yonadi) + osmon to'q ko'k, ko'cha chiroqlari va hovli chiroqlari yonadi, derazalar va chiroqlar atrofida yengil **bloom**.
- Foto rejimidan chiqqanda — hammasi oldingi holatga (o'yindagi vaqt, sifat).

## 3. Maket effekti (tilt-shift)
- Post-processing (Three.js `EffectComposer` yoki o'z shader): ekran markazidagi gorizontal tasma tiniq, yuqori va pastga qarab xiralik (gaussian, 2 o'tish), tasma kamera qiyaligiga qarab avtomatik; ranglar biroz to'yinganroq (+10–15%).
- Natija kadri **yuqori aniqlikda** render qilinadi: ekran o'lchamidan 2× (kuchsiz telefonda 1.5×), keyin tanlangan formatga (9:16 → 1080×1920, 4:5 → 1080×1350, 1:1 → 1080×1080) — supersampling, qirralar silliq.
- Effektlar faqat kadr olinayotganda to'liq hisoblanadi; Foto rejimidagi jonli ko'rinishda — yengilroq variant (kuchsiz telefonda jonli ko'rinishda tilt-shift o'chiq, faqat yakuniy kadrda).

## 4. Rasm ustidagi belgi
- Pastki chap burchakda kichik, toza: **"CityLand UZ"** logotipi va (o'z uyi kadrda bo'lsa) **@nik**; ixtiyoriy kichik QR/qisqa havola `citylanduz` (sozlamada o'chirib bo'ladi). Uslub Instagram postlari shabloni bilan bir xil (Inter/sayt shrifti, bitta oltin urg'u).
- Stories uchun 9:16 kadrda yuqorida bo'sh joy qoldiriladi (Instagram tugmalari ostida qolmasin).

## 5. Tezlik va moslik
- O'yin rejimida FPS o'zgarmaydi (`node e2e/perf.mjs` oldin/keyin).
- Kadr olish: o'rta telefon (CPU ×6 sekinlashtirish) ≤ 3 s; xotira yetmasa avtomatik 1× aniqlikka tushadi, xato chiqmaydi.
- Mehmon ham foydalana oladi (uysiz kadr, faqat logo).

## Qabul sharti
- e2e: Foto → Oltin soat → Maket → 9:16 → Suratga olish → fayl 1080×1920 PNG/JPG; Tun varianti; chiqqanda holat tiklanadi.
- Skrinshotlar: `docs/chat/ui-foto-oltin.png`, `ui-foto-tun.png` va natija kadrlari `docs/chat/foto-namuna-*.jpg`.
- `npm test`, `typecheck`, `e2e`, `perf`; tekshiruvchi ✅; `ISHLAR.md` [x]; `PLAN.md` "Holat"; push; `HISOBOT.md`.
