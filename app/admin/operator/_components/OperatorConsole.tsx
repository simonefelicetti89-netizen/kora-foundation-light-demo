'use client';

// app/admin/operator/_components/OperatorConsole.tsx
// Client Component — KORA Admin Operator Console.
// Calls /api/admin/operator-flow (POST + GET) using session cookies (fetch credentials: 'include').
// No scoring logic, no persistence logic, no secret headers.
// Consumes the existing operator-flow API only.

import { useState } from 'react';

// ── Types for API responses ───────────────────────────────────────────────────

interface ScoringResult {
  kora_index_value: number;
  safeguard_status: 'CLEAR' | 'WARNING' | 'FLAGGED';
  confidence_score: number;   // 0–1
  is_current: boolean;
  created_at?: string;
}

interface DecisionPackResult {
  id: string;
  version_id: string;
  status: string;
}

interface ReadResult {
  ok: boolean;
  tenant_code?: string;
  reporting_period?: string;
  kora_index?: ScoringResult;
  decision_pack?: DecisionPackResult | null;
}

interface RunResult {
  ok: boolean;
  kora_index_value?: number;
  safeguard_status?: string;
  confidence_score?: number;
  reporting_period?: string;
  decision_pack?: DecisionPackResult;
  audit_events_written?: number;
  error?: string;
}

type Status = 'idle' | 'running' | 'reading' | 'success-run' | 'success-read' | 'error';

// ── Badge helpers ─────────────────────────────────────────────────────────────

const SAFEGUARD_BADGE: Record<string, string> = {
  CLEAR:   'bg-green-100 text-green-800 border border-green-200',
  WARNING: 'bg-amber-100 text-amber-800 border border-amber-200',
  FLAGGED: 'bg-red-100  text-red-800   border border-red-200',
};

function formatCS(cs: number): string {
  return `${Math.round(cs * 100)}%`;
}

function formatTS(ts: string): string {
  try { return new Date(ts).toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return ts; }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  userEmail: string;
  userRole: string;
}

export function OperatorConsole({ userEmail, userRole }: Props) {
  const [status, setStatus]       = useState<Status>('idle');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [readResult, setReadResult] = useState<ReadResult | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string | null>(null);

  const TENANT_CODE      = 'OP-001';
  const REPORTING_PERIOD = '2026-Q1';

  // ── Run operator flow (POST) ──────────────────────────────────────────────

  async function handleRun() {
    setStatus('running');
    setErrorMsg(null);
    setRunResult(null);
    try {
      const res = await fetch('/api/admin/operator-flow', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT_CODE, reportingPeriod: REPORTING_PERIOD }),
      });
      const data = await res.json() as RunResult;
      if (!res.ok || !data.ok) {
        setErrorMsg(data.error ?? `HTTP ${res.status}`);
        setStatus('error');
        return;
      }
      setRunResult(data);
      setStatus('success-run');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  // ── Read current result (GET) ─────────────────────────────────────────────

  async function handleRead() {
    setStatus('reading');
    setErrorMsg(null);
    setReadResult(null);
    try {
      const res = await fetch(
        `/api/admin/operator-flow?tenantCode=${TENANT_CODE}&reportingPeriod=${REPORTING_PERIOD}`,
        { credentials: 'include' },
      );
      const data = await res.json() as ReadResult;
      if (!res.ok || !data.ok) {
        if (res.status === 401) { setErrorMsg('Sessione scaduta. Effettua nuovamente il login.'); }
        else if (res.status === 403) { setErrorMsg('Accesso negato.'); }
        else { setErrorMsg(`HTTP ${res.status}`); }
        setStatus('error');
        return;
      }
      setReadResult(data);
      setStatus('success-read');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  const isLoading = status === 'running' || status === 'reading';

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KORA Admin Operator Console</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live v1 Operator Flow — dati sintetici</p>
        </div>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-mono text-slate-500">
          LIVE
        </span>
      </div>

      {/* Auth info */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-center gap-3 text-sm">
        <span className="text-slate-500">Loggato come</span>
        <span className="font-medium text-slate-800">{userEmail}</span>
        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">
          {userRole}
        </span>
        <form action="/api/auth/logout" method="POST" className="ml-auto">
          <button
            type="submit"
            className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
          >
            Logout
          </button>
        </form>
      </div>

      {/* Tenant card */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-4 space-y-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Tenant sintetico</p>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{TENANT_CODE}</p>
          </div>
          <div className="ml-6">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Periodo</p>
            <p className="text-base font-semibold text-slate-700 mt-0.5">{REPORTING_PERIOD}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleRun}
            disabled={isLoading}
            className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'running' ? 'Esecuzione…' : 'Run operator flow'}
          </button>
          <button
            onClick={handleRead}
            disabled={isLoading}
            className="flex-1 border border-slate-300 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'reading' ? 'Lettura…' : 'Read current result'}
          </button>
        </div>
      </div>

      {/* Error */}
      {status === 'error' && errorMsg && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Run result */}
      {status === 'success-run' && runResult && (
        <ResultCard
          title="Run completato"
          koraIndex={runResult.kora_index_value}
          safeguard={runResult.safeguard_status}
          cs={runResult.confidence_score ? runResult.confidence_score / 100 : undefined}
          reportingPeriod={runResult.reporting_period}
          decisionPack={runResult.decision_pack}
          auditEvents={runResult.audit_events_written}
          accent="green"
        />
      )}

      {/* Read result */}
      {status === 'success-read' && readResult?.kora_index && (
        <ResultCard
          title="Risultato corrente"
          koraIndex={readResult.kora_index.kora_index_value}
          safeguard={readResult.kora_index.safeguard_status}
          cs={readResult.kora_index.confidence_score}
          reportingPeriod={readResult.reporting_period}
          decisionPack={readResult.decision_pack}
          createdAt={readResult.kora_index.created_at}
          accent="blue"
        />
      )}

      {status === 'success-read' && !readResult?.kora_index && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Nessun risultato trovato per {TENANT_CODE} / {REPORTING_PERIOD}. Esegui prima il Run.
        </div>
      )}

      {/* Methodology disclaimer */}
      <p className="text-xs text-slate-400 border-t border-slate-100 pt-4">
        Dati sintetici · Calibration: pre_empirical · KORA Methodology v0.1
      </p>
    </div>
  );
}

