'use client';

import { cn } from '@/lib/utils';
import type { ExplainabilityRecord } from '@/services/explainability/ExplainabilityService';

interface ExplainabilityPanelProps {
  record?: ExplainabilityRecord | null;
  className?: string;
}

const FALLBACK_LIMITATIONS =
  'This score is produced by KORA Foundation Light v0.1 under provisional methodology. It is pilot-grade diagnostic intelligence — not scientifically validated, empirically calibrated, or regulatory-grade.';

export function ExplainabilityPanel({ record, className }: ExplainabilityPanelProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 space-y-4', className)}>
      <h3 className="text-sm font-semibold text-slate-700">Score Explanation</h3>

      {record ? (
        <>
          <p className="text-sm text-slate-600 leading-relaxed">{record.kora_index_explanation}</p>

          {record.strong_components.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                Strong Components
              </p>
              <div className="space-y-2">
                {record.strong_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold text-emerald-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.weak_components.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Areas for Improvement
              </p>
              <div className="space-y-2">
                {record.weak_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold text-amber-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.next_best_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                Recommended Actions
              </p>
              <div className="space-y-2">
                {record.next_best_actions.slice(0, 3).map((a) => (
                  <div key={a.priority} className="flex gap-2 text-xs">
                    <span className="font-mono text-indigo-400 shrink-0">{a.priority}.</span>
                    <div>
                      <span className="font-semibold text-slate-700">{a.action}</span>
                      <span className="text-slate-500"> — {a.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Explanation panel — wiring to explainability service in progress.
        </p>
      )}

      <div className="rounded bg-amber-50 p-3 text-xs text-amber-700 border border-amber-200">
        <span className="font-semibold">Limitations: </span>
        {record?.limitations_statement ?? FALLBACK_LIMITATIONS}
      </div>
    </div>
  );
}
