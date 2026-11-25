import { useEffect } from 'react';
import { setApp, useApp, type Panel } from './store.ts';
import { attachControls } from './controls.ts';
import { attachHistory } from './history.ts';
import { World } from '../world/World.tsx';
import { Cover, Crash } from '../ui/Cover.tsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.tsx';
import { Hud } from '../ui/Hud.tsx';
import { AuthPanel } from '../ui/AuthPanel.tsx';
import { HelpPanel, MenuPanel, PrivacyPanel, RulesPanel, SettingsPanel } from '../ui/InfoPanels.tsx';
import { BioPanel, GiftsPanel, YardPanel } from '../ui/HousePanels.tsx';
import { ConfirmDialog } from '../ui/kit.tsx';
import { MapPanel } from '../ui/MapPanel.tsx';
import { AvatarPanel, MePanel } from '../ui/MePanel.tsx';
import { NotesPanel } from '../ui/NotesPanel.tsx';
import { AdsPanel, OrdersPanel } from '../ui/OrderPanels.tsx';
import { ChatPanel } from '../ui/ChatPanel.tsx';
import { CarsPanel, ShopPanel } from '../ui/ShopPanel.tsx';
import { CongratsPanel } from '../ui/CongratsPanel.tsx';
import { BuildingPanel, CivicPanel, CommercePanel, StreetPanel } from '../ui/PlacePanels.tsx';
import { PlotPanel } from '../ui/PlotPanel.tsx';
import { CityPanel, CoinsPanel, GazettePanel, RankPanel } from '../ui/SocialPanels.tsx';

function PanelView({ panel }: { readonly panel: Panel }): React.JSX.Element {
  switch (panel.kind) {
    case 'congrats': return <CongratsPanel key={panel.id} id={panel.id} {...(panel.tier ? { tier: panel.tier } : {})} />;
    case 'plot': return <PlotPanel key={panel.id} id={panel.id} />;
    case 'bio': return <BioPanel id={panel.id} />;
    case 'yard': return <YardPanel id={panel.id} />;
    case 'gifts': return <GiftsPanel {...(panel.to ? { to: panel.to } : {})} />;
    case 'civic': return <CivicPanel id={panel.id} />;
    case 'notes': return <NotesPanel />;
    case 'building': return <BuildingPanel key={panel.id} id={panel.id} />;
    case 'commerce': return <CommercePanel key={panel.id} id={panel.id} />;
    case 'street': return <StreetPanel key={panel.id} id={panel.id} />;
    case 'auth': return <AuthPanel />;
    case 'me': return <MePanel />;
    case 'avatar': return <AvatarPanel />;
    case 'chat': return <ChatPanel />;
    case 'shop': return <ShopPanel />;
    case 'cars': return <CarsPanel />;
    case 'map': return <MapPanel />;
    case 'rank': return <RankPanel />;
    case 'coins': return <CoinsPanel />;
    case 'city': return <CityPanel />;
    case 'gazette': return <GazettePanel />;
    case 'settings': return <SettingsPanel />;
    case 'help': return <HelpPanel />;
    case 'rules': return <RulesPanel />;
    case 'privacy': return <PrivacyPanel />;
    case 'orders': return <OrdersPanel />;
    case 'ads': return <AdsPanel />;
    case 'menu': return <MenuPanel />;
  }
}

function Toasts(): React.JSX.Element {
  const toasts = useApp((s) => s.toasts);
  // Oyna ochiq bo'lsa xabar uning tugmalarini yopmasin — ekran tepasiga chiqadi.
  const hasPanel = useApp((s) => s.panel !== null);
  return <div className={`toasts ${hasPanel ? 'top' : ''}`} role="status" aria-live="polite">{toasts.map((x) => <p key={x.id} className={x.isError ? 'error' : ''}>{x.text}</p>)}</div>;
}

/** Tun rejimi, sifat (past sifatda xiralashtirish o'chadi) va chap qo'l — CSS shu belgilarga qaraydi. */
const useRootLook = (): void => {
  const theme = useApp((s) => s.theme);
  const quality = useApp((s) => s.quality);
  const isLeftHand = useApp((s) => s.isLeftHand);
  useEffect(() => {
    const dark = matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const isDark = theme === 'dark' || (theme === 'auto' && dark.matches);
      Object.assign(document.documentElement.dataset, { theme: isDark ? 'dark' : 'light', quality, hand: isLeftHand ? 'left' : 'right' });
    };
    apply();
    dark.addEventListener('change', apply);
    return () => dark.removeEventListener('change', apply);
  }, [theme, quality, isLeftHand]);
};
const useOnline = (): void => {
  useEffect(() => {
    const update = (): void => setApp({ isOffline: !navigator.onLine });
    addEventListener('online', update);
    addEventListener('offline', update);
    return () => {
      removeEventListener('online', update);
      removeEventListener('offline', update);
    };
  }, []);
};

export function App(): React.JSX.Element {
  const stage = useApp((s) => s.stage);
  const panel = useApp((s) => s.panel);
  useEffect(() => attachControls(), []);
  useEffect(() => attachHistory(), []);
  useRootLook();
  useOnline();
  return (
    <main>
      <ErrorBoundary fallback={<Crash />}><World /></ErrorBoundary>
      {stage === 'play' && <Hud />}
      {stage !== 'play' && <Cover />}
      {panel && stage === 'play' && <ErrorBoundary key={JSON.stringify(panel)} fallback={null}><PanelView panel={panel} /></ErrorBoundary>}
      <Toasts />
      <ConfirmDialog />
    </main>
  );
}
