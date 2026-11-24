/** Shikoyat: uy, ko'cha yoki reklama ustidan. */
import { useState, type FormEvent } from 'react';
import { rpc } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { openAuth, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { useAction } from './kit.tsx';

interface ReportProps { readonly kind: string; readonly target: string }
export function ReportForm({ kind, target }: ReportProps): React.JSX.Element {
  const t = useT();
  const isGuest = useApp((s) => s.profile === null);
  const { isBusy, run } = useAction();
  const [reason, setReason] = useState('');
  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (isGuest) { openAuth(); return; }
    void run(() => rpc('my_report', { p_kind: kind, p_target: target, p_reason: reason }), t('sent')).then((ok) => ok && setReason(''));
  };
  return (
    <details>
      <summary className="muted with-icon"><Icon name="flag" />{t('report')}</summary>
      <form className="row" onSubmit={submit}>
        <input className="input grow" value={reason} onChange={(e) => setReason(e.target.value)} minLength={3} maxLength={500} placeholder={t('reportReason')} aria-label={t('reportReason')} required />
        <button type="submit" className="btn small danger" disabled={isBusy}>{t('report')}</button>
      </form>
    </details>
  );
}
