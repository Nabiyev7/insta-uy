/** "Tabriklaymiz": uy qurildi yoki level oshdi — nik, manzil, stories rasmi. */
import { TIERS } from '../../../../packages/shared/src/index.ts';
import { addressOf, copyText, houseUrl, shareStory } from '../app/actions.ts';
import { useT } from '../app/i18n.ts';
import { openPanel, useApp } from '../app/store.ts';
import { Icon } from './icons.tsx';
import { Sheet, useAction } from './kit.tsx';

interface CongratsProps { readonly id: string; readonly tier?: number }
export function CongratsPanel({ id, tier }: CongratsProps): React.JSX.Element | null {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const plot = useApp((s) => s.plotById.get(id));
  const house = useApp((s) => s.houses.get(id));
  const { isBusy, run } = useAction();
  if (!plot) return null;
  const nick = house?.nick ?? '';
  const name = TIERS.find((x) => x.id === tier)?.[lang];
  return (
    <Sheet title={t(tier ? 'levelUp' : 'congrats')} variant="half" extra={<span className="party" aria-hidden="true"><Icon name="confetti" /></span>}>
      {nick && <p className="nick">@{nick}</p>}
      <p className="muted with-icon"><Icon name="pin" />{addressOf(plot)}</p>
      <p>{tier ? `${t('levelUpText')} — ${tier}. ${name ?? ''}` : t('congratsText')}</p>
      <div className="row two">
        <button type="button" className="btn gold" disabled={isBusy} onClick={() => run(() => shareStory(id, nick))}><Icon name="story" />{t('stories')}</button>
        <button type="button" className="btn soft" disabled={isBusy} onClick={() => run(() => copyText(houseUrl(id)), t('copied'))}><Icon name="share" />{t('share')}</button>
      </div>
      <button type="button" className="btn block" onClick={() => openPanel({ kind: 'me' })}>{t('myHouse')}<Icon name="next" /></button>
    </Sheet>
  );
}
