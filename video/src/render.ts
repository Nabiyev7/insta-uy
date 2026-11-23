/** 3D sahnani kadrma-kadr yozib, 9:16 MP4 yasaydi (o'z kompyuterda, bepul). */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { chromium, type Browser, type Page } from 'playwright-core';
import { ffmpegArgs, FPS, frameCount, type AudioTracks } from './logic/ffmpeg.ts';
import { composeMusic, encodeWav } from './logic/music.ts';

export interface RenderStyle { readonly title?: string; readonly text?: string; readonly seconds?: number; readonly time?: number; readonly music?: boolean; readonly voice?: string }
export interface RenderJob { readonly id: string; readonly plots: readonly string[]; readonly style: RenderStyle }
export interface RenderOptions { readonly siteUrl: string; readonly outDir: string; readonly elevenKey?: string; readonly elevenVoice?: string }

const GPU_ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'];

export const launchBrowser = (): Promise<Browser> =>
  chromium.launch({ headless: true, args: process.platform === 'win32' ? GPU_ARGS : ['--use-angle=gl', '--enable-gpu'], ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' }) });

/** "Bekzod" ovozi — ElevenLabs (kalit bo'lmasa ovozsiz). */
const makeVoice = async (text: string, file: string, o: RenderOptions): Promise<string | undefined> => {
  if (!text.trim() || !o.elevenKey || !o.elevenVoice) return undefined;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(o.elevenVoice)}`, {
    method: 'POST', headers: { 'xi-api-key': o.elevenKey, 'content-type': 'application/json', accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  });
  if (!res.ok) throw new Error(`ElevenLabs: ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
};

const openScene = async (browser: Browser, o: RenderOptions, job: RenderJob): Promise<{ page: Page; total: number }> => {
  const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
  await page.goto(`${o.siteUrl}/?video=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => '__video' in window, undefined, { timeout: 60_000 });
  const { total } = await page.evaluate(([plots, style]) => {
    const api = (window as unknown as { __video: { setup(p: readonly string[], s: unknown): Promise<{ total: number }> } }).__video;
    return api.setup(plots, style);
  }, [job.plots, job.style] as const);
  return { page, total };
};

export const renderJob = async (job: RenderJob, o: RenderOptions): Promise<string> => {
  if (!ffmpegStatic) throw new Error("ffmpeg topilmadi (npm i)");
  await mkdir(o.outDir, { recursive: true });
  const base = path.join(o.outDir, job.id);
  const out = `${base}.mp4`;
  const browser = await launchBrowser();
  try {
    const { page, total } = await openScene(browser, o, job);
    const voice = await makeVoice(job.style.voice ?? '', `${base}.mp3`, o);
    const music = job.style.music === false ? undefined : `${base}.wav`;
    if (music) await writeFile(music, encodeWav(composeMusic(total)));
    const audio: AudioTracks = { ...(music ? { music } : {}), ...(voice ? { voice } : {}) };
    const ff = spawn(ffmpegStatic as unknown as string, ffmpegArgs(out, total, audio), { stdio: ['pipe', 'ignore', 'pipe'] });
    let errors = '';
    ff.stderr.on('data', (d: Buffer) => { errors += d.toString(); });
    ff.stdin.on('error', () => undefined); // ffmpeg yiqilsa sabab stderr'da
    const closed = once(ff, 'close') as Promise<[number | null]>;
    for (let i = 0; i < frameCount(total); i++) {
      const jpeg = await page.evaluate((t) => (window as unknown as { __video: { frame(s: number): Promise<string> } }).__video.frame(t), i / FPS);
      if (!ff.stdin.write(Buffer.from(jpeg, 'base64'))) await Promise.race([once(ff.stdin, 'drain'), closed]);
      if (ff.exitCode !== null) break;
    }
    ff.stdin.end();
    const [code] = await closed;
    if (code !== 0) throw new Error(`ffmpeg ${code}: ${errors.slice(0, 300)}`);
    return out;
  } finally {
    await browser.close();
  }
};
