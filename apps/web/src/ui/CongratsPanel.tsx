/** Uy qurilib bo'lgach: "Tabriklaymiz", nik, manzil, stories rasmi. */
import { addressOf, copyText, houseUrl, shareImage, storyImage } from '../app/actions.ts';
import { useT } from '../app/i18n.ts';
import { openPanel, useApp } from '../app/store.ts';
import { Sheet, useAction } from './kit.tsx';

interface CongratsProps { readonly id: string }
export function CongratsPanel({ id }: CongratsProps): React.JSX.Element | null {
  const t = useT();
  const plot = useApp((s) => s.plotById.get(id));
  const house = useApp((s) => s.houses.get(id));
  const { isBusy, run } = useAction();
  if (!plot) return null;
  const nick = house?.nick ?? '';
  const story = (): Promise<boolean> => run(async () => {
    openPanel(null);
    const canvas = await storyImage(plot, nick);
    openPanel({ kind: 'congrats', id });
    await shareImage(canvas, `uy-${nick || id}`);
  });
  return (
    <Sheet title={`🎉 ${t('congrats')}`} variant="half">
      {nick && <p className="nick">@{nick}</p>}
      <p className="address">{addressOf(plot)}</p>
      <p>{t(house?.status === 'pending' ? 'congratsPending' : 'congratsText')}</p>
      <div className="row">
        <button type="button" className="btn clay grow" disabled={isBusy} onClick={story}>📱 {t('stories')}</button>
        <button type="button" className="btn soft" disabled={isBusy} onClick={() => run(() => copyText(houseUrl(id)), t('copied'))}>🔗</button>
      </div>
      <button type="button" className="btn block" onClick={() => openPanel({ kind: 'me' })}>{t('myHouse')} →</button>
    </Sheet>
  );
}
