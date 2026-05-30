'use client';

// app/admin/operator/_components/OperatorConsole.tsx
// Client Component — KORA Admin Operator Console (functional polish).
// Consumes /api/admin/operator-flow (POST + GET) via fetch credentials: 'include'.
// No scoring logic, no persistence logic, no N≥10, no secret headers.

import { useState } from 'react';

// ── API response types ────────────────────────────────────────────────────────

interface AuditEvent {
  action: string;
  resource_type: string | null;
  created_at: string;
}

interface DecisionPackData {
  id?: string;
  version_id?: string;
  status?: string;
  created_at?: string;
  kora_index_result_id?: string | null;
}

// POST /api/admin/operator-flow response
interface RunResult {
  ok: boolean;
  tenant_code?: string;
  reporting_period?: string;
  batch_id?: string;
  scoring?: {
    mode?: string;
    kora_index_value?: number;
    safeguard_status?: string;
    confidence_score?: number;           // 0–100
    activation_rate?: number;            // 0–1
    meaningful_activation_rate?: number; // 0–1
  };
  persisted?: {
    kora_index_result_id?: string;
    activation_result_id?: string;
    confidence_result_id?: string;
    bti_result_id?: string;
  };
  decision_pack?: DecisionPackData;
  privacy?: { n_threshold?: number; segment_breakdown_safe?: boolean };
  audit_events_written?: number;
  audit_actions?: string[];
  error?: string;
}

// GET /api/admin/operator-flow response
interface ReadResult {
  ok: boolean;
  tenant_code?: string;
  reporting_period?: string;
  kora_index?: {
    id?: string;
    value?: number;
    safeguard?: string;
    calibration?: string;
    methodology?: string;
    confidence?: number;                 // 0–1
    component_count?: number;
    is_current?: boolean;
    created_at?: string;
    activation_rate?: number;            // 0–1
    meaningful_activation_rate?: number; // 0–1
  } | null;
  decision_pack?: DecisionPackData | null;
  audit_summary?: AuditEvent[];
  error?: string;
}

type Status = 'idle' | 'running' | 'reading' | 'success-run' | 'success-read' | 'error';

// ── Formatting helpers ────────────────────────────────────────────────────────

