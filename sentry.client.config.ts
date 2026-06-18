// sentry.client.config.ts — B170
// Privacy KORA: replays DISABILITATI. Solo cattura errori, zero session recording.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_KORA_ENV ?? 'development',

  tracesSampleRate: 0.1,

  // Session replay: DISABILITATO per policy privacy KORA.
  // Sentry non deve registrare sessioni utente — solo errori.
  // Nessuna integrazione di tipo replay è inclusa.

  // Non inviare eventi in development — evita rumore nel progetto Sentry.
  enabled: process.env.NODE_ENV === 'production',
});
