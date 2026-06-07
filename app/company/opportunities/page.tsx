'use client';
// C-OPP: Opportunity Center — "Cosa devo fare adesso?"
// Full list of activation opportunities grouped by category.
// Rule-based, deterministic, no AI, no LLM. Aggregate signals only.
// pre_empirical_calibration · not_kora_index_component: true

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { useScoringResult } from '@/lib/scoring-result';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import {
  activationOpportunityService,
  type ActivationOpportunity,
  type OpportunityPriority,
  type OpportunityCategory,
} from '@/services/activation-opportunity/ActivationOpportunityService';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// ── Display helpers ────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  reach:        'Activation Reach',
  quality:      'Activation Quality',
  equity:       'Distribution & Equity',
  bti:          'Budget-to-Human-Impact',
  worker_space: 'Worker Space & Partner',
  evidence:     'Evidence & Confidence',
};

const CATEGORY_ORDER: OpportunityCategory[] = [
  'reach', 'quality', 'equity', 'bti', 'evidence', 'worker_space',
];

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
  LIFE: '#2F7D55', GROWTH: '#2F7D55', CONNECTION: '#D99767',
  IMPACT: '#D99A2B', LEGACY: '#8A7562', COMPANY: '#C76F3D', ALL: '#6156F5',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span
      style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:      '9.5px',
        fontWeight:    700,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        background:    c.bg,
        color:         c.text,
        border:        `1px solid ${c.border}`,
        borderRadius:  999,
        padding:       '2px 8px',
        whiteSpace:    'nowrap',
      }}
    >
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

