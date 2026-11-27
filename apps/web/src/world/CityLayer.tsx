import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, DirectionalLight, Fog, HemisphereLight, PerspectiveCamera } from 'three';
import { SpatialIndex, dayFraction, holidayOf, seasonOf, weatherOf, type MasterPlan } from '../../../../packages/shared/src/index.ts';
import { daylightAt, leafTint, snowAmount } from '../logic/atmosphere.ts';
import { PHOTO_NIGHT_GLOW, lightOf } from '../logic/photo.ts';
import type { Item } from '../logic/item.ts';
import { HERO_SPOT, holidayItems } from '../logic/landscape.ts';
import { constructionItems, freshHouse, BUILD_MS } from '../logic/construction.ts';
import { commerceItem, expansionItems, projectItems, type HouseState } from '../logic/placement.ts';
import { QUALITY } from '../logic/quality.ts';
import { closedDistrictItems } from '../logic/streets.ts';
import { HIGH_ALTITUDE, cityView, groundView, type View } from '../logic/view.ts';
import { worldIndex } from '../logic/worldIndex.ts';
import { camera as cam, city, director, here, session } from '../app/runtime.ts';
import { getApp, setting, useApp, type Preview } from '../app/store.ts';
import { Ads } from './Ads.tsx';
import { collect, type CollectSource, type NickCandidate } from './collect.ts';
import { FAR_CHUNK, Ground } from './ground.ts';
import { kitUniforms, type Kit } from './kit.ts';
import { Labels, type LabelInfo } from './labels.ts';
import { FarNicks } from './nicks.ts';
import { placeLabels } from './placeLabels.ts';
import { labelPx } from '../logic/declutter.ts';
import { POND, STADIUM } from '../logic/paving.ts';
/** Loyiha joylari bosh rejadagi mavjud joylarda (qulfga tegilmaydi): stadion — o'z joyi, bog' — hovuz yonida. */
const PROJECT_SPOTS: Readonly<Partial<Record<'bog' | 'stadion' | 'koprik', { readonly x: number; readonly z: number }>>> = { stadion: STADIUM, bog: { x: POND.x, z: POND.z + POND.r + 12 } };
import { Beacons, Markers, Selection, activeBeacons, activeMarkers } from './markers.ts';
import { showClaimMarks, waitingPlots } from '../logic/lively.ts';
import { Pools } from './pools.ts';
import { Boards, Signs } from './signs.ts';
import { Lake, Sky } from './sky.ts';

const WHITE_COLOR = new Color('#ffffff');
const VIDEO_BOOST = 1.5;
const VIDEO_CHUNKS = 60;
const HERO_RANGE = 70;
const NOWHERE = 1e9;
const STEP = { ground: { move: 6, turn: 0.25 }, city: { move: 6, turn: 0.12, perHeight: 0.09, height: 0.12 } } as const;

interface Last { readonly x: number; readonly z: number; readonly yaw: number; readonly height: number; readonly mode: string }
const FRESH: Last = { x: NOWHERE, z: NOWHERE, yaw: 0, height: 0, mode: '' };
/** Yorliqlarni ekranga qayta joylash oralig'i (s). */
const PLACE_S = 0.12;
const angleBetween = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

/** Hozirgi ko'rinish holati: nimaga qarab qayta yig'ish kerakligi shundan bilinadi. */
const snapshot = (): Last => {
  const p = director.pose;
  if (p) return { x: p.x + (p.tx - p.x) * 0.5, z: p.z + (p.tz - p.z) * 0.5, yaw: Math.atan2(p.tx - p.x, p.tz - p.z), height: 0, mode: 'video' };
  if (session.mode === 'city') return { x: city.view.x, z: city.view.z, yaw: city.view.yaw, height: city.view.height, mode: 'city' };
  const at = here();
  return { x: at.x, z: at.z, yaw: cam.yaw + Math.PI, height: 0, mode: session.mode };
};
const isStale = (a: Last, b: Last): boolean => {
  const moved = Math.hypot(a.x - b.x, a.z - b.z);
  const turned = angleBetween(a.yaw, b.yaw);
  if (a.mode !== b.mode) return true;
  if (b.mode !== 'city') return moved > STEP.ground.move || turned > STEP.ground.turn;
  return moved > Math.max(STEP.city.move, b.height * STEP.city.perHeight) || turned > STEP.city.turn || Math.abs(a.height - b.height) > b.height * STEP.city.height;
};

/** Sinab ko'rilayotgan bezak faqat shu ekranda ko'rinadi. */
const withPreview = (houses: ReadonlyMap<string, HouseState>, preview: Preview | null): ReadonlyMap<string, HouseState> => {
  const h = preview ? houses.get(preview.plot) : undefined;
  if (!preview || !h) return houses;
  const decor = [...h.decor.filter((x) => !x.startsWith(`${preview.anchor}:`)), `${preview.anchor}:${preview.decor}`];
  return new Map(houses).set(preview.plot, { ...h, decor });
};

