'use client';
// B130: Demo-only Activation Intelligence™ — dati sintetici Meridiana / Ferretti.
// Guarded by app/demo/layout.tsx (requireDemoAccess).
// Nessuna query Supabase. Nessuna sessione live. Solo dati seed sintetici.

import { useRole, useScenario }       from '@/lib/demo-state';
import { useScoringResult }            from '@/lib/scoring-result';
import { activationSafeguardService }  from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService }       from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService }  from '@/services/account/AccountProvisioningService';
import { PILLAR_CODES }                from '@/lib/constants/kora';
import { PrivacyBoundaryNotice }       from '@/components/privacy/PrivacyBoundaryNotice';
import { PageMasthead }                from '@/components/ui/PageMasthead';
import { BoundaryBadge }               from '@/components/ui/BoundaryBadge';
import { BoundaryBanner }              from '@/components/ui/BoundaryBanner';
import { DecisionContext }             from '@/components/ui/DecisionContext';
import { SectionLabel }                from '@/components/ui/SectionLabel';
import { ChartFrame }                  from '@/components/charts/ChartFrame';
import { ProvenanceFooter }            from '@/components/company/cockpit/ProvenanceFooter';
import { ExplainabilityHint }          from '@/components/company/cockpit/ExplainabilityHint';
import { TOKENS }                      from '@/lib/design/kora-design-tokens';
import { KPICard }                     from '@/components/ui/KPICard';
import { DataBar }                     from '@/components/ui/DataBar';
import { Explainer }                   from '@/components/ui/Explainer';
import type { PillarCode }             from '@/lib/types';

const SAFE_AGGREGATION_THRESHOLD = 10;

const DEPT_LABELS: Record<string, string> = {
  'dept-operations':          'Operations',
  'dept-sales':               'Sales',
  'dept-hr-people':           'HR & People',
  'dept-product-engineering': 'Product & Engineering',
  'dept-admin-finance':       'Admin & Finance',
};

type DebtLevel = 'alto' | 'medio' | 'basso';
type SiteStatus = 'ok' | 'warning' | 'flagged' | 'suppressed';

const DEBT_BADGE: Record<DebtLevel, { bg: string; text: string; dot: string; label: string }> = {
  alto:  { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   dot: TOKENS.safeguard.cap.dot,   label: 'Debt alto'  },
  medio: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, dot: TOKENS.safeguard.watch.dot, label: 'Debt medio' },
  basso: { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  dot: TOKENS.safeguard.pass.dot,  label: 'Debt basso' },
};

const SITE_BADGE: Record<SiteStatus, { bg: string; text: string; label: string }> = {
  ok:         { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  label: 'Clear'     },
  warning:    { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, label: 'Warning'   },
  flagged:    { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   label: 'Flagged'   },
  suppressed: { bg: TOKENS.inkBorder,          text: TOKENS.inkHint,              label: 'Soppressa' },
};

function pct(val: number): string { return `${(val * 100).toFixed(0)}%`; }

function pillarFill(rank: number): string {
  const opacities = [1, 0.65, 0.50, 0.35, 0.22];
  const op = opacities[rank] ?? 0.22;
  return `rgba(6,3,43,${op})`;
}

