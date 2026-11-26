/** FAQ, qoidalar, maxfiylik. Ochilishdan oldin huquqshunos ko'rib chiqishi kerak (PLAN §10). */
import type { Lang } from '../../../../packages/shared/src/index.ts';

export type Doc = Readonly<Record<Lang, readonly (readonly [string, readonly string[]])[]>>;

export const FAQ: Doc = {
  uz: [
    ['Uyni qanday olaman?', ["\"Kirish\" → Telegram botga o'ting, Instagram nikingizni yozing — bot saytga kirish havolasini yuboradi.", "\"Bo'sh joy — oling!\" taxtachali joyni bosing va \"Shu yerda uy qurish\" ni tanlang. Uy darhol quriladi.", '1 kishiga 1 ta bepul uy (1-level). Uyni tanga bilan 5-levelgacha ko‘tarasiz: 300 / 1 000 / 2 000 / 3 500. Bezaklar 5-leveldan.']],
    ['Uyim joyi o‘zgaradimi?', ['Yo‘q. Uchastka ID, ko‘cha va joy qulflangan. Yangilanishlarda faqat ko‘rinish o‘zgaradi.']],
    ['Boshqa uylardan qanday ajralib turaman?', ['Daraja, bezak, nik yorlig‘i bilan. Uy ko‘pi bilan ikki qavat (5-leveldan) — asosan hashamati oshadi.']],
    ['Nikimni kimdir olib qo‘ygan', ['Botga yozing: nikingizni kiriting va «Bu nik meniki» tugmasini bosing, so‘ng Instagram profilingiz skrinshotini yuboring. Admin ko‘rib chiqadi.']],
    ['Qanday kiraman?', ['Parol yo‘q: botga /start yozing — bot bir martalik havola yuboradi (15 daqiqa amal qiladi).']],
    ['Tanga nima?', ['Tanga — o‘yin ichidagi virtual birlik. Pulga almashtirilmaydi va naqd qilinmaydi.', 'Tanga topish: har kuni kirish, xazina, kanalga obuna, do‘st taklifi, “Haftaning hovlisi”.']],
    ['O‘yin qotyapti', ['Menyu → Sozlamalar → Sifat: Past. Brauzerni yangilang.']],
  ],
  ru: [
    ['Как получить дом?', ['«Войти» → перейдите в Telegram-бот, напишите ник в Instagram — бот пришлёт ссылку для входа на сайт.', 'Нажмите на участок с табличкой «Свободно — забирайте!» и выберите «Построить дом здесь». Дом строится сразу.', 'Один бесплатный дом (1 уровень) на человека. Монетами дом растёт до 5 уровня: 300 / 1 000 / 2 000 / 3 500. Украшения — с 5 уровня.']],
    ['Изменится ли место моего дома?', ['Нет. Участок, улица и координаты зафиксированы. При обновлениях меняется только внешний вид.']],
    ['Как выделиться?', ['Уровнем дома, украшениями, табличкой. Дом — максимум два этажа (с 5 уровня), дальше растёт роскошь.']],
    ['Мой ник занял кто-то другой', ['Напишите боту: введите ник и нажмите «Это мой ник», затем пришлите скриншот профиля Instagram. Админ проверит.']],
    ['Как войти?', ['Пароля нет: напишите боту /start — он пришлёт одноразовую ссылку (действует 15 минут).']],
    ['Что такое монеты?', ['Монеты — виртуальная игровая единица. Их нельзя обменять на деньги или обналичить.', 'Как получить: ежедневный вход, клад, подписка на канал, приглашение друзей, «Двор недели».']],
    ['Тормозит', ['Меню → Настройки → Качество: Низкое. Обновите браузер.']],
  ],
};

