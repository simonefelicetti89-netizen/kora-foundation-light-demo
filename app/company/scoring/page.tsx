'use client';
// C-13: Scoring — strumento operativo KORA Operator (non self-service).
// Scopo: mostrare al Company Admin che il scoring è gestito dall'operatore KORA.
// Nessuna azione disponibile qui: lo scoring avviene nel workspace KORA Admin.

import Link from 'next/link';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';

export default function ScoringBoundaryNotice() {
  return (
    <div className="space-y-6 max-w-2xl">

      <OperatorToolBoundary />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Scoring Preview
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">
          Scoring Preview è uno strumento interno KORA Admin.
        </h1>
      </div>

      {/* ── Boundary notice ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-4 text-sm text-[rgba(6,3,43,0.88)] leading-relaxed space-y-2">
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

      {/* ── Access to validated outputs ─────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.52)] space-y-1">
        <p className="font-semibold text-[rgba(6,3,43,0.62)]">Come accedere agli output validati:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Il KORA Index è disponibile nel <span className="font-medium">KORA Index Detail</span> quando il calcolo è pronto.</li>
          <li>I report aggregati sono disponibili nel <span className="font-medium">Decision Pack</span>.</li>
          <li>La readiness dei dati è visibile nell&apos;<span className="font-medium">Onboarding Room</span>.</li>
        </ul>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/company/kora-index"
          className="rounded-md bg-[#06032B] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Vai al KORA Index
        </Link>
        <Link
          href="/company/reports"
          className="rounded-md border border-[rgba(6,3,43,0.14)] bg-[#F8F6F1] px-4 py-2 text-sm font-semibold text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          Vai ai Report
        </Link>
        <Link
          href="/company/workspace"
          className="text-sm text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.78)] hover:underline"
        >
          Torna al Workspace
        </Link>
      </div>

      <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
        KORA Index v1.0 · pre_empirical_calibration · scoring run = KORA Admin only
      </p>
    </div>
  );
}
