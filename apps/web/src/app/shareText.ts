/** Ulashish matnlari (19-qadam, egasining so'zlari). Bu matnlar saytning interfeysida ko'rinmaydi — boshqa ilovalarga (Telegram, Instagram, WhatsApp…)
 *  ulashish xabari bo'lib ketadi, shuning uchun emoji bor. `apps/web/test/interface.test.ts` dagi "emoji yo'q" qoidasidan faqat shu fayl ozod. */
import type { Lang } from '../../../../packages/shared/src/index.ts';

const SHARE: Readonly<Record<Lang, string>> = {
  uz: "Men CityLand UZ'da uy oldim 🏡 Sen ham bepul ol 👉 {link}",
  ru: 'Я получил дом в CityLand UZ 🏡 Получи и ты бесплатно 👉 {link}',
};
/** Havola bilan to'liq ulashish matni. */
export const shareMessage = (lang: Lang, link: string): string => SHARE[lang].replace('{link}', link);
/** Havolasiz qismi (havola alohida `url` bo'lib ketganda). */
export const shareLead = (lang: Lang): string => SHARE[lang].replace(' {link}', '');
/** Telegram stories: matn va havola tugmasi nomi. */
export const storyText = (lang: Lang): string => (lang === 'ru' ? 'Мой дом в CityLand UZ 🏡' : 'Mening uyim — CityLand UZ 🏡');
export const storyWidget = (lang: Lang): string => (lang === 'ru' ? 'Получить дом' : 'Uyingni ol');
