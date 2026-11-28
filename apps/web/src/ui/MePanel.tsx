/** Uyim: uy kartasi va bo'limlar; avatar. */
import { openHousePhoto } from '../app/actions.ts';
import { isOwnerAdmin } from '../logic/admin.ts';
import { useState } from 'react';
import { MAX_TIER, TIERS, sanitizeAvatar, type AvatarLook } from '../../../../packages/shared/src/index.ts';
import { copyText, goToPlot, nearestFree, shareStory } from '../app/actions.ts';
import { myRefLink, shareInvite } from '../app/share.ts';
import { post, rpc, signOut, type MyPlot } from '../app/api.ts';
import { money, useT } from '../app/i18n.ts';
import { forgetMe } from '../app/multiplayer.ts';
import { openAuth, openPanel, openRoot, refreshProfile, setting, toast, useApp } from '../app/store.ts';
import { UpgradeButton } from './HousePanels.tsx';
import { Icon } from './icons.tsx';
import { RowLink, Section, Seg, Sheet, askConfirm, useAction } from './kit.tsx';
import { coinSteps } from '../logic/growth.ts';

function HouseCard({ plot }: { readonly plot: MyPlot }): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const { isBusy, run } = useAction();
  const isYard = useApp((s) => s.plotById.get(plot.plot)?.type !== 'kvartira');
  const tier = TIERS.find((x) => x.id === plot.tier)?.[lang] ?? '';
  const isOwned = plot.status === 'owned';
  return (
    <section className="house-card">
      <div className="row between"><span className="tag"><Icon name="star" />{plot.tier}/{MAX_TIER} · {tier}</span><span className="tag free">{t('owned')}</span></div>
      {plot.instagram && <p className="nick">@{plot.instagram}</p>}
      <p className="muted with-icon"><Icon name="pin" />{plot.address}</p>
      <button type="button" className="btn block" onClick={() => goToPlot(plot.plot)}><Icon name="home" />{t('goHome')}</button>
      <button type="button" className="btn soft block house-photo" onClick={() => openHousePhoto(plot.plot)}><Icon name="photo" />{t('housePhoto')}</button>
      {isYard && isOwned && <UpgradeButton plot={plot} />}
      <div className="tiles">
        {isYard && isOwned && <button type="button" onClick={() => openPanel({ kind: 'yard', id: plot.plot })}><Icon name="tools" />{t('decorate')}</button>}
        <button type="button" onClick={() => openPanel({ kind: 'bio', id: plot.plot })}><Icon name="rules" />{t('bioTitle')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(() => shareStory(plot.plot, plot.instagram ?? ''))}><Icon name="story" />{t('stories')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(shareInvite)}><Icon name="share" />{t('share')}</button>
      </div>
    </section>
  );
}

function TelegramLink(): React.JSX.Element | null {
  const t = useT();
  const isLinked = useApp((s) => s.profile?.telegram ?? false);
  const { isBusy, run } = useAction();
  const [url, setUrl] = useState('');
  if (isLinked) return <span className="tag free"><Icon name="check" />{t('tgLinked')}</span>;
  return (
    <>
      {url
        ? <a className="btn" href={url} target="_blank" rel="noopener noreferrer" onClick={() => setTimeout(() => void refreshProfile(), 15_000)}><Icon name="telegram" />{t('openTg')}</a>
        : <button type="button" className="btn soft" disabled={isBusy} onClick={() => run(async () => setUrl((await post<{ url: string }>('/auth/telegram/link', {}, true)).url))}><Icon name="telegram" />{t('linkTg')}</button>}
      <p className="muted">{t('linkTgWhy')}</p>
    </>
  );
}

interface CoinSettings { readonly referral?: number; readonly referralSteps?: Readonly<Record<string, number>> }
const STEPS: Readonly<Record<string, number>> = { 3: 2000, 10: 6000, 25: 15000, 50: 40000 };
/** Do'st taklifi shkalasi (19-qadam): har do'st — tanga, bosqichlarda (3 → 10 → 25 → 50) bir martalik bonus (sozlama `coins.referralSteps`). */
function InviteScale({ invited }: { readonly invited: number }): React.JSX.Element {
  const t = useT();
  const coins = setting<CoinSettings>('coins', {});
  const { steps, left } = coinSteps(invited, coins.referralSteps ?? STEPS);
  return (
    <>
      <p className="muted with-icon"><Icon name="coin" />{t('perFriend').replace('{n}', money(coins.referral ?? 500))}</p>
      <ol className="invite-scale coins">{steps.map((s) => (
        <li key={s.at} className={s.isDone ? 'done' : ''}><span className="cost"><Icon name="coin" />+{money(s.coins)}</span><b>{s.at} {t('friendsWord')}</b>{s.isDone && <Icon name="check" />}</li>
      ))}</ol>
      <p className="muted">{left === null ? t('inviteAll') : t('inviteLeft').replace('{n}', String(left))}</p>
    </>
  );
}

