/** Xatolar monitoringi: Sentry "envelope" API — kutubxonasiz (DSN bo'lmasa o'chiq). */
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
const MAX_REPORTS = 10;
let sent = 0;

const report = (message: string, stack: string | undefined): void => {
  const m = /^https:\/\/([^@]+)@([^/]+)\/(\d+)$/.exec(DSN ?? '');
  if (!m || sent >= MAX_REPORTS) return;
  sent += 1;
  const [, key, host, project] = m;
  const id = crypto.randomUUID().replaceAll('-', '');
  const event = { event_id: id, level: 'error', platform: 'javascript', message: message.slice(0, 500), extra: { stack: stack?.slice(0, 2000) }, request: { url: location.pathname }, tags: { ua: navigator.userAgent.slice(0, 120) } };
  const body = [JSON.stringify({ event_id: id, sent_at: new Date().toISOString() }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
  navigator.sendBeacon(`https://${host}/api/${project}/envelope/?sentry_key=${key}&sentry_version=7`, body);
};

export const initMonitoring = (): void => {
  addEventListener('error', (e) => report(e.message, e.error instanceof Error ? e.error.stack : undefined));
  addEventListener('unhandledrejection', (e) => report(String(e.reason), e.reason instanceof Error ? e.reason.stack : undefined));
};
