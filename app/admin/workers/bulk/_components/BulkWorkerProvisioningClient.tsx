'use client';

// app/admin/workers/bulk/_components/BulkWorkerProvisioningClient.tsx
// WORKER-BULK-PROVISIONING-01 — paste/CSV box, preview, submit, per-row results.
//
// Parsing/validation (parseBulkWorkerInput, validateWorkerBatch) runs
// client-side for instant preview, using the same pure functions the server
// re-validates with — no duplicated logic, just shared imports. Only after
// a clean preview does this component POST to
// /api/admin/workers/bulk-provision. No other write path exists here — no
// KORA Link reference, no NFC chip writing, nothing beyond this one
// explicit bulk-provision action.

import { useState } from 'react';
import {
  parseBulkWorkerInput,
  validateWorkerBatch,
  type ParsedWorkerRow,
  type ParsedWorkerInput,
} from '@/lib/admin/bulk-worker-parser';

type BulkRowOutcome = 'created' | 'already_exists' | 'invited' | 'failed' | 'validation_error';

interface BulkRowResult {
  email: string;
  outcome: BulkRowOutcome;
  workerId?: string;
  warning?: string;
  error?: string;
}

interface BulkProvisionResponse {
  ok: boolean;
  tenantId: string;
  tenantCode: string;
  summary: { total: number; invited: number; alreadyExists: number; failed: number };
  results: BulkRowResult[];
  error?: string;
}

const OUTCOME_LABEL: Record<BulkRowOutcome, string> = {
  created:          'Creato',
  already_exists:   'Già esistente',
  invited:          'Invitato',
  failed:           'Fallito',
  validation_error: 'Errore di validazione',
};

const OUTCOME_CLASSES: Record<BulkRowOutcome, string> = {
  created:          'bg-green-100 text-green-800',
  invited:          'bg-green-100 text-green-800',
  already_exists:   'bg-amber-100 text-amber-800',
  failed:           'bg-red-100 text-red-800',
  validation_error: 'bg-red-100 text-red-800',
};

const PLACEHOLDER = `firstName,lastName,email
Mario,Rossi,mario.rossi@example.com
Giulia,Bianchi,giulia.bianchi@example.com`;

