import { start } from '../app/start.ts';
import { useT } from '../app/i18n.ts';
import { setApp, useApp, write } from '../app/store.ts';
import type { Lang } from '../../../../packages/shared/src/index.ts';

function LangSwitch(): React.JSX.Element {
  const lang = useApp((s) => s.lang);
  const pick = (v: Lang): void => {
    write('lang', v);
    document.documentElement.lang = v;
    setApp({ lang: v });
  };
  return <div className="lang">{(['uz', 'ru'] as const).map((v) => <button type="button" key={v} aria-pressed={v === lang} onClick={() => pick(v)}>{v.toUpperCase()}</button>)}</div>;
}

export function Cover(): React.JSX.Element {
  const t = useT();
  const { stage, progress, error } = useApp();
  const isTouch = matchMedia('(pointer: coarse)').matches;
  if (stage === 'intro') {
    return (
      <div className="cover see">
        <LangSwitch />
        <div className="inner">
          <div><h1>{t('introTitle')}</h1><p>{t('introLead')}</p></div>
          <ul className="tips">
            <li><b aria-hidden="true">{isTouch ? '🕹️' : '⌨️'}</b>{t(isTouch ? 'introMoveTouch' : 'introMoveKeys')}</li>
            <li><b aria-hidden="true">👆</b>{t('introTap')}</li>
            <li><b aria-hidden="true">🏠</b>{t('introClaim')}</li>
          </ul>
          <button type="button" className="btn clay block" autoFocus onClick={() => { write('intro', '1'); setApp({ stage: 'play' }); }}>{t('enter')} →</button>
        </div>
      </div>
    );
  }
  return (
    <div className="cover">
      <LangSwitch />
      <div className="inner">
        <img src="/logo.svg" alt="" width={104} height={104} />
        <h1>{t('cityName')}</h1>
        {stage === 'error'
          ? <><p role="alert">{error === 'webgl' ? t('noWebgl') : t('loadFail')}</p><button type="button" className="btn clay" onClick={() => void start()}>{t('retry')}</button></>
          : <><p>{t('loading')}</p><div className="track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><i style={{ transform: `scaleX(${0.05 + progress * 0.95})` }} /></div></>}
      </div>
    </div>
  );
}
