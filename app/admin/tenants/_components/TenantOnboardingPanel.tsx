'use client';

// app/admin/tenants/_components/TenantOnboardingPanel.tsx
// Registro Tenant — KORA_ADMIN only. Registry/management view.
//
// This page is read-only registry + baseline management.
// Tenant creation happens exclusively at /admin/companies/new.
//
// Supported actions per tenant:
//   - View status, data readiness, Decision Pack status
//   - View reporting period and workforce baseline info
//   - Update baseline via POST /api/admin/workforce-baseline
//   - Navigate to Data Intake, UEF Review, Workspace Admin, Live Preview

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantSummary {
  id:                  string;
  tenantCode:          string;
  companyName:         string;
  onboardingStatus:    string;
  dataReadinessStatus: string;
  decisionPackStatus:  string;
  isActive:            boolean;
  methodologyVersionId: string;
  createdAt:           string;
}

interface BaselineFormState {
  reportingPeriod: string;
  totalWorkers:    string;
}

interface Props { userEmail: string; userRole: string; }

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

const STATUS_CLS: Record<string, string> = {
  active:        'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  intake_ready:  'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  not_ready:     'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
  pending:       'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
};

function statusCls(s: string): string {
  return STATUS_CLS[s] ?? STATUS_CLS['not_ready'];
}

