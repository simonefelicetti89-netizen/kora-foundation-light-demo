import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border-green-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  FLAGGED: 'bg-red-100 text-red-800 border-red-200',
};

export default function IndexRegistry() {
  const entries = adminPreviewService.getIndexRegistryPreview();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">KORA Index Registry</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Internal Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Cross-company KORA Index outputs. Entries marked (~) are synthetic values
          consistent with company demo narratives — not computed from real scoring runs.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_140px_80px_70px_90px_100px] gap-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
          {['Company', 'S', 'Period', 'Index', 'CS', 'Safeguard', 'Calibration'].map((h) => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</p>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map((e) => (
            <div
              key={`${e.company_id}-${e.scenario_id}`}
              className="grid grid-cols-[1fr_60px_140px_80px_70px_90px_100px] gap-0 px-4 py-3 items-center hover:bg-slate-50"
            >
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-sm text-slate-700 truncate">{e.company_name}</p>
                {e.is_synthetic && (
                  <span className="shrink-0 text-[10px] text-slate-300 font-mono" title="Synthetic value">~</span>
                )}
              </div>
              <p className="text-xs font-mono text-slate-600">{e.scenario_id}</p>
              <p className="text-xs text-slate-500">{e.reporting_period}</p>
              <p className="text-lg font-bold text-slate-800">{e.kora_index_value}</p>
              <p className="text-xs font-mono text-slate-500">{(e.confidence_score * 100).toFixed(0)}%</p>
              <div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[e.safeguard_status] ?? 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {e.safeguard_status}
                </span>
              </div>
              <p className="text-[10px] font-mono text-slate-300 truncate">{e.calibration_status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-600 mb-1">Registry note</p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Only Meridiana Group outputs are backed by full scoring run data (S1 and S2).
          Other company entries are synthetic values derived from company demo narratives
          and are consistent with their sector, size, and activation context.
          All entries are pre-empirical-calibration — methodology v0.1 provisional weights.
        </p>
      </div>
    </div>
  );
}
