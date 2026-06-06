'use client';

// app/admin/company-workspace/_components/CompanyWorkspacePanel.tsx
// B14 — Spazio azienda: single-page pilot flow orchestrator.
// Reads from /api/admin/company-workspace (read-only, no PII, no scoring).

import { useEffect, useState, useCallback } from 'react';

// ── Types ───────────────────────────────────────────────────────────────────

interface TenantOption { id: string; tenantCode: string; companyName: string; }

interface WorkspaceData {
  ok: boolean;
  tenant:              { id: string; tenantCode: string; companyName: string };
  reportingPeriod:     string;
  workforce:           { exists: boolean; totalWorkers: number | null };
  latestBatch:         { id: string; sourceName: string | null; status: string; rowCount: number; createdAt: string; hasFinancialMetadata: boolean } | null;
  uef:                 { total: number; pendingReview: number; approved: number; rejected: number; needsInfo: number; needsEnrichment: number } | null;
  scoring:             { hasResult: boolean; koraIndex: number; confidenceScore: number; safeguard: string; activationRate: number | null } | null;
  decisionPack:        { versionId: string; status: string; createdAt: string; previewUrl: string; pdfUrl: string } | null;
  pilotStatus:         string;
  recommendedNextAction: { label: string; href: string } | null;
  error?:              string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'bg-[rgba(47,125,85,0.10)] text-green-700 border-[rgba(47,125,85,0.22)]',
  WARNING: 'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  FLAGGED: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
};

const DP_CLS: Record<string, string> = {
  draft:    'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  ready:    'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  exported: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  archived: 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
};

const PILOT_STATUS_LABEL: Record<string, string> = {
  not_started:            'Non avviato',
  batch_pending:          'Batch caricato',
  review_ready:           'Review in attesa',
  needs_enrichment:       'Enrichment incompleto',
  ready_for_scoring:      'Pronto per scoring',
  scored:                 'Scored',
  decision_pack_draft:    'Decision Pack in bozza',
  decision_pack_exported: 'Decision Pack esportato',
  archived:               'Archiviato',
};

