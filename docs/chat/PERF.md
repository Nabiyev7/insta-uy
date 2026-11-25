# Perf o'lchovlari (e2e/perf.mjs, CPU ÷6) va 12 joyda o'rtacha

## Boshlanishdan oldin (2026-11-24)
low (CPU ÷6): {"fps":298,"p95ms":5.2,"info":{"calls":45,"triangles":23732}}
mid (CPU ÷6): {"fps":237,"p95ms":6,"info":{"calls":69,"triangles":43529}}
high (CPU ÷6): {"fps":147,"p95ms":12.9,"info":{"calls":158,"triangles":300886}}

12 joyda o'rtacha: low 68 call / 32 ming uchburchak; mid 88 / 73 ming

## 1-qadamdan keyin
low (CPU ÷6): {"fps":323,"p95ms":4.4,"info":{"calls":54,"triangles":21868}}
mid (CPU ÷6): {"fps":280,"p95ms":5,"info":{"calls":75,"triangles":51196}}
high (CPU ÷6): {"fps":178,"p95ms":12.6,"info":{"calls":172,"triangles":211806}}

12 joyda o'rtacha: low 45 call / 12 ming; mid 72 / 36 ming

## 2-qadamdan keyin
low (CPU ÷6): {"fps":331,"p95ms":5.7,"info":{"calls":56,"triangles":17287}}
mid (CPU ÷6): {"fps":298,"p95ms":7.5,"info":{"calls":86,"triangles":42194}}
high (CPU ÷6): {"fps":187,"p95ms":11.3,"info":{"calls":183,"triangles":185854}}

