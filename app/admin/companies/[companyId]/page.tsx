'use client';
// A-01f: Company Detail — vista completa di una singola company.
// Scopo: dare a KORA Admin visibilità completa su pipeline, scoring, evidenze,
//        decisioni e stato operativo di un'azienda specifica.

import { useEffect, useState } from 'react';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { companyIntelligenceService } from '@/services/company-intelligence/CompanyIntelligenceService';
import type { CompanyRiskLevel } from '@/services/company-intelligence/CompanyIntelligenceService';

// B-TRUTH Root Control Room Wave 2 (2026-08-30): removed KORA Index (Section E),
// BTI (Section F), Decision Pack Factory (Section G), Access & Users (Section H),
// and the Worker roster/mutation table (part of Section I) — each was either a
// synthetic duplicate of what the Gen 3 workspace tab already shows canonically
// (KORA Index, Decision Pack status; BTI and Lifecycle/Audit newly added there
// too, reading real analytics.bti_result / audit.audit_log), or fake demo
// mutation controls with no real backend (user/worker actions), or already
// covered read-only by the retained users tab. See lib/architecture/registry.ts
// svc.tenant notes. scoringSimulatorService, budgetToHumanImpactService,
// reportFactoryService, accountProvisioningService, lifecycleService are no
// longer imported here as a result.

const RISK_BADGE: Record<CompanyRiskLevel, { label: string; classes: string }> = {
  ready:           { label: 'Ready',           classes: 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.20)] text-[#06032B]' },
  monitor:         { label: 'Monitor',         classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  action_required: { label: 'Action Required', classes: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]' },
  blocked:         { label: 'Bloccato',        classes: 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]' },
};

// A-19: KORA Admin — Company Control Room (per-company) v2
export default function AdminCompanyControlRoom({ params }: { params: { companyId: string } }) {
  const { companyId } = params;

  // B175: computed client-side only, after mount — avoids SSR/client hydration
  // mismatch (server ICU build vs browser Intl, and render-time wall clock skew).
  const [todayLabel, setTodayLabel] = useState<string | null>(null);
  useEffect(() => {
    setTodayLabel(new Date().toLocaleDateString('it-IT'));
  }, []);

  const tenant = tenantService.getTenant(companyId);
  const intakeSummary = companyDataIntakeService.getDataReadinessSummary(companyId);
  const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);
  const intel = companyIntelligenceService.getCompanyIntelligenceRecord(companyId);

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
          tenant_id: {tenant.tenant_id} · company_id: {companyId} · {todayLabel ?? '—'}
        </p>
      </div>

      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-4 py-3 text-xs text-[rgba(6,3,43,0.88)] leading-relaxed">
        <span className="font-semibold">Vista operativa KORA Admin.</span>{' '}
        Il cliente azienda non vede questa console tecnica. Il PIB individuale resta privato al lavoratore.
      </div>

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
          {/* Tile 6: KORA Index — removed (Wave 2: duplicate of the Gen 3 workspace tab). See workspace tab for live value. */}
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
            href="/admin/data-intake"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition-colors"
          >
            Apri Data Intake (live) →
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

      {/* ── SECTIONS E/F/G removed (B-TRUTH Root Control Room Wave 2, 2026-08-30) ──
           KORA Index Output, BTI Summary, and Decision Pack Factory status were
           synthetic duplicates of what the Gen 3 workspace tab now shows
           canonically (KORA Index + Decision Pack status from real
           analytics.kora_index_result/decision_pack_version; BTI from real
           analytics.bti_result, persisted-only, no recomputation; Decision Pack
           period comparison had no canonical source — analytics.decision_pack_version
           has no previous-version linkage — and was retired, not migrated. ── */}

      {/* ── SECTION H: Access & Users — removed (B-TRUTH Root Control Room Wave 2) ──
           This duplicated the retained, read-only /users tab (same accounts list,
           no mutations there either) plus fake invite/revoke/disable/delete
           controls with no real backend anywhere — not a capability worth
           preserving as interactive UI. See the Users tab for the account list. ── */}
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">H — Access &amp; Users</p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
          <Link
            href={`/admin/companies/${companyId}/users`}
            className="text-xs font-semibold text-[#C76F3D] hover:underline"
          >
            Vedi utenti aziendali →
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
              href="/admin/workers"
              className="inline-flex items-center gap-1.5 rounded border border-[rgba(6,3,43,0.14)] bg-white px-3 py-1.5 text-[10px] font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
            >
              Worker Provisioning (live) →
            </Link>
          </div>
        </div>

        {/* Roster table with invite/disable/delete-demo-worker mutations removed
           (B-TRUTH Root Control Room Wave 2) — fake mutation controls, no real
           backend; real worker provisioning is /admin/workers (B104, live). */}
      </section>

      {/* ── SECTION J: Lifecycle & Audit — removed (B-TRUTH Root Control Room Wave 2) ──
           This page has no real tenant identity to safely scope audit.audit_log
           by (Root Identity Problem). Lifecycle/Audit now lives on the Gen 3
           workspace tab instead, reading the same real audit.audit_log, scoped
           by the real tenantId resolved there. See the Workspace tab. ── */}

      {/* ── Navigation ── — no /company/reports (scoping boundary: resolves through demo persona, not admin-selected company) */}
      <div className="border-t border-[rgba(6,3,43,0.05)] pt-4 flex items-center gap-4 flex-wrap">
        <Link href="/admin/companies" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Mission Control
        </Link>
        <Link href="/admin/data-intake" className="text-xs text-violet-600 hover:text-violet-800 underline underline-offset-2">
          Data Intake (live) →
        </Link>
        <Link href={`/admin/companies/${companyId}/workspace`} className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          Pipeline Status (live) →
        </Link>
        <Link href="/admin/workers" className="text-xs text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          Worker Provisioning (live) →
        </Link>
      </div>

      <p className="text-[10px] font-mono text-[rgba(6,3,43,0.28)]">
        KORA Admin · synthetic_demo_data: true · company_id: {companyId} · Company Control Room v3
      </p>
    </div>
  );
}
