'use client';
// B130: Demo-only Company Status Center — dati sintetici Meridiana / Ferretti.
// Guarded by app/demo/layout.tsx (requireDemoAccess).
// Nessuna query Supabase. Nessuna sessione live. Solo dati seed sintetici.

import Link from 'next/link';
import { useDemoState }                from '@/lib/demo-state';
import { tenantService }              from '@/services/tenant/TenantService';
import { workerProvisioningService }  from '@/services/worker-provisioning/WorkerProvisioningService';
import { submissionFeedbackService }  from '@/services/submission-feedback/SubmissionFeedbackService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { SubmissionFeedbackPanel }    from '@/components/company/transparency/SubmissionFeedbackPanel';
import { CompanyPipelineStatus }      from '@/components/company/status/CompanyPipelineStatus';
import { TemplateLibrary }            from '@/components/company/submissions/TemplateLibrary';
import {
  derivePipelineStatus,
  deriveChecklist,
  deriveNextAction,
  type SubmissionSnapshot,
  type WorkspaceReadinessSnapshot,
  type ChecklistItem,
} from '@/lib/company-status/company-status-engine';

// ── Demo readiness from seed data ─────────────────────────────────────────────

function deriveReadinessFromTenant(companyId: string): WorkspaceReadinessSnapshot {
  const tenant = tenantService.getTenant(companyId);
  if (!tenant) {
    return {
      hasWorkforceBaseline: false, hasEvidenceBatches: false,
      batchCount: 0, hasScoring: false, hasDecisionPack: false,
      readinessLevel: 'not_started',
    };
  }
  const ob = tenant.onboarding_status;
  const hasDecisionPack    = ob === 'decision_pack_ready';
  const hasScoring         = hasDecisionPack || ob === 'pipeline_active';
  const hasEvidenceBatches = hasScoring || ['program_data_loaded'].includes(ob) ||
                             ['high', 'medium'].includes(tenant.data_readiness_status);
  const hasWorkforceBaseline = hasEvidenceBatches || ob === 'workforce_baseline_complete';
  return {
    hasWorkforceBaseline, hasEvidenceBatches,
    batchCount: hasEvidenceBatches ? 3 : 0,
    hasScoring, hasDecisionPack,
    readinessLevel: ob,
  };
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({ title, badge, children }: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background:   'rgba(6,3,43,0.03)',
      border:       '1px solid rgba(6,3,43,0.08)',
      borderRadius: 12,
      padding:      '20px 24px',
    }}>
      <div className="flex items-center gap-2 mb-4">
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(6,3,43,0.85)', margin: 0 }}>
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </div>
  );
}

// ── Checklist item row ────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const isComplete   = item.status === 'COMPLETE';
  const isInProgress = item.status === 'IN_PROGRESS';

  const icon = isComplete
    ? { bg: 'rgba(34,197,94,0.15)', border: '1.5px solid rgba(34,197,94,0.35)', color: '#22c55e' }
    : isInProgress
    ? { bg: 'rgba(74,127,224,0.12)', border: '1.5px solid rgba(74,127,224,0.35)', color: 'rgba(74,127,224,0.9)' }
    : { bg: 'rgba(6,3,43,0.04)', border: '1.5px solid rgba(6,3,43,0.12)', color: 'rgba(6,3,43,0.28)' };

  const content = (
    <div className="flex items-start gap-3">
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
        background: icon.bg, border: icon.border, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isComplete && (
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke={icon.color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isInProgress && (
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: icon.color }} />
        )}
        {!isComplete && !isInProgress && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: icon.color }} />
        )}
      </div>
      <div>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: isComplete ? 'rgba(6,3,43,0.80)' : isInProgress ? 'rgba(6,3,43,0.88)' : 'rgba(6,3,43,0.38)',
          lineHeight: 1.4,
        }}>
          {item.label}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginTop: 2 }}>
          {item.detail}
        </div>
      </div>
      {item.href && !isComplete && (
        <div style={{ marginLeft: 'auto', paddingLeft: 8, flexShrink: 0, fontSize: 11, color: 'rgba(74,127,224,0.7)' }}>
          →
        </div>
      )}
    </div>
  );

  if (item.href && !isComplete) {
    return (
      <Link href={item.href} style={{ display: 'block', textDecoration: 'none' }}>
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: isInProgress ? 'rgba(74,127,224,0.05)' : 'transparent',
          border: isInProgress ? '1px solid rgba(74,127,224,0.15)' : '1px solid transparent',
          cursor: 'pointer', transition: 'background 0.15s',
        }}>
          {content}
        </div>
      </Link>
    );
  }

  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid transparent' }}>
      {content}
    </div>
  );
}

