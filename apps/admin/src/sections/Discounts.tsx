/** Chegirmalar: belgilangan tovarlarga foiz (5–90) + boshlanish va tugash (Toshkent vaqti). Narx serverda hisoblanadi, muddat tugasa — eski narx. */
import { useState, type FormEvent } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';
import { tashkentIso, tashkentLocal } from '../decor.ts';

interface FormProps { readonly ids: readonly string[]; readonly names: string; readonly onDone: () => void; readonly onCancel: () => void }
export function DiscountForm({ ids, names, onDone, onCancel }: FormProps): React.JSX.Element {
  const { isBusy, run } = useAction();
  const [pct, setPct] = useState(20);
  const [starts, setStarts] = useState(tashkentLocal(0));
  const [ends, setEnds] = useState(tashkentLocal(72));
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    void run(() => rpc('admin_discount_set', { p_ids: ids, p_pct: pct, p_starts: tashkentIso(starts), p_ends: tashkentIso(ends) }), 'Chegirma qo‘yildi').then((ok) => ok && onDone());
  };
  return (
    <form className="card discount-form" onSubmit={submit} aria-label="Chegirma qo'yish">
      <b>Chegirma: {names}</b>
      <div className="row">
        <label className="field">Chegirma, %<input className="input" type="number" min={5} max={90} value={pct} onChange={(e) => setPct(Number(e.target.value))} required /></label>
        <label className="field">Boshlanishi (Toshkent)<input className="input" type="datetime-local" value={starts} onChange={(e) => setStarts(e.target.value)} required /></label>
        <label className="field">Tugashi (Toshkent)<input className="input" type="datetime-local" value={ends} onChange={(e) => setEnds(e.target.value)} required /></label>
      </div>
      <p className="muted small">Bir tovarga bir vaqtda bitta chegirma. Do'konda "Chegirmalar" bo'limida eski narx chizilgan holda va qolgan vaqt bilan ko'rinadi.</p>
      <div><Btn kind="main" type="submit" disabled={isBusy}>Qo'yish</Btn><Btn onClick={onCancel}>Bekor</Btn></div>
    </form>
  );
}

interface DiscountRow { readonly id: number; readonly decor: string; readonly pct: number; readonly starts: string; readonly ends: string; readonly state: 'live' | 'soon' | 'ended' }
const STATE: Readonly<Record<DiscountRow['state'], string>> = { live: 'Amalda', soon: 'Kutilmoqda', ended: 'Tugagan' };
export function DiscountList({ names, version }: { readonly names: ReadonlyMap<string, string>; readonly version: number }): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly DiscountRow[]>('admin_discounts'), String(version));
  const { isBusy, run } = useAction();
  const remove = (d: DiscountRow): void => { if (confirm('Chegirma o‘chirilsinmi?')) void run(() => rpc('admin_discount_delete', { p_id: d.id }), 'O‘chirildi').then(reload); };
  return (
    <>
      <h3>Chegirmalar</h3>
      <Table rows={data} error={error} rowKey={(d) => d.id} columns={[
        { head: 'Tovar', cell: (d) => names.get(d.decor) ?? d.decor }, { head: 'Chegirma', cell: (d) => `−${d.pct}%` },
        { head: 'Boshlanishi', cell: (d) => when(d.starts) }, { head: 'Tugashi', cell: (d) => when(d.ends) },
        { head: 'Holat', cell: (d) => <span className={`tag ${d.state === 'live' ? 'live' : d.state === 'soon' ? 'pending' : ''}`}>{STATE[d.state]}</span> },
        { head: '', cell: (d) => (d.state === 'ended' ? null : <Btn kind="danger" disabled={isBusy} onClick={() => remove(d)}>O‘chirish</Btn>) },
      ]} />
    </>
  );
}
