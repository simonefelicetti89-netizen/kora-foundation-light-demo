'use client';

// InitiativeExplainabilityPanel — company-facing, aggregate-safe.
// Fetches /api/company/initiatives/explainability.
// Shows per-initiative eligibility class, reason, and KORA Index contribution.
// Never exposes worker-level fields.

import { useState, useEffect } from 'react';
import type { InitiativeExplainabilityEntry, InitiativeEligibilityClass } from '@/app/api/company/initiatives/explainability/route';
import { TOKENS } from '@/lib/design/kora-design-tokens';

interface Props {
  period?: string | null;
}

interface ApiResponse {
  ok:           boolean;
  initiatives?: InitiativeExplainabilityEntry[];
  total?:       number;
  period?:      string | null;
  note?:        string;
  noDataReason?: string;
  error?:       string;
  fallback?:    boolean;
  hint?:        string;
}

type PanelState = 'loading' | 'empty' | 'error' | 'data';

const CLASS_META: Record<InitiativeEligibilityClass, {
  label:       string;
  badgeColor:  string;
  badgeBg:     string;
  explanation: string;
}> = {
  eligible: {
    label:       'Idonea',
    badgeColor:  TOKENS.safeguard.pass.text,
    badgeBg:     TOKENS.safeguard.pass.bg,
    explanation: 'Genera Impact Units (IU) che alimentano il calcolo KORA Index™.',
  },
  limited: {
    label:       'Idonea con limitazioni',
    badgeColor:  TOKENS.safeguard.watch.text,
    badgeBg:     TOKENS.safeguard.watch.bg,
    explanation: 'Rilevata come sollievo economico o opportunità. Non genera attivazione profonda né IU diretti.',
  },
  blocked: {
    label:       'Bloccata',
    badgeColor:  TOKENS.safeguard.cap.text,
    badgeBg:     TOKENS.safeguard.cap.bg,
    explanation: 'Baseline legale o compliance obbligatoria. Esclusa dal calcolo KORA Index™ per design.',
  },
  review_required: {
    label:       'In revisione',
    badgeColor:  TOKENS.violet,
    badgeBg:     'rgba(97,86,245,0.08)',
    explanation: 'KORA Admin ha bisogno di ulteriori informazioni prima dello scoring. Non ancora conteggiata.',
  },
  unknown: {
    label:       'Non classificata',
    badgeColor:  TOKENS.inkSecondary,
    badgeBg:     'rgba(6,3,43,0.05)',
    explanation: 'Classificazione non disponibile per questo periodo.',
  },
};

function EligibilityBadge({ cls }: { cls: InitiativeEligibilityClass }) {
  const meta = CLASS_META[cls];
  return (
    <span style={{
      display:       'inline-block',
      fontSize:      '10px',
      fontWeight:    600,
      borderRadius:  4,
      padding:       '2px 8px',
      color:         meta.badgeColor,
      background:    meta.badgeBg,
      whiteSpace:    'nowrap',
    }}>
      {meta.label}
    </span>
  );
}

function ContributionChip({ contributed }: { contributed: boolean }) {
  return (
    <span style={{
      display:    'inline-block',
      fontSize:   '10px',
      fontWeight: 600,
      borderRadius: 4,
      padding:    '2px 8px',
      color:      contributed ? TOKENS.safeguard.pass.text : TOKENS.inkSecondary,
      background: contributed ? TOKENS.safeguard.pass.bg   : 'rgba(6,3,43,0.05)',
      whiteSpace: 'nowrap',
    }}>
      {contributed ? '✓ Contribuisce al KORA Index™' : '— Non contribuisce'}
    </span>
  );
}

function LegendRow({ cls }: { cls: InitiativeEligibilityClass }) {
  const meta = CLASS_META[cls];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
      <span style={{
        flexShrink:  0,
        fontSize:    '10px',
        fontWeight:  600,
        borderRadius: 4,
        padding:     '2px 7px',
        color:       meta.badgeColor,
        background:  meta.badgeBg,
        marginTop:   1,
      }}>
        {meta.label}
      </span>
      <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}>
        {meta.explanation}
      </p>
    </div>
  );
}

