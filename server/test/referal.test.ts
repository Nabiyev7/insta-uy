/** 19-qadam (5): bot — bosqichga yetganda tabrik, taklif matnida tanga bosqichlari. */
import { describe, expect, test } from 'vitest';
import { inviteText, noteText } from '../src/telegram.ts';

describe('bot: do‘st taklifi', () => {
  test('bosqich tabrigi: "3 ta do‘st! Bosqich bonusi: +2 000 tanga"', () => {
    expect(noteText({ kind: 'ref_step', chat: 1, lang: 'uz', data: { friends: 3, coins: 2000 } })).toContain('3 ta do‘st! Bosqich bonusi: +2 000 tanga');
    expect(noteText({ kind: 'ref_step', chat: 1, lang: 'ru', data: { friends: 10, coins: 6000 } })).toContain('+6 000');
  });
  test('taklif matni: har do‘st +500, bosqichlar va keyingisigacha nechta qoldi', () => {
    const steps = [{ at: 3, coins: 2000 }, { at: 10, coins: 6000 }, { at: 25, coins: 15000 }, { at: 50, coins: 40000 }];
    const text = inviteText('uz', 'https://t.me/b?start=r_x', { ref: 'x', invited: 4, perFriend: 500, steps });
    expect(text).toContain('+500 tanga');
    expect(text).toContain('✅ 3 do‘st — +2 000 tanga');
    expect(text).toContain('10 do‘st — +6 000 tanga');
    expect(text).toContain('Keyingi bosqichgacha yana 6 do‘st.');
    expect(inviteText('uz', 'L', { ref: 'x', invited: 60, perFriend: 500, steps })).toContain('Hamma bosqichlar olingan!');
  });
});
