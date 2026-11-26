/** Xarita muharriri: faqat bo'sh joylarga, kodsiz. Uchastka va yo'llar qulflangan (PLAN §6). */
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { CENTER_BOXES, CIVIC, LAKE, SITES, boxHitsTilted, civicRect, decodePlan, footprint, type EncodedPlan, type MasterPlan, type Road } from '../../../../packages/shared/src/index.ts';
import { rpc, SITE_URL } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

interface Version { readonly id: number; readonly name: string; readonly status: string; readonly published_at: string | null; readonly count: number }
interface Obj { readonly m: string; readonly x: number; readonly z: number; readonly r: number; readonly s: number }
interface Solid { readonly x: number; readonly z: number; readonly hx: number; readonly hz: number }
interface View { readonly cx: number; readonly cz: number; readonly span: number }

const MODELS: readonly (readonly [string, string])[] = [
  ['tree_round', 'Yumaloq daraxt'], ['tree_wide', 'Keng daraxt'], ['tree_tall', 'Baland daraxt'], ['tree_chinor', 'Chinor'], ['tree_terak', 'Terak'], ['hedge', 'Buta qatori'], ['flower_ring', 'Doira gulzor'], ['tree_archa', 'Archa'], ['tree_anor', 'Anor'], ['bench', "O'rindiq"], ['street_lamp', 'Chiroq'], ['yard_flowers', 'Gulzor'], ['yard_sori', "So'ri"], ['yard_tok', 'Ishkom'], ['water_fountain', 'Favvora'],
  ['special_statue', 'Haykal'], ['special_yurt', "O'tov"], ['choyxona', 'Choyxona'], ['bozor_stall', 'Bozor rastasi'], ['maktab', 'Maktab'], ['billboard', 'Bilbord'], ['car_van', 'Furgon'], ['car_sedan', 'Sedan'], ['crane', 'Kran'], ['foundation', 'Poydevor'], ['barrier', "To'siq"],
];
const SIZE = 900;
const MIN_SPAN = 60;
const MAX_SPAN = 3300;

const solidsOf = (plan: MasterPlan): Solid[] => [
  ...plan.plots.filter((p) => p.unit <= 1).map(footprint), ...plan.expansions.map(footprint), ...plan.commerce.map(footprint), ...CIVIC.map(civicRect),
];
const isFree = (solids: readonly Solid[], roads: readonly Road[], x: number, z: number, s: number): boolean =>
  !solids.some((b) => Math.abs(b.x - x) < b.hx + 0.6 * s && Math.abs(b.z - z) < b.hz + 0.6 * s) && !roads.some((r) => boxHitsTilted(x, z, 0.6 * s, 0.6 * s, r));
const tenth = (v: number): number => Math.round(v * 10) / 10;

