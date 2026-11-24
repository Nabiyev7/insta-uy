import type { Lang } from '../../../../packages/shared/src/index.ts';
import { forgetMe } from '../app/multiplayer.ts';
import { post, signOut } from '../app/api.ts';
import { startAudio, stopAudio } from '../app/audio.ts';
import { useT } from '../app/i18n.ts';
import { openPanel, setApp, setting, useApp, write, type Panel } from '../app/store.ts';
import type { QualityLevel } from '../logic/quality.ts';
import { Section, Seg, Sheet, useAction } from './kit.tsx';
import { FAQ, PRIVACY, RULES, type Doc } from './legal.ts';

const back = (): void => openPanel({ kind: 'menu' });
type SimpleKind = Exclude<Panel['kind'], 'plot' | 'building' | 'commerce' | 'street'>;

const LANGS = [['uz', "O'zbekcha"], ['ru', 'Русский']] as const;
const pickLang = (v: Lang): void => {
  write('lang', v);
  document.documentElement.lang = v;
  setApp({ lang: v });
};

export function MenuPanel(): React.JSX.Element {
  const t = useT();
  const lang = useApp((s) => s.lang);
  const items: readonly (readonly [SimpleKind, string, string])[] = [
    ['city', '🏛️', t('city')], ['gazette', '📰', t('gazette')], ['coins', '💰', t('coins')], ['avatar', '👤', t('avatar')], ['cars', '🚗', t('cars')],
    ['settings', '⚙️', t('settings')], ['help', '💬', t('help')], ['rules', '📜', t('rules')], ['privacy', '🔒', t('privacy')],
  ];
  return (
    <Sheet title={t('menu')}>
      <div className="menu-grid">{items.map(([kind, icon, text]) => <button type="button" key={kind} onClick={() => openPanel({ kind } as Panel)}><i aria-hidden="true">{icon}</i>{text}</button>)}</div>
      <Section title={t('language')}><Seg label={t('language')} value={lang} onPick={pickLang} options={LANGS} /></Section>
    </Sheet>
  );
}

export function SettingsPanel(): React.JSX.Element {
  const t = useT();
  const { lang, quality, isAutoQuality, isSound, profile } = useApp();
  const { isBusy, run } = useAction();
  const setQuality = (v: QualityLevel | 'auto'): void => {
    write('quality', v === 'auto' ? '' : v);
    setApp(v === 'auto' ? { isAutoQuality: true } : { isAutoQuality: false, quality: v });
  };
  const setSound = (v: 'on' | 'off'): void => {
    write('sound', v === 'on' ? '1' : '0');
    setApp({ isSound: v === 'on' });
    if (v === 'on') startAudio();
    else stopAudio();
  };
  const remove = (): void => {
    if (!confirm(t('deleteSure'))) return;
    void run(async () => {
      forgetMe();
      await post('/auth/delete', {}, true);
      await signOut();
      openPanel(null);
    });
  };
  return (
    <Sheet title={t('settings')} onBack={back}>
      <Section title={t('language')}><Seg label={t('language')} value={lang} onPick={pickLang} options={LANGS} /></Section>
      <Section title={t('quality')}><Seg<QualityLevel | 'auto'> label={t('quality')} value={isAutoQuality ? 'auto' : quality} onPick={setQuality} options={[['auto', t('auto')], ['low', t('low')], ['mid', t('mid')], ['high', t('high')]]} /></Section>
      <Section title={t('sound')}><Seg<'on' | 'off'> label={t('sound')} value={isSound ? 'on' : 'off'} onPick={setSound} options={[['on', t('on')], ['off', t('off')]]} /></Section>
      {profile && <Section title={t('deleteAcc')}><p className="muted">{t('deleteWhat')}</p><button type="button" className="btn small clay" disabled={isBusy} onClick={remove}>{t('deleteAcc')}</button></Section>}
    </Sheet>
  );
}

function DocPanel({ title, doc, children }: { readonly title: string; readonly doc: Doc; readonly children?: React.ReactNode }): React.JSX.Element {
  const lang = useApp((s) => s.lang);
  return (
    <Sheet title={title} onBack={back}>
      <div className="prose">{doc[lang].map(([head, points]) => <section key={head}><h3>{head}</h3><ul>{points.map((p) => <li key={p}>{p}</li>)}</ul></section>)}</div>
      {children}
    </Sheet>
  );
}
export function HelpPanel(): React.JSX.Element {
  const t = useT();
  const bot = setting('telegram_bot', '');
  return <DocPanel title={t('help')} doc={FAQ}>{bot && <a className="btn" href={`https://t.me/${encodeURIComponent(bot)}`} target="_blank" rel="noopener noreferrer">✈️ {t('supportTg')}</a>}</DocPanel>;
}
export function RulesPanel(): React.JSX.Element {
  return <DocPanel title={useT()('rules')} doc={RULES} />;
}
export function PrivacyPanel(): React.JSX.Element {
  return <DocPanel title={useT()('privacy')} doc={PRIVACY} />;
}
