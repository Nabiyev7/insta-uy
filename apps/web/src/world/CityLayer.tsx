import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CanvasTexture, Color, DirectionalLight, Fog, HemisphereLight, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader } from 'three';
import { SpatialIndex, dayFraction, holidayOf, padHeight, seasonOf, weatherOf, type MasterPlan, type Plot } from '../../../../packages/shared/src/index.ts';
import { daylightAt, leafTint, snowAmount } from '../logic/atmosphere.ts';
import {
  buildingItem, closedDistrictItems, commerceItem, expansionItems, holidayItems, houseItem, plotItems, projectItems, staticItems, toWorld, yawOf, type HouseState, type Item,
} from '../logic/placement.ts';
import { QUALITY } from '../logic/quality.ts';
import { PUBLIC_FILES } from '../app/api.ts';
import { camera as cam, director, player } from '../app/runtime.ts';
import { setting, useApp } from '../app/store.ts';
import { Ground } from './ground.ts';
import { kitUniforms, type Kit } from './kit.ts';
import { Labels, type LabelInfo } from './labels.ts';
import { Pools } from './pools.ts';
import { Lake, Sky } from './sky.ts';

const BIG = new Set(['crane', 'office', 'office_low', 'choyxona', 'maktab', 'stadium', 'bridge', 'hero_statue', 'plaza_fountain', 'billboard']);
const LODS: Readonly<Record<string, string>> = { tree_chinor: 'tree_chinor_lod', tree_terak: 'tree_terak_lod', tree_archa: 'tree_archa' };
const LABEL_RANGE = 46;
const WHITE_COLOR = new Color('#ffffff');

/** Ko'rish markazi: odatda o'yinchi, videoda — kamera. */
const focus = (): { x: number; z: number; yaw: number } => {
  const p = director.pose;
  if (!p) return { x: player.x, z: player.z, yaw: cam.yaw + Math.PI };
  return { x: p.x + (p.tx - p.x) * 0.5, z: p.z + (p.tz - p.z) * 0.5, yaw: Math.atan2(p.tx - p.x, p.tz - p.z) };
};

const useIndexes = (plan: MasterPlan): { plots: SpatialIndex<Plot>; statics: SpatialIndex<Item> } =>
  useMemo(() => ({ plots: new SpatialIndex(plan.plots.filter((p) => p.type !== 'kvartira')), statics: new SpatialIndex(staticItems(plan)) }), [plan]);

const Ads = (): null => {
  const { scene } = useThree();
  const plan = useApp((s) => s.plan);
  const ads = useApp((s) => s.boot?.commerce);
  useEffect(() => {
    if (!plan || !ads) return undefined;
    const meshes = ads.flatMap((ad) => {
      const c = plan.commerce.find((q) => q.id === ad.id);
      if (!c) return [];
      const size = c.type === 'bilbord' ? { w: 7.8, h: 3, y: 5.8, z: 0.02 } : c.type === 'dokon' ? { w: 9.6, h: 1.15, y: 4.2, z: 5.27 } : { w: 8, h: 1.6, y: 5.4, z: c.w > 30 ? 8.1 : 12.1 };
      const material = new MeshBasicMaterial({ map: ad.image && c.type === 'bilbord' ? new TextureLoader().load(PUBLIC_FILES + ad.image, (t) => { t.colorSpace = SRGBColorSpace; }) : signTexture(ad.title) });
      const mesh = new Mesh(new PlaneGeometry(size.w, size.h), material);
      const [x, z] = toWorld(c, 0, size.z);
      mesh.position.set(x, size.y, z);
      mesh.rotation.y = yawOf(c.rot);
      return [mesh];
    });
    if (meshes.length === 0) return undefined;
    scene.add(...meshes);
    return () => {
      for (const m of meshes) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.map?.dispose();
        m.material.dispose();
      }
    };
  }, [plan, ads, scene]);
  return null;
};
const signTexture = (text: string): CanvasTexture => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#14545f';
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#fdf3d9';
    g.font = '700 52px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, 256, 50, 480);
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
};

interface CityLayerProps { readonly kit: Kit; readonly plan: MasterPlan }

