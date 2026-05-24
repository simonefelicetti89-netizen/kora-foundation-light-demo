'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import type { KoraTenant, KoraUserAccount, WorkerRosterRecord } from '@/lib/types';

const ONBOARDING_PILL: Record<string, string> = {
  decision_pack_ready:          'border-green-200 bg-green-50 text-green-700',
  pipeline_active:              'border-blue-200 bg-blue-50 text-blue-700',
  readiness_check_passed:       'border-blue-200 bg-blue-50 text-blue-700',
  program_data_loaded:          'border-indigo-200 bg-indigo-50 text-indigo-700',
  workforce_baseline_complete:  'border-indigo-200 bg-indigo-50 text-indigo-600',
  profile_complete:             'border-amber-200 bg-amber-50 text-amber-700',
  not_started:                  'border-slate-200 bg-slate-50 text-slate-500',
};

type ActionFeedback = { tenantId: string; message: string; type: 'success' | 'error' };

// A-15: KORA Admin — Company Registry + Mission Control (Enterprise SaaS Backbone)
export default function AdminCompanyRegistry() {
  const tenants = tenantService.getTenants();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // ── Platform Control Metrics ──────────────────────────────────────────────
  const allAccounts: KoraUserAccount[] = tenants.flatMap((t) =>
    accountProvisioningService.getAccountsForCompany(t.company_id),
  );
  const allWorkers: WorkerRosterRecord[] = tenants.flatMap((t) =>
    workerProvisioningService.getWorkersForCompany(t.company_id),
  );
  const allIntakeSummaries = tenants.map((t) => companyDataIntakeService.getDataReadinessSummary(t.company_id));
  const pm = {
    total_tenants:          tenants.length,
    active_tenants:         tenants.filter((t) => t.tenant_status === 'active').length,
    draft_tenants:          tenants.filter((t) => t.tenant_status === 'draft').length,
    archived_tenants:       tenants.filter((t) => ['archived', 'suspended'].includes(t.tenant_status)).length,
    tenants_missing_admin:  tenants.filter((t) => !allAccounts.some((u) => u.company_id === t.company_id && u.role === 'COMPANY_ADMIN')).length,
    tenants_no_roster:      tenants.filter((t) => !allWorkers.some((w) => w.company_id === t.company_id)).length,
    company_admins_invited: allAccounts.filter((u) => u.role === 'COMPANY_ADMIN' && u.invitation_status === 'pending').length,
    company_admins_active:  allAccounts.filter((u) => u.role === 'COMPANY_ADMIN' && u.account_status === 'active_demo').length,
    workers_total:          allWorkers.length,
    workers_invited:        allWorkers.filter((w) => w.worker_account_status === 'invited').length,
    workers_active:         allWorkers.filter((w) => w.worker_account_status === 'active_demo').length,
    my_kora_enabled:        allWorkers.filter((w) => w.my_kora_enabled).length,
    pib_private_enabled:    allWorkers.filter((w) => w.pib_private_enabled).length,
    privacy_suppressed:     allWorkers.filter((w) => !w.privacy_threshold_cluster).length,
    decision_packs_ready:           tenants.filter((t) => t.decision_pack_status === 'ready').length,
    kora_index_available:           tenants.filter((t) => t.tenant_status === 'active' && t.data_readiness_status === 'high').length,
    lifecycle_events:               lifecycleService.getAllEvents().length,
    tenants_intake_not_started:     allIntakeSummaries.filter((s) => s.intake_status === 'not_started').length,
    tenants_validation_required:    allIntakeSummaries.filter((s) => s.intake_status === 'validation_required' || s.intake_status === 'blocked_missing_required_fields').length,
    tenants_ready_for_ingestion:    allIntakeSummaries.filter((s) => s.intake_status === 'ready_for_ingestion').length,
    total_raw_rows:                 allIntakeSummaries.reduce((acc, s) => acc + s.total_rows, 0),
    ready_for_ingestion_rows:       allIntakeSummaries.reduce((acc, s) => acc + s.ready_for_ingestion_rows, 0),
    blocked_candidate_rows:         allIntakeSummaries.reduce((acc, s) => acc + s.blocked_candidate_rows, 0),
    limited_candidate_rows:         allIntakeSummaries.reduce((acc, s) => acc + s.limited_candidate_rows, 0),
    structural_policy_rows:         allIntakeSummaries.reduce((acc, s) => acc + s.structural_policy_rows, 0),
    review_required_rows:           allIntakeSummaries.reduce((acc, s) => acc + s.review_required_rows, 0),
  };
  const riskFlags = [
    pm.tenants_missing_admin > 0  && `${pm.tenants_missing_admin} aziend${pm.tenants_missing_admin > 1 ? 'e' : 'a'} senza primo admin`,
    pm.draft_tenants > 0          && `${pm.draft_tenants} tenant in bozza — onboarding pendente`,
    pm.workers_invited > 0        && `${pm.workers_invited} lavoratori invitati in attesa di accettazione`,
    pm.tenants_no_roster > 0             && `${pm.tenants_no_roster} aziend${pm.tenants_no_roster > 1 ? 'e' : 'a'} senza roster lavoratori`,
    pm.tenants_intake_not_started > 0    && `${pm.tenants_intake_not_started} aziend${pm.tenants_intake_not_started > 1 ? 'e' : 'a'} con data intake non avviato`,
    pm.tenants_validation_required > 0   && `${pm.tenants_validation_required} aziend${pm.tenants_validation_required > 1 ? 'e' : 'a'} con dati in attesa di validazione`,
  ].filter(Boolean) as string[];

  function handleAction(
    fn: (id: string) => { success: boolean; note: string },
    tenant: KoraTenant,
    actorId: string,
    action: Parameters<typeof lifecycleService.logLifecycleEvent>[4],
  ) {
    const res = fn(tenant.company_id);
    setFeedback({ tenantId: tenant.tenant_id, message: res.note, type: res.success ? 'success' : 'error' });
    if (res.success) {
      lifecycleService.logLifecycleEvent('KORA_ADMIN', actorId, 'tenant', tenant.tenant_id, action);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Company Registry
        </p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Company Registry</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gestione multi-tenant — crea, configura e governa le aziende cliente KORA.
        </p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed space-y-1">
        <p><span className="font-semibold">KORA Admin governa la piattaforma, non sorveglia i lavoratori.</span></p>
        <p>Il controllo generale KORA mostra stati, readiness, accessi e aggregati privacy-safe.</p>
        <p>Il PIB individuale resta privato al lavoratore. L&apos;azienda vede solo aggregati sopra soglia privacy (N≥10).</p>
      </div>

      {/* ── Platform Control ── */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Controllo Piattaforma — {new Date().toLocaleDateString('it-IT')}
        </p>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ['Tenant attivi',         String(pm.active_tenants),        'border-green-200 bg-green-50 text-green-800'],
            ['Tenant in bozza',       String(pm.draft_tenants),         'border-amber-200 bg-amber-50 text-amber-800'],
            ['Archiviati/Sospesi',    String(pm.archived_tenants),      'border-slate-200 bg-slate-50 text-slate-600'],
            ['Senza admin',           String(pm.tenants_missing_admin), pm.tenants_missing_admin > 0 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500'],
            ['Decision Pack pronti',  String(pm.decision_packs_ready),  'border-green-200 bg-green-50 text-green-700'],
            ['KORA Index disponibile',String(pm.kora_index_available),  'border-indigo-200 bg-indigo-50 text-indigo-700'],
          ].map(([label, value, style]) => (
            <div key={label as string} className={`rounded-lg border p-2.5 text-center ${style}`}>
              <p className="text-[9px] leading-tight opacity-70">{label}</p>
              <p className="text-lg font-bold mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[
            ['Admin invitati',   String(pm.company_admins_invited), 'text-blue-700'],
            ['Admin attivi',     String(pm.company_admins_active),  'text-green-700'],
            ['Lavoratori totali',String(pm.workers_total),          'text-slate-700'],
            ['Lavoratori invitati',String(pm.workers_invited),      pm.workers_invited > 0 ? 'text-amber-700' : 'text-slate-500'],
            ['My KORA abilitati',String(pm.my_kora_enabled),        'text-indigo-700'],
            ['Cluster soppressi',String(pm.privacy_suppressed),     'text-slate-500'],
          ].map(([label, value, textColor]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-[9px] text-slate-400 leading-tight">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${textColor}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Data Intake metrics */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Data Intake Pipeline</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {[
              ['Non avviato',        String(pm.tenants_intake_not_started),  pm.tenants_intake_not_started > 0 ? 'text-slate-500 bg-slate-50 border-slate-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Validazione req.',   String(pm.tenants_validation_required), pm.tenants_validation_required > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Pronti ingestion',   String(pm.tenants_ready_for_ingestion), pm.tenants_ready_for_ingestion > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Righe totali',       String(pm.total_raw_rows),             'text-slate-700 bg-white border-slate-200'],
              ['Pronte',             String(pm.ready_for_ingestion_rows),   pm.ready_for_ingestion_rows > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Review req.',        String(pm.review_required_rows),       pm.review_required_rows > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Bloccate',           String(pm.blocked_candidate_rows),     pm.blocked_candidate_rows > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Limitate',           String(pm.limited_candidate_rows),     'text-slate-600 bg-white border-slate-200'],
              ['Policy strutturali', String(pm.structural_policy_rows),     'text-indigo-700 bg-indigo-50 border-indigo-200'],
            ].map(([label, value, style]) => (
              <div key={label as string} className={`rounded-lg border p-2 text-center ${style}`}>
                <p className="text-[9px] leading-tight opacity-70">{label}</p>
                <p className="text-base font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risk flags */}
        {riskFlags.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Azioni pendenti</p>
            {riskFlags.map((flag) => (
              <p key={flag} className="text-xs text-amber-800">· {flag}</p>
            ))}
          </div>
        )}

        <p className="text-[9px] font-mono text-slate-300">
          lifecycle_events: {pm.lifecycle_events} · pib_private_enabled: {pm.pib_private_enabled} · synthetic_demo_data: true
        </p>
      </div>

      {/* ── Action strip ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/admin/companies/setup"
          className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
        >
          + Enterprise Onboarding
        </Link>
        <Link
          href="/admin/companies/onboarding"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Onboarding Studio
        </Link>
        <Link
          href="/admin/companies/workforce-baseline"
          className="rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Workforce Baseline
        </Link>
      </div>

      {/* ── Tenant table ── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Tenant Portfolio — {tenants.length} aziende
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {tenants.map((tenant) => {
            const companyAccounts = accountProvisioningService.getAccountsForCompany(tenant.company_id);
            const adminAccounts = companyAccounts.filter((u) => u.role === 'COMPANY_ADMIN');
            const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(tenant.company_id);
            const statusBadge = tenantService.getTenantStatusBadge(tenant.tenant_status);
            const intakeSummary = companyDataIntakeService.getDataReadinessSummary(tenant.company_id);
            const isFeedbackTarget = feedback?.tenantId === tenant.tenant_id;
            const isDemoReference = ['meridiana-group', 'alba-manufacturing'].includes(tenant.company_id);

            return (
              <div key={tenant.tenant_id} className="px-4 py-4 space-y-3 hover:bg-slate-50 transition-colors">

                {/* Row header */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{tenant.company_name}</p>
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusBadge.classes}`}>
                        {statusBadge.label}
                      </span>
                      {isDemoReference && (
                        <span className="rounded border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-500">
                          demo/reference
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      tenant_id: {tenant.tenant_id} · company_id: {tenant.company_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${ONBOARDING_PILL[tenant.onboarding_status] ?? 'border-slate-200 text-slate-400'}`}>
                      {tenant.onboarding_status.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
                      {tenant.kora_plan}
                    </span>
                  </div>
                </div>

                {/* Data grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 lg:grid-cols-6 text-[10px]">
                  <div><p className="text-slate-400">Settore</p><p className="text-slate-700 font-medium capitalize">{tenant.sector.replace(/_/g, ' ')}</p></div>
                  <div><p className="text-slate-400">Territorio</p><p className="text-slate-700 font-medium">{tenant.territory}</p></div>
                  <div><p className="text-slate-400">Dipendenti</p><p className="text-slate-700 font-medium">{tenant.employee_count}</p></div>
                  <div><p className="text-slate-400">Dati readiness</p><p className="text-slate-700 font-medium">{tenant.data_readiness_status}</p></div>
                  <div><p className="text-slate-400">Decision Pack</p><p className="text-slate-700 font-medium">{tenant.decision_pack_status}</p></div>
                  <div><p className="text-slate-400">Periodo</p><p className="text-slate-700 font-medium">{tenant.analysis_period}</p></div>
                </div>

                {/* User & worker summary */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 text-[10px] border-t border-slate-50 pt-2">
                  <div><p className="text-slate-400">Utenti aziendali</p><p className="text-slate-700 font-medium">{companyAccounts.length}</p></div>
                  <div>
                    <p className="text-slate-400">Primo admin</p>
                    <p className="text-slate-700 font-medium">
                      {adminAccounts.length > 0
                        ? `${adminAccounts[0].display_name.split('—')[0].trim()} (${adminAccounts[0].account_status})`
                        : '—'}
                    </p>
                  </div>
                  <div><p className="text-slate-400">Roster lavoratori</p><p className="text-slate-700 font-medium">{workerSummary.total_workers} record</p></div>
                  <div><p className="text-slate-400">My KORA attivi</p><p className="text-slate-700 font-medium">{workerSummary.my_kora_enabled_count}</p></div>
                </div>

                {/* Data Intake status */}
                <div className="flex items-center justify-between gap-3 rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[10px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-500">Data Intake:</span>
                    <span className={`rounded px-1.5 py-0.5 font-semibold ${
                      intakeSummary.intake_status === 'ready_for_ingestion'          ? 'bg-green-100 text-green-700' :
                      intakeSummary.intake_status === 'validation_required'          ? 'bg-amber-100 text-amber-700' :
                      intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'bg-rose-100 text-rose-700' :
                      intakeSummary.intake_status === 'partial'                      ? 'bg-blue-100 text-blue-700' :
                      intakeSummary.intake_status === 'draft'                        ? 'bg-indigo-100 text-indigo-600' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {intakeSummary.intake_status.replace(/_/g, ' ')}
                    </span>
                    {intakeSummary.total_rows > 0 && (
                      <span className="text-slate-500">
                        {intakeSummary.total_rows} righe · {intakeSummary.ready_for_ingestion_rows} pronte
                        {intakeSummary.review_required_rows > 0 && ` · ${intakeSummary.review_required_rows} review`}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/admin/companies/${tenant.company_id}/data-intake`}
                    className="font-semibold text-indigo-600 hover:underline whitespace-nowrap"
                  >
                    Data Intake →
                  </Link>
                </div>

                {/* Next action */}
                <div className="rounded border border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[10px] text-slate-600">
                  <span className="font-semibold text-slate-500">Prossima azione:</span>{' '}
                  {tenantService.getNextAction(tenant)}
                </div>

                {/* Feedback */}
                {isFeedbackTarget && feedback && (
                  <div className={`rounded border px-2.5 py-1.5 text-[10px] ${
                    feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                  }`}>
                    {feedback.message}
                  </div>
                )}

                {/* Action links */}
                <div className="flex items-center gap-3 flex-wrap border-t border-slate-100 pt-2">
                  <Link href={`/admin/companies/${tenant.company_id}`}
                    className="text-xs font-semibold text-indigo-600 hover:underline">
                    Dettaglio →
                  </Link>
                  <Link href={`/admin/companies/${tenant.company_id}/data-intake`}
                    className="text-xs font-semibold text-violet-600 hover:underline">
                    Data Intake
                  </Link>
                  <Link href={`/admin/companies/${tenant.company_id}/onboarding`}
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                    Onboarding Operativo
                  </Link>
                  <Link href="/admin/companies/workforce-baseline"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                    Workforce Baseline
                  </Link>
                  <Link href="/company/reports"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                    Decision Pack
                  </Link>

                  {/* Lifecycle actions — conditional on status */}
                  {tenant.tenant_status === 'draft' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(tenantService.activateTenant.bind(tenantService), tenant, 'admin-001', 'activate')}
                        className="text-xs text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                      >
                        Attiva
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(tenantService.deleteDemoTenant.bind(tenantService), tenant, 'admin-001', 'delete_demo')}
                        className="text-xs text-rose-500 hover:text-rose-700 hover:underline"
                      >
                        Elimina bozza
                      </button>
                    </>
                  )}
                  {tenant.tenant_status === 'active' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAction(tenantService.suspendTenant.bind(tenantService), tenant, 'admin-001', 'suspend')}
                        className="text-xs text-amber-600 hover:text-amber-800 hover:underline"
                      >
                        Sospendi
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(tenantService.archiveTenant.bind(tenantService), tenant, 'admin-001', 'archive')}
                        className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                      >
                        Archivia
                      </button>
                    </>
                  )}
                  {tenant.tenant_status === 'archived' && (
                    <button
                      type="button"
                      onClick={() => handleAction(tenantService.restoreTenant.bind(tenantService), tenant, 'admin-001', 'restore')}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Ripristina
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · synthetic_demo_data: true · Foundation Light v0.1 · Enterprise SaaS Backbone
      </p>
    </div>
  );
}
