import { useState, type FormEvent } from 'react';
import { rpc } from '../api.ts';
import { Btn, Table, useAction, useLoad, when } from '../ui.tsx';

/** Bot orqali xabar: hammaga, bitta tumanga yoki kutish ro'yxatiga; so'rovnomalar. Yuborish navbat bilan (Telegram chegarasiga mos). */
interface BroadcastRow { readonly id: number; readonly text: string; readonly target: string; readonly district_id: number | null; readonly total: number; readonly left: number; readonly created_at: string }
interface PollRow { readonly id: number; readonly question: string; readonly options: readonly string[]; readonly open: boolean; readonly votes: readonly number[] }
interface MessagesData { readonly waitlist: number; readonly queued: number; readonly broadcasts: readonly BroadcastRow[]; readonly polls: readonly PollRow[] }
const TARGETS: readonly (readonly [string, string])[] = [['all', 'Hammaga'], ['district', 'Bitta tumanga'], ['waitlist', 'Kutish ro‘yxatiga']];

export function Messages(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<MessagesData>('admin_messages'));
  const { isBusy, run } = useAction();
  const [text, setText] = useState('');
  const [target, setTarget] = useState('all');
  const [district, setDistrict] = useState(1);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState('');
  const send = (e: FormEvent): void => {
    e.preventDefault();
    if (!confirm('Xabar yuborilsinmi?')) return;
    void run(() => rpc('admin_broadcast', { p_text: text, p_target: target, p_district: target === 'district' ? district : null }), 'Navbatga qo‘yildi').then((ok) => { if (ok) { setText(''); reload(); } });
  };
  const poll = (e: FormEvent): void => {
    e.preventDefault();
    const list = options.split('\n').map((s) => s.trim()).filter(Boolean);
    void run(() => rpc('admin_poll', { p_question: question, p_options: list, p_target: target, p_district: target === 'district' ? district : null }), 'So‘rovnoma yuborildi').then((ok) => { if (ok) { setQuestion(''); setOptions(''); reload(); } });
  };
  return (
    <>
      {error && <p className="error">{error}</p>}
      {data && <p>Kutish ro‘yxatida: <b>{data.waitlist}</b> · navbatda: <b>{data.queued}</b> xabar</p>}
      <form className="card decor-form" onSubmit={send}>
        <label>Kimga<select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>{TARGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
        {target === 'district' && <label>Tuman raqami<input className="input" type="number" min={1} max={12} value={district} onChange={(e) => setDistrict(Number(e.target.value))} /></label>}
        <label>Xabar matni<textarea className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} rows={4} /></label>
        <Btn kind="main" type="submit" disabled={isBusy || text.trim() === ''}>Yuborish</Btn>
        {target === 'waitlist' && <p className="muted">Shahar ochilganda: “Ochildi! Kirish uchun botga /start yozing” deb yozing.</p>}
      </form>
      <h3>So‘rovnoma</h3>
      <form className="card decor-form" onSubmit={poll}>
        <label>Savol<input className="input" value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={300} /></label>
        <label>Variantlar (har biri yangi qatorda, 2–6 ta)<textarea className="input" value={options} onChange={(e) => setOptions(e.target.value)} rows={4} /></label>
        <Btn kind="main" type="submit" disabled={isBusy || question.trim() === ''}>So‘rovnoma yuborish ({TARGETS.find(([v]) => v === target)?.[1]})</Btn>
      </form>
      <Table rows={data?.polls ?? null} error={error} rowKey={(p) => String(p.id)} columns={[
        { head: 'Savol', cell: (p) => <b>{p.question}</b> },
        { head: 'Natija', cell: (p) => p.options.map((o, i) => <div key={o}>{o}: <b>{p.votes[i] ?? 0}</b></div>) },
        { head: '', cell: (p) => (p.open ? <Btn disabled={isBusy} onClick={() => void run(() => rpc('admin_poll_close', { p_id: p.id })).then(reload)}>Yopish</Btn> : 'yopiq') },
      ]} />
      <h3>Yuborilganlar</h3>
      <Table rows={data?.broadcasts ?? null} error={error} rowKey={(b) => String(b.id)} columns={[
        { head: 'Matn', cell: (b) => b.text.slice(0, 80) }, { head: 'Kimga', cell: (b) => `${b.target}${b.district_id ? ` ${b.district_id}` : ''}` },
        { head: 'Yuborildi', cell: (b) => `${b.total - b.left} / ${b.total}` }, { head: 'Vaqt', cell: (b) => when(b.created_at) },
      ]} />
    </>
  );
}