const without = (houses: ReadonlyMap<string, HouseState>, plot: string | null): ReadonlyMap<string, HouseState> =>
  (plot && houses.has(plot) ? new Map([...houses].filter(([id]) => id !== plot)) : houses);

interface CityLayerProps { readonly kit: Kit; readonly plan: MasterPlan }

export function CityLayer({ kit, plan }: CityLayerProps): React.JSX.Element {
  const { scene, gl, size, camera } = useThree();
  const profile = useApp((s) => s.profile);
  const mine = useMemo(() => new Set((profile?.plots ?? []).map((p) => p.plot)), [profile]);
  const level = useApp((s) => s.quality);
  const saved = useApp((s) => s.houses);
  const preview = useApp((s) => s.preview);
  const building = useApp((s) => s.building);
  const lang = useApp((s) => s.lang);
  /** Qurilayotgan uy effekt tugaguncha oddiy ro'yxatda ko'rinmaydi. */
  const houses = useMemo(() => without(withPreview(saved, preview), building?.plot ?? null), [saved, preview, building]);
  const authState = useApp((s) => s.authState);
  const boot = useApp((s) => s.boot);
  const catalog = useApp((s) => s.catalog);
  const q = QUALITY[level];
  const index = useMemo(() => worldIndex(plan), [plan]);

  const world = useMemo(() => ({
    pools: new Pools(kit), ground: new Ground(plan, { openDistricts: new Set() }), farGround: new Ground(plan, { openDistricts: new Set() }, { chunk: FAR_CHUNK, hasTop: false }), sky: new Sky(), lake: new Lake(), labels: new Labels(), nicks: new FarNicks(), signs: new Signs(), boards: new Boards(), markers: new Markers(), selection: new Selection(), works: new Pools(kit), beacons: new Beacons(),
  }), [kit, plan]);
  const sun = useMemo(() => new DirectionalLight('#fff', 2), []);
  const hemi = useMemo(() => new HemisphereLight('#fff', '#c9d6b4', 1), []);
  const fog = useMemo(() => new Fog('#cde', 40, 400), []);
  const last = useRef<Last>(FRESH);
  const pending = useRef<{ readonly fixed: readonly LabelInfo[]; readonly detail: readonly LabelInfo[]; readonly nicks: readonly NickCandidate[] } | null>(null);
  const placedAt = useRef(0);
  const placedCam = useRef('');
  const caches = useRef({ full: new Map<string, readonly Item[]>(), simple: new Map<string, Item>() });

  const open = useMemo(() => new Set(boot?.districts.filter((d) => d.open).map((d) => d.id) ?? [1]), [boot]);
  /** Dinamik (bazadan) narsalar: yopiq tumanlar, loyihalar, admin xaritasi, kengaytirish, bayram. */
  const extras = useMemo(() => {
    const closed = plan.districts.filter((d) => !open.has(d.id)).flatMap((d) => closedDistrictItems(plan, d.id));
    const custom = (boot?.objects ?? []).map((o): Item => ({ model: o.m, x: Number(o.x), y: 0, z: Number(o.z), yaw: Number(o.r), sx: Number(o.s), sy: Number(o.s), sz: Number(o.s), wall: '#ffffff', roof: '#ffffff', glow: 0, seed: 0.5 }));
    const expanded = plan.expansions.filter((e) => houses.get(e.plotId)?.expanded).flatMap(expansionItems);
    return new SpatialIndex([...closed, ...custom, ...expanded, ...projectItems(boot?.projects ?? []), ...holidayItems(holidayOf(Date.now()))]);
  }, [plan, open, boot, houses]);
  const commerce = useMemo(() => new SpatialIndex(plan.commerce.map(commerceItem)), [plan]);

  useEffect(() => {
    caches.current.full.clear();
    caches.current.simple.clear();
    last.current = FRESH;
    world.ground.setState({ openDistricts: open });
    world.farGround.setState({ openDistricts: open });
  }, [houses, open, extras, world, level, catalog, mine, profile?.free_used, profile?.plots.length, authState]);
  useEffect(() => { world.boards.setLang(lang); }, [lang, world]);
  /** Bo'sh shahar: markazga eng yaqin ~20 bo'sh joy (uy olinganda qayta hisoblanadi). */
  useEffect(() => { world.beacons.set(waitingPlots(plan.plots, saved, open)); }, [plan, saved, open, world]);
  /** Oynasi ochiq bo'sh joy sariq ramkada. */
  const chosen = useApp((s) => (s.panel?.kind === 'plot' && !s.houses.has(s.panel.id) && showClaimMarks(s.authState, s.profile) ? s.panel.id : null));
  useEffect(() => { world.selection.set((chosen && index.plots ? getApp().plotById.get(chosen) : null) ?? null); }, [chosen, world, index]);

  useEffect(() => {
    scene.fog = fog;
    const parts = [world.pools.group, world.ground.group, world.farGround.group, world.sky.group, world.lake.mesh, world.labels.group, world.nicks.mesh, world.signs.group, world.boards.mesh, world.markers.points, world.beacons.points, world.selection.group, world.works.group, sun, sun.target, hemi];
    scene.add(...parts);
    activeMarkers.current = world.markers;
    activeBeacons.current = world.beacons;
    return () => {
      scene.remove(...parts);
      world.pools.dispose();
      world.ground.dispose();
      world.farGround.dispose();
      world.labels.dispose();
      world.nicks.dispose();
      world.beacons.dispose();
      world.signs.dispose();
      world.boards.dispose();
      activeMarkers.current = null;
      activeBeacons.current = null;
      world.markers.dispose();
      world.selection.dispose();
      world.works.dispose();
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
    world.works.setShadows(q.hasShadows);
    kit.material.needsUpdate = true;
  }, [q, gl, sun, world, kit]);

  const currentView = (s: Last): View => {
    if (s.mode === 'city') {
      const vfov = size.height > size.width ? 70 : 58;
      return cityView(city.view, q, Math.atan(Math.tan((vfov * Math.PI) / 360) * (size.width / Math.max(1, size.height))));
    }
    return groundView({ x: s.x, z: s.z, yaw: s.yaw, quality: q, boost: director.pose ? VIDEO_BOOST : 1, isVideo: director.pose !== null });
  };

  const refresh = (v: View): void => {
    const src: CollectSource = { plots: index.plots, statics: index.statics, extras, commerce, plan, houses, open, building: building?.plot ?? null, mine, ...caches.current };
    const { items, labels, nicks, signs, boards, free } = collect(v, src, q.labels);
    world.pools.set(items);
    world.signs.set(signs);
    world.boards.set(boards);
    // Uyi bor odamga (admin ham) "+" umuman chizilmaydi.
    world.markers.set(showClaimMarks(getApp().authState, getApp().profile) ? free : []);
    const hero = boot?.hero;
    const heroLabel: LabelInfo[] = hero && Math.hypot(v.x - HERO_SPOT.x, v.z - HERO_SPOT.z) < HERO_RANGE ? [{ key: 'hero', text: hero.nick, kind: 'gold', badge: null, icon: 'rank', x: HERO_SPOT.x, y: 9.4, z: HERO_SPOT.z }] : [];
    // Shahar loyihalari joyida taxta: "Stadion · 34%" (ko'prik uchun joy hali yo'q).
    const works: LabelInfo[] = (boot?.projects ?? []).flatMap((p) => {
      const at = PROJECT_SPOTS[p.kind];
      if (!at || Math.hypot(v.x - at.x, v.z - at.z) > HERO_RANGE * 3) return [];
      const pct = Math.min(100, Math.floor((p.raised / Math.max(1, p.goal)) * 100));
      return [{ key: `work-${p.id}`, text: `${p.uz} · ${p.status === 'done' ? '100%' : `${pct}%`}`, kind: p.status === 'done' ? 'gold' : 'plain', badge: null, icon: 'bank', x: at.x, y: 12, z: at.z, size: 1.6 } satisfies LabelInfo];
    });
    // Ekranga joylash kameraga bog'liq — `placeNow` (kadrlarda, tez-tez emas) yangi kamera bilan qiladi.
    pending.current = { fixed: [...heroLabel, ...works], detail: labels, nicks };
    placedAt.current = 0;
    placedCam.current = '';
  };

  /** Yaqinda (≤ 60 m) yorliq katta (~18 px matn), uzoqlashgan sari kichrayadi, lekin ~10 px dan kichik emas.
   *  Hamma egali uylarning niki: yaqindagilar batafsil, qolgani bitta qatlamda; ustma-ust tushsa uzoqrog'i yashiriladi. */
  const placeNow = (): void => {
    const p = pending.current;
    if (!p) return;
    camera.updateMatrixWorld();
    // Kamera qimirlamagan va yangi ro'yxat yo'q — qayta joylash shart emas.
    const key = camera.matrixWorld.elements.map((x) => x.toFixed(2)).join(',') + `|${size.width}x${size.height}`;
    if (key === placedCam.current) return;
    placedCam.current = key;
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 60;
    const perPx = (2 * Math.tan((fov * Math.PI) / 360)) / Math.max(1, size.height);
    const at = camera.position;
    const placed = placeLabels(p.fixed, p.detail, p.nicks, camera, size, world.nicks);
    world.labels.set(placed.detail, (x, y, z) => { const d = Math.hypot(x - at.x, y - at.y, z - at.z); return labelPx(d) * perPx * d; });
    world.nicks.set(placed.far, size);
  };

  const updateGround = (v: View, isHigh: boolean): void => {
    world.ground.group.visible = !isHigh;
    world.farGround.group.visible = isHigh;
    const ground = isHigh ? world.farGround : world.ground;
    ground.update(v.x, v.z, Math.min(v.radius, v.fogFar), q.hasShadows && !isHigh, director.pose ? VIDEO_CHUNKS : isHigh ? 1 : 2);
  };

  const updateLight = (x: number, z: number, isHigh: boolean, seconds: number): void => {
    const now = Date.now();
    const weather = weatherOf(now);
    const season = seasonOf(now);
    // Foto rejimida tanlangan yorug'lik (oltin soat / tun); chiqqanda — o'yindagi vaqt.
    const app = getApp();
    const forced = app.isPhoto && director.pose === null ? lightOf(app.photo.light) : null;
    const light = forced ?? daylightAt(director.dayFraction ?? dayFraction(now, setting('day_minutes', 24)), weather);
    world.sky.update(light, x, z);
    world.lake.update(seconds);
    // Tungi Foto kadrida derazalar va chiroqlar yorqinroq (umumiy yorqinlik pasaytirilgani uchun).
    kitUniforms.uNight.value = light.night * (forced && app.photo.light === 'night' ? PHOTO_NIGHT_GLOW : 1);
    world.boards.setNight(light.night);
    kitUniforms.uSnow.value = snowAmount(season, weather);
    kitUniforms.uLeaf.value.set(...leafTint(season));
    sun.castShadow = q.hasShadows && !isHigh;
    sun.color.setRGB(light.sunColor[0], light.sunColor[1], light.sunColor[2], 'srgb');
    sun.intensity = light.sunIntensity;
    sun.position.set(x + light.sun[0] * 120, light.sun[1] * 120, z + light.sun[2] * 120);
    sun.target.position.set(x, 0, z);
    hemi.intensity = light.ambient * 1.5;
    hemi.color.copy(world.sky.fogColor).lerp(WHITE_COLOR, 0.45);
    fog.color.copy(world.sky.fogColor);
  };

  const isWorking = useRef(false);
  const updateWorks = (): void => {
    const plot = building ? plan.plots.find((p) => p.id === building.plot) : undefined;
    if (!building || !plot) {
      if (isWorking.current) world.works.set([]);
      isWorking.current = false;
      return;
    }
    isWorking.current = true;
    world.works.set(constructionItems(plot, saved.get(plot.id) ?? freshHouse(plot.id), (performance.now() - building.at) / BUILD_MS));
  };

  useFrame(({ clock }) => {
    const s = snapshot();
    const isHigh = s.mode === 'city' && s.height > HIGH_ALTITUDE;
    const v = currentView(s);
    updateLight(s.x, s.z, isHigh, clock.elapsedTime);
    fog.near = v.fogNear;
    fog.far = v.fogFar;
    updateGround(v, isHigh);
    updateWorks();
    const app = getApp();
    // Oyna ochiq bo'lsa yorliqlar xira (panel ostida xalaqit bermasin).
    const dim = app.panel !== null ? 0.4 : 1;
    world.nicks.setOpacity(dim);
    world.labels.setOpacity(dim);
    // Tungi Foto kadrida yorliqlar yashirin (bloom ularni oq dog'ga aylantiradi); nik kadr belgisida yoziladi.
    const isNightPhoto = app.isPhoto && director.pose === null && app.photo.light === 'night';
    world.labels.group.visible = !isNightPhoto;
    world.nicks.mesh.visible = !isNightPhoto && world.nicks.mesh.geometry.instanceCount > 0;
    const canClaim = showClaimMarks(app.authState, app.profile);
    world.markers.setVisible(canClaim && s.mode === 'city' && !isHigh && !app.isPhoto && !app.isClean);
    world.beacons.update(canClaim && !app.isPhoto && !app.isClean && setting('lively_start', true), clock.elapsedTime);
    // Yorliqlar ekranga ~8 marta/soniya qayta joylanadi (kamera yursa ham ustma-ust tushmasin).
    if (clock.elapsedTime - placedAt.current > PLACE_S) {
      placedAt.current = clock.elapsedTime;
      placeNow();
    }
    if (!isStale(last.current, s)) return;
    last.current = s;
    refresh(v);
  }, -1);

  return <Ads />;
}
