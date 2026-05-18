// AD-01: Advisor Review Workspace — Foundation Light Preview
export default function AdvisorDashboard() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Advisor Review Workspace</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Advisor role in the KORA methodology and evidence layer.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-sm font-semibold text-indigo-800 mb-2">What advisors do in KORA</p>
        <p className="text-sm text-indigo-700 leading-relaxed">
          Advisors support evidence review, eligibility confidence assignment, methodology interpretation,
          and impact programme design across KORA-enrolled companies.
          Their review decisions directly affect the Verification Rate and Confidence Score
          of the KORA Index outputs they are assigned to.
        </p>
        <p className="text-xs text-indigo-600 mt-2">
          Foundation Light shows the advisor role concept only. The full review queue
          — including assigned evidence items, eligibility decisions, and reviewer audit trail —
          is available in the pilot phase.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What this workspace will include
        </p>
        <div className="space-y-2">
          {[
            'Assigned evidence review queue — per company, per pillar',
            'Eligibility confidence assignment (verified / partial / not eligible)',
            'Methodology interpretation support for edge cases',
            'Review audit trail — all decisions are logged and methodology-versioned',
          ].map((item) => (
            <div key={item} className="flex gap-2 text-sm text-slate-600">
              <span className="text-slate-300 shrink-0 mt-0.5">·</span>
              {item}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <p className="font-semibold text-slate-600 mb-1">Scope clarification</p>
        No production review queue active · No real evidence workflow · No certification actions ·
        Advisor decisions in Foundation Light are illustrative only — no real scoring impact.
      </div>
    </div>
  );
}
