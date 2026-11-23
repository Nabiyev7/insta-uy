import { createRoot } from 'react-dom/client';
import './ui/styles.css';
import { App } from './app/App.tsx';
import { initMonitoring } from './app/monitoring.ts';
import { start } from './app/start.ts';

initMonitoring();
const root = document.getElementById('root');
if (!root) throw new Error('#root topilmadi');
createRoot(root).render(<App />);
void start();