// ── ResultCard sub-component ──────────────────────────────────────────────────

interface ResultCardProps {
  title: string;
  koraIndex?: number;
  safeguard?: string;
  cs?: number;
  reportingPeriod?: string;
  decisionPack?: DecisionPackResult | null;
  auditEvents?: number;
  createdAt?: string;
  accent: 'green' | 'blue';
}

function ResultCard({
  title, koraIndex, safeguard, cs, reportingPeriod,
  decisionPack, auditEvents, createdAt, accent,
}: ResultCardProps) {
  const borderColor = accent === 'green' ? 'border-green-200' : 'border-blue-200';
  const bgColor     = accent === 'green' ? 'bg-green-50'     : 'bg-blue-50';
  const titleColor  = accent === 'green' ? 'text-green-800'  : 'text-blue-800';

  return (
    <div className={`rounded-lg border ${borderColor} ${bgColor} px-4 py-4 space-y-3`}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${titleColor}`}>{title}</p>

      <div className="grid grid-cols-2 gap-4">
        {koraIndex !== undefined && (
          <div>
            <p className="text-xs text-slate-500">KORA Index</p>
            <p className="text-2xl font-bold text-slate-900">{koraIndex}</p>
          </div>
        )}

        {safeguard && (
          <div>
            <p className="text-xs text-slate-500 mb-1">Activation Safeguard</p>
            <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${SAFEGUARD_BADGE[safeguard] ?? ''}`}>
              {safeguard}
            </span>
          </div>
        )}

        {cs !== undefined && (
          <div>
            <p className="text-xs text-slate-500">Confidence Score</p>
            <p className="text-lg font-semibold text-slate-800">{formatCS(cs)}</p>
          </div>
        )}

        {reportingPeriod && (
          <div>
            <p className="text-xs text-slate-500">Reporting period</p>
            <p className="text-sm font-medium text-slate-700">{reportingPeriod}</p>
          </div>
        )}
      </div>

      {decisionPack && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs text-slate-500 mb-1">Decision Pack</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-slate-600">{decisionPack.version_id}</span>
            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs text-slate-500">
              {decisionPack.status}
            </span>
          </div>
        </div>
      )}

      {auditEvents !== undefined && (
        <div className="border-t border-slate-200 pt-3 text-xs text-slate-500">
          Audit events scritti: <span className="font-semibold text-slate-700">{auditEvents}</span>
        </div>
      )}

      {createdAt && (
        <div className="text-xs text-slate-400">
          Generato il {formatTS(createdAt)}
        </div>
      )}
    </div>
  );
}
