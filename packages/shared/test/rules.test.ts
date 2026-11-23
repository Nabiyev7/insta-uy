import { describe, expect, test } from 'vitest';
import {
  DECOR, canUpgrade, dayFraction, decorById, hasBannedWord, hash01, holidayOf, instagramUrl, isFreeType, loginEmail, normalizeDecor, parseBio,
  parseInstagram, parseLogin, parsePassword, parseStreetName, parseText, plotAddress, plotPrice, sanitizeAvatar, seasonOf, weatherOf, DEFAULT_AVATAR,
} from '../src/index.ts';

describe('so‘z filtri', () => {
  test.each(['suka', 'СУКА', 's.u.k.a', 'suuuka', '$uka', 'j4lab', 'siktir git', 'на хуй'.replace(' ', ''), 'my_bitch'])('taqiqlaydi: %s', (t) => {
    expect(hasBannedWord(t)).toBe(true);
  });
  test.each(['musiqa', 'sikka', 'Navoiy ko‘chasi', 'kotib', 'amin', 'salom dunyo', 'bahor', 'a b c', 'xuyla'.slice(0, 0) || 'gul'])('ruxsat beradi: %s', (t) => {
    expect(hasBannedWord(t)).toBe(false);
  });
});

describe('validatsiya', () => {
  test.each([['@Ali.Valiyev', 'ali.valiyev'], ['https://www.instagram.com/horizo_tour/?igsh=1', 'horizo_tour'], [' nik_1 ', 'nik_1']])('instagram %s → %s', (raw, nick) => {
    expect(parseInstagram(raw)).toEqual({ ok: true, value: nick });
  });
  test.each([['', 'empty'], ['a'.repeat(31), 'too_long'], ['a..b', 'bad_format'], ['ali valiyev', 'bad_format'], ['.ali', 'bad_format'], ['suka_01', 'banned_word']])('instagram xato: %s', (raw, code) => {
    expect(parseInstagram(raw)).toEqual({ ok: false, code });
  });
  test('login va parol chegaralari', () => {
    expect(parseLogin('Ali_99')).toEqual({ ok: true, value: 'ali_99' });
    expect(parseLogin('1ali').ok).toBe(false);
    expect(parseLogin('al').ok).toBe(false);
    expect(parseLogin('a'.repeat(25)).ok).toBe(false);
    expect(parseLogin('sukabek').ok).toBe(false);
    expect(parsePassword('1234567').ok).toBe(false);
    expect(parsePassword('12345678').ok).toBe(true);
    expect(parsePassword('я'.repeat(40))).toEqual({ ok: false, code: 'too_long' });
  });
  test('bio: havola va uzunlik', () => {
    expect(parseBio('')).toEqual({ ok: true, value: '' });
    expect(parseBio('  Salom   shahar ')).toEqual({ ok: true, value: 'Salom shahar' });
    expect(parseBio('http://spam.uz').ok).toBe(false);
    expect(parseBio('x'.repeat(121)).ok).toBe(false);
    expect(parseText('a‮b', 10).ok).toBe(false);
  });
  test('ko‘cha nomi 25 belgi', () => {
    expect(parseStreetName('Bahor ko‘chasi').ok).toBe(false); // ‘ belgisi ro'yxatda yo'q
    expect(parseStreetName("Bog'ishamol").ok).toBe(true);
    expect(parseStreetName('a'.repeat(26)).ok).toBe(false);
    expect(parseStreetName('<b>x</b>').ok).toBe(false);
  });
  test('havola va email', () => {
    expect(instagramUrl('a.b')).toBe('https://www.instagram.com/a.b/');
    expect(loginEmail('ali')).toMatch(/^ali@/);
  });
});

describe('katalog', () => {
  test('narx joy qiymatiga qarab oshadi, chegirma ishlaydi', () => {
    expect(plotPrice({ type: 'villa', value: 100 })).toBeGreaterThan(plotPrice({ type: 'villa', value: 0 }));
    expect(plotPrice({ type: 'hovli', value: 0 }, 30_000, 50)).toBe(15_000);
  });
  test('bitta joyga bitta bezak, oxirgisi qoladi', () => {
    expect(normalizeDecor(['gate_wood', 'gate_gold', 'tree_anor', 'tree_chinor', 'yoq', 'tree_anor'])).toEqual(['gate_gold', 'tree_chinor', 'tree_anor']);
  });
  test('ID’lar noyob', () => {
    expect(new Set(DECOR.map((d) => d.id)).size).toBe(DECOR.length);
    expect(decorById('yoq')).toBeUndefined();
    expect(isFreeType('villa')).toBe(false);
    expect(canUpgrade('kvartira')).toBe(false);
  });
  test('avatar faqat ruxsat etilgan qiymatlar', () => {
    expect(sanitizeAvatar({ skin: 'javascript:1', hat: 'kepka' })).toEqual({ ...DEFAULT_AVATAR, hat: 'kepka' });
    expect(sanitizeAvatar(null)).toEqual(DEFAULT_AVATAR);
  });
});

describe('shahar yordamchilari', () => {
  test('manzil', () => {
    expect(plotAddress({ streetId: 1, number: 7, unit: 0 }, null, 'uz')).toBe("1-ko'cha, 7-uy");
    expect(plotAddress({ streetId: 1, number: 7, unit: 3 }, 'Navoiy', 'ru')).toBe('Navoiy, дом 7, кв. 3');
  });
  test('vaqt, fasl, bayram', () => {
    expect(dayFraction(Date.UTC(2026, 0, 1, 7, 0))).toBeCloseTo(0.5);
    expect(dayFraction(30_000, 1)).toBeCloseTo(0.5);
    expect(seasonOf(Date.UTC(2026, 3, 1))).toBe('bahor');
    expect(seasonOf(Date.UTC(2026, 6, 1))).toBe('yoz');
    expect(seasonOf(Date.UTC(2026, 9, 1))).toBe('kuz');
    expect(seasonOf(Date.UTC(2026, 0, 1))).toBe('qish');
    expect(holidayOf(Date.UTC(2026, 2, 21))).toBe('navroz');
    expect(holidayOf(Date.UTC(2026, 11, 31))).toBe('yangi_yil');
    expect(holidayOf(Date.UTC(2026, 8, 1))).toBe('mustaqillik');
    expect(holidayOf(Date.UTC(2026, 5, 1))).toBeNull();
  });
  test('ob-havo deterministik, yozda qor yog‘maydi', () => {
    const t = Date.UTC(2026, 6, 1);
    expect(weatherOf(t)).toBe(weatherOf(t));
    for (let i = 0; i < 300; i++) expect(weatherOf(t + i * 6 * 3_600_000 * 0.9 % (60 * 86_400_000))).not.toBe('qor');
  });
  test('hash01 [0,1) ichida va barqaror', () => {
    expect(hash01('P0001')).toBe(hash01('P0001'));
    const mean = Array.from({ length: 2000 }, (_, i) => hash01(`P${i}`)).reduce((a, b) => a + b, 0) / 2000;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
