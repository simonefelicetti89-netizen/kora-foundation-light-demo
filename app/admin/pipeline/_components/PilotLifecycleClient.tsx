'use client';
// app/admin/pipeline/_components/PilotLifecycleClient.tsx
// B95-B Lifecycle Orchestrator — client rendering, receives the canonical
// tenant as a prop (fetched server-side by the parent page.tsx).
// KORA Admin can understand the full pilot lifecycle in <60s.
// 8 steps: Crea azienda → Crea utente → Workforce → Submission → Review → Scoring → Decision Pack → Worker Space
// No DB changes here. No auth changes. No scoring changes. No worker PIB.
//
// B-TRUTH TenantService Canonical Migration (2026-09-04): this file used to
// be app/admin/pipeline/page.tsx in full — split so the tenant identity/
// status could be fetched canonically, server-side, by the new thin
// page.tsx wrapper, while every OTHER step's data source (worker
// provisioning, account provisioning, scoring, data intake) remains
// UNCHANGED, still keyed by DEMO_COMPANY_ID — those are separate, later
// migration slices, not touched here.
//
// B-TRUTH AccountProvisioningService Pipeline Role Migration (2026-09-06):
// the "Crea utente" step's hasCompanyUser flag is now read from a
// canonical accountProvisioning prop (fetched server-side by page.tsx via
// Supabase Auth) instead of calling
// accountProvisioningService.getAccountsForCompany() here.
// AccountProvisioningService.getCurrentDemoUser() — a SEPARATE, My
// KORA/session-identity responsibility, called only from
// app/my-kora/page.tsx — is untouched; that is why
// AccountProvisioningService.ts still exists (narrowed, not retired).

import Link from 'next/link';
import { DemoFlowBanner } from '@/components/admin/DemoFlowBanner';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';
import type { CanonicalDataIntakeStatus } from '@/lib/live/data-intake-status-view';
import type { CanonicalDecisionPackStatus } from '@/lib/live/decision-pack-status-view';
import type { CanonicalAccountProvisioningStatus } from '@/lib/live/account-provisioning-status-view';
import {
  LIFECYCLE_STEPS,
  deriveAllStepStatuses,
  STATUS_META,
  OWNER_META,
  type LifecycleStatusInputs,
  type LifecycleStepStatus,
} from '@/lib/admin-lifecycle/lifecycle-rules';

// Still-synthetic identity for every service NOT migrated by this PR
// (worker provisioning, scoring, data intake) — unchanged from before this
// migration.
const DEMO_COMPANY_ID = 'meridiana-group';

export interface CanonicalPilotTenant {
  id: string;
  tenant_code: string;
  company_name: string;
  onboarding_status: string;
  decision_pack_status: string;
  is_active: boolean;
}

// ── Status badge component ────────────────────────────────────────────────────