export default function DemoActivation() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();

  const COMPANY_ID = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const { data: scoring, loading } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento…</p>
      </div>
    );
  }

  const isS2 = activeScenario === 'S2';
  const debtEur = isS2 ? 35_000 : 45_000;

  const debtConcentration = isS2
    ? { bottom_50_iu_pct: 0.24, next_40_iu_pct: 0.28, top_12_iu_pct: 0.48 }
    : { bottom_50_iu_pct: 0.12, next_40_iu_pct: 0.27, top_12_iu_pct: 0.64 };

  const pillarDebt: { pillar: string; coverage: number; level: DebtLevel }[] = isS2
    ? [
        { pillar: 'LIFE',       coverage: 0.38, level: 'medio' },
        { pillar: 'GROWTH',     coverage: 0.45, level: 'medio' },
        { pillar: 'CONNECTION', coverage: 0.28, level: 'alto'  },
        { pillar: 'IMPACT',     coverage: 0.52, level: 'basso' },
        { pillar: 'LEGACY',     coverage: 0.18, level: 'alto'  },
      ]
    : [
        { pillar: 'LIFE',       coverage: 0.22, level: 'alto'  },
        { pillar: 'GROWTH',     coverage: 0.31, level: 'medio' },
        { pillar: 'CONNECTION', coverage: 0.18, level: 'alto'  },
        { pillar: 'IMPACT',     coverage: 0.44, level: 'medio' },
        { pillar: 'LEGACY',     coverage: 0.12, level: 'alto'  },
      ];

  const siteActivation: { name: string; workers: number; ar: number; status: SiteStatus }[] = isS2
    ? [
        { name: 'Sede Milano (HQ)',     workers: 100, ar: 0.72, status: 'ok'      },
        { name: 'Plant Bergamo',        workers:  90, ar: 0.22, status: 'warning' },
        { name: 'Sede Torino',          workers:  35, ar: 0.48, status: 'ok'      },
        { name: 'Remoto / distribuito', workers:  25, ar: 0.65, status: 'ok'      },
      ]
    : [
        { name: 'Sede Milano (HQ)',     workers: 100, ar: 0.60, status: 'ok'      },
        { name: 'Plant Bergamo',        workers:  90, ar: 0.11, status: 'flagged' },
        { name: 'Sede Torino',          workers:  35, ar: 0.38, status: 'warning' },
        { name: 'Remoto / distribuito', workers:  25, ar: 0.55, status: 'ok'      },
      ];

  const nextActions = explainabilityService.getNextBestActions(COMPANY_ID, activeScenario);

  const partnerSuggestions: { pillar: string; type: string; note: string }[] = isS2
    ? [
        { pillar: 'LEGACY',     type: 'Mentoring intergenerazionale',  note: 'Nessun partner attivo — priorità S2' },
        { pillar: 'IMPACT',     type: 'Iniziative territoriali e ESG', note: 'Espandere oltre partner esistenti'   },
        { pillar: 'CONNECTION', type: 'Community interna cross-sito',  note: 'Estendere a Plant Bergamo'           },
      ]
    : [
        { pillar: 'LIFE',       type: 'Prevenzione e benessere',       note: 'Copertura prodotto insufficiente' },
        { pillar: 'LEGACY',     type: 'Trasferimento knowledge',       note: 'Nessun partner attivo'           },
        { pillar: 'CONNECTION', type: 'Programma community interna',   note: 'Bassa copertura cross-reparto'   },
      ];

  const aggregate  = scoring?.aggregate;
  const safeguard  = activationSafeguardService.evaluateFromSeed(COMPANY_ID, activeScenario)
                  ?? activationSafeguardService.evaluate(0, 0);

  return (
    <div className="space-y-6">

      <BoundaryBadge mode="DEMO" variant="light" suffix={`· ${COMPANY_ID === 'meridiana-group' ? 'Meridiana' : 'Ferretti'}`} style={{ marginBottom: 6 }} />
      <PageMasthead
        eyebrow={`Intelligence operativa · ${activeScenario}`}
        title="Activation Debt™ & Partecipazione"
        subline={`Aggregato aziendale — gruppi < ${SAFE_AGGREGATION_THRESHOLD} soppressi · nessun PIB individuale · nessun dato lavoratore`}
      />
      <BoundaryBanner isLive={false} />
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

      {aggregate ? (
        <>
          {/* ── Activation Debt™ Hero ─────────────────────────────────────────── */}
          <SectionLabel>Activation Debt™ — Maggioranza Silenziosa</SectionLabel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}22`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.cap.text, fontWeight: 500 }}>Lavoratori mai attivati</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.safeguard.cap.text, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
                {Math.round((1 - aggregate.activation_rate) * aggregate.total_workers)}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.cap.text, opacity: 0.75 }}>
                {pct(1 - aggregate.activation_rate)} forza lavoro
              </p>
            </div>
            <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}22`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, fontWeight: 500 }}>Bottom 50% lavoratori</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.safeguard.watch.text, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
                {pct(debtConcentration.bottom_50_iu_pct)}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, opacity: 0.75 }}>degli IU totali</p>
            </div>
            <div style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}22`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, fontWeight: 500 }}>Top 12% lavoratori</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '2rem', color: TOKENS.safeguard.watch.text, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
                {pct(debtConcentration.top_12_iu_pct)}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.safeguard.watch.text, opacity: 0.75 }}>degli IU totali</p>
            </div>
            <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
              <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, fontWeight: 500 }}>Activation Debt stimato</p>
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.ink, lineHeight: 1, margin: '8px 0 4px', letterSpacing: '-0.025em' }}>
                €{debtEur.toLocaleString('it-IT')}
              </p>
              <p style={{ fontSize: '11px', color: TOKENS.inkHint }}>budget non convertito in IU</p>
            </div>
          </div>

          {/* ── Activation Safeguard detail ───────────────────────────────────── */}
          {safeguard && (
            <>
              <SectionLabel>Activation Safeguard</SectionLabel>
              {(() => {
                const sc = TOKENS.safeguard[safeguard.status === 'CLEAR' ? 'pass' : safeguard.status === 'WARNING' ? 'watch' : 'cap'];
                return (
                  <div style={{ background: sc.bg, border: `1px solid ${sc.dot}44`, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
                    <div className="flex items-center justify-between mb-3">
                      <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: sc.text }}>
                        Activation Safeguard
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-md font-medium" style={{ fontFamily: 'var(--font-jakarta)', background: `${sc.dot}22`, color: sc.text, fontSize: '13px', padding: '4px 10px' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                        {safeguard.status === 'CLEAR' ? 'Clear' : safeguard.status === 'WARNING' ? 'Warning' : 'Flagged'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-6">
                      <span style={{ fontSize: '12px', color: sc.text }}>
                        AR: <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700 }}>{pct(safeguard.ar_value)}</span>
                        <span style={{ opacity: 0.70 }}> (soglia CLEAR ≥ 40%)</span>
                      </span>
                      <span style={{ fontSize: '12px', color: sc.text }}>
                        MAR: <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700 }}>{pct(safeguard.mar_value)}</span>
                        <span style={{ opacity: 0.70 }}> (soglia CLEAR ≥ 30%)</span>
                      </span>
                    </div>
                    {safeguard.status !== 'CLEAR' && (
                      <p style={{ fontSize: '12px', color: sc.text, marginTop: 12, lineHeight: 1.55, opacity: 0.85 }}>
                        Soglia non raggiunta — attivazione insufficiente per almeno un indicatore primario. Il Board Pack includerà questo alert.
                      </p>
                    )}
                  </div>
                );
              })()}
            </>
          )}

          {/* ── Metriche principali ───────────────────────────────────────────── */}
          <SectionLabel>Metriche di attivazione</SectionLabel>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KPICard code="AR" label="Activation Rate" value={pct(aggregate.activation_rate)}
              status={aggregate.activation_rate >= 0.50 ? 'positive' : aggregate.activation_rate >= 0.30 ? 'warning' : 'critical'}
              period="Workforce attivata" important size="md" />
            <KPICard code="MAR" label="Meaningful Activation" value={pct(aggregate.meaningful_activation_rate)}
              status={aggregate.meaningful_activation_rate >= 0.35 ? 'positive' : aggregate.meaningful_activation_rate >= 0.20 ? 'warning' : 'critical'}
              period="Sopra soglia materialità" size="md" />
            <KPICard code="CO" label="Continuity Rate" value={pct(aggregate.continuity_rate)}
              status={aggregate.continuity_rate >= 0.40 ? 'positive' : aggregate.continuity_rate >= 0.25 ? 'warning' : 'critical'}
              period="Engagement sostenuto" size="md" />
            <KPICard code="VR" label="Verification Rate" value={pct(aggregate.verification_rate)}
              status={aggregate.verification_rate >= 0.60 ? 'positive' : aggregate.verification_rate >= 0.40 ? 'warning' : 'critical'}
              period="Evidenze verificate" size="md" />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            <Explainer what="AR misura la quota di workforce con almeno un'Impact Unit approvata nel periodo." how="<40% segnala Activation Safeguard WARNING." compact />
            <Explainer what="MAR è la quota di lavoratori con attivazione sopra la soglia di materialità." how="Il gap AR-MAR indica partecipazione superficiale." compact />
            <Explainer what="VR è la quota di Impact Units supportata da evidenza verificata o parziale." how="<60% è area critica per il Confidence Score." compact />
          </div>

          {/* ── Popolazione ───────────────────────────────────────────────────── */}
          <SectionLabel>Popolazione lavoratori</SectionLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'Lavoratori totali',    value: aggregate.total_workers },
              { label: 'Lavoratori attivi',    value: aggregate.active_worker_count },
              { label: 'Attivi significativi', value: aggregate.meaningful_active_worker_count },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
                <p style={{ fontSize: '11px', color: TOKENS.inkSecondary }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '1.75rem', color: TOKENS.ink, lineHeight: 1, marginTop: 8, letterSpacing: '-0.02em' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Concentrazione IU ─────────────────────────────────────────────── */}
          <SectionLabel>Concentrazione IU — distribuzione interna</SectionLabel>
          <ChartFrame subtitle="Distribuzione aggregata degli Impact Unit tra fasce di lavoratori. Nessun nominativo. Nessun PIB individuale.">
            <div className="space-y-3">
              {[
                { label: 'Top 12% lavoratori', value: debtConcentration.top_12_iu_pct,    fill: TOKENS.ink },
                { label: 'Fascia 38–88%',       value: debtConcentration.next_40_iu_pct,   fill: `rgba(6,3,43,0.50)` },
                { label: 'Bottom 50%',           value: debtConcentration.bottom_50_iu_pct, fill: `rgba(6,3,43,0.25)` },
              ].map((row) => (
                <DataBar key={row.label} value={row.value * 100} label={row.label} color={row.fill} animate suffix={pct(row.value)} />
              ))}
            </div>
            <p style={{ fontSize: '11px', color: TOKENS.inkHint, marginTop: 12 }}>
              Il top 12% genera {pct(debtConcentration.top_12_iu_pct)} degli IU totali. Activation Debt elevato — espansione della base prioritaria.
            </p>
          </ChartFrame>

          {/* ── Distribuzione pillar ──────────────────────────────────────────── */}
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
                    <DataBar key={pillar} label={pillar} value={share * 100} suffix={`${Math.round(share * 100)}%`} color={rank === 0 ? TOKENS.accent : pillarFill(rank)} animate />
                  ))}
                </div>
              );
            })()}
          </ChartFrame>

          {/* ── Activation Debt per pillar ────────────────────────────────────── */}
          <SectionLabel>Activation Debt per pillar</SectionLabel>
          <ChartFrame subtitle="Copertura lavoratori attivi per pillar. Pillar con copertura bassa = aree di espansione prioritaria.">
            <div className="space-y-3">
              {pillarDebt.map((row, rank) => {
                const badge = DEBT_BADGE[row.level];
                return (
                  <div key={row.pillar} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <DataBar label={row.pillar} value={row.coverage * 100} suffix={`${Math.round(row.coverage * 100)}%`} color={rank === 0 ? TOKENS.accent : pillarFill(rank)} animate />
                    </div>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '10px', fontWeight: 500, background: badge.bg, color: badge.text, padding: '2px 7px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartFrame>

          {/* ── AR per dipartimento ───────────────────────────────────────────── */}
          <SectionLabel>Tasso di attivazione per dipartimento</SectionLabel>
          <ChartFrame subtitle={`Visualizzati solo i dipartimenti con ≥${SAFE_AGGREGATION_THRESHOLD} lavoratori.`}>
            <div className="space-y-3">
              {Object.entries(aggregate.department_activation).map(([deptId, rate]) => (
                <DataBar key={deptId} label={DEPT_LABELS[deptId] ?? deptId} value={(rate as number) * 100} suffix={`${Math.round((rate as number) * 100)}%`} color={TOKENS.ink} animate />
              ))}
            </div>
          </ChartFrame>

          {/* ── Gap per sede ──────────────────────────────────────────────────── */}
          <SectionLabel>Gap per sede / sito</SectionLabel>
          <ChartFrame subtitle={`Visualizzate solo sedi con ≥${SAFE_AGGREGATION_THRESHOLD} lavoratori. I gruppi inferiori sono soppressi per privacy.`}>
            <div className="space-y-3">
              {siteActivation.map((site) => {
                if (site.status === 'suppressed') {
                  return (
                    <div key={site.name}>
                      <PrivacyBoundaryNotice reason="group_too_small" dataType={site.name} groupSize={site.workers} className="py-1" />
                    </div>
                  );
                }
                const sb = SITE_BADGE[site.status];
                return (
                  <div key={site.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <DataBar label={`${site.name} (${site.workers} lav.)`} value={site.ar * 100} suffix={`${Math.round(site.ar * 100)}%`} color={TOKENS.ink} animate />
                    </div>
                    <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '10px', background: sb.bg, color: sb.text, padding: '2px 7px', borderRadius: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {sb.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </ChartFrame>

          {/* ── Azioni prioritarie ────────────────────────────────────────────── */}
          <SectionLabel>Azioni prioritarie — riduzione Activation Debt</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            <div className="divide-y" style={{ borderColor: TOKENS.inkBorder }}>
              {nextActions.map((na) => (
                <div key={na.priority} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold" style={{ background: 'rgba(199,111,61,0.10)', color: TOKENS.accent, marginTop: 1 }}>
                    {na.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: TOKENS.ink }}>{na.action}</p>
                    {na.detail && (
                      <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginTop: 4, lineHeight: 1.6 }}>{na.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Partner suggeriti ─────────────────────────────────────────────── */}
          <SectionLabel>Partner suggeriti — copertura pillar mancante</SectionLabel>
          <div style={{ background: 'rgba(199,111,61,0.04)', border: '1px solid rgba(199,111,61,0.12)', borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, marginBottom: 12 }}>
              Suggerimenti basati sui pillar con Debt alto. Nessun marketplace, nessun prezzo, nessuna prenotazione.
            </p>
            <div className="space-y-2.5">
              {partnerSuggestions.map((ps) => (
                <div key={ps.pillar} className="flex items-baseline gap-3">
                  <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '11px', color: TOKENS.accent, width: 80, flexShrink: 0 }}>{ps.pillar}</span>
                  <span style={{ fontSize: '12px', color: TOKENS.ink }}>{ps.type}</span>
                  <span style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic' }}>{ps.note}</span>
                </div>
              ))}
            </div>
          </div>

          <ExplainabilityHint />

          {/* ── Note metodologiche ───────────────────────────────────────────── */}
          <SectionLabel>Note metodologiche</SectionLabel>
          <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '1.25rem' }}>
            <ul className="space-y-1.5">
              {[
                'Nessun PIB individuale visualizzato — vista esclusivamente aggregata.',
                `Gruppi < ${SAFE_AGGREGATION_THRESHOLD} lavoratori soppressi per soglia privacy.`,
                'Activation Debt è un indicatore diagnostico aggregato — non una valutazione individuale.',
                'Stima valore Debt: modello sintetico demo — non un output economico certificato.',
                'EQ (Equity) misura equità distributiva dell\'attivazione tra segmenti — non qualità evidenza.',
                `Vista scenario-reactive: i valori mostrano lo scenario ${activeScenario} (S1 = baseline, S2 = migliorato). Dati sintetici demo.`,
              ].map((note) => (
                <li key={note} className="flex gap-2" style={{ fontSize: '11px', color: TOKENS.inkHint, lineHeight: 1.6 }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>·</span>
                  {note}
                </li>
              ))}
            </ul>
          </div>

          <ProvenanceFooter
            methodologyVersionId={aggregate.methodology_version_id}
            calibrationStatus={aggregate.calibration_status}
            reportingPeriod={aggregate.reporting_period}
          />
        </>
      ) : (
        <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '2rem', textAlign: 'center', color: TOKENS.inkHint }}>
          Nessun dato aggregato disponibile per questo scenario.
        </div>
      )}
    </div>
  );
}
