'use client';
// C-08: Activation Intelligence™ — live-only: richiede sessione company autenticata.
// Risponde a: chi non viene raggiunto e dove si accumula il debt?
// Privacy: aggregato aziendale, N≥10, nessun dato individuale.
// Nessun dato sintetico. Nessun branch demo.

import { useScoringResult }             from '@/lib/scoring-result';
import { useCompanySession }            from '../_providers/CompanySessionProvider';
import { activationSafeguardService }   from '@/services/activation-safeguard/ActivationSafeguardService';
import { PILLAR_CODES }                 from '@/lib/constants/kora';
import { PrivacyBoundaryNotice }        from '@/components/privacy/PrivacyBoundaryNotice';
import { PageMasthead }                 from '@/components/ui/PageMasthead';
import { BoundaryBadge }                from '@/components/ui/BoundaryBadge';
import { BoundaryBanner }               from '@/components/ui/BoundaryBanner';
import { DecisionContext }              from '@/components/ui/DecisionContext';
import { SectionLabel }                 from '@/components/ui/SectionLabel';
import { ChartFrame }                   from '@/components/charts/ChartFrame';
import { ProvenanceFooter }             from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint }           from '@/components/company/cockpit/ExplainabilityHint';
import { TOKENS }                       from '@/lib/design/kora-design-tokens';
import { KPICard }                      from '@/components/ui/KPICard';
import { DataBar }                      from '@/components/ui/DataBar';
import { Explainer }                    from '@/components/ui/Explainer';
import type { PillarCode }              from '@/lib/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

const DEPT_LABELS: Record<string, string> = {
  'dept-operations':          'Operations',
  'dept-sales':               'Sales',
  'dept-hr-people':           'HR & People',
  'dept-product-engineering': 'Product & Engineering',
  'dept-admin-finance':       'Admin & Finance',
};

function pct(val: number): string { return `${(val * 100).toFixed(0)}%`; }

function pillarFill(rank: number): string {
  const opacities = [1, 0.65, 0.50, 0.35, 0.22];
  const op = opacities[rank] ?? 0.22;
  return `rgba(6,3,43,${op})`;
}

