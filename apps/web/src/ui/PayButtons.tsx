/** Pulga sotish tugmalari: to'lov o'chiq bo'lsa — "Tez kunda"; yoqilgan bo'lsa — karta (buyurtma) va Telegram Stars (bot havolasi). */
import { money, useT } from '../app/i18n.ts';
import { rpc } from '../app/api.ts';
import { openAuth, refreshProfile, setting, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { useAction } from './kit.tsx';
import { createOrder } from './OrderPanels.tsx';

interface Premium { readonly starsRate?: number; readonly starsMin?: number }
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
  /** Paketning o'z Stars narxi (null — faqat karta). Bo'lmasa kurs bo'yicha. */
  readonly stars?: number | null;
}
export function PayButtons({ kind, payload, uzs, code, label, isDisabled = false, stars }: PayButtonsProps): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  const isOn = setting('payments_enabled', false);
  const price = `${money(uzs)} ${t('som')}`;
  const isTester = profile?.test_mode === true;
  const min = setting<Premium>('premium', {}).starsMin ?? 50;
  const starPrice = stars === undefined ? starsOf(uzs) : stars;
  const hasStars = starPrice !== null && starPrice >= min;
  if (isTester) return <button type="button" className="btn gold test-buy" disabled={isBusy || isDisabled} onClick={() => run(async () => { await rpc('my_test_purchase', { p_kind: kind, p_payload: payload }); await refreshProfile(); }, t('saved'))}>{label ? `${label} · ` : ''}{t('testBuy')} · {price}</button>;
  const bot = setting('telegram_bot', '');
  if (!isOn) return <button type="button" className="btn soft pay-soon" disabled>{label ? `${label} · ` : ''}{price} · {t('soon')}</button>;
  if (!profile) return <button type="button" className="btn gold" onClick={() => openAuth()}>{label ? `${label} · ` : ''}{price}</button>;
  return (
    <div className="row pay">
      <button type="button" className="btn gold" disabled={isBusy || isDisabled} onClick={() => run(() => createOrder(kind, payload))}>{label ? `${label} · ` : ''}{price}</button>
      {code && bot && !isDisabled && hasStars && <a className="btn soft" href={`https://t.me/${bot}?start=buy_${code}`} target="_blank" rel="noopener noreferrer"><Icon name="telegram" /><Icon name="star" />{starPrice}</a>}
    </div>
  );
}
