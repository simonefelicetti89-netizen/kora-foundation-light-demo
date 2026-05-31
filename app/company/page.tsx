'use client';

import { useRole, useScenario } from '@/lib/demo-state';

// ── Cockpit components ────────────────────────────────────────────────────────
import { CockpitMasthead }           from '@/components/company/cockpit/CockpitMasthead';
import { IndexRingCard }             from '@/components/company/cockpit/IndexRingCard';
import { ProssimaAzioneCard }        from '@/components/company/cockpit/ProssimaAzioneCard';
import { MacroblockCompositionCard } from '@/components/company/cockpit/MacroblockCompositionCard';
import { MetricTrio }                from '@/components/company/cockpit/MetricTrio';
import { ExplainabilityHint }        from '@/components/company/cockpit/ExplainabilityHint';
import { ProvenanceFooter }          from '@/components/company/cockpit/ProvenanceFooter';

// ── Data seam — unchanged ─────────────────────────────────────────────────────
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { explainabilityService }      from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService }              from '@/services/tenant/TenantService';
import { workerProvisioningService }  from '@/services/worker-provisioning/WorkerProvisioningService';

// C-01: Executive Cockpit
export default function ExecutiveCockpit() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();

  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);

  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  // Demo scenario comparison — hooks must be unconditional
  useDemoScenarioComparison(companyId);

  const hasKoraData = scoring?.status === 'ok';
  const output      = scoring?.koraIndex;
  const aggregate   = scoring?.aggregate;
  const macroblocks = output?.macroblocks ?? [];

  const actions       = explainabilityService.getNextBestActions(companyId, activeScenario);
  const primaryAction = actions[0] ?? null;
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);

  return (
    <div className="space-y-5">

      {/* Masthead — always shown */}
      <CockpitMasthead
        companyName={tenant?.company_name ?? companyId}
        period={output?.reporting_period ?? activeScenario}
        workerCount={workerSummary.total_workers}
      />

      {/* No-data state */}
      {!hasKoraData && tenant && (
        <div
          className="rounded-2xl px-7 py-6 space-y-4"
          style={{
            background:   'rgba(186,117,23,0.07)',
            border:       '1px solid rgba(186,117,23,0.20)',
          }}
        >
          <div>
            <p
              className="font-mono uppercase mb-1"
              style={{ fontSize: '9px', letterSpacing: '0.18em', color: '#854F0B' }}
            >
              Stato Pipeline
            </p>
            <p className="text-base font-semibold" style={{ color: '#5C3509' }}>
              Dati non ancora disponibili per questo periodo
            </p>
            <p className="text-sm mt-1 leading-relaxed max-w-lg" style={{ color: '#7A4A1A' }}>
              KORA Index, Decision Pack e report saranno disponibili al completamento della pipeline dati.
              Contatta il referente KORA per procedere con il caricamento.
            </p>
          </div>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-3"
            style={{ borderTop: '1px solid rgba(186,117,23,0.15)' }}
          >
            {([
              ['Onboarding',      tenant.onboarding_status.replace(/_/g, ' ')],
              ['Data readiness',  tenant.data_readiness_status],
              ['Decision Pack',   tenant.decision_pack_status],
              ['Tenant status',   tenant.tenant_status],
              ['Prossima azione', tenantService.getNextAction(tenant)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold" style={{ color: '#854F0B' }}>{label}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: '#5C3509' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full cockpit — only when KORA Index data available */}
      {hasKoraData && output && (
        <>
          {/* Hero — ring card + prossima azione */}
          <div className="grid grid-cols-2 gap-4 items-stretch">
            <IndexRingCard
              value={output.kora_index_value}
              safeguardStatus={output.safeguard_status}
              confidenceScore={output.confidence_score}
            />
            <ProssimaAzioneCard action={primaryAction} />
          </div>

          {/* Composizione Index */}
          {macroblocks.length > 0 && (
            <MacroblockCompositionCard macroblocks={macroblocks} />
          )}

          {/* Metric trio */}
          {aggregate && (
            <MetricTrio
              activationRate={aggregate.activation_rate}
              meaningfulActivationRate={aggregate.meaningful_activation_rate}
              verificationRate={aggregate.verification_rate}
            />
          )}

          {/* Explainability hint */}
          <ExplainabilityHint />

          {/* Provenance footer */}
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
