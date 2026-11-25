/** Pulga sotish tugmalari: to'lov o'chiq bo'lsa — "Tez kunda"; yoqilgan bo'lsa — karta (buyurtma) va Telegram Stars (bot havolasi). */
import { money, useT } from '../app/i18n.ts';
import { openAuth, setting, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { useAction } from './kit.tsx';
import { createOrder } from './OrderPanels.tsx';

interface Premium { readonly starsRate?: number }
/** Narx yulduzda (serverdagi `private.stars_of` bilan bir xil). */
export const starsOf = (uzs: number): number => Math.max(1, Math.ceil(uzs / Math.max(1, setting<Premium>('premium', {}).starsRate ?? 200)));

interface PayButtonsProps {
  readonly kind: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly uzs: number;
  /** Bot havolasi uchun kod (`?start=buy_<kod>`); bo'lmasa Stars tugmasi chiqmaydi. */
  readonly code?: string;
  readonly label?: string;
  readonly isDisabled?: boolean;
}
export function PayButtons({ kind, payload, uzs, code, label, isDisabled = false }: PayButtonsProps): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const isOn = setting('payments_enabled', false);
  const bot = setting('telegram_bot', '');
  const price = `${money(uzs)} ${t('som')}`;
  if (!isOn) return <button type="button" className="btn soft pay-soon" disabled>{label ? `${label} · ` : ''}{price} · {t('soon')}</button>;
  if (!profile) return <button type="button" className="btn gold" onClick={() => openAuth()}>{label ? `${label} · ` : ''}{price}</button>;
  return (
    <div className="row pay">
      <button type="button" className="btn gold" disabled={isBusy || isDisabled} onClick={() => run(() => createOrder(kind, payload))}>{label ? `${label} · ` : ''}{price}</button>
      {code && bot && !isDisabled && <a className="btn soft" href={`https://t.me/${bot}?start=buy_${code}`} target="_blank" rel="noopener noreferrer"><Icon name="telegram" /><Icon name="star" />{starsOf(uzs)}</a>}
    </div>
  );
}
