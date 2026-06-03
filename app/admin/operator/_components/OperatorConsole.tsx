'use client';

// app/admin/operator/_components/OperatorConsole.tsx
// B3 — Operator UI Wizard: 6-step pipeline view.
// All handler logic (handleRun, handleRead, handlePromote) is unchanged from B2.
// The wizard is purely a presentation layer over the same API calls and state.

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

type Status    = 'idle' | 'running' | 'reading' | 'success-run' | 'success-read' | 'error';
type PromoStatus = 'idle' | 'promoting' | 'promoted' | 'promo-error';
type StepState = 'pending' | 'running' | 'completed';

// ── Formatting helpers ────────────────────────────────────────────────────────

const SAFEGUARD: Record<string, { label: string; cls: string }> = {
  CLEAR:   { label: 'CLEAR',   cls: 'bg-green-100 text-[#2F7D55] border-[rgba(47,125,85,0.22)]' },
  WARNING: { label: 'WARNING', cls: 'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]' },
  FLAGGED: { label: 'FLAGGED', cls: 'bg-[rgba(158,59,47,0.10)]  text-red-800   border-[rgba(158,59,47,0.22)]'  },
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
  decision_pack_created:           '📋',
  decision_pack_status_ready:      '✅',
  decision_pack_status_exported:   '📤',
  privacy_threshold_checked:       '🔒',
  privacy_threshold_suppressed:    '🛡️',
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

interface Props { userEmail: string; userRole: string; }

// ── Main component ────────────────────────────────────────────────────────────

export function OperatorConsole({ userEmail, userRole }: Props) {
  // ── State (unchanged from B2) ─────────────────────────────────────────────
  const [status, setStatus]           = useState<Status>('idle');
  const [runResult, setRunResult]     = useState<RunResult | null>(null);
  const [readResult, setReadResult]   = useState<ReadResult | null>(null);
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<PromoStatus>('idle');
  const [promoError, setPromoError]   = useState<string | null>(null);

  const TENANT    = 'OP-001';
  const PERIOD    = '2026-Q1';
  const isLoading = status === 'running' || status === 'reading';
  const pdfUrl     = `/api/admin/decision-pack/pdf?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`;
  const previewUrl = `/api/admin/decision-pack/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`;

  // ── Handlers (unchanged from B2) ─────────────────────────────────────────
  async function handleRun() {
    setStatus('running'); setErrorMsg(null); setRunResult(null);
    try {
      const res  = await fetch('/api/admin/operator-flow', {
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
      const res  = await fetch(`/api/admin/operator-flow?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`, { credentials: 'include' });
      const data = await res.json() as ReadResult;
      if (!res.ok || !data.ok) {
        setErrorMsg(res.status === 401 ? 'Sessione scaduta — effettua nuovamente il login.' : res.status === 403 ? 'Accesso negato.' : `HTTP ${res.status}`);
        setStatus('error'); return;
      }
      setReadResult(data); setStatus('success-read');
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : String(e)); setStatus('error'); }
  }

  async function handlePromote(nextStatus: 'ready' | 'exported') {
    setPromoStatus('promoting'); setPromoError(null);
    try {
      const res  = await fetch('/api/admin/decision-pack/status', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT, reportingPeriod: PERIOD, nextStatus }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) { setPromoError(data.error ?? `HTTP ${res.status}`); setPromoStatus('promo-error'); return; }
      setPromoStatus('promoted');
      await handleRead();
    } catch (e) { setPromoError(e instanceof Error ? e.message : String(e)); setPromoStatus('promo-error'); }
  }

  // ── Step completion — derived from available audit data, no new API ───────
  // Merge audit actions from both run result and read result.
  const allAuditActions: string[] = [
    ...(runResult?.audit_actions ?? []),
    ...(readResult?.audit_summary?.map(e => e.action) ?? []),
  ];
  const hasAction = (a: string) => allAuditActions.includes(a);
  const hasScoring = runResult?.scoring?.kora_index_value != null
                  || readResult?.kora_index?.value != null;
  const latestDpStatus = readResult?.decision_pack?.status ?? runResult?.decision_pack?.status;
  const isPromoting    = promoStatus === 'promoting';

  // Step completion flags (index matches step n-1)
  const completedSteps = [
    true,                                      // 1. Tenant — always
    hasAction('workforce_baseline_inserted'),   // 2. Workforce
    hasAction('uploaded_records_inserted'),     // 3. Data Intake
    hasAction('uef_records_generated'),         // 4. Review
    hasScoring,                                 // 5. Scoring
    latestDpStatus != null,                     // 6. Decision Pack
  ];

  function stepState(i: number): StepState {
    if (completedSteps[i]) return 'completed';
    if (status === 'running' || status === 'reading') return 'running';
    return 'pending';
  }

  // Scoring values — prefer readResult (more authoritative) then runResult
  const kiValue    = readResult?.kora_index?.value       ?? runResult?.scoring?.kora_index_value;
  const safeguard  = readResult?.kora_index?.safeguard   ?? runResult?.scoring?.safeguard_status;
  const csValue    = readResult?.kora_index?.confidence != null
    ? cs01(readResult.kora_index.confidence)
    : runResult?.scoring?.confidence_score != null
      ? cs01(runResult.scoring.confidence_score / 100)
      : null;
  const arValue  = readResult?.kora_index?.activation_rate           ?? runResult?.scoring?.activation_rate;
  const marValue = readResult?.kora_index?.meaningful_activation_rate ?? runResult?.scoring?.meaningful_activation_rate;
  const scoredAt = readResult?.kora_index?.created_at;

  // Decision Pack version display
  const dpVersionId = readResult?.decision_pack?.version_id ?? runResult?.decision_pack?.version_id;

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-6 px-2">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#06032B]">Operator Flow</h1>
          <p className="text-xs text-[rgba(6,3,43,0.52)] mt-0.5">Synthetic OP-001 · 2026-Q1 · Foundation Light</p>
        </div>
        <div className="flex flex-wrap gap-1.5 justify-end shrink-0">
          {(['Synthetic', 'No real worker data', 'pre_empirical_calibration'] as const).map(p => (
            <span key={p} className="text-xs font-mono border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] rounded px-2 py-0.5 text-[rgba(6,3,43,0.40)]">{p}</span>
          ))}
        </div>
      </div>

      {/* ── Auth bar ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-2.5 flex items-center gap-3 text-sm">
        <span className="text-[rgba(6,3,43,0.40)] text-xs">Operatore</span>
        <span className="font-medium text-[rgba(6,3,43,0.90)]">{userEmail}</span>
        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{userRole}</span>
        <form action="/api/auth/logout" method="POST" className="ml-auto">
          <button type="submit" className="text-xs text-[rgba(6,3,43,0.40)] hover:text-red-500 underline underline-offset-2 transition-colors">
            Logout
          </button>
        </form>
      </div>

      {/* ── Action bar — always visible ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 space-y-2.5">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">Controlli pipeline</p>
        <div className="flex gap-3 flex-wrap">
          <button onClick={handleRun} disabled={isLoading}
            className="flex-1 bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.88)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {status === 'running' ? '⏳ Esecuzione pipeline…' : '▶ Run KORA Flow'}
          </button>
          <button onClick={handleRead} disabled={isLoading}
            className="flex-1 border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.03)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {status === 'reading' ? '⏳ Lettura…' : '↻ Read current result'}
          </button>
        </div>
        {status === 'error' && errorMsg && (
          <div className="flex gap-2 rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-3 py-2 text-xs text-[#9E3B2F]">
            <span className="flex-shrink-0">⚠</span><span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ── Wizard steps ── */}
      <div className="space-y-2">

        {/* 1. Tenant */}
        <WizardStep n={1} name="Tenant" state={stepState(0)}
          desc="Tenant e periodo di reporting confermati.">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mb-2">
            <Kv label="Tenant"   value={<span className="font-mono font-semibold text-[rgba(6,3,43,0.90)]">{TENANT}</span>} />
            <Kv label="Periodo"  value={<span className="font-semibold text-[rgba(6,3,43,0.90)]">{PERIOD}</span>} />
            <Kv label="Modalità" value={<span className="text-[rgba(6,3,43,0.62)]">Synthetic · Demo</span>} />
            <Kv label="Dati"     value={<span className="text-[rgba(6,3,43,0.62)]">OP-001 sintetico</span>} />
          </div>
          <button onClick={handleRead} disabled={isLoading}
            className="text-xs text-[rgba(6,3,43,0.52)] underline underline-offset-2 hover:text-[rgba(6,3,43,0.78)] transition-colors disabled:opacity-40">
            ↻ Leggi stato corrente
          </button>
        </WizardStep>

        {/* 2. Workforce */}
        <WizardStep n={2} name="Workforce" state={stepState(1)}
          desc="Workforce baseline generata durante l'esecuzione del flow.">
          {completedSteps[1] ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-wrap gap-4">
                <Kv label="Workers" value={<span className="font-semibold text-[rgba(6,3,43,0.90)] tabular-nums">50</span>} />
                <span className="text-green-700 font-medium">✓ N≥10 enforced</span>
                {runResult?.privacy?.segment_breakdown_safe != null && (
                  <span className={runResult.privacy.segment_breakdown_safe ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
                    {runResult.privacy.segment_breakdown_safe ? '✓ Segments safe' : '⚠ Verifica segments'}
                  </span>
                )}
              </div>
              <p className="text-[rgba(6,3,43,0.40)] italic">Aggregato aziendale · nessun dato individuale esposto.</p>
            </div>
          ) : null}
        </WizardStep>

        {/* 3. Data Intake */}
        <WizardStep n={3} name="Data Intake" state={stepState(2)}
          desc="Synthetic batch OP-001 pronto · live upload locked (B4).">
          {completedSteps[2] ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-wrap gap-4">
                <Kv label="Batch"    value={<span className="text-[rgba(6,3,43,0.62)] font-mono">[SYNTHETIC] OP-001</span>} />
                <Kv label="Records"  value={<span className="font-semibold tabular-nums text-[rgba(6,3,43,0.90)]">6</span>} />
                <span className="text-green-700 font-medium">✓ PII guard passed</span>
              </div>
              <p className="text-[rgba(6,3,43,0.40)] italic">Live file upload locked · synthetic batch only (B4).</p>
            </div>
          ) : null}
        </WizardStep>

        {/* 4. Review */}
        <WizardStep n={4} name="Review" state={stepState(3)}
          desc="UEF records generati durante il flow · review read-only in B3.">
          <div className="space-y-1.5 text-xs">
            {completedSteps[3] && (
              <div className="flex flex-wrap gap-4 mb-1">
                <Kv label="UEF records" value={<span className="font-semibold tabular-nums text-[rgba(6,3,43,0.90)]">6</span>} />
                <span className="text-[rgba(6,3,43,0.52)]">Review mode: read-only</span>
              </div>
            )}
            <p className="text-xs border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] rounded px-2 py-1 text-amber-700">
              Editable UEF Review (accept / reject / edit) scheduled for B5.
            </p>
          </div>
        </WizardStep>

        {/* 5. Scoring */}
        <WizardStep n={5} name="Scoring" state={stepState(4)}
          desc="Esegui Run KORA Flow per generare il KORA Index su dati sintetici OP-001.">
          {completedSteps[4] ? (
            <div className="space-y-3">
              <MetricGrid>
                <Metric label="KORA Index"
                  value={<span className="text-2xl font-bold tabular-nums text-[#06032B]">{kiValue}</span>} />
                <Metric label="Activation Safeguard" value={badge(safeguard)} />
                <Metric label="Confidence Score"
                  value={<span className="text-xl font-semibold tabular-nums text-[rgba(6,3,43,0.90)]">{csValue ?? '—'}</span>} />
                <Metric label="Calibration"
                  value={<span className="text-xs text-amber-700 bg-[rgba(217,154,43,0.08)] border border-[rgba(217,154,43,0.25)] rounded px-1.5 py-0.5">
                    {readResult?.kora_index?.calibration ?? 'pre_empirical_calibration'}
                  </span>} />
                {arValue != null && (
                  <Metric label="Activation Rate"
                    value={<span className="text-sm font-semibold tabular-nums text-[rgba(6,3,43,0.78)]">{pct(arValue)}</span>} />
                )}
                {marValue != null && (
                  <Metric label="Meaningful AR"
                    value={<span className="text-sm font-semibold tabular-nums text-[rgba(6,3,43,0.78)]">{pct(marValue)}</span>} />
                )}
              </MetricGrid>
              {scoredAt && (
                <p className="text-xs text-[rgba(6,3,43,0.40)]">
                  Generato: <span className="text-[rgba(6,3,43,0.62)]">{ts(scoredAt)}</span>
                  {readResult?.kora_index?.methodology && (
                    <> · <span className="font-mono">{readResult.kora_index.methodology}</span></>
                  )}
                </p>
              )}
            </div>
          ) : null}
        </WizardStep>

        {/* 6. Decision Pack */}
        <WizardStep n={6} name="Decision Pack" state={stepState(5)}
          desc="Decision Pack generato dopo lo scoring run.">
          <div className="space-y-3">

            {/* Version + status badge */}
            {(dpVersionId || latestDpStatus) && (
              <div className="flex items-center gap-2 flex-wrap">
                {dpVersionId && (
                  <span className="text-xs font-mono text-[rgba(6,3,43,0.52)] break-all">{dpVersionId}</span>
                )}
                {latestDpStatus && <DpStatusBadge status={latestDpStatus} />}
              </div>
            )}
            {latestDpStatus && (
              <p className="text-xs text-[rgba(6,3,43,0.40)]">{dpStatusDescription(latestDpStatus)}</p>
            )}

            {/* Export CTAs — always visible */}
            <div className="flex gap-2 flex-wrap">
              <a href={pdfUrl} download={`kora-decision-pack-${TENANT}-${PERIOD}.pdf`}
                className="inline-flex items-center gap-1.5 bg-[#06032B] text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-[#1a1756] transition-colors">
                ↓ Download PDF
              </a>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 border border-[#C76F3D] text-[#C76F3D] rounded px-3 py-1.5 text-xs font-medium hover:bg-[#f5f4ff] transition-colors">
                ↗ HTML Preview
              </a>
            </div>

            {/* Lifecycle — B2 logic, unchanged */}
            {latestDpStatus && (
              <div className="space-y-2 pt-2 border-t border-[rgba(6,3,43,0.05)]">
                <div className="flex gap-2 flex-wrap">
                  {latestDpStatus === 'draft' && (
                    <button onClick={() => handlePromote('ready')} disabled={isPromoting}
                      className="inline-flex items-center gap-1 rounded border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {isPromoting ? '⏳ Aggiornamento…' : '✓ Marca come Ready'}
                    </button>
                  )}
                  {latestDpStatus === 'ready' && (
                    <button onClick={() => handlePromote('exported')} disabled={isPromoting}
                      className="inline-flex items-center gap-1 rounded border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {isPromoting ? '⏳ Aggiornamento…' : '↗ Marca come Exported'}
                    </button>
                  )}
                  {latestDpStatus === 'exported' && (
                    <span className="text-xs font-medium text-green-700">✓ Decision Pack esportato — nessuna ulteriore azione disponibile.</span>
                  )}
                </div>
                {promoStatus === 'promoted' && (
                  <p className="text-xs font-medium text-green-700">✓ Status aggiornato con successo.</p>
                )}
                {promoStatus === 'promo-error' && promoError && (
                  <p className="text-xs text-red-600">⚠ {promoError}</p>
                )}
              </div>
            )}

            {/* PDF fallback message */}
            <p className="text-xs text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)] pt-2">
              Se Export PDF automatico non disponibile (Vercel Hobby): apri{' '}
              <a href={previewUrl} target="_blank" rel="noopener noreferrer"
                className="text-violet-600 underline underline-offset-2 hover:text-violet-800">
                HTML Preview
              </a>{' '}
              → Stampa → Salva come PDF.
            </p>

            {/* Audit trail — shown when data available */}
            {readResult?.audit_summary && readResult.audit_summary.length > 0 && (
              <SubSection title={`Audit log — ultime ${readResult.audit_summary.length} azioni`}>
                <AuditList actions={readResult.audit_summary} />
              </SubSection>
            )}
            {!readResult?.audit_summary && runResult?.audit_actions && runResult.audit_actions.length > 0 && (
              <SubSection title={`Audit log — ${runResult.audit_events_written ?? runResult.audit_actions.length} eventi`}>
                <AuditList
                  actions={runResult.audit_actions.map(a => ({ action: a, resource_type: null, created_at: '' }))}
                  compact
                />
              </SubSection>
            )}

          </div>
        </WizardStep>

      </div>

      {/* ── Safety notes ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3">
        <p className="text-xs font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-2">Note di sicurezza</p>
        <div className="flex flex-wrap gap-2">
          {(['Synthetic data only', 'No real people data', 'N≥10 enforced', 'KORA_ADMIN session required', 'pre_empirical_calibration'] as const).map(n => (
            <span key={n} className="text-xs border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] rounded px-2 py-0.5 text-[rgba(6,3,43,0.52)]">{n}</span>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Layout sub-components ─────────────────────────────────────────────────────

// WizardStep — step card with status indicator. B3 addition.
const STEP_STYLE: Record<StepState, { dot: string; badge: string; label: string; headerBorder: string }> = {
  completed: { dot: 'bg-green-500', badge: 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]', label: 'Completato', headerBorder: 'border-green-100' },
  running:   { dot: 'bg-[#D99A2B]', badge: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]', label: 'In esecuzione…', headerBorder: 'border-amber-100' },
  pending:   { dot: 'bg-[rgba(6,3,43,0.18)]', badge: 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]', label: 'In attesa', headerBorder: 'border-[rgba(6,3,43,0.05)]' },
};

function WizardStep({
  n, name, state, desc, children,
}: {
  n: number; name: string; state: StepState; desc: string; children?: React.ReactNode;
}) {
  const s = STEP_STYLE[state];
  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-2.5 border-b ${s.headerBorder}`}>
        <div className="flex items-center gap-2 w-10 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
          <span className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{String(n).padStart(2, '0')}</span>
        </div>
        <span className="text-sm font-semibold text-[rgba(6,3,43,0.90)] flex-1">{name}</span>
        <span className={`text-xs font-medium rounded border px-2 py-0.5 flex-shrink-0 ${s.badge}`}>{s.label}</span>
      </div>
      <div className="px-4 py-3">
        {children ?? <p className="text-xs text-[rgba(6,3,43,0.40)]">{desc}</p>}
      </div>
    </div>
  );
}

// Kv — compact key-value row for step content
function Kv({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[rgba(6,3,43,0.40)]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

// Section, SubSection, MetricGrid, Metric — unchanged from B2
function Section({ title, accent, children }: { title: string; accent: 'green' | 'blue' | 'slate'; children: React.ReactNode }) {
  const border = accent === 'green' ? 'border-[rgba(47,125,85,0.22)]' : accent === 'blue' ? 'border-blue-200' : 'border-[rgba(6,3,43,0.08)]';
  const bg     = accent === 'green' ? 'bg-green-50'    : accent === 'blue' ? 'bg-blue-50'    : 'bg-[#F8F6F1]';
  const color  = accent === 'green' ? 'text-green-700'  : accent === 'blue' ? 'text-blue-700'  : 'text-[rgba(6,3,43,0.62)]';
  return (
    <div className={`rounded-lg border ${border} ${bg} px-4 py-4 space-y-3`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{title}</p>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[rgba(6,3,43,0.08)] pt-3 space-y-1.5">
      <p className="text-xs font-medium text-[rgba(6,3,43,0.52)]">{title}</p>
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
      <p className="text-xs text-[rgba(6,3,43,0.40)] mb-0.5">{label}</p>
      <div>{value}</div>
    </div>
  );
}

// DP status badge + description — unchanged from B2
const DP_STATUS_STYLE: Record<string, { bg: string; text: string; border: string }> = {
  draft:                   { bg: 'bg-[rgba(217,154,43,0.08)]',  text: 'text-amber-700',  border: 'border-[rgba(217,154,43,0.25)]'  },
  ready:                   { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  exported:                { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-[rgba(47,125,85,0.22)]'  },
  data_review_required:    { bg: 'bg-[rgba(158,59,47,0.06)]',    text: 'text-[#9E3B2F]',    border: 'border-[rgba(158,59,47,0.22)]'    },
  advisor_review_required: { bg: 'bg-[rgba(217,154,43,0.08)]', text: 'text-[#8A5A00]', border: 'border-[rgba(217,154,43,0.22)]' },
  archived:                { bg: 'bg-[rgba(6,3,43,0.05)]', text: 'text-[rgba(6,3,43,0.62)]',  border: 'border-[rgba(6,3,43,0.08)]'  },
  blocked:                 { bg: 'bg-[rgba(158,59,47,0.10)]',   text: 'text-red-800',    border: 'border-[rgba(158,59,47,0.25)]'    },
};

function DpStatusBadge({ status }: { status: string }) {
  const s = DP_STATUS_STYLE[status] ?? { bg: 'bg-[rgba(6,3,43,0.03)]', text: 'text-[rgba(6,3,43,0.62)]', border: 'border-[rgba(6,3,43,0.08)]' };
  return (
    <span className={`rounded border ${s.border} ${s.bg} px-2 py-0.5 text-xs font-semibold ${s.text}`}>
      {status}
    </span>
  );
}

function dpStatusDescription(status: string): string {
  if (status === 'draft')                   return 'Generato automaticamente dopo scoring run — non ancora validato.';
  if (status === 'ready')                   return 'Validato internamente — pronto per condivisione o demo.';
  if (status === 'exported')                return 'Esportato o consegnato come Board Report.';
  if (status === 'data_review_required')    return 'Revisione dati necessaria prima di procedere.';
  if (status === 'advisor_review_required') return 'In attesa di revisione advisor.';
  if (status === 'archived')                return 'Archiviato — non più attivo.';
  if (status === 'blocked')                 return 'Bloccato — richiede intervento operativo.';
  return status;
}

function StatusPill({ status }: { status?: string }) {
  return (
    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-xs text-[rgba(6,3,43,0.52)]">
      {status ?? 'unknown'}
    </span>
  );
}

function AuditList({ actions, compact }: { actions: AuditEvent[]; compact?: boolean }) {
  return (
    <ol className="space-y-1">
      {actions.map((e, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-[rgba(6,3,43,0.62)]">
          <span className="text-base leading-tight flex-shrink-0">{AUDIT_ICON[e.action] ?? '•'}</span>
          <span className="flex-1">
            <span className="font-medium text-[rgba(6,3,43,0.78)]">{e.action}</span>
            {e.resource_type && !compact && <span className="text-[rgba(6,3,43,0.40)]"> · {e.resource_type}</span>}
            {e.created_at && !compact && <span className="text-[rgba(6,3,43,0.40)]"> · {ts(e.created_at)}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

// StatusPill kept for compatibility — no longer used in B3 wizard but preserved for safety
void StatusPill;
void Section;
