'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { lifecycleService } from '@/services/lifecycle/LifecycleService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { companyIntelligenceService } from '@/services/company-intelligence/CompanyIntelligenceService';
import type { CompanyRiskLevel } from '@/services/company-intelligence/CompanyIntelligenceService';
import { reportFactoryService } from '@/services/report-factory/ReportFactoryService';

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'border-green-200 bg-green-50 text-green-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  FLAGGED: 'border-rose-200 bg-rose-50 text-rose-700',
};

const RISK_BADGE: Record<CompanyRiskLevel, { label: string; classes: string }> = {
  ready:           { label: 'Ready',           classes: 'border-green-200 bg-green-50 text-green-700' },
  monitor:         { label: 'Monitor',         classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  action_required: { label: 'Action Required', classes: 'border-amber-200 bg-amber-50 text-amber-700' },
  blocked:         { label: 'Bloccato',        classes: 'border-rose-200 bg-rose-50 text-rose-700' },
};

function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }
function eur(v: number) { return `€${v.toLocaleString('it-IT')}`; }

// A-19: KORA Admin — Company Control Room (per-company) v2
export default function AdminCompanyControlRoom({ params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const tenant = tenantService.getTenant(companyId);
  const intakeSummary = companyDataIntakeService.getDataReadinessSummary(companyId);
  const companyAccounts = accountProvisioningService.getAccountsForCompany(companyId);
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const workerRoster = workerProvisioningService.getWorkersForCompany(companyId);
  const auditEvents = tenant ? lifecycleService.getLifecycleAuditForTenant(companyId) : [];
  const intel = companyIntelligenceService.getCompanyIntelligenceRecord(companyId);

  // KORA Index output: prefer S1, fallback S2
  const koraIndex = scoringSimulatorService.getKoraIndexOutput(companyId, 'S1')
    ?? scoringSimulatorService.getKoraIndexOutput(companyId, 'S2');

  // BTI: KORA_ADMIN has full access
  const btiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(companyId, 'S1', 'KORA_ADMIN');
  const btiRecord = btiResult.allowed ? btiResult.record : undefined;

  const dpFactoryStatus = reportFactoryService.getDecisionPackFactoryStatus(companyId);
  const dpLatestVersion = reportFactoryService.getLatestDecisionPackVersion(companyId);
  const dpComparison = dpLatestVersion
    ? reportFactoryService.getDecisionPackPeriodComparison(companyId, dpLatestVersion.version_id)
    : null;

  workerProvisioningService.assertEmployerCannotViewIndividualPIB(companyId, '');

  if (!tenant) {
    return (
      <div className="space-y-4 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">KORA Admin</p>
        <h1 className="text-xl font-bold text-slate-900">Azienda non trovata</h1>
        <p className="text-sm text-slate-500">company_id: <span className="font-mono">{companyId}</span> non presente nel portfolio tenant.</p>
        <Link href="/admin/companies" className="text-xs font-semibold text-indigo-600 hover:underline">← Company Mission Control</Link>
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

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── SECTION A: Header ────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          KORA Admin — Company Control Room
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900">{tenant.company_name}</h1>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.classes}`}>
            {statusBadge.label}
          </span>
          {intel && (
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${RISK_BADGE[intel.risk_level].classes}`}>
              {RISK_BADGE[intel.risk_level].label}
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
          tenant_id: {tenant.tenant_id} · company_id: {companyId} · {new Date().toLocaleDateString('it-IT')}
        </p>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs text-indigo-800 leading-relaxed">
        <span className="font-semibold">Vista operativa KORA Admin.</span>{' '}
        Il cliente azienda non vede questa console tecnica. Il PIB individuale resta privato al lavoratore.
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded border px-3 py-2 text-xs ${
          feedback.type === 'success' ? 'border-green-200 bg-green-50 text-green-700' : 'border-rose-200 bg-rose-50 text-rose-700'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* ── SECTION B: Tenant Overview ───────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">B — Tenant Overview</p>
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

      {/* ── SECTION C: Operational Readiness (8 tiles) ───────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">C — Operational Readiness</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Tile 1: Tenant Status */}
          <div className={`rounded-lg border p-3 text-center ${tenant.tenant_status === 'active' ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Tenant Status</p>
            <p className={`text-sm font-bold mt-1 ${tenant.tenant_status === 'active' ? 'text-green-700' : 'text-amber-700'}`}>
              {tenant.tenant_status}
            </p>
          </div>
          {/* Tile 2: Onboarding */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Onboarding</p>
            <p className="text-[10px] font-semibold text-slate-700 mt-1">{tenant.onboarding_status.replace(/_/g, ' ')}</p>
          </div>
          {/* Tile 3: Data Intake */}
          <div className={`rounded-lg border p-3 text-center ${
            intakeSummary.intake_status === 'ready_for_ingestion' ? 'border-green-200 bg-green-50' :
            intakeSummary.intake_status === 'not_started' ? 'border-rose-200 bg-rose-50' :
            intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'border-rose-200 bg-rose-50' :
            intakeSummary.intake_status === 'validation_required' ? 'border-amber-200 bg-amber-50' :
            'border-slate-200 bg-white'
          }`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Data Intake</p>
            <p className={`text-[10px] font-semibold mt-1 ${
              intakeSummary.intake_status === 'ready_for_ingestion' ? 'text-green-700' :
              intakeSummary.intake_status === 'not_started' ? 'text-rose-600' :
              intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'text-rose-700' :
              'text-amber-700'
            }`}>
              {intakeSummary.intake_status.replace(/_/g, ' ')}
            </p>
          </div>
          {/* Tile 4: Worker Roster */}
          <div className={`rounded-lg border p-3 text-center ${workerSummary.total_workers >= 30 ? 'border-green-200 bg-green-50' : workerSummary.total_workers > 0 ? 'border-blue-200 bg-blue-50' : 'border-rose-200 bg-rose-50'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Roster Lavoratori</p>
            <p className={`text-xl font-bold mt-1 ${workerSummary.total_workers >= 30 ? 'text-green-700' : workerSummary.total_workers > 0 ? 'text-blue-700' : 'text-rose-600'}`}>
              {workerSummary.total_workers}
            </p>
          </div>
          {/* Tile 5: My KORA Enabled */}
          <div className={`rounded-lg border p-3 text-center ${workerSummary.my_kora_enabled_count > 0 ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">My KORA Abilitati</p>
            <p className={`text-xl font-bold mt-1 ${workerSummary.my_kora_enabled_count > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
              {workerSummary.my_kora_enabled_count}
            </p>
          </div>
          {/* Tile 6: KORA Index Available */}
          <div className={`rounded-lg border p-3 text-center ${koraIndex ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">KORA Index</p>
            {koraIndex ? (
              <p className="text-xl font-bold mt-1 text-indigo-700">{koraIndex.kora_index_value.toFixed(1)}</p>
            ) : (
              <p className="text-[10px] font-semibold text-slate-400 mt-1">Non disponibile</p>
            )}
          </div>
          {/* Tile 7: Decision Pack */}
          <div className={`rounded-lg border p-3 text-center ${tenant.decision_pack_status === 'ready' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Decision Pack</p>
            <p className={`text-[10px] font-semibold mt-1 ${tenant.decision_pack_status === 'ready' ? 'text-emerald-700' : 'text-slate-500'}`}>
              {tenant.decision_pack_status.replace(/_/g, ' ')}
            </p>
          </div>
          {/* Tile 8: Advisor Assigned */}
          <div className={`rounded-lg border p-3 text-center ${tenant.assigned_advisor ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">Advisor Assegnato</p>
            <p className={`text-[10px] font-semibold mt-1 ${tenant.assigned_advisor ? 'text-violet-700' : 'text-slate-400'}`}>
              {tenant.assigned_advisor ?? '—'}
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION D: Data Intake ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">D — Data Intake — Pre-Ingestion</p>
          <Link
            href={`/admin/companies/${companyId}/data-intake`}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Apri Data Intake →
          </Link>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
          {intakeSummary.total_rows === 0 && intakeSummary.intake_status === 'not_started' ? (
            <div className="rounded border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <p className="font-semibold mb-1">Data intake non avviato</p>
              <p>Nessun piano fiscale né batch dati caricato. Accedi a Data Intake per definire il perimetro fiscale e caricare i programmi.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
                <div>
                  <p className="text-slate-400">Stato intake</p>
                  <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    intakeSummary.intake_status === 'ready_for_ingestion'             ? 'bg-green-100 text-green-700' :
                    intakeSummary.intake_status === 'validation_required'             ? 'bg-amber-100 text-amber-700' :
                    intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'bg-rose-100 text-rose-700' :
                    intakeSummary.intake_status === 'partial'                         ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {intakeSummary.intake_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div><p className="text-slate-400">Piano fiscale</p><p className="text-slate-700 font-medium mt-0.5">{intakeSummary.fiscal_plan_status.replace(/_/g, ' ')}</p></div>
                <div><p className="text-slate-400">Batch caricati</p><p className="text-slate-700 font-bold text-sm mt-0.5">{intakeSummary.batch_count}</p></div>
                <div><p className="text-slate-400">Righe totali</p><p className="text-slate-700 font-bold text-sm mt-0.5">{intakeSummary.total_rows}</p></div>
                <div><p className="text-slate-400">Pronte ingestion</p><p className="text-green-700 font-bold text-sm mt-0.5">{intakeSummary.ready_for_ingestion_rows}</p></div>
                <div><p className="text-slate-400">Candidate eligible</p><p className="text-indigo-700 font-bold text-sm mt-0.5">{intakeSummary.eligible_candidate_rows}</p></div>
                <div><p className="text-slate-400">Review required</p><p className={`font-bold text-sm mt-0.5 ${intakeSummary.review_required_rows > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{intakeSummary.review_required_rows}</p></div>
                <div><p className="text-slate-400">Quality score</p><p className="text-slate-700 font-bold text-sm mt-0.5">{(intakeSummary.data_quality_score * 100).toFixed(0)}%</p></div>
              </div>
              <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
                <span className="font-semibold text-slate-500">Prossima azione:</span>{' '}{intakeSummary.next_action}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── SECTION E: KORA Index Output Readiness ───────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">E — KORA Index Output Readiness</p>
        {koraIndex ? (
          <div className="rounded-lg border border-indigo-200 bg-white p-4 space-y-4">
            {/* Hero row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wide">KORA Index v3</p>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-3xl font-bold text-indigo-900">{koraIndex.kora_index_value.toFixed(1)}</p>
                  <div className="mb-0.5 space-y-1">
                    <p className="text-[10px] font-semibold text-indigo-600">
                      Confidence Score: {(koraIndex.confidence_score * 100).toFixed(0)}%
                    </p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_BADGE[koraIndex.safeguard_status] ?? 'border-slate-200 text-slate-500'}`}>
                      Activation Safeguard: {koraIndex.safeguard_status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-right space-y-1">
                <p className="font-mono text-slate-400">{koraIndex.methodology_version_id}</p>
                <p className="font-mono text-amber-600 font-semibold">{koraIndex.calibration_status}</p>
                <p className="font-mono text-slate-400">synthetic_demo_data: true</p>
              </div>
            </div>

            {/* Components summary */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Componenti KORA Index ({koraIndex.components.length}/10)
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {koraIndex.components.map((c) => (
                  <div key={c.code} className="rounded border border-slate-100 bg-slate-50 px-2 py-1.5 text-center">
                    <p className="text-[9px] font-mono text-slate-400">{c.code}</p>
                    <p className="text-sm font-bold text-slate-700 mt-0.5">
                      {c.code === 'CS' ? (c.value * 100).toFixed(0) + '%' : (c.value * 100).toFixed(0) + '%'}
                    </p>
                    <p className="text-[9px] text-slate-400">w:{(c.weight * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            {koraIndex.limitations_text && (
              <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] text-amber-700">
                {koraIndex.limitations_text}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="rounded border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold mb-1">KORA Index non disponibile per questa azienda</p>
              <p>{intel?.next_action ?? 'Completa data intake e worker roster per avviare il scoring.'}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION F: BTI Summary ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">F — Budget-to-Human-Impact Summary</p>
        {btiRecord ? (
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
              <div>
                <p className="text-slate-400">Budget welfare totale</p>
                <p className="text-slate-800 font-bold text-sm mt-0.5">{eur(btiRecord.total_people_welfare_budget)}</p>
              </div>
              <div>
                <p className="text-slate-400">Economic Relief</p>
                <p className="text-indigo-700 font-bold text-sm mt-0.5">{pct(btiRecord.economic_relief_share)}</p>
              </div>
              <div>
                <p className="text-slate-400">Deep Activation</p>
                <p className="text-indigo-700 font-bold text-sm mt-0.5">{pct(btiRecord.deep_activation_share)}</p>
              </div>
              <div>
                <p className="text-slate-400">BTI Score</p>
                <p className="text-indigo-800 font-bold text-sm mt-0.5">{btiRecord.bti_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-slate-400">Costo per Impact Unit</p>
                <p className="text-slate-700 font-bold text-sm mt-0.5">{eur(btiRecord.cost_per_impact_unit)}</p>
              </div>
              <div>
                <p className="text-slate-400">Costo per lavoratore attivo</p>
                <p className="text-slate-700 font-bold text-sm mt-0.5">{eur(btiRecord.cost_per_activated_worker)}</p>
              </div>
              <div>
                <p className="text-slate-400">Activation Debt</p>
                <p className={`font-bold text-sm mt-0.5 ${btiRecord.activation_debt_eur > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
                  {eur(btiRecord.activation_debt_eur)}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Opportunità riallocazione</p>
                <p className="text-emerald-700 font-bold text-sm mt-0.5">{eur(btiRecord.reallocation_opportunity_eur)}</p>
              </div>
            </div>
            <p className="text-[9px] text-slate-400 italic">
              {btiRecord.disclaimer}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="rounded border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              <p className="font-semibold mb-1">BTI non disponibile per questa azienda</p>
              <p>Budget-to-Human-Impact richiede dati di programma e KORA Index completati.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION G: Decision Pack Factory ────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">G — Decision Pack Factory</p>
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">

          {/* Status row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            <div>
              <p className="text-slate-400">Stato factory</p>
              <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                dpFactoryStatus.latest_status === 'ready'                  ? 'bg-emerald-100 text-emerald-700' :
                dpFactoryStatus.latest_status === 'advisor_review_required' ? 'bg-amber-100 text-amber-700' :
                dpFactoryStatus.latest_status === 'data_review_required'    ? 'bg-orange-100 text-orange-700' :
                dpFactoryStatus.latest_status === 'blocked'                 ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-500'
              }`}>
                {dpFactoryStatus.latest_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-slate-400">Può generare</p>
              <p className={`font-semibold mt-0.5 ${dpFactoryStatus.can_generate ? 'text-emerald-700' : 'text-rose-600'}`}>
                {dpFactoryStatus.can_generate ? 'Sì' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Export PDF</p>
              <p className="text-slate-400 font-semibold mt-0.5">
                {dpFactoryStatus.can_export_pdf ? 'Abilitato' : 'Non disponibile'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Share link</p>
              <p className="text-slate-400 font-semibold mt-0.5">
                {dpFactoryStatus.can_share ? 'Abilitato' : 'Non disponibile'}
              </p>
            </div>
          </div>

          {/* Latest version */}
          {dpLatestVersion ? (
            <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] space-y-1">
              <p className="font-semibold text-slate-600">Ultima versione: <span className="font-mono text-slate-500">{dpLatestVersion.version_id}</span></p>
              {dpLatestVersion.title && <p className="text-slate-500">{dpLatestVersion.title}</p>}
              <div className="flex flex-wrap gap-3 mt-1">
                {dpLatestVersion.kora_index_value !== null && dpLatestVersion.kora_index_value !== undefined && (
                  <span>KORA Index: <strong className="text-indigo-700">{dpLatestVersion.kora_index_value.toFixed(1)}</strong></span>
                )}
                {dpLatestVersion.confidence_score !== null && dpLatestVersion.confidence_score !== undefined && (
                  <span>CS: <strong className="text-indigo-600">{(dpLatestVersion.confidence_score * 100).toFixed(0)}%</strong></span>
                )}
                {dpLatestVersion.activation_safeguard_status && (
                  <span>Safeguard: <strong className={
                    dpLatestVersion.activation_safeguard_status === 'CLEAR'   ? 'text-emerald-700' :
                    dpLatestVersion.activation_safeguard_status === 'WARNING' ? 'text-amber-700' :
                    'text-rose-600'
                  }>{dpLatestVersion.activation_safeguard_status}</strong></span>
                )}
                <span className="text-slate-400">
                  {dpLatestVersion.reporting_period_label ?? dpLatestVersion.period}
                </span>
              </div>
              {dpLatestVersion.change_summary && (
                <p className="text-slate-500 italic mt-1">{dpLatestVersion.change_summary}</p>
              )}
            </div>
          ) : (
            <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-400">
              Nessuna versione Decision Pack generata per questa azienda.
            </div>
          )}

          {/* Semester comparison summary */}
          {dpComparison && (
            <div className={`rounded border px-3 py-2 text-[10px] space-y-1 ${
              dpComparison.comparable_with_previous
                ? 'border-emerald-100 bg-emerald-50'
                : 'border-slate-100 bg-slate-50'
            }`}>
              <p className="font-semibold text-slate-600">
                Confronto semestrale:{' '}
                <span className={dpComparison.comparable_with_previous ? 'text-emerald-700' : 'text-slate-400'}>
                  {dpComparison.comparable_with_previous ? 'Disponibile' : 'Non disponibile'}
                </span>
              </p>
              {dpComparison.comparable_with_previous && (
                <>
                  <div className="flex flex-wrap gap-3">
                    <span>Periodo: <strong className="text-slate-700">{dpComparison.reporting_period_label}</strong></span>
                    {dpComparison.previous_period_label && (
                      <span>vs <strong className="text-slate-500">{dpComparison.previous_period_label}</strong></span>
                    )}
                    <span>Metodologia: <strong className={dpComparison.methodology_comparable ? 'text-emerald-700' : 'text-amber-700'}>
                      {dpComparison.methodology_comparable ? 'Comparabile' : 'Cambiata'}
                    </strong></span>
                  </div>
                  {dpComparison.metric_deltas.length > 0 && (() => {
                    const ki = dpComparison.metric_deltas.find((d) => d.metric_id === 'kora_index');
                    const cs = dpComparison.metric_deltas.find((d) => d.metric_id === 'confidence_score');
                    const sg = dpComparison.metric_deltas.find((d) => d.metric_id === 'activation_safeguard');
                    return (
                      <div className="flex flex-wrap gap-3 mt-1">
                        {ki?.delta_abs !== undefined && (
                          <span>KORA Index delta: <strong className={ki.delta_abs >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {ki.delta_abs >= 0 ? '+' : ''}{ki.delta_abs.toFixed(1)} pt
                          </strong></span>
                        )}
                        {cs?.delta_abs !== undefined && (
                          <span>CS delta: <strong className={cs.delta_abs >= 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {cs.delta_abs >= 0 ? '+' : ''}{cs.delta_abs}pt
                          </strong></span>
                        )}
                        {sg && <span>Safeguard trend: <strong className="text-slate-600">{sg.trend}</strong></span>}
                      </div>
                    );
                  })()}
                </>
              )}
              {!dpComparison.comparable_with_previous && (
                <p className="text-slate-400">{dpComparison.comparability_notes}</p>
              )}
            </div>
          )}

          {/* Blocking reasons */}
          {dpFactoryStatus.blocking_reasons.length > 0 && (
            <div className="rounded border border-rose-100 bg-rose-50 px-3 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-rose-700">Blocking reasons:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {dpFactoryStatus.blocking_reasons.map((r, i) => (
                  <li key={i} className="text-[10px] text-rose-600">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {dpFactoryStatus.warnings.length > 0 && (
            <div className="rounded border border-amber-100 bg-amber-50 px-3 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-amber-700">Avvisi:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {dpFactoryStatus.warnings.map((w, i) => (
                  <li key={i} className="text-[10px] text-amber-600">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Next action */}
          <div className="rounded border border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
            <span className="font-semibold text-slate-500">Prossima azione:</span>{' '}{dpFactoryStatus.next_action}
          </div>

          <p className="text-[9px] font-mono text-slate-300">
            production_ready: false · synthetic_demo_data: true
          </p>
        </div>
      </section>

      {/* ── SECTION H: Access & Users ────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          H — Access & Users — {companyAccounts.length} utenti
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

      {/* ── SECTION I: Worker Provisioning ──────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          I — Worker Provisioning
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

        {/* Roster table — admin-only view, no individual PIB */}
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

      {/* ── SECTION J: Lifecycle & Audit ─────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          J — Lifecycle / Audit — {auditEvents.length} eventi
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

      {/* ── Navigation ── — no /company/reports (scoping boundary: resolves through demo persona, not admin-selected company) */}
      <div className="border-t border-slate-100 pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
          ← Company Mission Control
        </Link>
        <Link href={`/admin/companies/${companyId}/data-intake`} className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2">
          Data Intake →
        </Link>
        <Link href={`/admin/companies/${companyId}/onboarding`} className="text-xs text-indigo-500 hover:text-indigo-700 underline underline-offset-2">
          Onboarding Operativo →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-slate-300">
        KORA Admin · synthetic_demo_data: true · company_id: {companyId} · Company Control Room v3
      </p>
    </div>
  );
}
