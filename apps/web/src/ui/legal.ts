/** FAQ, qoidalar, maxfiylik. Ochilishdan oldin huquqshunos ko'rib chiqishi kerak (PLAN §10). */
import type { Lang } from '../../../../packages/shared/src/index.ts';

export type Doc = Readonly<Record<Lang, readonly (readonly [string, readonly string[]])[]>>;

export const FAQ: Doc = {
  uz: [
    ['Uyni qanday olaman?', ["Ro'yxatdan o'ting, \"Bo'sh joy — oling!\" taxtachali joyni bosing va \"Shu yerda uy qurish\" ni tanlang.", 'Uy darhol quriladi, Instagram nikingizni admin tekshiradi.', '1 kishiga 1 ta bepul uy.']],
    ['Uyim joyi o‘zgaradimi?', ['Yo‘q. Uchastka ID, ko‘cha va joy qulflangan. Yangilanishlarda faqat ko‘rinish o‘zgaradi.']],
    ['Boshqa uylardan qanday ajralib turaman?', ['Daraja, bezak, nik yorlig‘i bilan. Uy ko‘pi bilan ikki qavat (5-leveldan) — asosan hashamati oshadi.']],
    ['Parolni unutdim', ['Telegram ulangan bo‘lsa, botga /parol yuboring.']],
    ['O‘yin qotyapti', ['Menyu → Sozlamalar → Sifat: Past. Brauzerni yangilang.']],
  ],
  ru: [
    ['Как получить дом?', ['Зарегистрируйтесь, нажмите на участок с табличкой «Свободно — забирайте!» и выберите «Построить дом здесь».', 'Дом строится сразу, ник в Instagram проверит админ.', 'Один бесплатный дом на человека.']],
    ['Изменится ли место моего дома?', ['Нет. Участок, улица и координаты зафиксированы. При обновлениях меняется только внешний вид.']],
    ['Как выделиться?', ['Уровнем дома, украшениями, табличкой. Дом — максимум два этажа (с 5 уровня), дальше растёт роскошь.']],
    ['Забыл пароль', ['Если Telegram подключён — отправьте боту /parol.']],
    ['Тормозит', ['Меню → Настройки → Качество: Низкое. Обновите браузер.']],
  ],
};

export const RULES: Doc = {
  uz: [
    ['Virtual uy nima', ['Uy — virtual narsa, faqat shu saytdagi ko‘rinish. U haqiqiy mulk, qimmatli qog‘oz yoki investitsiya emas.', 'Uyni pulga qayta sotish kafolatlanmaydi; sovg‘a qilish mumkin.']],
    ['Xulq', ['Haqorat, kamsitish, tahdid, yolg‘on shaxs, reklama-spam taqiqlanadi.', 'Nik o‘zingizniki bo‘lishi kerak. Birovning nikini olgan uy bo‘shatiladi.', 'Bilbordda boshqa brend logotipi — faqat ruxsat bilan.']],
    ['To‘lov va qaytarish', ['To‘lov xizmat ko‘rsatilgach yakunlanadi. Xizmat bizning aybimiz bilan ko‘rsatilmasa — pul to‘liq qaytariladi.', 'Ko‘cha nomi yoki reklama moderatsiyadan o‘tmasa — tuzatish yoki pulni qaytarish tanlanadi.', 'Foydalanilgan bezak va darajalar uchun pul qaytarilmaydi.']],
    ['Faolsizlik', ['Bepul, yaxshilanmagan uy egasi belgilangan muddat (3–6 oy) kirmasa, ogohlantirishdan 14 kun keyin bo‘shatilishi mumkin. Pullik uylar bo‘shatilmaydi.']],
    ['Ko‘chirish', ['Uy joyi o‘zgarmaydi. Favqulodda holatda faqat rozilik bilan, teng yoki yaxshiroq joyga va bonus bilan.']],
    ['Loyiha yopilsa', ['Kamida 30 kun oldin e’lon qilinadi, yangi to‘lovlar to‘xtatiladi, uyingiz rasmini yuklab olishingiz mumkin. Faol ijaraning (bilbord va h.k.) qolgan qismi qaytariladi.']],
    ['Akkaunt', ['Qoidabuzarlik uchun ogohlantirish, yozuvni o‘chirish yoki bloklash qo‘llanadi. Norozilik — Telegram yordam orqali.']],
  ],
  ru: [
    ['Что такое виртуальный дом', ['Дом — виртуальный объект на этом сайте. Это не недвижимость, не ценная бумага и не инвестиция.', 'Перепродажа за деньги не гарантируется; дом можно подарить.']],
    ['Поведение', ['Запрещены оскорбления, дискриминация, угрозы, чужая личность и спам.', 'Ник должен быть вашим. Дом на чужой ник освобождается.', 'Чужие логотипы на билбордах — только с разрешения.']],
    ['Оплата и возврат', ['Если услуга не оказана по нашей вине — деньги возвращаются полностью.', 'Если название улицы или реклама не прошли модерацию — исправление или возврат.', 'За использованные украшения и уровни возврата нет.']],
    ['Неактивность', ['Бесплатный неулучшенный дом может быть освобождён после 3–6 месяцев неактивности и предупреждения за 14 дней. Платные дома не освобождаются.']],
    ['Перенос', ['Место дома не меняется. В исключительном случае — только с согласия, на равное или лучшее место и с бонусом.']],
    ['Если проект закроется', ['Объявим минимум за 30 дней, остановим оплату, можно будет скачать изображение дома. Остаток активной аренды возвращается.']],
    ['Аккаунт', ['За нарушения — предупреждение, удаление текста или блокировка. Обжалование — через помощь в Telegram.']],
  ],
};