export function TenantOnboardingPanel({ userEmail, userRole }: Props) {
  const [tenants, setTenants]               = useState<TenantSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  // Per-tenant inline baseline update
  const [expandedBaseline, setExpandedBaseline] = useState<string | null>(null);
  const [baselineForm, setBaselineForm]          = useState<BaselineFormState>({ reportingPeriod: '2026-Q1', totalWorkers: '' });
  const [baselineStatus, setBaselineStatus]      = useState<Record<string, 'idle'|'loading'|'ok'|'error'>>({});
  const [baselineMsg, setBaselineMsg]            = useState<Record<string, string>>({});

  function loadTenants() {
    setTenantsLoading(true);
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { ok?: boolean; tenants?: TenantSummary[] }) => {
        if (d.ok) setTenants(d.tenants ?? []);
      })
      .catch(() => {})
      .finally(() => setTenantsLoading(false));
  }

  useEffect(() => { loadTenants(); }, []);

  function toggleBaseline(tenantId: string, tenantCode: string) {
    if (expandedBaseline === tenantId) {
      setExpandedBaseline(null);
    } else {
      setExpandedBaseline(tenantId);
      setBaselineForm({ reportingPeriod: '2026-Q1', totalWorkers: '' });
      setBaselineStatus((s) => ({ ...s, [tenantId]: 'idle' }));
      setBaselineMsg((m) => ({ ...m, [tenantId]: '' }));
    }
    void tenantCode; // used in the form label below
  }

  async function handleUpdateBaseline(e: React.FormEvent, tenantId: string) {
    e.preventDefault();
    const workers = parseInt(baselineForm.totalWorkers, 10);
    setBaselineStatus((s) => ({ ...s, [tenantId]: 'loading' }));
    setBaselineMsg((m) => ({ ...m, [tenantId]: '' }));
    try {
      const res  = await fetch('/api/admin/workforce-baseline', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, reportingPeriod: baselineForm.reportingPeriod.trim(), totalWorkers: workers }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        setBaselineStatus((s) => ({ ...s, [tenantId]: 'ok' }));
        setBaselineMsg((m) => ({ ...m, [tenantId]: `Baseline aggiornata — periodo ${baselineForm.reportingPeriod}, ${workers} lavoratori.` }));
        setExpandedBaseline(null);
        loadTenants();
      } else {
        setBaselineStatus((s) => ({ ...s, [tenantId]: 'error' }));
        setBaselineMsg((m) => ({ ...m, [tenantId]: data.error ?? 'Errore aggiornamento baseline.' }));
      }
    } catch (err) {
      setBaselineStatus((s) => ({ ...s, [tenantId]: 'error' }));
      setBaselineMsg((m) => ({ ...m, [tenantId]: err instanceof Error ? err.message : 'Errore di rete.' }));
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Registro Tenant</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Gestione stato, baseline e navigazione per ogni azienda registrata.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-white">
            {userRole}
          </span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <div className="flex flex-wrap gap-1">
            {['Registry only', 'No PII', 'N≥10 enforced'].map((m) => (
              <span key={m} className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/40 font-medium">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Create notice ───────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(47,125,85,0.28)] bg-[rgba(47,125,85,0.07)] px-5 py-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#2F7D55]">Per creare una nuova azienda live usa Crea Azienda.</p>
          <p className="text-xs text-[rgba(6,3,43,0.55)] mt-1">
            Questa pagina è solo per gestire i tenant esistenti. La creazione di tenant e utente Company Admin
            avviene esclusivamente tramite il flusso dedicato.
          </p>
        </div>
        <Link
          href="/admin/companies/new"
          className="shrink-0 rounded-lg bg-[#06032B] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1a1756] transition-colors whitespace-nowrap"
        >
          Crea Azienda →
        </Link>
      </div>

      {/* ── Tenant list ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">
            Aziende registrate {!tenantsLoading && `(${tenants.length})`}
          </p>
          <button
            onClick={loadTenants}
            className="text-[10px] text-[rgba(6,3,43,0.40)] underline hover:text-[rgba(6,3,43,0.78)] transition-colors"
          >
            ↻ Aggiorna
          </button>
        </div>

        {tenantsLoading && (
          <p className="text-xs text-[rgba(6,3,43,0.40)]">Caricamento aziende…</p>
        )}

        {!tenantsLoading && tenants.length === 0 && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-4 text-sm text-[rgba(6,3,43,0.40)] text-center">
            Nessuna azienda registrata.{' '}
            <Link href="/admin/companies/new" className="underline text-[#2F7D55] font-medium">Crea la prima →</Link>
          </div>
        )}

        {tenants.map((t) => {
          const bStatus = baselineStatus[t.id] ?? 'idle';
          const bMsg    = baselineMsg[t.id] ?? '';
          const isBaselineOpen = expandedBaseline === t.id;

          return (
            <div key={t.id} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">

              {/* Card body */}
              <div className="px-4 py-4 space-y-3">

                {/* Row 1: name + status badges */}
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div>
                    <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{t.companyName}</p>
                    <p className="text-xs font-mono text-[rgba(6,3,43,0.52)]">{t.tenantCode}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusCls(t.dataReadinessStatus)}`}>
                      {t.dataReadinessStatus}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusCls(t.onboardingStatus)}`}>
                      {t.onboardingStatus}
                    </span>
                    {t.decisionPackStatus && t.decisionPackStatus !== 'none' && (
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${statusCls(t.decisionPackStatus)}`}>
                        DP: {t.decisionPackStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[rgba(6,3,43,0.52)]">
                  <span>Creata: <strong>{fmtDate(t.createdAt)}</strong></span>
                  {t.methodologyVersionId && (
                    <span>Metodologia: <strong className="font-mono">{t.methodologyVersionId}</strong></span>
                  )}
                  <span>Stato: <strong>{t.isActive ? 'attivo' : 'inattivo'}</strong></span>
                </div>

                {/* Row 3: baseline update feedback */}
                {bStatus === 'ok' && bMsg && (
                  <p className="text-[10px] text-[#2F7D55] font-medium">✓ {bMsg}</p>
                )}
                {bStatus === 'error' && bMsg && (
                  <p className="text-[10px] text-[#9E3B2F]">⚠ {bMsg}</p>
                )}

                {/* Row 4: action links */}
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 border-t border-[rgba(6,3,43,0.05)]">
                  <a
                    href={`/admin/data-intake?tenantCode=${encodeURIComponent(t.tenantCode)}`}
                    className="text-[11px] text-[#C76F3D] underline hover:no-underline"
                  >
                    Data Intake
                  </a>
                  <a
                    href="/admin/uef-review"
                    className="text-[11px] text-[#C76F3D] underline hover:no-underline"
                  >
                    UEF Review
                  </a>
                  <a
                    href={`/admin/company-workspace?tenantCode=${encodeURIComponent(t.tenantCode)}`}
                    className="text-[11px] text-[rgba(6,3,43,0.55)] underline hover:no-underline"
                  >
                    Workspace Admin
                  </a>
                  <a
                    href={`/admin/company-live-preview?tenantCode=${encodeURIComponent(t.tenantCode)}`}
                    className="text-[11px] text-[rgba(6,3,43,0.55)] underline hover:no-underline"
                  >
                    Live Preview
                  </a>
                  <button
                    onClick={() => toggleBaseline(t.id, t.tenantCode)}
                    className="text-[11px] text-[rgba(43,92,230,0.80)] underline hover:no-underline"
                  >
                    {isBaselineOpen ? 'Chiudi baseline' : 'Aggiorna Baseline'}
                  </button>
                </div>
              </div>

              {/* Inline baseline update form */}
              {isBaselineOpen && (
                <form
                  onSubmit={(e) => handleUpdateBaseline(e, t.id)}
                  className="px-4 py-3 border-t border-[rgba(6,3,43,0.08)] bg-[rgba(43,92,230,0.03)] space-y-3"
                >
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">
                    Aggiorna baseline — {t.tenantCode}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] mb-1">Periodo *</label>
                      <input
                        required
                        value={baselineForm.reportingPeriod}
                        onChange={(e) => setBaselineForm((f) => ({ ...f, reportingPeriod: e.target.value }))}
                        placeholder="2026-Q1"
                        className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] mb-1">Lavoratori (≥10) *</label>
                      <input
                        required type="number" min={10}
                        value={baselineForm.totalWorkers}
                        onChange={(e) => setBaselineForm((f) => ({ ...f, totalWorkers: e.target.value }))}
                        placeholder="50"
                        className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs tabular-nums text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={bStatus === 'loading'}
                      className="rounded bg-[#06032B] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors"
                    >
                      {bStatus === 'loading' ? 'Salvataggio…' : 'Salva Baseline'}
                    </button>
                    <p className="text-[9px] text-[rgba(6,3,43,0.35)]">N≥10 enforced · aggregate only · no worker names</p>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