function OpportunityRow({ opp }: { opp: ActivationOpportunity }) {
  const accent = PILLAR_ACCENT[opp.pillar] ?? TOKENS.accent;

  return (
    <div
      data-testid={`opp-row-${opp.ruleId}`}
      style={{
        background:   TOKENS.surface,
        border:       `1px solid ${TOKENS.inkBorder}`,
        borderRadius: TOKENS.cardRadius,
        overflow:     'hidden',
      }}
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
          <PriorityBadge priority={opp.priority} />
          {opp.pillar !== 'ALL' && opp.pillar !== 'COMPANY' && (
            <span
              style={{
                fontFamily:    'ui-monospace, monospace',
                fontSize:      '9px',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         accent,
                padding:       '3px 7px',
                background:    `${accent}12`,
                border:        `1px solid ${accent}30`,
                borderRadius:  999,
              }}
            >
              {opp.pillar}
            </span>
          )}
          <p
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '14px',
              fontWeight: 700,
              color:      TOKENS.ink,
              margin:     0,
              lineHeight: 1.3,
              flex:       1,
            }}
          >
            {opp.title}
          </p>
        </div>

        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '12.5px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.6,
            margin:     0,
          }}
        >
          {opp.description}
        </p>

        {/* Explainability — source signal */}
        <div
          style={{
            background:   TOKENS.taupe,
            borderRadius: 6,
            padding:      '10px 12px',
          }}
        >
          <p
            style={{
              fontFamily:    'ui-monospace, monospace',
              fontSize:      '8.5px',
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         TOKENS.inkTertiary,
              margin:        '0 0 4px 0',
            }}
          >
            Segnale rilevato
          </p>
          <p
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '12px',
              color:      TOKENS.inkSecondary,
              lineHeight: 1.5,
              margin:     0,
            }}
          >
            {opp.sourceSignal}
          </p>
        </div>

        {/* Two-column: expected impact + recommended action */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div
            style={{
              background:   'rgba(47,125,85,0.05)',
              border:       '1px solid rgba(47,125,85,0.14)',
              borderRadius: 6,
              padding:      '10px 12px',
            }}
          >
            <p
              style={{
                fontFamily:    'ui-monospace, monospace',
                fontSize:      '8.5px',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         '#2F7D55',
                margin:        '0 0 4px 0',
              }}
            >
              Beneficio atteso
            </p>
            <p
              style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '12px',
                color:      TOKENS.inkSecondary,
                lineHeight: 1.5,
                margin:     0,
              }}
            >
              {opp.expectedImpact}
            </p>
          </div>

          <div
            style={{
              background:   `${TOKENS.accent}08`,
              border:       `1px solid ${TOKENS.accent}22`,
              borderRadius: 6,
              padding:      '10px 12px',
            }}
          >
            <p
              style={{
                fontFamily:    'ui-monospace, monospace',
                fontSize:      '8.5px',
                fontWeight:    700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         TOKENS.accent,
                margin:        '0 0 4px 0',
              }}
            >
              Azione raccomandata
            </p>
            <p
              style={{
                fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:   '12px',
                color:      TOKENS.inkSecondary,
                lineHeight: 1.5,
                margin:     0,
              }}
            >
              {opp.recommendedAction}
            </p>
          </div>
        </div>

        {/* Rule ID footer */}
        <p
          style={{
            fontFamily:    'ui-monospace, monospace',
            fontSize:      '8.5px',
            color:         TOKENS.inkMeta,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            margin:        0,
          }}
        >
          Regola {opp.ruleId} · nessuna AI · pre_empirical_calibration
        </p>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  opportunities,
}: {
  category: OpportunityCategory;
  opportunities: ActivationOpportunity[];
}) {
  if (opportunities.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display:       'flex',
          alignItems:    'center',
          gap:           10,
          marginBottom:  14,
          paddingBottom: 10,
          borderBottom:  `1px solid ${TOKENS.inkBorder}`,
        }}
      >
        <p
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    700,
            fontSize:      '13px',
            letterSpacing: '0.04em',
            color:         TOKENS.ink,
            margin:        0,
          }}
        >
          {CATEGORY_LABELS[category]}
        </p>
        <span
          style={{
            fontFamily:    'ui-monospace, monospace',
            fontSize:      '9px',
            fontWeight:    700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         TOKENS.inkTertiary,
            background:    TOKENS.taupe,
            borderRadius:  999,
            padding:       '2px 8px',
          }}
        >
          {opportunities.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {opportunities.map((opp) => (
          <OpportunityRow key={opp.id} opp={opp} />
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId   = currentUser.company_id ?? 'meridiana-group';

  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });

  const hasKoraData = scoring?.status === 'ok';
  const output      = scoring?.koraIndex;
  const aggregate   = scoring?.aggregate;

  const opportunities: ActivationOpportunity[] = hasKoraData && output && aggregate
    ? activationOpportunityService.compute(output, aggregate)
    : [];

  // Group by category
  const byCategory = CATEGORY_ORDER.reduce<Record<string, ActivationOpportunity[]>>(
    (acc, cat) => ({
      ...acc,
      [cat]: opportunities.filter((o) => o.category === cat),
    }),
    {},
  );

  const criticalCount = opportunities.filter(o => o.priority === 'critical').length;
  const highCount     = opportunities.filter(o => o.priority === 'high').length;

  return (
    <div style={{ maxWidth: 900 }}>
      <BoundaryBadge mode="DEMO" variant="light" suffix="· segnali deterministici · nessuna AI" style={{ marginBottom: 16 }} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Link
          href="/company"
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:      '11.5px',
            color:         TOKENS.inkTertiary,
            textDecoration: 'none',
            display:       'inline-flex',
            alignItems:    'center',
            gap:           4,
            marginBottom:  12,
          }}
        >
          ← Executive Cockpit
        </Link>

        <h1
          style={{
            fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontWeight:    800,
            fontSize:      '1.75rem',
            letterSpacing: '-0.03em',
            lineHeight:    1.1,
            color:         TOKENS.ink,
            margin:        '0 0 8px 0',
          }}
        >
          Opportunità di Attivazione
        </h1>
        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '13.5px',
            color:      TOKENS.inkSecondary,
            lineHeight: 1.5,
            margin:     0,
          }}
        >
          Raccomandazioni deterministiche basate sui segnali KORA. Nessuna AI. Ogni opportunità è spiegata dal segnale che l&apos;ha generata.
        </p>
      </div>

      {/* Summary bar */}
      {opportunities.length > 0 && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       `1px solid ${TOKENS.inkBorder}`,
            borderRadius: TOKENS.cardRadius,
            padding:      '16px 20px',
            display:      'flex',
            gap:          24,
            flexWrap:     'wrap',
            marginBottom: 28,
          }}
        >
          {[
            { label: 'Totale opportunità', value: opportunities.length, color: TOKENS.ink },
            { label: 'Priorità Critica', value: criticalCount, color: '#9E3B2F' },
            { label: 'Priorità Alta', value: highCount, color: '#C76F3D' },
            { label: 'Categorie coinvolte', value: CATEGORY_ORDER.filter(c => (byCategory[c] ?? []).length > 0).length, color: TOKENS.inkSecondary },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p
                style={{
                  fontFamily:    'ui-monospace, monospace',
                  fontSize:      '9px',
                  fontWeight:    700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color:         TOKENS.inkTertiary,
                  margin:        '0 0 3px 0',
                }}
              >
                {label}
              </p>
              <p
                style={{
                  fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                  fontSize:   '22px',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  color,
                  margin:     0,
                }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Methodology notice */}
      <div
        style={{
          background:   'rgba(217,154,43,0.07)',
          border:       '1px solid rgba(217,154,43,0.22)',
          borderRadius: TOKENS.cardRadius,
          padding:      '12px 16px',
          marginBottom: 28,
        }}
      >
        <p
          style={{
            fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            fontSize:   '11.5px',
            color:      '#8A5A00',
            lineHeight: 1.55,
            margin:     0,
          }}
        >
          <strong>Foundation Light — pre-calibrazione empirica.</strong>{' '}
          Le opportunità sono generate da regole deterministiche sui componenti del KORA Index.
          Non modificano il KORA Index, la formula IU, né alcun parametro metodologico.
          Non costituiscono consulenza gestionale o previsioni di impatto.
          Nessuna AI generativa — ogni raccomandazione è spiegata dalla regola che l&apos;ha generata.
        </p>
      </div>

      {/* No data state */}
      {!hasKoraData && (
        <div
          style={{
            background:   TOKENS.surface,
            border:       `1px solid ${TOKENS.inkBorder}`,
            borderRadius: TOKENS.cardRadius,
            padding:      '32px',
            textAlign:    'center',
          }}
        >
          <p
            style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontSize:   '14px',
              color:      TOKENS.inkSecondary,
            }}
          >
            Dati KORA non disponibili per questo periodo.
          </p>
        </div>
      )}

      {/* Opportunities grouped by category */}
      {opportunities.length === 0 && hasKoraData && (
        <div
          style={{
            background:   'rgba(47,125,85,0.06)',
            border:       '1px solid rgba(47,125,85,0.18)',
            borderRadius: TOKENS.cardRadius,
            padding:      '24px',
            textAlign:    'center',
          }}
        >
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '14px', fontWeight: 700, color: '#2F7D55', margin: 0 }}>
            Nessuna opportunità critica rilevata
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12.5px', color: '#2F7D55', margin: '6px 0 0 0' }}>
            Tutti i segnali KORA sono nella zona operativa normale. Monitoraggio periodico raccomandato.
          </p>
        </div>
      )}

      {CATEGORY_ORDER.map((cat) => (
        <CategorySection
          key={cat}
          category={cat}
          opportunities={byCategory[cat] ?? []}
        />
      ))}

      {/* Provenance footer */}
      {opportunities.length > 0 && (
        <div
          style={{
            borderTop:  `1px solid ${TOKENS.inkBorder}`,
            paddingTop: 16,
            marginTop:  8,
          }}
        >
          <p
            style={{
              fontFamily:    'ui-monospace, monospace',
              fontSize:      '9px',
              color:         TOKENS.inkMeta,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              margin:        0,
            }}
          >
            Activation Opportunity Engine · regole deterministiche · no AI · no LLM · pre_empirical_calibration · not_kora_index_component: true · synthetic_demo_data: true
          </p>
        </div>
      )}
    </div>
  );
}
