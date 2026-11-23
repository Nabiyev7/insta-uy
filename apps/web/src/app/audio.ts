/** Fon ovozi to'liq WebAudio'da sintez qilinadi — litsenziya masalasi yo'q. */
const SCALE = [293.66, 329.63, 349.23, 440, 466.16, 587.33, 659.25]; // milliy ohangga yaqin lad
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const pluck = (c: AudioContext, out: AudioNode, freq: number, at: number, gain: number): void => {
  const len = Math.floor(c.sampleRate * 1.4);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  const n = Math.round(c.sampleRate / freq);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  for (let i = n; i < len; i++) d[i] = ((d[i - n] ?? 0) + (d[i - n + 1] ?? 0)) * 0.497; // Karplus–Strong: dutor torisi
  const s = c.createBufferSource();
  s.buffer = buf;
  const g = c.createGain();
  g.gain.value = gain;
  s.connect(g).connect(out);
  s.start(at);
};
const chirp = (c: AudioContext, out: AudioNode): void => {
  const t = c.currentTime + Math.random();
  for (let i = 0; i < 3; i++) {
    const o = c.createOscillator();
    const g = c.createGain();
    const f = 2400 + Math.random() * 1600;
    o.frequency.setValueAtTime(f, t + i * 0.14);
    o.frequency.exponentialRampToValueAtTime(f * 1.3, t + i * 0.14 + 0.07);
    g.gain.setValueAtTime(0, t + i * 0.14);
    g.gain.linearRampToValueAtTime(0.018, t + i * 0.14 + 0.02);
    g.gain.linearRampToValueAtTime(0, t + i * 0.14 + 0.1);
    o.connect(g).connect(out);
    o.start(t + i * 0.14);
    o.stop(t + i * 0.14 + 0.12);
  }
};
const wind = (c: AudioContext, out: AudioNode): void => {
  const buf = c.createBuffer(1, c.sampleRate * 4, c.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) d[i] = last = last * 0.98 + (Math.random() * 2 - 1) * 0.02;
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  const g = c.createGain();
  g.gain.value = 0.5;
  s.connect(g).connect(out);
  s.start();
};
const loop = (): void => {
  if (!ctx || !master) return;
  const base = ctx.currentTime + 0.1;
  const step = 0.42;
  let note = Math.floor(Math.random() * SCALE.length);
  for (let i = 0; i < 16; i++) {
    if (Math.random() < 0.3) continue;
    note = Math.max(0, Math.min(SCALE.length - 1, note + Math.floor(Math.random() * 3) - 1));
    pluck(ctx, master, (SCALE[note] ?? 440) / 2, base + i * step, 0.11);
  }
  if (Math.random() < 0.7) chirp(ctx, master);
  timer = setTimeout(loop, 16 * step * 1000 + 2500);
};

export const startAudio = (): void => {
  if (ctx) { void ctx.resume(); return; }
  ctx = new AudioContext();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  wind(ctx, master);
  loop();
};
export const stopAudio = (): void => {
  clearTimeout(timer);
  void ctx?.close();
  ctx = null;
  master = null;
};
