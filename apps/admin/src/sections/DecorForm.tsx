/** Bezak shakli — 1 sahifa: (1) model rasmlardan, (2) nom uz/ru, (3) kategoriya (joy nuqtalari undan), (4) tanga narxi → level taklifi,
 *  (5) "Qo'shimcha" ichida: zaxira, mavsum, "Yangi" belgisi, to'plam, rang, tartib, premium; (6) do'kon kartasi qanday ko'rinadi → Saqlash. */
import { useState, type FormEvent } from 'react';
import type { DecorSlot } from '../../../../packages/shared/src/index.ts';
import { SLOT_NAMES, levelHint, type DecorRow } from '../decor.ts';
import { rpc, SITE_URL } from '../api.ts';
import { Btn, useAction } from '../ui.tsx';

export const imageOf = (model: string): string => `${SITE_URL}/assets/decor/${model}.webp`;

interface Draft {
  id: string; model_id: string; name_uz: string; name_ru: string; slot: DecorSlot; price_coins: number; price_uzs: number; level: number | 'auto';
  stock: number | null; season_from: string | null; season_to: string | null; set_id: string | null; is_new: boolean; tint: string | null; sort: number; is_premium: boolean;
}
const toDraft = (r: DecorRow | null): Draft => (r
  ? { id: r.id, model_id: r.model_id, name_uz: r.name_uz, name_ru: r.name_ru, slot: r.slot, price_coins: r.price_coins, price_uzs: r.price_uzs, level: r.level_auto ? 'auto' : r.min_level,
    stock: r.stock, season_from: r.season_from, season_to: r.season_to, set_id: r.set_id, is_new: r.is_new, tint: r.tint, sort: r.sort, is_premium: r.is_premium }
  : { id: '', model_id: '', name_uz: '', name_ru: '', slot: 'yard', price_coins: 100, price_uzs: 0, level: 'auto', stock: null, season_from: null, season_to: null, set_id: null, is_new: true, tint: null, sort: 500, is_premium: false });
