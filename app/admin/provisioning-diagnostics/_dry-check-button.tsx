'use client';

// app/admin/provisioning-diagnostics/_dry-check-button.tsx
// Calls GET /api/admin/diagnostics and renders results inline.
// Non-destructive — only reads env + connectivity.

import { useState } from 'react';

interface DiagCheck {
  id:      string;
  label:   string;
  status:  'PASS' | 'WARNING' | 'FAIL';
  message: string;
}

interface DryCheckResult {
  verdict:   'READY' | 'PARTIAL' | 'BLOCKED';
  checks:    DiagCheck[];
  timestamp: string;
}

const VERDICT_STYLE: Record<string, string> = {
  READY:   'bg-green-100 text-green-800 border border-green-200',
  PARTIAL: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  BLOCKED: 'bg-red-100 text-red-800 border border-red-200',
};

const CHECK_COLOR: Record<string, string> = {
  PASS:    'text-green-600',
  WARNING: 'text-amber-600',
  FAIL:    'text-red-600',
};

const CHECK_ICON: Record<string, string> = {
  PASS:    '✓',
  WARNING: '⚠',
  FAIL:    '✗',
};

export function DryCheckButton() {
  const [state,    setState]    = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result,   setResult]   = useState<DryCheckResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function run() {
    setState('loading');
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/admin/diagnostics');
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        setErrorMsg(body.error ?? `HTTP ${res.status}`);
        setState('error');
        return;
      }
      setResult(await res.json() as DryCheckResult);
      setState('done');
    } catch (e) {
      setErrorMsg(String(e));
      setState('error');
    }
  }

  return (
    <div className="space-y-4">
      <button
        onClick={run}
        disabled={state === 'loading'}
        className="px-4 py-2 bg-slate-700 text-white rounded text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state === 'loading' ? 'Verifica in corso…' : 'Esegui provisioning dry-check'}
      </button>

      {state === 'error' && errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      {state === 'done' && result && (
        <div className="space-y-3">
          <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${VERDICT_STYLE[result.verdict]}`}>
            B99 Readiness: {result.verdict}
          </span>

          <table className="w-full text-sm border-collapse">
            <tbody>
              {result.checks.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 last:border-0">
                  <td className={`py-2 pr-2 w-5 font-bold ${CHECK_COLOR[c.status]}`}>
                    {CHECK_ICON[c.status]}
                  </td>
                  <td className="py-2 pr-4 text-gray-800 font-medium whitespace-nowrap text-xs">
                    {c.label}
                  </td>
                  <td className="py-2 text-gray-500 text-xs">{c.message}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-xs text-gray-400">
            Eseguito: {new Date(result.timestamp).toLocaleString('it-IT')}
          </p>
        </div>
      )}
    </div>
  );
}
