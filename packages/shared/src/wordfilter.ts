/** So'z filtri. Baza (private.has_banned) ham xuddi shu ro'yxat va normallashtirishdan foydalanadi. */
const CYRILLIC: Readonly<Record<string, string>> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'x', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya',
  қ: 'q', ғ: 'g', ҳ: 'h', ў: 'o',
};
const LEET: Readonly<Record<string, string>> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** Ildizlar normallashgan (lotin, takrorlarsiz) ko'rinishda. Uzun ildizlar so'z ichida ham qidiriladi. */
export const BANNED_ROOTS: readonly string[] = [
  'jalab', 'dalbayob', 'dalbaeb', 'qotoq', 'kotok', 'siktir', 'sikay', 'sikaman', 'skaman', 'onangni', 'onayni', 'amingni', 'dinaxuy',
  'xuyna', 'xuylo', 'naxuy', 'poxuy', 'pizda', 'pizdes', 'ebat', 'eban', 'yoban', 'blyat', 'blat', 'suka', 'mudak', 'gandon', 'pidar',
  'pidor', 'shlyuxa', 'fuck', 'shit', 'bitch', 'nigger', 'cunt', 'whore', 'kazino', 'casino', '1xbet', 'mostbet', 'pornx', 'porno',
];
/** Faqat alohida so'z sifatida taqiqlanadi (ichida qidirish yolg'on signal beradi). */
export const BANNED_WORDS: readonly string[] = ['am', 'sik', 'kot', 'xuy', 'bla', 'porn', 'sex', 'seks', 'ebal', 'qanjiq', 'iplos', 'haromi'];

const squash = (s: string): string => s.replace(/(.)\1+/g, '$1');

const normalizeWord = (raw: string): string => {
  const latin = [...raw.toLowerCase()].map((c) => CYRILLIC[c] ?? c).join('');
  return latin.replace(/[’‘'`ʻʼ]/g, '');
};
const deleet = (s: string): string => [...s].map((c) => LEET[c] ?? c).join('');
const letters = (s: string): string => s.replace(/[^a-z0-9]/g, '');

export const hasBannedWord = (text: string): boolean => {
  const tokens = normalizeWord(text).split(/[\s._\-,;:/\\|+*#()[\]"]+/).filter(Boolean);
  const forms = tokens.flatMap((t) => [squash(letters(t)), squash(letters(deleet(t)))]);
  if (forms.some((f) => BANNED_WORDS.includes(f) || BANNED_ROOTS.some((r) => f.includes(squash(r))))) return true;
  // "s u k a" kabi bo'lib yozilgan harflar.
  const spaced = tokens.length > 2 && tokens.every((t) => t.length <= 2) ? squash(letters(deleet(tokens.join('')))) : '';
  return spaced !== '' && BANNED_ROOTS.some((r) => spaced.includes(squash(r)));
};
