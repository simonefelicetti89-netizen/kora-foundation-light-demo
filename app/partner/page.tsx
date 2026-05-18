// P-01: Partner Dashboard — Foundation Light Preview
export default function PartnerDashboard() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Partner Workspace</h1>
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
            Foundation Light Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Partner role in the KORA ecosystem.
        </p>
      </div>

      <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-sm font-semibold text-indigo-800 mb-2">What partners do in KORA</p>
        <p className="text-sm text-indigo-700 leading-relaxed">
          Partners provide services, contribute to collective initiatives, upload activity evidence,
          and support verification workflows within KORA-enrolled companies.
          Their contribution is measured, pillar-coded, and carries a certification status
          that affects the Verification Rate of the companies they serve.
        </p>
        <p className="text-xs text-indigo-600 mt-2">
          Foundation Light shows the partner role concept only. The full workspace
          — including initiative management, evidence upload, and certification status —
          is available in the pilot phase.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What this workspace will include
        </p>
        <div className="space-y-2">
          {[
            'Service catalog — pillar-coded service portfolio',
            'Collective initiative participation and evidence upload',
            'Certification status and verification tier',
            'Company assignment overview (aggregate only, no individual worker data)',
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
        No marketplace · No pricing engine · No payment execution · No booking engine ·
        Partner workspace is a coordination and evidence layer, not a commercial platform.
      </div>
    </div>
  );
}
