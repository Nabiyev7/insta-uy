import { useEffect } from 'react';
import { useApp, type Panel } from './store.ts';
import { attachControls } from './controls.ts';
import { World } from '../world/World.tsx';
import { Cover, Crash } from '../ui/Cover.tsx';
import { ErrorBoundary } from '../ui/ErrorBoundary.tsx';
import { Hud } from '../ui/Hud.tsx';
import { AuthPanel } from '../ui/AuthPanel.tsx';
import { HelpPanel, MenuPanel, PrivacyPanel, RulesPanel, SettingsPanel } from '../ui/InfoPanels.tsx';
import { AvatarPanel, MePanel } from '../ui/MePanel.tsx';
import { AdsPanel, OrdersPanel } from '../ui/OrderPanels.tsx';
import { ChatPanel } from '../ui/ChatPanel.tsx';
import { CarsPanel, ShopPanel } from '../ui/ShopPanel.tsx';
import { CongratsPanel } from '../ui/CongratsPanel.tsx';
import { BuildingPanel, CommercePanel, MapPanel, PlotPanel, StreetPanel } from '../ui/PlacePanels.tsx';
import { CityPanel, CoinsPanel, GazettePanel, RankPanel } from '../ui/SocialPanels.tsx';

function PanelView({ panel }: { readonly panel: Panel }): React.JSX.Element {
  switch (panel.kind) {
    case 'congrats': return <CongratsPanel key={panel.id} id={panel.id} />;
    case 'plot': return <PlotPanel key={panel.id} id={panel.id} />;
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
  return <div className="toasts" role="status" aria-live="polite">{toasts.map((x) => <p key={x.id} className={x.isError ? 'error' : ''}>{x.text}</p>)}</div>;
}

export function App(): React.JSX.Element {
  const stage = useApp((s) => s.stage);
  const panel = useApp((s) => s.panel);
  useEffect(() => attachControls(), []);
  return (
    <main>
      <ErrorBoundary fallback={<Crash />}><World /></ErrorBoundary>
      {stage === 'play' && <Hud />}
      {stage !== 'play' && <Cover />}
      {panel && stage === 'play' && <ErrorBoundary key={JSON.stringify(panel)} fallback={null}><PanelView panel={panel} /></ErrorBoundary>}
      <Toasts />
    </main>
  );
}
