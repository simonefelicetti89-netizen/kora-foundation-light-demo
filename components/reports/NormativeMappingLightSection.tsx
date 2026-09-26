'use client';
// B138-C: Normative Mapping Light — compact board-facing framework summary.
// Shared between app/company/reports and app/demo/company/reports.
// Source: lib/normative-mapping/normative-mapping-light.ts (static, versioned).
// Non-certificative, non-compliance, non-assurance.

import type { NormativeMappingLight } from '@/lib/normative-mapping/normative-mapping-light';
import { BADGE_TOKENS, TOKENS } from '@/lib/design/kora-design-tokens';

interface Props {
  mapping: NormativeMappingLight;
}

const STRENGTH_LABELS: Record<string, string> = {
  direct:     'Diretto',
  indirect:   'Indiretto',
  contextual: 'Contestuale',
};

const FRAMEWORK_USE_LABELS: Record<string, string> = {
  ESRS_S1:     'base indicativa per la lettura delle condizioni di lavoro',
  GRI:         'lettura indicativa delle evidenze relative a benefit e occupazione',
  ISO_30414:   'contesto indicativo per organizzare evidenze su competenze e formazione',
  UNI_PdR_125: 'contesto indicativo per evidenze su equità e inclusione',
  SDG:         'riferimento aspirazionale per iniziative salute e benessere',
};

const STRENGTH_STYLES: Record<string, { background: string; color: string }> = {
  direct:     { background: BADGE_TOKENS.eligible.bg, color: BADGE_TOKENS.eligible.text },
  indirect:   { background: BADGE_TOKENS.limited.bg, color: BADGE_TOKENS.limited.text },
  contextual: { background: BADGE_TOKENS.blocked.bg, color: BADGE_TOKENS.blocked.text },
};

export function NormativeMappingLightSection({ mapping }: Props) {
  const byFramework = new Map<
    string,
    { label: string; areas: NormativeMappingLight['areas'] }
  >();

  for (const area of mapping.areas) {
    if (!byFramework.has(area.framework)) {
      byFramework.set(area.framework, { label: area.framework_label, areas: [] });
    }
    byFramework.get(area.framework)!.areas.push(area);
  }

  return (
    <div style={{
      background: TOKENS.accentSoft,
      border: `1px solid ${TOKENS.accentSoft}`,
      borderRadius: TOKENS.cardRadius,
      padding: '1.25rem',
    }}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <p style={{
            fontFamily: 'var(--font-jakarta)',
            fontWeight: 700,
            fontSize: '13px',
            color: TOKENS.ink,
            marginBottom: 2,
          }}>
            Normative Mapping Light
          </p>
          <p style={{ fontSize: '12px', color: TOKENS.inkHint }}>
            Indicative, non-certificative alignment · Foundation Light
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span style={{
            fontFamily: 'monospace', fontSize: '12px', fontWeight: 700,
            background: TOKENS.accentSoft, color: TOKENS.violet, borderRadius: 4, padding: '2px 7px',
          }}>
            pre_empirical_calibration
          </span>
          <span style={{
            fontSize: '12px', background: BADGE_TOKENS.eligible.bg, color: BADGE_TOKENS.eligible.text,
            borderRadius: 4, padding: '2px 7px', fontWeight: 600,
          }}>
            non-certificativa
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{
        background: BADGE_TOKENS.limited.bg, border: `1px solid ${BADGE_TOKENS.limited.border}`, borderRadius: 6,
        padding: '10px 12px', fontSize: '12px', color: BADGE_TOKENS.limited.text, lineHeight: 1.6,
        marginBottom: '1rem',
      }}>
        KORA mappa le evidenze di attivazione organizzativa rispetto ad alcuni riferimenti di human capital e sustainability reporting.
        La mappatura è indicativa e non-certificativa: non costituisce compliance ESG, audit, assurance, reporting legale,
        certificazione o validazione scientifica. Non sostituisce consulenza legale, ESG, fiscale, HR o attività di assurance/revisione.
      </div>

      {/* Framework summary table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${TOKENS.accentSoft}` }}>
              {['Framework', 'Aree', 'Pillar principali', 'Forza prevalente', 'Uso indicativo'].map(h => (
                <th scope="col" key={h} style={{
                  padding: '6px 10px', textAlign: 'left',
                  fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px',
                  letterSpacing: '0.07em', textTransform: 'uppercase',
                  color: TOKENS.violet, background: TOKENS.accentSoft,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(byFramework.entries()).map(([fw, { label, areas }]) => {
              const allPillars = [...new Set(areas.flatMap(a => a.kora_pillars))].slice(0, 3);
              const strengthCounts: Record<string, number> = {};
              for (const a of areas) {
                strengthCounts[a.strength] = (strengthCounts[a.strength] ?? 0) + 1;
              }
              const prevStrength = Object.entries(strengthCounts)
                .sort((x, y) => y[1] - x[1])[0]?.[0] ?? 'indirect';
              const strengthTk = STRENGTH_STYLES[prevStrength] ?? STRENGTH_STYLES.indirect;
              const usoIndicativo = FRAMEWORK_USE_LABELS[fw] ?? '';

              return (
                <tr key={fw} style={{ borderBottom: `1px solid ${TOKENS.inkBorder}` }}>
                  <td style={{ padding: '7px 10px', fontWeight: 600, color: TOKENS.ink }}>{label}</td>
                  <td style={{ padding: '7px 10px', textAlign: 'center', color: TOKENS.inkSecondary }}>{areas.length}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <div className="flex flex-wrap gap-1">
                      {allPillars.map(p => (
                        <span key={p} style={{
                          fontSize: '12px', fontWeight: 700,
                          background: TOKENS.accentSoft, color: TOKENS.violet,
                          borderRadius: 3, padding: '1px 5px',
                        }}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      ...strengthTk,
                      fontSize: '12px', fontWeight: 700,
                      borderRadius: 4, padding: '2px 6px',
                      display: 'inline-block',
                    }}>
                      {STRENGTH_LABELS[prevStrength] ?? prevStrength}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', fontSize: '12px', color: TOKENS.inkSecondary }}>{usoIndicativo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer metadata */}
      <p style={{ fontSize: '12px', color: TOKENS.inkHint, marginTop: '0.75rem', textAlign: 'right' }}>
        v{mapping.version} · {mapping.areas.length} aree totali · {byFramework.size} framework
      </p>
    </div>
  );
}
