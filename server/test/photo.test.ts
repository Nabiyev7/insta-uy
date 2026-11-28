/** 19-qadam (2): /photo/send — faqat o'z papkasidagi rasm. */
import { describe, expect, test } from 'vitest';
import { isOwnShot } from '../src/photo.ts';

describe('/photo/send', () => {
  const uid = '11111111-2222-3333-4444-555555555555';
  test('faqat <user_id>/<uuid>.jpg|png', () => {
    expect(isOwnShot(`${uid}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`, uid)).toBe(true);
    expect(isOwnShot(`boshqa/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.jpg`, uid)).toBe(false);
    expect(isOwnShot(`${uid}/../x.jpg`, uid)).toBe(false);
    expect(isOwnShot(`${uid}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.svg`, uid)).toBe(false);
    // Nuqta haqiqiy nuqta bo'lishi kerak (istalgan belgi emas).
    expect(isOwnShot(`${uid}/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeeeXjpg`, uid)).toBe(false);
  });
});
