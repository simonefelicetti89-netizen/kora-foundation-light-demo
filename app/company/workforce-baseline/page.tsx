import Link from 'next/link';

// C-15 (retired): Workforce Baseline — moved to KORA Admin
// Operational workspace now lives at /admin/companies/workforce-baseline
export default function WorkforceBaselineBoundaryNotice() {
  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Workforce Baseline
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">Questa funzione è gestita lato KORA Admin.</h1>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-4 text-sm text-[rgba(6,3,43,0.62)] leading-relaxed space-y-2">
        <p>
          Il setup operativo e la validazione dati sono gestiti lato KORA Admin.
        </p>
        <p>
          Lo stato della workforce baseline è visibile nel tuo profilo KORA.
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.40)]">
          KORA misura l&apos;organizzazione, non gli individui.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/company/profile"
          className="rounded-md bg-[#06032B] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Il tuo spazio KORA
        </Link>
        <Link
          href="/company"
          className="text-sm text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.78)] hover:underline"
        >
          Executive Cockpit
        </Link>
      </div>
    </div>
  );
}
