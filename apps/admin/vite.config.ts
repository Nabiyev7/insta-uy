import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

const API = process.env.DEV_API ?? 'http://127.0.0.1:8787';
const planFile = new URL('../../packages/shared/data/masterplan.json', import.meta.url);

const masterPlan = (): Plugin => ({
  name: 'master-plan',
  configureServer(server) {
    server.middlewares.use('/assets/masterplan.json', (_req, res) => {
      res.setHeader('content-type', 'application/json');
      res.end(readFileSync(planFile));
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'assets/masterplan.json', source: readFileSync(planFile) });
  },
});

export default defineConfig({
  plugins: [react(), masterPlan()],
  server: { proxy: { '/rest': API, '/auth': API, '/storage': API, '/pay': API } },
  build: { target: 'es2022' },
});
