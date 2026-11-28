import { describe, expect, test } from 'vitest';
import { INSTALL_PAUSE_MS, INTRO_MS, installWay, introStart, isInstallDue, referralSteps } from '../src/logic/growth.ts';

const GIFTS = { 1: 'gul_zor', 3: 'dam_besedka', 10: 'avto_sedan' };

describe('o‘sish', () => {
  test('taklif shkalasi 1 → 3 → 10: olinganlari belgili, keyingisigacha qolgani', () => {
    expect(referralSteps(0, GIFTS)).toEqual({ steps: [{ at: 1, decor: 'gul_zor', isDone: false }, { at: 3, decor: 'dam_besedka', isDone: false }, { at: 10, decor: 'avto_sedan', isDone: false }], left: 1 });
    expect(referralSteps(4, GIFTS).left).toBe(6);
    expect(referralSteps(4, GIFTS).steps.map((s) => s.isDone)).toEqual([true, true, false]);
    expect(referralSteps(12, GIFTS).left).toBeNull();
  });
  test('"Bosh ekranga qo‘shish": ikkinchi kirishda, rad etilsa 14 kun yo‘q, o‘rnatilganda yo‘q', () => {
    const now = 1_000_000_000_000;
    expect(isInstallDue(1, null, now, false)).toBe(false);
    expect(isInstallDue(2, null, now, false)).toBe(true);
    expect(isInstallDue(5, now - INSTALL_PAUSE_MS + 1000, now, false)).toBe(false);
    expect(isInstallDue(5, now - INSTALL_PAUSE_MS, now, false)).toBe(true);
    expect(isInstallDue(5, null, now, true)).toBe(false);
    expect(installWay('Mozilla Instagram 300.0', true)).toBe('instagram');
    expect(installWay('Android Chrome', true)).toBe('prompt');
    expect(installWay('iPhone Safari', false)).toBe('ios');
  });
  test('kirish animatsiyasi baland nuqtadan boshlanadi; past sifatda qisqaroq', () => {
    const to = { x: 10, z: 20, yaw: 0.5, height: 80 };
    const from = introStart(to);
    expect(from.height).toBeGreaterThan(to.height);
    expect([from.x, from.z]).toEqual([to.x, to.z]);
    expect(INTRO_MS.low).toBeLessThan(INTRO_MS.normal);
  });
});

describe('19-qadam: taklif bosqichlari — tanga', () => {
  test('3 / 10 / 25 / 50 → +2 000 / +6 000 / +15 000 / +40 000; keyingi bosqichgacha nechta qolgani', async () => {
    const { coinSteps } = await import('../src/logic/growth.ts');
    const S = { 3: 2000, 10: 6000, 25: 15000, 50: 40000 };
    expect(coinSteps(0, S).steps.map((s) => [s.at, s.coins])).toEqual([[3, 2000], [10, 6000], [25, 15000], [50, 40000]]);
    expect(coinSteps(0, S).left).toBe(3);
    expect(coinSteps(4, S).left).toBe(6);
    expect(coinSteps(30, S).steps.map((s) => s.isDone)).toEqual([true, true, true, false]);
    expect(coinSteps(50, S).left).toBeNull();
  });
});
