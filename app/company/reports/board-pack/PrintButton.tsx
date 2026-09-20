'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-kora-ink bg-kora-ink px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
    >
      Scarica / stampa Board Pack
    </button>
  );
}
