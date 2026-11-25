/** Chat oynasi: Umumiy, Mahalla, Onlayn. Yarim ekran — yuqorida shahar ko'rinib turadi. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { setMuted } from '../app/chat.ts';
import { useT } from '../app/i18n.ts';
import { goToPoint } from '../app/modes.ts';
import { loadOnline, moderateMessage, sendChat, type OnlinePerson } from '../app/multiplayer.ts';
import { openAuth, setApp, toast, useApp, type ChatLine } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { Seg, Sheet, askConfirm } from './kit.tsx';

type Tab = 'all' | 'district' | 'online';
const MAX_TEXT = 200;
const ONLINE_REFRESH_MS = 5000;
const COMMON = 0;

const useHomeDistricts = (): readonly number[] => {
  const profile = useApp((s) => s.profile);
  const plotById = useApp((s) => s.plotById);
  return [...new Set((profile?.plots ?? []).filter((p) => p.status === 'owned').map((p) => plotById.get(p.plot)?.districtId ?? 0).filter((d) => d > 0))];
};
const useCanModerate = (): boolean => useApp((s) => s.profile?.role === 'admin' || (s.profile?.role === 'moderator' && s.profile.perms.includes('reports')));

function MessageTools({ line, onClose }: { readonly line: ChatLine; readonly onClose: () => void }): React.JSX.Element {
  const t = useT();
  const canModerate = useCanModerate();
  const isMine = useApp((s) => s.myAuthor === line.author);
  const act = (fn: () => void) => (): void => {
    fn();
    onClose();
  };
  return (
    <div className="row tools">
      {!isMine && <button type="button" className="btn small soft" onClick={act(() => { setMuted(line, true); toast(t('mutedDone')); })}><Icon name="mute" />{t('mute')}</button>}
      {canModerate && <button type="button" className="btn small soft" onClick={act(() => moderateMessage(line.id, false))}><Icon name="trash" />{t('chatDelete')}</button>}
      {canModerate && !isMine && <button type="button" className="btn small danger" onClick={act(() => { void askConfirm(t('chatBanSure'), true).then((ok) => { if (ok) moderateMessage(line.id, true); }); })}><Icon name="ban" />{t('chatBan')}</button>}
    </div>
  );
}

function Messages({ channel }: { readonly channel: number }): React.JSX.Element {
  const t = useT();
  const chat = useApp((s) => s.chat);
  const muted = useApp((s) => s.muted);
  const [selected, setSelected] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const lines = chat.filter((m) => m.channel === channel && !muted.some((x) => x.author === m.author));
  const lastId = lines.at(-1)?.id;
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [lastId, channel]);
  return (
    <div className="messages" role="log" aria-live="polite">
      {lines.length === 0 && <p className="muted">{t('chatEmpty')}</p>}
      {lines.map((m) => (
        <div key={m.id} className="message">
          <button type="button" onClick={() => setSelected(selected === m.id ? null : m.id)}><b>{m.nick}</b> {m.text}</button>
          {selected === m.id && <MessageTools line={m} onClose={() => setSelected(null)} />}
        </div>
      ))}
      <div ref={end} />
    </div>
  );
}

function Composer({ channel, canWrite }: { readonly channel: number; readonly canWrite: boolean }): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const [text, setText] = useState('');
  if (!profile) return <button type="button" className="btn gold block" onClick={() => openAuth()}>{t('chatLogin')}</button>;
  if (!canWrite) return <p className="muted">{t('chatResidents')}</p>;
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (text.trim()) sendChat(channel, text);
    setText('');
  };
  return (
    <form className="composer" onSubmit={submit}>
      <input className="input grow" value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_TEXT} placeholder={t('chatHint')} aria-label={t('chatHint')} autoComplete="off" />
      <button type="submit" className="btn" aria-label={t('send')}><Icon name="send" /></button>
    </form>
  );
}

function OnlineList(): React.JSX.Element {
  const t = useT();
  const boot = useApp((s) => s.boot);
  const lang = useApp((s) => s.lang);
  const muted = useApp((s) => s.muted);
  const online = useApp((s) => s.online);
  const [people, setPeople] = useState<readonly OnlinePerson[]>([]);
  useEffect(() => {
    let isActive = true;
    const load = (): void => { void loadOnline().then((list) => { if (isActive) setPeople(list); }); };
    load();
    const id = setInterval(load, ONLINE_REFRESH_MS);
    return () => {
      isActive = false;
      clearInterval(id);
    };
  }, []);
  const districtName = (id: number): string => { const d = boot?.districts.find((x) => x.id === id); return d ? (lang === 'uz' ? d.name_uz : d.name_ru) : t('plaza'); };
  const guests = Math.max(0, online - people.length);
  return (
    <ul className="list">
      {people.map((p) => (
        <li key={p.author}>
          <button type="button" className="plain" onClick={() => goToPoint(p.x, p.z)}><b>{p.nick}</b><br /><span className="muted">{districtName(p.district)}</span></button>
          <Icon name="next" className="chev" />
        </li>
      ))}
      {people.length === 0 && guests === 0 && <li className="muted">{t('listEmpty')}</li>}
      {guests > 0 && <li className="muted">+{guests} {t('guests')}</li>}
      {muted.map((m) => <li key={`jim-${m.author}`}><span className="grow muted with-icon"><Icon name="mute" />{m.nick}</span><button type="button" className="btn small soft" onClick={() => setMuted(m, false)}>{t('unmute')}</button></li>)}
    </ul>
  );
}

function DistrictTab(): React.JSX.Element {
  const t = useT();
  const boot = useApp((s) => s.boot);
  const lang = useApp((s) => s.lang);
  const here = useApp((s) => s.district);
  const homes = useHomeDistricts();
  const canModerate = useCanModerate();
  const [picked, setPicked] = useState(here || homes[0] || 1);
  return (
    <>
      <select className="input" value={picked} aria-label={t('chatDistrict')} onChange={(e) => setPicked(Number(e.target.value))}>
        {boot?.districts.map((d) => <option key={d.id} value={d.id}>{homes.includes(d.id) ? '• ' : ''}{lang === 'uz' ? d.name_uz : d.name_ru}</option>)}
      </select>
      <Messages channel={picked} />
      <Composer channel={picked} canWrite={homes.includes(picked) || canModerate} />
    </>
  );
}

export function ChatPanel(): React.JSX.Element {
  const t = useT();
  const online = useApp((s) => s.online);
  const [tab, setTab] = useState<Tab>('all');
  useEffect(() => {
    setApp({ unread: 0 });
  }, []);
  return (
    <Sheet title={t('chatTitle')} variant="half chat">
      <Seg<Tab> label={t('chatTitle')} value={tab} onPick={setTab} options={[['all', t('chatAll')], ['district', t('chatDistrict')], ['online', `${t('chatOnline')} (${online})`]]} />
      {tab === 'all' && <><Messages channel={COMMON} /><Composer channel={COMMON} canWrite /></>}
      {tab === 'district' && <DistrictTab />}
      {tab === 'online' && <OnlineList />}
    </Sheet>
  );
}