12 joyda o'rtacha: low 45 call / 11 ming; mid 72 / 33 ming. Maydon o'rtasida (o'rta sifat): 62 call / 31 ming.

## 3-qadamdan keyin (perf.mjs endi uch rejimni o'lchaydi)
low piyoda: 358 FPS, 50 call, 15 ming; low shahar eng baland: 385 FPS, 27 call, 12–61 ming; low mashina: 299 FPS, 68 call, 23 ming
mid piyoda: 281 FPS, 81 call, 39 ming; mid shahar: 157 FPS, 47 call, 21 ming; mid mashina: 111 FPS, 83 call, 40 ming
high piyoda: 176 FPS, 172 call, 150 ming; high shahar: 135 FPS, 53 call, 27 ming; high mashina: 76 FPS, 155 call, 145 ming
(CPU 6 baravar sekinlashtirilgan; mo'ljal 30+ FPS. Haqiqiy Redmi A da sinalmagan.)

## 4-qadamdan keyin: 50 ta 10-level uy (past sifat, CPU 6 baravar sekin, `node e2e/perf-decor.mjs`)
piyoda: bezaksiz 382 FPS / 46 call / 34 ming → 20 bezak 278 FPS / 51 call / 39 ming
shahar: bezaksiz 351 FPS / 67 call / 74 ming → 20 bezak 265 FPS / 71 call / 69 ming

## 5-qadamdan keyin: 50 ta 10-level uy (past sifat, CPU 6 baravar sekin)
piyoda: bezaksiz 333 FPS / 43 call → 20 bezak 293 FPS / 54 call / 37 ming; shahar: bezaksiz 302 / 64 call → 20 bezak 311 / 81 call / 62 ming
Modellar fayli: 954 KB (boshida) → 983 (1-qadam) → 1121 (2-qadam) → 1293 KB (5-qadam).

## 8-qadamdan keyin: yangi shahar va uslub (bir kompyuterda ketma-ket, CPU ÷6; oldin → keyin)
low: piyoda 361 → 362 FPS (14,8 → 22,3 ming uchburchak), shahar eng baland 176–385 → 387, mashina 149–299 → 338
mid: piyoda 290 → 291, shahar 152 → 145 (48 → 39 call), mashina 105 → 118
high: piyoda 165 → 182, shahar 133 → 127, mashina 72 → 69
O'lchov xatosi ±10%. Draw call kamaydi (mid piyoda 88 → 57). Teksturalar 109 → 4 KB, modellar 1293 → 1822 KB (yumaloq daraxtlar, yangi binolar). Birinchi yuklanish ~2,7 MB (chegara 3–5 MB).

## 9-qadamdan keyin: bo'sh shahar (bir kompyuterda ketma-ket 2 marta, CPU ÷6; oldin — 8-qadam demo aholi bilan → keyin — bo'sh shahar)
low: piyoda 275–285 → 342–361 FPS, shahar eng baland 140 → 170–340, mashina 125–128 → 151–289
mid: piyoda 225 → 300 (59 → 46 call), shahar 119–126 → 153, mashina 94–101 → 122–127
high: piyoda 135 → 190 (186 → 82 call, 218 → 157 ming uchburchak), shahar 106–170 → 140, mashina 61–65 → 83
Modellar fayli 1866 → 2086 KB (4–5-level, 15 bezak). Bo'sh uchastka: yer bo'lagi + 1 daraxt modeli + taxtacha (yozuvi bitta umumiy chizish).

## 10-qadamdan keyin: 50 ta 10-level uy (past sifat, CPU 6 baravar sekin, `node e2e/perf-decor.mjs`)
piyoda: bezaksiz 380 FPS / 41 call → 17 bezak 365 / 48 → lyuks bezaklar bilan 435 / 38
shahar: bezaksiz 393 FPS / 56 call → 17 bezak 343 / 76 → lyuks bezaklar bilan 365 / 62
`perf.mjs` (bo'sh shahar): low 397 / 196 / 162 FPS, mid 370 / 177 / 143, high 223 / 155 / 93 (piyoda / shahar / mashina) — 9-qadamdagidan yomon emas.
Modellar fayli 2086 → 2276 KB (9 ta lyuks bezak va ularning uzoq shakllari). Lyuks model 220–568 uchburchak, uzoqda 56–150.

## 11-qadamdan keyin: yangi interfeys (10- va 11-qadam kodi navbatma-navbat 2 martadan, bo'sh baza, CPU ÷6; FPS 10-qadam → 11-qadam)
low: piyoda 395 → 406, shahar 426 → 421, mashina 344 → 355
mid: piyoda 319 → 338, shahar 191 → 169, mashina 161 → 151
high: piyoda 214 → 212, shahar 174 → 153, mashina 104 → 98
O'lchov xatosi ±15%. Birinchi o'lchovda xiralashtirish (blur) sabab piyoda mid/high 9–13% sekin edi — endi blur faqat yuqori sifatda (past va o'rtada shaffof fon). Sariq "+" belgilari — bitta chizish. Bezak rasmlari 76 ta, 260 KB, faqat do'kon ochilganda yuklanadi (PWA keshiga oldindan olinmaydi).

## 6-qadamdan keyin: bot orqali kirish, tanga, premium (11-qadam kodi va hozirgi kod bitta mashinada navbatma-navbat, 2 martadan, CPU ÷6; FPS eski → yangi)
1-aylanish — low: piyoda 354 → 361, shahar 366 → 161, mashina 320 → 149; mid: 287 → 279, 135 → 141, 118 → 121; high: 159 → 167, 130 → 124, 77 → 78
2-aylanish — low: 332 → 206, 161 → 111, 132 → 94; mid: 264 → 174, 136 → 101, 108 → 91; high: 137 → 192, 84 → 135, 56 → 80
Draw call va uchburchaklar bir xil (low piyoda 45 call, high piyoda 80–81). Bu safar mashina band edi (Blender, dev server): bir xil kodning o'zida ham FPS ikki baravargacha o'zgardi — farq o'lchov xatosi ichida, aniq sekinlashuv ko'rinmadi. Yangi narsalar sahnaga deyarli qo'shilmagan: yorliqda yurak soni (o'sha bitta tekstura), salyut lentasi (DOM, 5 daqiqada 1 so'rov). Modellar fayli 2276 → 2025 KB (6–10-level modellari faylga kirmaydi). Haqiqiy telefonda qayta tekshirish kerak.
