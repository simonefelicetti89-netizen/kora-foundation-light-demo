'use client';

// app/admin/data-intake/_components/DataIntakeStudio.tsx
// KORA Data Intake Studio — KORA_ADMIN client component.
//
// Fetches /api/admin/data-intake/preview for batch/PII/Eligibility/UEF preview data.
// Calls /api/admin/operator-flow GET/POST for run actions and result snapshot.
// Links to Decision Pack preview and PDF download.
//
// No file upload. No CSV/XLSX input. No scoring recalculation. No PII exposed.

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

// ── API response types ─────────────────────────────────────────────────────

interface BatchRecord {
  recordId: string;
  rowIndex: number;
  nomeInitiativa: string;
  categoria: string;
  tipo: string;
  partecipanti: number | null;
  detectedRecordType: string;
  eligibilityStatus: string;
}

interface PiiGuardStatus {
  checked:       boolean;
  piiFound:      boolean;
  recordCount:   number;
  policy:        string;
  totalFindings: number;
  status:        string;
  summary: { total: number; highSeverityCount: number; byRiskType: Record<string,number>; fieldPaths: string[] };
}

interface EligRecord {
  recordId: string; nomeInitiativa: string; status: string;
  confidence: number; impactTreatment: string; budgetTreatment: string; reason: string;
}

interface UefRecord {
  recordId: string; rawName: string; eligibility: string; actionFamily: string;
  eventNature: string; approvedForScoring: boolean; approvedForBTI: boolean;
  confidence: number; impactTreatment: string;
}

interface ResultSnapshot {
  koraIndex: number; safeguardStatus: string; confidenceScore: number;
  activationRate: number; meaningfulActivationRate: number;
  calibrationStatus: string; methodologyVersionId: string;
  decisionPack: { id: string; versionId: string; status: string };
}

interface PreviewData {
  meta: { tenantCode: string; reportingPeriod: string; generatedAt: string };
  batch: { totalCount: number; batchLabel: string; records: BatchRecord[] };
  piiGuard: PiiGuardStatus;
  eligibility: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number; records: EligRecord[] };
  uefPreview: { total: number; approvedForScoring: number; approvedForBTI: number; categoryDistribution: Record<string,number>; records: UefRecord[] };
  resultSnapshot: ResultSnapshot | null;
}

interface OperatorResult {
  ok: boolean;
  scoring?: { kora_index_value?: number; safeguard_status?: string; confidence_score?: number; activation_rate?: number; meaningful_activation_rate?: number };
  kora_index?: { value?: number; safeguard?: string; confidence?: number; activation_rate?: number; meaningful_activation_rate?: number };
  decision_pack?: { version_id?: string; status?: string };
  error?: string;
}

// B4.2 — Accept batch result type
interface AcceptResult {
  ok: boolean;
  batchId?: string;
  tenantCode?: string;
  reportingPeriod?: string;
  rowCount?: number;
  eligibilitySummary?: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number };
  batchStatus?: string;
  message?: string;
  warnings?: string[];
  forbiddenHeaders?: string[];
  findings?: Array<{ rowIndex: number; fieldPath: string; riskType: string; severity: string }>;
  error?: string;
  note?: string;
}

// B4.1 — CSV dry-run types
interface DryRunFinding {
  rowIndex: number; fieldPath: string; riskType: string; severity: string;
  // NEVER includes value
}
interface DryRunResult {
  ok: boolean;
  mode?: string;
  dryRunNote?: string;
  rowCount?: number;
  piiStatus?: 'passed' | 'rejected';
  eligibilityPreview?: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number };
  sampleRows?: Array<Record<string, string | number>>;
  warnings?: string[];
  forbiddenHeaders?: string[];
  findings?: DryRunFinding[];
  error?: string;
  note?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined) { return n != null ? `${Math.round(n * 100)}%` : '—'; }
function fmt(n: number | null | undefined, d = 1) { return n != null ? n.toFixed(d) : '—'; }

