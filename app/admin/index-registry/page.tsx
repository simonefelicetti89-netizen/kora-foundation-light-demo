import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

const SAFEGUARD_PILL: Record<string, string> = {
  CLEAR:   'bg-green-100 text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  WARNING: 'bg-[rgba(217,154,43,0.12)] text-[#7A5200] border-[rgba(217,154,43,0.22)]',
  FLAGGED: 'bg-[rgba(158,59,47,0.10)] text-red-800 border-[rgba(158,59,47,0.22)]',
};

export default function IndexRegistry() {
  const entries = adminPreviewService.getIndexRegistryPreview();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#06032B]">KORA Index Registry</h1>
          <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-xs font-semibold text-amber-700">
            Internal Preview
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Cross-company KORA Index outputs. Entries marked (~) are synthetic values
          consistent with company demo narratives — not computed from real scoring runs.
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
        <div className="grid grid-cols-[1fr_60px_140px_80px_70px_90px_100px] gap-0 px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)]">
          {['Company', 'S', 'Period', 'Index', 'CS', 'Safeguard', 'Calibration'].map((h) => (
            <p key={h} className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{h}</p>
          ))}
        </div>
        <div className="divide-y divide-[rgba(6,3,43,0.05)]">
          {entries.map((e) => (
            <div
              key={`${e.company_id}-${e.scenario_id}`}
              className="grid grid-cols-[1fr_60px_140px_80px_70px_90px_100px] gap-0 px-4 py-3 items-center hover:bg-[rgba(6,3,43,0.03)]"
            >
              <div className="flex items-center gap-1 min-w-0">
                <p className="text-sm text-[rgba(6,3,43,0.78)] truncate">{e.company_name}</p>
                {e.is_synthetic && (
                  <span className="shrink-0 text-[10px] text-[rgba(6,3,43,0.28)] font-mono" title="Synthetic value">~</span>
                )}
              </div>
              <p className="text-xs font-mono text-[rgba(6,3,43,0.62)]">{e.scenario_id}</p>
              <p className="text-xs text-[rgba(6,3,43,0.52)]">{e.reporting_period}</p>
              <p className="text-lg font-bold text-[rgba(6,3,43,0.90)]">{e.kora_index_value}</p>
              <p className="text-xs font-mono text-[rgba(6,3,43,0.52)]">{(e.confidence_score * 100).toFixed(0)}%</p>
              <div>
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_PILL[e.safeguard_status] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]'}`}>
                  {e.safeguard_status}
                </span>
              </div>
              <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)] truncate">{e.calibration_status}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.62)] mb-1">Registry note</p>
        <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">
          Only Meridiana Group outputs are backed by full scoring run data (S1 and S2).
          Other company entries are synthetic values derived from company demo narratives
          and are consistent with their sector, size, and activation context.
          All entries are pre-empirical-calibration — methodology v0.1 provisional weights.
        </p>
      </div>
    </div>
  );
}
