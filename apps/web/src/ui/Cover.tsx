/** Yuklanish, birinchi kirish ko'rsatmasi, xato ekrani. */
import { useState } from 'react';
import { start } from '../app/start.ts';
import { useT, type Key } from '../app/i18n.ts';
import { setApp, useApp, write } from '../app/store.ts';
import type { Lang } from '../../../../packages/shared/src/index.ts';
import { Icon, type IconName } from './icons.tsx';

function LangSwitch(): React.JSX.Element {
  const lang = useApp((s) => s.lang);
  const pick = (v: Lang): void => {
    write('lang', v);
    document.documentElement.lang = v;
    setApp({ lang: v });
  };
  return <div className="lang">{(['uz', 'ru'] as const).map((v) => <button type="button" key={v} aria-pressed={v === lang} onClick={() => pick(v)}>{v.toUpperCase()}</button>)}</div>;
}

/** 3D qatlam yiqilsa yoki WebGL konteksti yo'qolsa. */
export function Crash(): React.JSX.Element {
  const t = useT();
  return <div className="cover"><div className="inner"><h1>{t('cityName')}</h1><p role="alert">{t('e_unknown')}</p><button type="button" className="btn gold" onClick={() => location.reload()}>{t('retry')}</button></div></div>;
}

const STEPS: readonly (readonly [IconName, Key, Key])[] = [['swipe', 'stepLook', 'stepLookTouch'], ['pin', 'stepPick', 'stepPickText'], ['home', 'stepBuild', 'stepBuildText']];
/** Birinchi kirishda 3 qadam: aylanib ko'r → joy tanla → uyingni qur. */
function Guide(): React.JSX.Element {
  const t = useT();
  const [step, setStep] = useState(0);
  const isTouch = matchMedia('(pointer: coarse)').matches;
  const [icon, title, text] = STEPS[step] ?? STEPS[0]!;
  const isLast = step === STEPS.length - 1;
  const enter = (): void => {
    write('intro', '1');
    setApp({ stage: 'play' });
  };
  return (
    <div className="cover see">
      <LangSwitch />
      <div className="inner guide" key={step}>
        <span className="step-pic" aria-hidden="true"><Icon name={icon} /></span>
        <div><small>{step + 1} / {STEPS.length}</small><h1>{t(title)}</h1><p>{t(step === 0 && !isTouch ? 'stepLookKeys' : text)}</p></div>
        <div className="dots" aria-hidden="true">{STEPS.map(([k], i) => <i key={k} className={i === step ? 'on' : ''} />)}</div>
        <button type="button" className="btn gold block big" autoFocus onClick={isLast ? enter : () => setStep(step + 1)}>{t(isLast ? 'enter' : 'next')}<Icon name="next" /></button>
        {!isLast && <button type="button" className="link" onClick={enter}>{t('skip')}</button>}
      </div>
    </div>
  );
}

export function Cover(): React.JSX.Element {
  const t = useT();
  const { stage, progress, error, isOffline } = useApp();
  if (stage === 'intro') return <Guide />;
  return (
    <div className="cover">
      <LangSwitch />
      <div className="inner">
        <img src="/logo.svg" alt="" width={104} height={104} />
        <h1>{t('cityName')}</h1>
        {stage === 'error'
          ? <><p role="alert">{error === 'webgl' ? t('noWebgl') : t(isOffline ? 'offline' : 'loadFail')}</p><button type="button" className="btn gold" onClick={() => void start()}><Icon name="refresh" />{t('retry')}</button></>
          : <><p>{t('loading')}</p><div className="track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ transform: `scaleX(${0.05 + progress * 0.95})` }} /></div></>}
      </div>
    </div>
  );
}
