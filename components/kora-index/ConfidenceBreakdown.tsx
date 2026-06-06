'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { ConfidenceRecord } from '@/services/scoring-simulator/ScoringSimulatorService';

interface ConfidenceBreakdownProps {
  record?: ConfidenceRecord | null;
}

const COVERAGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  complete: { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  border: TOKENS.safeguard.pass.dot  },
  partial:  { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, border: TOKENS.safeguard.watch.dot },
  present:  { bg: 'rgba(43,92,230,0.08)',    text: '#1B2A4A',                   border: '#2B5CE6'                   },
  absent:   { bg: TOKENS.inkBorder,          text: TOKENS.inkSecondary,         border: TOKENS.inkHint              },
};

function SubFactor({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const barColor = pct >= 70 ? TOKENS.safeguard.pass.dot : pct >= 50 ? TOKENS.safeguard.watch.dot : TOKENS.safeguard.cap.dot;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: TOKENS.inkSecondary }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color: TOKENS.ink }}>{pct}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full" style={{ background: TOKENS.inkTrack }}>
        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
      </div>
    </div>
  );
}

export function ConfidenceBreakdown({ record }: ConfidenceBreakdownProps) {
  return (
    <div
      className="p-4 space-y-4"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <div className="flex items-center justify-between">
        <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Confidence Score — Dettaglio
        </p>
        {record && (
          <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '18px', color: TOKENS.accent }}>
            {Math.round(record.confidence_score * 100)}%
            <span className="ml-1 text-xs font-normal capitalize" style={{ color: TOKENS.inkHint }}>
              ({record.confidence_level})
            </span>
          </span>
        )}
      </div>

      {record ? (
        <>
          <div className="space-y-3">
            <SubFactor label="Completezza Dati"       value={record.data_completeness} />
            <SubFactor label="Qualità Evidenze"        value={record.evidence_quality} />
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
                    <span className="shrink-0" style={{ color: TOKENS.safeguard.watch.dot }}>▲</span>
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