const draw = (g: CanvasRenderingContext2D, plan: MasterPlan, objs: readonly Obj[], v: View, selected: number | null): void => {
  const k = SIZE / v.span;
  const X = (x: number): number => (x - v.cx) * k + SIZE / 2;
  const Z = (z: number): number => (z - v.cz) * k + SIZE / 2;
  const box = (b: Solid, color: string): void => {
    g.fillStyle = color;
    g.fillRect(X(b.x - b.hx), Z(b.z - b.hz), b.hx * 2 * k, b.hz * 2 * k);
  };
  g.fillStyle = '#dbe6c4';
  g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = '#8cc3d4';
  g.beginPath();
  g.ellipse(X(LAKE.x), Z(LAKE.z), LAKE.rx * k, LAKE.rz * k, 0, 0, Math.PI * 2);
  g.fill();
  for (const [x0, z0, x1, z1] of [...Object.values(SITES), ...CENTER_BOXES]) box({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hx: (x1 - x0) / 2, hz: (z1 - z0) / 2 }, '#f0dc9a');
  g.fillStyle = '#a9a9a9';
  for (const r of plan.roads) {
    g.save();
    g.translate(X(r.x), Z(r.z));
    g.rotate(r.angle ?? 0);
    g.fillRect((-r.w / 2) * k, (-r.d / 2) * k, r.w * k, r.d * k);
    g.restore();
  }
  for (const c of CIVIC) box(civicRect(c), '#c98a7a');
  for (const p of plan.plots) {
    if (p.unit > 1) continue;
    const f = footprint(p);
    box({ ...f, hx: f.hx - 0.4, hz: f.hz - 0.4 }, '#d9b99b');
  }
  for (const e of plan.expansions) box(footprint(e), '#e5d6ad');
  for (const c of plan.commerce) box(footprint(c), '#7aa7ad');
  objs.forEach((o, i) => {
    g.fillStyle = i === selected ? '#c23b22' : '#1f6f3a';
    g.beginPath();
    g.arc(X(o.x), Z(o.z), Math.max(4, 1.4 * o.s * k), 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#fff';
    g.beginPath();
    g.moveTo(X(o.x), Z(o.z));
    g.lineTo(X(o.x + Math.sin(o.r) * 3 * o.s), Z(o.z + Math.cos(o.r) * 3 * o.s));
    g.stroke();
  });
};

interface EditorProps { readonly plan: MasterPlan; readonly version: Version; readonly onSaved: () => void }
function Editor({ plan, version, onSaved }: EditorProps): React.JSX.Element {
  const ref = useRef<HTMLCanvasElement>(null);
  const [objs, setObjs] = useState<readonly Obj[]>([]);
  const [model, setModel] = useState<string | null>('tree_chinor');
  const [selected, setSelected] = useState<number | null>(null);
  const [view, setView] = useState<View>({ cx: 0, cz: 0, span: 300 });
  const [solids] = useState(() => solidsOf(plan));
  const drag = useRef<{ x: number; z: number; mode: 'pan' | 'move' } | null>(null);
  const { isBusy, run } = useAction();
  const isDraft = version.status === 'draft';
  const zoom = (k: number): void => setView({ ...view, span: Math.max(MIN_SPAN, Math.min(MAX_SPAN, view.span * k)) });

  useEffect(() => {
    let isActive = true;
    rpc<readonly Obj[]>('admin_map_objects', { p_version: version.id }).then(
      (d) => { if (isActive) setObjs(d.map(({ m, x, z, r, s }) => ({ m, x: Number(x), z: Number(z), r: Number(r), s: Number(s) }))); },
      () => undefined,
    );
    return () => { isActive = false; };
  }, [version.id]);
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (g) draw(g, plan, objs, view, selected);
  }, [plan, objs, view, selected]);

  const at = (e: PointerEvent<HTMLCanvasElement>): { x: number; z: number } => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: view.cx + ((e.clientX - r.left) / r.width - 0.5) * view.span, z: view.cz + ((e.clientY - r.top) / r.height - 0.5) * view.span };
  };
  const down = (e: PointerEvent<HTMLCanvasElement>): void => {
    const p = at(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    const hit = objs.findIndex((o) => Math.hypot(o.x - p.x, o.z - p.z) < Math.max(2, view.span / 120));
    if (hit >= 0) {
      setSelected(hit);
      drag.current = { ...p, mode: 'move' };
      return;
    }
    if (!model || !isDraft || e.shiftKey || e.button !== 0) {
      drag.current = { ...p, mode: 'pan' };
      return;
    }
    if (!isFree(solids, plan.roads, p.x, p.z, 1)) return;
    setObjs([...objs, { m: model, x: tenth(p.x), z: tenth(p.z), r: 0, s: 1 }]);
    setSelected(objs.length);
  };
  const move = (e: PointerEvent<HTMLCanvasElement>): void => {
    const d = drag.current;
    if (!d) return;
    const p = at(e);
    if (d.mode === 'pan') {
      setView({ ...view, cx: view.cx + d.x - p.x, cz: view.cz + d.z - p.z });
      return;
    }
    if (selected === null || !isDraft) return;
    setObjs(objs.map((o, i) => (i === selected && isFree(solids, plan.roads, p.x, p.z, o.s) ? { ...o, x: tenth(p.x), z: tenth(p.z) } : o)));
  };
  const patch = (p: Partial<Obj>): void => setObjs(objs.map((o, i) => (i === selected ? { ...o, ...p } : o)));
  const remove = (): void => {
    setObjs(objs.filter((_, i) => i !== selected));
    setSelected(null);
  };
  const cur = selected === null ? undefined : objs[selected];
  return (
    <>
      <div className="row">
        <b>{version.name}</b><span className={`tag ${version.status}`}>{version.status}</span><span className="muted">{objs.length} obyekt</span>
        {isDraft && <Btn kind="main" disabled={isBusy} onClick={() => void run(() => rpc('admin_map_save', { p_version: version.id, p_objects: objs }), 'Saqlandi').then(onSaved)}>Saqlash</Btn>}
        <a className="btn" href={`${SITE_URL}/?xarita=${version.id}`} target="_blank" rel="noopener noreferrer">3D da ko'rish</a>
        <Btn onClick={() => zoom(1 / 1.4)}>＋</Btn><Btn onClick={() => zoom(1.4)}>－</Btn>
        {cur && isDraft && <><Btn onClick={() => patch({ r: cur.r + Math.PI / 8 })}>⟳</Btn><Btn onClick={() => patch({ s: Math.min(4, cur.s * 1.15) })}>Kattaroq</Btn><Btn onClick={() => patch({ s: Math.max(0.3, cur.s / 1.15) })}>Kichikroq</Btn><Btn kind="danger" onClick={remove}>O'chirish</Btn></>}
      </div>
      <p className="muted">Bosish — qo'yish · obyektni sudrash — ko'chirish · Shift+sudrash yoki «Qo'l» — xaritani surish.</p>
      <div className="map-wrap">
        <div className="palette">
          <button type="button" className="btn" aria-pressed={model === null} onClick={() => setModel(null)}>✋ Qo'l</button>
          {MODELS.map(([m, t]) => <button type="button" key={m} className="btn" aria-pressed={m === model} onClick={() => setModel(m)}>{t}</button>)}
        </div>
        <canvas ref={ref} width={SIZE} height={SIZE} onPointerDown={down} onPointerMove={move} onPointerUp={() => { drag.current = null; }} onWheel={(e) => zoom(e.deltaY > 0 ? 1.15 : 1 / 1.15)} aria-label="Xarita" />
      </div>
    </>
  );
}

const loadPlan = async (): Promise<MasterPlan> => decodePlan((await (await fetch('/assets/masterplan.json')).json()) as EncodedPlan);

export function MapEditor(): React.JSX.Element {
  const { data: plan } = useLoad(loadPlan);
  const { data, error, reload } = useLoad(() => rpc<readonly Version[]>('admin_map'));
  const [open, setOpen] = useState<number | null>(null);
  const { isBusy, run } = useAction();
  const current = data?.find((v) => v.id === open);
  const create = (from: number | null): void => {
    const name = prompt('Versiya nomi:', `Xarita ${new Date().toLocaleDateString('ru-RU')}`);
    if (name) void run(async () => setOpen(await rpc<number>('admin_map_create', { p_name: name, p_from: from }))).then(reload);
  };
  const publish = (v: Version): void => {
    if (confirm(v.status === 'archived' ? 'Shu versiyaga qaytilsinmi?' : 'Nashr qilinsinmi?')) void run(() => rpc('admin_map_publish', { p_version: v.id })).then(reload);
  };
  return (
    <>
      <div className="row"><Btn kind="main" disabled={isBusy} onClick={() => create(null)}>Yangi versiya</Btn></div>
      <Table rows={data} error={error} rowKey={(v) => v.id} columns={[
        { head: 'Nomi', cell: (v) => v.name }, { head: 'Holat', cell: (v) => <span className={`tag ${v.status}`}>{v.status}</span> }, { head: 'Obyekt', cell: (v) => v.count }, { head: 'Nashr', cell: (v) => when(v.published_at) },
        { head: '', cell: (v) => <><Btn onClick={() => setOpen(v.id)}>Ochish</Btn><Btn disabled={isBusy} onClick={() => create(v.id)}>Nusxa</Btn>{v.status !== 'published' && <Btn kind="main" disabled={isBusy} onClick={() => publish(v)}>{v.status === 'archived' ? 'Orqaga qaytish' : 'Nashr qilish'}</Btn>}</> },
      ]} />
      {plan && current && <><h3>Muharrir</h3><Editor key={`${current.id}${current.status}`} plan={plan} version={current} onSaved={reload} /></>}
    </>
  );
}