export const RULES: Doc = {
  uz: [
    ['Virtual uy nima', ['Uy — virtual narsa, faqat shu saytdagi ko‘rinish. U haqiqiy mulk, qimmatli qog‘oz yoki investitsiya emas.', 'Uyni pulga qayta sotish kafolatlanmaydi; sovg‘a qilish mumkin.']],
    ['Xulq', ['Haqorat, kamsitish, tahdid, yolg‘on shaxs, reklama-spam taqiqlanadi.', 'Nik o‘zingizniki bo‘lishi kerak. Birovning nikini olgan uy bo‘shatiladi.', 'Bilbordda boshqa brend logotipi — faqat ruxsat bilan.']],
    ['To‘lov va qaytarish', ['To‘lov xizmat ko‘rsatilgach yakunlanadi. Xizmat bizning aybimiz bilan ko‘rsatilmasa — pul to‘liq qaytariladi.', 'Ko‘cha nomi yoki reklama moderatsiyadan o‘tmasa — tuzatish yoki pulni qaytarish tanlanadi.', 'Foydalanilgan bezak va darajalar uchun pul qaytarilmaydi.']],
    ['Faolsizlik', ['Bepul uy egasi 3 oy kirmasa, Telegram orqali ogohlantirishdan 14 kun keyin uy bo‘shatiladi. Nishonlar odamda qoladi. Pulga olingan uylar bo‘shatilmaydi.']],
    ['Tanga', ['Tanga — virtual, pulga almashtirilmaydi va qaytarilmaydi. Tanga o‘tkazish kuniga cheklangan; aldash (soxta akkauntlar) uchun tanga va akkaunt bloklanadi.']],
    ['Ko‘chirish', ['Uy joyi o‘zgarmaydi. Favqulodda holatda faqat rozilik bilan, teng yoki yaxshiroq joyga va bonus bilan.']],
    ['Loyiha yopilsa', ['Kamida 30 kun oldin e’lon qilinadi, yangi to‘lovlar to‘xtatiladi, uyingiz rasmini yuklab olishingiz mumkin. Faol ijaraning (bilbord va h.k.) qolgan qismi qaytariladi.']],
    ['Akkaunt', ['Qoidabuzarlik uchun ogohlantirish, yozuvni o‘chirish yoki bloklash qo‘llanadi. Norozilik — Telegram yordam orqali.']],
  ],
  ru: [
    ['Что такое виртуальный дом', ['Дом — виртуальный объект на этом сайте. Это не недвижимость, не ценная бумага и не инвестиция.', 'Перепродажа за деньги не гарантируется; дом можно подарить.']],
    ['Поведение', ['Запрещены оскорбления, дискриминация, угрозы, чужая личность и спам.', 'Ник должен быть вашим. Дом на чужой ник освобождается.', 'Чужие логотипы на билбордах — только с разрешения.']],
    ['Оплата и возврат', ['Если услуга не оказана по нашей вине — деньги возвращаются полностью.', 'Если название улицы или реклама не прошли модерацию — исправление или возврат.', 'За использованные украшения и уровни возврата нет.']],
    ['Неактивность', ['Если владелец бесплатного дома не заходит 3 месяца, дом освобождается через 14 дней после предупреждения в Telegram. Значки остаются. Платные дома не освобождаются.']],
    ['Монеты', ['Монеты виртуальные, не обмениваются на деньги и не возвращаются. Перевод монет ограничен в день; за обман (фейковые аккаунты) монеты и аккаунт блокируются.']],
    ['Перенос', ['Место дома не меняется. В исключительном случае — только с согласия, на равное или лучшее место и с бонусом.']],
    ['Если проект закроется', ['Объявим минимум за 30 дней, остановим оплату, можно будет скачать изображение дома. Остаток активной аренды возвращается.']],
    ['Аккаунт', ['За нарушения — предупреждение, удаление текста или блокировка. Обжалование — через помощь в Telegram.']],
  ],
};

export const PRIVACY: Doc = {
  uz: [
    ['Nimani saqlaymiz', ['Telegram ID va ismingiz (kirish shu orqali), Instagram niki, uy yozuvi, avatar. Yangi akkauntlarda parol yo‘q.', 'To‘lovda — summa va tranzaksiya raqami (karta ma’lumoti saqlanmaydi).', 'Spamga qarshi — IP manzilning kalitlangan xeshi, qisqa muddat.']],
    ['Nima ochiq', ['Nik, uy yozuvi, uy ko‘rinishi, nishonlar hammaga ko‘rinadi. Ko‘p o‘yinchida joylashuvingiz (shahar ichida) va mahalla chati ko‘rinadi.']],
    ['O‘chirish', ['Uyim → Akkauntni o‘chirish. Profil, chat xabarlari, Telegram bog‘lanishi va shaxsiy ma’lumot darhol o‘chadi, uy bo‘shaydi; moliyaviy yozuvlar shaxssiz qoladi.', 'O‘chirilgan akkaunt ma’lumoti yangi zaxira nusxalarga kirmaydi; eski nusxalar faqat favqulodda tiklash uchun yopiq saqlanadi.', 'Saytda shaxsiy (yopiq) xabar yo‘q — faqat ochiq chat.']],
    ['Uchinchi tomonlar', ['Supabase (baza), Cloudflare (hosting), Telegram (bot, zaxira nusxa adminga), xatolar monitoringi. Ma’lumot sotilmaydi.', 'Anonim tashrif statistikasi (Cloudflare) yig‘iladi — cookie’siz, shaxsingiz aniqlanmaydi.']],
  ],
  ru: [
    ['Что храним', ['Telegram ID и имя (вход через бот), ник Instagram, подпись дома, аватар. У новых аккаунтов пароля нет.', 'При оплате — сумма и номер транзакции (данные карты не хранятся).', 'Против спама — хеш IP-адреса, недолго.']],
    ['Что видно всем', ['Ник, подпись, вид дома, значки. В мультиплеере — положение в городе и чат махалли.']],
    ['Удаление', ['Мой дом → Удалить аккаунт. Профиль, сообщения чата, связь с Telegram и личные данные удаляются сразу, дом освобождается; финансовые записи обезличиваются.', 'Данные удалённого аккаунта не попадают в новые резервные копии; старые копии хранятся закрыто только для аварийного восстановления.', 'Личных (закрытых) сообщений на сайте нет — только открытый чат.']],
    ['Третьи стороны', ['Supabase (база), Cloudflare (хостинг), Telegram (бот, резервная копия админу), мониторинг ошибок. Данные не продаются.', 'Собирается анонимная статистика посещений (Cloudflare) — без cookie, личность не определяется.']],
  ],
};
