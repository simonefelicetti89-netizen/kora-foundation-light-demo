import { adminPreviewService } from '@/services/admin-preview/AdminPreviewService';

export default function BenchmarksPage() {
  const benchmarks = adminPreviewService.getBenchmarkPreview();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#06032B]">Benchmarks</h1>
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
            Synthetic Preview
          </span>
        </div>
        <p className="text-sm text-[rgba(6,3,43,0.52)] mt-1">
          Meridiana Group S.r.l. KORA Index positioned against synthetic cluster benchmarks.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
        <p className="text-xs font-semibold text-amber-700 mb-1">Disclaimer</p>
        <p className="text-xs text-amber-700 leading-relaxed">
          All benchmark values are synthetic and created for demo purposes only.
          No real sector, territory or company-size benchmarks have been computed.
          Post-pilot Delphi calibration will establish empirical reference ranges.
        </p>
      </div>

      <div className="space-y-4">
        {benchmarks.map((b) => (
          <div key={b.dimension} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{b.dimension}</p>
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)] mt-0.5">{b.cluster_label}</p>
              </div>
              <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-xs font-semibold text-indigo-700">
                {b.percentile} percentile
              </span>
            </div>

            <div className="space-y-2">
              {[
                { label: 'Meridiana Group', value: b.meridiana_index, color: 'bg-[rgba(199,111,61,0.08)]0' },
                { label: 'Cluster average', value: b.cluster_avg, color: 'bg-[rgba(6,3,43,0.18)]' },
                { label: 'Top quartile', value: b.cluster_top_quartile, color: 'bg-green-300' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-xs text-[rgba(6,3,43,0.52)] w-32 shrink-0">{row.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-[rgba(6,3,43,0.05)]">
                    <div className={`h-2 rounded-full ${row.color}`} style={{ width: `${row.value}%` }} />
                  </div>
                  <span className="text-xs font-mono text-[rgba(6,3,43,0.62)] w-8 text-right">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
