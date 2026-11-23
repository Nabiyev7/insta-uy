import { describe, expect, test } from 'vitest';
import { ffmpegArgs, frameCount } from '../src/logic/ffmpeg.ts';
import { composeMusic, encodeWav, SAMPLE_RATE } from '../src/logic/music.ts';
import { slides } from '../src/logic/slides.ts';

describe('video', () => {
  test('musiqa: uzunligi to‘g‘ri, takrorlanadi, kesilmaydi, oxiri so‘nadi', () => {
    const a = composeMusic(4);
    expect(a.length).toBe(4 * SAMPLE_RATE);
    expect(a).toEqual(composeMusic(4));
    expect(a).not.toEqual(composeMusic(4, 8));
    const peak = a.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(0.2);
    expect(peak).toBeLessThan(2.2);
    expect(Math.abs(a.at(-1)!)).toBe(0);
  });
  test('wav sarlavhasi', () => {
    const w = encodeWav(new Float32Array([0, 2, -2]));
    expect(w.toString('ascii', 0, 4)).toBe('RIFF');
    expect(w.readUInt32LE(40)).toBe(6);
    expect([w.readInt16LE(46), w.readInt16LE(48)]).toEqual([32767, -32767]);
  });
  test('ffmpeg: ovozsiz, musiqa, musiqa+ovoz', () => {
    expect(ffmpegArgs('o.mp4', 3, {})).toContain('-an');
    expect(ffmpegArgs('o.mp4', 3, { music: 'm.wav' }).join(' ')).toContain('volume=0.55');
    expect(ffmpegArgs('o.mp4', 3, { voice: 'v.mp3' }).join(' ')).toContain('volume=1,apad');
    expect(ffmpegArgs('o.mp4', 3, { music: 'm.wav', voice: 'v.mp3' }).join(' ')).toContain('amix');
    expect(frameCount(2)).toBe(60);
  });
  test('gazeta slaydlari: HTML ekranlanadi, bo‘sh bo‘limlar tashlanadi', () => {
    const full = slides({ week: '2026-11-23', content: { new_count: 3, new: ['<script>'], top: { instagram: 'a', score: 5 }, streets: ['Bahor'], projects: [{ uz: "Bog'", pct: 140 }], total: 9 } });
    expect(full).toHaveLength(6);
    expect(full.join('')).not.toContain('<script>');
    expect(full.join('')).toContain('width:100%');
    expect(slides({ week: 'w', content: { new_count: 0, new: [], top: null, streets: [], projects: [], total: 0 } })).toHaveLength(2);
  });
});
