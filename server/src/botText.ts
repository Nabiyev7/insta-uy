/** Botning barcha matnlari — bitta joyda, o'zbekcha va ruscha. Har xabar faqat bitta tilda (foydalanuvchi tanlagani). */
export type Lang = 'uz' | 'ru';
export const langOf = (v: unknown): Lang => (v === 'ru' ? 'ru' : 'uz');
/** Birinchi /start: Telegram tili bo'yicha taxmin (ru/uk/kk/be → ruscha, qolgani o'zbekcha). */
export const guessLang = (code: string | undefined): Lang => (['ru', 'uk', 'kk', 'be'].includes((code ?? '').slice(0, 2).toLowerCase()) ? 'ru' : 'uz');

const T = {
  // ---------- Til va menyu ----------
  chooseLang: ['🌐 Tilni tanlang:', '🌐 Выберите язык:'],
  langUz: ['🇺🇿 O‘zbekcha', '🇺🇿 O‘zbekcha'],
  langRu: ['🇷🇺 Русский', '🇷🇺 Русский'],
  langName: ['O‘zbekcha', 'Русский'],
  langSaved: ['✅ Til: O‘zbekcha', '✅ Язык: Русский'],
  btnCity: ['🏙 Shahar', '🏙 Город'],
  btnHome: ['🏠 Uyim', '🏠 Мой дом'],
  btnClaim: ['🏡 Uy olish', '🏡 Получить дом'],
  btnShop: ['🛍 Do‘kon', '🛍 Магазин'],
  btnInvite: ['👥 Do‘st taklif', '👥 Пригласить друга'],
  btnSupport: ['✍️ Adminga yozish', '✍️ Написать админу'],
  btnSettings: ['⚙️ Sozlamalar', '⚙️ Настройки'],
  btnBrowser: ['🌐 Brauzerda ochish', '🌐 Открыть в браузере'],
  btnOpenCity: ['🏙 Shaharni ochish', '🏙 Открыть город'],
  pickMenu: ['Menyudan tanlang 👇', 'Выберите в меню 👇'],
  // ---------- Kirish va nik ----------
  welcome: [
    '👋 Xush kelibsiz! CityLand UZ — Instagram obunachilari shahri.\nInstagram nikingizni Instagram’dagidek to‘liq va aniq yozing (masalan: {channel}): har bir harf, raqam, nuqta va pastki chiziq (_) muhim. Keyin o‘zgartirib bo‘lmaydi.',
    '👋 Добро пожаловать! CityLand UZ — город подписчиков Instagram.\nНапишите ваш ник в Instagram точно как в профиле (например: {channel}): важна каждая буква, цифра, точка и подчёркивание (_). Изменить потом нельзя.',
  ],
  ready: ['✅ Tayyor! Akkaunt ochildi. Pastdagi «🏙 Shahar» tugmasini bosing — sayt Telegram ichida ochiladi.', '✅ Готово! Аккаунт создан. Нажмите «🏙 Город» внизу — сайт откроется прямо в Telegram.'],
  hello: ['🏙 Xush kelibsiz, @{nick}! Shaharni ochish uchun pastdagi «🏙 Shahar» tugmasini bosing.', '🏙 С возвращением, @{nick}! Чтобы открыть город, нажмите «🏙 Город» внизу.'],
  browserLink: ['🌐 Brauzer uchun kirish havolasi: 15 daqiqa amal qiladi va bir marta ishlaydi.', '🌐 Ссылка для входа в браузере: действует 15 минут, один раз.'],
  banned: ['Akkaunt bloklangan.', 'Аккаунт заблокирован.'],
  renick: ['Nikingiz uning haqiqiy egasiga o‘tgan. Yangi Instagram nikingizni yozing — uyingiz va tangalaringiz o‘zingizda.', 'Ваш ник передан настоящему владельцу. Напишите новый ник Instagram — дом и монеты остаются у вас.'],
  renickDone: ['✅ Yangi nikingiz: @{nick}.', '✅ Ваш новый ник: @{nick}.'],
  renickTaken: ['Bu nik band — boshqasini yozing.', 'Этот ник занят — напишите другой.'],
  nickEmpty: ['Nikingizni yozing.', 'Напишите ник.'],
  nickLong: ['«{nick}» — 30 belgidan uzun.', '«{nick}» — длиннее 30 символов.'],
  nickBad: ['«{nick}» — ruxsat etilmagan belgi: {bad} (faqat lotin harf, raqam, «.» va «_»).', '«{nick}» — недопустимый символ: {bad} (только латиница, цифры, «.» и «_»).'],
  nickDots: ['«{nick}» — ikki nuqta ketma-ket bo‘lmaydi.', '«{nick}» — две точки подряд нельзя.'],
  nickStartDot: ['«{nick}» — nuqta bilan boshlanmaydi.', '«{nick}» — не может начинаться с точки.'],
  nickBanned: ['Bu nikni ishlatib bo‘lmaydi.', 'Такой ник нельзя использовать.'],
  nickFormat: ['Nik formati noto‘g‘ri.', 'Неверный формат ника.'],
  nickBusy: ['@{nick} — bu nik band. Agar u sizniki bo‘lsa — «Bu nik meniki» tugmasini bosing. Aks holda boshqa nik yozing.', '@{nick} — этот ник занят. Если он ваш — нажмите «Это мой ник». Иначе напишите другой.'],
  btnClaimNick: ['🙋 Bu nik meniki', '🙋 Это мой ник'],
  confirmNick: ['Shu to‘g‘rimi? Bosib Instagram’da tekshiring: instagram.com/{nick}', 'Всё верно? Проверьте в Instagram: instagram.com/{nick}'],
  btnNickOk: ['✅ Ha, to‘g‘ri', '✅ Да, верно'],
  btnNickAgain: ['✏️ Qayta yozish', '✏️ Написать заново'],
  linkConfirm: ['Telegram akkauntingizga ulanmoqda.\n⚠️ Agar bu havolani sizga boshqa odam yuborgan bo‘lsa — BOSMANG.\n\n{site}', 'Подключение к вашему Telegram.\n⚠️ Если эту ссылку прислал другой человек — НЕ НАЖИМАЙТЕ.\n\n{site}'],
  btnItsMe: ['✅ Ha, bu men', '✅ Да, это я'],
  confirmed: ['Tasdiqlandi ✅', 'Подтверждено ✅'],
  linkExpired: ['Havola muddati tugagan. Saytdan qaytadan boshlang.', 'Ссылка устарела. Начните заново на сайте.'],
  telegramUsed: ['Bu Telegram boshqa akkauntga ulangan.', 'Этот Telegram уже привязан к другому аккаунту.'],
  backToSite: ['Tayyor! Saytga qayting.', 'Готово! Вернитесь на сайт.'],
  waitlist: ['✅ Ro‘yxatga yozildingiz ({n}). Shahar ochilganda shu yerga xabar beramiz.', '✅ Вы в списке ({n}). Сообщим сюда, когда город откроется.'],
  needAccount: ['Avval /start bosing va Instagram nikingizni yozing.', 'Сначала нажмите /start и напишите ник Instagram.'],
  // ---------- Nik nizosi ----------
  disputeOpened: ['Ariza №{id} (@{nick}) ochildi.', 'Заявка №{id} (@{nick}) открыта.'],
  proofHow: [
    '📸 Dalil yuboring: o‘sha Instagram akkauntingizga kirgan holda profil sahifangiz skrinshotini shu yerga rasm qilib yuboring.\nSkrinshotda nik va «Profilni tahrirlash» tugmasi ko‘rinib tursin (bu tugma faqat profil egasiga ko‘rinadi).',
    '📸 Пришлите доказательство: скриншот своего профиля Instagram (войдя в этот аккаунт) сюда как фото.\nНа скриншоте должны быть видны ник и кнопка «Редактировать профиль» (её видит только владелец).',
  ],
  disputeDup: ['Bu nik bo‘yicha ariza allaqachon ko‘rib chiqilmoqda.', 'По этому нику заявка уже рассматривается.'],
  disputeLimit: ['Bugun ariza chegarasi tugadi (kuniga 3 ta).', 'Лимит заявок на сегодня исчерпан (3 в день).'],
  disputeHasAccount: ['Sizda allaqachon nikli akkaunt bor — nik o‘zgarmaydi. Savol bo‘lsa — «✍️ Adminga yozish».', 'У вас уже есть аккаунт с ником — ник не меняется. Вопрос — «✍️ Написать админу».'],
  proofOk: ['✅ Dalil qabul qilindi. Admin ko‘rib chiqadi va shu yerda javob beradi.', '✅ Доказательство принято. Админ проверит и ответит здесь.'],
  sendPhoto: ['Iltimos, skrinshotni rasm qilib yuboring.', 'Пожалуйста, пришлите скриншот как фото.'],
  disputeGiven: ['Rahmat. Nik haqiqiy egasiga o‘tdi — yangi nikingizni yozing.', 'Спасибо. Ник передан владельцу — напишите новый ник.'],
  // ---------- Adminga yozish ----------
  supportAsk: ['✍️ Savolingiz yoki muammoingizni yozing. Rasm yoki skrinshot ham yuborsa bo‘ladi.', '✍️ Напишите вопрос или проблему. Можно приложить фото или скриншот.'],
  supportLimit: ['Bugun murojaatlar chegarasi tugadi (kuniga 5 ta).', 'Лимит обращений на сегодня исчерпан (5 в день).'],
  supportSent: ['✅ Yuborildi. Admin javobini shu yerda olasiz.', '✅ Отправлено. Ответ админа придёт сюда.'],
  adminAnswer: ['💬 Admin javobi (№{ticket}):\n{text}', '💬 Ответ админа (№{ticket}):\n{text}'],
  // ---------- Kanal bonusi, so'rovnoma ----------
  chanPaid: ['+{gain} tanga ✅', '+{gain} монет ✅'],
  chanAlready: ['Bonus olingan', 'Бонус уже получен'],
  chanFirst: ['Avval kanalga obuna bo‘ling', 'Сначала подпишитесь на канал'],
  error: ['Xatolik, keyinroq urinib ko‘ring.', 'Ошибка, попробуйте позже.'],
  pollOwn: ['O‘z uyingizga ovoz berib bo‘lmaydi', 'Нельзя голосовать за свой дом'],
  pollClosed: ['So‘rovnoma yopilgan', 'Опрос закрыт'],
  // ---------- Sozlamalar ----------
  settings: ['⚙️ Sozlamalar\nTil: {lang}\nXabarlar: {news}', '⚙️ Настройки\nЯзык: {lang}\nУведомления: {news}'],
  on: ['yoqiq', 'включены'],
  off: ['o‘chiq', 'выключены'],
  btnNewsOn: ['🔔 Xabarlarni yoqish', '🔔 Включить уведомления'],
  btnNewsOff: ['🔕 Xabarlarni o‘chirish', '🔕 Выключить уведомления'],
  newsOn: ['🔔 Xabarlar yoqildi.', '🔔 Уведомления включены.'],
  newsOff: ['🔕 Umumiy xabarlar o‘chirildi (muhimlari keladi).', '🔕 Рассылка выключена (важное будет приходить).'],
  // ---------- Do'st taklif ----------
  invite: ['👥 Do‘stlaringizni taklif qiling — ular uy olganda sizga sovg‘a!\n\nSizning havolangiz:\n{link}\n\nTaklif qilganlar: {n}\n{scale}', '👥 Приглашайте друзей — когда они получат дом, вам подарок!\n\nВаша ссылка:\n{link}\n\nПриглашено: {n}\n{scale}'],
  inviteStep: ['{mark} {at} do‘st — {gift}', '{mark} {at} друзей — {gift}'],
  inviteLeft: ['Keyingi sovg‘agacha yana {n} do‘st.', 'До следующего подарка ещё {n} друзей.'],
  inviteAll: ['Hamma sovg‘alar olingan! 🎉', 'Все подарки получены! 🎉'],
  btnShare: ['📤 Do‘stga yuborish', '📤 Отправить другу'],
  shareText: ['Men CityLand UZ’da uy oldim — sen ham bepul ol 👉', 'Я получил дом в CityLand UZ — получи и ты бесплатно 👉'],
  // ---------- Do'kon (Stars) ----------
  shop: ['🛍 Do‘kon\nTanga paketlari va premium tovarlar — Telegram Stars bilan. Kichik paketlar va oddiy bezaklar — saytda.', '🛍 Магазин\nПакеты монет и премиум-товары — за Telegram Stars. Маленькие пакеты и обычный декор — на сайте.'],
  btnSalute: ['🎆 Salyut — 50⭐', '🎆 Салют — 50⭐'],
  packBest: [' · Eng foydali', ' · Самый выгодный'],
  packPopular: [' · Ommabop', ' · Популярный'],
  payOff: ['⏳ To‘lovlar tez kunda ochiladi. Hozircha tanga bilan oling.', '⏳ Оплата скоро откроется. Пока используйте монеты.'],
  starsUnavailable: ['Bu tovar Stars bilan sotilmaydi — saytda karta yoki tanga bilan oling.', 'Этот товар не продаётся за Stars — на сайте картой или монетами.'],
  notForSale: ['Hozircha sotuvda emas.', 'Пока не продаётся.'],
  userMissing: ['Avval /start bosib akkaunt oching.', 'Сначала нажмите /start и создайте аккаунт.'],
  placeTaken: ['Bu joy band. Saytdan boshqasini tanlang.', 'Место занято. Выберите другое на сайте.'],
  tooManyOrders: ['Ochiq buyurtmalar ko‘p — avval ularni tugating.', 'Слишком много открытых заказов — сначала завершите их.'],
  noLinks: ['Salyutda havola bo‘lmasin.', 'В салюте не должно быть ссылок.'],
  badWord: ['Nomaqbul so‘z bor.', 'Есть недопустимое слово.'],
  tooLong: ['Juda uzun (80 belgigacha).', 'Слишком длинно (до 80 символов).'],
  productMissing: ['Tovar topilmadi.', 'Товар не найден.'],
  saluteHow: ['🎆 Salyut matnini shunday yozing: /salyut Tug‘ilgan kuning bilan!', '🎆 Напишите текст салюта так: /salyut С днём рождения!'],
  invoiceDesc: ['CityLand UZ — {title}. To‘langach saytda darhol paydo bo‘ladi.', 'CityLand UZ — {title}. После оплаты сразу появится на сайте.'],
  paidOk: ['✅ Tayyor — saytda ko‘ring!', '✅ Готово — смотрите на сайте!'],
  product: ['{title}\n💰 {uzs} so‘m{stars}', '{title}\n💰 {uzs} сум{stars}'],
  productStars: [' · {n} ⭐', ' · {n} ⭐'],
  productCoins: ['🪙 {n} tanga', '🪙 {n} монет'],
  btnPayStars: ['⭐ {n} Stars bilan to‘lash', '⭐ Оплатить {n} Stars'],
  btnTestBuy: ['🧪 Sinov xaridi (bepul)', '🧪 Тестовая покупка (бесплатно)'],
  paidProblem: ['⚠️ To‘lov keldi, admin ko‘rib chiqadi.', '⚠️ Оплата получена, админ проверит.'],
  orderOld: ['Buyurtma muddati tugagan — qaytadan oching.', 'Заказ устарел — оформите заново.'],
  // ---------- Parol (faqat password_login yoqilganda) ----------
  resetOff: ['Parol bilan kirish o‘chirilgan — /start yozing.', 'Вход по паролю выключен — напишите /start.'],
  resetNoUser: ['Bu Telegram hech bir akkauntga ulanmagan.', 'Этот Telegram не привязан ни к одному аккаунту.'],
  resetCode: ['Login: {login}\nParolni tiklash kodi: {code}\n10 daqiqa amal qiladi. Kodni hech kimga bermang.', 'Логин: {login}\nКод сброса пароля: {code}\nДействует 10 минут. Никому не сообщайте код.'],
  // ---------- Egasi (admin) ----------
  noCommand: ['Bunday buyruq yo‘q.', 'Такой команды нет.'],
  adminLink: ['🛠 Admin panel (15 daqiqa, bir marta)', '🛠 Админ-панель (15 минут, один раз)'],
  btnAdmin: ['🛠 Admin panelni ochish', '🛠 Открыть админ-панель'],
  adminUrlMissing: ['ADMIN_URL sozlanmagan.', 'ADMIN_URL не настроен.'],
  bankNoAmount: ['❔ Kirim summasi topilmadi', '❔ Сумма поступления не найдена'],
  bankResult: ['💳 {amount} so‘m: {result}', '💳 {amount} сум: {result}'],
  replySent: ['✅ Javob yuborildi.', '✅ Ответ отправлен.'],
  newTicket: ['🆘 Murojaat №{ticket}{more}\n{who}{address}\n\n{text}', '🆘 Обращение №{ticket}{more}\n{who}{address}\n\n{text}'],
  ticketMore: [' (davomi)', ' (продолжение)'],
  newProof: ['🧾 Nik nizosi №{id}: {side} dalil yubordi. Admin panel → Nik nizolari.', '🧾 Спор о нике №{id}: {side} прислал доказательство. Админ-панель → Споры.'],
  sideOwner: ['egasi', 'владелец'],
  sideClaimant: ['da’vogar', 'заявитель'],
  stat: ['📊 Statistika (bugun / 7 kun)\n👤 Yangi foydalanuvchi: {u1} / {u7}\n🏠 Yangi uy: {h1} / {h7}\n🙂 Faol odam: {a1} / {a7}\n🪙 Tanga berildi: {g1} / {g7}\n🪙 Tanga sarflandi: {s1} / {s7}\n🆘 Ochiq murojaat: {t}\n🧾 Ochiq nik nizosi: {d}{revenue}', '📊 Статистика (сегодня / 7 дней)\n👤 Новых пользователей: {u1} / {u7}\n🏠 Новых домов: {h1} / {h7}\n🙂 Активных: {a1} / {a7}\n🪙 Монет выдано: {g1} / {g7}\n🪙 Монет потрачено: {s1} / {s7}\n🆘 Открытых обращений: {t}\n🧾 Открытых споров: {d}{revenue}'],
  statRevenue: ['\n💰 Tushum: {r1} / {r7} so‘m', '\n💰 Выручка: {r1} / {r7} сум'],
  openTickets: ['🆘 Ochiq murojaatlar: {n}', '🆘 Открытых обращений: {n}'],
  openDisputes: ['🧾 Ochiq nik nizolari: {n}', '🧾 Открытых споров о нике: {n}'],
  btnPanel: ['🛠 Admin panel', '🛠 Админ-панель'],
  bcAsk: ['📣 Hammaga xabar: matn yoki rasm (izoh bilan) yuboring. Bekor qilish: /bekor', '📣 Рассылка: пришлите текст или фото (с подписью). Отмена: /bekor'],
  bcPreview: ['👆 Xabar shunday ko‘rinadi. Kimga yuboramiz?', '👆 Так будет выглядеть сообщение. Кому отправить?'],
  btnAll: ['👥 Hammaga', '👥 Всем'],
  btnDistrict: ['🏘 Tumanga', '🏘 Району'],
  btnWaitlist: ['⏳ Kutish ro‘yxatiga', '⏳ Листу ожидания'],
  btnCancel: ['✖️ Bekor', '✖️ Отмена'],
  btnSend: ['✅ Yuborish', '✅ Отправить'],
  bcDistrict: ['Qaysi tumanga?', 'Какому району?'],
  bcConfirm: ['Yuborilsinmi? Qabul qiladi: {n} kishi.', 'Отправить? Получат: {n} чел.'],
  bcQueued: ['✅ Navbatga qo‘yildi: {n} kishi.', '✅ Поставлено в очередь: {n} чел.'],
  bcCancelled: ['Bekor qilindi.', 'Отменено.'],
  // ---------- Bildirishnomalar ----------
  n_released: ['Uyingiz bo‘shatildi.', 'Ваш дом освобождён.'],
  n_referral: ['👥 Do‘stingiz uy oldi — tanga qo‘shildi!', '👥 Друг получил дом — монеты начислены!'],
  n_referralScale: ['Taklif qilganlar: {n}.', 'Приглашено: {n}.'],
  n_order_paid: ['✅ To‘lov qabul qilindi.', '✅ Оплата получена.'],
  n_order_problem: ['⚠️ To‘lov keldi, lekin buyurtmada muammo bor. Admin ko‘rib chiqadi.', '⚠️ Оплата пришла, но есть проблема с заказом. Админ проверит.'],
  n_street_named: ['🪧 Ko‘cha nomi tasdiqlandi!', '🪧 Название улицы одобрено!'],
  n_street_rejected: ['Ko‘cha nomi rad etildi.', 'Название улицы отклонено.'],
  n_decor_gift: ['🎁 Sizga bezak sovg‘a qilindi! Hovlingizga qo‘ying.', '🎁 Вам подарили украшение! Поставьте во двор.'],
  n_yard_winner: ['🌷 Tabriklaymiz! Hovlingiz haftaning eng chiroyli hovlisi bo‘ldi.', '🌷 Поздравляем! Ваш двор — лучший двор недели.'],
  n_new_decor: ['✨ Do‘konda yangi bezak: {name}', '✨ Новое украшение в магазине: {name}'],
  n_elected: ['👑 Saylovda g‘olib bo‘ldingiz!', '👑 Вы победили на выборах!'],
  n_new_neighbour: ['🏡 Yangi qo‘shningiz: @{nick}', '🏡 Новый сосед: @{nick}'],
  n_inactive_warning: ['⏳ Uzoq vaqt kirmadingiz. 14 kun ichida kirmasangiz, bepul uyingiz bo‘shatiladi.', '⏳ Вы давно не заходили. Если не зайдёте 14 дней, бесплатный дом освободится.'],
  // ---------- Kanal postlari ----------
  chDaily: ['🏡 Bugun shaharda {n} ta yangi uy!\n{list}', '🏡 Сегодня в городе {n} новых домов!\n{list}'],
  chYard: ['🏆 Haftaning hovlisi: @{nick} ({votes} ovoz)!\n{url}', '🏆 Двор недели: @{nick} ({votes} голосов)!\n{url}'],
  chProject: ['🎉 {name} qurildi! Rahmat: {top}', '🎉 {name} построен! Спасибо: {top}'],
  chMilestone: ['🎉 Shaharda {n} ta uy! Rahmat, qo‘shnilar!', '🎉 В городе уже {n} домов! Спасибо, соседи!'],
  // ---------- Bot profili (npm run bot:setup) ----------
  description: ['CityLand UZ — Instagram obunachilari shahri. Bepul uy oling, uni bezang va do‘stlaringizni qo‘shni qiling 🏡', 'CityLand UZ — город подписчиков Instagram. Получите бесплатный дом, украсьте его и позовите друзей в соседи 🏡'],
  shortDescription: ['Instagram obunachilari uchun 3D shahar', '3D-город для подписчиков Instagram'],
  cmdStart: ['Boshlash', 'Начать'],
  cmdShop: ['Do‘kon', 'Магазин'],
  cmdInvite: ['Do‘st taklif', 'Пригласить друга'],
  cmdSupport: ['Adminga yozish', 'Написать админу'],
  cmdSettings: ['Sozlamalar', 'Настройки'],
  cmdAdmin: ['Admin panel', 'Админ-панель'],
  cmdStat: ['Statistika', 'Статистика'],
  cmdBroadcast: ['Hammaga xabar', 'Рассылка'],
  cmdTickets: ['Ochiq murojaatlar', 'Открытые обращения'],
  cmdDisputes: ['Ochiq nik nizolari', 'Открытые споры'],
} as const satisfies Readonly<Record<string, readonly [string, string]>>;

export type TextKey = keyof typeof T;
export const TEXT_KEYS = Object.keys(T) as readonly TextKey[];
type Vars = Readonly<Record<string, string | number>>;
export const bt = (lang: Lang, key: TextKey, vars: Vars = {}): string =>
  Object.entries(vars).reduce<string>((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), T[key][lang === 'ru' ? 1 : 0]);
/** Ikkala tildagi variant (tugma matnini tanish uchun). */
export const both = (key: TextKey): readonly string[] => T[key];

/** Bazada yozilgan eski "o'zbekcha / ruscha" matndan oluvchi tilidagi qismi. */
export const oneLang = (text: string, lang: Lang): string => {
  const at = text.indexOf(' / ');
  if (at < 0) return text;
  const [uz, ru] = [text.slice(0, at), text.slice(at + 3)];
  const isSplit = !/[А-Яа-яЁё]/.test(uz) && /[А-Яа-яЁё]/.test(ru);
  return isSplit ? (lang === 'ru' ? ru : uz) : text;
};
