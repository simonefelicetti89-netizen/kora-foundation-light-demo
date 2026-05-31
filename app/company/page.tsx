'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { ExecutiveCockpitHero } from '@/components/company/ExecutiveCockpitHero';
import { KoraIndexCommandCenter } from '@/components/company/KoraIndexCommandCenter';
import { TrustGovernanceStrip } from '@/components/company/TrustGovernanceStrip';
import { PriorityActionPanel } from '@/components/company/PriorityActionPanel';
import { ExecutiveIntelligenceBlock } from '@/components/company/ExecutiveIntelligenceBlock';
import { HumanImpactMap } from '@/components/company/HumanImpactMap';
import { DecisionPackCTAStrip } from '@/components/company/DecisionPackCTAStrip';
import { useScoringResult } from '@/lib/scoring-result';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import type { PillarCode } from '@/lib/types';

function pct(val: number) { return `${(val * 100).toFixed(0)}%`; }
function eur(val: number) { return `€${val.toLocaleString('it-IT')}`; }

// C-01: Executive Cockpit — experience rebuild
export default function ExecutiveCockpit() {
  const { activeRole }     = useRole();
  const { activeScenario } = useScenario();
  const isViewer           = isViewerRole(activeRole);

  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);
  const { data: scoring } = useScoringResult({ tenantId: companyId, scenarioId: activeScenario });
  const hasKoraData = scoring?.status === 'ok';
  const output      = scoring?.koraIndex;
  const aggregate   = scoring?.aggregate;
  const macroblocks = output?.macroblocks ?? [];
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

      {/* ── 1. CONTEXT ANCHOR ──────────────────────────────────────────────────── */}
      <ExecutiveCockpitHero
        companyName={tenant?.company_name ?? companyId}
        period={output?.reporting_period ?? activeScenario}
        tenantStatus={tenant?.tenant_status}
        isViewer={isViewer}
        hasKoraData={hasKoraData}
      />

      {/* ── No-data state ─────────────────────────────────────────────────────── */}
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
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-3 border-t border-amber-200">
            {([
              ['Onboarding',      tenant.onboarding_status.replace(/_/g, ' ')],
              ['Data readiness',  tenant.data_readiness_status],
              ['Decision Pack',   tenant.decision_pack_status],
              ['Tenant status',   tenant.tenant_status],
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

      {/* ── Full cockpit — only when KORA Index is available ──────────────────── */}
      {hasKoraData && output && (
        <div className="space-y-5">

          {/* ── 2. STATE OF PLAY + COSA DECIDERE — 2-col ─────────────────────── */}
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <KoraIndexCommandCenter output={output} macroblocks={macroblocks} />
            </div>
            <div className="lg:col-span-2">
              <PriorityActionPanel
                warning={primaryWarning}
                action={primaryAction}
                extraWarningsCount={Math.max(0, warnings.length - 1)}
                extraActionsCount={Math.max(0, actions.length - 1)}
                isViewer={isViewer}
                className="h-full"
              />
            </div>
          </div>

          {/* ── 3. GOVERNANCE STRIP — non-suppressible ───────────────────────── */}
          <TrustGovernanceStrip output={output} />

          {/* ── 4. HUMAN IMPACT MAP ──────────────────────────────────────────── */}
          {pillarData && (
            <HumanImpactMap data={pillarData} />
          )}

          {/* ── 5. SIGNAL ECONOMICO — 2 intelligence blocks ──────────────────── */}
          <div className="grid gap-5 lg:grid-cols-2">

            {/* Activation */}
            {aggregate && (
              <ExecutiveIntelligenceBlock
                surface="light"
                title="Attivazione Organizzativa"
                mainValue={pct(aggregate.activation_rate)}
                mainLabel="Activation Rate"
                mainCaption="della forza lavoro attiva nel periodo"
                facts={[
                  { label: 'MAR — Meaningful Activation', value: pct(aggregate.meaningful_activation_rate), highlight: 'positive' },
                  { label: 'CO — Continuity',             value: pct(aggregate.continuity_rate),            highlight: 'neutral'  },
                  { label: 'VR — Verification Rate',      value: pct(aggregate.verification_rate),          highlight: 'neutral'  },
                ]}
                interpretation="Segnali operativi aggregati — alimentano il KORA Index. PIB individuale privato al lavoratore."
                link={{ href: '/company/activation', label: 'Dettaglio' }}
              />
            )}

            {/* BTI o KORA Index Profile */}
            {showBTI && btiResult.record ? (
              <ExecutiveIntelligenceBlock
                surface="accent"
                title="Budget-to-Human-Impact"
                mainValue={pct(btiResult.record.deep_activation_share)}
                mainLabel="Deep Activation Share"
                mainCaption="del budget in attivazione profonda"
                facts={[
                  { label: 'Budget people/welfare', value: eur(btiResult.record.total_people_welfare_budget), highlight: 'neutral' },
                  { label: 'Costo / Impact Unit',   value: eur(btiResult.record.cost_per_impact_unit),        highlight: 'neutral' },
                  { label: 'Activation Debt (est.)', value: eur(btiResult.record.activation_debt_eur),        highlight: 'debt'    },
                ]}
                interpretation="Informational only — non certificato, non costituisce rendicontazione ESG obbligatoria."
                link={{ href: '/company/financial', label: 'Dettaglio' }}
              />
            ) : (
              <ExecutiveIntelligenceBlock
                surface="accent"
                title="Profilo KORA Index"
                mainValue={output.kora_index_value != null ? output.kora_index_value.toFixed(1) : '—'}
                mainLabel="KORA Index v3"
                mainCaption="punteggio organizzativo complessivo"
                facts={macroblocks.slice(0, 3).map((mb) => ({
                  label:     mb.code,
                  value:     `${mb.score.toFixed(0)} / 100`,
                  highlight: 'neutral' as const,
                }))}
                interpretation="Pesi pre-empirici v0.1 — non finalizzati. Scomposizione analitica dei 10 componenti."
                link={{ href: '/company/kora-index', label: 'Scomposizione' }}
              />
            )}
          </div>

          {/* Readiness compact strip */}
          {tenant && (
            <div
              className="rounded-xl border border-kora-cosmic-blue/8 px-5 py-3.5 flex flex-wrap items-center gap-x-6 gap-y-2"
              style={{ background: '#F5F6FA' }}
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/35 shrink-0">
                Readiness
              </p>
              {([
                ['Onboarding',      tenant.onboarding_status === 'active' ? 'Attivo' : tenant.onboarding_status.replace(/_/g, ' ')],
                ['Data',            tenant.data_readiness_status.replace(/_/g, ' ')],
                ['Decision Pack',   tenant.decision_pack_status.replace(/_/g, ' ')],
                ['Worker demo',     String(workerSummary.total_workers)],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-kora-cosmic-blue/40">{label}:</span>
                  <span className="text-[10px] font-semibold text-kora-cosmic-blue/70">{value}</span>
                </div>
              ))}
              <Link
                href="/company/onboarding"
                className="ml-auto text-[10px] font-semibold text-kora-violet hover:underline shrink-0"
              >
                Stato Progetto →
              </Link>
            </div>
          )}

          {/* ── 6. DECISION PACK CTA STRIP ───────────────────────────────────── */}
          <DecisionPackCTAStrip
            hasKoraData={hasKoraData}
            decisionPackStatus={tenant?.decision_pack_status}
          />

          {/* ── 7. METHODOLOGY BOUNDARY FOOTER ──────────────────────────────── */}
          <div
            className="rounded-xl border border-kora-cosmic-blue/8 px-6 py-5 space-y-2"
            style={{ background: '#F5F6FA' }}
          >
            <p className="text-xs font-semibold text-kora-cosmic-blue/60">Confini metodologici</p>
            {output.limitations_text && (
              <p className="text-[10px] text-kora-cosmic-blue/50 leading-relaxed">
                {output.limitations_text}
              </p>
            )}
            <p className="text-[10px] text-kora-cosmic-blue/50 leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
            <p className="text-[10px] font-mono text-kora-cosmic-blue/30 pt-2 border-t border-kora-cosmic-blue/8">
              {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period} · synthetic_demo_data: true
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
