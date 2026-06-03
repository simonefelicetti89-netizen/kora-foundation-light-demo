'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import Link from 'next/link';

// ── Cockpit components ────────────────────────────────────────────────────────
import { KoraIntelligenceHero }      from '@/components/company/cockpit/KoraIntelligenceHero';
import { IntelligenceBrief, deriveInsights } from '@/components/company/cockpit/IntelligenceBrief';
import { MacroblockCompositionCard } from '@/components/company/cockpit/MacroblockCompositionCard';
import { MetricTrio }                from '@/components/company/cockpit/MetricTrio';
import { ProssimaAzioneCard }        from '@/components/company/cockpit/ProssimaAzioneCard';
import { ExplainabilityHint }        from '@/components/company/cockpit/ExplainabilityHint';
import { ProvenanceFooter }          from '@/components/company/cockpit/ProvenanceFooter';

// ── Data seam — unchanged ─────────────────────────────────────────────────────
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { explainabilityService }      from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService }              from '@/services/tenant/TenantService';
import { workerProvisioningService }  from '@/services/worker-provisioning/WorkerProvisioningService';
import { TOKENS }                     from '@/lib/design/kora-design-tokens';
import { DecisionContext }           from '@/components/ui/DecisionContext';

// C-01: Executive Cockpit — narrative-first, flagship screen
export default function ExecutiveCockpit() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();

  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);

  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  useDemoScenarioComparison(companyId);

  const hasKoraData = scoring?.status === 'ok';
  const output      = scoring?.koraIndex;
  const aggregate   = scoring?.aggregate;
  const macroblocks = output?.macroblocks ?? [];

  const actions       = explainabilityService.getNextBestActions(companyId, activeScenario);
  const primaryAction = actions[0] ?? null;
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);

  // Derive narrative insights from scoring data (pure frontend computation)
  const insights = hasKoraData && output && aggregate
    ? deriveInsights({
        koraIndexValue:           output.kora_index_value,
        safeguardStatus:          output.safeguard_status,
        confidenceScore:          output.confidence_score,
        activationRate:           aggregate.activation_rate,
        meaningfulActivationRate: aggregate.meaningful_activation_rate,
        verificationRate:         aggregate.verification_rate,
        macroblocks,
        nextActionTitle:          primaryAction?.action,
      })
    : [];

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── Section 1: KORA Intelligence Hero — flagship, full-width ── */}
      {hasKoraData && output ? (
        <KoraIntelligenceHero
          value={output.kora_index_value}
          safeguardStatus={output.safeguard_status}
          confidenceScore={output.confidence_score}
          companyName={tenant?.company_name ?? companyId}
          period={output.reporting_period}
          workerCount={workerSummary.total_workers}
          methodologyVersion={output.methodology_version_id}
          calibrationStatus={output.calibration_status}
        />
      ) : (
        /* No-data state — pipeline not complete */
        <div
          style={{
            background:   'rgba(186,117,23,0.07)',
            border:       '1px solid rgba(186,117,23,0.20)',
            borderRadius: TOKENS.cardRadius,
            padding:      '28px 32px',
          }}
        >
          <p style={{ fontFamily: 'ui-monospace, monospace', fontSize: '9px', letterSpacing: '0.18em', color: '#854F0B', textTransform: 'uppercase', marginBottom: 8 }}>
            Stato Pipeline
          </p>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#5C3509', marginBottom: 6 }}>
            Dati non ancora disponibili per questo periodo
          </p>
          <p style={{ fontSize: '13px', color: '#7A4A1A', lineHeight: 1.6, maxWidth: 500 }}>
            KORA Index, Decision Pack e report saranno disponibili al completamento della pipeline dati.
          </p>
          {tenant && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(186,117,23,0.15)' }}>
              {([
                ['Onboarding',      tenant.onboarding_status.replace(/_/g, ' ')],
                ['Data readiness',  tenant.data_readiness_status],
                ['Decision Pack',   tenant.decision_pack_status],
                ['Prossima azione', tenantService.getNextAction(tenant)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p style={{ fontSize: '10px', fontWeight: 600, color: '#854F0B' }}>{label}</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#5C3509', marginTop: 2 }}>{value}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {hasKoraData && output && (
        <>
          {/* ── Decision Context ── */}
      <DecisionContext
        question="Qual è lo stato dell'attivazione umana organizzativa e quale azione ha priorità?"
      />

      {/* ── Section 2: Intelligence Brief — 3 narrative insights ── */}
          {insights.length > 0 && (
            <div style={{ marginTop: 28 }}>
              <IntelligenceBrief insights={insights} />
            </div>
          )}

          {/* ── Section 3: Activation Metrics — operational KPI strip ── */}
          {aggregate && (
            <div style={{ marginTop: 28 }}>
              <p style={{
                fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontWeight:    600,
                fontSize:      '10px',
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color:         TOKENS.inkHint,
                marginBottom:  14,
              }}>
                Metriche di attivazione
              </p>
              <MetricTrio
                activationRate={aggregate.activation_rate}
                meaningfulActivationRate={aggregate.meaningful_activation_rate}
                verificationRate={aggregate.verification_rate}
              />
            </div>
          )}

          {/* ── Section 4: Macroblock Composition — index architecture ── */}
          {macroblocks.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <MacroblockCompositionCard macroblocks={macroblocks} />
            </div>
          )}

          {/* ── Section 5: Priority Action — next board recommendation ── */}
          <div style={{ marginTop: 20 }}>
            <ProssimaAzioneCard action={primaryAction} />
          </div>

          {/* ── Section 6: Quick navigation ── */}
          <div
            style={{
              marginTop:    20,
              background:   TOKENS.taupe,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              padding:      '20px 24px',
            }}
          >
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '10px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         TOKENS.inkHint,
              marginBottom:  14,
            }}>
              Approfondimenti disponibili
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { href: '/company/kora-index',  label: 'KORA Index™ — scomposizione analitica' },
                { href: '/company/financial',   label: 'Budget-to-Human-Impact™' },
                { href: '/company/activation',  label: 'Activation Debt™ & partecipazione' },
                { href: '/company/reports',     label: 'Decision Pack — report board-ready' },
                { href: '/company/pillars',     label: 'Pillar intelligence' },
                { href: '/company/contribution', label: 'Contribution Intelligence™' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                    fontSize:      '11.5px',
                    fontWeight:    500,
                    color:         TOKENS.inkSecondary,
                    background:    TOKENS.surface,
                    border:        TOKENS.cardBorder,
                    borderRadius:  999,
                    padding:       '5px 12px',
                    textDecoration: 'none',
                    transition:    'all 140ms ease',
                    display:       'inline-block',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = TOKENS.accent;
                    (e.currentTarget as HTMLElement).style.color = TOKENS.accent;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.color = TOKENS.inkSecondary;
                  }}
                >
                  {label} →
                </Link>
              ))}
            </div>
          </div>

          {/* ── Section 7: Explainability hint ── */}
          <div style={{ marginTop: 12 }}>
            <ExplainabilityHint />
          </div>

          {/* ── Section 8: Provenance footer ── */}
          <ProvenanceFooter
            methodologyVersionId={output.methodology_version_id}
            calibrationStatus={output.calibration_status}
            reportingPeriod={output.reporting_period}
          />
        </>
      )}
    </div>
  );
}
