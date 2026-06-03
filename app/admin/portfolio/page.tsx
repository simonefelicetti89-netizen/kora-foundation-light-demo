import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-100 text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  WARNING: 'bg-[rgba(217,154,43,0.12)] text-[#7A5200] border-[rgba(217,154,43,0.22)]',
  FLAGGED: 'bg-[rgba(158,59,47,0.10)] text-red-800 border-[rgba(158,59,47,0.22)]',
};

export default function CompanyPortfolio() {
  const portfolio = adminPreviewService.getCompanyPortfolioPreview();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#06032B]">Company Portfolio</h1>
          <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-xs font-semibold text-amber-700">
            Internal Preview
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          All companies in the KORA demo portfolio — synthetic data only.
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_80px_80px_80px_90px] gap-0 px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)]">
          {['Company', 'Sector', 'Workers', 'KORA Index', 'CS', 'Safeguard'].map((h) => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{h}</p>
          ))}
        </div>
        <div className="divide-y divide-[rgba(6,3,43,0.05)]">
          {portfolio.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_120px_80px_80px_80px_90px] gap-0 px-4 py-3 items-center hover:bg-[rgba(6,3,43,0.03)]">
              <div>
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{c.company_name}</p>
                <p className="text-xs text-[rgba(6,3,43,0.40)]">{c.territory}</p>
                {c.is_primary_demo && (
                  <span className="mt-0.5 inline-block rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-1 py-0.5 text-[10px] font-medium text-[#C76F3D]">
                    Primary demo
                  </span>
                )}
              </div>
              <p className="text-xs text-[rgba(6,3,43,0.52)] truncate">{c.sector}</p>
              <p className="text-xs font-mono text-[rgba(6,3,43,0.62)]">{c.headcount}</p>
              <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">
                {c.kora_index_value !== null ? c.kora_index_value : '—'}
              </p>
              <p className="text-xs font-mono text-[rgba(6,3,43,0.52)]">
                {c.confidence_score !== null ? `${(c.confidence_score * 100).toFixed(0)}%` : '—'}
              </p>
              <div>
                {c.safeguard_status ? (
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[c.safeguard_status] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]'}`}>
                    {c.safeguard_status}
                  </span>
                ) : (
                  <span className="text-xs text-[rgba(6,3,43,0.28)]">—</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {portfolio.map((c) => (
          <div key={c.id} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3">
            <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{c.company_name}</p>
            <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5 leading-relaxed">{c.demo_note}</p>
            <p className="text-xs font-mono text-[rgba(6,3,43,0.28)] mt-1">
              data_completeness: {(c.data_completeness * 100).toFixed(0)}% · synthetic_demo_data: true
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
