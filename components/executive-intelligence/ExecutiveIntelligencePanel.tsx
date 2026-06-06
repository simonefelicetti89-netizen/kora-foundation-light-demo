'use client';

// components/executive-intelligence/ExecutiveIntelligencePanel.tsx
// B77-B — Executive Intelligence Layer™ above-the-fold panel.
//
// Answers four questions before any chart, number, or technical breakdown:
//   COME STIAMO · PERCHÉ · OPPORTUNITÀ PRINCIPALE · AZIONE PRIORITARIA
//
// This is a synthesis display — it does NOT compute scores.
// It renders already-computed ExecutiveIntelligenceSummary from the service.
// notKoraIndexComponent: true — display only, no methodology impact.

import { TOKENS, KORA_COLORS } from '@/lib/design/kora-design-tokens';
import type { ExecutiveIntelligenceSummary, OrganizationStatusLabel } from '@/services/executive-intelligence/ExecutiveIntelligenceService';

// ── Status color mapping ──────────────────────────────────────────────────────

function statusColors(status: OrganizationStatusLabel): { bg: string; border: string; text: string; dot: string } {
  if (status === 'Attivazione fragile')              return { bg: 'rgba(158,59,47,0.07)', border: 'rgba(158,59,47,0.22)', text: KORA_COLORS.CRITICAL, dot: KORA_COLORS.CRITICAL };
  if (status === 'Attivazione concentrata')          return { bg: 'rgba(217,154,43,0.07)', border: 'rgba(217,154,43,0.25)', text: '#8A5A00', dot: KORA_COLORS.WARNING };
  if (status === 'Attivazione in sviluppo')          return { bg: 'rgba(217,154,43,0.05)', border: 'rgba(217,154,43,0.18)', text: '#8A5A00', dot: KORA_COLORS.WARNING };
  if (status === 'Attivazione moderata')             return { bg: 'rgba(199,111,61,0.06)', border: 'rgba(199,111,61,0.18)', text: '#7A4A1A', dot: KORA_COLORS.TERRACOTTA };
  if (status === 'Attivazione solida')               return { bg: 'rgba(47,125,85,0.06)', border: 'rgba(47,125,85,0.20)', text: KORA_COLORS.SUCCESS, dot: KORA_COLORS.SUCCESS };
  if (status === 'Attivazione diffusa e sostenibile') return { bg: 'rgba(47,125,85,0.09)', border: 'rgba(47,125,85,0.28)', text: KORA_COLORS.SUCCESS, dot: KORA_COLORS.SUCCESS };
  return { bg: TOKENS.surface, border: TOKENS.inkBorder, text: TOKENS.inkSecondary, dot: TOKENS.inkTertiary };
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({ label, content, accent }: { label: string; content: string; accent?: boolean }) {
  return (
    <div style={{
      display:       'grid',
      gridTemplateColumns: '168px 1fr',
      gap:           '0 20px',
      padding:       '14px 0',
      borderBottom:  `1px solid ${TOKENS.inkBorder}`,
    }}>
      <div>
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    700,
          fontSize:      '9px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color:         accent ? KORA_COLORS.TERRACOTTA : TOKENS.inkHint,
          marginTop:     2,
        }}>
          {label}
        </p>
      </div>
      <p style={{
        fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:    '13px',
        fontWeight:  accent ? 600 : 400,
        lineHeight:  1.55,
        color:       accent ? TOKENS.ink : TOKENS.inkSecondary,
      }}>
        {content}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  summary: ExecutiveIntelligenceSummary;
  companyName?: string | null;
  reportingPeriod?: string;
}

export function ExecutiveIntelligencePanel({ summary, companyName, reportingPeriod }: Props) {
  const sc = statusColors(summary.organizationStatus);

  return (
    <div style={{
      background:   TOKENS.surface,
      border:       `1px solid ${sc.border}`,
      borderRadius: '10px',
      overflow:     'hidden',
      marginBottom: 28,
    }}>

      {/* ── Status header ── */}
      <div style={{
        background:    sc.bg,
        borderBottom:  `1px solid ${sc.border}`,
        padding:       '16px 24px',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        gap:           16,
        flexWrap:      'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width:        8,
            height:       8,
            borderRadius: '50%',
            background:   sc.dot,
            flexShrink:   0,
          }} />
          <div>
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    700,
              fontSize:      '9px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         TOKENS.inkHint,
              marginBottom:  3,
            }}>
              COME STIAMO{companyName ? ` · ${companyName}` : ''}
            </p>
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight: 700,
              fontSize:   '17px',
              color:      sc.text,
              lineHeight: 1.2,
            }}>
              {summary.organizationStatus}
            </p>
          </div>
        </div>
        {reportingPeriod && (
          <span style={{
            fontFamily:    'ui-monospace, SFMono-Regular, monospace',
            fontSize:      '10px',
            color:         TOKENS.inkHint,
            background:    'rgba(6,3,43,0.04)',
            border:        `1px solid ${TOKENS.inkBorder}`,
            borderRadius:  4,
            padding:       '2px 8px',
          }}>
            {reportingPeriod}
          </span>
        )}
      </div>

      {/* ── Content rows ── */}
      <div style={{ padding: '0 24px' }}>
        <Row
          label="PERCHÉ"
          content={summary.primaryConstraint}
        />
        <Row
          label="OPPORTUNITÀ PRINCIPALE"
          content={summary.wasteSignal}
        />
        <Row
          label="AZIONE PRIORITARIA"
          content={summary.primaryAction}
          accent
        />
      </div>

      {/* ── Methodology footer ── */}
      <div style={{
        padding:     '10px 24px',
        borderTop:   `1px solid ${TOKENS.inkBorder}`,
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'space-between',
        gap:         12,
        flexWrap:    'wrap',
      }}>
        <p style={{
          fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:   '11px',
          color:      TOKENS.inkTertiary,
          lineHeight: 1.4,
          maxWidth:   560,
        }}>
          {summary.confidenceNote}
        </p>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <span style={{
            fontFamily:    'ui-monospace, SFMono-Regular, monospace',
            fontSize:      '9px',
            color:         TOKENS.inkMeta,
            background:    'rgba(6,3,43,0.03)',
            border:        `1px solid ${TOKENS.inkBorder}`,
            borderRadius:  3,
            padding:       '2px 6px',
            letterSpacing: '0.03em',
          }}>
            pre_empirical_calibration
          </span>
          <span style={{
            fontFamily:    'ui-monospace, SFMono-Regular, monospace',
            fontSize:      '9px',
            color:         TOKENS.inkMeta,
            background:    'rgba(6,3,43,0.03)',
            border:        `1px solid ${TOKENS.inkBorder}`,
            borderRadius:  3,
            padding:       '2px 6px',
          }}>
            not_kora_index_component
          </span>
        </div>
      </div>

    </div>
  );
}
