/** Bezaklar katalogi: qo'shish, tahrirlash, yashirish. Yangi 3D model kod orqali qo'shiladi, bu yerda faqat mavjud modeldan tovar yaratiladi. */
import { useState, type FormEvent } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad } from '../ui.tsx';

interface Row {
  readonly id: string; readonly slot: string; readonly model_id: string; readonly name_uz: string; readonly name_ru: string; readonly price_uzs: number; readonly price_coins: number; readonly stock: number | null; readonly sold: number;
  readonly min_level: number; readonly season_from: string | null; readonly season_to: string | null; readonly set_id: string | null; readonly is_new: boolean; readonly is_active: boolean; readonly tint: string | null; readonly sort: number;
  /** Faqat pulga (do'konning Premium bo'limi), tangaga sotilmaydi, level cheklovisiz. */
  readonly is_premium: boolean;
}
const EMPTY = { id: '', model_id: '', name_uz: '', name_ru: '', price_uzs: 0, price_coins: 0, stock: null, min_level: 1, season_from: null, season_to: null, set_id: null, is_new: true, tint: null, sort: 0, is_premium: false } as const;
type Draft = Pick<Row, keyof typeof EMPTY>;

interface EditorProps { readonly draft: Draft; readonly isNew: boolean; readonly models: readonly string[]; readonly onDone: () => void; readonly onCancel: () => void }
function Editor({ draft, isNew, models, onDone, onCancel }: EditorProps): React.JSX.Element {
  const { isBusy, run } = useAction();
  const [form, setForm] = useState<Draft>(draft);
  const set = (patch: Partial<Draft>): void => setForm({ ...form, ...patch });
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(() => rpc('admin_decor_save', { p: form }), 'Saqlandi').then((ok) => ok && onDone());
  };
  const number = (key: 'price_uzs' | 'price_coins' | 'min_level' | 'sort', label: string, max = 1e9): React.JSX.Element =>
    <label className="field">{label}<input className="input" type="number" min={key === 'min_level' ? 1 : 0} max={max} value={form[key]} onChange={(e) => set({ [key]: Number(e.target.value) })} required /></label>;
  const date = (key: 'season_from' | 'season_to', label: string): React.JSX.Element =>
    <label className="field">{label}<input className="input" type="date" value={form[key] ?? ''} onChange={(e) => set({ [key]: e.target.value || null })} /></label>;
  return (
    <form className="card decor-form" onSubmit={submit}>
      <label className="field">ID<input className="input" value={form.id} disabled={!isNew} pattern="[a-z0-9_]{3,40}" onChange={(e) => set({ id: e.target.value })} required /></label>
      <label className="field">3D model<select className="input" value={form.model_id} disabled={!isNew} onChange={(e) => set({ model_id: e.target.value })} required><option value="" disabled>Tanlang</option>{models.map((m) => <option key={m}>{m}</option>)}</select></label>
      <label className="field">Nomi (uz)<input className="input" value={form.name_uz} maxLength={40} onChange={(e) => set({ name_uz: e.target.value })} required /></label>
      <label className="field">Nomi (ru)<input className="input" value={form.name_ru} maxLength={40} onChange={(e) => set({ name_ru: e.target.value })} required /></label>
      {number('price_uzs', "Narx (so'm)")}{number('price_coins', 'Narx (tanga)')}{number('min_level', 'Qaysi leveldan', 5)}{number('sort', 'Tartib raqami')}
      <label className="field">Jami soni (bo'sh = cheksiz)<input className="input" type="number" min={1} value={form.stock ?? ''} onChange={(e) => set({ stock: e.target.value ? Number(e.target.value) : null })} /></label>
      {date('season_from', 'Mavsum boshi (har yili)')}{date('season_to', 'Mavsum oxiri')}
      <label className="field">To'plam ID<input className="input" value={form.set_id ?? ''} onChange={(e) => set({ set_id: e.target.value || null })} /></label>
      <label className="field">Rang (bo'sh = asl)<input className="input" value={form.tint ?? ''} placeholder="#c98f6b" pattern="#[0-9a-fA-F]{6}" onChange={(e) => set({ tint: e.target.value || null })} /></label>
      <label><input type="checkbox" checked={form.is_new} onChange={(e) => set({ is_new: e.target.checked })} /> «Yangi» belgisi</label>
      <label><input type="checkbox" checked={form.is_premium} onChange={(e) => set({ is_premium: e.target.checked })} /> Premium (faqat pulga: so‘m yoki Stars ≥ 50)</label>
      <div><Btn kind="main" type="submit" disabled={isBusy}>Saqlash</Btn><Btn onClick={onCancel}>Bekor</Btn></div>
    </form>
  );
}

export function Catalog(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly Row[]>('admin_catalog'));
  const { isBusy, run } = useAction();
  const [editing, setEditing] = useState<{ readonly draft: Draft; readonly isNew: boolean } | null>(null);
  const models = [...new Set((data ?? []).map((r) => r.model_id))].sort((a, b) => a.localeCompare(b));
  const close = (): void => setEditing(null);
  const toggle = (r: Row): void => { void run(() => rpc('admin_decor_save', { p: { id: r.id, is_active: !r.is_active } })).then(reload); };
  return (
    <>
      {editing
        ? <Editor key={editing.draft.id || 'yangi'} draft={editing.draft} isNew={editing.isNew} models={models} onCancel={close} onDone={() => { close(); void reload(); }} />
        : <p><Btn kind="main" onClick={() => setEditing({ draft: EMPTY, isNew: true })}>+ Yangi tovar</Btn></p>}
      <Table rows={data} error={error} rowKey={(c) => c.id} columns={[
        { head: 'Bezak', cell: (c) => <><b>{c.name_uz}</b>{c.is_new && <span className="tag">Yangi</span>}{c.is_premium && <span className="tag">Premium</span>}<br /><span className="muted">{c.id}{c.model_id === c.id ? '' : ` · ${c.model_id}`}</span></> },
        { head: "So'm", cell: (c) => c.price_uzs }, { head: 'Tanga', cell: (c) => c.price_coins }, { head: 'Level', cell: (c) => `${c.min_level}+` },
        { head: 'Zaxira', cell: (c) => (c.stock === null ? '∞' : `${c.stock - c.sold} / ${c.stock}`) }, { head: 'Sotilgan', cell: (c) => c.sold },
        { head: 'Mavsum', cell: (c) => (c.season_from && c.season_to ? `${c.season_from.slice(5)} – ${c.season_to.slice(5)}` : '') },
        { head: '', cell: (c) => <><Btn disabled={isBusy} onClick={() => setEditing({ draft: c, isNew: false })}>Tahrirlash</Btn><Btn disabled={isBusy || !c.is_active} onClick={() => { if (confirm(`«${c.name_uz}» haqida Telegram xabari yuborilsinmi?`)) void run(() => rpc('admin_decor_announce', { p_id: c.id }), 'Navbatga qo‘yildi'); }}>📣</Btn><Btn disabled={isBusy} kind={c.is_active ? 'danger' : 'main'} onClick={() => toggle(c)}>{c.is_active ? 'Yashirish' : "Ko'rsatish"}</Btn></> },
      ]} />
      <Sets />
    </>
  );
}

