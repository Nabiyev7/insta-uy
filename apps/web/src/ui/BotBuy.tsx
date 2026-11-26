/** Pulli xarid faqat botda (Telegram Stars): saytda tovar ko'rinadi, tugma botga chuqur havola (`?start=buy_<kod>`).
 *  To'lov o'chiq — "Tez kunda" (admin sinov rejimida botga o'tadi). Saytda karta yoki to'lov oynasi yo'q. */
import { useT } from '../app/i18n.ts';
import { miniApp } from '../app/telegram.ts';
import { setting, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';

interface BotBuyProps { readonly code: string; readonly label?: string; readonly isDisabled?: boolean }
export function BotBuy({ code, label, isDisabled = false }: BotBuyProps): React.JSX.Element {
  const t = useT();
  const isTester = useApp((s) => s.profile?.test_mode === true);
  const bot = setting('telegram_bot', '');
  const head = label ? `${label} · ` : '';
  if ((!setting('payments_enabled', false) && !isTester) || !bot) return <button type="button" className="btn soft pay-soon" disabled>{head}{t('soon')}</button>;
  if (isDisabled) return <button type="button" className="btn gold bot-buy" disabled><Icon name="telegram" />{head}{t('buyInBot')}</button>;
  const url = `https://t.me/${bot}?start=buy_${code}`;
  // Telegram ichida (Mini App) — bot suhbatiga o'tadi, brauzerda — oddiy havola.
  const open = (e: React.MouseEvent): void => {
    const wa = miniApp();
    if (!wa?.openTelegramLink) return;
    e.preventDefault();
    wa.openTelegramLink(url);
  };
  return <a className="btn gold bot-buy" href={url} target="_blank" rel="noopener noreferrer" onClick={open}><Icon name="telegram" />{head}{t('buyInBot')}</a>;
}
