'use client';

// app/admin/company-submissions/_components/AdminSubmissionQueue.tsx
// B39 — KORA Admin company submission review queue.
// Read-only list + review action panel.

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubmissionFile {
  fileId:        string;
  safeName:      string;
  fileType:      string;
  fileSizeBytes: number;
  purpose:       string;
  uploadedAt:    string;
  storageStatus: string;
}

interface Submission {
  submissionId:         string;
  tenantId:             string;
  companyName:          string;
  tenantCode:           string | null;
  status:               string;
  submissionType:       string | null;
  period:               string;
  fileCount:            number;
  files:                SubmissionFile[];
  submittedByEmail:     string | null;
  submittedAt:          string | null;
  companyNote:          string | null;
  adminComment:         string | null;
  adminReviewedBy:      string | null;
  adminReviewedAt:      string | null;
  linkedSourceBatchId:  string | null;
  createdAt:            string;
  quickActions: { review: string; workspace: string; dataIntake: string };
}

interface QueueData {
  ok:          boolean;
  submissions: Submission[];
  summary: { pending: number; needs_clarification: number; accepted: number; rejected: number };
  generatedAt: string;
}

// ── Style maps ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  submission_draft:               'Bozza',
  submission_pending:             'In attesa di revisione',
  submission_needs_clarification: 'Chiarimento richiesto',
  submission_accepted:            'Accettato per intake',
  submission_rejected:            'Rifiutato',
  submission_archived:            'Archiviato',
};

