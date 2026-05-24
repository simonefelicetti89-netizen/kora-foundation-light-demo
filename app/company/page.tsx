'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { isViewerRole } from '@/lib/permissions';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { PillarChart } from '@/components/charts/PillarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { NextActionCard } from '@/components/cards/NextActionCard';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

function eur(val: number) {
  return `€${val.toLocaleString('it-IT')}`;
}

// C-01: Executive Cockpit v3
export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const isViewer = isViewerRole(activeRole);

  // Company scoping — resolved from demo user, never hardcoded
  const currentUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const companyId     = currentUser.company_id ?? 'meridiana-group';
  const tenant        = tenantService.getTenant(companyId);
  const hasKoraData   = !!scoringSimulatorService.getKoraIndexOutput(companyId, activeScenario);
  const statusBadge   = tenant ? tenantService.getTenantStatusBadge(tenant.tenant_status) : null;

  // Scoring + explainability
  const output      = scoringSimulatorService.score(companyId, activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate(companyId, activeScenario);
  const macroblocks = scoringSimulatorService.getMacroblockScores(companyId, activeScenario);
  const warnings    = explainabilityService.getWarnings(companyId, activeScenario);
  const actions     = explainabilityService.getNextBestActions(companyId, activeScenario);

  // BTI — role-gated by service (COMPANY_ADMIN / COMPANY_VIEWER / KORA_ADMIN)
  const btiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(
    companyId, activeScenario, activeRole,
  );

  // Worker aggregate — privacy-safe: aggregates only, employer_can_view_individual_pib = false
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const MACROBLOCK_DEFS = [
    {
      code: 'REACH',
      label: 'Activation Reach',
      accent: 'border-violet-200 bg-violet-50',
      headingColor: 'text-violet-700',
      tagClass: 'bg-violet-100 text-violet-700',
      description: "Quanto l'attivazione raggiunge realmente la popolazione aziendale.",
    },
    {
      code: 'QUALITY',
      label: 'Activation Quality',
      accent: 'border-indigo-200 bg-indigo-50',
      headingColor: 'text-indigo-700',
      tagClass: 'bg-indigo-100 text-indigo-700',
      description: 'Quanto le iniziative generano attivazione significativa, verificabile e continuativa.',
    },
    {
      code: 'EQUITY',
      label: 'Distribution & Equity',
      accent: 'border-slate-200 bg-slate-50',
      headingColor: 'text-slate-600',
      tagClass: 'bg-slate-100 text-slate-600',
      description: "Quanto l'attivazione è distribuita in modo equilibrato tra pillar e popolazione.",
    },
    {
      code: 'BTI',
      label: 'Budget-to-Human-Impact',
      accent: 'border-purple-200 bg-purple-50',
      headingColor: 'text-purple-700',
      tagClass: 'bg-purple-100 text-purple-700',
      description: 'Quanto il budget people/welfare si trasforma in attivazione umana verificata.',
    },
  ];

  return (
    <div className="space-y-6">

      {/* ── A: Company Context & KORA State ──────────────────────────────────── */}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-0.5">
          KORA Executive Cockpit · Company Workspace
        </p>
        <h1 className="text-2xl font-bold text-slate-900">
          {tenant?.company_name ?? companyId}
        </h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {statusBadge && (
            <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold', statusBadge.classes)}>
              {statusBadge.label}
            </span>
          )}
          <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
            {tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'onboarding non avviato'}
          </span>
          <span className="rounded border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-600">
            synthetic_demo_data: true · {activeScenario}
          </span>
          {!hasKoraData && (
            <span className="rounded border border-rose-100 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              KORA Index non disponibile
            </span>
          )}
        </div>
      </div>

      {/* ── No-data state — renders immediately after company context ────────── */}
      {!hasKoraData && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">Pipeline dati non ancora completata</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            KORA Index, Decision Pack e report saranno disponibili al termine dell&apos;onboarding dati.
            Contatta il tuo referente KORA per procedere con il caricamento dati e l&apos;avvio della pipeline.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 text-[10px]">
            {(
              [
                ['Onboarding', tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
                ['Readiness dati', tenant?.data_readiness_status ?? '—'],
                ['Decision Pack', tenant?.decision_pack_status ?? '—'],
                ['Tenant status', tenant?.tenant_status ?? '—'],
                ['Prossima azione', tenant ? tenantService.getNextAction(tenant) : '—'],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div key={label}>
                <p className="text-amber-600">{label}</p>
                <p className="text-amber-800 font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── B–J: Full cockpit — only when KORA Index is available ────────────── */}
      {hasKoraData && (
        <div className="space-y-6">

          {/* ── B: KORA Index Hero (CS + SafeguardBadge + CalibrationBadge non-suppressible) ── */}
          <KoraIndexHero output={output} />

          {/* ── C: Trust & Interpretation Layer ─────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={cn(
              'rounded-lg border p-4 flex items-start gap-3',
              output.safeguard_status === 'CLEAR'   ? 'bg-kora-fun-green/15 border-kora-fun-green/40' :
              output.safeguard_status === 'FLAGGED' ? 'bg-red-50 border-red-200'                    :
                                                       'bg-amber-50 border-amber-200',
            )}>
              <SafeguardBadge status={output.safeguard_status} className="shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">Activation Safeguard</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                  {output.safeguard_status === 'CLEAR' &&
                    'Attivazione sufficientemente ampia e significativa. KORA Index interpretabile con piena validità.'}
                  {output.safeguard_status === 'WARNING' &&
                    'Una o più soglie non raggiunte. KORA Index visibile — interpretare con cautela.'}
                  {output.safeguard_status === 'FLAGGED' &&
                    'Attivazione insufficiente (AR < 20% o MAR < 15%). KORA Index fortemente qualificato.'}
                </p>
              </div>
            </div>
            <div className="rounded-lg border border-kora-violet/20 bg-kora-violet/10 p-4">
              <p className="text-xs font-semibold text-kora-cosmic-blue">Stato calibrazione</p>
              <p className="text-xs font-mono text-kora-violet mt-0.5">{output.calibration_status}</p>
              <p className="text-[10px] text-slate-600 mt-1.5 leading-snug">
                Metodologia v0.1 pre-empirica — non certificata, non validata per uso normativo o regolatorio.
                Studio Delphi e calibrazione empirica previsti post-pilot.
              </p>
            </div>
          </div>

          {/* ── D: Activation Snapshot — operational signals, no weights ────── */}
          {aggregate && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Snapshot Attivazione
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: 'Activation Rate',       value: pct(aggregate.activation_rate),            code: 'AR'  },
                  { label: 'Meaningful Activation',  value: pct(aggregate.meaningful_activation_rate), code: 'MAR' },
                  { label: 'Continuity Rate',        value: pct(aggregate.continuity_rate),            code: 'CO'  },
                  { label: 'Verification Rate',      value: pct(aggregate.verification_rate),          code: 'VR'  },
                ].map(({ label, value, code }) => (
                  <div key={code} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{code}</p>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Segnali operativi — alimentano il KORA Index, non presentati con pesi nel cockpit. Scomposizione completa in{' '}
                <Link href="/company/kora-index" className="underline hover:text-slate-600">KORA Index Detail</Link>.
              </p>
            </div>
          )}

          {/* Pillar distribution */}
          {pillarData && <PillarChart data={pillarData} />}

          {/* ── E: Macroblock Executive Summary — 4 macroblocks, no 10-component detail ── */}
          <div>
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              KORA Index v3 — Sintesi Executive
            </h2>
            <p className="mb-4 text-[10px] text-slate-400 leading-snug max-w-2xl">
              4 macroblocchi pesati. Scomposizione analitica completa (AR, MAR, NI, VR, CO, WB, PC, PB, EQ) in{' '}
              <Link href="/company/kora-index" className="underline hover:text-slate-600">KORA Index Detail</Link>.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MACROBLOCK_DEFS.map(({ code, label, accent, headingColor, tagClass, description }) => {
                const mb = macroblocks.find((m) => m.code === code);
                return (
                  <div key={code} className={cn('rounded-lg border p-4 space-y-2', accent)}>
                    <div>
                      <p className={cn('text-xs font-bold', headingColor)}>{label}</p>
                      {mb && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xl font-bold text-slate-800">{mb.score.toFixed(0)}</span>
                          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', tagClass)}>
                            Peso {(mb.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-700 leading-snug">{description}</p>
                    {mb?.main_driver && (
                      <p className="text-[10px] text-slate-500 leading-snug">
                        <span className="font-semibold">Driver:</span> {mb.main_driver}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── F: Budget-to-Human-Impact Summary ───────────────────────────── */}
          {btiResult.allowed && btiResult.record && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Budget-to-Human-Impact
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">Budget people/welfare</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {eur(btiResult.record.total_people_welfare_budget)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Deep activation share</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {pct(btiResult.record.deep_activation_share)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Costo / Impact Unit</p>
                    <p className="text-lg font-bold text-slate-800 mt-0.5">
                      {eur(btiResult.record.cost_per_impact_unit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Activation Debt</p>
                    <p className="text-lg font-bold text-rose-700 mt-0.5">
                      {eur(btiResult.record.activation_debt_eur)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                  Informational only — non certificato, non costituisce rendicontazione ESG obbligatoria.
                  Dettaglio completo in{' '}
                  <Link href="/company/financial" className="underline hover:text-slate-700">
                    Budget-to-Impact
                  </Link>.
                </p>
              </div>
            </div>
          )}

          {/* ── G: Pipeline & Data Readiness — compact status strip ─────────── */}
          {tenant && (
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Stato Pipeline & Readiness
              </h2>
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                  {(
                    [
                      ['Onboarding', tenant.onboarding_status.replace(/_/g, ' ')],
                      ['Data readiness', tenant.data_readiness_status],
                      ['Decision Pack', tenant.decision_pack_status],
                      ['Tenant status', tenant.tenant_status],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label}>
                      <p className="text-slate-400">{label}</p>
                      <p className="font-semibold text-slate-700 mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── H: Worker Activation Aggregate — privacy-safe, no individual data ── */}
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Attivazione Forza Lavoro (Aggregato)
            </h2>
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Lavoratori totali',  value: workerSummary.total_workers,           sub: 'nel roster' },
                  { label: 'Account attivi',     value: workerSummary.active_worker_accounts,  sub: 'My KORA attivi' },
                  { label: 'My KORA abilitati',  value: workerSummary.my_kora_enabled_count,   sub: 'PIB privato attivato' },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="text-center">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                Solo aggregati aziendali — employer_can_view_individual_pib = false su ogni record.
                PIB individuale privato al lavoratore.
              </p>
            </div>
          </div>

          {/* ── I: Segnali chiave + Azioni + CTA strip (role-aware) ──────────── */}
          <div className="space-y-4">

            {warnings.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Segnali Chiave
                </h2>
                <div className="space-y-2">
                  {warnings.slice(0, 3).map((w) => (
                    <WarningCard key={w.code} warning={w} />
                  ))}
                </div>
              </div>
            )}

            {actions.length > 0 && (
              <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Azioni Raccomandate
                </h2>
                <div className="space-y-2">
                  {actions.slice(0, 3).map((a) => (
                    <NextActionCard key={a.priority} action={a} />
                  ))}
                </div>
              </div>
            )}

            {/* Role-aware CTA strip:
                COMPANY_VIEWER → read-only (Shared View, KORA Index, Profile)
                COMPANY_ADMIN / KORA_ADMIN → full operational CTAs */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Azioni disponibili
              </h2>
              <div className="flex flex-wrap gap-3">
                {isViewer ? (
                  <>
                    <Link
                      href="/company/shared"
                      className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                      KORA Shared View →
                    </Link>
                    <Link
                      href="/company/kora-index"
                      className="rounded-md border border-kora-violet/30 bg-kora-violet/10 px-4 py-2 text-xs font-semibold text-kora-violet hover:bg-kora-violet/20 transition-colors"
                    >
                      KORA Index →
                    </Link>
                    <Link
                      href="/company/profile"
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Company Profile →
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/company/reports"
                      className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
                    >
                      Decision Pack & Report →
                    </Link>
                    <Link
                      href="/company/shared"
                      className="rounded-md border border-kora-violet/30 bg-kora-violet/10 px-4 py-2 text-xs font-semibold text-kora-violet hover:bg-kora-violet/20 transition-colors"
                    >
                      KORA Shared View →
                    </Link>
                    <Link
                      href="/company/kora-index"
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      KORA Index →
                    </Link>
                    <Link
                      href="/company/activation"
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Debito di Attivazione →
                    </Link>
                    <Link
                      href="/company/financial"
                      className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Budget-to-Impact →
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── J: Methodology Boundary Footer ──────────────────────────────── */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-4 space-y-2 text-[10px] text-slate-600">
            <p className="font-semibold text-xs text-slate-700">Confini metodologici</p>
            {output.limitations_text && <p>{output.limitations_text}</p>}
            <p>
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
            <p className="pt-1 border-t border-indigo-100 font-mono">
              {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period} · synthetic_demo_data: true
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
