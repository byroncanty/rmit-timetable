/// <reference types="vitest/config" />
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { proxyIcal } from './server/fetchIcal.ts';

// Serves /timetable.ics locally, fetched live from ICAL_URL (in production it's a static file).
function timetableProxy(feedUrl: string | undefined): Plugin {
  const handler = async (_req: IncomingMessage, res: ServerResponse) => {
    const r = await proxyIcal(feedUrl);
    res.writeHead(r.status, r.headers);
    res.end(r.body);
  };
  return {
    name: 'timetable-proxy',
    configureServer(server) {
      server.middlewares.use('/timetable.ics', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/timetable.ics', handler);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: './', // relative URLs, so the build works at github.io/<repo>/ or any other path
    plugins: [react(), tailwindcss(), timetableProxy(env.ICAL_URL)],
    test: { environment: 'node' },
  };
});