const SAFEGUARD: Record<string, { label: string; cls: string }> = {
  CLEAR:   { label: 'CLEAR',   cls: 'bg-green-100 text-green-800 border-green-200' },
  WARNING: { label: 'WARNING', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  FLAGGED: { label: 'FLAGGED', cls: 'bg-red-100  text-red-800   border-red-200'  },
};

const AUDIT_ICON: Record<string, string> = {
  tenant_created:              '🏢',
  tenant_reused:               '🔁',
  workforce_baseline_inserted: '👥',
  source_batch_created:        '📦',
  uploaded_records_inserted:   '📝',
  uef_records_generated:       '⚙️',
  scoring_run_completed:       '📊',
  results_persisted:           '💾',
  decision_pack_created:       '📋',
  privacy_threshold_checked:   '🔒',
  privacy_threshold_suppressed:'🛡️',
};

function pct(v: number) { return `${(v * 100).toFixed(0)}%`; }
function cs01(v: number) { return `${Math.round(v * 100)}%`; }
function ts(s: string) {
  try { return new Date(s).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return s; }
}
function badge(safeguard?: string) {
  if (!safeguard) return null;
  const s = SAFEGUARD[safeguard];
  if (!s) return null;
  return (
    <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  userEmail: string;
  userRole: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function OperatorConsole({ userEmail, userRole }: Props) {
  const [status, setStatus]         = useState<Status>('idle');
  const [runResult, setRunResult]   = useState<RunResult | null>(null);
  const [readResult, setReadResult] = useState<ReadResult | null>(null);
  const [errorMsg, setErrorMsg]     = useState<string | null>(null);

  const TENANT      = 'OP-001';
  const PERIOD      = '2026-Q1';
  const isLoading   = status === 'running' || status === 'reading';

  const pdfUrl     = `/api/admin/decision-pack/pdf?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`;
  const previewUrl = `/api/admin/decision-pack/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`;

  async function handleRun() {
    setStatus('running'); setErrorMsg(null); setRunResult(null);
    try {
      const res = await fetch('/api/admin/operator-flow', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT, reportingPeriod: PERIOD }),
      });
      const data = await res.json() as RunResult;
      if (!res.ok || !data.ok) { setErrorMsg(data.error ?? `HTTP ${res.status}`); setStatus('error'); return; }
      setRunResult(data); setStatus('success-run');
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : String(e)); setStatus('error'); }
  }

  async function handleRead() {
    setStatus('reading'); setErrorMsg(null); setReadResult(null);
    try {
      const res = await fetch(`/api/admin/operator-flow?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`, { credentials: 'include' });
      const data = await res.json() as ReadResult;
      if (!res.ok || !data.ok) {
        setErrorMsg(res.status === 401 ? 'Sessione scaduta — effettua nuovamente il login.' : res.status === 403 ? 'Accesso negato.' : `HTTP ${res.status}`);
        setStatus('error'); return;
      }
      setReadResult(data); setStatus('success-read');
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : String(e)); setStatus('error'); }
  }

  // Timestamp from last successful read
  const lastTs = readResult?.kora_index?.created_at;

  return (
    <div className="max-w-2xl mx-auto space-y-5 py-6 px-2">

      {/* ── A. Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KORA Admin Operator Console</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live v1 Operator Flow · dati sintetici</p>
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500 mt-1">LIVE</span>
      </div>

      {/* Auth bar */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 flex items-center gap-3 text-sm">
        <span className="text-slate-400 text-xs">Operatore</span>
        <span className="font-medium text-slate-800">{userEmail}</span>
        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{userRole}</span>
        <form action="/api/auth/logout" method="POST" className="ml-auto">
          <button type="submit" className="text-xs text-slate-400 hover:text-red-500 underline underline-offset-2 transition-colors">
            Logout
          </button>
        </form>
      </div>

      {/* ── B. Tenant status ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex gap-6">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Tenant</p>
              <p className="text-lg font-bold text-slate-900">{TENANT}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-0.5">Periodo</p>
              <p className="text-base font-semibold text-slate-700">{PERIOD}</p>
            </div>
          </div>
          <div className="text-right">
            {lastTs ? (
              <div>
                <p className="text-xs text-slate-400">Ultimo risultato</p>
                <p className="text-xs font-medium text-slate-600 mt-0.5">{ts(lastTs)}</p>
              </div>
            ) : (
              <span className="text-xs text-slate-400 italic">
                {status === 'idle' ? 'Leggi il risultato per vedere lo stato' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ── C. Action panel ── */}
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleRun} disabled={isLoading}
            className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {status === 'running' ? '⏳ Esecuzione…' : '▶ Run operator flow'}
          </button>
          <button onClick={handleRead} disabled={isLoading}
            className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {status === 'reading' ? '⏳ Lettura…' : '↻ Read current result'}
          </button>
        </div>

        {/* ── C2. Decision Pack export ── */}
        <div className="flex gap-2 pt-1 border-t border-slate-100 mt-1 flex-wrap">
          <a
            href={pdfUrl}
            download={`kora-decision-pack-${TENANT}-${PERIOD}.pdf`}
            className="inline-flex items-center gap-1.5 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1a1756] transition-colors"
          >
            ↓ Download Decision Pack PDF
          </a>
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 border border-[#6156F5] text-[#6156F5] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#f5f4ff] transition-colors"
          >
            ↗ HTML Preview
          </a>
        </div>
      </div>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex gap-2">
          <span>⚠</span><span>{errorMsg}</span>
        </div>
      )}

      {/* ── D. Last run summary (POST result) ── */}
      {status === 'success-run' && runResult && runResult.scoring && (
        <Section title="Run completato" accent="green">
          <MetricGrid>
            <Metric label="KORA Index" value={<span className="text-2xl font-bold text-slate-900">{runResult.scoring.kora_index_value}</span>} />
            <Metric label="Activation Safeguard" value={badge(runResult.scoring.safeguard_status)} />
            <Metric label="Confidence Score" value={<span className="text-lg font-semibold text-slate-800">{cs01((runResult.scoring.confidence_score ?? 0) / 100)}</span>} />
            <Metric label="Scoring mode" value={<span className="text-sm text-slate-600">{runResult.scoring.mode}</span>} />
            {runResult.scoring.activation_rate !== undefined && (
              <Metric label="Activation Rate" value={<span className="text-sm font-semibold text-slate-700">{pct(runResult.scoring.activation_rate)}</span>} />
            )}
            {runResult.scoring.meaningful_activation_rate !== undefined && (
              <Metric label="Meaningful AR" value={<span className="text-sm font-semibold text-slate-700">{pct(runResult.scoring.meaningful_activation_rate)}</span>} />
            )}
            <Metric label="Reporting period" value={<span className="text-sm text-slate-600">{runResult.reporting_period}</span>} />
            <Metric label="N≥10 safe" value={<span className={`text-xs font-semibold ${runResult.privacy?.segment_breakdown_safe ? 'text-green-700' : 'text-amber-700'}`}>{runResult.privacy?.segment_breakdown_safe ? '✓ Sì' : '⚠ Verifica'}</span>} />
          </MetricGrid>

          {/* Decision Pack */}
          {runResult.decision_pack && (
            <SubSection title="Decision Pack draft">
              <p className="text-xs font-mono text-slate-600 break-all">{runResult.decision_pack.version_id}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <StatusPill status={runResult.decision_pack.status} />
                <span className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">Draft only — not exported</span>
              </div>
              {runResult.decision_pack.kora_index_result_id && (
                <p className="text-xs text-slate-400 mt-1">Linked result: <span className="font-mono">{runResult.decision_pack.kora_index_result_id.slice(0, 8)}…</span></p>
              )}
            </SubSection>
          )}

          {/* Audit summary */}
          {runResult.audit_actions && runResult.audit_actions.length > 0 && (
            <SubSection title={`Audit log — ${runResult.audit_events_written ?? runResult.audit_actions.length} eventi`}>
              <AuditList actions={runResult.audit_actions.map(a => ({ action: a, resource_type: null, created_at: '' }))} compact />
            </SubSection>
          )}
        </Section>
      )}

      {/* ── D+E+F. Read result sections ── */}
      {status === 'success-read' && readResult && readResult.kora_index && (
        <>
          <Section title="Ultimo risultato live" accent="blue">
            <MetricGrid>
              <Metric label="KORA Index" value={<span className="text-2xl font-bold text-slate-900">{readResult.kora_index.value}</span>} />
              <Metric label="Activation Safeguard" value={badge(readResult.kora_index.safeguard)} />
              <Metric label="Confidence Score" value={<span className="text-lg font-semibold text-slate-800">{cs01(readResult.kora_index.confidence ?? 0)}</span>} />
              <Metric label="Calibration" value={<span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">{readResult.kora_index.calibration}</span>} />
              {readResult.kora_index.activation_rate !== null && readResult.kora_index.activation_rate !== undefined && (
                <Metric label="Activation Rate" value={<span className="text-sm font-semibold text-slate-700">{pct(readResult.kora_index.activation_rate)}</span>} />
              )}
              {readResult.kora_index.meaningful_activation_rate !== null && readResult.kora_index.meaningful_activation_rate !== undefined && (
                <Metric label="Meaningful AR" value={<span className="text-sm font-semibold text-slate-700">{pct(readResult.kora_index.meaningful_activation_rate)}</span>} />
              )}
              <Metric label="Componenti" value={<span className="text-sm text-slate-600">{readResult.kora_index.component_count}</span>} />
              <Metric label="is_current" value={<span className={`text-xs font-semibold ${readResult.kora_index.is_current ? 'text-green-700' : 'text-slate-500'}`}>{readResult.kora_index.is_current ? '✓ Sì' : 'No'}</span>} />
            </MetricGrid>
            <div className="text-xs text-slate-400 border-t border-slate-100 pt-2 mt-2 flex gap-4 flex-wrap">
              {readResult.kora_index.created_at && <span>Generato: <span className="text-slate-600">{ts(readResult.kora_index.created_at)}</span></span>}
              {readResult.kora_index.methodology && <span>Metodologia: <span className="text-slate-600">{readResult.kora_index.methodology}</span></span>}
              {readResult.kora_index.id && <span>ID: <span className="font-mono">{readResult.kora_index.id.slice(0, 8)}…</span></span>}
            </div>
          </Section>

          {/* ── E. Decision Pack ── */}
          {readResult.decision_pack && (
            <Section title="Decision Pack draft" accent="slate">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <p className="text-xs font-mono text-slate-600 break-all">{readResult.decision_pack.version_id}</p>
                <StatusPill status={readResult.decision_pack.status} />
                <span className="text-xs text-amber-700 border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">Draft only — not exported</span>
              </div>
              <div className="space-y-1 text-xs text-slate-500">
                {readResult.decision_pack.kora_index_result_id && (
                  <p>Linked KORA Index result: <span className="font-mono text-slate-700">{readResult.decision_pack.kora_index_result_id.slice(0, 8)}…</span></p>
                )}
                {readResult.decision_pack.created_at && (
                  <p>Creato: <span className="text-slate-600">{ts(readResult.decision_pack.created_at)}</span></p>
                )}
              </div>
            </Section>
          )}

          {/* ── F. Audit summary ── */}
          {readResult.audit_summary && readResult.audit_summary.length > 0 && (
            <Section title={`Audit log — ultime ${readResult.audit_summary.length} azioni`} accent="slate">
              <AuditList actions={readResult.audit_summary} />
            </Section>
          )}
        </>
      )}

      {status === 'success-read' && readResult && !readResult.kora_index && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Nessun risultato trovato per {TENANT} / {PERIOD}. Esegui prima il Run.
        </div>
      )}

      {/* ── G. Safety notes ── */}
      <div className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Note di sicurezza</p>
        <div className="flex flex-wrap gap-2">
          {['Synthetic data only', 'No real people data', 'N≥10 enforced', 'KORA_ADMIN session required', 'Decision Pack draft only', 'pre_empirical_calibration'].map(n => (
            <span key={n} className="text-xs border border-slate-200 bg-white rounded px-2 py-0.5 text-slate-500">{n}</span>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Layout sub-components ─────────────────────────────────────────────────────

function Section({ title, accent, children }: { title: string; accent: 'green' | 'blue' | 'slate'; children: React.ReactNode }) {
  const border = accent === 'green' ? 'border-green-200' : accent === 'blue' ? 'border-blue-200' : 'border-slate-200';
  const bg     = accent === 'green' ? 'bg-green-50'    : accent === 'blue' ? 'bg-blue-50'    : 'bg-white';
  const color  = accent === 'green' ? 'text-green-700'  : accent === 'blue' ? 'text-blue-700'  : 'text-slate-600';
  return (
    <div className={`rounded-lg border ${border} ${bg} px-4 py-4 space-y-3`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</p>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-slate-200 pt-3 space-y-1.5">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function MetricGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-3">{children}</div>;
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-400 mb-0.5">{label}</p>
      <div>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
      {status ?? 'unknown'}
    </span>
  );
}

function AuditList({ actions, compact }: { actions: AuditEvent[]; compact?: boolean }) {
  return (
    <ol className="space-y-1">
      {actions.map((e, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
          <span className="text-base leading-tight flex-shrink-0">{AUDIT_ICON[e.action] ?? '•'}</span>
          <span className="flex-1">
            <span className="font-medium text-slate-700">{e.action}</span>
            {e.resource_type && !compact && <span className="text-slate-400"> · {e.resource_type}</span>}
            {e.created_at && !compact && <span className="text-slate-400"> · {ts(e.created_at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}
