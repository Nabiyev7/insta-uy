/** Menyu, sozlamalar, yordam va qoidalar. */
import type { Lang } from '../../../../packages/shared/src/index.ts';
import { rpc, signOut } from '../app/api.ts';
import { startAudio, stopAudio } from '../app/audio.ts';
import { useT, type Key } from '../app/i18n.ts';
import { openPanel, openRoot, refreshProfile, setApp, setting, useApp, write } from '../app/store.ts';
import { Icon, type IconName } from './icons.tsx';
import { RowLink, Section, Seg, Sheet, useAction } from './kit.tsx';
import { FAQ, PRIVACY, RULES, type Doc } from './legal.ts';

/** Kanal nomi sozlamada bo'sh bo'lsa shu (egasi bergan). */
const CHANNEL = 'citylanduz';
const telegramUrl = (name: string): string => `https://t.me/${encodeURIComponent(name)}`;
const hideScreen = (): void => {
  openRoot(null);
  setApp({ isClean: true });
};

const LANGS = [['uz', "O'zbekcha"], ['ru', 'Русский']] as const;
const pickLang = (v: Lang): void => {
  write('lang', v);
  document.documentElement.lang = v;
  setApp({ lang: v });
};

type MenuKind = 'city' | 'gazette' | 'avatar' | 'cars' | 'coins' | 'settings' | 'help' | 'rules' | 'privacy';
const MENU: readonly (readonly [Key, readonly (readonly [MenuKind, IconName, Key])[]])[] = [
  ['mCity', [['city', 'bank', 'cityWorks']]],
  ['mMe', [['cars', 'drive', 'myCars'], ['coins', 'coin', 'coins']]],
  ['mMore', [['settings', 'settings', 'settings'], ['help', 'help', 'help'], ['rules', 'rules', 'rules'], ['privacy', 'privacy', 'privacy']]],
];
export function MenuPanel(): React.JSX.Element {
  const t = useT();
  const isGuest = useApp((s) => s.profile === null);
  const { isBusy, run } = useAction();
  const channel = setting('telegram_channel', '') || CHANNEL;
  return (
    <Sheet title={t('menu')}>
      {MENU.map(([group, items]) => (
        <Section key={group} title={t(group)}>
          <div className="menu-list">
            {items.map(([kind, icon, key]) => <RowLink key={kind} icon={icon} text={t(key)} onClick={() => openPanel({ kind })} />)}
            {group === 'mCity' && <a className="row-link" href={telegramUrl(channel)} target="_blank" rel="noopener noreferrer"><Icon name="telegram" /><span className="grow">{t('chan')}<small className="muted"> @{channel}</small></span><Icon name="next" className="chev" /></a>}
            {group === 'mMore' && <RowLink icon="eyeOff" text={t('hideUi')} onClick={hideScreen} />}
          </div>
        </Section>
      ))}
      {!isGuest && <RowLink icon="logout" text={t('logout')} isDanger isDisabled={isBusy} onClick={() => void run(async () => { await signOut(); openRoot(null); })} />}
    </Sheet>
  );
}

/** Sozlamalarda faqat Til va Ovoz (sifat — doim "Avto", interfeys — doim to'q). Adminga — sinov rejimi. */
export function SettingsPanel(): React.JSX.Element {
  const t = useT();
  const { lang, isSound, profile } = useApp();
  const { run } = useAction();
  const setSound = (v: 'on' | 'off'): void => {
    write('sound', v === 'on' ? '1' : '0');
    setApp({ isSound: v === 'on' });
    if (v === 'on') startAudio();
    else stopAudio();
  };
  return (
    <Sheet title={t('settings')}>
      <Section title={t('language')}><Seg label={t('language')} value={lang} onPick={pickLang} options={LANGS} /></Section>
      <Section title={t('sound')}><Seg<'on' | 'off'> label={t('sound')} value={isSound ? 'on' : 'off'} onPick={setSound} options={[['on', t('on')], ['off', t('off')]]} /></Section>
      {profile?.role === 'admin' && <Section title={t('testMode')}>
        <p className="muted">{t('testModeHint')}</p>
        <Seg<'on' | 'off'> label={t('testMode')} value={profile.test_mode ? 'on' : 'off'} onPick={(v) => void run(async () => { await rpc('my_test_mode', { p_on: v === 'on' }); await refreshProfile(); }, t('saved'))} options={[['on', t('on')], ['off', t('off')]]} />
      </Section>}
      <RowLink icon="eyeOff" text={t('hideUi')} onClick={hideScreen} />
    </Sheet>
  );
}

function DocPanel({ title, doc, children }: { readonly title: string; readonly doc: Doc; readonly children?: React.ReactNode }): React.JSX.Element {
  const lang = useApp((s) => s.lang);
  return (
    <Sheet title={title}>
      <div className="prose">{doc[lang].map(([head, points]) => <section key={head}><h3>{head}</h3><ul>{points.map((p) => <li key={p}>{p}</li>)}</ul></section>)}</div>
      {children}
    </Sheet>
  );
}
export function HelpPanel(): React.JSX.Element {
  const t = useT();
  const bot = setting('telegram_bot', '');
  const channel = setting('telegram_channel', '') || CHANNEL;
  return <DocPanel title={t('help')} doc={FAQ}>{bot && <a className="btn" href={`${telegramUrl(bot)}?start=yordam`} target="_blank" rel="noopener noreferrer"><Icon name="telegram" />{t('askAdmin')}</a>}<a className="btn soft" href={telegramUrl(channel)} target="_blank" rel="noopener noreferrer"><Icon name="ads" />@{channel}</a></DocPanel>;
}
export function RulesPanel(): React.JSX.Element {
  return <DocPanel title={useT()('rules')} doc={RULES} />;
}
export function PrivacyPanel(): React.JSX.Element {
  return <DocPanel title={useT()('privacy')} doc={PRIVACY} />;
}
