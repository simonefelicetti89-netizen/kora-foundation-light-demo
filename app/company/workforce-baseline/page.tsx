import Link from 'next/link';

// C-15 (retired): Workforce Baseline — moved to KORA Admin
// Operational workspace now lives at /admin/companies/workforce-baseline
export default function WorkforceBaselineBoundaryNotice() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Workforce Baseline
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Questa funzione è gestita lato KORA Admin.</h1>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 leading-relaxed space-y-2">
        <p>
          Il setup operativo e la validazione dati sono gestiti lato KORA Admin.
        </p>
        <p>
          Lo stato della workforce baseline è visibile nel tuo profilo KORA.
        </p>
        <p className="text-xs text-slate-400">
          KORA misura l&apos;organizzazione, non gli individui.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/company/profile"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Il tuo spazio KORA
        </Link>
        <Link
          href="/company"
          className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Executive Cockpit
        </Link>
      </div>
    </div>
  );
}
