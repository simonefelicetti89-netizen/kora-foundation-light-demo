'use client';
// A-01f: Company Detail — vista completa di una singola company.
// Scopo: dare a KORA Admin visibilità completa su pipeline, scoring, evidenze,
//        decisioni e stato operativo di un'azienda specifica.

import { useState } from 'react';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
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
  CLEAR:   'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.20)] text-[#06032B]',
  WARNING: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]',
  FLAGGED: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]',
};

const RISK_BADGE: Record<CompanyRiskLevel, { label: string; classes: string }> = {
  ready:           { label: 'Ready',           classes: 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.20)] text-[#06032B]' },
  monitor:         { label: 'Monitor',         classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  action_required: { label: 'Action Required', classes: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]' },
  blocked:         { label: 'Bloccato',        classes: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]' },
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
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">KORA Admin</p>
        <h1 className="text-xl font-bold text-[#06032B]">Azienda non trovata</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">company_id: <span className="font-mono">{companyId}</span> non presente nel portfolio tenant.</p>
        <Link href="/admin/companies" className="text-xs font-semibold text-[#C76F3D] hover:underline">← Company Mission Control</Link>
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
      <DemoFlowBanner
        title="Synthetic Demo — Company Detail"
        description="Questa vista usa servizi demo sintetici. Non riflette dati live di nessun tenant reale."
        canonicalHref="/admin/companies"
        canonicalLabel="Company Console (live)"
      />

        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Company Control Room
        </p>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <h1 className="text-xl font-bold text-[#06032B]">{tenant.company_name}</h1>
          <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusBadge.classes}`}>
            {statusBadge.label}
          </span>
          {intel && (
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${RISK_BADGE[intel.risk_level].classes}`}>
              {RISK_BADGE[intel.risk_level].label}
            </span>
          )}
        </div>
        <p className="text-[10px] font-mono text-[rgba(6,3,43,0.40)] mt-0.5">
          tenant_id: {tenant.tenant_id} · company_id: {companyId} · {new Date().toLocaleDateString('it-IT')}
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed">
        <span className="font-semibold">Vista operativa KORA Admin.</span>{' '}
        Il cliente azienda non vede questa console tecnica. Il PIB individuale resta privato al lavoratore.
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded border px-3 py-2 text-xs ${
          feedback.type === 'success' ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)] text-[#06032B]' : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* ── SECTION B: Tenant Overview ───────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">B — Tenant Overview</p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
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
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className="text-[rgba(6,3,43,0.78)] font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION C: Operational Readiness (8 tiles) ───────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">C — Operational Readiness</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Tile 1: Tenant Status */}
          <div className={`rounded-lg border p-3 text-center ${tenant.tenant_status === 'active' ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)]' : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Tenant Status</p>
            <p className={`text-sm font-bold mt-1 ${tenant.tenant_status === 'active' ? 'text-[#06032B]' : 'text-[#8A5A00]'}`}>
              {tenant.tenant_status}
            </p>
          </div>
          {/* Tile 2: Onboarding */}
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Onboarding</p>
            <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.78)] mt-1">{tenant.onboarding_status.replace(/_/g, ' ')}</p>
          </div>
          {/* Tile 3: Data Intake */}
          <div className={`rounded-lg border p-3 text-center ${
            intakeSummary.intake_status === 'ready_for_ingestion' ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)]' :
            intakeSummary.intake_status === 'not_started' ? 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]' :
            intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]' :
            intakeSummary.intake_status === 'validation_required' ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]' :
            'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'
          }`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Data Intake</p>
            <p className={`text-[10px] font-semibold mt-1 ${
              intakeSummary.intake_status === 'ready_for_ingestion' ? 'text-[#06032B]' :
              intakeSummary.intake_status === 'not_started' ? 'text-[rgba(158,59,47,0.90)]' :
              intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'text-[#9E3B2F]' :
              'text-[#8A5A00]'
            }`}>
              {intakeSummary.intake_status.replace(/_/g, ' ')}
            </p>
          </div>
          {/* Tile 4: Worker Roster */}
          <div className={`rounded-lg border p-3 text-center ${workerSummary.total_workers >= 30 ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)]' : workerSummary.total_workers > 0 ? 'border-blue-200 bg-blue-50' : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Roster Lavoratori</p>
            <p className={`text-xl font-bold mt-1 ${workerSummary.total_workers >= 30 ? 'text-[#06032B]' : workerSummary.total_workers > 0 ? 'text-blue-700' : 'text-[rgba(158,59,47,0.90)]'}`}>
              {workerSummary.total_workers}
            </p>
          </div>
          {/* Tile 5: My KORA Enabled */}
          <div className={`rounded-lg border p-3 text-center ${workerSummary.my_kora_enabled_count > 0 ? 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">My KORA Abilitati</p>
            <p className={`text-xl font-bold mt-1 ${workerSummary.my_kora_enabled_count > 0 ? 'text-[rgba(6,3,43,0.72)]' : 'text-[rgba(6,3,43,0.40)]'}`}>
              {workerSummary.my_kora_enabled_count}
            </p>
          </div>
          {/* Tile 6: KORA Index Available */}
          <div className={`rounded-lg border p-3 text-center ${koraIndex ? 'border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">KORA Index</p>
            {koraIndex ? (
              <p className="text-xl font-bold mt-1 text-[rgba(6,3,43,0.72)]">{koraIndex.kora_index_value.toFixed(1)}</p>
            ) : (
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] mt-1">Non disponibile</p>
            )}
          </div>
          {/* Tile 7: Decision Pack */}
          <div className={`rounded-lg border p-3 text-center ${tenant.decision_pack_status === 'ready' ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Decision Pack</p>
            <p className={`text-[10px] font-semibold mt-1 ${tenant.decision_pack_status === 'ready' ? 'text-[#06032B]' : 'text-[rgba(6,3,43,0.52)]'}`}>
              {tenant.decision_pack_status.replace(/_/g, ' ')}
            </p>
          </div>
          {/* Tile 8: Advisor Assigned */}
          <div className={`rounded-lg border p-3 text-center ${tenant.assigned_advisor ? 'border-violet-200 bg-violet-50' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'}`}>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.52)]">Advisor Assegnato</p>
            <p className={`text-[10px] font-semibold mt-1 ${tenant.assigned_advisor ? 'text-violet-700' : 'text-[rgba(6,3,43,0.40)]'}`}>
              {tenant.assigned_advisor ?? '—'}
            </p>
          </div>
        </div>
      </section>

      {/* ── SECTION D: Data Intake ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">D — Data Intake — Pre-Ingestion</p>
          <Link
            href={`/admin/companies/${companyId}/data-intake`}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Apri Data Intake →
          </Link>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
          {intakeSummary.total_rows === 0 && intakeSummary.intake_status === 'not_started' ? (
            <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-4 py-3 text-xs text-[#8A5A00]">
              <p className="font-semibold mb-1">Data intake non avviato</p>
              <p>Nessun piano fiscale né batch dati caricato. Accedi a Data Intake per definire il perimetro fiscale e caricare i programmi.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
                <div>
                  <p className="text-[rgba(6,3,43,0.40)]">Stato intake</p>
                  <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                    intakeSummary.intake_status === 'ready_for_ingestion'             ? 'bg-[rgba(47,125,85,0.20)] text-[#06032B]' :
                    intakeSummary.intake_status === 'validation_required'             ? 'bg-[rgba(217,154,43,0.12)] text-[#8A5A00]' :
                    intakeSummary.intake_status === 'blocked_missing_required_fields' ? 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F]' :
                    intakeSummary.intake_status === 'partial'                         ? 'bg-blue-100 text-blue-700' :
                    'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)]'
                  }`}>
                    {intakeSummary.intake_status.replace(/_/g, ' ')}
                  </span>
                </div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Piano fiscale</p><p className="text-[rgba(6,3,43,0.78)] font-medium mt-0.5">{intakeSummary.fiscal_plan_status.replace(/_/g, ' ')}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Batch caricati</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{intakeSummary.batch_count}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Righe totali</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{intakeSummary.total_rows}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Pronte ingestion</p><p className="text-[#C76F3D] font-bold text-sm mt-0.5">{intakeSummary.ready_for_ingestion_rows}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Candidate eligible</p><p className="text-[rgba(6,3,43,0.72)] font-bold text-sm mt-0.5">{intakeSummary.eligible_candidate_rows}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Review required</p><p className={`font-bold text-sm mt-0.5 ${intakeSummary.review_required_rows > 0 ? 'text-[#8A5A00]' : 'text-[rgba(6,3,43,0.52)]'}`}>{intakeSummary.review_required_rows}</p></div>
                <div><p className="text-[rgba(6,3,43,0.40)]">Quality score</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{(intakeSummary.data_quality_score * 100).toFixed(0)}%</p></div>
              </div>
              <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.62)]">
                <span className="font-semibold text-[rgba(6,3,43,0.52)]">Prossima azione:</span>{' '}{intakeSummary.next_action}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── SECTION E: KORA Index Output Readiness ───────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">E — KORA Index Output Readiness</p>
        {koraIndex ? (
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[#F8F6F1] p-4 space-y-4">
            {/* Hero row */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[10px] text-[rgba(6,3,43,0.52)] font-semibold uppercase tracking-wide">KORA Index v1.0</p>
                <div className="flex items-end gap-3 mt-1">
                  <p className="text-3xl font-bold text-[#06032B]">{koraIndex.kora_index_value.toFixed(1)}</p>
                  <div className="mb-0.5 space-y-1">
                    <p className="text-[10px] font-semibold text-[#C76F3D]">
                      Confidence Score: {(koraIndex.confidence_score * 100).toFixed(0)}%
                    </p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${SAFEGUARD_BADGE[koraIndex.safeguard_status] ?? 'border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.52)]'}`}>
                      Activation Safeguard: {koraIndex.safeguard_status}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-right space-y-1">
                <p className="font-mono text-[rgba(6,3,43,0.40)]">{koraIndex.methodology_version_id}</p>
                <p className="font-mono text-[#D99A2B] font-semibold">{koraIndex.calibration_status}</p>
                <p className="font-mono text-[rgba(6,3,43,0.40)]">synthetic_demo_data: true</p>
              </div>
            </div>

            {/* Components summary */}
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-2">
                Componenti KORA Index ({koraIndex.components.length}/10)
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
                {koraIndex.components.map((c) => (
                  <div key={c.code} className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-2 py-1.5 text-center">
                    <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)]">{c.code}</p>
                    <p className="text-sm font-bold text-[rgba(6,3,43,0.78)] mt-0.5">
                      {c.code === 'CS' ? (c.value * 100).toFixed(0) + '%' : (c.value * 100).toFixed(0) + '%'}
                    </p>
                    <p className="text-[9px] text-[rgba(6,3,43,0.40)]">w:{(c.weight * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Limitations */}
            {koraIndex.limitations_text && (
              <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2 text-[10px] text-[#8A5A00]">
                {koraIndex.limitations_text}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
            <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.52)]">
              <p className="font-semibold mb-1">KORA Index non disponibile per questa azienda</p>
              <p>{intel?.next_action ?? 'Completa data intake e worker roster per avviare il scoring.'}</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION F: BTI Summary ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">F — Budget-to-Human-Impact Summary</p>
        {btiRecord ? (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Budget welfare totale</p>
                <p className="text-[rgba(6,3,43,0.90)] font-bold text-sm mt-0.5">{eur(btiRecord.total_people_welfare_budget)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Economic Relief</p>
                <p className="text-[rgba(6,3,43,0.72)] font-bold text-sm mt-0.5">{pct(btiRecord.economic_relief_share)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Deep Activation</p>
                <p className="text-[rgba(6,3,43,0.72)] font-bold text-sm mt-0.5">{pct(btiRecord.deep_activation_share)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">BTI Score</p>
                <p className="text-[rgba(6,3,43,0.88)] font-bold text-sm mt-0.5">{btiRecord.bti_score.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Costo per Impact Unit</p>
                <p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{eur(btiRecord.cost_per_impact_unit)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Costo per lavoratore attivo</p>
                <p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{eur(btiRecord.cost_per_activated_worker)}</p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Activation Debt</p>
                <p className={`font-bold text-sm mt-0.5 ${btiRecord.activation_debt_eur > 0 ? 'text-[#8A5A00]' : 'text-[rgba(6,3,43,0.40)]'}`}>
                  {eur(btiRecord.activation_debt_eur)}
                </p>
              </div>
              <div>
                <p className="text-[rgba(6,3,43,0.40)]">Opportunità riallocazione</p>
                <p className="text-[#C76F3D] font-bold text-sm mt-0.5">{eur(btiRecord.reallocation_opportunity_eur)}</p>
              </div>
            </div>
            <p className="text-[9px] text-[rgba(6,3,43,0.40)] italic">
              {btiRecord.disclaimer}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
            <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.52)]">
              <p className="font-semibold mb-1">BTI non disponibile per questa azienda</p>
              <p>Budget-to-Human-Impact richiede dati di programma e KORA Index completati.</p>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION G: Decision Pack Factory ────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">G — Decision Pack Factory</p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">

          {/* Status row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            <div>
              <p className="text-[rgba(6,3,43,0.40)]">Stato factory</p>
              <span className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                dpFactoryStatus.latest_status === 'ready'                  ? 'bg-[rgba(47,125,85,0.20)] text-[#06032B]' :
                dpFactoryStatus.latest_status === 'advisor_review_required' ? 'bg-[rgba(217,154,43,0.12)] text-[#8A5A00]' :
                dpFactoryStatus.latest_status === 'data_review_required'    ? 'bg-[rgba(217,154,43,0.10)] text-[#8A5A00]' :
                dpFactoryStatus.latest_status === 'blocked'                 ? 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F]' :
                'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)]'
              }`}>
                {dpFactoryStatus.latest_status.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <p className="text-[rgba(6,3,43,0.40)]">Può generare</p>
              <p className={`font-semibold mt-0.5 ${dpFactoryStatus.can_generate ? 'text-[#C76F3D]' : 'text-[rgba(158,59,47,0.90)]'}`}>
                {dpFactoryStatus.can_generate ? 'Sì' : 'No'}
              </p>
            </div>
            <div>
              <p className="text-[rgba(6,3,43,0.40)]">Export PDF</p>
              <p className="text-[rgba(6,3,43,0.40)] font-semibold mt-0.5">
                {dpFactoryStatus.can_export_pdf ? 'Abilitato' : 'Non disponibile'}
              </p>
            </div>
            <div>
              <p className="text-[rgba(6,3,43,0.40)]">Share link</p>
              <p className="text-[rgba(6,3,43,0.40)] font-semibold mt-0.5">
                {dpFactoryStatus.can_share ? 'Abilitato' : 'Non disponibile'}
              </p>
            </div>
          </div>

          {/* Latest version */}
          {dpLatestVersion ? (
            <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] space-y-1">
              <p className="font-semibold text-[rgba(6,3,43,0.62)]">Ultima versione: <span className="font-mono text-[rgba(6,3,43,0.52)]">{dpLatestVersion.version_id}</span></p>
              {dpLatestVersion.title && <p className="text-[rgba(6,3,43,0.52)]">{dpLatestVersion.title}</p>}
              <div className="flex flex-wrap gap-3 mt-1">
                {dpLatestVersion.kora_index_value !== null && dpLatestVersion.kora_index_value !== undefined && (
                  <span>KORA Index: <strong className="text-[rgba(6,3,43,0.72)]">{dpLatestVersion.kora_index_value.toFixed(1)}</strong></span>
                )}
                {dpLatestVersion.confidence_score !== null && dpLatestVersion.confidence_score !== undefined && (
                  <span>CS: <strong className="text-[#C76F3D]">{(dpLatestVersion.confidence_score * 100).toFixed(0)}%</strong></span>
                )}
                {dpLatestVersion.activation_safeguard_status && (
                  <span>Safeguard: <strong className={
                    dpLatestVersion.activation_safeguard_status === 'CLEAR'   ? 'text-[#06032B]' :
                    dpLatestVersion.activation_safeguard_status === 'WARNING' ? 'text-[#8A5A00]' :
                    'text-[rgba(158,59,47,0.90)]'
                  }>{dpLatestVersion.activation_safeguard_status}</strong></span>
                )}
                <span className="text-[rgba(6,3,43,0.40)]">
                  {dpLatestVersion.reporting_period_label ?? dpLatestVersion.period}
                </span>
              </div>
              {dpLatestVersion.change_summary && (
                <p className="text-[rgba(6,3,43,0.52)] italic mt-1">{dpLatestVersion.change_summary}</p>
              )}
            </div>
          ) : (
            <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.40)]">
              Nessuna versione Decision Pack generata per questa azienda.
            </div>
          )}

          {/* Semester comparison summary */}
          {dpComparison && (
            <div className={`rounded border px-3 py-2 text-[10px] space-y-1 ${
              dpComparison.comparable_with_previous
                ? 'border-[rgba(47,125,85,0.30)] bg-[rgba(47,125,85,0.10)]'
                : 'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]'
            }`}>
              <p className="font-semibold text-[rgba(6,3,43,0.62)]">
                Confronto semestrale:{' '}
                <span className={dpComparison.comparable_with_previous ? 'text-[#06032B]' : 'text-[rgba(6,3,43,0.40)]'}>
                  {dpComparison.comparable_with_previous ? 'Disponibile' : 'Non disponibile'}
                </span>
              </p>
              {dpComparison.comparable_with_previous && (
                <>
                  <div className="flex flex-wrap gap-3">
                    <span>Periodo: <strong className="text-[rgba(6,3,43,0.78)]">{dpComparison.reporting_period_label}</strong></span>
                    {dpComparison.previous_period_label && (
                      <span>vs <strong className="text-[rgba(6,3,43,0.52)]">{dpComparison.previous_period_label}</strong></span>
                    )}
                    <span>Metodologia: <strong className={dpComparison.methodology_comparable ? 'text-[#C76F3D]' : 'text-[#8A5A00]'}>
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
                          <span>KORA Index delta: <strong className={ki.delta_abs >= 0 ? 'text-[#C76F3D]' : 'text-[rgba(158,59,47,0.90)]'}>
                            {ki.delta_abs >= 0 ? '+' : ''}{ki.delta_abs.toFixed(1)} pt
                          </strong></span>
                        )}
                        {cs?.delta_abs !== undefined && (
                          <span>CS delta: <strong className={cs.delta_abs >= 0 ? 'text-[#C76F3D]' : 'text-[rgba(158,59,47,0.90)]'}>
                            {cs.delta_abs >= 0 ? '+' : ''}{cs.delta_abs}pt
                          </strong></span>
                        )}
                        {sg && <span>Safeguard trend: <strong className="text-[rgba(6,3,43,0.62)]">{sg.trend}</strong></span>}
                      </div>
                    );
                  })()}
                </>
              )}
              {!dpComparison.comparable_with_previous && (
                <p className="text-[rgba(6,3,43,0.40)]">{dpComparison.comparability_notes}</p>
              )}
            </div>
          )}

          {/* Blocking reasons */}
          {dpFactoryStatus.blocking_reasons.length > 0 && (
            <div className="rounded border border-[rgba(158,59,47,0.12)] bg-[rgba(158,59,47,0.06)] px-3 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-[#9E3B2F]">Blocking reasons:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {dpFactoryStatus.blocking_reasons.map((r, i) => (
                  <li key={i} className="text-[10px] text-[rgba(158,59,47,0.90)]">{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {dpFactoryStatus.warnings.length > 0 && (
            <div className="rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-3 py-2 space-y-1">
              <p className="text-[10px] font-semibold text-[#8A5A00]">Avvisi:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {dpFactoryStatus.warnings.map((w, i) => (
                  <li key={i} className="text-[10px] text-[#D99A2B]">{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Next action */}
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.62)]">
            <span className="font-semibold text-[rgba(6,3,43,0.52)]">Prossima azione:</span>{' '}{dpFactoryStatus.next_action}
          </div>

          <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)]">
            production_ready: false · synthetic_demo_data: true
          </p>
        </div>
      </section>

      {/* ── SECTION H: Access & Users ────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          H — Access & Users — {companyAccounts.length} utenti
        </p>
        {companyAccounts.length === 0 ? (
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
            Nessun utente aziendale configurato. Avvia Enterprise Onboarding per creare il primo admin.
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {companyAccounts.map((user) => {
                const statusBdg = accountProvisioningService.getAccountStatusBadge(user.account_status);
                const invBdg = accountProvisioningService.getInvitationStatusBadge(user.invitation_status);
                return (
                  <div key={user.user_id} className="px-4 py-3 hover:bg-[rgba(6,3,43,0.03)]">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{user.display_name}</p>
                        <p className="text-[10px] text-[rgba(6,3,43,0.52)] font-mono">{user.email ?? '—'}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-1.5 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.62)]">{user.role}</span>
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
                              className="text-[#D99A2B] hover:underline"
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
                            className="text-[rgba(6,3,43,0.52)] hover:underline"
                          >
                            Disabilita
                          </button>
                        )}
                        {['draft', 'invited'].includes(user.account_status) && (
                          <button
                            type="button"
                            onClick={() => handleUserAction(accountProvisioningService.deleteDemoUser.bind(accountProvisioningService), user.user_id)}
                            className="text-[rgba(158,59,47,0.75)] hover:underline"
                          >
                            Elimina (demo)
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1.5 text-[10px] text-[rgba(6,3,43,0.40)]">
                      Sezioni visibili: {user.visible_sections.slice(0, 5).join(', ')}{user.visible_sections.length > 5 ? '...' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Link href="/admin/companies/new"
            className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
            + Crea admin aziendale
          </Link>
        </div>
      </section>

      {/* ── SECTION I: Worker Provisioning ──────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          I — Worker Provisioning
        </p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            <div><p className="text-[rgba(6,3,43,0.40)]">Totale roster</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.total_workers}</p></div>
            <div><p className="text-[rgba(6,3,43,0.40)]">Invitati</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.invited_workers}</p></div>
            <div><p className="text-[rgba(6,3,43,0.40)]">Account attivi</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.active_worker_accounts}</p></div>
            <div><p className="text-[rgba(6,3,43,0.40)]">My KORA abilitati</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.my_kora_enabled_count}</p></div>
            <div><p className="text-[rgba(6,3,43,0.40)]">PIB privato</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.pib_private_enabled_count}</p></div>
            <div><p className="text-[rgba(6,3,43,0.40)]">Cluster soppressi</p><p className="text-[rgba(6,3,43,0.78)] font-bold text-sm mt-0.5">{workerSummary.suppressed_clusters_count}</p></div>
          </div>
          <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.72)] leading-relaxed">
            {workerSummary.privacy_notes}
          </div>
          <p className="text-[10px] text-[#8A5A00] font-medium">{workerSummary.next_action}</p>
          <div className="pt-1">
            <Link
              href={`/admin/companies/${companyId}/workforce`}
              className="inline-flex items-center gap-1.5 rounded border border-[rgba(6,3,43,0.14)] bg-white px-3 py-1.5 text-[10px] font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
            >
              Gestione Workforce →
            </Link>
          </div>
        </div>

        {/* Roster table — admin-only view, no individual PIB */}
        {workerRoster.length > 0 && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.08)]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
                Roster Lavoratori — aggregato, nessun PIB individuale
              </p>
            </div>
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {workerRoster.slice(0, 10).map((w) => {
                const wBdg = accountProvisioningService.getAccountStatusBadge(w.worker_account_status);
                return (
                  <div key={w.worker_id} className="flex items-center gap-4 px-4 py-2.5 hover:bg-[rgba(6,3,43,0.03)] flex-wrap">
                    <p className="text-[10px] font-mono text-[rgba(6,3,43,0.52)] w-32 shrink-0">{w.worker_id}</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.62)] flex-1">{w.role_family} · {w.department} · {w.site}</p>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${wBdg.classes}`}>{wBdg.label}</span>
                    <span className="text-[10px] text-[rgba(6,3,43,0.40)]">My KORA: {w.my_kora_enabled ? 'ON' : 'off'}</span>
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
                          className="text-[rgba(6,3,43,0.52)] hover:underline"
                        >
                          Disabilita
                        </button>
                      )}
                      {w.worker_account_status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => handleWorkerAction(workerProvisioningService.deleteDemoWorker.bind(workerProvisioningService), w.worker_id)}
                          className="text-[rgba(158,59,47,0.75)] hover:underline"
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
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          J — Lifecycle / Audit — {auditEvents.length} eventi
        </p>
        {auditEvents.length === 0 ? (
          <div className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
            Nessun evento di lifecycle registrato per questo tenant.
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
            <div className="divide-y divide-[rgba(6,3,43,0.05)]">
              {auditEvents.map((evt) => (
                <div key={evt.event_id} className="flex items-start gap-3 px-4 py-2.5 hover:bg-[rgba(6,3,43,0.03)]">
                  <p className="text-[10px] font-mono text-[rgba(6,3,43,0.40)] w-36 shrink-0">{evt.timestamp.slice(0, 16).replace('T', ' ')}</p>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.78)]">{lifecycleService.getActionLabel(evt.action)}</span>
                      <span className="text-[10px] font-mono text-[rgba(6,3,43,0.40)]">{evt.actor_role}</span>
                      {!evt.reversible && (
                        <span className="rounded border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] px-1 py-0.5 text-[9px] text-[rgba(158,59,47,0.90)]">irreversibile</span>
                      )}
                    </div>
                    {evt.reason && <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5">{evt.reason}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── Navigation ── — no /company/reports (scoping boundary: resolves through demo persona, not admin-selected company) */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Mission Control
        </Link>
        <Link href={`/admin/companies/${companyId}/data-intake`} className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2">
          Data Intake →
        </Link>
        <Link href={`/admin/companies/${companyId}/onboarding`} className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          Onboarding Operativo →
        </Link>
        <Link href={`/admin/companies/${companyId}/workforce`} className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          Workforce Management →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
        KORA Admin · synthetic_demo_data: true · company_id: {companyId} · Company Control Room v3
      </p>
    </div>
  );
}
