'use client';
// C-01: Executive Cockpit™ — vista di comando per CEO/HR/Finance.
// Scopo: rispondere a 'qual è lo stato dell'attivazione umana e dove devo agire?'
// Struttura narrativa: Hero → Segnali → Metriche → Macroblocchi → Azione → Deep dive.
// B80-B: pure DEMO page — synthetic Meridiana scenario data only.


import { useRole, useScenario } from '@/lib/demo-state';
import Link from 'next/link';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

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
import { explainabilityService }           from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService }      from '@/services/account/AccountProvisioningService';
import { tenantService }                   from '@/services/tenant/TenantService';
import { workerProvisioningService }       from '@/services/worker-provisioning/WorkerProvisioningService';
import { workerSpaceCapabilityService }    from '@/services/worker-space/WorkerSpaceCapabilityService';
import { TOKENS }                          from '@/lib/design/kora-design-tokens';

// ── Worker Space panel ─────────────────────────────────────────────────────────
import { WorkerAdoptionPanel } from '@/components/company/cockpit/WorkerAdoptionPanel';

// ── Activation Opportunity Engine ─────────────────────────────────────────────
import { ActivationOpportunityPanel } from '@/components/company/cockpit/ActivationOpportunityPanel';
import { activationOpportunityService } from '@/services/activation-opportunity/ActivationOpportunityService';

// ── Feature Discovery ─────────────────────────────────────────────────────────
import { COCKPIT_FEATURE_CARDS, DISCOVERY_STRIP_ITEMS } from '@/lib/feature-discovery';

