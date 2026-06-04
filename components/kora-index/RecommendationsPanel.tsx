'use client';

import { cn } from '@/lib/utils';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { BudgetToHumanImpactRecommendation } from '@/lib/types';

interface RecommendationsPanelProps {
  btiRecommendations?: BudgetToHumanImpactRecommendation[];
}

const PRIORITY_STYLES: Record<string, { leftBorder: string; badge: string; badgeText: string }> = {
  alta:  { leftBorder: TOKENS.safeguard.cap.dot,   badge: TOKENS.safeguard.cap.bg,   badgeText: TOKENS.safeguard.cap.text   },
  media: { leftBorder: TOKENS.safeguard.watch.dot,  badge: TOKENS.safeguard.watch.bg, badgeText: TOKENS.safeguard.watch.text },
  bassa: { leftBorder: TOKENS.inkHint,              badge: TOKENS.inkBorder,          badgeText: TOKENS.inkSecondary         },
};

const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Priorità Alta', media: 'Priorità Media', bassa: 'Priorità Bassa',
};

export function RecommendationsPanel({ btiRecommendations }: RecommendationsPanelProps) {
  const recs = btiRecommendations ?? [];

  return (
    <div className="p-5 space-y-5" style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}>
      <div>
        <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Raccomandazioni
        </p>
        <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
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
                className="rounded-r-[10px] p-4 space-y-2"
                style={{
                  background:  TOKENS.surface,
                  borderTop:   TOKENS.cardBorder,
                  borderRight: TOKENS.cardBorder,
                  borderBottom:TOKENS.cardBorder,
                  borderLeft:  `4px solid ${styles.leftBorder}`,
                }}
              >
                <div className="flex items-start gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono" style={{ color: TOKENS.inkHint }}>{String(i + 1).padStart(2, '0')}</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: styles.badge, color: styles.badgeText, border: `1px solid ${styles.leftBorder}` }}
                    >
                      {PRIORITY_LABELS[rec.priority]}
                    </span>
                  </div>
                  {rec.target_macroblock && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold"
                      style={{ background: TOKENS.inkBorder, color: TOKENS.inkSecondary, border: TOKENS.cardBorder }}
                    >
                      {rec.target_macroblock}
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold leading-snug" style={{ color: TOKENS.ink }}>{rec.action_it}</p>
                <p className="text-xs leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{rec.expected_signal_it}</p>
                {rec.budget_note && (
                  <p className="text-[10px] italic pt-1.5" style={{ color: TOKENS.inkHint, borderTop: TOKENS.cardBorder }}>{rec.budget_note}</p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm" style={{ color: TOKENS.inkHint }}>Nessuna raccomandazione disponibile per questo scenario.</p>
      )}

      <div className="rounded-[10px] p-3 text-[10px] leading-relaxed" style={{ background: TOKENS.inkBorder, color: TOKENS.inkSecondary }}>
        Queste raccomandazioni sono generate da dati sintetici di Foundation Light v0.1 in condizioni pre-calibrazione empirica.
        Non sono consigli legali, fiscali, HR o di strategia aziendale. Correlazione ≠ causalità.
      </div>
    </div>
  );
}
