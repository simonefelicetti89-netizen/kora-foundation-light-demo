'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import type { KoraTenant } from '@/lib/types';

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

// A-15: KORA Admin — Company Registry (Enterprise SaaS Backbone)
export default function AdminCompanyRegistry() {
  const tenants = tenantService.getTenants();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

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
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <span className="font-semibold">KORA Admin — gestione azienda cliente.</span>{' '}
        Il portale azienda mostra solo output e stato; il setup operativo resta lato KORA Admin.
        Gli utenti aziendali sono company-scoped e vedono solo la propria azienda.
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

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {[
          ['Tenant totali', String(tenants.length)],
          ['Attivi', String(tenants.filter(t => t.tenant_status === 'active').length)],
          ['Bozze', String(tenants.filter(t => t.tenant_status === 'draft').length)],
          ['Decision Pack pronti', String(tenants.filter(t => t.decision_pack_status === 'ready').length)],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-[10px] text-slate-400">{label}</p>
            <p className="text-xl font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        ))}
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
            const adminAccounts = companyAccounts.filter(u => u.role === 'COMPANY_ADMIN');
            const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(tenant.company_id);
            const statusBadge = tenantService.getTenantStatusBadge(tenant.tenant_status);
            const isFeedbackTarget = feedback?.tenantId === tenant.tenant_id;

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
                  <Link href="/admin/companies/setup"
                    className="text-xs text-slate-500 hover:text-slate-700 hover:underline">
                    Enterprise Onboarding
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