interface SetRow { readonly id: string; readonly name_uz: string; readonly name_ru: string; readonly discount_pct: number; readonly is_active: boolean }
/** To'plam tarkibi bezakning «To'plam ID» maydonida belgilanadi. */
function Sets(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly SetRow[]>('admin_sets'));
  const { isBusy, run } = useAction();
  const save = (s: SetRow): void => { void run(() => rpc('admin_set_save', { p_id: s.id, p_uz: s.name_uz, p_ru: s.name_ru, p_discount: s.discount_pct, p_active: s.is_active })).then(reload); };
  const edit = (s: SetRow): void => {
    const discount = Number(prompt('Chegirma, %', String(s.discount_pct)));
    if (Number.isInteger(discount) && discount >= 0 && discount <= 80) save({ ...s, discount_pct: discount });
  };
  const create = (): void => {
    const id = prompt('To‘plam ID (lotin harf, raqam, _)')?.trim();
    const uz = id && prompt('Nomi (uz)');
    const ru = uz && prompt('Nomi (ru)');
    if (id && uz && ru) save({ id, name_uz: uz, name_ru: ru, discount_pct: 15, is_active: true });
  };
  return (
    <>
      <h3>To‘plamlar</h3>
      <p><Btn onClick={create}>+ Yangi to‘plam</Btn></p>
      <Table rows={data} error={error} rowKey={(s) => s.id} columns={[
        { head: 'To‘plam', cell: (s) => <><b>{s.name_uz}</b><br /><span className="muted">{s.id}</span></> }, { head: 'Chegirma', cell: (s) => <Btn disabled={isBusy} onClick={() => edit(s)}>{s.discount_pct}%</Btn> },
        { head: '', cell: (s) => <Btn disabled={isBusy} kind={s.is_active ? 'danger' : 'main'} onClick={() => save({ ...s, is_active: !s.is_active })}>{s.is_active ? 'Yashirish' : 'Ko‘rsatish'}</Btn> },
      ]} />
    </>
  );
}
