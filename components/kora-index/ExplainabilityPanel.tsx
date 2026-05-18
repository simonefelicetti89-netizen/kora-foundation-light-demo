'use client';

import { cn } from '@/lib/utils';
import type { ExplainabilityRecord } from '@/services/explainability/ExplainabilityService';

interface ExplainabilityPanelProps {
  record?: ExplainabilityRecord;
  className?: string;
}

export function ExplainabilityPanel({ record, className }: ExplainabilityPanelProps) {
  const limitationsStatement =
    record?.limitations_statement ??
    'This score is produced by KORA Foundation Light v0.1 under provisional methodology. It is pilot-grade diagnostic intelligence — not scientifically validated, empirically calibrated, or regulatory-grade.';

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4', className)}>
      <h3 className="text-sm font-semibold text-slate-700">Score Explanation</h3>
      {record ? (
        <>
          <p className="mt-2 text-sm text-slate-600">{record.summary}</p>
          <div className="mt-3 space-y-1">
            {record.component_explanations.map((ce) => (
              <div key={ce.code} className="flex gap-2 text-xs text-slate-500">
                <span className="font-mono font-medium text-slate-700">{ce.code}</span>
                <span>{ce.explanation}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-sm text-slate-400">
          Explanation panel — populated from explainability service in Phase 1.
        </p>
      )}
      <div className="mt-4 rounded bg-amber-50 p-3 text-xs text-amber-700 border border-amber-200">
        <span className="font-semibold">Limitations: </span>
        {limitationsStatement}
      </div>
    </div>
  );
}
