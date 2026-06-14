// C-14: UEF Review — strumento operativo KORA Admin, non accessibile al Company Admin.
// Scopo: boundary notice onesto che spiega dove va la revisione UEF.

import Link from 'next/link';

export default function UEFReviewBoundary() {
  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          Operator Review Queue
        </p>
        <h1 className="text-xl font-bold text-[#06032B] mt-0.5">
          UEF Review è uno strumento KORA Admin.
        </h1>
      </div>

      {/* ── Boundary notice ────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-4 text-sm text-[rgba(6,3,43,0.88)] leading-relaxed space-y-2">
        <p className="font-semibold">
          La revisione UEF avviene nel workspace KORA Operator.
        </p>
        <p>
          La revisione dei record Unified Event Frame — classificazione, evidenze, eligibility — è uno strumento
          operativo riservato a KORA Admin e agli Advisor. Il Company Admin riceve solo output validati.
        </p>
        <p>
          Il KORA Index, il Confidence Score e l&apos;Activation Safeguard sono prodotti dall&apos;engine KORA Admin
          dopo data intake, validazione UEF e scoring readiness.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <Link
          href="/company/workspace"
          className="rounded-md bg-[#06032B] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
        >
          Torna al Workspace
        </Link>
        <Link
          href="/company/kora-index"
          className="rounded-md border border-[rgba(6,3,43,0.14)] bg-[#F8F6F1] px-4 py-2 text-sm font-semibold text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
        >
          KORA Index →
        </Link>
        <Link
          href="/company/reports"
          className="text-sm text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.78)] hover:underline"
        >
          Decision Pack →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
        KORA Index v1.0 · pre_empirical_calibration · UEF Review = KORA Admin only
      </p>
    </div>
  );
}
