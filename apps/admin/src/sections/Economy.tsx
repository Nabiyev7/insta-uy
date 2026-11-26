import { useEffect, useState } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

/** Tanga iqtisodi: topish, narxlar (hammasi `coins` sozlamasida). */
const SHOW_TRANSFERS = false;
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

interface Pack { coins: number; bonus: number; uzs: number; stars: number | null; tag?: string }
/** Tanga paketlari: qo'shish, o'chirish, narx (so'm va Stars alohida; Stars bo'sh — faqat karta, 50 ⭐ dan kam bo'lmasin). */
function Packs(): React.JSX.Element {
  const { isBusy, run } = useAction();
  const { data, error, reload } = useLoad(() => rpc<Record<string, unknown>>('admin_settings'));
  const premium = (data?.premium ?? null) as (Record<string, unknown> & { packs?: Pack[] }) | null;
  const [packs, setPacks] = useState<Pack[] | null>(null);
  useEffect(() => { setPacks(premium?.packs ?? null); }, [premium]);
  if (error) return <p className="error">{error}</p>;
  if (!packs || !premium) return <p className="muted">Yuklanmoqda…</p>;
  const edit = (i: number, patch: Partial<Pack>): void => setPacks(packs.map((p, k) => (k === i ? { ...p, ...patch } : p)));
  const num = (v: string): number => Math.max(0, Math.round(Number(v) || 0));
  return (
    <form className="card decor-form" onSubmit={(e) => { e.preventDefault(); void run(() => rpc('admin_setting', { p_key: 'premium', p_value: { ...premium, packs } }), 'Saqlandi').then(reload); }}>
      {packs.map((p, i) => (
        <div className="row" key={i}>
          <b>{i + 1}.</b>
          <label>Tanga<input className="input" type="number" min={1} value={p.coins} onChange={(e) => edit(i, { coins: num(e.target.value) })} /></label>
          <label>Bonus<input className="input" type="number" min={0} value={p.bonus} onChange={(e) => edit(i, { bonus: num(e.target.value) })} /></label>
          <label>So'm<input className="input" type="number" min={1} value={p.uzs} onChange={(e) => edit(i, { uzs: num(e.target.value) })} /></label>
          <label>Stars (bo'sh — faqat karta)<input className="input" type="number" min={50} value={p.stars ?? ''} onChange={(e) => edit(i, { stars: e.target.value === '' ? null : num(e.target.value) })} /></label>
          <label>Belgi<select className="input" value={p.tag ?? ''} onChange={(e) => edit(i, { tag: e.target.value || undefined })}><option value="">—</option><option value="popular">Ommabop</option><option value="best">Eng foydali</option></select></label>
          <Btn kind="danger" onClick={() => setPacks(packs.filter((_, k) => k !== i))}>O'chirish</Btn>
        </div>
      ))}
      <Btn onClick={() => setPacks([...packs, { coins: 1000, bonus: 0, uzs: 5000, stars: null }])}>+ Paket</Btn>
      <Btn kind="main" type="submit" disabled={isBusy}>Paketlarni saqlash</Btn>
    </form>
  );
}

/** Ochilishdan oldin: admin sinov rejimida yaratilgan hamma narsa o'chadi. */
function TestCleanup(): React.JSX.Element {
  const { isBusy, run } = useAction();
  const clean = (): void => {
    if (!confirm('Sinov uylari, bezaklari va buyurtmalari o‘chiriladi, uchastkalar bo‘shaydi. Davom etilsinmi?')) return;
    void run(() => rpc('admin_test_cleanup'), 'Tozalandi');
  };
  return <p><Btn kind="danger" disabled={isBusy} onClick={clean}>Sinov ma'lumotlarini tozalash</Btn> <span className="muted">Admin sinov rejimida yaratilgan uylar, bezaklar va buyurtmalar.</span></p>;
}

export function Economy(): React.JSX.Element {
  const [q, setQ] = useState('');
  const stats = useLoad(() => rpc<Economy>('admin_economy'));
  const transfers = useLoad(() => rpc<readonly TransferRow[]>('admin_coin_transfers', { p_q: q.trim() }), q);
  return (
    <>
      <h3>Tanga qiymatlari</h3>
      <CoinSettings />
      <h3>Tanga paketlari</h3>
      <Packs />
      <h3>Sinov rejimi</h3>
      <TestCleanup />
      <h3>So'nggi 7 kun</h3>
      {stats.data && <p>Hammada jami: <b>{stats.data.total.toLocaleString('ru-RU')}</b> tanga · asoschilar: <b>{stats.data.founders}</b></p>}
      <Table rows={stats.data?.reasons ?? null} error={stats.error} rowKey={(r) => r.reason} columns={[
        { head: 'Qayerdan / qayerga', cell: (r) => r.reason }, { head: 'Kirdi', cell: (r) => `+${r.plus}` }, { head: 'Sarflandi', cell: (r) => `−${r.minus}` },
      ]} />
      {/* Tanga o'tkazish olib tashlangan (coins_transfer_enabled=false) — bo'lim yashirin, kod qoladi. */}
      {SHOW_TRANSFERS && <>
      <h3>Tanga o'tkazmalari</h3>
      <div className="row"><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nik" aria-label="O‘tkazmani qidirish" /></div>
      <Table rows={transfers.data} error={transfers.error} rowKey={(t) => String(t.id)} columns={[
        { head: 'Kimdan', cell: (t) => t.from_nick ?? '—' }, { head: 'Kimga', cell: (t) => t.to_nick ?? '—' }, { head: 'Tanga', cell: (t) => t.amount }, { head: 'Vaqt', cell: (t) => when(t.at) },
      ]} />
      </>}
    </>
  );
}