export const PRIVACY: Doc = {
  uz: [
    ['Nimani saqlaymiz', ['Login, shifrlangan parol (Supabase Auth), Instagram niki, uy yozuvi, avatar.', 'Telegram ulansa — Telegram ID. To‘lovda — summa va tranzaksiya raqami (karta ma’lumoti saqlanmaydi).', 'Spamga qarshi — IP manzilning kalitlangan xeshi, qisqa muddat.']],
    ['Nima ochiq', ['Nik, uy yozuvi, uy ko‘rinishi, nishonlar hammaga ko‘rinadi. Ko‘p o‘yinchida joylashuvingiz (shahar ichida) va mahalla chati ko‘rinadi.']],
    ['O‘chirish', ['Uyim → Sozlamalar → Akkauntni o‘chirish. Profil, chat xabarlari, Telegram bog‘lanishi va shaxsiy ma’lumot darhol o‘chadi, uy bo‘shaydi; moliyaviy yozuvlar shaxssiz qoladi.', 'Zaxira nusxalarda qolgan ma’lumot ko‘pi bilan 90 kundan keyin butunlay yo‘qoladi.', 'Saytda shaxsiy (yopiq) xabar yo‘q — faqat ochiq chat.']],
    ['Uchinchi tomonlar', ['Supabase (baza), Cloudflare (hosting), Telegram (bot), xatolar monitoringi. Ma’lumot sotilmaydi.']],
  ],
  ru: [
    ['Что храним', ['Логин, зашифрованный пароль (Supabase Auth), ник Instagram, подпись дома, аватар.', 'При подключении Telegram — Telegram ID. При оплате — сумма и номер транзакции (данные карты не хранятся).', 'Против спама — хеш IP-адреса, недолго.']],
    ['Что видно всем', ['Ник, подпись, вид дома, значки. В мультиплеере — положение в городе и чат махалли.']],
    ['Удаление', ['Мой дом → Настройки → Удалить аккаунт. Профиль, сообщения чата, связь с Telegram и личные данные удаляются сразу, дом освобождается; финансовые записи обезличиваются.', 'Данные в резервных копиях полностью исчезают не позднее чем через 90 дней.', 'Личных (закрытых) сообщений на сайте нет — только открытый чат.']],
    ['Третьи стороны', ['Supabase (база), Cloudflare (хостинг), Telegram (бот), мониторинг ошибок. Данные не продаются.']],
  ],
};
