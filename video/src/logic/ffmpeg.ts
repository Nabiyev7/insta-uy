export const FPS = 30;

export interface AudioTracks { readonly music?: string; readonly voice?: string }

/** Kadrlar stdin'dan (MJPEG), ovoz fayllardan; ovoz bo'lsa musiqa pasaytiriladi. */
export const ffmpegArgs = (out: string, seconds: number, audio: AudioTracks): string[] => {
  const inputs = [audio.music, audio.voice].filter((f): f is string => f !== undefined);
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', ...inputs.flatMap((f) => ['-i', f])];
  const video = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', seconds.toFixed(2)];
  const sound = ['-c:a', 'aac', '-b:a', '160k'];
  if (inputs.length === 0) return [...args, ...video, '-an', out];
  if (inputs.length === 1) return [...args, '-filter_complex', `[1:a]volume=${audio.music ? 0.55 : 1},apad[a]`, '-map', '0:v', '-map', '[a]', ...video, ...sound, out];
  return [...args, '-filter_complex', '[1:a]volume=0.2[m];[2:a]volume=1,apad[v];[m][v]amix=inputs=2:duration=first:normalize=0[a]', '-map', '0:v', '-map', '[a]', ...video, ...sound, out];
};

export const frameCount = (seconds: number): number => Math.round(seconds * FPS);
