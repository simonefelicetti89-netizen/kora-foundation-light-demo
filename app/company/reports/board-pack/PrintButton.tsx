'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
    >
      Scarica / stampa Board Pack
    </button>
  );
}
