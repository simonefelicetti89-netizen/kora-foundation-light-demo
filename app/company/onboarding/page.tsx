'use client';

import Link from 'next/link';
import { useRole, useScenario } from '@/lib/demo-state';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { cn } from '@/lib/utils';

const ONBOARDING_STATUS_PILL: Record<string, string> = {
  not_started:                   'bg-slate-100 text-slate-500 border-slate-200',
  profile_complete:              'bg-blue-50 text-blue-700 border-blue-200',
  workforce_baseline_complete:   'bg-blue-50 text-blue-700 border-blue-200',
  program_data_loaded:           'bg-indigo-50 text-indigo-700 border-indigo-200',
  ready_for_scoring:             'bg-amber-50 text-amber-700 border-amber-200',
  fully_onboarded:               'bg-green-50 text-green-700 border-green-200',
};

// C-14: Company Onboarding Room — COMPANY_ADMIN view of onboarding status
export default function CompanyOnboardingRoom() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const companyId   = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(companyId);
  const intake      = companyDataIntakeService.getDataReadinessSummary(companyId);
  const workerSumm  = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const nextAction  = companyOnboardingService.getNextBestAction(companyId);
  const pipeline    = companyOnboardingService.getPipelineReadiness(companyId);
  const checks      = companyOnboardingService.getReadinessChecks(companyId);
  const hasIndex    = !!scoringSimulatorService.getKoraIndexOutput(companyId, activeScenario);

  workerProvisioningService.assertEmployerCannotViewIndividualPIB(companyId, '');

  if (!tenant) {
    return (
      <div className="space-y-4 max-w-2xl">
        <h1 className="text-xl font-bold text-slate-900">Azienda non trovata</h1>
        <Link href="/company" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Executive Cockpit
        </Link>
      </div>
    );
  }

  const statusBadge = tenantService.getTenantStatusBadge(tenant.tenant_status);
  const onboardingLabel = tenant.onboarding_status.replace(/_/g, ' ');

  const companyReadinessChecks = checks.filter((c) => !c.blocking || c.status !== 'ok');
  const allClear = checks.length > 0 && checks.every((c) => c.status === 'ok');

  return (
    <div className="space-y-8 max-w-3xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Onboarding Room
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{tenant.company_name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold', statusBadge.classes)}>
            {statusBadge.label}
          </span>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
            ONBOARDING_STATUS_PILL[tenant.onboarding_status] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
            {onboardingLabel}
          </span>
        </div>
      </div>

      {/* ── Doctrine banner ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 space-y-1">
        <p className="font-semibold">Questa è la Onboarding Room della tua azienda.</p>
        <p>KORA gestisce l&apos;onboarding operativo — setup, validazione dati e readiness metodologica.</p>
        <p>Il KORA Index sarà disponibile dopo data intake, validazione e scoring readiness.</p>
        <p className="text-indigo-600">Il PIB individuale resta privato al lavoratore.</p>
      </div>

      {/* ── Next action ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Prossima Azione
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">{nextAction.action}</p>
          {nextAction.detail && (
            <p className="text-xs text-amber-700 mt-0.5">{nextAction.detail}</p>
          )}
        </div>
      </section>

      {/* ── Status grid ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Stato Onboarding
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Data Intake */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Data Intake</p>
            <p className={cn('text-sm font-semibold mt-1',
              intake.intake_status === 'ready_for_ingestion' ? 'text-green-700' :
              intake.intake_status === 'not_started' ? 'text-slate-400' : 'text-amber-700')}>
              {intake.intake_status.replace(/_/g, ' ')}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {intake.total_rows} righe · {intake.ready_for_ingestion_rows} pronte
            </p>
          </div>
          {/* Worker Roster */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Worker Roster</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{workerSumm?.total_workers ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">{workerSumm?.active_worker_accounts ?? 0} attivi</p>
          </div>
          {/* KORA Index */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">KORA Index</p>
            <p className={cn('text-sm font-semibold mt-1', hasIndex ? 'text-green-700' : 'text-slate-400')}>
              {hasIndex ? 'Disponibile' : 'Non disponibile'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {hasIndex ? 'Scoring completato' : 'In attesa di dati e validazione'}
            </p>
          </div>
          {/* Decision Pack */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Decision Pack</p>
            <p className={cn('text-sm font-semibold mt-1', hasIndex ? 'text-green-700' : 'text-slate-400')}>
              {hasIndex ? 'Disponibile' : 'Non disponibile'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {hasIndex ? 'Report pronto' : 'Disponibile dopo scoring'}
            </p>
          </div>
          {/* Pipeline */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Pipeline KORA</p>
            <p className={cn('text-sm font-semibold mt-1',
              pipeline.status === 'ok' ? 'text-green-700' :
              pipeline.status === 'blocked' ? 'text-rose-700' : 'text-amber-700')}>
              {pipeline.status === 'ok' ? 'Pronta' : pipeline.status === 'blocked' ? 'Bloccata' : 'In progress'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Readiness metodologica KORA</p>
          </div>
          {/* Onboarding stage */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Fase</p>
            <p className="text-sm font-semibold text-slate-700 mt-1 capitalize">{onboardingLabel}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Stato onboarding corrente</p>
          </div>
        </div>
      </section>

      {/* ── Readiness checklist ── */}
      {checks.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Readiness Checklist
          </h2>
          {allClear ? (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-semibold text-green-800">Tutti i requisiti soddisfatti — pronto per scoring.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              {companyReadinessChecks.slice(0, 5).map((c) => {
                const isOk = c.status === 'ok';
                const isBlocking = c.blocking && !isOk;
                return (
                  <div key={c.label} className={cn('flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0',
                    isOk ? '' : isBlocking ? 'bg-rose-50' : 'bg-amber-50')}>
                    <span className={cn('mt-0.5 text-xs font-bold shrink-0',
                      isOk ? 'text-green-500' : isBlocking ? 'text-rose-600' : 'text-amber-600')}>
                      {isOk ? '✓' : isBlocking ? '✕' : '!'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">{c.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{c.detail}</p>
                    </div>
                    {isBlocking && (
                      <span className="shrink-0 text-[9px] font-bold text-rose-600 uppercase tracking-wide">Richiesto</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── What KORA does ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-600">Come funziona l&apos;onboarding KORA</p>
        <p>KORA configura il tenant, valida i dati, costruisce la workforce baseline e produce il KORA Index.</p>
        <p>L&apos;azienda collabora fornendo dati, evidenze e approvazioni — non gestisce il backstage metodologico.</p>
        <p>Il PIB individuale dei lavoratori non è visibile qui. KORA mostra solo stato aggregato e pipeline readiness.</p>
      </div>

      {/* ── CTAs ── */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <Link href="/company/kora-index"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors">
          KORA Index →
        </Link>
        <Link href="/company/reports"
          className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
          Decision Pack →
        </Link>
        <Link href="/company/profile"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2">
          Profilo & Stato KORA
        </Link>
        <Link href="/company"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Executive Cockpit
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Onboarding Room · synthetic_demo_data: true · company_id: {companyId}
      </p>
    </div>
  );
}
