/** Jonli fon: mashinalar, mushuk, kaptarlar, yomg'ir/qor. */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Points, PointsMaterial } from 'three';
import { CELL, CITY_HALF, RING, ZONES, hash01, weatherOf } from '../../../../packages/shared/src/index.ts';
import type { Item } from '../logic/item.ts';
import { QUALITY } from '../logic/quality.ts';
import { PEOPLE_HEIGHT } from '../logic/view.ts';
import { city, director, here, player, session } from '../app/runtime.ts';
import { useApp } from '../app/store.ts';
import type { Kit } from './kit.ts';
import { Pools } from './pools.ts';

const BASE = { y: 0, sx: 1, sy: 1, sz: 1, wall: '#ffffff', roof: '#ffffff', glow: 0, seed: 0.5 } as const;
const LINES = [-CELL, CELL] as const;
/** Har uchinchi mashina halqa yo'lda aylanadi. */
const RING_LANE = 4.8;
const BULVAR = ZONES.bulvar.rect[3] + 8;
const BULVAR_SMALL = ZONES.bulvarKichik.rect[2] + 8;
const ringCar = (i: number, t: number): Item => {
  const dir = hash01(`rd${i}`) < 0.5 ? 1 : -1;
  const r = RING.r - dir * RING_LANE;
  const a = hash01(`ra${i}`) * Math.PI * 2 + (dir * t * (8 + hash01(`rs${i}`) * 4)) / r;
  return { ...BASE, model: CAR_MODELS[i % 4] ?? 'car_van', x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: -a + (dir > 0 ? 0 : Math.PI) };
};
const CAR_MODELS = ['car_van', 'car_sedan', 'car_van', 'car_sport'] as const;
const SPAN = CITY_HALF;
const CARS = 54;

/** Mashinalar prospektlar bo'ylab deterministik yuradi — serversiz hamma joyda bir xil. */
const carAt = (i: number, t: number): Item | null => {
  if (i % 3 === 0) return ringCar(i, t);
  const line = LINES[i % 3 === 1 ? 0 : 1] ?? 0;
  const isX = i % 2 === 0;
  const dir = hash01(`cd${i}`) < 0.5 ? 1 : -1;
  const u = ((hash01(`cu${i}`) * 2 * SPAN + t * (7 + hash01(`cs${i}`) * 5)) % (2 * SPAN)) - SPAN;
  const along = u * dir;
  if (Math.abs(along) < (isX ? BULVAR_SMALL : BULVAR)) return null;
  const lane = line + (isX ? dir : -dir) * 5.2;
  const yaw = isX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : dir > 0 ? 0 : Math.PI;
  return { ...BASE, model: CAR_MODELS[i % 4] ?? 'car_van', x: isX ? along : lane, z: isX ? lane : along, yaw };
};

const critters = (t: number): Item[] => {
  const pigeons = Array.from({ length: 10 }, (_, i): Item => {
    const a = hash01(`pa${i}`) * 6.28 + Math.sin(t * 0.2 + i) * 0.4;
    const r = 18 + hash01(`pr${i}`) * 16;
    const near = Math.hypot(player.x - Math.cos(a) * r, player.z - Math.sin(a) * r) < 4;
    const fly = near ? 2.5 : Math.max(0, Math.sin(t * 0.35 + i * 1.7) - 0.82) * 22;
    return { ...BASE, model: 'pigeon', x: Math.cos(a) * r, y: fly, z: Math.sin(a) * r, yaw: t * 0.3 + i, sx: 1.2, sy: 1.2 + (fly > 0.1 ? Math.sin(t * 22 + i) * 0.4 : 0), sz: 1.2 };
  });
  const cats = Array.from({ length: 4 }, (_, i): Item => {
    const a = t * 0.06 * (i % 2 ? 1 : -1) + i * 1.6;
    const r = 28 + i * 4;
    return { ...BASE, model: 'pet_cat', x: Math.cos(a) * r, z: Math.sin(a) * r, yaw: -a + (i % 2 ? Math.PI : 0) };
  });
  return [...pigeons, ...cats];
};

interface LifeLayerProps { readonly kit: Kit }
export function LifeLayer({ kit }: LifeLayerProps): null {
  const { scene } = useThree();
  const q = QUALITY[useApp((s) => s.quality)];
  const pools = useMemo(() => new Pools(kit), [kit]);
  const acc = useRef(0);
  const precip = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(1400 * 3).map((_, i) => hash01(`w${i}`) * 60 - 30), 3));
    const p = new Points(g, new PointsMaterial({ color: '#dfe9f2', size: 0.09, transparent: true, opacity: 0.75, depthWrite: false }));
    p.frustumCulled = false;
    return p;
  }, []);

  useEffect(() => {
    scene.add(pools.group, precip);
    return () => {
      scene.remove(pools.group, precip);
      pools.dispose();
      precip.geometry.dispose();
      (precip.material as PointsMaterial).dispose();
    };
  }, [scene, pools, precip]);

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime;
    const real = Date.now() / 1000;
    acc.current += dt;
    const at = here();
    const fx = director.pose?.tx ?? at.x;
    const fz = director.pose?.tz ?? at.z;
    const isHigh = !director.pose && session.mode === 'city' && city.view.height > PEOPLE_HEIGHT;
    pools.group.visible = !isHigh;
    // Kuchsiz qurilmada 20 marta/soniya yetarli.
    if (acc.current > (q.level === 'low' ? 0.05 : 0)) {
      acc.current = 0;
      const cars = Array.from({ length: CARS }, (_, i) => carAt(i, real)).filter((c): c is Item => c !== null && Math.hypot(c.x - fx, c.z - fz) < q.mid);
      const isPlaza = Math.hypot(fx, fz) < 120;
      pools.set(isPlaza ? [...cars, ...critters(t)] : cars);
    }
    const w = weatherOf(Date.now());
    const isSnow = w === 'qor';
    precip.visible = q.particles > 0 && (isSnow || w === 'yomgir') && !director.pose && !isHigh;
    if (!precip.visible) return;
    precip.geometry.setDrawRange(0, q.particles);
    precip.position.set(fx, 0, fz);
    (precip.material as PointsMaterial).size = isSnow ? 0.16 : 0.07;
    const pos = precip.geometry.getAttribute('position') as BufferAttribute;
    const fall = dt * (isSnow ? 2.2 : 17);
    for (let i = 0; i < q.particles; i++) {
      const y = pos.getY(i) - fall;
      pos.setY(i, y < 0 ? y + 24 : y);
      if (isSnow) pos.setX(i, pos.getX(i) + Math.sin(t + i) * dt * 0.5);
    }
    pos.needsUpdate = true;
  });
  return null;
}
