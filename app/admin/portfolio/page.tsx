import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border-green-200',
  WARNING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  FLAGGED: 'bg-red-100 text-red-800 border-red-200',
};

export default function CompanyPortfolio() {
  const portfolio = adminPreviewService.getCompanyPortfolioPreview();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">Company Portfolio</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Internal Preview
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          All companies in the KORA demo portfolio — synthetic data only.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_80px_80px_90px] gap-0 px-4 py-2 bg-slate-50 border-b border-slate-200">
          {['Company', 'Sector', 'Workers', 'KORA Index', 'CS', 'Safeguard'].map((h) => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{h}</p>
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {portfolio.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_120px_80px_80px_80px_90px] gap-0 px-4 py-3 items-center hover:bg-slate-50">
              <div>
                <p className="text-sm font-semibold text-slate-800">{c.company_name}</p>
                <p className="text-xs text-slate-400">{c.territory}</p>
                {c.is_primary_demo && (
                  <span className="mt-0.5 inline-block rounded border border-indigo-200 bg-indigo-50 px-1 py-0.5 text-[10px] font-medium text-indigo-600">
                    Primary demo
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 truncate">{c.sector}</p>
              <p className="text-xs font-mono text-slate-600">{c.headcount}</p>
              <p className="text-sm font-bold text-slate-800">
                {c.kora_index_value !== null ? c.kora_index_value : '—'}
              </p>
              <p className="text-xs font-mono text-slate-500">
                {c.confidence_score !== null ? `${(c.confidence_score * 100).toFixed(0)}%` : '—'}
              </p>
              <div>
                {c.safeguard_status ? (
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[c.safeguard_status] ?? 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                    {c.safeguard_status}
                  </span>
                ) : (
                  <span className="text-xs text-slate-300">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {portfolio.map((c) => (
          <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold text-slate-700">{c.company_name}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{c.demo_note}</p>
            <p className="text-xs font-mono text-slate-300 mt-1">
              data_completeness: {(c.data_completeness * 100).toFixed(0)}% · synthetic_demo_data: true
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