// Section label between major page sections
function SectionMark({ label }: { label: string }) {
  return (
    <p style={{
      fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
      fontWeight:    600,
      fontSize:      '10px',
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      color:         TOKENS.inkHint,
      marginBottom:  14,
    }}>
      {label}
    </p>
  );
}

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

  const actions          = explainabilityService.getNextBestActions(companyId, activeScenario);
  const primaryAction    = actions[0] ?? null;

  const opportunities = hasKoraData && output && aggregate
    ? activationOpportunityService.getTop(output, aggregate, 3)
    : [];
  const workerSummary    = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const workerCapability = workerSpaceCapabilityService.getCapabilityByCompanyId(companyId);

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

  if (!hasKoraData || !output) {
    return (
      <div style={{ maxWidth: 860 }}>
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
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '15px', fontWeight: 700, color: '#5C3509', marginBottom: 6 }}>
            Dati non ancora disponibili per questo periodo
          </p>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '13px', color: '#7A4A1A', lineHeight: 1.6, maxWidth: 500 }}>
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
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 860 }}>
      <BoundaryBadge mode="DEMO" variant="light" suffix="· Meridiana · dati sintetici" style={{ marginBottom: 12 }} />

      {/* ── Feature Discovery Strip — "KORA ora include" ── Task 7 ── */}
      <div
        data-testid="feature-discovery-strip"
        style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}
      >
        <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: TOKENS.inkHint, marginRight: 2 }}>
          KORA ora include
        </span>
        {DISCOVERY_STRIP_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            data-testid={`discovery-chip-${item.id}`}
            style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '10.5px', fontWeight: 500, color: TOKENS.inkSecondary, background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: 999, padding: '4px 12px', textDecoration: 'none', display: 'inline-block', lineHeight: 1.4 }}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* ── Section 1: Intelligence Hero — flagship, full-width ── */}
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

      {/* ── Section 1b: "Cosa ha trovato KORA" — 4 feature cards ── Task 1 ── */}
      {hasKoraData && (
        <div data-testid="kora-found-section" style={{ marginTop: 28 }}>
          <SectionMark label="Cosa ha trovato KORA" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))', gap: 10 }}>
            {COCKPIT_FEATURE_CARDS.map((card) => (
              <div
                key={card.id}
                data-testid={`feature-card-${card.id}`}
                style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12px', fontWeight: 700, color: TOKENS.ink, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                  {card.headline}
                </p>
                <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, flex: 1 }}>
                  {card.sentence}
                </p>
                <Link
                  href={card.href}
                  style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '10.5px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}
                >
                  {card.cta} →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 2: Intelligence Brief — 3 signals ── */}
      {insights.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <SectionMark label="Segnali chiave" />
          <IntelligenceBrief insights={insights} />
        </div>
      )}

      {/* ── Section 3: Activation Metrics ── */}
      {aggregate && (
        <div style={{ marginTop: 36 }}>
          <SectionMark label="Metriche di attivazione" />
          <MetricTrio
            activationRate={aggregate.activation_rate}
            meaningfulActivationRate={aggregate.meaningful_activation_rate}
            verificationRate={aggregate.verification_rate}
          />
        </div>
      )}

      {/* ── Section 3b: Activation Opportunities — "Cosa devo fare adesso?" ── Task 2 ── */}
      {hasKoraData && (
        <div style={{ marginTop: 36 }}>
          <SectionMark label="Opportunità di attivazione" />
          {opportunities.length > 0 ? (
            <ActivationOpportunityPanel opportunities={opportunities} maxVisible={3} />
          ) : (
            <div
              data-testid="opportunities-empty-state"
              style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadiusSm, padding: '24px', textAlign: 'center' }}
            >
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12px', color: TOKENS.inkHint, marginBottom: 10 }}>
                Disponibile con dati live o scenario demo.
              </p>
              <Link href="/company/opportunities" style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none' }}>
                Vai alle opportunità →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Board Pack CTA ── Task 4 ── */}
      {hasKoraData && (
        <div data-testid="board-pack-card" style={{ marginTop: 16 }}>
          <div style={{ background: TOKENS.ink, borderRadius: TOKENS.cardRadiusSm, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 700, fontSize: '13px', color: '#FFFFFF', marginBottom: 4 }}>
                Decision Pack — Board Pack
              </p>
              <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11.5px', color: 'rgba(255,255,255,0.52)', maxWidth: 440, lineHeight: 1.5 }}>
                Report pilotabile con Executive Summary, macroblocchi, componenti, Evidence Intelligence e opportunità.
              </p>
            </div>
            <Link
              href="/company/reports"
              data-testid="board-pack-cta"
              style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '12px', fontWeight: 700, color: TOKENS.ink, background: '#FFFFFF', borderRadius: 10, padding: '8px 18px', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
            >
              Apri Board Pack →
            </Link>
          </div>
        </div>
      )}

      {/* ── Section 4: Macroblock Composition ── */}
      {macroblocks.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <MacroblockCompositionCard macroblocks={macroblocks} />
        </div>
      )}

      {/* ── Section 5: Worker Space ── */}
      <div style={{ marginTop: 36 }}>
        <SectionMark label="Worker Space" />
        <WorkerAdoptionPanel companyId={companyId} scenarioId={activeScenario} />
      </div>

      {/* ── My KORA Preview entry ── Task 5 ── */}
      <div
        data-testid="my-kora-entry-card"
        style={{ marginTop: 20, background: 'rgba(97,86,245,0.06)', border: '1px solid rgba(97,86,245,0.18)', borderRadius: TOKENS.cardRadiusSm, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontWeight: 700, fontSize: '12.5px', color: TOKENS.ink }}>
              My KORA Preview
            </p>
            <span style={{ borderRadius: 4, padding: '1px 6px', fontSize: '8px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', background: 'rgba(97,86,245,0.10)', color: '#6156F5', border: '1px solid rgba(97,86,245,0.22)' }}>
              PREVIEW
            </span>
          </div>
          <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11.5px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
            Anteprima dello spazio privato lavoratore. Il lavoratore vede il proprio profilo di impatto, Dynamic CV e opportunità. Solo anteprima — nessun dato personale reale.
          </p>
        </div>
        <Link
          href="/my-kora"
          data-testid="my-kora-preview-cta"
          style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif', fontSize: '11.5px', fontWeight: 600, color: '#6156F5', background: 'rgba(97,86,245,0.10)', border: '1px solid rgba(97,86,245,0.22)', borderRadius: 10, padding: '7px 16px', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          Apri My KORA →
        </Link>
      </div>

      {/* ── Section 6: Priority Action ── */}
      <div style={{ marginTop: 24 }}>
        <ProssimaAzioneCard action={primaryAction} />
      </div>

      {/* ── Section 7: Deep dive navigation ── */}
      <div
        style={{
          marginTop:    32,
          background:   TOKENS.taupe,
          border:       TOKENS.cardBorder,
          borderRadius: TOKENS.cardRadius,
          padding:      '20px 24px',
        }}
      >
        <SectionMark label="Approfondimenti disponibili" />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { href: '/company/kora-index',     label: 'KORA Index™ — scomposizione' },
            { href: '/company/opportunities',  label: 'Opportunità di attivazione' },
            { href: '/company/financial',      label: 'Budget-to-Human-Impact™' },
            { href: '/company/activation',     label: 'Activation Debt™' },
            { href: '/company/reports',        label: 'Decision Pack' },
            { href: '/company/pillars',        label: 'Pillar Intelligence' },
            { href: '/company/contribution',   label: 'Contribution' },
            { href: '/company/workspace',      label: `Worker Space · ${workerCapability.status === 'ENABLED' ? 'ATTIVO' : 'NON ATTIVO'}` },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily:     'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
                fontSize:       '11.5px',
                fontWeight:     500,
                color:          TOKENS.inkSecondary,
                background:     TOKENS.surface,
                border:         TOKENS.cardBorder,
                borderRadius:   999,
                padding:        '5px 14px',
                textDecoration: 'none',
                display:        'inline-block',
                lineHeight:     1.4,
              }}
            >
              {label} →
            </Link>
          ))}
        </div>
      </div>

      {/* ── Section 8: Explainability + Provenance ── */}
      <div style={{ marginTop: 24 }}>
        <ExplainabilityHint />
      </div>

      <ProvenanceFooter
        methodologyVersionId={output.methodology_version_id}
        calibrationStatus={output.calibration_status}
        reportingPeriod={output.reporting_period}
      />

    </div>
  );
}
