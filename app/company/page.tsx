'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { ExecutiveCockpitHero } from '@/components/company/ExecutiveCockpitHero';
import { KoraIndexCommandCenter } from '@/components/company/KoraIndexCommandCenter';
import { TrustGovernanceStrip } from '@/components/company/TrustGovernanceStrip';
import { ExecutiveIntelligenceBlock } from '@/components/company/ExecutiveIntelligenceBlock';
import { PriorityActionPanel } from '@/components/company/PriorityActionPanel';
import { PillarChart } from '@/components/charts/PillarChart';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import type { PillarCode } from '@/lib/types';

function pct(val: number) { return `${(val * 100).toFixed(0)}%`; }
function eur(val: number) { return `€${val.toLocaleString('it-IT')}`; }

// C-01: Executive Cockpit — full rebuild with KORA logo + premium typography
export default function ExecutiveCockpit() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();
  const isViewer           = isViewerRole(activeRole);

  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);
  const hasKoraData   = !!scoringSimulatorService.getKoraIndexOutput(companyId, activeScenario);

  const output      = scoringSimulatorService.score(companyId, activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate(companyId, activeScenario);
  const macroblocks = scoringSimulatorService.getMacroblockScores(companyId, activeScenario);
  const warnings    = explainabilityService.getWarnings(companyId, activeScenario);
  const actions     = explainabilityService.getNextBestActions(companyId, activeScenario);

  const btiResult     = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(
    companyId, activeScenario, activeRole,
  );
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const pillarData    = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const primaryWarning = warnings[0] ?? null;
  const primaryAction  = actions[0] ?? null;
  const showBTI        = btiResult.allowed && btiResult.record != null;

  return (
    <div className="space-y-5">

      {/* ── 1. Executive Cockpit Hero ─────────────────────────────────────── */}
      <ExecutiveCockpitHero
        companyName={tenant?.company_name ?? companyId}
        period={output?.reporting_period ?? activeScenario}
        tenantStatus={tenant?.tenant_status}
        isViewer={isViewer}
        hasKoraData={hasKoraData}
      />

      {/* ── No-data state ─────────────────────────────────────────────────── */}
      {!hasKoraData && tenant && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-7 py-6 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">
              Stato Pipeline
            </p>
            <p className="text-base font-semibold text-amber-900">
              Dati non ancora disponibili per questo periodo
            </p>
            <p className="text-sm text-amber-700 mt-1 leading-relaxed max-w-lg">
              KORA Index, Decision Pack e report saranno disponibili al completamento della pipeline dati.
              Contatta il referente KORA per procedere con il caricamento.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-3 border-t border-amber-200">
            {([
              ['Onboarding',     tenant.onboarding_status.replace(/_/g, ' ')],
              ['Data readiness', tenant.data_readiness_status],
              ['Decision Pack',  tenant.decision_pack_status],
              ['Tenant status',  tenant.tenant_status],
              ['Prossima azione', tenantService.getNextAction(tenant)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-semibold text-amber-600">{label}</p>
                <p className="text-sm font-semibold text-amber-900 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Full cockpit — only when KORA Index is available ──────────────── */}
      {hasKoraData && (
        <div className="space-y-5">

          {/* ── 2. KORA Index Command Center — dominant signal ────────────── */}
          <KoraIndexCommandCenter output={output} macroblocks={macroblocks} />

          {/* ── 3. Trust & Governance Strip ──────────────────────────────── */}
          <TrustGovernanceStrip output={output} />

          {/* ── 4. Priority Action Panel ─────────────────────────────────── */}
          <PriorityActionPanel
            warning={primaryWarning}
            action={primaryAction}
            extraWarningsCount={Math.max(0, warnings.length - 1)}
            extraActionsCount={Math.max(0, actions.length - 1)}
            isViewer={isViewer}
          />

          {/* ── 5. Three Executive Intelligence Blocks ───────────────────── */}
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Module 1 — Attivazione Organizzativa */}
            {aggregate ? (
              <ExecutiveIntelligenceBlock
                surface="light"
                title="Attivazione Organizzativa"
                mainValue={pct(aggregate.activation_rate)}
                mainLabel="Activation Rate"
                mainCaption="della forza lavoro attiva nel periodo"
                facts={[
                  { label: 'MAR — Meaningful Activation', value: pct(aggregate.meaningful_activation_rate), highlight: 'positive' },
                  { label: 'CO — Continuity',             value: pct(aggregate.continuity_rate),            highlight: 'neutral' },
                  { label: 'VR — Verification Rate',       value: pct(aggregate.verification_rate),          highlight: 'neutral' },
                ]}
                interpretation="Segnali operativi aggregati — alimentano il KORA Index. PIB individuale privato al lavoratore."
                link={{ href: '/company/activation', label: 'Dettaglio' }}
              />
            ) : null}

            {/* Module 2 — Budget-to-Human-Impact */}
            {showBTI && btiResult.record ? (
              <ExecutiveIntelligenceBlock
                surface="accent"
                title="Budget-to-Human-Impact"
                mainValue={pct(btiResult.record.deep_activation_share)}
                mainLabel="Deep Activation Share"
                mainCaption="del budget in attivazione profonda"
                facts={[
                  { label: 'Budget people/welfare',  value: eur(btiResult.record.total_people_welfare_budget), highlight: 'neutral' },
                  { label: 'Costo / Impact Unit',    value: eur(btiResult.record.cost_per_impact_unit),        highlight: 'neutral' },
                  { label: 'Activation Debt (est.)',  value: eur(btiResult.record.activation_debt_eur),         highlight: 'debt' },
                ]}
                interpretation="Informational only — non certificato, non costituisce rendicontazione ESG obbligatoria."
                link={{ href: '/company/financial', label: 'Dettaglio' }}
              />
            ) : (
              // Module 3 when BTI unavailable — Profilo Macroblocchi
              <ExecutiveIntelligenceBlock
                surface="accent"
                title="Profilo KORA Index"
                mainValue={output?.kora_index_value != null ? output.kora_index_value.toFixed(1) : '—'}
                mainLabel="KORA Index v3"
                mainCaption="punteggio organizzativo complessivo"
                facts={macroblocks.slice(0, 3).map((mb) => ({
                  label: mb.code,
                  value: `${mb.score.toFixed(0)} / 100`,
                  highlight: 'neutral' as const,
                }))}
                interpretation="Pesi pre-empirici v0.1 — non finalizzati. Scomposizione analitica dei 10 componenti."
                link={{ href: '/company/kora-index', label: 'Scomposizione' }}
              />
            )}

            {/* Module 3 — Readiness & Output */}
            {tenant ? (
              <ExecutiveIntelligenceBlock
                surface="dark"
                title="Readiness & Output"
                mainValue={tenant.onboarding_status === 'active' ? 'Attivo' : tenant.onboarding_status.replace(/_/g, ' ')}
                mainLabel="Onboarding status"
                mainCaption="stato di onboarding organizzativo"
                facts={[
                  { label: 'Data readiness',  value: tenant.data_readiness_status.replace(/_/g, ' '),  highlight: 'positive' },
                  { label: 'Decision Pack',   value: tenant.decision_pack_status.replace(/_/g, ' '),   highlight: 'positive' },
                  { label: 'Account demo worker', value: String(workerSummary.total_workers),            highlight: 'neutral' },
                  { label: 'My KORA (demo)',      value: String(workerSummary.my_kora_enabled_count),    highlight: 'neutral' },
                ]}
                interpretation="Account demo worker ≠ forza lavoro Meridiana (250). Solo aggregati aziendali — employer_can_view_individual_pib: false."
                link={{ href: '/company/onboarding', label: 'Stato Progetto' }}
              />
            ) : null}
          </div>

          {/* ── 6. Pillar Distribution ───────────────────────────────────── */}
          {pillarData && (
            <div className="rounded-2xl border border-kora-cosmic-blue/8 p-6" style={{ background: '#F0F1F8' }}>
              <div className="flex items-center justify-between mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/45">
                  Distribuzione per Pillar
                </p>
                <Link
                  href="/company/pillars"
                  className="text-[10px] font-semibold text-kora-violet hover:underline"
                >
                  Dettaglio →
                </Link>
              </div>
              <PillarChart data={pillarData} />
              <p className="mt-4 text-[10px] text-kora-cosmic-blue/40">
                Distribuzione degli Impact Unit aggregati per pillar nel periodo. Dati sintetici demo.
              </p>
            </div>
          )}

          {/* ── 7. Methodology Boundary Footer ──────────────────────────── */}
          <div
            className="rounded-xl border border-kora-cosmic-blue/10 px-6 py-5 space-y-2"
            style={{ background: '#F0F1F8' }}
          >
            <p className="text-xs font-semibold text-kora-cosmic-blue/70">Confini metodologici</p>
            {output.limitations_text && (
              <p className="text-[10px] text-kora-cosmic-blue/50 leading-relaxed">
                {output.limitations_text}
              </p>
            )}
            <p className="text-[10px] text-kora-cosmic-blue/50 leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
            <p className="text-[10px] font-mono text-kora-cosmic-blue/35 pt-2 border-t border-kora-cosmic-blue/10">
              {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period} · synthetic_demo_data: true
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
