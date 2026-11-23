import { useState, type FormEvent } from 'react';
import { FILES, rpc } from '../api.ts';
import { Btn, useAction, useLoad, when } from '../ui.tsx';

interface Style { readonly title?: string; readonly text?: string; readonly seconds?: number; readonly time?: number; readonly music?: boolean; readonly voice?: string }
interface Job { readonly id: string; readonly kind: string; readonly plots: readonly string[]; readonly style: Style; readonly status: string; readonly file: string | null; readonly error: string | null; readonly created_at: string }
const TIMES = [['0.42', 'Kunduz'], ['0.74', 'Shom'], ['0.95', 'Tun'], ['0.3', 'Tong']] as const;
const MAX_HOUSES = 30;

interface StyleFormProps { readonly initial: Style; readonly plots: string; readonly canEditPlots: boolean; readonly isBusy: boolean; readonly button: string; readonly onSubmit: (plots: string[], style: Style) => void }
function StyleForm({ initial, plots, canEditPlots, isBusy, button, onSubmit }: StyleFormProps): React.JSX.Element {
  const [ids, setIds] = useState(plots);
  const [title, setTitle] = useState(initial.title ?? 'Yangi uylar!');
  const [text, setText] = useState(initial.text ?? '');
  const [voice, setVoice] = useState(initial.voice ?? '');
  const [seconds, setSeconds] = useState(String(initial.seconds ?? ''));
  const [time, setTime] = useState(String(initial.time ?? '0.42'));
  const [isMusic, setMusic] = useState(initial.music ?? true);
  const list = [...new Set(ids.toUpperCase().match(/P\d{4}/g) ?? [])];
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    const s = Number(seconds);
    onSubmit(list, { title, text, voice, music: isMusic, time: Number(time), ...(s >= 3 ? { seconds: Math.min(s, 180) } : {}) });
  };
  return (
    <form className="card" onSubmit={submit}>
      {canEditPlots && <><textarea value={ids} onChange={(e) => setIds(e.target.value)} placeholder="P0001, P0002 … (30 tagacha)" aria-label="Uylar" /><span className="muted">{list.length} ta uy</span></>}
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Sarlavha" aria-label="Sarlavha" maxLength={40} />
      <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Pastdagi matn" aria-label="Matn" maxLength={60} />
      <textarea value={voice} onChange={(e) => setVoice(e.target.value)} placeholder="«Bekzod» ovozi matni (bo'sh = ovozsiz)" aria-label="Ovoz matni" maxLength={600} />
      <div className="row" style={{ margin: 0 }}>
        <input className="input" style={{ width: 100 }} value={seconds} onChange={(e) => setSeconds(e.target.value)} placeholder="Soniya" aria-label="Davomiylik" type="number" min={3} max={180} />
        <select value={time} onChange={(e) => setTime(e.target.value)} aria-label="Kun vaqti">{TIMES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>
        <label><input type="checkbox" checked={isMusic} onChange={(e) => setMusic(e.target.checked)} /> musiqa</label>
      </div>
      <Btn kind="main" type="submit" disabled={isBusy || (canEditPlots && (list.length === 0 || list.length > MAX_HOUSES))}>{button}</Btn>
    </form>
  );
}

interface JobCardProps { readonly job: Job; readonly isBusy: boolean; readonly onAct: (id: string, action: string, style?: Style) => void }
function JobCard({ job: j, isBusy, onAct }: JobCardProps): React.JSX.Element {
  const [isEditing, setEditing] = useState(false);
  return (
    <div className="card">
      <div className="row" style={{ margin: 0, justifyContent: 'space-between' }}><b>{j.style.title ?? j.kind}</b><span className={`tag ${j.status}`}>{j.status}</span></div>
      <span className="muted">{when(j.created_at)} · {j.plots.length} ta uy</span>
      {j.file && <video src={j.file.startsWith('https://') ? j.file : FILES + j.file} controls preload="metadata" />}
      {j.error && <p className="error">{j.error}</p>}
      <div>
        {j.status === 'ready' && <Btn kind="main" disabled={isBusy} onClick={() => onAct(j.id, 'send')}>Telegram'ga yuborish</Btn>}
        {j.status !== 'rendering' && <Btn disabled={isBusy} onClick={() => setEditing(!isEditing)}>Tahrirlash</Btn>}
        <Btn kind="danger" disabled={isBusy} onClick={() => { if (confirm("O'chirilsinmi?")) onAct(j.id, 'delete'); }}>O'chirish</Btn>
      </div>
      {isEditing && <StyleForm initial={j.style} plots={j.plots.join(', ')} canEditPlots={false} isBusy={isBusy} button="Qayta yasash" onSubmit={(_plots, style) => { setEditing(false); onAct(j.id, 'rerender', style); }} />}
    </div>
  );
}

export function Videos(): React.JSX.Element {
  const { data, error, reload } = useLoad(() => rpc<readonly Job[]>('admin_videos'));
  const { data: fresh } = useLoad(() => rpc<readonly { id: string }[]>('admin_plots', { p_status: 'owned' }).catch(() => []));
  const { isBusy, run } = useAction();
  const act = (id: string, action: string, style?: Style): void => { void run(() => rpc('admin_video', { p_id: id, p_action: action, p_style: style ?? null })).then(reload); };
  const create = (plots: string[], style: Style): void => { void run(() => rpc('admin_video_create', { p_kind: 'houses', p_plots: plots, p_style: style })).then(reload); };
  return (
    <>
      <p className="muted">Render o'z kompyuteringizda: <code>npm run video</code> navbatni kuzatib turadi.</p>
      <div className="row"><Btn onClick={reload}>Yangilash</Btn></div>
      {error && <p className="error">{error}</p>}
      <div className="cards">
        <StyleForm key={fresh ? 'ready' : 'wait'} initial={{}} plots={fresh?.slice(0, 5).map((p) => p.id).join(', ') ?? ''} canEditPlots isBusy={isBusy} button="Video yasash" onSubmit={create} />
        {data?.map((j) => <JobCard key={j.id} job={j} isBusy={isBusy} onAct={act} />)}
      </div>
    </>
  );
}