/** ID nomdan: "Yangi skameyka" → "yangi_skameyka". */
const idOf = (name: string): string => name.toLowerCase().replace(/[‘’'`ʻ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);

interface FormProps { readonly row: DecorRow | null; readonly models: readonly string[]; readonly onDone: () => void; readonly onCancel: () => void }
export function DecorForm({ row, models, onDone, onCancel }: FormProps): React.JSX.Element {
  const isNew = row === null;
  const { isBusy, run } = useAction();
  const [f, setF] = useState<Draft>(toDraft(row));
  const [isMore, setMore] = useState(false);
  const set = (patch: Partial<Draft>): void => setF({ ...f, ...patch });
  const id = isNew ? f.id || idOf(f.name_uz) : f.id;
  const hint = levelHint(f.price_coins, id, f.slot);
  const level = f.level === 'auto' ? hint : f.level;
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const p = {
      id, model_id: f.model_id, name_uz: f.name_uz, name_ru: f.name_ru, slot: f.slot, price_coins: f.price_coins, price_uzs: f.price_uzs, stock: f.stock, season_from: f.season_from ?? '', season_to: f.season_to ?? '',
      set_id: f.set_id ?? '', is_new: f.is_new, tint: f.tint ?? '', sort: f.sort, is_premium: f.is_premium, ...(f.level === 'auto' ? { level_auto: true } : { min_level: f.level }),
    };
    void run(() => rpc('admin_decor_save', { p }), 'Saqlandi').then((ok) => ok && onDone());
  };
  return (
    <form className="card decor-page" onSubmit={submit} aria-label={isNew ? 'Yangi tovar' : 'Tovarni tahrirlash'}>
      <h3>{isNew ? 'Yangi tovar' : `Tahrirlash: ${row.name_uz}`}</h3>
      <div className="decor-cols">
        <div className="decor-main">
          <p className="step">1. Model{!isNew && ' (o‘zgarmaydi)'}</p>
          <div className="model-grid" role="radiogroup" aria-label="3D model">
            {(isNew ? models : [f.model_id]).map((m) => (
              <button type="button" key={m} role="radio" aria-checked={f.model_id === m} title={m} disabled={!isNew} onClick={() => set({ model_id: m })}><img src={imageOf(m)} alt={m} loading="lazy" /><small>{m}</small></button>
            ))}
          </div>
          <p className="muted small">Yangi 3D model Blender'dan <code>npm run models</code> bilan qo'shiladi.</p>
          <p className="step">2. Nomi</p>
          <div className="row">
            <label className="field">O'zbekcha<input className="input" value={f.name_uz} maxLength={40} onChange={(e) => set({ name_uz: e.target.value })} required /></label>
            <label className="field">Ruscha<input className="input" value={f.name_ru} maxLength={40} onChange={(e) => set({ name_ru: e.target.value })} required /></label>
          </div>
          <p className="step">3. Kategoriya</p>
          <label className="field">Kategoriya (joy nuqtalari shundan)<select className="input" value={f.slot} onChange={(e) => set({ slot: e.target.value as DecorSlot })}>{Object.entries(SLOT_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <p className="step">4. Narx va level</p>
          <div className="row">
            <label className="field">Tanga narxi<input className="input" type="number" min={0} max={1000000} value={f.price_coins} onChange={(e) => set({ price_coins: Number(e.target.value) })} required /></label>
            <label className="field">Level<select className="input" value={String(f.level)} onChange={(e) => set({ level: e.target.value === 'auto' ? 'auto' : Number(e.target.value) })}>
              <option value="auto">Avto ({hint}-level)</option>{[1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>{l}-level</option>)}
            </select></label>
          </div>
          <button type="button" className="link" aria-expanded={isMore} onClick={() => setMore(!isMore)}>{isMore ? '▾' : '▸'} Qo'shimcha (ixtiyoriy)</button>
          {isMore && (
            <div className="row more">
              {isNew && <label className="field">ID<input className="input" value={f.id} placeholder={idOf(f.name_uz)} pattern="[a-z0-9_]{3,40}" onChange={(e) => set({ id: e.target.value })} /></label>}
              <label className="field">Jami soni (bo'sh = cheksiz)<input className="input" type="number" min={1} value={f.stock ?? ''} onChange={(e) => set({ stock: e.target.value ? Number(e.target.value) : null })} /></label>
              <label className="field">Mavsum boshi<input className="input" type="date" value={f.season_from ?? ''} onChange={(e) => set({ season_from: e.target.value || null })} /></label>
              <label className="field">Mavsum oxiri<input className="input" type="date" value={f.season_to ?? ''} onChange={(e) => set({ season_to: e.target.value || null })} /></label>
              <label className="field">To'plam ID<input className="input" value={f.set_id ?? ''} onChange={(e) => set({ set_id: e.target.value || null })} /></label>
              <label className="field">Rang (bo'sh = asl)<input className="input" value={f.tint ?? ''} placeholder="#c98f6b" pattern="#[0-9a-fA-F]{6}" onChange={(e) => set({ tint: e.target.value || null })} /></label>
              <label className="field">Tartib raqami<input className="input" type="number" value={f.sort} onChange={(e) => set({ sort: Number(e.target.value) })} /></label>
              <label><input type="checkbox" checked={f.is_new} onChange={(e) => set({ is_new: e.target.checked })} /> «Yangi» belgisi</label>
              <label><input type="checkbox" checked={f.is_premium} onChange={(e) => set({ is_premium: e.target.checked })} /> Premium (faqat Stars bilan)</label>
              {f.is_premium && <label className="field">Premium narxi (so'm, Stars shundan)<input className="input" type="number" min={0} value={f.price_uzs} onChange={(e) => set({ price_uzs: Number(e.target.value) })} /></label>}
            </div>
          )}
        </div>
        <aside className="decor-preview" aria-label="Do'konda shunday ko'rinadi">
          <p className="step">5. Do'konda shunday ko'rinadi</p>
          <div className="shop-card">
            {f.is_new && <i>YANGI</i>}
            <span className="frame">{f.model_id ? <img src={imageOf(f.model_id)} alt="" /> : <span className="muted">model tanlang</span>}</span>
            <b>{f.name_uz || 'Nomi'}</b>
            <span className="cost">{f.price_coins.toLocaleString('ru-RU')} tanga</span>
            <small className="muted">{level}-leveldan · {SLOT_NAMES[f.slot]}</small>
          </div>
          <Btn kind="main" type="submit" disabled={isBusy || !f.model_id || !id}>Saqlash</Btn>
          <Btn onClick={onCancel}>Bekor</Btn>
        </aside>
      </div>
    </form>
  );
}
