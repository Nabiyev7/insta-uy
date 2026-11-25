import { useEffect, useState } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

/** Tanga iqtisodi: topish, narxlar, o'tkazma chegaralari (hammasi `coins` sozlamasida). */
const FIELDS: readonly (readonly [key: string, label: string])[] = [
  ['founder', 'Birinchi 100 kishi (bir marta)'], ['daily', 'Kunlik kirish'], ['streakBonus', '7 kun ketma-ket (bonus)'], ['channel', 'Telegram kanalga obuna (bir marta)'],
  ['referral', "Do'st taklifi (do'st uy olsa)"], ['yardWinner', '"Haftaning hovlisi" g‘olibi'], ['treasure', 'Xazina (bitta topilma)'], ['treasurePerDay', 'Xazina: kuniga nechta'],
  ['sendDay', 'Kuniga yuborish chegarasi'], ['receiveDay', 'Kuniga qabul chegarasi'],
];
const TIERS = [2, 3, 4, 5] as const;

type Coins = Record<string, unknown> & { readonly tier?: Readonly<Record<string, number>> };
interface Economy { readonly total: number; readonly founders: number; readonly reasons: readonly { readonly reason: string; readonly plus: number; readonly minus: number }[] }
interface TransferRow { readonly id: number; readonly from_nick: string | null; readonly to_nick: string | null; readonly amount: number; readonly at: string }

function CoinSettings(): React.JSX.Element {
  const { isBusy, run } = useAction();
  const { data, error, reload } = useLoad(() => rpc<Record<string, unknown>>('admin_settings'));
  const saved = (data?.coins ?? null) as Coins | null;
  const [draft, setDraft] = useState<Coins | null>(null);
  useEffect(() => { setDraft(saved); }, [saved]);
  if (error) return <p className="error">{error}</p>;
  if (!draft) return <p className="muted">Yuklanmoqda…</p>;
  const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
  const setTier = (t: number, v: number): void => setDraft({ ...draft, tier: { ...draft.tier, [t]: v } });
  return (
    <form className="card decor-form" onSubmit={(e) => { e.preventDefault(); void run(() => rpc('admin_setting', { p_key: 'coins', p_value: draft }), 'Saqlandi').then(reload); }}>
      {FIELDS.map(([key, label]) => (
        <label key={key}>{label}<input className="input" type="number" min={0} max={1_000_000} value={num(draft[key])} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} /></label>
      ))}
      {TIERS.map((t) => (
        <label key={t}>{t}-level narxi<input className="input" type="number" min={0} max={1_000_000} value={num(draft.tier?.[t])} onChange={(e) => setTier(t, Number(e.target.value))} /></label>
      ))}
      <Btn kind="main" type="submit" disabled={isBusy}>Saqlash</Btn>
    </form>
  );
}

export function Economy(): React.JSX.Element {
  const [q, setQ] = useState('');
  const stats = useLoad(() => rpc<Economy>('admin_economy'));
  const transfers = useLoad(() => rpc<readonly TransferRow[]>('admin_coin_transfers', { p_q: q.trim() }), q);
  return (
    <>
      <h3>Tanga qiymatlari</h3>
      <CoinSettings />
      <h3>So'nggi 7 kun</h3>
      {stats.data && <p>Hammada jami: <b>{stats.data.total.toLocaleString('ru-RU')}</b> tanga · asoschilar: <b>{stats.data.founders}</b></p>}
      <Table rows={stats.data?.reasons ?? null} error={stats.error} rowKey={(r) => r.reason} columns={[
        { head: 'Qayerdan / qayerga', cell: (r) => r.reason }, { head: 'Kirdi', cell: (r) => `+${r.plus}` }, { head: 'Sarflandi', cell: (r) => `−${r.minus}` },
      ]} />
      <h3>Tanga o'tkazmalari</h3>
      <div className="row"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nik" aria-label="O‘tkazmani qidirish" /></div>
      <Table rows={transfers.data} error={transfers.error} rowKey={(t) => String(t.id)} columns={[
        { head: 'Kimdan', cell: (t) => t.from_nick ?? '—' }, { head: 'Kimga', cell: (t) => t.to_nick ?? '—' }, { head: 'Tanga', cell: (t) => t.amount }, { head: 'Vaqt', cell: (t) => when(t.at) },
      ]} />
    </>
  );
}
