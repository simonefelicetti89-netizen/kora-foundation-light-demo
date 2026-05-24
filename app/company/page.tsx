'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { KoraIndexCenterpiece } from '@/components/company/KoraIndexCenterpiece';
import { KoraTrustStrip } from '@/components/company/KoraTrustStrip';
import { PillarChart } from '@/components/charts/PillarChart';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

function pct(val: number) { return `${(val * 100).toFixed(0)}%`; }
function eur(val: number) { return `€${val.toLocaleString('it-IT')}`; }

const MACROBLOCK_LABELS: Record<string, string> = {
  REACH:   'Activation Reach',
  QUALITY: 'Activation Quality',
  EQUITY:  'Distribution & Equity',
  BTI:     'Budget-to-Human-Impact',
};

const MACROBLOCK_BAR: Record<string, string> = {
  REACH:   'bg-violet-500',
  QUALITY: 'bg-indigo-500',
  EQUITY:  'bg-slate-400',
  BTI:     'bg-purple-500',
};

// C-01: Executive Cockpit v4 — Radical Visual Redesign
export default function ExecutiveCockpit() {
  const { activeRole }    = useRole();
  const { activeScenario } = useScenario();
  const isViewer          = isViewerRole(activeRole);

  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);
  const hasKoraData   = !!scoringSimulatorService.getKoraIndexOutput(companyId, activeScenario);

  const output      = scoringSimulatorService.score(companyId, activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate(companyId, activeScenario);
  const macroblocks = scoringSimulatorService.getMacroblockScores(companyId, activeScenario);
  const warnings    = explainabilityService.getWarnings(companyId, activeScenario);
  const actions     = explainabilityService.getNextBestActions(companyId, activeScenario);

  const btiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(
    companyId, activeScenario, activeRole,
  );
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const pillarData    = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const primaryWarning = warnings[0] ?? null;
  const primaryAction  = actions[0] ?? null;
  const showBTI        = btiResult.allowed && btiResult.record != null;

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── A: Executive Hero ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-kora-cosmic-blue overflow-hidden">
        <div className="px-8 py-8">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-kora-fun-green/60 mb-2">
            Executive Cockpit · Cabina di Regia
          </p>
          <h1 className="text-3xl font-bold text-white leading-tight">
            {tenant?.company_name ?? companyId}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {tenant?.tenant_status === 'active' && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-kora-fun-green/30 px-3 py-1 text-xs font-semibold text-kora-fun-green">
                <span className="h-1.5 w-1.5 rounded-full bg-kora-fun-green shrink-0" />
                Tenant attivo
              </span>
            )}
            <span className="text-xs font-mono text-white/30">
              {output?.reporting_period ?? activeScenario} · synthetic_demo_data
            </span>
            {!hasKoraData && (
              <span className="rounded border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
                KORA Index non disponibile
              </span>
            )}
          </div>

          {/* Primary + secondary CTAs */}
          <div className="mt-7 flex flex-wrap gap-3">
            {isViewer ? (
              <>
                <Link
                  href="/company/shared"
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors"
                >
                  KORA Shared View →
                </Link>
                <Link
                  href="/company/kora-index"
                  className="rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  KORA Index →
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/company/reports"
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-kora-cosmic-blue hover:bg-kora-gray-base transition-colors"
                >
                  Decision Pack →
                </Link>
                <Link
                  href="/company/shared"
                  className="rounded-lg border border-white/25 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                >
                  Shared View →
                </Link>
                <Link
                  href="/company/kora-index"
                  className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/50 hover:text-white/80 hover:border-white/20 transition-colors"
                >
                  KORA Index →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── No-data state ─────────────────────────────────────────────────── */}
      {!hasKoraData && tenant && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-7 py-6 space-y-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 mb-1">Stato Pipeline</p>
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

          {/* ── B: KORA Index Centerpiece — the dominant signal ───────────── */}
          <KoraIndexCenterpiece output={output} />

          {/* ── C: Trust / Governance Strip ──────────────────────────────── */}
          <KoraTrustStrip output={output} />

          {/* ── D: Priority Action Panel ─────────────────────────────────── */}
          {(primaryWarning || primaryAction) && (
            <div className="rounded-2xl border border-kora-violet/20 bg-kora-violet/5 px-6 py-5 space-y-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-kora-violet">
                Prossima Azione Consigliata
              </p>

              {primaryWarning && (
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-1 shrink-0 self-stretch rounded-full',
                    primaryWarning.severity === 'critical' ? 'bg-red-500' :
                    primaryWarning.severity === 'high'     ? 'bg-orange-400' : 'bg-yellow-400',
                  )} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 leading-snug">
                      {primaryWarning.title}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {primaryWarning.message}
                    </p>
                    {primaryWarning.affected_components.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {primaryWarning.affected_components.map((code) => (
                          <span
                            key={code}
                            className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-600"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {primaryAction && (
                <div className={cn(
                  'flex items-start gap-4',
                  primaryWarning && 'pt-4 border-t border-kora-violet/10',
                )}>
                  <div className="shrink-0 h-7 w-7 rounded-full bg-kora-violet flex items-center justify-center text-xs font-bold text-white mt-0.5">
                    {primaryAction.priority}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-kora-cosmic-blue leading-snug">
                      {primaryAction.action}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-2">
                      {primaryAction.detail}
                    </p>
                    {primaryAction.target_components.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {primaryAction.target_components.map((code) => (
                          <span
                            key={code}
                            className="rounded border border-kora-violet/20 bg-white px-1.5 py-0.5 text-[10px] font-mono text-kora-violet"
                          >
                            {code}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(warnings.length > 1 || actions.length > 1) && (
                <p className="text-[10px] text-slate-400 pt-1 border-t border-kora-violet/10">
                  {warnings.length > 1 && `+${warnings.length - 1} segnali aggiuntivi · `}
                  {actions.length > 1 && `+${actions.length - 1} azioni aggiuntive · `}
                  Dettaglio in{' '}
                  <Link href="/company/kora-index" className="underline hover:text-slate-600">
                    KORA Index
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* ── E: Three Executive Modules ────────────────────────────────── */}
          <div className={cn(
            'grid gap-5',
            showBTI && aggregate ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
          )}>

            {/* Module 1 — Attivazione Organizzativa */}
            {aggregate ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Attivazione Organizzativa
                  </p>
                  <Link href="/company/activation" className="text-[10px] font-semibold text-kora-violet hover:underline shrink-0">
                    Dettaglio →
                  </Link>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Activation Rate</p>
                  <p className="text-6xl font-bold text-kora-cosmic-blue leading-none mt-1 tabular-nums">
                    {pct(aggregate.activation_rate)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    della forza lavoro attiva nel periodo
                  </p>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100 flex-1">
                  {[
                    ['MAR — Meaningful Activation', pct(aggregate.meaningful_activation_rate)],
                    ['CO — Continuity',             pct(aggregate.continuity_rate)],
                    ['VR — Verification Rate',       pct(aggregate.verification_rate)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className="text-sm font-bold text-slate-800 tabular-nums">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug pt-3 border-t border-slate-100">
                  Segnali operativi aggregati — alimentano il KORA Index. PIB individuale privato al lavoratore.
                </p>
              </div>
            ) : null}

            {/* Module 2 — Budget-to-Human-Impact */}
            {showBTI && btiResult.record ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-5">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Budget-to-Human-Impact
                  </p>
                  <Link href="/company/financial" className="text-[10px] font-semibold text-kora-violet hover:underline shrink-0">
                    Dettaglio →
                  </Link>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400">Deep Activation Share</p>
                  <p className="text-6xl font-bold text-kora-cosmic-blue leading-none mt-1 tabular-nums">
                    {pct(btiResult.record.deep_activation_share)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1.5">
                    del budget in attivazione profonda
                  </p>
                </div>
                <div className="space-y-2.5 pt-4 border-t border-slate-100 flex-1">
                  {[
                    ['Budget people/welfare',   eur(btiResult.record.total_people_welfare_budget)],
                    ['Costo / Impact Unit',     eur(btiResult.record.cost_per_impact_unit)],
                    ['Activation Debt (est.)',   eur(btiResult.record.activation_debt_eur)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-500">{label}</p>
                      <p className={cn(
                        'text-sm font-bold tabular-nums',
                        label.includes('Debt') ? 'text-rose-700' : 'text-slate-800',
                      )}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-snug pt-3 border-t border-slate-100">
                  Informational only — non certificato, non costituisce rendicontazione ESG obbligatoria.
                </p>
              </div>
            ) : null}

            {/* Module 3 — Profilo KORA Index */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Profilo KORA Index
                </p>
                <Link href="/company/kora-index" className="text-[10px] font-semibold text-kora-violet hover:underline shrink-0">
                  Scomposizione →
                </Link>
              </div>

              {macroblocks.length > 0 ? (
                <div className="space-y-3.5 flex-1">
                  {macroblocks.map((mb) => (
                    <div key={mb.code}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-slate-600 font-medium">
                          {MACROBLOCK_LABELS[mb.code] ?? mb.code}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono">
                            {(mb.weight * 100).toFixed(0)}%
                          </span>
                          <span className="text-sm font-bold text-slate-800 tabular-nums w-7 text-right">
                            {mb.score.toFixed(0)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-100">
                        <div
                          className={cn('h-1.5 rounded-full', MACROBLOCK_BAR[mb.code] ?? 'bg-slate-400')}
                          style={{ width: `${Math.min(mb.score, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 flex-1">Macroblocchi non disponibili.</p>
              )}

              <p className="text-[10px] text-slate-400 pt-3 border-t border-slate-100">
                Pesi pre-empirici v0.1 — non finalizzati. Scomposizione analitica dei 10 componenti in KORA Index.
              </p>
            </div>
          </div>

          {/* ── F: Pillar Distribution ───────────────────────────────────── */}
          {pillarData && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Distribuzione per Pillar
                </p>
                <Link href="/company/pillars" className="text-[10px] font-semibold text-kora-violet hover:underline">
                  Dettaglio →
                </Link>
              </div>
              <PillarChart data={pillarData} />
              <p className="mt-3 text-[10px] text-slate-400">
                Distribuzione degli Impact Unit aggregati per pillar nel periodo. Dati sintetici demo.
              </p>
            </div>
          )}

          {/* ── G: Secondary — Pipeline & Workforce (compact 2-col) ──────── */}
          {tenant && (
            <div className="grid gap-4 sm:grid-cols-2">

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  Stato Pipeline
                </p>
                <div className="space-y-2">
                  {([
                    ['Onboarding',     tenant.onboarding_status.replace(/_/g, ' ')],
                    ['Data readiness', tenant.data_readiness_status],
                    ['Decision Pack',  tenant.decision_pack_status],
                    ['Tenant',         tenant.tenant_status],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-xs font-semibold text-slate-700">{value.replace(/_/g, ' ')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  Aggregato Forza Lavoro
                </p>
                <div className="space-y-2">
                  {([
                    ['Lavoratori nel roster',  String(workerSummary.total_workers)],
                    ['My KORA abilitati',      String(workerSummary.my_kora_enabled_count)],
                    ['Account attivi',         String(workerSummary.active_worker_accounts)],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <p className="text-xs text-slate-400">{label}</p>
                      <p className="text-xs font-semibold text-slate-700">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                  Solo aggregati aziendali — employer_can_view_individual_pib = false su ogni record.
                </p>
              </div>
            </div>
          )}

          {/* ── H: Methodology Boundary Footer ──────────────────────────── */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-6 py-4 space-y-2 text-[10px] text-slate-500">
            <p className="text-xs font-semibold text-slate-600">Confini metodologici</p>
            {output.limitations_text && <p className="leading-relaxed">{output.limitations_text}</p>}
            <p className="leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
            <p className="font-mono pt-2 border-t border-slate-200">
              {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period} · synthetic_demo_data: true
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
