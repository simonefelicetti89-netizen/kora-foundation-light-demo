'use client';

import { cn } from '@/lib/utils';
import type { BudgetToHumanImpactRecommendation } from '@/lib/types';

interface RecommendationsPanelProps {
  btiRecommendations?: BudgetToHumanImpactRecommendation[];
  className?: string;
}

const PRIORITY_STYLES: Record<string, { border: string; badge: string; badgeText: string }> = {
  alta:  { border: 'border-l-rose-500',   badge: 'bg-rose-100 border-rose-200',   badgeText: 'text-rose-700' },
  media: { border: 'border-l-amber-500',  badge: 'bg-amber-100 border-amber-200', badgeText: 'text-amber-700' },
  bassa: { border: 'border-l-slate-300',  badge: 'bg-slate-100 border-slate-200', badgeText: 'text-slate-600' },
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Priorità Alta', media: 'Priorità Media', bassa: 'Priorità Bassa',
};

export function RecommendationsPanel({ btiRecommendations, className }: RecommendationsPanelProps) {
  const recs = btiRecommendations ?? [];

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 space-y-5', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Raccomandazioni</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
          Azioni concrete basate sul pattern di attivazione e spesa rilevato da KORA.
          KORA identifica opportunità di attivazione e riallocazione — non garantisce impatti causali su retention o benessere.
        </p>
      </div>

      {recs.length > 0 ? (
        <div className="space-y-3">
          {recs.map((rec, i) => {
            const styles = PRIORITY_STYLES[rec.priority] ?? PRIORITY_STYLES.bassa;
            return (
              <div
                key={i}
                className={cn(
                  'rounded-r-lg border border-l-4 bg-white p-4 space-y-2',
                  styles.border,
                  'border-slate-200',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</span>
                    <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold', styles.badge, styles.badgeText)}>
                      {PRIORITY_LABELS[rec.priority]}
                    </span>
                  </div>
                  {rec.target_macroblock && (
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500">
                      {rec.target_macroblock}
                    </span>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-800 leading-snug">{rec.action_it}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{rec.expected_signal_it}</p>

                {rec.budget_note && (
                  <p className="text-[10px] text-slate-400 italic border-t border-slate-100 pt-1.5">
                    {rec.budget_note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-slate-400">Nessuna raccomandazione disponibile per questo scenario.</p>
      )}

      <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-[10px] text-slate-500 leading-relaxed">
        Queste raccomandazioni sono generate da dati sintetici di Foundation Light v0.1 in condizioni pre-calibrazione empirica.
        Non sono consigli legali, fiscali, HR o di strategia aziendale. Correlazione ≠ causalità.
      </div>
    </div>
  );
}