const PILOT_STATUS_CLS: Record<string, string> = {
  not_started:            'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
  batch_pending:          'bg-blue-50 text-blue-600 border-blue-200',
  review_ready:           'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  needs_enrichment:       'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  ready_for_scoring:      'bg-purple-50 text-purple-700 border-purple-200',
  scored:                 'bg-[#C76F3D]/10 text-[#C76F3D] border-[#C76F3D]/30',
  decision_pack_draft:    'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  decision_pack_exported: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  archived:               'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// ── Step card ─────────────────────────────────────────────────────────────────

interface StepCardProps {
  number:    number;
  title:     string;
  status:    'complete' | 'active' | 'pending' | 'warning';
  children:  React.ReactNode;
  cta?:      { label: string; href: string; primary?: boolean };
}

function StepCard({ number, title, status, children, cta }: StepCardProps) {
  const statusDot = {
    complete: 'bg-green-500',
    active:   'bg-[#C76F3D] animate-pulse',
    warning:  'bg-[#D99A2B]',
    pending:  'bg-[rgba(6,3,43,0.18)]',
  }[status];

  return (
    <div className={`rounded-lg border px-4 py-3.5 space-y-2 ${status === 'active' ? 'border-[#C76F3D]/40 bg-[#f5f4ff]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusDot}`} />
          <span className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wide">Step {number}</span>
          <span className="text-xs font-semibold text-[rgba(6,3,43,0.90)]">{title}</span>
        </div>
        {cta && (
          <a href={cta.href}
            className={`rounded px-3 py-1 text-[10px] font-semibold transition-colors flex-shrink-0 ${
              cta.primary
                ? 'bg-[#06032B] text-white hover:bg-[#1a1756]'
                : 'border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.03)]'
            }`}>
            {cta.label} →
          </a>
        )}
      </div>
      <div className="pl-5 text-[10px] text-[rgba(6,3,43,0.52)] space-y-0.5">{children}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props { userEmail: string; userRole: string; }

export function CompanyWorkspacePanel({ userEmail, userRole }: Props) {
  const [tenants, setTenants]           = useState<TenantOption[]>([]);
  const [tenantCode, setTenantCode]     = useState('');
  const [period, setPeriod]             = useState('2026-Q1');
  const [workspace, setWorkspace]       = useState<WorkspaceData | null>(null);
  const [loading, setLoading]           = useState(false);
  const isOp001                         = tenantCode === 'OP-001';

  // Workforce baseline form state (Task 2)
  const [baselineWorkers, setBaselineWorkers] = useState('');
  const [baselinePeriod, setBaselinePeriod]   = useState('');
  const [baselineError, setBaselineError]     = useState<string | null>(null);
  const [baselineSuccess, setBaselineSuccess] = useState(false);
  const [baselineLoading, setBaselineLoading] = useState(false);

  // Load tenant list
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok) setTenants(d.tenants ?? []);
      })
      .catch(() => {});
  }, []);

  // Load workspace when tenant+period changes
  const loadWorkspace = useCallback(() => {
    if (!tenantCode) { setWorkspace(null); return; }
    setLoading(true);
    fetch(`/api/admin/company-workspace?tenantCode=${encodeURIComponent(tenantCode)}&reportingPeriod=${encodeURIComponent(period)}`, { credentials: 'include' })
      .then(r => r.json())
      .then((d: WorkspaceData) => setWorkspace(d))
      .catch(() => setWorkspace({ ok: false, error: 'Errore di caricamento' } as WorkspaceData))
      .finally(() => setLoading(false));
  }, [tenantCode, period]);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  const w = workspace?.ok ? workspace : null;

  async function handleBaselineSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!w) return;
    setBaselineError(null);
    setBaselineSuccess(false);
    const workers = Number(baselineWorkers);
    const bp = (baselinePeriod.trim() || period).trim();
    if (!Number.isInteger(workers) || workers < 10) {
      setBaselineError('Il numero di lavoratori deve essere un intero ≥ 10.');
      return;
    }
    setBaselineLoading(true);
    try {
      const res = await fetch('/api/admin/workforce-baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId: w.tenant.id, reportingPeriod: bp, totalWorkers: workers }),
      });
      const data = await res.json();
      if (!res.ok) { setBaselineError((data as { error?: string }).error ?? 'Errore durante il salvataggio.'); return; }
      setBaselineSuccess(true);
      setBaselineWorkers('');
      setBaselinePeriod('');
      loadWorkspace();
    } catch {
      setBaselineError('Errore di rete — riprova.');
    } finally {
      setBaselineLoading(false);
    }
  }
  const tcEnc = encodeURIComponent(tenantCode);
  const rpEnc = encodeURIComponent(period);

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Spazio azienda</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Gestisci il flusso pilot: Data Intake, Assisted Ingestion, Review, Scoring e Decision Pack.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
        </div>
      </div>

      {/* Selector */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Azienda</p>
          <select value={tenantCode} onChange={e => setTenantCode(e.target.value)}
            className="rounded border border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D] min-w-[200px]">
            <option value="">— Seleziona azienda —</option>
            {tenants.map(t => (
              <option key={t.tenantCode} value={t.tenantCode}>{t.tenantCode} — {t.companyName}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Reporting Period</p>
          <input value={period} onChange={e => setPeriod(e.target.value)}
            placeholder="2026-Q1"
            className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D] w-28" />
        </div>
        <button onClick={loadWorkspace} disabled={!tenantCode || loading}
          className="rounded border border-[rgba(6,3,43,0.14)] px-3 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.03)] disabled:opacity-40 transition-colors">
          ↻ Aggiorna
        </button>
        <a href="/admin/tenants"
          className="text-[10px] text-[#C76F3D] underline underline-offset-2 hover:text-[#4a41d4] pb-1">
          + Crea azienda
        </a>
      </div>

      {/* OP-001 synthetic warning */}
      {isOp001 && (
        <div className="rounded-lg border border-amber-300 bg-[rgba(217,154,43,0.08)] px-4 py-2.5 text-xs text-[#8A5A00] font-medium">
          OP-001 è un ambiente demo synthetic. Non usare per dati reali.
        </div>
      )}

      {/* Empty state */}
      {!tenantCode && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-5 py-10 text-center text-sm text-[rgba(6,3,43,0.40)]">
          Seleziona un&apos;azienda per iniziare.
        </div>
      )}

      {/* Loading */}
      {loading && tenantCode && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-4 text-xs text-[rgba(6,3,43,0.52)] flex gap-2">
          <span className="animate-spin">⏳</span> Caricamento stato pilot…
        </div>
      )}

      {/* Error */}
      {workspace && !workspace.ok && !loading && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-2.5 text-xs text-[#9E3B2F]">
          ⚠ {workspace.error ?? 'Errore caricamento workspace'}
        </div>
      )}

      {/* Workspace content */}
      {w && !loading && (
        <>
          {/* Summary bar */}
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{w.tenant.companyName}</p>
              <p className="text-[10px] font-mono text-[rgba(6,3,43,0.40)]">{w.tenant.tenantCode} · {w.reportingPeriod}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge label={PILOT_STATUS_LABEL[w.pilotStatus] ?? w.pilotStatus} cls={PILOT_STATUS_CLS[w.pilotStatus] ?? ''} />
              {w.workforce.totalWorkers !== null && (
                <Badge label={`${w.workforce.totalWorkers} workers`} cls="bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]" />
              )}
            </div>
          </div>

          {/* Recommended next action */}
          {w.recommendedNextAction && (
            <div className="rounded-lg border border-[#C76F3D]/30 bg-[#C76F3D]/5 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold text-[#C76F3D] uppercase tracking-wide mb-0.5">Prossimo passo</p>
                <p className="text-sm font-semibold text-[rgba(6,3,43,0.90)]">{w.recommendedNextAction.label}</p>
              </div>
              <a href={w.recommendedNextAction.href}
                className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#4a41d4] transition-colors flex-shrink-0">
                {w.recommendedNextAction.label} →
              </a>
            </div>
          )}

          {/* 7-Step pilot progress */}
          <div className="space-y-2">

            {/* Step 1 — Azienda & Workforce */}
            <StepCard
              number={1} title="Azienda & Workforce"
              status={w.workforce.exists ? 'complete' : 'warning'}
              cta={{ label: 'Gestisci azienda', href: '/admin/tenants' }}>
              {w.workforce.exists
                ? <><span className="text-green-600 font-medium">✓ Baseline presente</span>{w.workforce.totalWorkers !== null && ` · ${w.workforce.totalWorkers} lavoratori`}</>
                : <span className="text-[#D99A2B]">⚠ Workforce baseline mancante — imposta il numero di lavoratori prima di procedere.</span>
              }
            </StepCard>

            {/* Workforce baseline inline form — visible only when baseline is missing */}
            {!w.workforce.exists && (
              <form onSubmit={handleBaselineSubmit}
                className="rounded-lg border border-[rgba(217,154,43,0.28)] bg-[rgba(217,154,43,0.05)] px-4 py-3.5 space-y-3">
                <p className="text-[11px] font-semibold text-[#8A5A00]">Imposta Baseline Forza Lavoro</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Lavoratori totali (≥ 10)</p>
                    <input
                      type="number"
                      min={10}
                      step={1}
                      required
                      value={baselineWorkers}
                      onChange={(e) => { setBaselineWorkers(e.target.value); setBaselineSuccess(false); setBaselineError(null); }}
                      placeholder="Es. 120"
                      className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-[#D99A2B] w-28"
                    />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Reporting Period</p>
                    <input
                      type="text"
                      value={baselinePeriod}
                      onChange={(e) => setBaselinePeriod(e.target.value)}
                      placeholder={period}
                      className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-[#D99A2B] w-28"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={baselineLoading || !baselineWorkers}
                    className="rounded bg-[#8A5A00] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#5C3509] disabled:opacity-40 transition-colors">
                    {baselineLoading ? 'Salvataggio…' : 'Salva baseline'}
                  </button>
                </div>
                {baselineError && (
                  <p className="text-[11px] text-[#9E3B2F]">⚠ {baselineError}</p>
                )}
                {baselineSuccess && (
                  <p className="text-[11px] text-green-700 font-medium">✓ Baseline salvata. Aggiornamento in corso…</p>
                )}
              </form>
            )}

            {/* Step 2 — Data Intake */}
            <StepCard
              number={2} title="Data Intake"
              status={w.latestBatch ? 'complete' : w.pilotStatus === 'not_started' ? 'active' : 'pending'}
              cta={{ label: 'Carica dati', href: `/admin/data-intake?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`, primary: w.pilotStatus === 'not_started' }}>
              {w.latestBatch
                ? <>
                    <span className="text-green-600 font-medium">✓ Batch creato</span>
                    {' · '}{w.latestBatch.rowCount} righe
                    {' · '}{ts(w.latestBatch.createdAt)}
                    {' · '}<Badge label={w.latestBatch.status} cls="bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]" />
                    {w.latestBatch.hasFinancialMetadata && <>{' · '}<span className="text-[#C76F3D]">B11.3 metadata ✓</span></>}
                  </>
                : <span className="text-[rgba(6,3,43,0.40)]">Nessun batch per questo periodo.</span>
              }
            </StepCard>

            {/* Step 3 — UEF Candidates */}
            <StepCard
              number={3} title="Assisted Ingestion / Candidati UEF"
              status={
                !w.latestBatch ? 'pending'
                : w.uef && w.uef.total > 0 ? 'complete'
                : 'active'
              }
              cta={w.latestBatch ? { label: 'Apri UEF Review', href: `/admin/uef-review?batchId=${w.latestBatch.id}` } : undefined}>
              {!w.latestBatch
                ? <span className="text-[rgba(6,3,43,0.28)]">Attesa batch.</span>
                : w.uef && w.uef.total > 0
                ? <><span className="text-green-600 font-medium">✓ {w.uef.total} candidati generati</span></>
                : <span className="text-[#D99A2B]">⚠ Candidati non ancora generati — apri UEF Review e clicca &quot;Generate candidates&quot;.</span>
              }
            </StepCard>

            {/* Step 4 — Review & Enrichment */}
            <StepCard
              number={4} title="Review & Enrichment"
              status={
                !w.uef || w.uef.total === 0 ? 'pending'
                : w.uef.pendingReview > 0 || w.uef.needsEnrichment > 0 ? 'active'
                : 'complete'
              }
              cta={w.latestBatch ? { label: 'Completa review', href: `/admin/uef-review?batchId=${w.latestBatch.id}`, primary: w.uef ? (w.uef.pendingReview > 0 || w.uef.needsEnrichment > 0) : false } : undefined}>
              {!w.uef || w.uef.total === 0
                ? <span className="text-[rgba(6,3,43,0.28)]">Attesa candidati.</span>
                : <>
                    {w.uef.approved > 0 && <span className="text-green-600 font-medium mr-3">✓ {w.uef.approved} approvati</span>}
                    {w.uef.pendingReview > 0 && <span className="text-[#D99A2B] mr-3">⏳ {w.uef.pendingReview} in attesa</span>}
                    {w.uef.rejected > 0 && <span className="text-[#9E3B2F] mr-3">✕ {w.uef.rejected} rifiutati</span>}
                    {w.uef.needsInfo > 0 && <span className="text-purple-600 mr-3">? {w.uef.needsInfo} needs info</span>}
                    {w.uef.needsEnrichment > 0 && <span className="text-[#D99A2B] mr-3">⚠ {w.uef.needsEnrichment} enrichment incompleto</span>}
                  </>
              }
            </StepCard>

            {/* Step 5 — Live Scoring */}
            <StepCard
              number={5} title="Live Scoring"
              status={
                !w.uef || w.uef.approved === 0 ? 'pending'
                : w.scoring ? 'complete'
                : 'active'
              }
              cta={
                w.scoring
                  ? undefined
                  : w.latestBatch
                  ? { label: 'Esegui scoring', href: `/admin/uef-review?batchId=${w.latestBatch.id}`, primary: !w.scoring && w.uef ? w.uef.approved > 0 && w.uef.pendingReview === 0 : false }
                  : undefined
              }>
              {w.scoring
                ? <>
                    <span className="text-green-600 font-medium">✓ KORA Index: <strong className="text-[#C76F3D]">{w.scoring.koraIndex}</strong></span>
                    {' · '}Confidence: {w.scoring.confidenceScore}%
                    {' · '}<Badge label={w.scoring.safeguard} cls={SAFEGUARD_CLS[w.scoring.safeguard] ?? ''} />
                    {w.scoring.activationRate !== null && <>{' · '}AR: {Math.round((w.scoring.activationRate) * 100)}%</>}
                  </>
                : w.uef && w.uef.approved > 0
                ? <span className="text-[#D99A2B]">⚠ {w.uef.approved} record approvati — scoring non ancora eseguito.</span>
                : <span className="text-[rgba(6,3,43,0.28)]">Attesa approvazione UEF.</span>
              }
            </StepCard>

            {/* Step 6 — Decision Pack */}
            <StepCard
              number={6} title="Decision Pack"
              status={
                !w.scoring ? 'pending'
                : w.decisionPack ? (w.decisionPack.status === 'exported' ? 'complete' : 'active')
                : 'active'
              }
              cta={
                w.scoring
                  ? { label: w.decisionPack ? 'Apri preview' : 'Genera preview', href: `/api/admin/decision-pack/preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`, primary: true }
                  : undefined
              }>
              {!w.scoring
                ? <span className="text-[rgba(6,3,43,0.28)]">Attesa scoring.</span>
                : w.decisionPack
                ? <>
                    <Badge label={w.decisionPack.status} cls={DP_CLS[w.decisionPack.status] ?? ''} />
                    {' · '}{w.decisionPack.versionId.slice(0, 24)}…
                    {' · '}{ts(w.decisionPack.createdAt)}
                    <span className="ml-2">
                      <a href={w.decisionPack.previewUrl} className="text-[#C76F3D] underline mr-2" target="_blank" rel="noopener noreferrer">Preview</a>
                      <a href={w.decisionPack.pdfUrl} className="text-[#C76F3D] underline" target="_blank" rel="noopener noreferrer">PDF</a>
                    </span>
                  </>
                : <span className="text-[#D99A2B]">Scoring completato — apri preview per generare il Decision Pack.</span>
              }
            </StepCard>

            {/* Step 7 — Data Lifecycle */}
            <StepCard
              number={7} title="Data Lifecycle"
              status="pending"
              cta={{ label: 'Apri Data Lifecycle', href: '/admin/data-lifecycle' }}>
              <a href="/admin/data-lifecycle" className="text-[#C76F3D] underline">
                Gestisci batch, archivio ed erasure readiness
              </a>
            </StepCard>

          </div>

          {/* Footer */}
          <div className="text-[10px] text-[rgba(6,3,43,0.40)] text-center pt-2">
            KORA Foundation Light · Pilot Operator View · pre_empirical_calibration · synthetic_demo_data: {isOp001 ? 'true' : 'false'}
          </div>
        </>
      )}
    </div>
  );
}
