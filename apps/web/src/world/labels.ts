/** Uy tepasidagi nik yorliqlari: oddiy / kumush / oltin + nishon. Teksturalar keshlanadi. */
import { CanvasTexture, Group, LinearFilter, SRGBColorSpace, Sprite, SpriteMaterial } from 'three';
import type { BadgeId, LabelKind } from '../../../../packages/shared/src/index.ts';
import { BADGE_ICONS } from '../ui/badges.ts';
import { ICONS, type IconName } from '../ui/icons.tsx';

export interface LabelInfo { readonly key: string; readonly text: string; readonly kind: LabelKind; readonly badge: string | null; /** Nishondan boshqa belgi. */ readonly icon?: IconName; /** Yuraklar soni (0 — ko'rsatilmaydi). */ readonly hearts?: number; readonly x: number; readonly y: number; readonly z: number; readonly size?: number }

const CACHE_MAX = 90;
const ICON_SIZE = 36;
const STYLES: Readonly<Record<LabelKind, readonly [bg: string, fg: string, border: string]>> = {
  plain: ['rgba(255,252,244,0.94)', '#2a241c', 'rgba(90,70,40,0.35)'], silver: ['#dfe5ea', '#25303a', '#8f9ba6'], gold: ['#f3cd68', '#3d2a05', '#a87814'],
};

const drawLabel = (info: LabelInfo): { texture: CanvasTexture; aspect: number } => {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  if (!g) throw new Error('2D kontekst yo‘q');
  const font = '600 40px system-ui, "Segoe UI", Roboto, sans-serif';
  const icon = info.icon ?? (info.badge && info.badge in BADGE_ICONS ? BADGE_ICONS[info.badge as BadgeId] : null);
  const left = icon ? ICON_SIZE + 10 : 0;
  const { text } = info;
  g.font = font;
  const hearts = info.hearts && info.hearts > 0 ? String(info.hearts) : '';
  const right = hearts ? Math.ceil(g.measureText(hearts).width) + ICON_SIZE + 14 : 0;
  const w = Math.min(700, Math.ceil(g.measureText(text).width) + 48 + left + right);
  canvas.width = w;
  canvas.height = 68;
  const [bg, fg, border] = STYLES[info.kind];
  g.beginPath();
  g.roundRect(3, 3, w - 6, 62, 31);
  if (info.kind === 'gold') {
    const grad = g.createLinearGradient(0, 0, w, 68);
    grad.addColorStop(0, '#fbe9a9');
    grad.addColorStop(0.5, bg);
    grad.addColorStop(1, '#d79f2f');
    g.fillStyle = grad;
  } else g.fillStyle = bg;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = border;
  g.stroke();
  g.font = font;
  g.fillStyle = fg;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, (w + left - right) / 2, 35, w - 36 - left - right);
  if (hearts) {
    g.textAlign = 'right';
    g.fillText(hearts, w - 22, 35);
    g.save();
    g.fillStyle = '#e0465a';
    g.translate(w - 26 - g.measureText(hearts).width - ICON_SIZE, 34 - ICON_SIZE / 2);
    g.scale(ICON_SIZE / 24, ICON_SIZE / 24);
    g.fill(new Path2D(ICONS.heart));
    g.restore();
  }
  if (icon) {
    g.strokeStyle = fg;
    g.lineWidth = 2.2;
    g.lineCap = g.lineJoin = 'round';
    g.translate(22, 34 - ICON_SIZE / 2);
    g.scale(ICON_SIZE / 24, ICON_SIZE / 24);
    g.stroke(new Path2D(ICONS[icon]));
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  return { texture, aspect: w / 68 };
};

export class Labels {
  readonly group = new Group();
  private readonly sprites: Sprite[] = [];
  private readonly cache = new Map<string, { texture: CanvasTexture; aspect: number }>();

  private entry(info: LabelInfo): { texture: CanvasTexture; aspect: number } {
    const id = `${info.key}|${info.text}|${info.kind}|${info.badge ?? ''}|${info.icon ?? ''}|${info.hearts ?? 0}`;
    const known = this.cache.get(id);
    if (known) {
      this.cache.delete(id);
      this.cache.set(id, known);
      return known;
    }
    const made = drawLabel(info);
    this.cache.set(id, made);
    if (this.cache.size > CACHE_MAX) {
      const oldest = this.cache.entries().next().value;
      if (oldest) {
        oldest[1].texture.dispose();
        this.cache.delete(oldest[0]);
      }
    }
    return made;
  }

  dispose(): void {
    for (const { texture } of this.cache.values()) texture.dispose();
    for (const s of this.sprites) s.material.dispose();
    this.cache.clear();
  }

  set(list: readonly LabelInfo[]): void {
    while (this.sprites.length < list.length) {
      const s = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
      s.renderOrder = 10;
      this.sprites.push(s);
      this.group.add(s);
    }
    this.sprites.forEach((s, i) => {
      const info = list[i];
      s.visible = info !== undefined;
      if (!info) return;
      const { texture, aspect } = this.entry(info);
      if (s.material.map !== texture) {
        s.material.map = texture;
        s.material.needsUpdate = true;
      }
      const h = (info.size ?? 1) * (info.kind === 'gold' ? 1.15 : 0.95);
      s.position.set(info.x, info.y, info.z);
      s.scale.set(h * aspect, h, 1);
    });
  }
}
