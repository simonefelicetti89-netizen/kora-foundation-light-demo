'use client';

import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { cn } from '@/lib/utils';
import type { OnboardingReadinessCheck } from '@/lib/types';

const ONBOARDING_STATUS_PILL: Record<string, string> = {
  not_started:                   'bg-slate-100 text-slate-500 border-slate-200',
  profile_complete:              'bg-blue-50 text-blue-700 border-blue-200',
  workforce_baseline_complete:   'bg-blue-50 text-blue-700 border-blue-200',
  program_data_loaded:           'bg-indigo-50 text-indigo-700 border-indigo-200',
  ready_for_scoring:             'bg-amber-50 text-amber-700 border-amber-200',
  fully_onboarded:               'bg-green-50 text-green-700 border-green-200',
};

const INTAKE_STATUS_PILL: Record<string, string> = {
  not_started:                     'bg-slate-100 text-slate-500 border-slate-200',
  partial:                         'bg-blue-50 text-blue-700 border-blue-200',
  validation_required:             'bg-amber-100 text-amber-700 border-amber-200',
  blocked_missing_required_fields: 'bg-rose-100 text-rose-700 border-rose-200',
  ready_for_ingestion:             'bg-green-100 text-green-700 border-green-200',
  draft:                           'bg-indigo-100 text-indigo-600 border-indigo-200',
};

function ReadinessRow({ check }: { check: OnboardingReadinessCheck }) {
  const isOk = check.status === 'ok';
  const isBlocking = check.blocking && !isOk;
  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0',
      isOk ? '' : isBlocking ? 'bg-rose-50' : 'bg-amber-50')}>
      <span className={cn('mt-0.5 text-xs font-bold shrink-0', isOk ? 'text-green-500' : isBlocking ? 'text-rose-600' : 'text-amber-600')}>
        {isOk ? '✓' : isBlocking ? '✕' : '!'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-800">{check.label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{check.detail}</p>
      </div>
      {isBlocking && (
        <span className="shrink-0 text-[9px] font-bold text-rose-600 uppercase tracking-wide">Bloccante</span>
      )}
    </div>
  );
}

