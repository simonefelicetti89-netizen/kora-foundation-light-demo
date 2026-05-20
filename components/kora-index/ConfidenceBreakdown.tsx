'use client';

import { cn } from '@/lib/utils';
import type { ConfidenceRecord } from '@/services/scoring-simulator/ScoringSimulatorService';

interface ConfidenceBreakdownProps {
  record?: ConfidenceRecord | null;
  className?: string;
}

const COVERAGE_STYLES: Record<string, string> = {
  complete: 'text-green-700 bg-green-50 border-green-200',
  partial:  'text-yellow-700 bg-yellow-50 border-yellow-200',
  present:  'text-blue-700 bg-blue-50 border-blue-200',
  absent:   'text-slate-400 bg-slate-50 border-slate-200',
};

function SubFactor({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 70 ? 'bg-green-400' :
    pct >= 50 ? 'bg-yellow-400' : 'bg-red-400';

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-mono font-semibold text-slate-700">{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div className={cn('h-1.5 rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ConfidenceBreakdown({ record, className }: ConfidenceBreakdownProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Confidence Score — Dettaglio</h3>
        {record && (
          <span className="text-lg font-bold text-slate-800">
            {Math.round(record.confidence_score * 100)}%
            <span className="ml-1 text-xs font-normal text-slate-400 capitalize">
              ({record.confidence_level})
            </span>
          </span>
        )}
      </div>

      {record ? (
        <>
          <div className="space-y-3">
            <SubFactor label="Completezza Dati" value={record.data_completeness} />
            <SubFactor label="Qualità Evidenze" value={record.evidence_quality} />
            <SubFactor label="Confidenza Mapping" value={record.mapping_confidence} />
            <SubFactor label="Peso Verifica" value={record.verification_weight} />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Copertura Fonti
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(record.source_coverage).map(([src, status]) => (
                <span
                  key={src}
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-xs capitalize',
                    COVERAGE_STYLES[status] ?? COVERAGE_STYLES.absent,
                  )}
                >
                  {src.replace(/_/g, ' ')} · {status}
                </span>
              ))}
            </div>
          </div>

          {record.gaps_identified.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Lacune Identificate
              </p>
              <ul className="space-y-1">
                {record.gaps_identified.map((gap, i) => (
                  <li key={i} className="flex gap-2 text-xs text-slate-600">
                    <span className="text-amber-500 shrink-0">▲</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">Record Confidence Score non disponibile per questo scenario.</p>
      )}
    </div>
  );
}