function InitiativeRow({ item }: { item: InitiativeExplainabilityEntry }) {
  return (
    <div style={{
      padding:      '12px 16px',
      borderBottom: TOKENS.cardBorder,
      display:      'flex',
      gap:          12,
      flexWrap:     'wrap',
      alignItems:   'flex-start',
    }}
    data-testid="initiative-row"
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}
           data-testid="initiative-name">
          {item.initiativeName}
        </p>
        {item.pillar && (
          <p style={{ fontSize: '10px', color: TOKENS.inkHint, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>
            {item.pillar}
          </p>
        )}
        <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55 }}
           data-testid="initiative-reason">
          {item.reason}
        </p>
        {!item.contributedToKoraIndex && item.whyNotContributed && (
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.55, marginTop: 4, fontStyle: 'italic' }}
             data-testid="initiative-why-not">
            {item.whyNotContributed}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
        <EligibilityBadge cls={item.eligibilityClass} />
        <ContributionChip contributed={item.contributedToKoraIndex} />
        {(item.approvedCount > 0 || item.pendingCount > 0 || item.blockedCount > 0) && (
          <p style={{ fontSize: '10px', color: TOKENS.inkHint, textAlign: 'right' }}>
            {item.approvedCount > 0 && <span>Approvate: {item.approvedCount} </span>}
            {item.pendingCount  > 0 && <span>In attesa: {item.pendingCount} </span>}
            {item.blockedCount  > 0 && <span>Bloccate: {item.blockedCount}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

export function InitiativeExplainabilityPanel({ period }: Props) {
  const [state, setState]   = useState<PanelState>('loading');
  const [data,  setData]    = useState<ApiResponse | null>(null);
  const [open,  setOpen]    = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setState('loading');
      try {
        const url = period
          ? `/api/company/initiatives/explainability?period=${encodeURIComponent(period)}`
          : '/api/company/initiatives/explainability';
        const r = await fetch(url, { credentials: 'include' });
        const json = await r.json() as ApiResponse;
        if (!active) return;
        setData(json);
        if (!json.ok || json.fallback) { setState('error');  return; }
        if (!json.initiatives || json.initiatives.length === 0) { setState('empty'); return; }
        setState('data');
      } catch {
        if (active) setState('error');
      }
    }
    load();
    return () => { active = false; };
  }, [period]);

  const panelStyle = {
    background:   TOKENS.surface,
    border:       TOKENS.cardBorder,
    borderRadius: TOKENS.cardRadius,
    overflow:     'hidden',
    marginTop:    12,
  };

  const headerStyle = {
    padding:      '0.875rem 1.25rem',
    borderBottom: open ? TOKENS.cardBorder : 'none',
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    cursor:       'pointer',
  } as const;

  return (
    <div style={panelStyle} data-testid="initiative-explainability-panel">

      {/* ── Header / toggle ── */}
      <div
        role="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={headerStyle}
      >
        <div style={{ flex: 1 }}>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink }}>
            Perché le iniziative hanno inciso
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 2 }}>
            KORA non trasforma la compliance in impatto — solo le iniziative idonee generano Impact Units.
          </p>
        </div>
        {state === 'data' && data?.total != null && (
          <span style={{ fontSize: '10px', fontWeight: 600, background: 'rgba(6,3,43,0.05)', color: TOKENS.inkSecondary, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>
            {data.total} {data.total === 1 ? 'iniziativa' : 'iniziative'}
          </span>
        )}
        <span style={{ fontSize: '12px', color: TOKENS.inkHint, flexShrink: 0 }}>
          {open ? '▲' : '▼'}
        </span>
      </div>

      {/* ── Body — only when open ── */}
      {open && (
        <>
          {/* ── Legend ── */}
          <div style={{ padding: '12px 16px', borderBottom: TOKENS.cardBorder, background: 'rgba(6,3,43,0.02)' }}
               data-testid="eligibility-legend">
            <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.09em', color: TOKENS.inkHint, marginBottom: 8 }}>
              Come vengono classificate le iniziative
            </p>
            <LegendRow cls="eligible" />
            <LegendRow cls="limited" />
            <LegendRow cls="blocked" />
            <LegendRow cls="review_required" />
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 8, fontStyle: 'italic' }}>
              I dati sono elaborati a livello organizzativo — nessun dato individuale è visibile.
            </p>
          </div>

          {/* ── States ── */}
          {state === 'loading' && (
            <div style={{ padding: '24px', textAlign: 'center' }} data-testid="initiative-loading">
              <p style={{ fontSize: '12px', color: TOKENS.inkHint }}>Caricamento iniziative…</p>
            </div>
          )}

          {state === 'error' && (
            <div style={{ padding: '20px 16px' }} data-testid="initiative-error">
              <p style={{ fontSize: '12px', color: TOKENS.inkHint, fontStyle: 'italic' }}>
                {data?.error ?? 'Dati di explainability non disponibili per questo periodo.'}
              </p>
              {data?.hint && (
                <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 6 }}>{data.hint}</p>
              )}
            </div>
          )}

          {state === 'empty' && (
            <div style={{ padding: '20px 16px' }} data-testid="initiative-empty">
              <p style={{ fontSize: '12px', color: TOKENS.inkHint }}>
                {data?.noDataReason ?? 'Nessuna iniziativa trovata per questo periodo.'}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 6, fontStyle: 'italic' }}>
                Le iniziative compariranno qui dopo che KORA Admin avrà elaborato le tue UEF candidate.
              </p>
            </div>
          )}

          {state === 'data' && data?.initiatives && (
            <div data-testid="initiative-list">
              {data.initiatives.map((item, i) => (
                <InitiativeRow key={`${item.initiativeName}|${item.pillar ?? ''}|${i}`} item={item} />
              ))}
            </div>
          )}

          {/* ── Footer ── */}
          <p style={{ padding: '8px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
            Aggregato per categoria iniziativa · nessun dato individuale incluso · pre_empirical_calibration
          </p>
        </>
      )}
    </div>
  );
}
