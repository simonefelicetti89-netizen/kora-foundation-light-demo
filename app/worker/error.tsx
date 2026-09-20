'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect }   from 'react';

export default function WorkerError({
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
      className="flex flex-col items-start gap-4 p-8 max-w-xl"
      data-testid="worker-error-boundary"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
        Worker Space
      </p>
      <h1 className="text-xl font-bold text-kora-ink">Errore nel Worker Space</h1>
      <p className="text-sm text-[rgba(6,3,43,0.62)]">
        Si è verificato un errore inatteso. Il problema è stato segnalato automaticamente.
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-lg bg-kora-cotto text-white text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Riprova
      </button>
    </div>
  );
}
