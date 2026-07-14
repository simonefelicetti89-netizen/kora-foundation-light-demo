// sentry.edge.config.ts — B170, hardened in SENTRY-PRIVACY-HARDENING-06
// Data scrubbing: vedi lib/sentry/scrub.ts — beforeSend/beforeBreadcrumb
// centralizzati, unica fonte di sanitizzazione per client/server/edge.

import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent, scrubSentryBreadcrumb } from '@/lib/sentry/scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_KORA_ENV ?? 'development',

  tracesSampleRate: 0.1,

  // Esplicito, non affidato al default dell'SDK — nessun dato di richiesta
  // grezzo (IP, cookie, header) inviato a Sentry.
  sendDefaultPii: false,

  enabled: process.env.NODE_ENV === 'production',

  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
});
