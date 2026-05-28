'use client';

import Link from 'next/link';
import { useRole } from '@/lib/demo-state';
import { isAdminRole } from '@/lib/permissions';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';

// C-06 (boundary): Scoring Preview è uno strumento interno KORA Admin.
// L'azienda vede solo output validati, readiness e report.
// La metodologia governa il calcolo; il cockpit aziendale non consente scoring run o override.
export default function ScoringBoundaryNotice() {
  const { activeRole } = useRole();
  const isAdmin = isAdminRole(activeRole);

  return (
    <div className="space-y-6 max-w-xl">

      <OperatorToolBoundary />

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Scoring Preview
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">
          Scoring Preview è uno strumento interno KORA Admin.
        </h1>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-4 text-sm text-indigo-800 leading-relaxed space-y-2">
        <p className="font-semibold">
          L&apos;azienda vede solo output validati, readiness e report.
        </p>
        <p>
          La metodologia KORA governa il calcolo. Il cockpit aziendale non consente scoring run o override metodologici.
        </p>
        <p>
          Il KORA Index, il Confidence Score e l&apos;Activation Safeguard sono prodotti dall&apos;engine KORA Admin
          dopo data intake, validazione UEF e scoring readiness.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">Come accedere agli output validati:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Il KORA Index è disponibile nel <span className="font-medium">KORA Index Detail</span> quando il calcolo è pronto.</li>
          <li>I report aggregati sono disponibili nel <span className="font-medium">Decision Pack</span>.</li>
          <li>La readiness dei dati è visibile nell&apos;<span className="font-medium">Onboarding Room</span>.</li>
        </ul>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/company/kora-index"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          Vai al KORA Index
        </Link>
        <Link
          href="/company/reports"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Vai ai Report
        </Link>
        <Link
          href="/company/onboarding"
          className="text-sm text-slate-500 hover:text-slate-700 hover:underline"
        >
          Onboarding Room
        </Link>
      </div>

      {isAdmin && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 flex items-center justify-between gap-4">
          <p className="text-xs font-semibold text-violet-800">KORA Admin — Data Intake</p>
          <Link
            href="/admin/companies/data-intake"
            className="text-xs font-semibold text-violet-600 hover:underline whitespace-nowrap"
          >
            Apri Data Intake →
          </Link>
        </div>
      )}

      <p className="text-[10px] font-mono text-slate-300">
        KORA Methodology v0.1 · pre_empirical_calibration · scoring run = KORA Admin only
      </p>
    </div>
  );
}
