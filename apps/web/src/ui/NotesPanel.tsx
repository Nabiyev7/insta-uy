/** Qo'ng'iroq: kelgan xabarlar (tanga o'tkazish olib tashlangan — eski "tanga yuborishdi" xabarlari ko'rsatilmaydi). */
const HIDDEN_NOTES: ReadonlySet<string> = new Set(['coins_got']);
import { rpc } from '../app/api.ts';
import { hasKey, useT } from '../app/i18n.ts';
import { openAuth, refreshProfile, useApp } from '../app/store.ts';
import { decorOf } from '../logic/decorCatalog.ts';
import { Icon } from './icons.tsx';
import { Sheet, useAction } from './kit.tsx';

export function NotesPanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const lang = useApp((s) => s.lang);
  const { isBusy, run } = useAction();
  if (!profile) return <Sheet title={t('notes')}><button type="button" className="btn" onClick={() => openAuth()}>{t('login')}</button></Sheet>;
  const isEmpty = profile.notes.length === 0 && profile.transfers.length === 0;
  const readAll = profile.notes.length > 0 && <button type="button" className="btn soft block" disabled={isBusy} onClick={() => run(async () => { await rpc('my_notes_read'); await refreshProfile(); })}><Icon name="check" />{t('readAll')}</button>;
  return (
    <Sheet title={t('notes')} variant="half" footer={readAll}>
      {isEmpty && <p className="state muted"><Icon name="bell" />{t('notesEmpty')}</p>}
      <ul className="list">
        {profile.notes.filter((n) => !HIDDEN_NOTES.has(n.kind)).map((n) => {
          const key = `n_${n.kind}`;
          const gift = n.kind === 'decor_gift' ? `: ${decorOf(String(n.data.decor))?.[lang] ?? ''} — ${String(n.data.from ?? '')}${n.data.message ? ` «${String(n.data.message)}»` : ''}` : '';
          return <li key={n.id}><Icon name={n.kind === 'decor_gift' ? 'gift' : 'bell'} /><span className="grow">{hasKey(key) ? t(key) : n.kind}{gift}<br /><small className="muted">{new Date(n.at).toLocaleDateString('ru-RU')}</small></span></li>;
        })}
      </ul>
    </Sheet>
  );
}