function StatusChip({ status }: { status: LifecycleStepStatus }) {
  const m = STATUS_META[status];
  return (
    <span style={{
      display:     'inline-flex',
      alignItems:  'center',
      gap:         5,
      padding:     '2px 8px',
      borderRadius: 20,
      fontSize:    10,
      fontWeight:  700,
      background:  m.bgColor,
      border:      `1px solid ${m.borderColor}`,
      color:       m.textColor,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dotColor, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ── Step card ─────────────────────────────────────────────────────────────────

function StepCard({
  step,
  status,
  isLast,
}: {
  step:   typeof LIFECYCLE_STEPS[number];
  status: LifecycleStepStatus;
  isLast: boolean;
}) {
  const sm = STATUS_META[status];
  const om = OWNER_META[step.ownerRole] ?? OWNER_META.KORA_ADMIN;
  const isDone = status === 'DONE';

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {/* Vertical step rail */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 16, flexShrink: 0, width: 32 }}>
        {/* Step circle */}
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
          background: sm.bgColor,
          border: `2px solid ${sm.borderColor}`,
          color: sm.textColor,
          zIndex: 1,
        }}>
          {isDone ? '✓' : step.stepNumber}
        </div>
        {/* Connector line */}
        {!isLast && (
          <div style={{
            width: 2, flex: 1, minHeight: 20, marginTop: 4,
            background: isDone ? 'rgba(47,125,85,0.25)' : 'rgba(6,3,43,0.08)',
          }} />
        )}
      </div>

      {/* Card content */}
      <div style={{
        flex: 1,
        marginBottom: isLast ? 0 : 16,
        padding: '14px 18px',
        borderRadius: 10,
        border: `1px solid ${sm.borderColor}`,
        background: isDone ? 'rgba(47,125,85,0.04)' : 'rgba(6,3,43,0.02)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(6,3,43,0.88)' }}>{step.title}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${om.chip}`}>
              {om.label}
            </span>
          </div>
          <StatusChip status={status} />
        </div>

        {/* Description */}
        <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.58)', lineHeight: 1.6, marginBottom: 10 }}>
          {step.description}
        </p>

        {/* Next action + route link */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          {status !== 'DONE' && (
            <div style={{
              fontSize: 11, color: 'rgba(6,3,43,0.62)', fontStyle: 'italic',
              display: 'flex', alignItems: 'flex-start', gap: 5,
            }}>
              <span style={{ color: '#C76F3D', fontWeight: 700, fontStyle: 'normal', flexShrink: 0 }}>→</span>
              {step.nextAction}
            </div>
          )}
          {status === 'DONE' && (
            <span style={{ fontSize: 11, color: 'rgba(47,125,85,0.70)', fontWeight: 600 }}>
              ✓ Completato
            </span>
          )}
          <Link
            href={step.route}
            data-testid={`step-link-${step.id}`}
            style={{
              fontSize: 11, fontWeight: 600, color: '#4A7FE0',
              textDecoration: 'none', flexShrink: 0,
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Apri →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Role transition links ─────────────────────────────────────────────────────

function RoleContextLinks() {
  const links = [
    { label: 'KORA Admin — Company Console',   href: '/admin/companies',   badge: 'LIVE · KORA Admin',   badgeColor: 'rgba(6,3,43,0.65)',  badgeBg: 'rgba(6,3,43,0.07)',  badgeBdr: 'rgba(6,3,43,0.14)' },
    { label: 'Company Workspace',              href: '/company',            badge: 'PREVIEW · Company',   badgeColor: '#7A4019',            badgeBg: 'rgba(199,111,61,0.09)', badgeBdr: 'rgba(199,111,61,0.25)' },
    { label: 'My KORA Preview (Worker Space)', href: '/my-kora',            badge: 'PREVIEW · Lavoratore', badgeColor: '#2F7D55',           badgeBg: 'rgba(47,125,85,0.09)', badgeBdr: 'rgba(47,125,85,0.28)' },
  ];

  return (
    <div style={{
      marginTop: 24, padding: '14px 18px', borderRadius: 10,
      background: 'rgba(6,3,43,0.02)', border: '1px solid rgba(6,3,43,0.08)',
    }}>
      <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(6,3,43,0.40)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
        Role Transition Links
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {links.map(({ label, href, badge, badgeColor, badgeBg, badgeBdr }) => (
          <Link key={href} href={href} style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '8px 14px', borderRadius: 8,
              background: 'white', border: '1px solid rgba(6,3,43,0.10)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 12,
                color: badgeColor, background: badgeBg, border: `1px solid ${badgeBdr}`,
                flexShrink: 0,
              }}>
                {badge}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(6,3,43,0.78)' }}>{label}</span>
              <span style={{ fontSize: 11, color: '#4A7FE0' }}>→</span>
            </div>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.38)', marginTop: 8 }}>
        Foundation Light — navigazione demo. In produzione, i link rispettano l&apos;autenticazione per ruolo.
      </p>
    </div>
  );
}

// ── Main client component ───────────────────────────────────────────────────────

export function PilotLifecycleClient({ tenant, dataIntake, decisionPack, accountProvisioning }: { tenant: CanonicalPilotTenant | null; dataIntake: CanonicalDataIntakeStatus; decisionPack: CanonicalDecisionPackStatus; accountProvisioning: CanonicalAccountProvisioningStatus }) {
  const workerSumm   = workerProvisioningService.getWorkerProvisioningSummary(DEMO_COMPANY_ID);
  const koraIndex    = scoringSimulatorService.getKoraIndexOutput(DEMO_COMPANY_ID, 'S1')
                       ?? scoringSimulatorService.getKoraIndexOutput(DEMO_COMPANY_ID, 'S2');
  const capability   = workerSpaceCapabilityService.getCapabilityByCompanyId(DEMO_COMPANY_ID);

  const inputs: LifecycleStatusInputs = {
    tenantExists:       !!tenant,
    hasCompanyUser:     accountProvisioning.hasCompanyUser,
    totalWorkers:       workerSumm.total_workers,
    hasSubmission:      dataIntake.batchCount > 0 || (tenant?.onboarding_status !== 'not_started'),
    submissionPending:  dataIntake.intakeStatus === 'validation_required',
    hasReviewedData:    dataIntake.batchCount > 0 && dataIntake.intakeStatus === 'ready_for_ingestion',
    hasScoring:         !!koraIndex,
    hasDecisionPack:    tenant?.decision_pack_status === 'ready' || decisionPack.status === 'ready',
    workerSpaceEnabled: capability.enabled,
  };

  const statuses = deriveAllStepStatuses(inputs);

  const doneCount = Object.values(statuses).filter((s) => s === 'DONE').length;
  const totalSteps = LIFECYCLE_STEPS.length;

  return (
    <div className="max-w-3xl space-y-6" data-testid="pipeline-orchestrator">

      {/* ── Demo banner ─────────────────────────────────────────────────────── */}
      <DemoFlowBanner
        title="Pilot Lifecycle — Synthetic Demo"
        description="Questo orchestratore mostra il ciclo di vita del pilota KORA usando dati sintetici. In produzione, lo stato è derivato dal tenant reale autenticato."
        canonicalHref="/admin/companies"
        canonicalLabel="Company Console (live)"
      />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
          KORA Admin — Pilot Lifecycle Orchestrator
        </p>
        <div className="flex items-end gap-4 mt-1 flex-wrap">
          <h1 className="text-2xl font-bold text-[#06032B]">Pilot Lifecycle</h1>
          {tenant && (
            <span className="text-[11px] font-semibold text-[rgba(6,3,43,0.52)] mb-0.5">
              {tenant.company_name}
            </span>
          )}
        </div>
        <p className="text-xs text-[rgba(6,3,43,0.45)] mt-1">
          {doneCount}/{totalSteps} step completati · company_id: {DEMO_COMPANY_ID}
        </p>
      </div>

      {/* ── Progress bar ────────────────────────────────────────────────────── */}
      <div>
        <div style={{
          height: 6, borderRadius: 3, overflow: 'hidden',
          background: 'rgba(6,3,43,0.07)',
        }}>
          <div style={{
            height: '100%',
            width: `${(doneCount / totalSteps) * 100}%`,
            background: 'rgba(47,125,85,0.55)',
            borderRadius: 3,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <p className="text-[9px] text-[rgba(6,3,43,0.35)] mt-1 font-mono">
          {doneCount}/{totalSteps} completati · synthetic_demo_data: true
        </p>
      </div>

      {/* ── 8-Step Pipeline ─────────────────────────────────────────────────── */}
      <div data-testid="lifecycle-steps">
        {LIFECYCLE_STEPS.map((step, i) => (
          <StepCard
            key={step.id}
            step={step}
            status={statuses[step.id]}
            isLast={i === LIFECYCLE_STEPS.length - 1}
          />
        ))}
      </div>

      {/* ── Role transition links ────────────────────────────────────────────── */}
      <RoleContextLinks />

      {/* ── Company quick links ──────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-3">
          Accesso diretto — {tenant?.company_name ?? DEMO_COMPANY_ID}
        </p>
        <div className="flex flex-wrap gap-2">
          {/* B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): "Company Control
              Room" quick link removed — that route now redirects to the Gen 3
              workspace tab, which honestly 404s for DEMO_COMPANY_ID (not a real
              tenant_code) instead of rendering fabricated data. A link that
              always 404s is not a legitimate quick action.
              CC-019A (2026-08-31): "Utenti Aziendali" quick link removed for the
              same reason — its target, [companyId]/users, was retired (see
              CompanyTabNav.tsx); company-users-live is keyed by a real tenantId
              UUID, which DEMO_COMPANY_ID does not have. */}
          {[
            { label: 'Worker Provisioning (live)',                href: '/admin/workers' },
            { label: 'Submission Queue',        href: '/admin/company-submissions' },
            { label: 'UEF Review & Scoring',    href: '/admin/uef-review' },
          ].map(({ label, href }) => (
            <Link key={href} href={href}
              className="rounded border border-[rgba(6,3,43,0.10)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[rgba(6,3,43,0.68)] hover:bg-[rgba(6,3,43,0.03)] transition-colors">
              {label} →
            </Link>
          ))}
        </div>
      </div>

      {/* ── Privacy invariant footer ─────────────────────────────────────────── */}
      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)]">
        KORA Admin · Pilot Lifecycle Orchestrator · B95-B · synthetic_demo_data: true ·
        no_auth_changes · no_db_changes · no_scoring_changes · no_worker_pib · no_email_sending
      </p>
    </div>
  );
}
