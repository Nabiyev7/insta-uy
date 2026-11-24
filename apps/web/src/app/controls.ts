import { input, session } from './runtime.ts';
import { getApp, openPanel, setApp } from './store.ts';

const KEYS: Readonly<Record<string, readonly [number, number]>> = {
  KeyW: [0, 1], ArrowUp: [0, 1], KeyS: [0, -1], ArrowDown: [0, -1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const ROTATE_BUTTON = 2;
const WHEEL_ZOOM = 0.0012;
const MOUSE_TWIST = 0.006;
const isTyping = (e: KeyboardEvent): boolean => e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

interface Touch { readonly x: number; readonly y: number }
const spread = (a: Touch, b: Touch): { readonly d: number; readonly angle: number; readonly x: number; readonly y: number } =>
  ({ d: Math.hypot(a.x - b.x, a.y - b.y), angle: Math.atan2(b.y - a.y, b.x - a.x), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Shahar: sudrash — siljish, chimchilash — yaqinlashish, ikki barmoq/o'ng tugma — burish. Piyoda va mashina: qarash. */
export const attachControls = (): (() => void) => {
  const held = new Set<string>();
  const apply = (): void => {
    const dirs = [...held].map((k) => KEYS[k]).filter((d): d is readonly [number, number] => d !== undefined);
    input.moveX = Math.sign(dirs.reduce((s, d) => s + d[0], 0));
    input.moveY = Math.sign(dirs.reduce((s, d) => s + d[1], 0));
  };
  const down = (e: KeyboardEvent): void => {
    if (e.code === 'Escape') {
      if (getApp().isClean) setApp({ isClean: false });
      else if (getApp().isPhoto) setApp({ isPhoto: false });
      else openPanel(null);
      return;
    }
    if (isTyping(e) || e.ctrlKey || e.metaKey) return;
    input.isRunning = e.shiftKey;
    if (e.code === 'Space' && session.mode === 'drive') {
      e.preventDefault();
      input.isBraking = true;
      return;
    }
    if (!KEYS[e.code]) return;
    e.preventDefault();
    held.add(e.code);
    apply();
  };
  const up = (e: KeyboardEvent): void => {
    input.isRunning = e.shiftKey;
    if (e.code === 'Space') input.isBraking = false;
    if (held.delete(e.code)) apply();
  };
  const clear = (): void => {
    held.clear();
    input.isRunning = input.isBraking = false;
    apply();
  };

  const touches = new Map<number, Touch>();
  const onWorld = (e: Event): boolean => e.target instanceof HTMLCanvasElement && e.target.closest('.world') !== null;
  const pair = (): ReturnType<typeof spread> | null => {
    const [a, b] = [...touches.values()];
    return a && b ? spread(a, b) : null;
  };
  const pdown = (e: PointerEvent): void => {
    if (onWorld(e)) touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const twoFingers = (before: ReturnType<typeof spread>, after: ReturnType<typeof spread>): void => {
    if (session.mode !== 'city') {
      input.zoom += (before.d - after.d) * 0.03;
      return;
    }
    input.zoomBy *= before.d / Math.max(1, after.d);
    const turn = after.angle - before.angle;
    input.twist += Math.atan2(Math.sin(turn), Math.cos(turn));
    input.panX += after.x - before.x;
    input.panY += after.y - before.y;
  };
  const pmove = (e: PointerEvent): void => {
    const last = touches.get(e.pointerId);
    if (!last) return;
    const before = pair();
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const after = pair();
    if (before && after) { twoFingers(before, after); return; }
    const [dx, dy] = [e.clientX - last.x, e.clientY - last.y];
    if (session.mode === 'city') {
      if (e.buttons & ROTATE_BUTTON) input.twist -= dx * MOUSE_TWIST;
      else {
        input.panX += dx;
        input.panY += dy;
      }
      return;
    }
    const k = e.pointerType === 'touch' ? 0.0062 : 0.0045;
    input.lookX += dx * k;
    input.lookY += dy * k;
  };
  const pup = (e: PointerEvent): void => { touches.delete(e.pointerId); };
  const wheel = (e: WheelEvent): void => {
    if (!onWorld(e)) return;
    if (session.mode === 'city') input.zoomBy *= Math.exp(e.deltaY * WHEEL_ZOOM);
    else input.zoom += e.deltaY * 0.006;
  };
  const menu = (e: Event): void => { if (onWorld(e)) e.preventDefault(); };

  const list: readonly (readonly [string, (e: never) => void])[] = [
    ['keydown', down], ['keyup', up], ['blur', clear], ['pointerdown', pdown], ['pointermove', pmove], ['pointerup', pup], ['pointercancel', pup], ['wheel', wheel], ['contextmenu', menu],
  ];
  const isPassive = (name: string): boolean => name !== 'keydown' && name !== 'contextmenu';
  for (const [name, fn] of list) addEventListener(name, fn as EventListener, { passive: isPassive(name) });
  return () => { for (const [name, fn] of list) removeEventListener(name, fn as EventListener); };
};
