'use client';

import { BADGE_TOKENS, TOKENS } from '@/lib/design/kora-design-tokens';
import { ConfidenceGauge } from '@/components/ui/px/encoding';
import type { ConfidenceRecord } from '@/lib/types';

interface ConfidenceBreakdownProps {
  record?: ConfidenceRecord | null;
}

// KORA-WP-142: `complete` was green and `partial` amber — the pass/watch palette
// every SCORED surface uses. Applied to a coverage level that reads as "this
// organisation is doing badly", when it says only how much of the picture KORA
// can see. Coverage is drawn in the informational register instead.
const COVERAGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  complete: { bg: 'rgba(43,92,230,0.08)',    text: BADGE_TOKENS.info.text,      border: BADGE_TOKENS.info.border    },
  partial:  { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary,         border: TOKENS.inkHint              },
  present:  { bg: 'rgba(43,92,230,0.08)',    text: BADGE_TOKENS.info.text,                   border: BADGE_TOKENS.info.border                   },
  absent:   { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary,         border: TOKENS.inkHint              },
};

// KORA-WP-142: this bar was painted pass / watch / cap from hardcoded 70 and 50
// cutoffs, which said "this sub-factor is performing badly" about a RELIABILITY
// input. Confidence is not performance; its sub-factors are drawn in ink, with no
// semantic state colour and no invented threshold.
function SubFactor({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: TOKENS.inkSecondary }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: TOKENS.ink }}>{pct}%</span>
      </div>
      <div
        role="meter"
        aria-label={`${label}: ${pct}% di copertura`}
        aria-valuenow={value} aria-valuemin={0} aria-valuemax={1}
        className="h-1.5 w-full rounded-full"
        style={{ background: TOKENS.inkTrack }}
      >
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: TOKENS.inkSecondary }} />
      </div>
    </div>
  );
}

export function ConfidenceBreakdown({ record }: ConfidenceBreakdownProps) {
  return (
    <div data-wp142-block="confidence-panel"
      className="p-4 space-y-4"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
        Confidence Score — Dettaglio
      </p>

      {/* KORA-WP-142 — the reliability register: segmented, in ink, with no band,
          no threshold and no verdict. It must not read as an eleventh component. */}
      <ConfidenceGauge value={record ? record.confidence_score : null} />

      {record ? (
        <>
          <div className="space-y-3">
            <SubFactor label="Completezza Dati"       value={record.data_completeness} />
            {/* CC-011 / D-A: this field is the legacy `evidence_quality` DB column,
                whose canonical meaning is budget evidence quality (sourced from
                ConfidenceResult.budgetEvidenceConfidence) — labeled accordingly. */}
            <SubFactor label="Qualità evidenze budget" value={record.evidence_quality} />
            <SubFactor label="Confidenza Mapping"      value={record.mapping_confidence} />
            <SubFactor label="Peso Verifica"           value={record.verification_weight} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: TOKENS.inkHint }}>
              Copertura Fonti
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(record.source_coverage).map(([src, status]) => {
                const s = COVERAGE_STYLES[status] ?? COVERAGE_STYLES.absent;
                return (
                  <span
                    key={src}
                    className="rounded px-1.5 py-0.5 text-xs capitalize"
                    style={{ background: s.bg, color: s.text, border: `1px solid ${s.border}` }}
                  >
                    {src.replace(/_/g, ' ')} · {status}
                  </span>
                );
              })}
            </div>
          </div>

          {record.gaps_identified.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: TOKENS.inkHint }}>
                Lacune Identificate
              </p>
              <ul className="space-y-1">
                {record.gaps_identified.map((gap, i) => (
                  <li key={i} className="flex gap-2 text-xs" style={{ color: TOKENS.inkSecondary }}>
                    <span className="shrink-0" style={{ color: TOKENS.inkSecondary }}>▲</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: TOKENS.inkHint }}>
          Record Confidence Score non disponibile per questo scenario.
        </p>
      )}
    </div>
  );
}
