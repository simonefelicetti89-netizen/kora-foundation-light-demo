'use client';

import Link from 'next/link';
import { useRole } from '@/lib/demo-state';
import { isAdminRole } from '@/lib/permissions';
import { OperatorToolBoundary } from '@/components/demo/OperatorToolBoundary';
import { DataLineagePreview } from '@/components/demo/DataLineagePreview';

// C-06 (boundary): Scoring Preview è uno strumento interno KORA Admin.
// L'azienda vede solo output validati, readiness e report.
// La metodologia governa il calcolo; il cockpit aziendale non consente scoring run o override.
export default function ScoringBoundaryNotice() {
  const { activeRole } = useRole();
  const isAdmin = isAdminRole(activeRole);

  return (
    <div className="space-y-6 max-w-2xl">

      <OperatorToolBoundary />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Scoring Preview
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">
          Scoring Preview è uno strumento interno KORA Admin.
        </h1>
      </div>

      {/* ── Boundary notice ────────────────────────────────────────────────── */}
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

      {/* ── Flow navigation (Operator flow) ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/company/uef-review"
          className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          ← Operator Review Queue
        </Link>
        <span className="text-slate-300 font-mono">·</span>
        <span className="rounded border border-slate-400 bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
          Scoring Preview
        </span>
        <span className="text-slate-300 font-mono">·</span>
        <Link
          href="/company/kora-index"
          className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          KORA Index →
        </Link>
        <Link
          href="/company/reports"
          className="flex items-center gap-1.5 rounded border border-slate-200 bg-white px-3 py-1.5 text-slate-500 hover:bg-slate-50 transition-colors"
        >
          Decision Pack →
        </Link>
      </div>

      {/* ── Access to validated outputs ─────────────────────────────────────── */}
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

      {/* ── Part 3: Lineage Snapshot ──────────────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-700">Lineage Snapshot</h2>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Ogni macroblocco dell&apos;Index deve poter essere ricondotto a fonti, regole e decisioni di review.
            Il calcolo non è una scatola nera — ogni output ha un percorso tracciabile.
          </p>
        </div>

        <DataLineagePreview compact showHeader={false} showMethodologyNote />

        <div className="grid gap-2 sm:grid-cols-3 text-[10px] text-slate-500">
          <div className="rounded border border-slate-100 bg-slate-50 px-2.5 py-2">
            <p className="font-semibold text-slate-600 mb-0.5">Eligible</p>
            <p>IU generati · BTI full_weight · contribuisce al KORA Index.</p>
          </div>
          <div className="rounded border border-indigo-100 bg-indigo-50 px-2.5 py-2">
            <p className="font-semibold text-indigo-700 mb-0.5">Limited</p>
            <p>tracked_only · economic_relief_spend in BTI · 0 IU · activation opportunity.</p>
          </div>
          <div className="rounded border border-rose-100 bg-rose-50 px-2.5 py-2">
            <p className="font-semibold text-rose-700 mb-0.5">Blocked</p>
            <p>0 IU · 0 KORA Index · Blocked by Design · non penalizzato.</p>
          </div>
        </div>
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
        KORA Methodology v0.1 · pre_empirical_calibration · scoring run = KORA Admin only · synthetic_demo_data: true
      </p>
    </div>
  );
}
