'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { companyIntelligenceService } from '@/services/company-intelligence/CompanyIntelligenceService';
import type { CompanyRiskLevel } from '@/services/company-intelligence/CompanyIntelligenceService';
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

const RISK_BADGE: Record<CompanyRiskLevel, { label: string; classes: string }> = {
  ready:           { label: 'Ready',           classes: 'border-green-200 bg-green-50 text-green-700' },
  monitor:         { label: 'Monitor',         classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  action_required: { label: 'Action Required', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  blocked:         { label: 'Bloccato',        classes: 'border-rose-200 bg-rose-50 text-rose-700' },
};

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'text-green-700 bg-green-50 border-green-200',
  WARNING: 'text-amber-700 bg-amber-50 border-amber-200',
  FLAGGED: 'text-rose-700 bg-rose-50 border-rose-200',
};

type ActionFeedback = { tenantId: string; message: string; type: 'success' | 'error' };

function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }

// A-15: KORA Admin — Company Mission Control v2
export default function AdminCompanyMissionControl() {
  const tenants = tenantService.getTenants();
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);

  // ── Intelligence layer ──────────────────────────────────────────────────────
  const portfolio = companyIntelligenceService.getPortfolioReadinessSummary();
  const intelligenceRecords = companyIntelligenceService.getAllCompanyIntelligenceRecords();
  const actionQueue = companyIntelligenceService.getKoraActionQueue();

  // ── Platform Control Metrics ────────────────────────────────────────────────
  const allAccounts: KoraUserAccount[] = tenants.flatMap((t) =>
    accountProvisioningService.getAccountsForCompany(t.company_id),
  );
  const allWorkers: WorkerRosterRecord[] = tenants.flatMap((t) =>
    workerProvisioningService.getWorkersForCompany(t.company_id),
  );
  const allIntakeSummaries = tenants.map((t) => companyDataIntakeService.getDataReadinessSummary(t.company_id));
  const pm = {
    tenants_missing_admin:  tenants.filter((t) => !allAccounts.some((u) => u.company_id === t.company_id && u.role === 'COMPANY_ADMIN')).length,
    company_admins_invited: allAccounts.filter((u) => u.role === 'COMPANY_ADMIN' && u.invitation_status === 'pending').length,
    company_admins_active:  allAccounts.filter((u) => u.role === 'COMPANY_ADMIN' && u.account_status === 'active_demo').length,
    workers_total:          allWorkers.length,
    workers_invited:        allWorkers.filter((w) => w.worker_account_status === 'invited').length,
    workers_active:         allWorkers.filter((w) => w.worker_account_status === 'active_demo').length,
    my_kora_enabled:        allWorkers.filter((w) => w.my_kora_enabled).length,
    pib_private_enabled:    allWorkers.filter((w) => w.pib_private_enabled).length,
    lifecycle_events:       lifecycleService.getAllEvents().length,
    total_raw_rows:              allIntakeSummaries.reduce((acc, s) => acc + s.total_rows, 0),
    ready_for_ingestion_rows:    allIntakeSummaries.reduce((acc, s) => acc + s.ready_for_ingestion_rows, 0),
    blocked_candidate_rows:      allIntakeSummaries.reduce((acc, s) => acc + s.blocked_candidate_rows, 0),
    review_required_rows:        allIntakeSummaries.reduce((acc, s) => acc + s.review_required_rows, 0),
    structural_policy_rows:      allIntakeSummaries.reduce((acc, s) => acc + s.structural_policy_rows, 0),
  };

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
    <div className="space-y-8 max-w-5xl">

      {/* ── SECTION A: Mission Control Hero ──────────────────────────────────── */}
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            KORA Admin — Company Mission Control
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">Company Mission Control</h1>
          <p className="text-sm text-slate-500 mt-1">
            Portfolio intelligence, readiness matrix e action queue per l&apos;ecosistema tenant KORA.
          </p>
        </div>

        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed space-y-1">
          <p><span className="font-semibold">KORA Admin governa la piattaforma, non sorveglia i lavoratori.</span></p>
          <p>Il PIB individuale resta privato al lavoratore. L&apos;azienda vede solo aggregati sopra soglia privacy (N≥10).</p>
        </div>

        {/* Hero KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Tenant attivi',         value: String(portfolio.active_tenants),        style: 'border-green-200 bg-green-50 text-green-800' },
            { label: 'KORA Index disponibile', value: String(portfolio.kora_index_available),  style: 'border-indigo-200 bg-indigo-50 text-indigo-700' },
            { label: 'Decision Pack pronti',  value: String(portfolio.decision_pack_ready),   style: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
            { label: 'Azioni richieste',      value: String(portfolio.needing_kora_action),   style: portfolio.needing_kora_action > 0 ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-500' },
          ].map(({ label, value, style }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${style}`}>
              <p className="text-[10px] font-medium opacity-70 leading-tight">{label}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
          ))}
        </div>

        {/* Secondary KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {[
            ['Tenant in bozza',     String(portfolio.draft_tenants),              portfolio.draft_tenants > 0 ? 'text-amber-700' : 'text-slate-400'],
            ['Data intake pronti',  String(portfolio.data_intake_ready),          portfolio.data_intake_ready > 0 ? 'text-green-700' : 'text-slate-400'],
            ['Roster ≥30 lavoratori', String(portfolio.worker_roster_complete),   'text-slate-700'],
            ['My KORA attive',      String(portfolio.my_kora_active_companies),   'text-indigo-600'],
            ['Senza dati',          String(portfolio.no_data_tenants),            portfolio.no_data_tenants > 0 ? 'text-rose-600' : 'text-slate-400'],
            ['Advisor review req.', String(portfolio.advisor_review_required),    portfolio.advisor_review_required > 0 ? 'text-amber-700' : 'text-slate-400'],
          ].map(([label, value, textColor]) => (
            <div key={label as string} className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
              <p className="text-[9px] text-slate-400 leading-tight">{label}</p>
              <p className={`text-lg font-bold mt-0.5 ${textColor}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Action strip */}
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
      </div>

      {/* ── SECTION B: Portfolio Intelligence Cards ───────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          B — Portfolio Intelligence · {intelligenceRecords.length} aziende
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {intelligenceRecords.map((rec) => {
            const riskBadge = RISK_BADGE[rec.risk_level];
            return (
              <div
                key={rec.company_id}
                className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 leading-tight">{rec.company_name}</p>
                    <p className="text-[9px] font-mono text-slate-400 mt-0.5">{rec.company_id}</p>
                  </div>
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${riskBadge.classes}`}>
                    {riskBadge.label}
                  </span>
                </div>

                {/* KORA Index row */}
                {rec.kora_index_available && rec.kora_index_value !== null ? (
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-indigo-600 font-semibold">KORA Index</p>
                      {rec.activation_safeguard_status && (
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${SAFEGUARD_BADGE[rec.activation_safeguard_status] ?? 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          {rec.activation_safeguard_status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-end gap-3 mt-1">
                      <p className="text-xl font-bold text-indigo-900">{rec.kora_index_value.toFixed(1)}</p>
                      {rec.confidence_score !== null && (
                        <p className="text-[10px] text-indigo-600 mb-0.5">CS: {(rec.confidence_score * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] text-slate-400">KORA Index — non disponibile</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{rec.next_action}</p>
                  </div>
                )}

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div>
                    <p className="text-slate-400">Lavoratori</p>
                    <p className="font-semibold text-slate-700">{rec.worker_count}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">My KORA</p>
                    <p className="font-semibold text-slate-700">{rec.my_kora_enabled_count}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Data Intake</p>
                    <p className={`font-semibold ${rec.data_intake_status === 'ready_for_ingestion' ? 'text-green-700' : rec.data_intake_status === 'not_started' ? 'text-rose-600' : 'text-amber-700'}`}>
                      {rec.data_intake_status === 'ready_for_ingestion' ? 'Pronto' :
                       rec.data_intake_status === 'not_started' ? 'Non avviato' :
                       rec.data_intake_status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Decision Pack</p>
                    <p className={`font-semibold ${rec.decision_pack_status === 'ready' ? 'text-green-700' : 'text-slate-500'}`}>
                      {rec.decision_pack_status.replace(/_/g, ' ')}
                    </p>
                  </div>
                  {rec.deep_activation_share !== null && (
                    <div>
                      <p className="text-slate-400">Deep Activ.</p>
                      <p className="font-semibold text-indigo-700">{pct(rec.deep_activation_share)}</p>
                    </div>
                  )}
                  {rec.bti_score !== null && (
                    <div>
                      <p className="text-slate-400">BTI Score</p>
                      <p className="font-semibold text-indigo-700">{rec.bti_score.toFixed(1)}</p>
                    </div>
                  )}
                </div>

                {/* Card actions */}
                <div className="flex items-center gap-3 flex-wrap border-t border-slate-100 pt-2.5">
                  <Link href={`/admin/companies/${rec.company_id}`}
                    className="text-[10px] font-semibold text-indigo-600 hover:underline">
                    Dettaglio →
                  </Link>
                  <Link href={`/admin/companies/${rec.company_id}/data-intake`}
                    className="text-[10px] font-semibold text-violet-600 hover:underline">
                    Data Intake
                  </Link>
                  <Link href={`/admin/companies/${rec.company_id}/onboarding`}
                    className="text-[10px] text-slate-500 hover:text-slate-700 hover:underline">
                    Onboarding
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── SECTION C: Readiness Matrix ──────────────────────────────────────── */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          C — Readiness Matrix
        </p>
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto_auto] gap-0 text-[10px]">
            {/* Header */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500">Azienda</div>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center">Tenant</div>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center">Roster</div>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center">Intake</div>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center">KORA Index</div>
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-500 text-center">Risk</div>

            {/* Rows */}
            {intelligenceRecords.map((rec) => {
              const riskBadge = RISK_BADGE[rec.risk_level];
              return [
                <div key={`${rec.company_id}-name`} className="px-3 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-800">{rec.company_name}</p>
                  <p className="text-slate-400 mt-0.5">{rec.onboarding_status.replace(/_/g, ' ')}</p>
                </div>,
                <div key={`${rec.company_id}-tenant`} className="px-3 py-3 border-b border-slate-100 flex items-center justify-center">
                  <span className={`rounded-full w-2 h-2 ${rec.tenant_status === 'active' ? 'bg-green-500' : 'bg-amber-400'}`} />
                </div>,
                <div key={`${rec.company_id}-roster`} className="px-3 py-3 border-b border-slate-100 text-center">
                  <p className={`font-semibold ${rec.worker_count >= 30 ? 'text-green-700' : rec.worker_count > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                    {rec.worker_count}
                  </p>
                </div>,
                <div key={`${rec.company_id}-intake`} className="px-3 py-3 border-b border-slate-100 text-center">
                  <span className={`rounded px-1.5 py-0.5 font-semibold ${
                    rec.data_intake_status === 'ready_for_ingestion' ? 'bg-green-100 text-green-700' :
                    rec.data_intake_status === 'validation_required' ? 'bg-amber-100 text-amber-700' :
                    rec.data_intake_status === 'blocked_missing_required_fields' ? 'bg-rose-100 text-rose-700' :
                    rec.data_intake_status === 'not_started' ? 'bg-slate-100 text-slate-500' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {rec.data_intake_status === 'ready_for_ingestion' ? '✓' :
                     rec.data_intake_status === 'not_started' ? '—' :
                     rec.data_intake_status === 'validation_required' ? 'rev.' :
                     rec.data_intake_status === 'blocked_missing_required_fields' ? 'blk' :
                     '...'}
                  </span>
                </div>,
                <div key={`${rec.company_id}-kora`} className="px-3 py-3 border-b border-slate-100 text-center">
                  {rec.kora_index_available && rec.kora_index_value !== null ? (
                    <p className="font-bold text-indigo-700">{rec.kora_index_value.toFixed(1)}</p>
                  ) : (
                    <p className="text-slate-300">—</p>
                  )}
                </div>,
                <div key={`${rec.company_id}-risk`} className="px-3 py-3 border-b border-slate-100 flex items-center justify-center">
                  <span className={`rounded border px-1.5 py-0.5 font-semibold whitespace-nowrap ${riskBadge.classes}`}>
                    {riskBadge.label}
                  </span>
                </div>,
              ];
            })}
          </div>
        </div>
      </div>

      {/* ── SECTION D: KORA Action Queue ─────────────────────────────────────── */}
      {actionQueue.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            D — KORA Action Queue · {actionQueue.length} azioni pendenti
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
            <div className="divide-y divide-amber-100">
              {actionQueue.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 px-4 py-3">
                  <span className={`mt-0.5 rounded border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap ${
                    item.priority === 'alta' ? 'border-rose-200 bg-rose-50 text-rose-700' :
                    item.priority === 'media' ? 'border-amber-200 bg-white text-amber-700' :
                    'border-slate-200 bg-white text-slate-500'
                  }`}>
                    {item.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-900">{item.company_name}</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">{item.issue}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">{item.recommended_action}</p>
                  </div>
                  <Link href={item.cta_href}
                    className="text-[10px] font-semibold text-amber-700 hover:text-amber-900 hover:underline whitespace-nowrap mt-0.5">
                    {item.cta_label}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION E: Platform Registry ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            E — Platform Registry · {tenants.length} tenant
          </p>
          <p className="text-[9px] font-mono text-slate-300">
            lifecycle: {pm.lifecycle_events} · pib_private: {pm.pib_private_enabled} · synthetic_demo_data: true
          </p>
        </div>

        {/* Data Intake pipeline summary */}
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">Data Intake Pipeline — aggregato piattaforma</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-9">
            {[
              ['Lavoratori totali',   String(pm.workers_total),              'text-slate-700 bg-white border-slate-200'],
              ['Admin invitati',      String(pm.company_admins_invited),     pm.company_admins_invited > 0 ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Admin attivi',        String(pm.company_admins_active),      'text-green-700 bg-white border-slate-200'],
              ['Lavoratori attivi',   String(pm.workers_active),             'text-green-700 bg-white border-slate-200'],
              ['My KORA abilitati',   String(pm.my_kora_enabled),            'text-indigo-700 bg-indigo-50 border-indigo-200'],
              ['Righe totali',        String(pm.total_raw_rows),             'text-slate-700 bg-white border-slate-200'],
              ['Pronte ingestion',    String(pm.ready_for_ingestion_rows),   pm.ready_for_ingestion_rows > 0 ? 'text-green-700 bg-green-50 border-green-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Review richieste',    String(pm.review_required_rows),       pm.review_required_rows > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-slate-400 bg-white border-slate-100'],
              ['Policy strutturali',  String(pm.structural_policy_rows),     'text-indigo-700 bg-indigo-50 border-indigo-200'],
            ].map(([label, value, style]) => (
              <div key={label as string} className={`rounded-lg border p-2 text-center ${style}`}>
                <p className="text-[9px] leading-tight opacity-70">{label}</p>
                <p className="text-base font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant table */}
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Tenant Portfolio
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
              const intel = intelligenceRecords.find((r) => r.company_id === tenant.company_id);

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
                        {intel && (
                          <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${RISK_BADGE[intel.risk_level].classes}`}>
                            {RISK_BADGE[intel.risk_level].label}
                          </span>
                        )}
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
                        intakeSummary.intake_status === 'ready_for_ingestion'             ? 'bg-green-100 text-green-700' :
                        intakeSummary.intake_status === 'validation_required'             ? 'bg-amber-100 text-amber-700' :
                        intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'bg-rose-100 text-rose-700' :
                        intakeSummary.intake_status === 'partial'                         ? 'bg-blue-100 text-blue-700' :
                        intakeSummary.intake_status === 'draft'                           ? 'bg-indigo-100 text-indigo-600' :
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

                  {/* Action links — no /company/reports (scoping boundary) */}
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
          KORA Admin · synthetic_demo_data: true · Foundation Light v0.1 · Company Mission Control v2
        </p>
      </div>
    </div>
  );
}
