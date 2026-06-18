'use client';
// Workforce Command Center — B90-B Sprint.
// Route: /admin/companies/[companyId]/workforce
// Scope: KORA Admin only. Shows workforce roster, My KORA status, Worker Space, next action.
//
// Privacy invariants (enforced by type system + design):
// - employer_can_view_individual_pib = false on every WorkerRosterRecord (typed invariant)
// - No PIB, no Dynamic CV, no individual activation data shown
// - Session workers (created in modal) are managed in React state — no DB write, no email, no auth

import { useState, useCallback, use } from 'react';
import Link from 'next/link';
import { tenantService } from '@/services/tenant/TenantService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { workerSpaceCapabilityService } from '@/services/worker-space/WorkerSpaceCapabilityService';
import {
  computeWorkforceStatus,
  computeNextAction,
  COMPANY_CAN_SEE,
  COMPANY_CANNOT_SEE,
  WORKFORCE_PRIVACY_GUARANTEE,
  type WorkforceStatus,
} from '@/lib/workforce/workforce-rules';
import { RosterImportModal } from '@/app/admin/companies/_components/RosterImportModal';
import type { WorkerRosterRecord } from '@/lib/types';
import type { WorkerSpaceStatus } from '@/lib/worker-identity/types';

// ── Visual config ─────────────────────────────────────────────────────────────

const WORKFORCE_STATUS_CONFIG: Record<WorkforceStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  sublabel: (total: number, myKora: number) => string;
}> = {
  EMPTY: {
    label: 'VUOTO',
    bg: 'rgba(158,59,47,0.06)',
    text: '#9E3B2F',
    border: 'rgba(158,59,47,0.22)',
    dot: '#9E3B2F',
    sublabel: () => '0 lavoratori nel roster',
  },
  PARTIAL: {
    label: 'PARZIALE',
    bg: 'rgba(217,154,43,0.08)',
    text: '#8A5A00',
    border: 'rgba(217,154,43,0.28)',
    dot: '#D99A2B',
    sublabel: (total) => `${total} lavoratori · My KORA non ancora attivata`,
  },
  READY: {
    label: 'PRONTO',
    bg: 'rgba(47,125,85,0.08)',
    text: '#2F7D55',
    border: 'rgba(47,125,85,0.30)',
    dot: '#2F7D55',
    sublabel: (total, myKora) => `${total} lavoratori · ${myKora} con My KORA abilitata`,
  },
};

const ACCOUNT_STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  active_demo: { label: 'ACTIVE', classes: 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.15)] text-[#2F7D55]' },
  invited:     { label: 'INVITED', classes: 'border-blue-200 bg-blue-50 text-blue-700' },
  draft:       { label: 'DRAFT', classes: 'border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.45)]' },
  disabled:    { label: 'DISABLED', classes: 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]' },
};