export function BulkWorkerProvisioningClient({
  tenantId,
  tenantCode,
  companyName,
}: {
  tenantId: string;
  tenantCode: string;
  companyName: string;
}) {
  const [pasteText, setPasteText] = useState('');
  const [rows, setRows] = useState<ParsedWorkerRow[] | null>(null);
  const [validWorkers, setValidWorkers] = useState<ParsedWorkerInput[]>([]);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitResult, setSubmitResult] = useState<BulkProvisionResponse | null>(null);

  function handleAnalyze() {
    setSubmitResult(null);
    setSubmitError(null);

    const parsed = parseBulkWorkerInput(pasteText);
    setRows(parsed.rows);
    setValidWorkers(parsed.validWorkers);

    const batch = validateWorkerBatch(parsed.validWorkers);
    const rowErrors = parsed.rows.filter((r) => r.error).map((r) => `Riga ${r.lineNumber}: ${r.error}`);
    setBatchErrors([...rowErrors, ...batch.errors]);
  }

  const canSubmit = rows !== null && batchErrors.length === 0 && validWorkers.length > 0 && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitResult(null);

    try {
      const res = await fetch('/api/admin/workers/bulk-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ tenantId, workers: validWorkers }),
      });
      const body = (await res.json()) as BulkProvisionResponse;

      if (!res.ok || !body.ok) {
        setSubmitError(body.error ?? 'Provisioning in blocco fallito.');
        return;
      }
      setSubmitResult(body);
    } catch {
      setSubmitError('Errore di rete durante il provisioning.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">Tenant</p>
        <p className="text-sm font-bold text-[#06032B]">{companyName}</p>
        <p className="text-xs font-mono text-[rgba(6,3,43,0.40)]">{tenantCode}</p>
      </div>

      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white px-4 py-4 space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
          Incolla la lista worker (uno per riga)
        </p>
        <p className="text-xs text-[rgba(6,3,43,0.55)] leading-relaxed">
          Formati accettati: CSV con intestazione <code>firstName,lastName,email</code>, CSV senza intestazione
          (<code>Mario,Rossi,mario.rossi@example.com</code>), formato <code>Nome Cognome &lt;email&gt;</code>, o solo
          email (una per riga). Massimo {50} worker per batch.
        </p>
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          className="w-full font-mono text-xs border border-[rgba(6,3,43,0.15)] rounded-md p-3 box-border"
        />
        <button
          onClick={handleAnalyze}
          disabled={!pasteText.trim()}
          className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.82)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Analizza
        </button>
      </div>

      {rows !== null && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-[rgba(6,3,43,0.06)] text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
            Anteprima — {validWorkers.length} worker validi su {rows.length} righe
          </div>

          {batchErrors.length > 0 && (
            <div className="px-4 py-3 bg-[rgba(158,59,47,0.06)] border-b border-[rgba(158,59,47,0.15)]">
              <ul className="list-disc pl-4 space-y-0.5">
                {batchErrors.map((e, i) => (
                  <li key={i} className="text-xs text-[#9E3B2F]">{e}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
                  <th className="px-4 py-2 font-semibold">Riga</th>
                  <th className="px-4 py-2 font-semibold">Nome</th>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">Stato parsing</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.lineNumber} className="border-t border-[rgba(6,3,43,0.05)]">
                    <td className="px-4 py-2 text-[rgba(6,3,43,0.40)]">{r.lineNumber}</td>
                    <td className="px-4 py-2 text-[#06032B]">
                      {[r.worker?.firstName, r.worker?.lastName].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className="px-4 py-2 text-[rgba(6,3,43,0.65)]">{r.worker?.email ?? '—'}</td>
                    <td className="px-4 py-2">
                      {r.error ? (
                        <span className="rounded bg-red-100 text-red-800 px-1.5 py-0.5 text-[10px] font-semibold">
                          {r.error}
                        </span>
                      ) : (
                        <span className="rounded bg-green-100 text-green-800 px-1.5 py-0.5 text-[10px] font-semibold">
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="px-4 py-3 border-t border-[rgba(6,3,43,0.06)]">
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#4f44e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Provisioning in corso…' : `Provisiona ${validWorkers.length} worker`}
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-xs text-[#9E3B2F]">
          ⚠ {submitError}
        </div>
      )}

      {submitResult && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-white overflow-hidden">
          <div className="px-4 py-2 border-b border-[rgba(6,3,43,0.06)] text-[10px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
            Risultati — {submitResult.summary.invited} invitati · {submitResult.summary.alreadyExists} già esistenti ·{' '}
            {submitResult.summary.failed} falliti
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-[rgba(6,3,43,0.40)]">
                <th className="px-4 py-2 font-semibold">Email</th>
                <th className="px-4 py-2 font-semibold">Esito</th>
                <th className="px-4 py-2 font-semibold">Dettaglio</th>
              </tr>
            </thead>
            <tbody>
              {submitResult.results.map((r) => (
                <tr key={r.email} className="border-t border-[rgba(6,3,43,0.05)]">
                  <td className="px-4 py-2 text-[#06032B]">{r.email}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${OUTCOME_CLASSES[r.outcome]}`}>
                      {OUTCOME_LABEL[r.outcome]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[rgba(6,3,43,0.50)]">{r.warning ?? r.error ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[10.5px] text-[rgba(6,3,43,0.35)]">
        Privacy: nome e cognome sono usati solo per l&apos;anteprima in questa pagina — non vengono mai salvati.
        Solo email e un riferimento opaco (workerRef) vengono provisionati, come nel provisioning singolo.
      </p>
    </div>
  );
}
