'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';

// A-19: KORA Admin — Company Detail (Enterprise SaaS Backbone)
export default function AdminCompanyDetail({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tenant = tenantService.getTenant(companyId);
  const readiness = tenant ? tenantService.getTenantReadiness(companyId) : null;
  const companyAccounts = accountProvisioningService.getAccountsForCompany(companyId);
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const workerRoster = workerProvisioningService.getWorkersForCompany(companyId);
  const auditEvents = tenant ? lifecycleService.getLifecycleAuditForTenant(companyId) : [];

  workerProvisioningService.assertEmployerCannotViewIndividualPIB(companyId, '');

  if (!tenant) {
    return (
      <div className="space-y-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">KORA Admin</p>
        <h1 className="text-xl font-bold text-slate-900">Azienda non trovata</h1>
        <p className="text-sm text-slate-500">company_id: <span className="font-mono">{companyId}</span> non presente nel portfolio tenant.</p>
        <Link href="/admin/companies" className="text-xs font-semibold text-indigo-600 hover:underline">← Company Registry</Link>
      </div>
    );
  }

  const statusBadge = tenantService.getTenantStatusBadge(tenant.tenant_status);

  function handleUserAction(fn: (id: string) => { success: boolean; note: string }, userId: string) {
    const res = fn(userId);
    setFeedback({ message: res.note, type: res.success ? 'success' : 'error' });
  }

  function handleWorkerAction(fn: (id: string) => { success: boolean; note: string }, workerId: string) {
    const res = fn(workerId);
    setFeedback({ message: res.note, type: res.success ? 'success' : 'error' });
  }

  const READINESS_BADGE: Record<string, string> = {
    blocked:                  'text-rose-600',
    draft:                    'text-slate-400',
    data_required:            'text-amber-600',
    access_required:          'text-blue-600',
    privacy_review_required:  'text-purple-600',
    ready_for_pipeline:       'text-green-600',
    ready_for_company_portal: 'text-emerald-600',
  };
  const READINESS_LABEL: Record<string, string> = {
    blocked: 'Bloccato', draft: 'Bozza', data_required: 'Dati richiesti',
    access_required: 'Accesso da configurare', privacy_review_required: 'Privacy review',
    ready_for_pipeline: 'Pronto pipeline', ready_for_company_portal: 'Pronto portale',
  };

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Vista Operativa Azienda Cliente
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900">{tenant.company_name}</h1>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.classes}`}>
            {statusBadge.label}
          </span>
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
          tenant_id: {tenant.tenant_id} · company_id: {companyId}
        </p>
      </div>

      {/* ── Admin identity ── */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <span className="font-semibold">Vista operativa KORA Admin.</span>{' '}
        Il cliente azienda non vede questa console tecnica.
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded border px-3 py-2 text-xs ${
          feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* ── SECTION: Tenant Overview ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Tenant Overview</p>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            {[
              ['Ragione sociale', tenant.legal_name],
              ['Settore', tenant.sector],
              ['Territorio', tenant.territory],
              ['Sede principale', tenant.headquarters_location],
              ['Dipendenti', String(tenant.employee_count)],
              ['Fascia', tenant.size_band],
              ['Piano', tenant.kora_plan],
              ['Periodo', tenant.analysis_period],
              ['Onboarding', tenant.onboarding_status.replace(/_/g, ' ')],
              ['Dati readiness', tenant.data_readiness_status],
              ['Decision Pack', tenant.decision_pack_status],
              ['Advisor', tenant.assigned_advisor ?? '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-slate-400">{label}</p>
                <p className="text-slate-700 font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION: Readiness Matrix ── */}
      {readiness && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Readiness Tenant</p>
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
              {Object.entries(readiness).map(([key, status]) => (
                <div key={key} className="flex items-center justify-between px-4 py-2.5">
                  <p className="text-[10px] text-slate-600 capitalize">{key.replace(/_/g, ' ')}</p>
                  <span className={`text-[10px] font-semibold ${READINESS_BADGE[status] ?? 'text-slate-400'}`}>
                    {READINESS_LABEL[status] ?? status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION: Access & Users ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Access & Users — {companyAccounts.length} utenti
        </p>
        {companyAccounts.length === 0 ? (
          <div className="rounded border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400">
            Nessun utente aziendale configurato. Avvia Enterprise Onboarding per creare il primo admin.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-100">
              {companyAccounts.map((user) => {
                const statusBdg = accountProvisioningService.getAccountStatusBadge(user.account_status);
                const invBdg = accountProvisioningService.getInvitationStatusBadge(user.invitation_status);
                return (
                  <div key={user.user_id} className="px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{user.display_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{user.email ?? '—'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono text-slate-600">{user.role}</span>
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${statusBdg.classes}`}>{statusBdg.label}</span>
                          <span className={`text-[10px] font-medium ${invBdg.classes}`}>Invito: {invBdg.label}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        {user.invitation_status === 'pending' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUserAction(accountProvisioningService.revokeInvite.bind(accountProvisioningService), user.user_id)}
                              className="text-amber-600 hover:underline"
                            >
                              Revoca invito
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUserAction(accountProvisioningService.resetInvite.bind(accountProvisioningService), user.user_id)}
                              className="text-blue-600 hover:underline"
                            >
                              Rigenera invito
                            </button>
                          </>
                        )}
                        {user.account_status === 'active_demo' && (
                          <button
                            type="button"
                            onClick={() => handleUserAction(accountProvisioningService.disableUser.bind(accountProvisioningService), user.user_id)}
                            className="text-slate-500 hover:underline"
                          >
                            Disabilita
                          </button>
                        )}
                        {['draft', 'invited'].includes(user.account_status) && (
                          <button
                            type="button"
                            onClick={() => handleUserAction(accountProvisioningService.deleteDemoUser.bind(accountProvisioningService), user.user_id)}
                            className="text-rose-500 hover:underline"
                          >
                            Elimina (demo)
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-400">
                      Sezioni visibili: {user.visible_sections.slice(0, 5).join(', ')}{user.visible_sections.length > 5 ? '...' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Link href="/admin/companies/setup"
            className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors">
            + Crea admin aziendale
          </Link>
        </div>
      </section>

      {/* ── SECTION: Worker Provisioning ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Worker Provisioning
        </p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            <div><p className="text-slate-400">Totale roster</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.total_workers}</p></div>
            <div><p className="text-slate-400">Invitati</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.invited_workers}</p></div>
            <div><p className="text-slate-400">Account attivi</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.active_worker_accounts}</p></div>
            <div><p className="text-slate-400">My KORA abilitati</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.my_kora_enabled_count}</p></div>
            <div><p className="text-slate-400">PIB privato</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.pib_private_enabled_count}</p></div>
            <div><p className="text-slate-400">Cluster soppressi</p><p className="text-slate-700 font-bold text-sm mt-0.5">{workerSummary.suppressed_clusters_count}</p></div>
          </div>
          <div className="rounded border border-indigo-100 bg-indigo-50 px-3 py-2 text-[10px] text-indigo-700 leading-relaxed">
            {workerSummary.privacy_notes}
          </div>
          <p className="text-[10px] text-amber-700 font-medium">{workerSummary.next_action}</p>
        </div>

        {/* Roster table */}
        {workerRoster.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Roster Lavoratori — aggregato, nessun PIB individuale
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {workerRoster.slice(0, 10).map((w) => {
                const wBdg = accountProvisioningService.getAccountStatusBadge(w.worker_account_status);
                return (
                  <div key={w.worker_id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-slate-50 flex-wrap">
                    <p className="text-[10px] font-mono text-slate-500 w-32 shrink-0">{w.worker_id}</p>
                    <p className="text-[10px] text-slate-600 flex-1">{w.role_family} · {w.department} · {w.site}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${wBdg.classes}`}>{wBdg.label}</span>
                    <span className="text-[10px] text-slate-400">My KORA: {w.my_kora_enabled ? 'ON' : 'off'}</span>
                    <div className="flex items-center gap-2 text-[10px]">
                      {w.worker_account_status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleWorkerAction(workerProvisioningService.inviteWorker.bind(workerProvisioningService), w.worker_id)}
                          className="text-blue-600 hover:underline"
                        >
                          Invita
                        </button>
                      )}
                      {w.worker_account_status === 'active_demo' && (
                        <button
                          type="button"
                          onClick={() => handleWorkerAction(workerProvisioningService.disableWorker.bind(workerProvisioningService), w.worker_id)}
                          className="text-slate-500 hover:underline"
                        >
                          Disabilita
                        </button>
                      )}
                      {w.worker_account_status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleWorkerAction(workerProvisioningService.deleteDemoWorker.bind(workerProvisioningService), w.worker_id)}
                          className="text-rose-500 hover:underline"
                        >
                          Elimina (demo)
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION: Company Portal Status ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Company Portal Status</p>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-[10px]">
            <div><p className="text-slate-400">Portale attivo</p><p className="text-slate-700 font-semibold">{tenant.tenant_status === 'active' ? 'Sì' : 'No'}</p></div>
            <div><p className="text-slate-400">Admin configurato</p><p className="text-slate-700 font-semibold">{companyAccounts.some(u => u.role === 'COMPANY_ADMIN') ? 'Sì' : 'No'}</p></div>
            <div><p className="text-slate-400">Sezioni operative</p><p className="text-slate-700 font-semibold">Gestite da KORA Admin</p></div>
            <div><p className="text-slate-400">Portale company route</p><p className="text-slate-700 font-mono">/company</p></div>
            <div><p className="text-slate-400">Advisor assegnato</p><p className="text-slate-700 font-semibold">{tenant.assigned_advisor ?? '—'}</p></div>
            <div><p className="text-slate-400">Worker My KORA</p><p className="text-slate-700 font-semibold">{workerSummary.my_kora_enabled_count} abilitati</p></div>
          </div>
        </div>
      </section>

      {/* ── SECTION: Lifecycle & Audit ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Lifecycle / Audit — {auditEvents.length} eventi
        </p>
        {auditEvents.length === 0 ? (
          <div className="rounded border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-400">
            Nessun evento di lifecycle registrato per questo tenant.
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <div className="divide-y divide-slate-100">
              {auditEvents.map((evt) => (
                <div key={evt.event_id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50">
                  <p className="text-[10px] font-mono text-slate-400 w-36 shrink-0">{evt.timestamp.slice(0, 16).replace('T', ' ')}</p>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-700">{lifecycleService.getActionLabel(evt.action)}</span>
                      <span className="text-[10px] font-mono text-slate-400">{evt.actor_role}</span>
                      {!evt.reversible && (
                        <span className="rounded border border-rose-200 bg-rose-50 px-1 py-0.5 text-[9px] text-rose-600">irreversibile</span>
                      )}
                    </div>
                    {evt.reason && <p className="text-[10px] text-slate-500 mt-0.5">{evt.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Navigation ── */}
      <div className="border-t border-slate-100 pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Registry
        </Link>
        <Link href="/admin/companies/setup" className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
          Enterprise Onboarding →
        </Link>
        <Link href="/company/reports" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          Decision Pack →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · synthetic_demo_data: true · company_id: {companyId} · Enterprise SaaS Backbone
      </p>
    </div>
  );
}
