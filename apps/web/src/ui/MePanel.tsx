/** Uyim: uy kartasi va bo'limlar; avatar. */
import { useState } from 'react';
import { MAX_TIER, TIERS, sanitizeAvatar, type AvatarLook } from '../../../../packages/shared/src/index.ts';
import { copyText, goToPlot, houseUrl, inviteUrl, nearestFree, shareStory } from '../app/actions.ts';
import { post, rpc, signOut, type MyPlot } from '../app/api.ts';
import { useT } from '../app/i18n.ts';
import { forgetMe } from '../app/multiplayer.ts';
import { openAuth, openPanel, openRoot, refreshProfile, toast, useApp } from '../app/store.ts';
import { NickForm, PaidExtras, UpgradeButton } from './HousePanels.tsx';
import { Icon } from './icons.tsx';
import { RowLink, Section, Seg, Sheet, askConfirm, useAction } from './kit.tsx';

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
      {plot.instagram ? <p className="nick">@{plot.instagram}</p> : <NickForm plot={plot} />}
      <p className="muted with-icon"><Icon name="pin" />{plot.address}</p>
      <button type="button" className="btn block" onClick={() => goToPlot(plot.plot)}><Icon name="home" />{t('goHome')}</button>
      {isYard && isOwned && <UpgradeButton plot={plot} />}
      <div className="tiles">
        {isYard && isOwned && <button type="button" onClick={() => openPanel({ kind: 'yard', id: plot.plot })}><Icon name="tools" />{t('decorate')}</button>}
        <button type="button" onClick={() => openPanel({ kind: 'bio', id: plot.plot })}><Icon name="rules" />{t('bioTitle')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(() => shareStory(plot.plot, plot.instagram ?? ''))}><Icon name="story" />{t('stories')}</button>
        <button type="button" disabled={isBusy} onClick={() => run(() => copyText(houseUrl(plot.plot)), t('copied'))}><Icon name="share" />{t('share')}</button>
      </div>
      {isYard && isOwned && <PaidExtras plot={plot} />}
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

export function MePanel(): React.JSX.Element {
  const t = useT();
  const profile = useApp((s) => s.profile);
  const { isBusy, run } = useAction();
  if (!profile) return <Sheet title={t('me')}><button type="button" className="btn" onClick={() => openAuth()}>{t('login')}</button></Sheet>;
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
    <Sheet title={t('me')} extra={<span className="tag">{profile.login}</span>}>
      {profile.plots.length === 0 && <section className="house-card"><p>{t('noHouse')}</p><button type="button" className="btn gold block" onClick={findFree}><Icon name="home" />{t('findFree')}</button></section>}
      {profile.plots.map((p) => <HouseCard key={p.plot} plot={p} />)}
      <Section title={t('invite')} icon="users">
        <div className="row between"><span className="muted">{t('invited')}: <b>{profile.invited}</b></span><button type="button" className="btn small" onClick={() => run(() => copyText(inviteUrl(profile.ref)), t('copied'))}><Icon name="link" />{t('share')}</button></div>
      </Section>
      <div className="menu-list">
        <RowLink icon="gift" text={t('giftsTitle')} note={profile.transfers.length > 0 && <i className="dot flat">{profile.transfers.length}</i>} onClick={() => openPanel({ kind: 'gifts' })} />
        <RowLink icon="orders" text={t('myOrders')} onClick={() => openPanel({ kind: 'orders' })} />
        <RowLink icon="ads" text={t('myAds2')} onClick={() => openPanel({ kind: 'ads' })} />
        <RowLink icon="user" text={t('avatar')} onClick={() => openPanel({ kind: 'avatar' })} />
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