// A-18: KORA Admin — Per-Company Operational Onboarding
export default function AdminCompanyOnboarding({ params }: { params: { companyId: string } }) {
  const { companyId } = params;

  const tenant      = tenantService.getTenant(companyId);
  const readiness   = tenant ? tenantService.getTenantReadiness(companyId) : null;
  const intake      = companyDataIntakeService.getDataReadinessSummary(companyId);
  const accounts    = accountProvisioningService.getAccountsForCompany(companyId);
  const workerSumm  = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const nextAction  = companyOnboardingService.getNextBestAction(companyId);
  const pipeline    = companyOnboardingService.getPipelineReadiness(companyId);
  const checks      = companyOnboardingService.getReadinessChecks(companyId);
  const auditEvents = tenant ? lifecycleService.getLifecycleAuditForTenant(companyId).slice(0, 5) : [];
  const hasIndex    = !!scoringSimulatorService.getKoraIndexOutput(companyId, 'S1');

  workerProvisioningService.assertEmployerCannotViewIndividualPIB(companyId, '');

  if (!tenant) {
    return (
      <div className="space-y-4 max-w-3xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">KORA Admin — Onboarding</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Azienda non trovata</h1>
          <p className="text-sm text-slate-500 mt-1">company_id: <span className="font-mono">{companyId}</span></p>
        </div>
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
      </div>
    );
  }

  const statusBadge = tenantService.getTenantStatusBadge(tenant.tenant_status);
  const onboardingStatus = tenant.onboarding_status.replace(/_/g, ' ');
  const companyAdmins = accounts.filter((a) => a.role === 'COMPANY_ADMIN');
  const companyViewers = accounts.filter((a) => a.role === 'COMPANY_VIEWER');

  return (
    <div className="space-y-8 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Onboarding Operativo
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">{tenant.company_name}</h1>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="font-mono text-xs text-slate-400">{companyId}</span>
          <span className={cn('rounded border px-2 py-0.5 text-xs font-semibold', statusBadge.classes)}>
            {statusBadge.label}
          </span>
          <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
            ONBOARDING_STATUS_PILL[tenant.onboarding_status] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
            {onboardingStatus}
          </span>
        </div>
      </div>

      {/* ── KORA managed doctrine ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 space-y-1">
        <p className="font-semibold">L&apos;onboarding operativo è gestito da KORA.</p>
        <p>KORA configura tenant, accessi, dati, lavoratori e readiness metodologica.</p>
        <p>L&apos;azienda collabora fornendo dati, evidenze e approvazioni, ma non gestisce il backstage metodologico.</p>
      </div>

      {/* ── Next Action ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Prossima Azione KORA
        </h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">{nextAction.action}</p>
          {nextAction.detail && (
            <p className="text-xs text-amber-700 mt-0.5">{nextAction.detail}</p>
          )}
        </div>
      </section>

      {/* ── Pipeline Readiness ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Pipeline Readiness
        </h2>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className={cn('px-4 py-3 border-b border-slate-200 flex items-center justify-between',
            pipeline.status === 'ok' ? 'bg-green-50' : pipeline.status === 'blocked' ? 'bg-rose-50' : 'bg-amber-50')}>
            <p className={cn('text-sm font-semibold',
              pipeline.status === 'ok' ? 'text-green-800' : pipeline.status === 'blocked' ? 'text-rose-800' : 'text-amber-800')}>
              {pipeline.status === 'ok' ? 'Pronto per scoring' : pipeline.status === 'blocked' ? 'Bloccato — azioni richieste' : 'Warning — verificare'}
            </p>
            <span className={cn('rounded border px-2 py-0.5 text-xs font-bold uppercase',
              pipeline.status === 'ok' ? 'bg-green-100 text-green-700 border-green-200' :
              pipeline.status === 'blocked' ? 'bg-rose-100 text-rose-700 border-rose-200' :
              'bg-amber-100 text-amber-700 border-amber-200')}>
              {pipeline.status}
            </span>
          </div>
          {checks.length > 0 ? checks.map((c) => <ReadinessRow key={c.label} check={c} />) : (
            <p className="px-4 py-3 text-xs text-slate-400">Nessun check disponibile per questa azienda.</p>
          )}
        </div>
      </section>

      {/* ── 4-column status grid ── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          Stato Componenti Onboarding
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Data Intake */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Data Intake</p>
            <span className={cn('mt-1.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold',
              INTAKE_STATUS_PILL[intake.intake_status] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
              {intake.intake_status.replace(/_/g, ' ')}
            </span>
            <p className="text-xs font-mono text-slate-600 mt-1">{intake.total_rows} righe · {intake.ready_for_ingestion_rows} pronte</p>
          </div>
          {/* Worker Roster */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Worker Roster</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{workerSumm?.total_workers ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">{workerSumm?.active_worker_accounts ?? 0} attivi</p>
          </div>
          {/* Company Accounts */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">Accessi Aziendali</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{accounts.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">{companyAdmins.length} admin · {companyViewers.length} viewer</p>
          </div>
          {/* KORA Index */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-400">KORA Index</p>
            <p className={cn('text-sm font-semibold mt-1', hasIndex ? 'text-green-700' : 'text-slate-400')}>
              {hasIndex ? 'Disponibile' : 'Non disponibile'}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {hasIndex ? 'Dati di scoring completi' : 'Richiede data intake + scoring readiness'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Company Accounts ── */}
      {accounts.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Utenti Aziendali
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {accounts.map((acc) => (
              <div key={acc.user_id} className="flex items-center justify-between gap-4 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{acc.display_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 font-mono">{acc.role}</p>
                </div>
                <span className={cn('rounded border px-2 py-0.5 text-[10px] font-semibold',
                  acc.account_status === 'active_demo' ? 'bg-green-50 text-green-700 border-green-200' :
                  acc.account_status === 'invited' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-slate-50 text-slate-500 border-slate-200')}>
                  {acc.account_status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Readiness checks detail ── */}
      {readiness && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Tenant Readiness
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(readiness).map(([key, val]) => (
              typeof val === 'boolean' && (
                <div key={key} className="flex items-center gap-2">
                  <span className={cn('text-sm font-bold shrink-0', val ? 'text-green-500' : 'text-slate-300')}>
                    {val ? '✓' : '○'}
                  </span>
                  <p className="text-xs text-slate-600">{key.replace(/_/g, ' ')}</p>
                </div>
              )
            ))}
          </div>
        </section>
      )}

      {/* ── Lifecycle Audit ── */}
      {auditEvents.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Lifecycle Audit (ultimi eventi)
          </h2>
          <div className="rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {auditEvents.map((evt, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <p className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5 w-28">
                  {evt.timestamp?.slice(0, 10) ?? '—'}
                </p>
                <p className="text-xs text-slate-700">{evt.action ?? '—'}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Privacy note ── */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        Il PIB individuale dei lavoratori non è visibile in questa sezione. KORA Admin vede solo metadati aggregati,
        stato onboarding e readiness pipeline — mai dati personali o PIB individuali.
      </div>

      {/* ── Action Links ── */}
      <div className="flex items-center gap-4 flex-wrap text-xs">
        <Link href={`/admin/companies/${companyId}`}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 transition-colors">
          Dettaglio Azienda →
        </Link>
        <Link href={`/admin/companies/${companyId}/data-intake`}
          className="rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition-colors">
          Data Intake →
        </Link>
        <Link href="/admin/companies/workforce-baseline"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2">
          Worker Baseline
        </Link>
        <Link href="/admin/companies"
          className="text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · Onboarding Operativo · synthetic_demo_data: true · company_id: {companyId}
      </p>
    </div>
  );
}
