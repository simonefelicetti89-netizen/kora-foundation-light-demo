import type { EligibilityGateSummary } from '@/services/ingestion-simulator/IngestionSimulatorService';

interface Props {
  summary: EligibilityGateSummary;
}

const ZERO_INDICATORS = ['IU = 0', 'KORA Index = 0', 'Worker PIB = 0', 'KORA Contribution = 0'];

export function EligibilitySummaryReport({ summary }: Props) {
  const { eligible_row_count, limited_count, blocked_count, total_row_count, blocked_note, limited_note } = summary;

  const rows = [
    {
      label: 'Eligible',
      count: eligible_row_count,
      pct: total_row_count > 0 ? Math.round((eligible_row_count / total_row_count) * 100) : 0,
      description: 'Azioni idonee: possono generare Impact Units e contribuire al KORA Index.',
      effect: 'Genera IU verificate · Alimenta KORA Index · Alimenta PIB',
      color: { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-500', row: 'border-l-emerald-400' },
    },
    {
      label: 'Limited — Economic Relief',
      count: limited_count,
      pct: total_row_count > 0 ? Math.round((limited_count / total_row_count) * 100) : 0,
      description: limited_note || 'Non è spesa sbagliata. È spesa che può diventare più intelligente.',
      effect: 'IU = 0 · Classificata economic_relief_spend · Non inflaziona Activation Quality',
      color: { badge: 'bg-amber-100 text-amber-800 border-amber-200', bar: 'bg-amber-400', row: 'border-l-amber-400' },
    },
    {
      label: 'Blocked — Compliance / HSE / Legal',
      count: blocked_count,
      pct: total_row_count > 0 ? Math.round((blocked_count / total_row_count) * 100) : 0,
      description: blocked_note || 'KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto.',
      effect: null,
      color: { badge: 'bg-rose-100 text-rose-800 border-rose-200', bar: 'bg-rose-400', row: 'border-l-rose-400' },
    },
  ];

  return (
    <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">C — Eligibility Gate Summary</p>
        <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1">
          {total_row_count.toLocaleString('it-IT')} righe totali processate · precedenza: Blocked &gt; Limited &gt; Eligible
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.label} className={`rounded-lg border bg-[#F8F6F1] pl-4 pr-4 py-4 border-l-4 ${r.color.row}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold rounded border px-1.5 py-0.5 ${r.color.badge}`}>{r.label}</span>
                  <span className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{r.count.toLocaleString('it-IT')} righe</span>
                  <span className="text-xs text-[rgba(6,3,43,0.40)]">({r.pct}%)</span>
                </div>
                <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed">{r.description}</p>
                <p className="text-[11px] font-mono text-[rgba(6,3,43,0.40)]">{r.effect}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-2xl font-bold text-[rgba(6,3,43,0.78)]">{r.pct}%</span>
              </div>
            </div>
            {/* Bar */}
            <div className="mt-3 h-1.5 rounded-full bg-[rgba(6,3,43,0.05)] overflow-hidden">
              <div className={`h-full rounded-full ${r.color.bar}`} style={{ width: `${r.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Blocked zero-indicators */}
      {blocked_count > 0 && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-rose-700">Blocked by Design — zero-indicator obbligatorio</p>
          <div className="flex flex-wrap gap-2">
            {ZERO_INDICATORS.map((zi) => (
              <span key={zi} className="rounded border border-rose-200 bg-[#F8F6F1] px-2 py-0.5 text-[11px] font-mono font-semibold text-rose-600">
                {zi}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-rose-600 leading-relaxed">
            DVR/DUVRI, DPI obbligatori, D.Lgs 81/08, sorveglianza sanitaria obbligatoria, GDPR compliance e patentini obbligatori
            sono sempre Blocked. Non sono penalizzati — sono esclusi per design.
          </p>
        </div>
      )}

      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-[11px] text-[rgba(6,3,43,0.52)] leading-relaxed">
        <span className="font-semibold text-[rgba(6,3,43,0.62)]">Principio di gate: </span>
        KORA non trasforma la compliance in impatto. La conformità legale è una baseline, non impatto.
        Economic relief (voucher, fringe, benefit economici) non è spesa sbagliata — è spesa che può diventare più intelligente.
      </div>
    </div>
  );
}