export default function Activation() {
  const { tenantId: liveId, sessionLoading } = useCompanySession();

  const COMPANY_ID = liveId ?? '';
  const { data: scoring, loading } = useScoringResult({
    tenantId:         COMPANY_ID,
    scenarioId:       'S1',
    forceEnvironment: 'live',
  });

  // ── Loading guard — MUST precede any data access ──────────────────────────
  if (sessionLoading || loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento…</p>
      </div>
    );
  }

  const hasKoraData = scoring?.status === 'ok';
  if (!hasKoraData) {
    return (
      <div className="space-y-4">
        <div style={{ padding: '32px 0' }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#06032B' }}>
            Dati di attivazione non ancora disponibili
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(6,3,43,0.52)', marginTop: 6 }}>
            Completa il processo di intake e scoring per visualizzare i dati di attivazione live.
          </p>
        </div>
      </div>
    );
  }

  const aggregate = scoring!.aggregate!;
  const AR        = aggregate.activation_rate;
  const MAR       = aggregate.meaningful_activation_rate;
  const safeguard = activationSafeguardService.evaluate(AR, MAR);

  return (
    <div className="space-y-6">

      <BoundaryBadge mode="LIVE" variant="light" style={{ marginBottom: 6 }} />
      <PageMasthead
        eyebrow="Intelligence operativa · LIVE"
        title="Activation Debt™ & Partecipazione"
        subline={`Aggregato aziendale — gruppi < ${SAFE_AGGREGATION_THRESHOLD} soppressi · nessun PIB individuale · nessun dato lavoratore`}
      />
      <BoundaryBanner isLive={true} />
      <DecisionContext
        question="Chi non viene raggiunto e dove si accumula l'Activation Debt™ nella forza lavoro?"
        boundary="Soglia privacy N≥10 per segmento · nessun dato individuale · aggregato aziendale"
      />

      {/* ── Safeguard status ─────────────────────────────────────────────────── */}
      {safeguard && (
        <div
          style={{
            background:   safeguard.status === 'CLEAR'   ? TOKENS.safeguard.pass.bg
                        : safeguard.status === 'FLAGGED' ? TOKENS.safeguard.cap.bg
                        : TOKENS.safeguard.watch.bg,
            border:       safeguard.status === 'CLEAR'   ? `1px solid ${TOKENS.safeguard.pass.dot}40`
                        : safeguard.status === 'FLAGGED' ? `1px solid ${TOKENS.safeguard.cap.dot}40`
                        : `1px solid ${TOKENS.safeguard.watch.dot}40`,
            borderRadius: TOKENS.cardRadius,
            padding:      '16px 20px',
            display:      'flex',
            alignItems:   'center',
            gap:          14,
          }}
        >
          <span style={{
            width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
            background: safeguard.status === 'CLEAR'   ? TOKENS.safeguard.pass.dot
                      : safeguard.status === 'FLAGGED' ? TOKENS.safeguard.cap.dot
                      : TOKENS.safeguard.watch.dot,
          }} />
          <div style={{ flex: 1 }}>
            <p style={{
              fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight: 700, fontSize: '13px',
              color: safeguard.status === 'CLEAR'   ? TOKENS.safeguard.pass.text
                   : safeguard.status === 'FLAGGED' ? TOKENS.safeguard.cap.text
                   : TOKENS.safeguard.watch.text,
            }}>
              Activation Safeguard™: {safeguard.status}
              {' '}· AR {pct(safeguard.ar_value)} · MAR {pct(safeguard.mar_value)}
            </p>
          </div>
        </div>
      )}

      {/* ── Lavoratori mai attivati ───────────────────────────────────────────── */}
      <SectionLabel>Activation Debt™ — Maggioranza Silenziosa</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}22`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: TOKENS.safeguard.cap.text, fontWeight: 500 }}>
            Lavoratori mai attivati
          </p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.safeguard.cap.text, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
            {Math.round((1 - aggregate.activation_rate) * aggregate.total_workers)}
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.safeguard.cap.text, opacity: 0.75 }}>
            {pct(1 - aggregate.activation_rate)} forza lavoro
          </p>
        </div>
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, fontWeight: 500 }}>Lavoratori attivi</p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
            {aggregate.active_worker_count}
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>con almeno un IU approvato</p>
        </div>
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, fontWeight: 500 }}>Attivi significativi</p>
          <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
            {aggregate.meaningful_active_worker_count}
          </p>
          <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>sopra soglia materialità</p>
        </div>
      </div>

      {/* ── Metriche principali ───────────────────────────────────────────────── */}
      <SectionLabel>Metriche di attivazione</SectionLabel>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KPICard
          code="AR"
          label="Activation Rate"
          value={pct(aggregate.activation_rate)}
          status={aggregate.activation_rate >= 0.50 ? 'positive' : aggregate.activation_rate >= 0.30 ? 'warning' : 'critical'}
          period="Workforce attivata"
          important
          size="md"
        />
        <KPICard
          code="MAR"
          label="Meaningful Activation"
          value={pct(aggregate.meaningful_activation_rate)}
          status={aggregate.meaningful_activation_rate >= 0.35 ? 'positive' : aggregate.meaningful_activation_rate >= 0.20 ? 'warning' : 'critical'}
          period="Sopra soglia materialità"
          size="md"
        />
        <KPICard
          code="CO"
          label="Continuity Rate"
          value={pct(aggregate.continuity_rate)}
          status={aggregate.continuity_rate >= 0.40 ? 'positive' : aggregate.continuity_rate >= 0.25 ? 'warning' : 'critical'}
          period="Engagement sostenuto"
          size="md"
        />
        <KPICard
          code="VR"
          label="Verification Rate"
          value={pct(aggregate.verification_rate)}
          status={aggregate.verification_rate >= 0.60 ? 'positive' : aggregate.verification_rate >= 0.40 ? 'warning' : 'critical'}
          period="Evidenze verificate"
          size="md"
        />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
        <Explainer
          what="AR misura la quota di workforce con almeno un'Impact Unit approvata nel periodo."
          how="<40% segnala Activation Safeguard WARNING. Più alto = più lavoratori raggiunti."
          compact
        />
        <Explainer
          what="MAR è la quota di lavoratori con attivazione sopra la soglia di materialità."
          how="MAR < AR per definizione. Il gap indica partecipazione superficiale da approfondire."
          compact
        />
        <Explainer
          what="VR è la quota di Impact Units supportata da evidenza verificata o parziale."
          how="Più basso = Confidence Score™ più basso. <60% è area critica."
          compact
        />
      </div>

      {/* ── Distribuzione pillar (live data) ─────────────────────────────────── */}
      <SectionLabel>Distribuzione pillar</SectionLabel>
      <ChartFrame subtitle="Distribuzione aggregata a livello aziendale. Nessun dato individuale del lavoratore.">
        {(() => {
          const pillarShares = PILLAR_CODES.map((p) => ({
            pillar: p,
            share: aggregate.pillar_distribution[p as PillarCode] ?? 0,
          })).sort((a, b) => b.share - a.share);
          return (
            <div className="space-y-3">
              {pillarShares.map(({ pillar, share }, rank) => (
                <DataBar
                  key={pillar}
                  label={pillar}
                  value={share * 100}
                  suffix={`${Math.round(share * 100)}%`}
                  color={rank === 0 ? TOKENS.accent : pillarFill(rank)}
                  animate
                />
              ))}
            </div>
          );
        })()}
      </ChartFrame>

      {/* ── AR per dipartimento (live data) ──────────────────────────────────── */}
      <SectionLabel>Tasso di attivazione per dipartimento</SectionLabel>
      <ChartFrame subtitle={`Visualizzati solo i dipartimenti con ≥${SAFE_AGGREGATION_THRESHOLD} lavoratori.`}>
        {Object.keys(aggregate.department_activation).length === 0 ? (
          <PrivacyBoundaryNotice reason="group_too_small" dataType="dipartimenti" groupSize={0} className="py-1" />
        ) : (
          <div className="space-y-3">
            {Object.entries(aggregate.department_activation).map(([deptId, rate]) => (
              <DataBar
                key={deptId}
                label={DEPT_LABELS[deptId] ?? deptId}
                value={(rate as number) * 100}
                suffix={`${Math.round((rate as number) * 100)}%`}
                color={TOKENS.ink}
                animate
              />
            ))}
          </div>
        )}
      </ChartFrame>

      {/* ── Explainability hint ───────────────────────────────────────────────── */}
      <ExplainabilityHint />

      {/* ── Note metodologiche ───────────────────────────────────────────────── */}
      <SectionLabel>Note metodologiche</SectionLabel>
      <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
        <ul className="space-y-1.5">
          {[
            'Nessun PIB individuale visualizzato — vista esclusivamente aggregata.',
            `Gruppi < ${SAFE_AGGREGATION_THRESHOLD} lavoratori soppressi per soglia privacy (safe_aggregation_threshold = ${SAFE_AGGREGATION_THRESHOLD}).`,
            'Activation Debt è un indicatore diagnostico aggregato — non una valutazione individuale.',
            'EQ (Equity) misura equità distributiva dell\'attivazione tra segmenti — non qualità evidenza.',
            'I grafici di dettaglio per sede e per pillar sono disponibili nella versione demo sintetica.',
          ].map((note) => (
            <li key={note} className="flex gap-2" style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
              <span style={{ flexShrink: 0, marginTop: 1 }}>·</span>
              {note}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Provenance footer ─────────────────────────────────────────────────── */}
      <ProvenanceFooter
        methodologyVersionId={aggregate.methodology_version_id}
        calibrationStatus={aggregate.calibration_status}
        reportingPeriod={aggregate.reporting_period}
      />

    </div>
  );
}
