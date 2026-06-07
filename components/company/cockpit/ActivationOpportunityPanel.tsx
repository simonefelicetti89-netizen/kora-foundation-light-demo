'use client';
// ActivationOpportunityPanel — cockpit summary, top 3 opportunities.
// "Cosa devo fare adesso?" — CEO readable in 30 seconds.
// Rule-based, deterministic, no AI, no LLM. Aggregate only, no individual worker data.
// methodologyStatus: pre_empirical_calibration · not_kora_index_component: true

import Link from 'next/link';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { ActivationOpportunity, OpportunityPriority } from '@/services/activation-opportunity/ActivationOpportunityService';

// ── Priority display helpers ──────────────────────────────────────────────────

const PRIORITY_LABEL: Record<OpportunityPriority, string> = {
  critical: 'Critica',
  high:     'Alta',
  medium:   'Media',
  low:      'Bassa',
};

const PRIORITY_COLORS: Record<OpportunityPriority, { bg: string; text: string; border: string }> = {
  critical: { bg: 'rgba(158,59,47,0.08)',  text: '#9E3B2F', border: 'rgba(158,59,47,0.20)' },
  high:     { bg: 'rgba(199,111,61,0.08)', text: '#C76F3D', border: 'rgba(199,111,61,0.22)' },
  medium:   { bg: 'rgba(217,154,43,0.08)', text: '#8A5A00', border: 'rgba(217,154,43,0.22)' },
  low:      { bg: 'rgba(6,3,43,0.04)',     text: 'rgba(6,3,43,0.52)', border: 'rgba(6,3,43,0.08)' },
};

const PILLAR_ACCENT: Record<string, string> = {
  LIFE:       '#2F7D55',
  GROWTH:     '#2F7D55',
  CONNECTION: '#D99767',
  IMPACT:     '#D99A2B',
  LEGACY:     '#8A7562',
  COMPANY:    '#C76F3D',
  ALL:        '#6156F5',
};

interface ActivationOpportunityPanelProps {
  opportunities: ActivationOpportunity[];
  maxVisible?: number;
}

function OpportunityCard({ opp }: { opp: ActivationOpportunity }) {
  const pc = PRIORITY_COLORS[opp.priority];
  const accent = PILLAR_ACCENT[opp.pillar] ?? TOKENS.accent;

  return (
    <div
      data-testid={`opportunity-card-${opp.ruleId}`}
      style={{
        background:   TOKENS.surface,
        border:       `1px solid ${TOKENS.inkBorder}`,
        borderRadius: TOKENS.cardRadius,
        overflow:     'hidden',
        display:      'flex',
        flexDirection: 'column',
      }}
    >
      {/* Pillar accent bar */}
      <div style={{ height: 3, background: accent, flexShrink: 0 }} />

      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Header: priority + pillar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:      '9.5px',
              fontWeight:    700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              background:    pc.bg,
              color:         pc.text,
              border:        `1px solid ${pc.border}`,
              borderRadius:  999,
              padding:       '2px 8px',
            }}
          >
            Priorità {PRIORITY_LABEL[opp.priority]}
          </span>
          {opp.pillar !== 'ALL' && opp.pillar !== 'COMPANY' && (
            <span
              style={{
                fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:      '9.5px',
                fontWeight:    600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color:         accent,
                opacity:       0.85,
              }}
            >
              {opp.pillar}
            </span>
          )}
        </div>

        {/* Title */}
        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '13.5px',
            fontWeight: 700,
            color:      TOKENS.ink,
            lineHeight: 1.3,
            margin:     0,
          }}
        >
          {opp.title}
        </p>

        {/* Why — explainability */}
        <div
          style={{
            background:   TOKENS.taupe,
            borderRadius: 6,
            padding:      '8px 10px',
          }}
        >
          <p
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize:   '9px',
              fontWeight: 600,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color:      TOKENS.inkTertiary,
              margin:     '0 0 4px 0',
            }}
          >
            Rilevato perché
          </p>
          <p
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '11.5px',
              color:      TOKENS.inkSecondary,
              lineHeight: 1.5,
              margin:     0,
            }}
          >
            {opp.sourceSignal.replace(/^Rilevato perché:\s*/i, '')}
          </p>
        </div>

        {/* Expected impact */}
        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '11.5px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.5,
            margin:     0,
            flex:       1,
          }}
        >
          <span style={{ fontWeight: 600, color: TOKENS.inkSecondary }}>Beneficio atteso: </span>
          {opp.expectedImpact}
        </p>
      </div>
    </div>
  );
}

export function ActivationOpportunityPanel({
  opportunities,
  maxVisible = 3,
}: ActivationOpportunityPanelProps) {
  if (opportunities.length === 0) return null;

  const visible = opportunities.slice(0, maxVisible);
  const hasMore = opportunities.length > maxVisible;

  return (
    <div data-testid="activation-opportunity-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p
            style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    800,
              fontSize:      '17px',
              letterSpacing: '-0.02em',
              color:         TOKENS.ink,
              margin:        0,
            }}
          >
            Opportunità di Attivazione
          </p>
          <p
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '12px',
              color:      TOKENS.inkTertiary,
              margin:     '3px 0 0 0',
            }}
          >
            {opportunities.length} raccomandazion{opportunities.length === 1 ? 'e' : 'i'} identificat{opportunities.length === 1 ? 'a' : 'e'} — regole deterministiche sui segnali KORA
          </p>
        </div>

        {hasMore && (
          <Link
            href="/company/opportunities"
            style={{
              fontFamily:     'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:       '12px',
              fontWeight:     600,
              color:          TOKENS.accent,
              textDecoration: 'none',
              whiteSpace:     'nowrap',
            }}
          >
            Mostra tutte ({opportunities.length}) →
          </Link>
        )}
      </div>

      {/* Cards grid */}
      <div
        style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap:                 12,
        }}
      >
        {visible.map((opp) => (
          <OpportunityCard key={opp.id} opp={opp} />
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop:  10,
          display:    'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize:   '9px',
            color:      TOKENS.inkMeta,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            margin:     0,
          }}
        >
          Regole deterministiche · nessuna AI · pre_empirical_calibration · not_kora_index_component
        </p>

        {hasMore && (
          <Link
            href="/company/opportunities"
            style={{
              fontFamily:     'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:       '11px',
              fontWeight:     600,
              color:          TOKENS.accent,
              textDecoration: 'none',
            }}
          >
            Vedi tutte le opportunità →
          </Link>
        )}
      </div>
    </div>
  );
}
