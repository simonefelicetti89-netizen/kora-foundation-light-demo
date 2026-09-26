'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import { RankedGroup, RankedItem, RankedLine } from '@/components/ui/px';
import type { BudgetToHumanImpactRecommendation } from '@/lib/types';

interface RecommendationsPanelProps {
  btiRecommendations?: BudgetToHumanImpactRecommendation[];
}

const PRIORITY_LABELS: Record<string, string> = {
  alta: 'Priorità alta', media: 'Priorità media', bassa: 'Priorità bassa',
};

// KORA-WP-141: each recommendation used to carry a 4px coloured left border, a
// tinted priority pill and a second pill for the macroblock — three encodings of
// two facts. Priority and macroblock are now quiet qualifiers on the title line,
// and the block shares the canonical RankedGroup grammar.
export function RecommendationsPanel({ btiRecommendations }: RecommendationsPanelProps) {
  const recs = btiRecommendations ?? [];

  return (
    <div>
      <RankedGroup
        tier="subsection"
        title="Raccomandazioni"
        note="Azioni concrete basate sul pattern di attivazione e spesa rilevato da KORA. KORA identifica opportunità di attivazione e riallocazione — non garantisce impatti causali su retention o benessere."
      >
        {recs.length > 0 ? (
          recs.map((rec, i) => (
            <RankedItem
              key={i}
              rank={i + 1}
              title={rec.action_it}
              meta={[PRIORITY_LABELS[rec.priority], rec.target_macroblock].filter(Boolean).join(' · ')}
              last={i === recs.length - 1}
            >
              <RankedLine>{rec.expected_signal_it}</RankedLine>
              {rec.budget_note && <RankedLine tone="tertiary">{rec.budget_note}</RankedLine>}
            </RankedItem>
          ))
        ) : (
          <p className="kt-secondary" style={{ color: TOKENS.inkTertiary, paddingTop: 16 }}>
            Nessuna raccomandazione disponibile per questo scenario.
          </p>
        )}
      </RankedGroup>

      <p className="kt-caption" style={{ color: TOKENS.inkTertiary, marginTop: 8 }}>
        Queste raccomandazioni sono generate da dati sintetici di KORA Foundation Light in condizioni pre-calibrazione empirica.
        Non sono consigli legali, fiscali, HR o di strategia aziendale. Correlazione ≠ causalità.
      </p>
    </div>
  );
}
