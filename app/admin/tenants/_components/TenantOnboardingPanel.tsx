'use client';

// app/admin/tenants/_components/TenantOnboardingPanel.tsx
// B9 — Tenant Onboarding Panel.
// Create new company/tenant + workforce baseline for KORA pilot.
// No worker names. No worker emails. No PIB. No scoring.

import { useEffect, useState } from 'react';

interface TenantSummary {
  id:                  string;
  tenantCode:          string;
  companyName:         string;
  onboardingStatus:    string;
  dataReadinessStatus: string;
  isActive:            boolean;
  createdAt:           string;
}

interface CreateResult {
  ok:                      boolean;
  tenantId?:               string;
  tenantCode?:             string;
  companyName?:            string;
  reportingPeriod?:        string;
  workforceBaselineCreated?: boolean;
  status?:                 string;
  baselineWarning?:        string;
  error?:                  string;
}

interface Props { userEmail: string; userRole: string; }

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

const STATUS_CLS: Record<string, string> = {
  active:        'bg-green-50 text-green-700 border-green-200',
  intake_ready:  'bg-blue-50 text-blue-700 border-blue-200',
  not_ready:     'bg-slate-50 text-slate-500 border-slate-200',
};

export function TenantOnboardingPanel({ userEmail, userRole }: Props) {
  const [tenants, setTenants]             = useState<TenantSummary[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  const [tenantCode,        setTenantCode]        = useState('');
  const [companyName,       setCompanyName]        = useState('');
  const [reportingPeriod,   setReportingPeriod]    = useState('2026-Q1');
  const [workforcePopulation, setWorkforcePopulation] = useState('');
  const [notes,             setNotes]              = useState('');

  const [createStatus, setCreateStatus] = useState<'idle'|'loading'|'created'|'error'>('idle');
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);

  // Load tenants on mount
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantSummary[] }) => {
        if (d.ok) setTenants(d.tenants ?? []);
      })
      .catch(() => {})
      .finally(() => setTenantsLoading(false));
  }, []);

  function refreshTenants() {
    setTenantsLoading(true);
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantSummary[] }) => {
        if (d.ok) setTenants(d.tenants ?? []);
      })
      .catch(() => {})
      .finally(() => setTenantsLoading(false));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateStatus('loading'); setCreateResult(null);
    try {
      const res  = await fetch('/api/admin/tenants', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantCode:           tenantCode.trim().toUpperCase(),
          companyName:          companyName.trim(),
          reportingPeriod:      reportingPeriod.trim(),
          workforcePopulation:  parseInt(workforcePopulation, 10),
          notes:                notes.trim() || null,
        }),
      });
      const data = await res.json() as CreateResult;
      setCreateResult(data);
      setCreateStatus(data.ok ? 'created' : 'error');
      if (data.ok) {
        setTenantCode(''); setCompanyName(''); setWorkforcePopulation(''); setNotes('');
        refreshTenants();
      }
    } catch (e) {
      setCreateResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setCreateStatus('error');
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#6156F5] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Tenant Onboarding</h1>
          <p className="text-sm text-white/45 mt-0.5">B9 — Create new company/tenant for live pilot</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#6156F5]/60 bg-[#6156F5]/15 px-2 py-0.5 text-xs font-semibold text-[#9d97ff]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <div className="flex flex-wrap gap-1">
            {['No worker identity', 'No PII', 'N≥10 enforced'].map(m => (
              <span key={m} className="rounded border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] text-white/40 font-medium">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">

        {/* ── Left: create form ── */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Create new tenant</p>
          <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white px-5 py-5 space-y-3.5">

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Tenant Code *
              </label>
              <input
                required value={tenantCode}
                onChange={e => setTenantCode(e.target.value.toUpperCase())}
                placeholder="ACME-001"
                pattern="[A-Z0-9-]{2,32}"
                title="Uppercase letters, digits, dashes. 2–32 chars."
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Uppercase A–Z, 0–9, dash. Must be unique.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Company Name *
              </label>
              <input
                required value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Acme S.p.A."
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Reporting Period *
              </label>
              <input
                required value={reportingPeriod}
                onChange={e => setReportingPeriod(e.target.value)}
                placeholder="2026-Q1"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Workforce Population * (≥10)
              </label>
              <input
                required type="number" min={10} value={workforcePopulation}
                onChange={e => setWorkforcePopulation(e.target.value)}
                placeholder="50"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm tabular-nums text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Aggregate only — no worker names. N≥10 enforced.</p>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Notes (optional)
              </label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Pilot Foundation Light — Q1 2026"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>

            <button type="submit" disabled={createStatus === 'loading'}
              className="w-full rounded-lg bg-[#06032B] text-white px-4 py-2 text-sm font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors">
              {createStatus === 'loading' ? '⏳ Creating…' : '+ Create tenant'}
            </button>

            {/* Success */}
            {createStatus === 'created' && createResult?.ok && (
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-1.5">
                <p className="text-xs font-bold text-green-700">✓ Tenant created</p>
                <div className="text-[10px] text-green-600 space-y-0.5">
                  <p>Code: <strong className="font-mono">{createResult.tenantCode}</strong></p>
                  <p>Company: {createResult.companyName}</p>
                  <p>Period: {createResult.reportingPeriod}</p>
                  <p>Baseline: {createResult.workforceBaselineCreated ? '✓ Created' : '⚠ Failed'}</p>
                  <p>Status: <strong>{createResult.status}</strong></p>
                </div>
                {createResult.baselineWarning && (
                  <p className="text-[10px] text-amber-700">⚠ {createResult.baselineWarning}</p>
                )}
                {/* B9.2: dynamic CTA with query params for seamless next-step navigation */}
                <div className="pt-2 border-t border-green-100">
                  <a
                    href={`/admin/data-intake?tenantCode=${encodeURIComponent(createResult.tenantCode ?? '')}&reportingPeriod=${encodeURIComponent(createResult.reportingPeriod ?? '')}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
                  >
                    Go to Data Intake →
                  </a>
                </div>
              </div>
            )}

            {/* Error */}
            {createStatus === 'error' && createResult && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
                ⚠ {createResult.error}
              </div>
            )}
          </form>
        </div>

        {/* ── Right: tenant list ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Active tenants</p>
            <button onClick={refreshTenants}
              className="text-[10px] text-slate-400 underline hover:text-slate-700 transition-colors">
              ↻ Refresh
            </button>
          </div>

          {tenantsLoading && <p className="text-xs text-slate-400">Loading tenants…</p>}

          {!tenantsLoading && tenants.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
              No tenants yet. Create the first one.
            </div>
          )}

          {tenants.map(t => (
            <div key={t.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.companyName}</p>
                  <p className="text-xs font-mono text-slate-500">{t.tenantCode}</p>
                </div>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLS[t.dataReadinessStatus] ?? STATUS_CLS['not_ready']}`}>
                  {t.dataReadinessStatus}
                </span>
              </div>
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-500">
                <span>Onboarding: <strong>{t.onboardingStatus}</strong></span>
                <span>DP: <strong>{/* t.decisionPackStatus */t.isActive ? 'active' : 'inactive'}</strong></span>
                <span>Created: {ts(t.createdAt)}</span>
              </div>
              <div className="flex gap-2 pt-1 border-t border-slate-100">
                <a href={`/admin/data-intake?tenantCode=${encodeURIComponent(t.tenantCode)}`} className="text-[10px] text-[#6156F5] underline">Data Intake</a>
                <a href="/admin/uef-review" className="text-[10px] text-[#6156F5] underline">UEF Review</a>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
