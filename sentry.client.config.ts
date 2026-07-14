// sentry.client.config.ts — B170, hardened in SENTRY-PRIVACY-HARDENING-06
// Privacy KORA: replays DISABILITATI. Solo cattura errori, zero session recording.
// Data scrubbing: vedi lib/sentry/scrub.ts — beforeSend/beforeBreadcrumb
// centralizzati, unica fonte di sanitizzazione per client/server/edge.

import * as Sentry from '@sentry/nextjs';
import { scrubSentryEvent, scrubSentryBreadcrumb } from '@/lib/sentry/scrub';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_KORA_ENV ?? 'development',

  tracesSampleRate: 0.1,

  // Esplicito, non affidato al default dell'SDK — KORA non invia mai IP,
  // cookie, o header Authorization grezzi a Sentry.
  sendDefaultPii: false,

  // Session replay: DISABILITATO per policy privacy KORA.
  // Sentry non deve registrare sessioni utente — solo errori.
  // Nessuna integrazione di tipo replay è inclusa.

  // Non inviare eventi in development — evita rumore nel progetto Sentry.
  enabled: process.env.NODE_ENV === 'production',

  beforeSend: scrubSentryEvent,
  beforeBreadcrumb: scrubSentryBreadcrumb,
});