// ── Submission status badge ───────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  submission_draft:               { label: 'Bozza',                bg: 'rgba(6,3,43,0.08)',     color: 'rgba(6,3,43,0.50)' },
  submission_pending:             { label: 'In attesa revisione',   bg: 'rgba(74,127,224,0.15)', color: 'rgba(130,180,240,0.90)' },
  submission_needs_clarification: { label: 'Chiarimento richiesto', bg: 'rgba(245,158,11,0.15)', color: 'rgba(251,191,36,0.90)' },
  submission_accepted:            { label: 'Accettata',             bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  submission_rejected:            { label: 'Rifiutata',             bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
  submission_archived:            { label: 'Archiviata',            bg: 'rgba(6,3,43,0.06)',     color: 'rgba(6,3,43,0.38)' },
};

function SubmissionBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, bg: 'rgba(6,3,43,0.08)', color: 'rgba(6,3,43,0.50)' };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, borderRadius: 5,
      padding: '2px 8px', background: meta.bg, color: meta.color,
    }}>
      {meta.label}
    </span>
  );
}

// ── Main demo page ────────────────────────────────────────────────────────────

export default function DemoCompanyStatusPage() {
  const { activeRole } = useDemoState();

  const COMPANY_ID   = accountProvisioningService.getCurrentDemoUser(activeRole).company_id ?? 'meridiana-group';
  const demTenant    = tenantService.getTenant(COMPANY_ID);
  const readiness    = deriveReadinessFromTenant(COMPANY_ID);
  const workerSummary   = workerProvisioningService.getWorkerProvisioningSummary(COMPANY_ID);
  const workerAggregate = workerProvisioningService.getCompanyAggregateWorkerSummary(COMPANY_ID);
  const totalWorkers    = workerSummary.total_workers;
  const workerSpaceActive = workerSummary.my_kora_enabled_count > 0;

  const submissions: SubmissionSnapshot[] = [];
  const pipeline   = derivePipelineStatus(readiness, submissions);
  const checklist  = deriveChecklist(readiness, submissions, totalWorkers);
  const nextAction = deriveNextAction(readiness, submissions);
  const companyName = demTenant?.company_name ?? 'Meridiana Group S.r.l.';

  return (
    <div style={{ maxWidth: 880, padding: '24px 24px 48px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'rgba(6,3,43,0.92)', margin: 0 }}>
            Status Center
          </h1>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase',
            background: 'rgba(199,111,61,0.20)', color: '#C76F3D',
            border: '1.5px solid rgba(199,111,61,0.40)', borderRadius: 5, padding: '3px 8px',
          }}>
            SYNTHETIC DEMO
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.45)', margin: 0 }}>
          {companyName} · Risponde a tutte le domande operative senza contattare KORA Admin.
        </p>
      </div>

      {/* ── SECTION B — Next Action Card ───────────────────────────────────── */}
      <div style={{
        marginBottom: 20, padding: '18px 22px', borderRadius: 10,
        background: nextAction.urgency === 'critical'
          ? 'rgba(245,158,11,0.08)'
          : nextAction.urgency === 'normal'
          ? 'rgba(74,127,224,0.08)'
          : 'rgba(6,3,43,0.03)',
        border: nextAction.urgency === 'critical'
          ? '1.5px solid rgba(245,158,11,0.40)'
          : nextAction.urgency === 'normal'
          ? '1.5px solid rgba(74,127,224,0.30)'
          : '1px solid rgba(6,3,43,0.08)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
          color: nextAction.urgency === 'critical'
            ? 'rgba(251,191,36,0.70)'
            : nextAction.urgency === 'normal'
            ? 'rgba(130,180,240,0.70)'
            : 'rgba(6,3,43,0.35)',
          marginBottom: 6 }}>
          Prossima azione
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(6,3,43,0.90)', marginBottom: 4 }}>
          {nextAction.action}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(6,3,43,0.52)', marginBottom: 12 }}>
          {nextAction.detail}
        </div>
        {nextAction.urgency !== 'info' && (
          <Link
            href={nextAction.href}
            style={{
              display: 'inline-block', fontSize: 12, fontWeight: 700,
              background: nextAction.urgency === 'critical' ? 'rgba(245,158,11,0.25)' : 'rgba(74,127,224,0.20)',
              color: nextAction.urgency === 'critical' ? 'rgba(251,191,36,0.95)' : 'rgba(130,180,240,0.95)',
              border: nextAction.urgency === 'critical' ? '1px solid rgba(245,158,11,0.40)' : '1px solid rgba(74,127,224,0.35)',
              borderRadius: 6, padding: '7px 16px', textDecoration: 'none',
            }}
          >
            Vai →
          </Link>
        )}
      </div>

      {/* ── SECTION C — Pipeline KORA ───────────────────────────────────────── */}
      <SectionCard title="Pipeline KORA">
        <div style={{ marginBottom: 4 }}>
          <CompanyPipelineStatus pipeline={pipeline} />
        </div>
        <div style={{
          marginTop: 16, padding: '10px 14px', borderRadius: 8, fontSize: 11,
          background: 'rgba(6,3,43,0.03)', border: '1px solid rgba(6,3,43,0.06)',
          color: 'rgba(6,3,43,0.42)',
        }}>
          Il processo KORA è gestito da KORA Admin. Puoi tracciare lo stato ma non controllare i singoli step.
          {pipeline.isComplete ? ' ✓ Ciclo completato.' : ''}
        </div>
      </SectionCard>

      {/* ── SECTION D — Onboarding Checklist ───────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <SectionCard title="Checklist onboarding">
          <div className="flex flex-col gap-1">
            {checklist.map((item) => (
              <ChecklistRow key={item.id} item={item} />
            ))}
          </div>
          <div style={{
            marginTop: 12, fontSize: 11, color: 'rgba(6,3,43,0.30)',
            borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 10,
          }}>
            {checklist.filter((i) => i.status === 'COMPLETE').length}/{checklist.length} completati
          </div>
        </SectionCard>
      </div>

      {/* ── SECTION F — Worker Space ────────────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <SectionCard title="Worker Space — stato aggregato">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: 'Lavoratori nel roster', value: String(workerAggregate.total_workers) },
              { label: 'My KORA abilitati',      value: String(workerAggregate.my_kora_enabled_count) },
              { label: 'Dipartimenti',            value: String(workerAggregate.departments.length) },
              { label: 'Sedi',                    value: String(workerAggregate.sites.length) },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(6,3,43,0.04)', border: '1px solid rgba(6,3,43,0.07)',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(6,3,43,0.88)' }}>{value}</div>
                <div style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(6,3,43,0.32)',
            background: 'rgba(6,3,43,0.02)', border: '1px solid rgba(6,3,43,0.05)',
            borderRadius: 6, padding: '8px 12px',
          }}>
            {workerAggregate.privacy_boundary_note}
            {' '}Soglia privacy N≥10 applicata su tutti i segmenti.
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: workerSpaceActive ? '#22c55e' : 'rgba(6,3,43,0.25)',
            }} />
            <span style={{ fontSize: 12, color: workerSpaceActive ? '#22c55e' : 'rgba(6,3,43,0.40)' }}>
              Worker Space {workerSpaceActive ? 'attivo' : 'non ancora attivo'}
            </span>
          </div>
        </SectionCard>
      </div>

      {/* ── SECTION G — Template Library ───────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <SectionCard title="Template di submission">
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', marginBottom: 14, marginTop: 0 }}>
            Scarica il template CSV per la tipologia di dati che vuoi inviare.
            Compila, carica nel workspace e invia a KORA Admin.
          </p>
          <TemplateLibrary />
        </SectionCard>
      </div>

      {/* ── SECTION I — Submission Transparency (demo: feedback panel) ─────── */}
      <div id="submission-transparency" style={{ marginTop: 16 }}>
        <SectionCard title="Trasparenza dati — che fine hanno fatto i tuoi file?">
          <SubmissionFeedbackPanel
            feedback={submissionFeedbackService.getDemoFeedback(COMPANY_ID)}
            submissions={submissions}
          />
        </SectionCard>
      </div>

      {/* ── SECTION H — Reporting Status ───────────────────────────────────── */}
      <div style={{ marginTop: 16 }}>
        <SectionCard title="Stato reporting">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                label: 'KORA Index',
                ready: readiness.hasScoring,
                value: readiness.hasScoring ? 'Disponibile' : 'Non ancora calcolato',
                href:  readiness.hasScoring ? '/demo/company/kora-index' : undefined,
              },
              {
                label: 'Decision Pack',
                ready: readiness.hasDecisionPack,
                value: readiness.hasDecisionPack ? 'Pronto per il board' : 'In preparazione',
                href:  readiness.hasDecisionPack ? '/company/reports' : undefined,
              },
              {
                label: 'Board Pack PDF',
                ready: readiness.hasDecisionPack,
                value: readiness.hasDecisionPack ? 'Scaricabile' : 'Non ancora disponibile',
                href:  readiness.hasDecisionPack ? '/company/reports/board-pack' : undefined,
              },
            ].map(({ label, ready, value, href }) => {
              const card = (
                <div style={{
                  padding: '14px 16px', borderRadius: 8,
                  background: ready ? 'rgba(34,197,94,0.06)' : 'rgba(6,3,43,0.03)',
                  border: ready ? '1px solid rgba(34,197,94,0.20)' : '1px solid rgba(6,3,43,0.07)',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', marginBottom: 6 }}>{label}</div>
                  <div className="flex items-center gap-2">
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: ready ? '#22c55e' : 'rgba(6,3,43,0.20)',
                    }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: ready ? '#22c55e' : 'rgba(6,3,43,0.45)' }}>
                      {value}
                    </span>
                  </div>
                  {href && (
                    <div style={{ fontSize: 11, color: 'rgba(74,127,224,0.70)', marginTop: 6 }}>
                      Apri →
                    </div>
                  )}
                </div>
              );
              return href ? (
                <Link key={label} href={href} style={{ textDecoration: 'none' }}>{card}</Link>
              ) : (
                <div key={label}>{card}</div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 32, padding: '14px 18px', borderRadius: 8, fontSize: 11,
        color: 'rgba(6,3,43,0.30)', lineHeight: 1.6,
        background: 'rgba(6,3,43,0.02)', border: '1px solid rgba(6,3,43,0.05)',
      }}>
        <strong style={{ color: 'rgba(6,3,43,0.40)' }}>KORA Index v1.0</strong>
        {' · calibration_status: pre_empirical_calibration · synthetic_demo_data: true · '}
        Il KORA Index è un indicatore aggregato a livello aziendale.
        Nessun dato individuale è visibile in questo pannello.
        I dati individuali (PIB, profilo personale) sono privati al lavoratore per design.
      </div>
    </div>
  );
}