export function CityLayer({ kit, plan }: CityLayerProps): React.JSX.Element {
  const { scene, gl } = useThree();
  const level = useApp((s) => s.quality);
  const houses = useApp((s) => s.houses);
  const boot = useApp((s) => s.boot);
  const q = QUALITY[level];
  const index = useIndexes(plan);

  const world = useMemo(() => ({ pools: new Pools(kit), ground: new Ground(plan, { openDistricts: new Set() }), sky: new Sky(), lake: new Lake(), labels: new Labels() }), [kit, plan]);
  const sun = useMemo(() => new DirectionalLight('#fff', 2), []);
  const hemi = useMemo(() => new HemisphereLight('#fff', '#8a7a60', 1), []);
  const fog = useMemo(() => new Fog('#cde', 40, 400), []);
  const last = useRef({ x: 1e9, z: 1e9, yaw: 0, at: 0 });
  const plotCache = useRef(new Map<string, readonly Item[]>());

  const open = useMemo(() => new Set(boot?.districts.filter((d) => d.open).map((d) => d.id) ?? [1]), [boot]);
  /** Dinamik (bazadan) narsalar: yopiq tumanlar, loyihalar, admin xaritasi, kengaytirish, bayram. */
  const extras = useMemo(() => {
    const closed = plan.districts.filter((d) => !open.has(d.id)).flatMap((d) => closedDistrictItems(d.rect, d.id));
    const custom = (boot?.objects ?? []).map((o): Item => ({ model: o.m, x: Number(o.x), y: 0, z: Number(o.z), yaw: Number(o.r), sx: Number(o.s), sy: Number(o.s), sz: Number(o.s), wall: '#ffffff', roof: '#ffffff', glow: 0, seed: 0.5 }));
    const expanded = plan.expansions.filter((e) => houses.get(e.plotId)?.expanded).flatMap(expansionItems);
    return new SpatialIndex([...closed, ...custom, ...expanded, ...projectItems(boot?.projects ?? []), ...holidayItems(holidayOf(Date.now()))]);
  }, [plan, open, boot, houses]);
  const commerce = useMemo(() => new SpatialIndex(plan.commerce.map(commerceItem)), [plan]);

  useEffect(() => {
    plotCache.current.clear();
    last.current.x = 1e9;
    world.ground.setState({ openDistricts: open });
  }, [houses, open, extras, world, level]);

  useEffect(() => {
    scene.fog = fog;
    scene.add(world.pools.group, world.ground.group, world.sky.group, world.lake.mesh, world.labels.group, sun, sun.target, hemi);
    return () => {
      scene.remove(world.pools.group, world.ground.group, world.sky.group, world.lake.mesh, world.labels.group, sun, sun.target, hemi);
      world.pools.dispose();
      world.ground.dispose();
      world.labels.dispose();
      world.lake.mesh.geometry.dispose();
      world.lake.mesh.material.dispose();
    };
  }, [scene, world, sun, hemi, fog]);

  useEffect(() => {
    gl.shadowMap.enabled = q.hasShadows;
    sun.castShadow = q.hasShadows;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera;
    c.left = c.bottom = -70;
    c.right = c.top = 70;
    c.far = 320;
    c.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.25;
    world.pools.setShadows(q.hasShadows);
    kit.material.needsUpdate = true;
  }, [q, gl, sun, world, kit]);

  const collect = (fx: number, fz: number, yaw: number): void => {
    const items: Item[] = [];
    const dirX = Math.sin(yaw);
    const dirZ = Math.cos(yaw);
    const boost = director.pose ? 1.5 : 1;
    const near = q.near * boost;
    const mid = q.mid * boost;
    const fogFar = q.fog * boost;
    // Orqadagi uzoq narsalar chizilmaydi (keng burchak bilan).
    const isBehind = (x: number, z: number, d: number): boolean => !director.pose && d > 34 && (x - fx) * dirX + (z - fz) * dirZ < d * -0.1;
    const labels: { d: number; info: LabelInfo }[] = [];

    for (const p of index.plots.query(fx, fz, mid)) {
      const d = Math.hypot(p.x - fx, p.z - fz);
      if (isBehind(p.x, p.z, d)) continue;
      const s = houses.get(p.id);
      if (d < near) {
        let list = plotCache.current.get(p.id);
        if (!list) {
          list = plotItems(p, s, open.has(p.districtId));
          plotCache.current.set(p.id, list);
        }
        items.push(...list);
        if (s?.nick && d < LABEL_RANGE * boost) labels.push({ d, info: labelOf(p, s) });
      } else if (s) items.push(houseItem(p, s, true));
    }
    for (const it of index.statics.query(fx, fz, mid)) pushStatic(items, it, Math.hypot(it.x - fx, it.z - fz), near, mid, isBehind);
    for (const it of extras.query(fx, fz, fogFar)) pushStatic(items, it, Math.hypot(it.x - fx, it.z - fz), near * 1.6, fogFar, isBehind);
    for (const it of commerce.query(fx, fz, fogFar)) if (!isBehind(it.x, it.z, Math.hypot(it.x - fx, it.z - fz))) items.push(it);
    for (const b of plan.buildings) {
      const d = Math.hypot(b.x - fx, b.z - fz);
      if (d < fogFar && !isBehind(b.x, b.z, d - 25)) items.push(buildingItem(b, d > near * 2));
    }
    world.pools.set(items);
    labels.sort((a, b) => a.d - b.d);
    const hero = boot?.hero;
    const heroLabel: LabelInfo[] = hero && Math.hypot(fx, fz + 55) < 70 ? [{ key: 'hero', text: `🏆 ${hero.nick}`, kind: 'gold', badge: null, x: 0, y: 9.4, z: -55 }] : [];
    world.labels.set([...heroLabel, ...labels.slice(0, q.labels).map((l) => l.info)]);
  };

  useFrame(({ clock }) => {
    const now = Date.now();
    const f = focus();
    const weather = weatherOf(now);
    const season = seasonOf(now);
    const light = daylightAt(director.dayFraction ?? dayFraction(now, setting('day_minutes', 24)), weather);
    world.sky.update(light, f.x, f.z);
    world.lake.update(clock.elapsedTime);
    kitUniforms.uNight.value = light.night;
    kitUniforms.uSnow.value = snowAmount(season, weather);
    kitUniforms.uLeaf.value.set(...leafTint(season));
    sun.color.setRGB(light.sunColor[0], light.sunColor[1], light.sunColor[2], 'srgb');
    sun.intensity = light.sunIntensity;
    sun.position.set(f.x + light.sun[0] * 120, light.sun[1] * 120, f.z + light.sun[2] * 120);
    sun.target.position.set(f.x, 0, f.z);
    hemi.intensity = light.ambient * 1.5;
    hemi.color.copy(world.sky.fogColor).lerp(WHITE_COLOR, 0.45);
    const boost = director.pose ? 1.5 : 1;
    fog.color.copy(world.sky.fogColor);
    fog.near = q.fog * 0.25 * boost;
    fog.far = q.fog * boost;
    world.ground.update(f.x, f.z, q.fog * boost, q.hasShadows, director.pose ? 60 : 1);

    const l = last.current;
    const turned = Math.abs(Math.atan2(Math.sin(f.yaw - l.yaw), Math.cos(f.yaw - l.yaw)));
    if (Math.hypot(f.x - l.x, f.z - l.z) > 6 || turned > 0.25) {
      last.current = { x: f.x, z: f.z, yaw: f.yaw, at: now };
      collect(f.x, f.z, f.yaw);
    }
  }, -1);

  return <Ads />;
}

const pushStatic = (out: Item[], it: Item, d: number, near: number, far: number, isBehind: (x: number, z: number, d: number) => boolean): void => {
  if (isBehind(it.x, it.z, d)) return;
  if (d < near || BIG.has(it.model)) out.push(it);
  else if (LODS[it.model] && d < far * 0.75) out.push({ ...it, model: LODS[it.model] ?? it.model });
  else if (it.model === 'barrier' || (it.model === 'street_lamp' && d < near * 1.8)) out.push(it);
};

const labelOf = (p: Plot, s: HouseState): LabelInfo => {
  const [x, z] = toWorld(p, 0, p.d / 2 - 1);
  const size = p.type === 'qasr' ? 1.5 : p.type === 'villa' ? 1.2 : 1;
  return { key: p.id, text: `@${s.nick} · ${s.tier}★`, kind: s.label, badge: s.badge, x, y: padHeight(p) + 4.7 * size, z, size };
};
