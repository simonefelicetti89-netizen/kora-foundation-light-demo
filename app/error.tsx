'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect }   from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-kora-canvas text-kora-ink-warm"
      data-testid="root-error-boundary"
    >
      <p className="font-['Hanken_Grotesk'] text-base text-[rgba(6,3,43,0.64)]">
        Qualcosa non ha funzionato.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-kora-cotto text-white font-['Hanken_Grotesk'] text-sm hover:opacity-90 transition-opacity"
      >
        Riprova
      </button>
    </div>
  );
}
