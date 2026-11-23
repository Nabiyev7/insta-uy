/** Litsenziyasiz fon musiqasi: Karplus–Strong bilan sintez qilingan dutor + doira ritmi. */
export const SAMPLE_RATE = 44_100;
const SCALE = [146.83, 164.81, 174.61, 220, 233.08, 293.66, 329.63, 349.23, 440];
const BEAT = 0.3;

/** Takrorlanadigan tasodif: bir xil urug' → bir xil kuy. */
const random = (seed: number): (() => number) => {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
};

const addPluck = (out: Float32Array, at: number, freq: number, gain: number, rnd: () => number): void => {
  const n = Math.round(SAMPLE_RATE / freq);
  const ring = Float32Array.from({ length: n }, () => rnd() * 2 - 1);
  const len = Math.min(out.length - at, SAMPLE_RATE);
  let i = 0;
  for (let k = 0; k < len; k++) {
    const v = ring[i] ?? 0;
    out[at + k] = (out[at + k] ?? 0) + v * gain;
    const next = (i + 1) % n;
    ring[i] = (v + (ring[next] ?? 0)) * 0.497;
    i = next;
  }
};
const addDrum = (out: Float32Array, at: number, isDeep: boolean, rnd: () => number): void => {
  const len = Math.min(out.length - at, Math.floor(SAMPLE_RATE * (isDeep ? 0.22 : 0.07)));
  for (let k = 0; k < len; k++) {
    const t = k / SAMPLE_RATE;
    const env = Math.exp(-t * (isDeep ? 18 : 60));
    const tone = isDeep ? Math.sin(2 * Math.PI * (70 + 60 * Math.exp(-t * 30)) * t) : rnd() * 2 - 1;
    out[at + k] = (out[at + k] ?? 0) + tone * env * (isDeep ? 0.34 : 0.1);
  }
};

export const composeMusic = (seconds: number, seed = 7): Float32Array => {
  const out = new Float32Array(Math.ceil(seconds * SAMPLE_RATE));
  const rnd = random(seed);
  let note = 4;
  for (let b = 0; b * BEAT < seconds; b++) {
    const at = Math.floor(b * BEAT * SAMPLE_RATE);
    const step = b % 8;
    if (step === 0 || step === 3 || step === 6) addDrum(out, at, true, rnd);
    else addDrum(out, at, false, rnd);
    if (step % 2 === 0 || rnd() < 0.45) {
      note = Math.max(0, Math.min(SCALE.length - 1, note + Math.floor(rnd() * 5) - 2));
      addPluck(out, at, SCALE[note] ?? 220, 0.3, rnd);
    }
    if (step === 0) addPluck(out, at, (SCALE[0] ?? 146) / 2, 0.36, rnd);
  }
  const fade = SAMPLE_RATE;
  for (let k = 0; k < fade && k < out.length; k++) {
    const i = out.length - 1 - k;
    out[i] = (out[i] ?? 0) * (k / fade);
  }
  return out;
};

export const encodeWav = (samples: Float32Array): Buffer => {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0);
  b.writeUInt32LE(36 + samples.length * 2, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SAMPLE_RATE, 24);
  b.writeUInt32LE(SAMPLE_RATE * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32_767), 44 + i * 2));
  return b;
};
