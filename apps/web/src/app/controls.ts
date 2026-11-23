import { input } from './runtime.ts';
import { getApp, openPanel, setApp } from './store.ts';

const KEYS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const isTyping = (e: KeyboardEvent): boolean => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

/** WASD + sichqoncha/barmoq bilan qarash + g'ildirak/chimchilash bilan yaqinlashtirish. */
export const attachControls = (): (() => void) => {
  const held = new Set<string>();
  const apply = (): void => {
    const dirs = [...held].map((k) => KEYS[k]).filter((d): d is readonly [number, number] => d !== undefined);
    input.moveX = Math.sign(dirs.reduce((s, d) => s + d[0], 0));
    input.moveY = Math.sign(dirs.reduce((s, d) => s + d[1], 0));
  };
  const down = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (getApp().isPhoto) setApp({ isPhoto: false });
      else openPanel(null);
      return;
    }
    if (isTyping(e) || e.ctrlKey || e.metaKey) return;
    input.isRunning = e.shiftKey;
    if (!KEYS[e.code]) return;
    e.preventDefault();
    held.add(e.code);
    apply();
  };
  const up = (e: KeyboardEvent): void => {
    input.isRunning = e.shiftKey;
    if (held.delete(e.code)) apply();
  };
  const clear = (): void => {
    held.clear();
    apply();
  };

  const touches = new Map<number, { x: number; y: number }>();
  const onWorld = (e: Event): boolean => e.target instanceof HTMLCanvasElement && e.target.closest('.world') !== null;
  const pinch = (): number => {
    const [a, b] = [...touches.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };
  const pdown = (e: PointerEvent): void => {
    if (onWorld(e)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const pmove = (e: PointerEvent): void => {
    const last = touches.get(e.pointerId);
    if (!last) return;
    const before = pinch();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size >= 2) {
      input.zoom += (before - pinch()) * 0.03;
      return;
    }
    const k = e.pointerType === 'touch' ? 0.0062 : 0.0045;
    input.lookX += (e.clientX - last.x) * k;
    input.lookY += (e.clientY - last.y) * k;
  };
  const pup = (e: PointerEvent): void => { touches.delete(e.pointerId); };
  const wheel = (e: WheelEvent): void => { if (onWorld(e)) input.zoom += e.deltaY * 0.006; };

  const list: readonly (readonly [string, (e: never) => void])[] = [['keydown', down], ['keyup', up], ['blur', clear], ['pointerdown', pdown], ['pointermove', pmove], ['pointerup', pup], ['pointercancel', pup], ['wheel', wheel]];
  for (const [name, fn] of list) addEventListener(name, fn as EventListener, { passive: name !== 'keydown' });
  return () => { for (const [name, fn] of list) removeEventListener(name, fn as EventListener); };
};
