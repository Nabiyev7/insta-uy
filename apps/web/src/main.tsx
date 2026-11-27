import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './app/App.tsx';
import { initMonitoring } from './app/monitoring.ts';
import { dictionary } from './app/i18n.ts';
import { setMode } from './app/modes.ts';
import { director, car, city, player, remotes, session, snapshotters } from './app/runtime.ts';
import { startConstruction } from './app/actions.ts';
import { start } from './app/start.ts';
import { useApp } from './app/store.ts';
import { activeBeacons, activeMarkers } from './world/markers.ts';

initMonitoring();
// Faqat ishlab chiqish va e2e sinov uchun.
if (import.meta.env.DEV) Object.assign(window, { __player: player, __remotes: remotes, __city: city, __car: car, __session: session, __director: director, __setMode: setMode, __app: useApp, __texts: dictionary, __markers: activeMarkers, __shot: () => snapshotters.photo?.() ?? null, __build: (id: string, tier?: number) => { const p = useApp.getState().plotById.get(id); if (p) startConstruction(p, tier); } });
/** Ishlab chiqarishda ham (faqat o'qish, shaxsiy ma'lumotsiz): bo'sh joy belgilari holati — `e2e/prod.mjs` tekshiradi. */
Object.assign(window, { __belgilar: () => { const s = useApp.getState(); return { auth: s.authState, uylar: s.profile?.plots.length ?? null, plus: activeMarkers.current?.listed ?? 0, kutyapti: activeBeacons.current?.isOn ?? false }; } });
const root = document.getElementById('root');
if (!root) throw new Error('#root topilmadi');
createRoot(root).render(<App />);
void start();