const STATUS_CLS: Record<string, string> = {
  submission_draft:               'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
  submission_pending:             'bg-amber-50 text-amber-700 border-amber-200',
  submission_needs_clarification: 'bg-orange-50 text-orange-700 border-orange-200',
  submission_accepted:            'bg-green-50 text-green-700 border-green-200',
  submission_rejected:            'bg-red-50 text-red-600 border-red-200',
  submission_archived:            'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}

function ts(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// ── Review action panel ───────────────────────────────────────────────────────

function ReviewPanel({ sub, onDone }: { sub: Submission; onDone: () => void }) {
  const [action,  setAction]  = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [visible, setVisible] = useState<boolean>(false);
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg,     setMsg]     = useState<string>('');

  async function submit() {
    if (!action) return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/admin/company-submissions/${sub.submissionId}/review`, {
        method:  'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminComment:          comment.trim() || null,
          commentCompanyVisible: visible,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('done');
        setMsg(data.intakeNote ?? `Stato aggiornato: ${data.newStatus}`);
        setTimeout(onDone, 1200);
      } else {
        setStatus('error');
        setMsg(data.error ?? 'Errore aggiornamento.');
      }
    } catch {
      setStatus('error');
      setMsg('Errore di rete.');
    }
  }

  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-3 space-y-2.5 text-[10.5px]">
      <p className="font-semibold text-[rgba(6,3,43,0.78)] text-[10px] uppercase tracking-wide">Azione di revisione</p>

      <select
        value={action} onChange={e => setAction(e.target.value)}
        className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-[rgba(6,3,43,0.90)] text-xs focus:outline-none"
      >
        <option value="">Seleziona azione…</option>
        <option value="needs_clarification">Richiedi chiarimento</option>
        <option value="accept_for_intake">Accetta per intake</option>
        <option value="reject">Rifiuta</option>
        <option value="archive">Archivia</option>
      </select>

      {action === 'accept_for_intake' && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-[9.5px] text-green-700 leading-relaxed">
          <span className="font-semibold">Accepted for intake non avvia scoring.</span>{' '}
          Dopo aver accettato, aprire Data Intake per creare il batch ufficiale manualmente.
          Nessuna UEF generata automaticamente. Nessun bypass di Match Review o UEF Review.
        </div>
      )}

      <textarea
        value={comment} onChange={e => setComment(e.target.value.slice(0, 500))}
        placeholder="Commento admin (opzionale, max 500 caratteri, senza PII)…"
        rows={2}
        className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-[rgba(6,3,43,0.90)] text-xs focus:outline-none resize-none"
      />
      <div className="flex items-center gap-1.5">
        <input type="checkbox" id={`vis-${sub.submissionId}`} checked={visible}
          onChange={e => setVisible(e.target.checked)}
          className="rounded" />
        <label htmlFor={`vis-${sub.submissionId}`} className="text-[10px] text-[rgba(6,3,43,0.52)] cursor-pointer">
          Mostra commento all&apos;azienda
        </label>
      </div>

      {status === 'done' && <p className="text-green-600 text-[10px]">✓ {msg}</p>}
      {status === 'error' && <p className="text-red-500 text-[10px]">⚠ {msg}</p>}

      <button
        onClick={submit}
        disabled={!action || status === 'loading' || status === 'done'}
        className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-[10px] font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors"
      >
        {status === 'loading' ? '⏳ Salvataggio…' : 'Conferma azione'}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdminSubmissionQueue({ userEmail }: { userEmail: string }) {
  const [data,    setData]    = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  function load() {
    setLoading(true);
    fetch('/api/admin/company-submissions', { credentials: 'include' })
      .then(r => r.json())
      .then((d: QueueData) => { if (d.ok) setData(d); else setError('Errore caricamento.'); })
      .catch(() => setError('Errore di rete.'))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (statusFilter === 'all') return data.submissions;
    return data.submissions.filter(s => s.status === statusFilter);
  }, [data, statusFilter]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA Admin · Review Queue</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Company Submissions</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Submission aziendali in attesa di revisione · Nessuno scoring automatico
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">KORA_ADMIN</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <button onClick={load} className="text-[9px] text-white/30 hover:text-white/60 underline">↻ Aggiorna</button>
        </div>
      </div>

      {/* Caveat */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-[10.5px] text-amber-700">
        Accepted_for_intake non avvia scoring, non crea UEF e non bypassa Match Review o UEF Review.
        Dopo aver accettato una submission, aprire Data Intake per creare il batch ufficiale manualmente.
      </div>

      {loading && <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-6">Caricamento queue…</p>}
      {error   && <p className="text-xs text-red-500 px-4 py-2">⚠ {error}</p>}

      {data && !loading && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'In attesa',     value: data.summary.pending,             cls: 'text-amber-700' },
              { label: 'Chiarimento',   value: data.summary.needs_clarification, cls: data.summary.needs_clarification > 0 ? 'text-orange-600' : '' },
              { label: 'Accettati',     value: data.summary.accepted,            cls: 'text-green-700' },
              { label: 'Rifiutati',     value: data.summary.rejected,            cls: '' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className={`text-xl font-bold text-[rgba(6,3,43,0.90)] mt-0.5 ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none">
              <option value="all">Tutti gli stati</option>
              <option value="submission_pending">In attesa</option>
              <option value="submission_needs_clarification">Chiarimento</option>
              <option value="submission_accepted">Accettati</option>
              <option value="submission_rejected">Rifiutati</option>
              <option value="submission_archived">Archiviati</option>
              <option value="submission_draft">Bozze</option>
            </select>
            <span className="ml-auto text-[10px] text-[rgba(6,3,43,0.40)]">{filtered.length} di {data.submissions.length}</span>
          </div>

          {/* Empty state */}
          {data.submissions.length === 0 && (
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">Nessuna submission ricevuta.</p>
              <p className="text-xs text-[rgba(6,3,43,0.40)] mt-1">Le submission aziendali appariranno qui quando le aziende invieranno dati dal workspace.</p>
            </div>
          )}

          {/* Submissions list */}
          <div className="space-y-3">
            {filtered.map((sub) => (
              <div key={sub.submissionId} className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
                {/* Row header */}
                <button
                  onClick={() => setExpanded(expanded === sub.submissionId ? null : sub.submissionId)}
                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-[rgba(6,3,43,0.03)]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{sub.companyName}</p>
                      {sub.tenantCode && <span className="font-mono text-[9px] text-[rgba(6,3,43,0.40)]">{sub.tenantCode}</span>}
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Badge label={STATUS_LABEL[sub.status] ?? sub.status} cls={STATUS_CLS[sub.status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'} />
                      {sub.submissionType && <span className="text-[10px] text-[rgba(6,3,43,0.52)]">{sub.submissionType}</span>}
                      <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{sub.period}</span>
                      <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{sub.fileCount} file</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-[rgba(6,3,43,0.40)]">
                      {sub.submittedByEmail && <span>Da: {sub.submittedByEmail}</span>}
                      {sub.submittedAt && <span>Inviato: {ts(sub.submittedAt)}</span>}
                    </div>
                  </div>
                  <span className="text-[rgba(6,3,43,0.40)] text-xs shrink-0">{expanded === sub.submissionId ? '▲' : '▼'}</span>
                </button>

                {/* Expanded detail + review panel */}
                {expanded === sub.submissionId && (
                  <div className="border-t border-[rgba(6,3,43,0.05)] px-5 py-4 space-y-4">

                    {/* Company note */}
                    {sub.companyNote && (
                      <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10.5px] text-[rgba(6,3,43,0.62)]">
                        <span className="font-semibold text-[rgba(6,3,43,0.52)] text-[9px] uppercase tracking-wide">Nota azienda: </span>
                        {sub.companyNote}
                      </div>
                    )}

                    {/* Files */}
                    {sub.files.length > 0 && (
                      <div>
                        <p className="text-[9px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1.5">File allegati</p>
                        <div className="space-y-1">
                          {sub.files.map((f) => (
                            <div key={f.fileId} className="flex items-center gap-2 text-[10px] text-[rgba(6,3,43,0.62)] rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-1.5">
                              <span className="font-mono text-[rgba(6,3,43,0.40)]">.{f.fileType}</span>
                              <span className="truncate">{f.safeName}</span>
                              <span className="text-[rgba(6,3,43,0.40)] shrink-0">{Math.round(f.fileSizeBytes / 1024)} KB</span>
                              <span className="text-[rgba(6,3,43,0.40)] shrink-0">{f.purpose}</span>
                              <Badge label={f.storageStatus === 'stored_private' ? 'Archiviato' : 'Solo metadata'} cls="border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] text-[rgba(6,3,43,0.52)]" />
                            </div>
                          ))}
                        </div>
                        <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] mt-1">
                          Nessun accesso diretto ai file. Usare Data Intake per caricare i file nel pipeline ufficiale.
                        </p>
                      </div>
                    )}

                    {/* Admin comment */}
                    {sub.adminComment && (
                      <div className="rounded border border-[rgba(6,3,43,0.06)] bg-[rgba(199,111,61,0.08)] px-3 py-2 text-[10.5px] text-[rgba(6,3,43,0.72)]">
                        <span className="font-semibold">Commento admin: </span>{sub.adminComment}
                        {sub.adminReviewedBy && (
                          <p className="text-[9px] text-[rgba(6,3,43,0.52)] mt-0.5">{sub.adminReviewedBy} · {ts(sub.adminReviewedAt)}</p>
                        )}
                      </div>
                    )}

                    {/* Quick actions */}
                    <div className="flex gap-2 flex-wrap text-[10px]">
                      <Link href={sub.quickActions.workspace} className="text-[#C76F3D] hover:underline">Workspace azienda →</Link>
                      <Link href={sub.quickActions.dataIntake} className="text-blue-600 hover:underline">Data Intake (manuale) →</Link>
                    </div>

                    {/* Review panel — only for actionable states */}
                    {!['submission_accepted', 'submission_archived'].includes(sub.status) && (
                      <ReviewPanel sub={sub} onDone={load} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] text-right">
            Generato: {ts(data.generatedAt)} · Accepted_for_intake non avvia scoring automatico.
          </p>
        </>
      )}
    </div>
  );
}
