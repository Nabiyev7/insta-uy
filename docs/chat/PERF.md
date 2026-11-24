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
