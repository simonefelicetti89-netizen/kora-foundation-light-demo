'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect }   from 'react';
import Link            from 'next/link';

export default function AdminError({
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
      data-testid="admin-error-boundary"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
        KORA Admin
      </p>
      <h1 className="text-xl font-bold text-[#06032B]">Errore nell&apos;area Admin</h1>
      <p className="text-sm text-[rgba(6,3,43,0.62)]">
        Si è verificato un errore inatteso. Il problema è stato segnalato automaticamente.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-4 py-2 rounded-lg bg-[#B5512E] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
        >
          Riprova
        </button>
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg border border-[rgba(6,3,43,0.12)] text-sm text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          ← Dashboard Admin
        </Link>
      </div>
    </div>
  );
}