export function MePanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  if (!profile) return <Sheet title={t('me')}><button type="button" className="btn" onClick={() => openAuth()}>{t('login')}</button></Sheet>;
  // Buyurtma va reklama — to'lov yoqilganda (reklama joylari ham pulga sotiladi); egasi-adminga doim.
  const isPaid = setting('payments_enabled', false);
  const hasAds = isPaid;
  const isAdmin = isOwnerAdmin(profile);
  const findFree = (): void => {
    const id = nearestFree();
    if (id) goToPlot(id);
    else toast(t('nothing'), true);
  };
  const remove = async (): Promise<void> => {
    if (!(await askConfirm(`${t('deleteSure')}`, true))) return;
    await run(async () => {
      forgetMe();
      await post('/auth/delete', {}, true);
      await signOut();
      openRoot(null);
    });
  };
  return (
    <Sheet title={t('me')} extra={<span className="tag">{profile.instagram ? `@${profile.instagram}` : profile.login}</span>}>
      {profile.plots.length === 0 && <section className="house-card"><p>{t('noHouse')}</p><button type="button" className="btn gold block" onClick={findFree}><Icon name="home" />{t('findFree')}</button></section>}
      {profile.plots.map((p) => <HouseCard key={p.plot} plot={p} />)}
      <Section title={t('inviteScale')} icon="users">
        <InviteScale invited={profile.invited} />
        <div className="row between"><span className="muted">{t('invited')}: <b>{profile.invited}</b></span><span className="row"><button type="button" className="btn small gold" onClick={() => run(shareInvite)}><Icon name="share" />{t('share')}</button><button type="button" className="round small" aria-label={t('copyLink')} title={t('copyLink')} onClick={() => run(() => copyText(myRefLink()), t('copied'))}><Icon name="link" /></button></span></div>
      </Section>
      <div className="menu-list">
        <RowLink icon="gift" text={t('giftsTitle')} note={profile.transfers.length > 0 && <i className="dot flat">{profile.transfers.length}</i>} onClick={() => openPanel({ kind: 'gifts' })} />
        {(isPaid || isAdmin) && <RowLink icon="orders" text={t('myOrders')} onClick={() => openPanel({ kind: 'orders' })} />}
        {(hasAds || isAdmin) && <RowLink icon="ads" text={t('myAds2')} onClick={() => openPanel({ kind: 'ads' })} />}
        <RowLink icon="settings" text={t('settings')} onClick={() => openPanel({ kind: 'settings' })} />
        <RowLink icon="logout" text={t('logout')} isDisabled={isBusy} onClick={() => void run(async () => { await signOut(); openRoot(null); })} />
      </div>
      <Section title="Telegram" icon="telegram"><TelegramLink /></Section>
      <Section title={t('danger')} icon="ban">
        <p className="muted">{t('deleteWhat')}</p>
        <RowLink icon="trash" text={t('deleteAcc')} isDanger isDisabled={isBusy} onClick={() => void remove()} />
      </Section>
    </Sheet>
  );
}

/** Avatar: faqat bosh kiyim va libos (ranglar tanlanmaydi — odamga qarab o'zgarmas). */
export function AvatarPanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { run } = useAction();
  const look = sanitizeAvatar(profile?.avatar);
  const set = (patch: Partial<AvatarLook>): void => {
    if (!profile) { openAuth(); return; }
    void run(async () => { await rpc('my_avatar', { p_avatar: { hat: look.hat, outfit: look.outfit, ...patch } }); await refreshProfile(); });
  };
  return (
    <Sheet title={t('avatar')} variant="half">
      <span className="muted">{t('hat')}</span><Seg label={t('hat')} value={look.hat} onPick={(hat) => set({ hat })} options={[['none', t('o_none')], ['doppi', t('o_doppi')], ['kepka', t('o_kepka')]]} />
      <span className="muted">{t('outfit')}</span><Seg label={t('outfit')} value={look.outfit} onPick={(outfit) => set({ outfit })} options={[['oddiy', t('o_oddiy')], ['chopon', t('o_chopon')]]} />
      {!profile && <button type="button" className="btn" onClick={() => openAuth()}>{t('login')}</button>}
    </Sheet>
  );
}
