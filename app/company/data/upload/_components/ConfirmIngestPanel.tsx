'use client';
// KORA-WP-028 — Ingestion Hardening — Sync Path + Retry Contract.
//
// Small, self-contained addition to the existing upload preview page:
// after a successful client-side preview, lets the Company confirm and
// persist the file server-side via /api/company/data-ingest — the first
// real, synchronous, idempotent write for this flow (KORA-WP-001's own
// spike, `105`, found none existed here before this WP). Owns its own
// state only; never touches the parent page's parse/preview state.
//
// Retry-safe by construction: one Idempotency-Key is generated once per
// component instance and reused across every submit attempt for that same
// file — a genuine network retry (the "Riprova" button after a failed
// attempt) replays safely instead of creating a duplicate ingestion. The
// parent page mounts a fresh instance (via its own `key` prop, keyed on the
// file's name/size/lastModified) whenever the user picks a genuinely
// different file, so a new file always gets a new key while retries of the
// same file keep the same one — plain state, no impure call during render.

import { useState } from 'react';

interface ConfirmIngestPanelProps {
  file: File | null;
}

type SubmitState = 'idle' | 'submitting' | 'succeeded' | 'replayed' | 'failed';

function generateIdempotencyKey(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

export default function ConfirmIngestPanel({ file }: ConfirmIngestPanelProps) {
  const [state, setState] = useState<SubmitState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [batchId, setBatchId] = useState<string | null>(null);
  // Lazy initializer — runs exactly once per component instance (mount),
  // never re-derived on re-render.
  const [idempotencyKey] = useState<string>(generateIdempotencyKey);

  if (!file) return null;

  async function handleConfirm() {
    setState('submitting');
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append('file', file as File);

      const res = await fetch('/api/company/data-ingest', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: formData,
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.ok) {
        setState(body.replayed ? 'replayed' : 'succeeded');
        setBatchId(body.batchId ?? null);
        setMessage(
          body.replayed
            ? `Già salvato in precedenza (${body.rowCount} righe) — nessun duplicato creato.`
            : `Salvato correttamente: ${body.rowCount} righe.`,
        );
      } else {
        setState('failed');
        setMessage(body.error ?? 'Errore durante il salvataggio.');
      }
    } catch {
      setState('failed');
      setMessage('Errore di rete. È possibile riprovare in sicurezza: nessun duplicato verrà creato.');
    }
  }

  return (
    <div className="mt-6 rounded-xl border border-[rgba(6,3,43,0.08)] bg-white p-5">
      <p className="text-xs font-semibold tracking-widest uppercase text-kora-accent mb-2">
        Conferma e Salva
      </p>
      <p className="text-xs text-[rgba(6,3,43,0.52)] leading-relaxed mb-3">
        Il file verrà validato e salvato lato server. KORA Admin revisionerà i dati prima che entrino nel calcolo del KORA Index.
      </p>

      {(state === 'idle' || state === 'failed') && (
        <button
          type="button"
          onClick={handleConfirm}
          className="rounded-lg bg-kora-ink px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          {state === 'failed' ? 'Riprova' : 'Conferma e Salva'}
        </button>
      )}
      {state === 'submitting' && (
        <p className="text-xs text-[rgba(6,3,43,0.52)]">Salvataggio in corso…</p>
      )}
      {(state === 'succeeded' || state === 'replayed') && (
        <div className="text-xs text-[rgba(47,125,85,0.90)]">
          ✓ {message} {batchId && <span className="font-mono text-[10px] opacity-60">({batchId})</span>}
        </div>
      )}
      {state === 'failed' && message && (
        <p className="mt-2 text-xs text-[rgba(196,60,60,0.90)]">{message}</p>
      )}
    </div>
  );
}
