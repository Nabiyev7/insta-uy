/** Chat oynasi: Umumiy va (uyi borlarga) Mahalla. Yarim ekran — yuqorida shahar ko'rinib turadi. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { setMuted } from '../app/chat.ts';
import { useT } from '../app/i18n.ts';
import { moderateMessage, sendChat } from '../app/multiplayer.ts';
import { openAuth, setApp, toast, useApp, type ChatLine } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { Seg, Sheet, askConfirm } from './kit.tsx';

type Tab = 'all' | 'district';
const MAX_TEXT = 200;
const COMMON = 0;

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


/** Mahalla chati: faqat birinchi olingan uyning mahallasi (tanlov yo'q). */
function DistrictTab({ district }: { readonly district: number }): React.JSX.Element {
  return <><Messages channel={district} /><Composer channel={district} canWrite /></>;
}

export function ChatPanel(): React.JSX.Element {
  const t = useT();
  // Uyi yo'q yoki mehmon — faqat "Umumiy"; bir nechta uy bo'lsa — eng birinchi olinganining mahallasi.
  const firstPlot = useApp((s) => s.profile?.plots.find((p) => p.status === 'owned')?.plot);
  const district = useApp((s) => (firstPlot ? s.plotById.get(firstPlot)?.districtId ?? 0 : 0));
  const [tab, setTab] = useState<Tab>('all');
  useEffect(() => {
    setApp({ unread: 0 });
  }, []);
  return (
    <Sheet title={t('chatTitle')} variant="half chat">
      {district > 0 && <Seg<Tab> label={t('chatTitle')} value={tab} onPick={setTab} options={[['all', t('chatAll')], ['district', t('chatDistrict')]]} />}
      {(tab === 'all' || district === 0) && <><Messages channel={COMMON} /><Composer channel={COMMON} canWrite /></>}
      {tab === 'district' && district > 0 && <DistrictTab district={district} />}
    </Sheet>
  );
}