const ELIGIBILITY_COLOR: Record<string, string> = {
  eligible:        'bg-green-100 text-green-800 border-green-200',
  limited:         'bg-amber-100 text-amber-800 border-amber-200',
  blocked:         'bg-red-100 text-red-800 border-red-200',
  review_required: 'bg-purple-100 text-purple-800 border-purple-200',
};
const SAFEGUARD_COLOR: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border-green-200',
  WARNING: 'bg-amber-100 text-amber-800 border-amber-200',
  FLAGGED: 'bg-red-100 text-red-800 border-red-200',
};
function badge(val: string, colorMap: Record<string,string>, fallback = 'bg-slate-100 text-slate-600 border-slate-200') {
  const cls = colorMap[val] ?? fallback;
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${cls}`}>{val}</span>;
}

// ── Flow timeline phases ────────────────────────────────────────────────────

const FLOW_PHASES = [
  { id: 'batch',       label: 'Synthetic Batch',   icon: '📦' },
  { id: 'pii',         label: 'PII Guard',          icon: '🛡️' },
  { id: 'eligibility', label: 'Eligibility Gate',   icon: '⚙️' },
  { id: 'uef',         label: 'UEF Preview',        icon: '📋' },
  { id: 'scoring',     label: 'Scoring Run',        icon: '📊' },
  { id: 'decpack',     label: 'Decision Pack',      icon: '🗂️' },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface Props { userEmail: string; userRole: string; }

// ── Main component ─────────────────────────────────────────────────────────

// B9: tenant option shape for selector
interface TenantOption { id: string; tenantCode: string; companyName: string; }

export function DataIntakeStudio({ userEmail, userRole }: Props) {
  // B9.2: read query params for pre-selection (e.g. from /admin/tenants CTA)
  const searchParams = useSearchParams();

  // B9: tenant selector — defaults to OP-001 for backwards compat
  const [tenantList, setTenantList]       = useState<TenantOption[]>([]);
  const [TENANT, setTENANT]               = useState(() => searchParams?.get('tenantCode') ?? 'OP-001');
  const [PERIOD, setPERIOD]               = useState(() => searchParams?.get('reportingPeriod') ?? '2026-Q1');

  // Load available tenants on mount
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok && d.tenants) setTenantList(d.tenants);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [preview, setPreview]     = useState<PreviewData | null>(null);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [opStatus, setOpStatus]   = useState<'idle'|'running'|'reading'|'done'|'error'>('idle');
  const [opResult, setOpResult]   = useState<OperatorResult | null>(null);
  const [opErr, setOpErr]         = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // B4.1 — CSV dry-run state
  const [csvFile, setCsvFile]           = useState<File | null>(null);
  const [csvStatus, setCsvStatus]       = useState<'idle'|'loading'|'passed'|'rejected'|'error'>('idle');
  const [csvResult, setCsvResult]       = useState<DryRunResult | null>(null);

  // B4.2 — Accept batch state
  const [acceptStatus, setAcceptStatus] = useState<'idle'|'loading'|'created'|'rejected'|'error'>('idle');
  const [acceptResult, setAcceptResult] = useState<AcceptResult | null>(null);

  // loading is derived — true only while we have neither data nor an error
  const loading = !preview && !loadErr;

  // All setState calls inside .then()/.catch() — no synchronous setState in effect.
  useEffect(() => {
    let active = true;
    fetch(
      `/api/admin/data-intake/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`,
      { credentials: 'include' },
    )
      .then(res => {
        if (!res.ok) return Promise.reject(new Error(`HTTP ${res.status}`));
        return res.json() as Promise<PreviewData>;
      })
      .then(data => { if (active) { setPreview(data); setLoadErr(null); } })
      .catch((e: Error) => { if (active) setLoadErr(e.message); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function refreshPreview() {
    setPreview(null);   // clear data so loading indicator shows during refresh
    setLoadErr(null);
    setRefreshKey(k => k + 1);
  }

  async function handleRun() {
    setOpStatus('running'); setOpErr(null); setOpResult(null);
    try {
      const res  = await fetch('/api/admin/operator-flow', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT, reportingPeriod: PERIOD }),
      });
      const data = await res.json() as OperatorResult;
      if (!res.ok || !data.ok) { setOpErr(data.error ?? `HTTP ${res.status}`); setOpStatus('error'); return; }
      setOpResult(data); setOpStatus('done');
      refreshPreview();
    } catch (e) { setOpErr(e instanceof Error ? e.message : String(e)); setOpStatus('error'); }
  }

  async function handleRead() {
    setOpStatus('reading'); setOpErr(null);
    try {
      const res  = await fetch(`/api/admin/operator-flow?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`, { credentials: 'include' });
      const data = await res.json() as OperatorResult;
      if (!res.ok) { setOpErr(`HTTP ${res.status}`); setOpStatus('error'); return; }
      setOpResult(data); setOpStatus('done');
      refreshPreview();
    } catch (e) { setOpErr(e instanceof Error ? e.message : String(e)); setOpStatus('error'); }
  }

  // B4.2 — Accept batch: sends CSV again (server reruns all checks — never trusts dry-run)
  async function handleAcceptBatch() {
    if (!csvFile) return;
    setAcceptStatus('loading'); setAcceptResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      const res  = await fetch('/api/admin/data-intake/accept', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as AcceptResult;
      setAcceptResult(data);
      setAcceptStatus(data.ok ? 'created' : 'rejected');
    } catch (e) {
      setAcceptResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setAcceptStatus('error');
    }
  }

  // B4.1 — CSV dry-run handler
  async function handleValidateCsv() {
    if (!csvFile) return;
    setCsvStatus('loading'); setCsvResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      const res  = await fetch('/api/admin/data-intake/upload-preview', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as DryRunResult;
      setCsvResult(data);
      setCsvStatus(data.ok ? 'passed' : 'rejected');
    } catch (e) {
      setCsvResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setCsvStatus('error');
    }
  }

  const snapshot = opResult?.scoring
    ? { ki: opResult.scoring.kora_index_value, sf: opResult.scoring.safeguard_status, cs: (opResult.scoring.confidence_score ?? 0) / 100, ar: opResult.scoring.activation_rate, mar: opResult.scoring.meaningful_activation_rate }
    : opResult?.kora_index
    ? { ki: opResult.kora_index.value, sf: opResult.kora_index.safeguard, cs: opResult.kora_index.confidence, ar: opResult.kora_index.activation_rate, mar: opResult.kora_index.meaningful_activation_rate }
    : preview?.resultSnapshot
    ? { ki: preview.resultSnapshot.koraIndex, sf: preview.resultSnapshot.safeguardStatus, cs: preview.resultSnapshot.confidenceScore, ar: preview.resultSnapshot.activationRate, mar: preview.resultSnapshot.meaningfulActivationRate }
    : null;

  const phaseStatus = (id: string): string => {
    if (!preview) return 'not-run';
    if (id === 'batch')       return 'ready';
    if (id === 'pii')         return preview.piiGuard.status === 'passed' ? 'passed' : 'review';
    if (id === 'eligibility') return 'passed';
    if (id === 'uef')         return 'passed';
    if (id === 'scoring')     return snapshot ? 'completed' : 'not-run';
    if (id === 'decpack')     return snapshot ? 'completed' : 'not-run';
    return 'not-run';
  };
  const PHASE_BADGE: Record<string, string> = {
    ready:     'bg-blue-100 text-blue-700 border-blue-200',
    passed:    'bg-green-100 text-green-700 border-green-200',
    completed: 'bg-[#06032B] text-white border-[#06032B]',
    review:    'bg-amber-100 text-amber-700 border-amber-200',
    'not-run': 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const PHASE_LABEL: Record<string, string> = {
    ready: 'Ready', passed: 'Passed', completed: 'Completed', review: 'Review required', 'not-run': 'Not run yet',
  };

  const isOp = opStatus === 'running' || opStatus === 'reading';

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-5">

      {/* ── A. HEADER ── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#6156F5]">KORA</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Data Intake Studio</h1>
          <p className="text-sm text-white/45 mt-0.5">Synthetic Live v1 · {TENANT} · {PERIOD}</p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1">
          <span className="rounded border border-[#6156F5]/60 bg-[#6156F5]/15 px-2 py-0.5 text-xs font-semibold text-[#9d97ff]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <span className="rounded border border-[#C8FF47]/40 bg-[#C8FF47]/10 px-2 py-0.5 text-xs font-semibold text-[#d4ff6b]">Synthetic data only</span>
        </div>
      </div>

      {/* ── B4.1. CSV DRY-RUN PREVIEW ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Live Intake Preview — dry run</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Validate a CSV file against KORA intake rules. No data is stored.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">Dry-run only: no data is stored.</span>
            <span className="rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">PII direct identifiers are strictly rejected.</span>
          </div>
        </div>

        {/* File input + action */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".csv"
            onChange={e => {
              setCsvFile(e.target.files?.[0] ?? null);
              setCsvStatus('idle'); setCsvResult(null);
              setAcceptStatus('idle'); setAcceptResult(null);
            }}
            className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-300 file:bg-slate-50 file:text-xs file:font-medium file:text-slate-700 file:cursor-pointer hover:file:bg-slate-100"
          />
          <button
            onClick={handleValidateCsv}
            disabled={!csvFile || csvStatus === 'loading'}
            className="rounded-lg bg-slate-800 text-white px-4 py-1.5 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {csvStatus === 'loading' ? '⏳ Validating…' : '✓ Validate CSV'}
          </button>
          {csvFile && <span className="text-[10px] text-slate-400 font-mono">{csvFile.name} · {(csvFile.size / 1024).toFixed(0)} KB</span>}
        </div>

        {/* Result: passed */}
        {csvStatus === 'passed' && csvResult?.ok && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-green-700">✓ File validation passed</span>
              <span className="rounded border border-green-200 bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">PII: passed</span>
              <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-mono text-slate-600">{csvResult.rowCount} rows</span>
            </div>
            {csvResult.eligibilityPreview && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-green-200 bg-white px-2 py-0.5 text-green-700 font-medium">Eligible: {csvResult.eligibilityPreview.eligible}</span>
                <span className="rounded border border-amber-200 bg-white px-2 py-0.5 text-amber-700 font-medium">Limited: {csvResult.eligibilityPreview.limited}</span>
                <span className="rounded border border-red-200 bg-white px-2 py-0.5 text-red-700 font-medium">Blocked: {csvResult.eligibilityPreview.blocked}</span>
                {csvResult.eligibilityPreview.reviewRequired > 0 && (
                  <span className="rounded border border-purple-200 bg-white px-2 py-0.5 text-purple-700 font-medium">Review required: {csvResult.eligibilityPreview.reviewRequired}</span>
                )}
              </div>
            )}
            {csvResult.sampleRows && csvResult.sampleRows.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Sample rows (max 5)</p>
                <div className="space-y-0.5">
                  {csvResult.sampleRows.map((row, i) => (
                    <div key={i} className="text-[10px] font-mono text-slate-500 bg-white border border-slate-100 rounded px-2 py-1 truncate">
                      {Object.entries(row).slice(0, 6).map(([k, v]) => `${k}=${v}`).join(' · ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {csvResult.warnings && csvResult.warnings.length > 0 && (
              <div className="space-y-0.5">
                {csvResult.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-700">⚠ {w}</p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-slate-400 border-t border-green-100 pt-2">
              {csvResult.dryRunNote} · Live scoring remains locked until B4.2/B5.
            </p>
          </div>
        )}

        {/* B4.2 — Accept batch section (shown after dry-run passed) */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Create Intake Batch</p>
            <p className="text-[10px] text-slate-400">Only PII-free / pseudonymized files can be persisted. Scoring is not executed in B4.2.</p>
            <button
              onClick={handleAcceptBatch}
              className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
            >
              ↓ Create intake batch
            </button>
          </div>
        )}

        {/* Accept: loading */}
        {acceptStatus === 'loading' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-500">
            ⏳ Creating batch — re-validating file server-side…
          </div>
        )}

        {/* Accept: created */}
        {acceptStatus === 'created' && acceptResult?.ok && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-green-700">✓ Batch created</span>
              <span className="rounded border border-green-200 bg-white px-2 py-0.5 text-[10px] font-mono text-green-700">{acceptResult.batchId?.slice(0, 8)}…</span>
              <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">status: {acceptResult.batchStatus}</span>
            </div>
            {acceptResult.eligibilitySummary && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-green-200 bg-white px-2 py-0.5 text-green-700 font-medium">Eligible: {acceptResult.eligibilitySummary.eligible}</span>
                <span className="rounded border border-amber-200 bg-white px-2 py-0.5 text-amber-700 font-medium">Limited: {acceptResult.eligibilitySummary.limited}</span>
                <span className="rounded border border-red-200 bg-white px-2 py-0.5 text-red-700 font-medium">Blocked: {acceptResult.eligibilitySummary.blocked}</span>
                <span className="rounded border border-slate-200 bg-white px-2 py-0.5 text-slate-600 font-medium">Total: {acceptResult.rowCount}</span>
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-[10px] text-green-700 font-medium">Batch created for review. Scoring remains locked until B5.</p>
              <p className="text-[10px] text-slate-400">Scoring is not executed in B4.2.</p>
            </div>
            {/* B9.2: next-step CTA with batchId query param */}
            {acceptResult.batchId && (
              <div className="pt-1 border-t border-green-100">
                <a
                  href={`/admin/uef-review?batchId=${encodeURIComponent(acceptResult.batchId)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
                >
                  Go to UEF Review →
                </a>
              </div>
            )}
          </div>
        )}

        {/* Accept: rejected (PII found on re-run) */}
        {acceptStatus === 'rejected' && acceptResult && !acceptResult.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-red-700">⚠ {acceptResult.error ?? 'Batch rejected during server-side re-validation.'}</p>
            {acceptResult.forbiddenHeaders && acceptResult.forbiddenHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-red-600 font-medium">Forbidden headers:</span>
                {acceptResult.forbiddenHeaders.map(h => (
                  <span key={h} className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-red-700">{h}</span>
                ))}
              </div>
            )}
            {acceptResult.findings && acceptResult.findings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 mb-1">PII findings (field paths only — no values):</p>
                {acceptResult.findings.slice(0, 8).map((f, i) => (
                  <p key={i} className="text-[10px] font-mono text-red-600">Row {f.rowIndex} · {f.fieldPath} · {f.riskType} · {f.severity}</p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-red-600 border-t border-red-100 pt-1">
              {acceptResult.note ?? 'No data has been stored.'}
            </p>
          </div>
        )}

        {/* Accept: error */}
        {acceptStatus === 'error' && acceptResult && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            ⚠ {acceptResult.error ?? 'Unknown error during batch creation.'}
          </div>
        )}

        {/* Result: rejected */}
        {csvStatus === 'rejected' && csvResult && !csvResult.ok && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-red-700">⚠ {csvResult.error ?? 'Batch rejected.'}</p>
            {csvResult.forbiddenHeaders && csvResult.forbiddenHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-red-600 font-medium">Forbidden headers:</span>
                {csvResult.forbiddenHeaders.map(h => (
                  <span key={h} className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-red-700">{h}</span>
                ))}
              </div>
            )}
            {csvResult.findings && csvResult.findings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-red-600 mb-1">PII findings (field paths only — no values shown):</p>
                <div className="space-y-0.5">
                  {csvResult.findings.slice(0, 10).map((f, i) => (
                    <p key={i} className="text-[10px] font-mono text-red-600">
                      Row {f.rowIndex} · {f.fieldPath} · {f.riskType} · {f.severity}
                    </p>
                  ))}
                  {csvResult.findings.length > 10 && (
                    <p className="text-[10px] text-red-500">…and {csvResult.findings.length - 10} more findings.</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-[10px] text-red-600 border-t border-red-100 pt-2">
              {csvResult.note ?? 'No data has been stored. Remove direct personal identifiers and re-submit.'}
            </p>
          </div>
        )}

        {/* Result: error */}
        {csvStatus === 'error' && csvResult && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            ⚠ {csvResult.error ?? 'Unknown error during validation.'}
          </div>
        )}
      </div>

      {/* ── B9. TENANT SELECTOR ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tenant</p>
          {tenantList.length > 0 ? (
            <select
              value={TENANT}
              onChange={e => {
                setTENANT(e.target.value);
                setPreview(null); setLoadErr(null); setOpResult(null);
                setAcceptResult(null); setAcceptStatus('idle');
                setCsvResult(null); setCsvStatus('idle');
              }}
              className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[160px]"
            >
              {tenantList.map(t => (
                <option key={t.tenantCode} value={t.tenantCode}>
                  {t.tenantCode} — {t.companyName}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={TENANT}
              onChange={e => setTENANT(e.target.value.toUpperCase())}
              placeholder="OP-001"
              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-36"
            />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Reporting Period</p>
          <input
            value={PERIOD}
            onChange={e => setPERIOD(e.target.value)}
            placeholder="2026-Q1"
            className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 w-28"
          />
        </div>
        <a href="/admin/tenants"
          className="text-[10px] text-[#6156F5] underline underline-offset-2 hover:text-[#4a41d4] pb-1.5">
          + Create tenant
        </a>
      </div>

      {/* ── B. FLOW TIMELINE ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Data Intake Flow</p>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {FLOW_PHASES.map((ph, i) => {
            const st = phaseStatus(ph.id);
            return (
              <div key={ph.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5 w-[90px]">
                  <div className="text-lg leading-none">{ph.icon}</div>
                  <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{ph.label}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${PHASE_BADGE[st]}`}>
                    {PHASE_LABEL[st]}
                  </span>
                </div>
                {i < FLOW_PHASES.length - 1 && (
                  <div className="flex-shrink-0 w-6 h-px bg-slate-200 mx-1 mt-[-18px]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-4 text-sm text-slate-500 flex gap-2 items-center">
          <span className="animate-spin">⏳</span> Caricamento preview…
        </div>
      )}
      {loadErr && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">⚠ {loadErr}</div>
      )}

      {preview && <>

        {/* ── C. BATCH PREVIEW ── */}
        <Section title="Synthetic Batch Preview" sub={`${preview.batch.totalCount} record sintetici · ${preview.batch.batchLabel}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  {['#','Iniziativa','Categoria','Tipo','Partecipanti','Eligibility'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.batch.records.map(rec => (
                  <tr key={rec.recordId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-400">{rec.rowIndex + 1}</td>
                    <td className="py-2 px-3 font-medium text-slate-700 max-w-[200px] truncate">{rec.nomeInitiativa}</td>
                    <td className="py-2 px-3 text-slate-500">{rec.categoria}</td>
                    <td className="py-2 px-3 text-slate-500">{rec.tipo}</td>
                    <td className="py-2 px-3 text-slate-600 text-right">{rec.partecipanti ?? '—'}</td>
                    <td className="py-2 px-3">{badge(rec.eligibilityStatus, ELIGIBILITY_COLOR)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Dati sintetici generati deterministicamente. Nessun dato reale o PII.</p>
        </Section>

        {/* ── D. PII GUARD ── */}
        <Section title="PII Guard" sub={`${preview.piiGuard.recordCount} record uploaded · policy: ${preview.piiGuard.policy}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
            <KPICard label="Checked" value={preview.piiGuard.checked ? '✓ Yes' : 'No'} accent />
            <KPICard label="PII Found" value={preview.piiGuard.piiFound ? '⚠ Yes' : '✓ No'} ok={!preview.piiGuard.piiFound} />
            <KPICard label="Findings" value={String(preview.piiGuard.totalFindings)} />
            <KPICard label="Status" value={preview.piiGuard.status === 'passed' ? '✓ Passed' : '⚠ Review'} ok={preview.piiGuard.status === 'passed'} />
          </div>
          <div className="rounded bg-[#f5f4ff] border border-[#c7c4f8] px-4 py-2.5 text-xs text-[#3d3a6a]">
            <strong>PII Guard</strong> è un livello di sicurezza tecnico, non un sostituto per la pseudonimizzazione all&apos;origine, il DPA o le clausole contrattuali.
            Sostituisce i valori PII rilevati con <code className="bg-white/60 px-1 rounded">[REDACTED_PII:TYPE]</code> — nessun valore viene mai salvato in audit o response.
          </div>
        </Section>

        {/* ── E. ELIGIBILITY GATE ── */}
        <Section title="Eligibility Gate" sub={`${preview.eligibility.total} record classificati`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <KPICard label="Eligible" value={String(preview.eligibility.eligible)} ok />
            <KPICard label="Limited" value={String(preview.eligibility.limited)} />
            <KPICard label="Blocked" value={String(preview.eligibility.blocked)} warn={preview.eligibility.blocked > 0} />
            <KPICard label="Review req." value={String(preview.eligibility.reviewRequired)} />
          </div>
          <div className="space-y-1.5">
            {preview.eligibility.records.map(r => (
              <div key={r.recordId} className="flex items-start gap-3 py-2 px-3 rounded border border-slate-100 bg-slate-50 text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 truncate block">{r.nomeInitiativa}</span>
                  <span className="text-slate-400">{r.impactTreatment} · conf {(r.confidence * 100).toFixed(0)}%</span>
                  {r.reason && <span className="block text-slate-400 italic truncate">{r.reason}</span>}
                </div>
                {badge(r.status, ELIGIBILITY_COLOR)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Eligibility Gate riusa <code>lib/kora-engine/eligibility-gate.ts</code> — nessuna logica duplicata.</p>
        </Section>

        {/* ── F. UEF PREVIEW ── */}
        <Section title="UEF Preview" sub={`${preview.uefPreview.total} UEF records · ${preview.uefPreview.approvedForScoring} approved for scoring`}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <KPICard label="Tot. UEF" value={String(preview.uefPreview.total)} />
            <KPICard label="→ Scoring" value={String(preview.uefPreview.approvedForScoring)} ok />
            <KPICard label="→ BTI Gov." value={String(preview.uefPreview.approvedForBTI)} />
          </div>
          <div className="mb-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Distribuzione categorie</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(preview.uefPreview.categoryDistribution).map(([cat, n]) => (
                <span key={cat} className="rounded border border-[#6156F5]/30 bg-[#f5f4ff] px-2 py-0.5 text-xs text-[#4d48d0] font-medium">
                  {cat}: {n}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Iniziativa','Categoria','Event Nature','Eligibility','Impact Treatment','Conf.','Scoring'].map(h => (
                    <th key={h} className="text-left py-2 px-2.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.uefPreview.records.map(r => (
                  <tr key={r.recordId} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-2.5 font-medium text-slate-700 max-w-[160px] truncate">{r.rawName}</td>
                    <td className="py-2 px-2.5 text-slate-500">{r.actionFamily}</td>
                    <td className="py-2 px-2.5 text-slate-500">{r.eventNature}</td>
                    <td className="py-2 px-2.5">{badge(r.eligibility, ELIGIBILITY_COLOR)}</td>
                    <td className="py-2 px-2.5 text-slate-500 text-[10px]">{r.impactTreatment}</td>
                    <td className="py-2 px-2.5 text-slate-500 text-right">{(r.confidence * 100).toFixed(0)}%</td>
                    <td className="py-2 px-2.5">
                      <span className={`text-xs font-semibold ${r.approvedForScoring ? 'text-green-700' : 'text-slate-400'}`}>
                        {r.approvedForScoring ? '✓' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── G. ACTIONS ── */}
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</p>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleRun} disabled={isOp}
              className="bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1a1756] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {opStatus === 'running' ? '⏳ Esecuzione…' : '▶ Run operator flow'}
            </button>
            <button onClick={handleRead} disabled={isOp}
              className="border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
              {opStatus === 'reading' ? '⏳ Lettura…' : '↻ Read current result'}
            </button>
            <a href={`/api/admin/decision-pack/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`}
              target="_blank" rel="noopener noreferrer"
              className="border border-[#6156F5] text-[#6156F5] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#f5f4ff] transition-colors">
              ↗ Decision Pack Preview
            </a>
            <a href={`/api/admin/decision-pack/pdf?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`}
              download={`kora-decision-pack-${TENANT}-${PERIOD}.pdf`}
              className="bg-[#6156F5] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#4d48d0] transition-colors">
              ↓ Download Decision Pack PDF
            </a>
          </div>
          {opStatus === 'error' && opErr && (
            <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">⚠ {opErr}</div>
          )}
        </div>

        {/* ── H. RESULT SNAPSHOT ── */}
        {snapshot && (
          <Section title="Result Snapshot" sub={`${TENANT} · ${PERIOD} · dati live persistiti`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-3">
              <div className="col-span-2 sm:col-span-1 rounded-lg bg-[#06032B] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">KORA Index</p>
                <p className="text-4xl font-bold text-white tracking-tight leading-none">{fmt(snapshot.ki)}</p>
                <p className="text-[10px] text-white/30 mt-2 font-mono">pre_empirical_calibration</p>
              </div>
              <KPICard label="Activation Safeguard" value={snapshot.sf ?? '—'} raw>
                {snapshot.sf && <span className={`rounded border px-2 py-0.5 text-xs font-bold mt-1 inline-block ${SAFEGUARD_COLOR[snapshot.sf] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>{snapshot.sf}</span>}
              </KPICard>
              <KPICard label="Confidence Score" value={pct(snapshot.cs)} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPICard label="Activation Rate"     value={pct(snapshot.ar)} />
              <KPICard label="Meaningful AR"        value={pct(snapshot.mar)} />
              {preview.resultSnapshot && <>
                <KPICard label="Decision Pack" value={preview.resultSnapshot.decisionPack.status.toUpperCase()} />
                <KPICard label="Metodologia"   value="v0.1" />
              </>}
            </div>
          </Section>
        )}

        {/* ── I. SAFETY BOUNDARIES ── */}
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-3">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Safety Boundaries</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              'No real data', 'No file upload', 'No CSV/XLSX', 'N≥10 enforced',
              'PII Guard active', 'KORA_ADMIN only', 'No scoring recalculation',
              'Gate 3B required before real data',
            ].map(n => (
              <span key={n} className="text-[10px] border border-slate-200 bg-white rounded px-2 py-0.5 text-slate-500 font-medium">{n}</span>
            ))}
          </div>
        </div>

      </>}

    </div>
  );
}

// ── Layout sub-components ──────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-4 bg-[#6156F5] rounded-full flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide leading-none">{title}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function KPICard({ label, value, ok, warn, accent, raw, children }: {
  label: string; value?: string; ok?: boolean; warn?: boolean; accent?: boolean; raw?: boolean; children?: React.ReactNode;
}) {
  const valColor = ok ? 'text-green-700' : warn ? 'text-amber-700' : accent ? 'text-[#6156F5]' : 'text-slate-900';
  return (
    <div className="rounded border border-slate-200 bg-[#fafafa] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      {!raw && value && <p className={`text-base font-bold ${valColor} leading-tight`}>{value}</p>}
      {children}
    </div>
  );
}
