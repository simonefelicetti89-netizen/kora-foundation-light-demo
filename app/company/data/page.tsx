'use client';

import { useScenario } from '@/lib/demo-state';
import { ingestionSimulatorService } from '@/services/ingestion-simulator/IngestionSimulatorService';
import { cn } from '@/lib/utils';

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

const STATUS_STYLES: Record<string, string> = {
  approved:          'bg-green-50 text-green-700 border-green-200',
  mostly_reviewed:   'bg-blue-50 text-blue-700 border-blue-200',
  partially_reviewed:'bg-yellow-50 text-yellow-700 border-yellow-200',
  under_review:      'bg-orange-50 text-orange-700 border-orange-200',
  rejected:          'bg-red-50 text-red-700 border-red-200',
};

function completenessColor(val: number) {
  return val >= 0.80 ? 'bg-green-500' : val >= 0.60 ? 'bg-yellow-400' : 'bg-red-400';
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color ?? 'text-slate-800')}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// C-06: Data & Evidence
export default function DataEvidence() {
  const { activeScenario } = useScenario();

  const batches      = ingestionSimulatorService.getSourceBatches('meridiana-group', activeScenario);
  const completeness = ingestionSimulatorService.getSourceCompletenessSummary('meridiana-group', activeScenario);
  const mapping      = ingestionSimulatorService.getMappingConfidenceSummary('meridiana-group', activeScenario);
  const pending      = ingestionSimulatorService.getPendingReviewSummary('meridiana-group', activeScenario);
  const evidence     = ingestionSimulatorService.getEvidenceCoverageSummary('meridiana-group', activeScenario);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dati & Evidenze</h1>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {activeScenario}
        </p>
      </div>

      {/* Batch-level only notice — never shows individual UEF records */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-800">Solo metadati a livello batch</p>
        <p className="text-xs text-blue-700 mt-0.5">
          Questa pagina mostra i riepiloghi delle fonti di ingestione. Non espone record UEF individuali,
          identificatori lavoratori o contenuto grezzo dei file.
        </p>
      </div>

      {/* Quality summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Completezza Complessiva"
          value={pct(completeness.overall_completeness_pct)}
          sub={`${completeness.total_mapped} / ${completeness.total_rows} record`}
          color={completeness.overall_completeness_pct >= 0.75 ? 'text-green-600' : 'text-yellow-600'}
        />
        <SummaryCard
          label="Confidenza Mapping Media"
          value={pct(mapping.average_confidence)}
          sub={`${mapping.high_confidence_sources} alta / ${mapping.low_confidence_sources} bassa`}
          color={mapping.average_confidence >= 0.70 ? 'text-green-600' : 'text-yellow-600'}
        />
        <SummaryCard
          label="In Attesa di Revisione"
          value={String(pending.total_pending)}
          sub={`su ${pending.sources_with_pending} fonti`}
          color={pending.total_pending > 50 ? 'text-orange-500' : 'text-slate-800'}
        />
        <SummaryCard
          label="Allegati Evidenza Medi"
          value={pct(evidence.average_evidence_pct)}
          sub={`${evidence.sources_above_50pct} fonti ≥ 50%`}
          color={evidence.average_evidence_pct >= 0.50 ? 'text-green-600' : 'text-orange-500'}
        />
      </div>

      {/* Source inventory table */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Inventario Fonti
        </h2>
        {batches.length > 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Fonte</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Record</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Mappati</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">Rifiutati</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Completezza</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Confidenza Mapping</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Evidenza</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500">In Attesa</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">Stato</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const statusStyle = STATUS_STYLES[batch.batch_status] ?? STATUS_STYLES.under_review;
                  return (
                    <tr key={batch.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{batch.source_name}</p>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                          {batch.source_type.replace(/_/g, ' ')}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-slate-700">
                        {batch.row_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-green-600">
                        {batch.mapped_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-red-500">
                        {batch.rejected_count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-slate-100">
                            <div
                              className={cn('h-1.5 rounded-full', completenessColor(batch.completeness_pct))}
                              style={{ width: `${batch.completeness_pct * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-slate-600">
                            {pct(batch.completeness_pct)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-mono',
                          batch.mapping_confidence_avg >= 0.70 ? 'text-green-600' :
                          batch.mapping_confidence_avg >= 0.60 ? 'text-yellow-600' : 'text-red-500',
                        )}>
                          {pct(batch.mapping_confidence_avg)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs font-mono',
                          batch.evidence_attached_pct >= 0.50 ? 'text-green-600' : 'text-orange-500',
                        )}>
                          {pct(batch.evidence_attached_pct)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {batch.pending_review_count > 0 ? (
                          <span className="text-xs font-semibold text-orange-500">
                            {batch.pending_review_count}
                          </span>
                        ) : (
                          <span className="text-xs text-green-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded border px-1.5 py-0.5 text-xs capitalize whitespace-nowrap',
                          statusStyle,
                        )}>
                          {batch.batch_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
            Nessun batch disponibile per questo scenario.
          </div>
        )}
      </div>

      {/* Source notes */}
      {batches.length > 0 && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Note Fonti
          </h2>
          <div className="space-y-2">
            {batches.map((batch) => (
              batch.source_notes ? (
                <div key={batch.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-1">
                    {batch.source_type.replace(/_/g, ' ')}
                    <span className="ml-2 font-normal text-slate-400">{batch.ingestion_date}</span>
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">{batch.source_notes}</p>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