const WORKER_SPACE_CONFIG: Record<WorkerSpaceStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
}> = {
  NOT_ENABLED: { label: 'NON ABILITATO',     bg: 'rgba(6,3,43,0.03)',      text: 'rgba(6,3,43,0.52)',  border: 'rgba(6,3,43,0.10)'      },
  ENABLED:     { label: 'ABILITATO · PREVIEW', bg: 'rgba(199,111,61,0.08)', text: '#C76F3D',             border: 'rgba(199,111,61,0.25)'  },
  PILOT_READY: { label: 'PILOT READY',        bg: 'rgba(47,125,85,0.08)',   text: '#2F7D55',             border: 'rgba(47,125,85,0.30)'   },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseWorkerName(record: WorkerRosterRecord): { firstName: string; lastName: string } {
  const name = record.display_name ?? record.worker_id;
  const idx = name.indexOf(' ');
  if (idx === -1) return { firstName: name, lastName: '—' };
  return { firstName: name.slice(0, idx), lastName: name.slice(idx + 1) };
}

function modeLabel(mode: 'preview' | 'pilot_ready' | 'not_enabled'): string {
  if (mode === 'preview') return 'PREVIEW';
  if (mode === 'pilot_ready') return 'PILOT+';
  return 'NON ATTIVO';
}

// ── Form ──────────────────────────────────────────────────────────────────────

interface NewWorkerForm {
  firstName: string;
  lastName: string;
  department: string;
  site: string;
  myKoraEnabled: boolean;
}

const EMPTY_FORM: NewWorkerForm = {
  firstName: '', lastName: '', department: '', site: '', myKoraEnabled: false,
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WorkforceCommandCenter({ params }: { params: Promise<{ companyId: string }> }) {
  const { companyId } = use(params);

  // All hooks must come before any conditional returns (React rules)
  const [sessionWorkers, setSessionWorkers] = useState<WorkerRosterRecord[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [form, setForm] = useState<NewWorkerForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  // Multi-field company resolution: accept company_id, tenant_id, or canonical demo slug.
  const tenant = tenantService.getTenant(companyId)
    ?? tenantService.getTenantByTenantId(companyId)
    ?? (companyId === 'meridiana-group' || companyId === 'tenant-meridiana-001'
        ? tenantService.getTenant('meridiana-group')
        : null);
  // Use the resolved company_id so services get the canonical key regardless of URL format.
  const resolvedId = tenant?.company_id ?? companyId;
  const capability = workerSpaceCapabilityService.getCapabilityByCompanyId(resolvedId);
  const aggregate = workerProvisioningService.getCompanyAggregateWorkerSummary(resolvedId);
  const seedRoster = workerProvisioningService.getWorkersForCompany(resolvedId);

  // Combined roster: seed (stable) + session workers (created this session)
  const allWorkers = [...seedRoster, ...sessionWorkers];
  const totalWorkers = allWorkers.length;
  const myKoraCount = allWorkers.filter((w) => w.my_kora_enabled).length;
  const activeCount = allWorkers.filter((w) => w.worker_account_status === 'active_demo').length;
  const workforceStatus = computeWorkforceStatus(totalWorkers, myKoraCount);
  const nextAction = computeNextAction(totalWorkers, myKoraCount, activeCount, capability.status);

  // Autocomplete lists for the new-worker form (derived from existing roster)
  const deptOptions = aggregate.departments.map((d) => d.replace('dept-', '').replace(/-/g, ' '));
  const siteOptions = aggregate.sites.map((s) => s.replace('site-', '').replace(/-/g, ' '));

  // Modal handlers
  const openModal  = () => { setForm(EMPTY_FORM); setFormError(null); setFeedback(null); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); };

  const handleCreateWorker = useCallback(() => {
    if (!form.firstName.trim()) { setFormError('Nome è obbligatorio.'); return; }
    if (!form.lastName.trim())  { setFormError('Cognome è obbligatorio.'); return; }

    const result = workerProvisioningService.createDemoWorker({
      companyId,
      tenantId: tenant?.tenant_id ?? `tenant-${companyId}`,
      firstName: form.firstName.trim(),
      lastName:  form.lastName.trim(),
      department: form.department.trim() || 'Non specificato',
      site:       form.site.trim()       || 'Non specificato',
      myKoraEnabled: form.myKoraEnabled,
    });

    if (result.success) {
      setSessionWorkers((prev) => [...prev, result.record]);
      setFeedback({ message: result.note, type: 'success' });
      closeModal();
    } else {
      setFormError(result.note);
    }
  }, [form, companyId, tenant]);

  // Tenant not found — show company selector instead of dead empty screen
  if (!tenant) {
    const allTenants = tenantService.getTenants();
    return (
      <div className="space-y-5 max-w-xl">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)] mb-1">KORA Admin · Workforce</p>
          <h1 className="text-xl font-bold text-[#06032B]">Azienda non trovata</h1>
          <p className="text-xs text-[rgba(6,3,43,0.52)] font-mono mt-0.5">company_id ricevuto: {companyId}</p>
        </div>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.70)]">Aziende disponibili nel portfolio demo</p>
          <div className="flex flex-col gap-2">
            {allTenants.map((t) => (
              <Link
                key={t.company_id}
                href={`/admin/companies/${t.company_id}/workforce`}
                className="flex items-center justify-between rounded border border-[rgba(6,3,43,0.10)] bg-white px-3 py-2.5 hover:bg-[rgba(6,3,43,0.02)] transition-colors"
              >
                <div>
                  <p className="text-xs font-semibold text-[#06032B]">{t.company_name}</p>
                  <p className="text-[9px] font-mono text-[rgba(6,3,43,0.40)] mt-0.5">company_id: {t.company_id}</p>
                </div>
                <span className="text-[10px] font-semibold text-[#C76F3D]">Gestisci →</span>
              </Link>
            ))}
          </div>
        </div>
        <Link href="/admin/companies" className="text-xs font-semibold text-[#C76F3D] hover:underline">
          ← Company Mission Control
        </Link>
      </div>
    );
  }

  const wsCfg  = WORKFORCE_STATUS_CONFIG[workforceStatus];
  const wsCapCfg = WORKER_SPACE_CONFIG[capability.status];

  return (
    <div className="space-y-6 max-w-4xl">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div>
        <nav className="flex items-center gap-1.5 text-[10px] text-[rgba(6,3,43,0.40)] mb-1.5 flex-wrap">
          <Link href="/admin/companies" className="hover:text-[rgba(6,3,43,0.62)]">Company Mission Control</Link>
          <span>/</span>
          <Link href={`/admin/companies/${companyId}`} className="hover:text-[rgba(6,3,43,0.62)]">{tenant.company_name}</Link>
          <span>/</span>
          <span className="font-semibold text-[rgba(6,3,43,0.62)]">Workforce</span>
        </nav>
        <h1 className="text-xl font-bold text-[#06032B]">{tenant.company_name}</h1>
        <p className="text-sm text-[rgba(6,3,43,0.52)]">Gestione Workforce — KORA Admin</p>
        <p className="text-[10px] font-mono text-[rgba(6,3,43,0.30)] mt-0.5">
          company_id: {companyId} · tenant_id: {tenant.tenant_id} · synthetic_demo_data: true
        </p>
      </div>

      {/* Admin-only notice */}
      <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.07)] px-4 py-2.5 text-xs text-[rgba(6,3,43,0.80)] leading-relaxed">
        <span className="font-semibold">Gestione Workforce — KORA Admin only.</span>{' '}
        Questa console non è visibile all&apos;azienda cliente. Nessun PIB individuale è esposto. Nessuna email viene inviata. Dati sintetici demo.
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded border px-3 py-2 text-xs ${
          feedback.type === 'success'
            ? 'border-[rgba(47,125,85,0.40)] bg-[rgba(47,125,85,0.10)] text-[#06032B]'
            : 'border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]'
        }`}>
          {feedback.message}
          <button type="button" onClick={() => setFeedback(null)} className="ml-3 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}

      {/* ── A: Workforce Overview ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">A — Workforce Overview</p>

        <div className="rounded-lg overflow-hidden border" style={{ borderColor: wsCfg.border }}>
          {/* Status strip */}
          <div className="px-4 py-2.5 flex items-center gap-3 flex-wrap" style={{ background: wsCfg.bg }}>
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: wsCfg.dot }} />
            <span className="text-sm font-bold" style={{ color: wsCfg.text }}>{wsCfg.label}</span>
            <span className="text-xs" style={{ color: wsCfg.text, opacity: 0.75 }}>
              {wsCfg.sublabel(totalWorkers, myKoraCount)}
            </span>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 p-4 bg-[#F8F6F1]">
            {[
              { label: 'Totale lavoratori',     value: String(totalWorkers),        highlight: totalWorkers > 0 },
              { label: 'My KORA Abilitati',      value: String(myKoraCount),         highlight: myKoraCount > 0  },
              { label: 'Account Attivi',         value: String(activeCount),         highlight: activeCount > 0  },
              { label: 'Worker Space',           value: capability.enabled ? (capability.mode === 'pilot_ready' ? 'Pilot+' : 'Preview') : 'Off',
                                                                                     highlight: capability.enabled },
              { label: 'Dip. dichiarati',        value: String(tenant.employee_count), highlight: false },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="rounded border border-[rgba(6,3,43,0.08)] bg-white p-3 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.38)]">{label}</p>
                <p className={`text-xl font-bold mt-1 ${highlight ? 'text-[#C76F3D]' : 'text-[rgba(6,3,43,0.55)]'}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B: Next Action Engine ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">B — Prossima Azione</p>
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 flex items-start gap-3">
          <span className="text-[#C76F3D] font-bold text-base mt-0.5 flex-shrink-0">→</span>
          <p className="text-sm font-medium text-[rgba(6,3,43,0.88)] leading-relaxed">{nextAction}</p>
        </div>
      </section>

      {/* ── C: Worker Space ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">C — Worker Space</p>

        <div className="rounded-lg border bg-[#F8F6F1] p-4 space-y-3" style={{ borderColor: wsCapCfg.border }}>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1.5">Stato Worker Space</p>
              <span
                className="rounded px-2 py-0.5 text-[10px] font-bold"
                style={{ background: wsCapCfg.bg, color: wsCapCfg.text, border: `1px solid ${wsCapCfg.border}` }}
              >
                {wsCapCfg.label}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">{capability.note}</p>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[10px]">
            {[
              { label: 'Dynamic CV',     value: capability.dynamicCvSupported  ? 'Preview'  : 'Non disponibile' },
              { label: 'Contributo',     value: capability.collectiveSupported  ? 'Preview'  : 'Non disponibile' },
              { label: 'PIB privato',    value: capability.pibSupported         ? 'Attivo'   : 'Pilot+ — non attivo' },
              { label: 'Modalità',       value: modeLabel(capability.mode)                                        },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className="font-medium text-[rgba(6,3,43,0.72)] mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)] leading-relaxed">
            <span className="font-semibold">PIB e Worker Space.</span>{' '}
            Il Personal Impact Balance rimane privato al lavoratore — mai visibile all&apos;azienda.
            Worker Space mostra al lavoratore il proprio spazio personale. L&apos;azienda vede solo aggregati N≥10.
          </div>
        </div>
      </section>

      {/* ── D: Roster Lavoratori ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">
            D — Roster Lavoratori · {allWorkers.length} record
          </p>
          <button
            type="button"
            onClick={openModal}
            className="rounded-md bg-[#06032B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
          >
            + Nuovo lavoratore
          </button>
        </div>

        {allWorkers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.02)] p-10 text-center">
            <p className="text-sm font-semibold text-[rgba(6,3,43,0.52)] mb-2">Nessun lavoratore nel roster</p>
            <p className="text-xs text-[rgba(6,3,43,0.40)] mb-5 max-w-xs mx-auto">
              Aggiungi il primo lavoratore per questa company. Roster creation only — nessun account, nessuna email.
            </p>
            <button
              type="button"
              onClick={openModal}
              className="rounded border border-[rgba(6,3,43,0.14)] bg-white px-4 py-2 text-xs font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
            >
              + Aggiungi il primo lavoratore
            </button>
          </div>
        ) : (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-x-auto">
            {/* Header */}
            <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_70px_80px] gap-2 px-4 py-2 bg-[rgba(6,3,43,0.03)] border-b border-[rgba(6,3,43,0.07)] min-w-[640px]">
              {['Worker ID', 'Nome', 'Cognome', 'Reparto', 'Sede', 'My KORA', 'Stato'].map((h) => (
                <span key={h} className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.38)]">{h}</span>
              ))}
            </div>
            {/* Rows */}
            <div className="divide-y divide-[rgba(6,3,43,0.05)] min-w-[640px]">
              {allWorkers.map((w) => {
                const { firstName, lastName } = parseWorkerName(w);
                const statusCfg = ACCOUNT_STATUS_CONFIG[w.worker_account_status] ?? ACCOUNT_STATUS_CONFIG.disabled;
                const isNew = sessionWorkers.some((s) => s.worker_id === w.worker_id);
                return (
                  <div
                    key={w.worker_id}
                    className={`grid grid-cols-[1.2fr_1fr_1fr_1fr_1fr_70px_80px] gap-2 px-4 py-2.5 items-center ${
                      w.worker_id.startsWith('WRK-IMP-') ? 'bg-[rgba(47,125,85,0.04)]' :
                      isNew ? 'bg-[rgba(199,111,61,0.04)]' : 'hover:bg-[rgba(6,3,43,0.015)]'
                    }`}
                  >
                    <p className="text-[9px] font-mono text-[rgba(6,3,43,0.45)] truncate" title={w.worker_id}>
                      {w.worker_id}
                    </p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.78)] truncate">{firstName}</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.78)] truncate">{lastName}</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.58)] truncate">
                      {w.department.replace('dept-', '').replace(/-/g, ' ')}
                    </p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.58)] truncate">
                      {w.site.replace('site-', '').replace(/-/g, ' ')}
                    </p>
                    <span className={`text-[9px] font-bold ${w.my_kora_enabled ? 'text-[#C76F3D]' : 'text-[rgba(6,3,43,0.30)]'}`}>
                      {w.my_kora_enabled ? 'ON' : 'off'}
                    </span>
                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold text-center ${statusCfg.classes}`}>
                      {statusCfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[9px] font-mono text-[rgba(6,3,43,0.30)]">
          employer_can_view_individual_pib: false · nessun PIB esposto · synthetic_demo_data: true
        </p>
      </section>

      {/* ── E: Bulk Import ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">E — Importazione Massiva</p>

        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Import CSV / Excel</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
                Importa 50, 250 o 1.000 lavoratori in una sola operazione.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setImportModalOpen(true)}
              className="rounded-md border border-[rgba(6,3,43,0.18)] bg-white px-3 py-1.5 text-xs font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
            >
              Inizia importazione →
            </button>
          </div>

          {/* Boundary copy (T11) */}
          <div className="rounded border border-[rgba(199,111,61,0.18)] bg-[rgba(199,111,61,0.06)] px-3 py-2.5 text-[10px] text-[rgba(6,3,43,0.68)] leading-relaxed space-y-0.5">
            <p><span className="font-semibold">Import roster ≠ Data Intake.</span> Il roster definisce la popolazione aziendale.</p>
            <p>Le attività che generano IU passano da <strong>Data Intake → UEF Review</strong>.</p>
            <p>Importare lavoratori <strong>non crea account My KORA reali</strong> — solo record roster in stato draft.</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 text-[10px]">
            {[
              ['Formati accettati',   'CSV, Excel (.xlsx)'],
              ['Campi obbligatori',   'employee_code, department, site'],
              ['Campi facoltativi',   'nome, cognome, my_kora, job_family…'],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded border border-[rgba(6,3,43,0.06)] bg-white px-3 py-2">
                <p className="text-[rgba(6,3,43,0.38)] mb-0.5">{label}</p>
                <p className="font-medium text-[rgba(6,3,43,0.70)]">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-[9px] font-mono text-[rgba(6,3,43,0.32)]">
            foundation_light · client-side only · no_db_write · no_email · no_auth · max 5 MB
          </p>
        </div>
      </section>

      {/* ── F: Privacy Block ──────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.40)]">F — Confini Privacy</p>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Can see */}
          <div className="rounded-lg border border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.06)] p-4">
            <p className="text-xs font-semibold text-[#2F7D55] mb-3">✓ L&apos;azienda può vedere</p>
            <ul className="space-y-2">
              {COMPANY_CAN_SEE.map((item) => (
                <li key={item} className="text-[10px] text-[#2F7D55] flex gap-2">
                  <span className="flex-shrink-0 mt-0.5">·</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {/* Cannot see */}
          <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.05)] p-4">
            <p className="text-xs font-semibold text-[#9E3B2F] mb-3">✕ L&apos;azienda non vede mai</p>
            <ul className="space-y-2">
              {COMPANY_CANNOT_SEE.map((item) => (
                <li key={item} className="text-[10px] text-[#9E3B2F] flex gap-2">
                  <span className="font-bold flex-shrink-0">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Core guarantee */}
        <div className="rounded border border-[rgba(6,3,43,0.07)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-[11px] text-[rgba(6,3,43,0.62)] leading-relaxed">
          <span className="font-semibold text-[rgba(6,3,43,0.75)]">Garanzia architetturale.</span>{' '}
          {WORKFORCE_PRIVACY_GUARANTEE}
        </div>
      </section>

      {/* ── Navigation ───────────────────────────────────────────────────────── */}
      <div className="border-t border-[rgba(6,3,43,0.06)] pt-4 flex items-center gap-5 flex-wrap text-xs">
        <Link href={`/admin/companies/${companyId}`} className="text-[rgba(6,3,43,0.42)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          ← Company Control Room
        </Link>
        <Link href={`/admin/companies/${companyId}/onboarding`} className="text-[rgba(6,3,43,0.52)] hover:text-[rgba(6,3,43,0.72)] underline underline-offset-2">
          Onboarding Operativo →
        </Link>
        <Link href={`/admin/companies/${companyId}/data-intake`} className="text-violet-600 hover:text-violet-800 underline underline-offset-2">
          Data Intake →
        </Link>
        <Link href="/admin/companies" className="text-[rgba(6,3,43,0.42)] hover:text-[rgba(6,3,43,0.62)] underline underline-offset-2">
          Company Mission Control →
        </Link>
      </div>

      <p className="text-[9px] font-mono text-[rgba(6,3,43,0.25)]">
        KORA Admin · Workforce Management · B90-B · synthetic_demo_data: true · no_auth_changes · no_db_changes · company_id: {companyId}
      </p>

      {/* ── Modal: Nuovo lavoratore ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[rgba(6,3,43,0.50)]"
            onClick={closeModal}
            role="presentation"
          />
          {/* Card */}
          <div className="relative z-10 w-full max-w-md rounded-xl border border-[rgba(6,3,43,0.12)] bg-white shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[rgba(6,3,43,0.38)]">
                  KORA Admin · {tenant.company_name}
                </p>
                <h2 className="text-base font-bold text-[#06032B] mt-0.5">Nuovo lavoratore</h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-[rgba(6,3,43,0.30)] hover:text-[rgba(6,3,43,0.60)] text-lg leading-none mt-0.5"
                aria-label="Chiudi"
              >
                ✕
              </button>
            </div>

            <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.02)] px-3 py-2 text-[10px] text-[rgba(6,3,43,0.52)]">
              Roster creation only. Nessun account creato. Nessuna email inviata. Nessun PIB generato.
            </div>

            {formError && (
              <div className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.05)] px-3 py-2 text-xs text-[#9E3B2F]">
                {formError}
              </div>
            )}

            <div className="space-y-3">
              {/* Nome + Cognome */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.50)] mb-1" htmlFor="wf-firstName">
                    Nome *
                  </label>
                  <input
                    id="wf-firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, firstName: e.target.value })); }}
                    placeholder="es. Marco"
                    className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs text-[rgba(6,3,43,0.88)] placeholder:text-[rgba(6,3,43,0.28)] focus:border-[rgba(6,3,43,0.38)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.50)] mb-1" htmlFor="wf-lastName">
                    Cognome *
                  </label>
                  <input
                    id="wf-lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => { setFormError(null); setForm((f) => ({ ...f, lastName: e.target.value })); }}
                    placeholder="es. Rossi"
                    className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs text-[rgba(6,3,43,0.88)] placeholder:text-[rgba(6,3,43,0.28)] focus:border-[rgba(6,3,43,0.38)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Reparto */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.50)] mb-1" htmlFor="wf-department">
                  Reparto
                </label>
                <input
                  id="wf-department"
                  type="text"
                  list="wf-dept-options"
                  value={form.department}
                  onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                  placeholder="es. Operations, HR, Finance…"
                  className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs text-[rgba(6,3,43,0.88)] placeholder:text-[rgba(6,3,43,0.28)] focus:border-[rgba(6,3,43,0.38)] focus:outline-none"
                />
                {deptOptions.length > 0 && (
                  <datalist id="wf-dept-options">
                    {deptOptions.map((d) => <option key={d} value={d} />)}
                  </datalist>
                )}
              </div>

              {/* Sede */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.50)] mb-1" htmlFor="wf-site">
                  Sede
                </label>
                <input
                  id="wf-site"
                  type="text"
                  list="wf-site-options"
                  value={form.site}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  placeholder="es. Milano HQ, Plant Bergamo…"
                  className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs text-[rgba(6,3,43,0.88)] placeholder:text-[rgba(6,3,43,0.28)] focus:border-[rgba(6,3,43,0.38)] focus:outline-none"
                />
                {siteOptions.length > 0 && (
                  <datalist id="wf-site-options">
                    {siteOptions.map((s) => <option key={s} value={s} />)}
                  </datalist>
                )}
              </div>

              {/* My KORA */}
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    id="wf-myKora"
                    type="checkbox"
                    checked={form.myKoraEnabled}
                    onChange={(e) => setForm((f) => ({ ...f, myKoraEnabled: e.target.checked }))}
                    className="rounded border-[rgba(6,3,43,0.20)]"
                  />
                  <label htmlFor="wf-myKora" className="text-xs text-[rgba(6,3,43,0.78)]">
                    Abilita My KORA
                  </label>
                </div>
                {form.myKoraEnabled && (
                  <p className="text-[10px] text-[rgba(6,3,43,0.48)] pl-5">
                    My KORA abilitata — il lavoratore potrà accedere al proprio spazio personale (solo demo, nessuna email inviata).
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleCreateWorker}
                className="flex-1 rounded-md bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[rgba(6,3,43,0.82)] transition-colors"
              >
                Aggiungi al roster
              </button>
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-md border border-[rgba(6,3,43,0.12)] px-4 py-2 text-xs font-medium text-[rgba(6,3,43,0.58)] hover:bg-[rgba(6,3,43,0.03)] transition-colors"
              >
                Annulla
              </button>
            </div>

            <p className="text-[9px] font-mono text-[rgba(6,3,43,0.28)] text-center">
              no_auth_changes · no_db_changes · no_email · no_pib · synthetic_demo_only
            </p>
          </div>
        </div>
      )}

      {/* ── Modal: Bulk Import ────────────────────────────────────────────────── */}
      {importModalOpen && tenant && (
        <RosterImportModal
          companyId={companyId}
          tenantId={tenant.tenant_id}
          existingWorkerIds={new Set(allWorkers.map((w) => w.worker_id))}
          onImport={(records) => {
            setSessionWorkers((prev) => [...prev, ...records]);
            setFeedback({
              message: `${records.length} lavoratori importati nel roster. Nessun account creato. Nessuna email inviata.`,
              type: 'success',
            });
            setImportModalOpen(false);
          }}
          onClose={() => setImportModalOpen(false)}
        />
      )}
    </div>
  );
}
