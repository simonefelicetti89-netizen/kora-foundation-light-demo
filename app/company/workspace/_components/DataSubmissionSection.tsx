'use client';

// app/company/workspace/_components/DataSubmissionSection.tsx
// B39 — Company data submission UI. COMPANY_ADMIN: full flow. COMPANY_VIEWER: status only.
//
// COMPANY_ADMIN can: create draft, upload files, submit.
// COMPANY_VIEWER can: view submission status summary only.
//
// Invariant: submitting does NOT trigger scoring.

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubmissionSummary {
  submissionId:   string;
  status:         string;
  submissionType: string | null;
  period:         string;
  fileCount:      number;
  submittedAt:    string | null;
  createdAt:      string;
  adminComment:   string | null;
}

interface ListData {
  ok:          boolean;
  submissions: SubmissionSummary[];
  caveat:      string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  submission_draft:               'Bozza',
  submission_pending:             'Inviato a KORA',
  submission_needs_clarification: 'Chiarimento richiesto',
  submission_accepted:            'Accettato nell\'intake pipeline',
  submission_rejected:            'Rifiutato',
  submission_archived:            'Archiviato',
};

const STATUS_CLS: Record<string, string> = {
  submission_draft:               'bg-slate-50 text-slate-500 border-slate-200',
  submission_pending:             'bg-blue-50 text-blue-700 border-blue-200',
  submission_needs_clarification: 'bg-amber-50 text-amber-700 border-amber-200',
  submission_accepted:            'bg-green-50 text-green-700 border-green-200',
  submission_rejected:            'bg-red-50 text-red-500 border-red-200',
  submission_archived:            'bg-slate-50 text-slate-400 border-slate-200',
};

const SUBMISSION_TYPES = ['initiatives','budget','participation','evidence','lms','provider','policy','mixed','other'] as const;

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}

function ts(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

const FILE_PURPOSES = ['initiatives','budget','participation','evidence','lms','provider','policy','other'] as const;

// ── Upload form ───────────────────────────────────────────────────────────────

function UploadForm({ submissionId, onFileDone }: { submissionId: string; onFileDone: () => void }) {
  const [file,    setFile]    = useState<File | null>(null);
  const [purpose, setPurpose] = useState('other');
  const [status,  setStatus]  = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [msg,     setMsg]     = useState('');

  async function upload() {
    if (!file) return;
    setStatus('loading');
    const fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', purpose);
    try {
      const res = await fetch(`/api/company/data-submissions/${submissionId}/files`, {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setStatus('done');
        setMsg(`File caricato: ${data.fileNameSafe}`);
        setFile(null);
        setTimeout(() => { setStatus('idle'); setMsg(''); onFileDone(); }, 1500);
      } else {
        setStatus('error');
        setMsg(data.error ?? 'Errore caricamento.');
      }
    } catch {
      setStatus('error');
      setMsg('Errore di rete.');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 flex-wrap items-end">
        <div>
          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Scopo</label>
          <select value={purpose} onChange={e => setPurpose(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:outline-none">
            {FILE_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">File (CSV, XLSX, PDF)</label>
          <input type="file" accept=".csv,.xlsx,.pdf"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-slate-700 w-full" />
        </div>
        <button onClick={upload} disabled={!file || status === 'loading'}
          className="rounded-lg bg-[#06032B] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors shrink-0">
          {status === 'loading' ? '⏳' : 'Carica'}
        </button>
      </div>
      {status === 'done'  && <p className="text-green-600 text-[10px]">✓ {msg}</p>}
      {status === 'error' && <p className="text-red-500  text-[10px]">⚠ {msg}</p>}
    </div>
  );
}

// ── Create submission form ────────────────────────────────────────────────────

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [type,    setType]    = useState<string>('initiatives');
  const [period,  setPeriod]  = useState('2026-Q1');
  const [note,    setNote]    = useState('');
  const [status,  setStatus]  = useState<'idle'|'loading'|'error'>('idle');
  const [msg,     setMsg]     = useState('');

  async function create() {
    setStatus('loading');
    try {
      const res = await fetch('/api/company/data-submissions', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionType: type, period, companyNote: note || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onCreated(data.submissionId);
      } else {
        setStatus('error');
        setMsg(data.error ?? 'Errore creazione.');
      }
    } catch {
      setStatus('error');
      setMsg('Errore di rete.');
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-3">
      <p className="text-xs font-semibold text-slate-700">Nuova Submission Dati</p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Tipo dati</label>
          <select value={type} onChange={e => setType(e.target.value)}
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:outline-none">
            {SUBMISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Periodo</label>
          <input value={period} onChange={e => setPeriod(e.target.value)}
            placeholder="2026-Q1"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs font-mono text-slate-700 focus:outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Nota (facoltativa, max 300 car., senza PII)</label>
        <textarea value={note} onChange={e => setNote(e.target.value.slice(0, 300))}
          rows={2} placeholder="Descrizione breve dei dati inviati…"
          className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs text-slate-700 focus:outline-none resize-none" />
      </div>
      {status === 'error' && <p className="text-red-500 text-[10px]">⚠ {msg}</p>}
      <button onClick={create} disabled={status === 'loading'}
        className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors">
        {status === 'loading' ? '⏳ Creazione…' : 'Crea submission'}
      </button>
    </div>
  );
}

// ── Draft editor ──────────────────────────────────────────────────────────────

function DraftEditor({ submissionId, onSubmitted }: { submissionId: string; onSubmitted: () => void }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [sub,        setSub]        = useState<{ fileCount: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState('');

  useEffect(() => {
    fetch(`/api/company/data-submissions/${submissionId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.ok) setSub(d); })
      .catch(() => {});
  }, [submissionId, refreshKey]);

  async function doSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/company/data-submissions/${submissionId}/submit`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmitMsg('Submission inviata a KORA Admin per la revisione.');
        setTimeout(onSubmitted, 1500);
      } else {
        setSubmitMsg(`⚠ ${data.error ?? 'Errore invio.'}`);
        setSubmitting(false);
      }
    } catch {
      setSubmitMsg('⚠ Errore di rete.');
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
      <p className="text-xs font-semibold text-blue-800">Carica file · Submission in bozza</p>
      <UploadForm submissionId={submissionId} onFileDone={() => setRefreshKey(k => k + 1)} />
      {sub && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-blue-600">{sub.fileCount} file caricati</span>
          {sub.fileCount > 0 && !submitMsg && (
            <button onClick={doSubmit} disabled={submitting}
              className="rounded-lg bg-[#6156F5] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#4f44e0] disabled:opacity-50 transition-colors">
              {submitting ? '⏳ Invio…' : 'Invia per revisione KORA →'}
            </button>
          )}
        </div>
      )}
      {submitMsg && <p className={`text-[10.5px] ${submitMsg.startsWith('⚠') ? 'text-red-500' : 'text-green-600'}`}>{submitMsg}</p>}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  userRole: string;
}

export function DataSubmissionSection({ userRole }: Props) {
  const isAdmin = userRole === 'COMPANY_ADMIN';
  const [list,         setList]         = useState<SubmissionSummary[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showCreate,   setShowCreate]   = useState(false);
  const [activeDraft,  setActiveDraft]  = useState<string | null>(null);

  function loadList() {
    setLoading(true);
    fetch('/api/company/data-submissions', { credentials: 'include' })
      .then(r => r.json())
      .then((d: ListData) => { if (d.ok) setList(d.submissions); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(loadList, []);

  return (
    <div className="space-y-3" id="data-submission">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Data Submission</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            I dati caricati saranno revisionati da KORA Admin prima di entrare nella pipeline di scoring.
          </p>
        </div>
        {isAdmin && !showCreate && !activeDraft && (
          <button onClick={() => setShowCreate(true)}
            className="rounded-lg bg-[#06032B] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1a1756] transition-colors shrink-0">
            + Nuova submission
          </button>
        )}
      </div>

      {/* Create form */}
      {isAdmin && showCreate && !activeDraft && (
        <CreateForm onCreated={(id) => { setShowCreate(false); setActiveDraft(id); loadList(); }} />
      )}

      {/* Draft editor */}
      {isAdmin && activeDraft && (
        <DraftEditor
          submissionId={activeDraft}
          onSubmitted={() => { setActiveDraft(null); loadList(); }}
        />
      )}

      {/* Submissions list */}
      {loading && <p className="text-xs text-slate-400 text-center py-3">Caricamento…</p>}

      {!loading && list.length === 0 && !showCreate && !activeDraft && (
        <div className="text-center py-5 space-y-1">
          <p className="text-xs text-slate-600 font-semibold">Nessuna data submission inviata.</p>
          <p className="text-[10px] text-slate-400">
            {isAdmin
              ? 'Crea una submission per inviare dati a KORA Admin.'
              : 'Il Company Admin potrà inviare dati per la revisione KORA.'}
          </p>
        </div>
      )}

      {list.length > 0 && (
        <div className="space-y-2">
          {list.slice(0, 10).map((sub) => (
            <div key={sub.submissionId} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge label={STATUS_LABEL[sub.status] ?? sub.status} cls={STATUS_CLS[sub.status] ?? 'border-slate-200 bg-slate-50 text-slate-500'} />
                    {sub.submissionType && <span className="text-[10px] text-slate-500">{sub.submissionType}</span>}
                    <span className="text-[10px] text-slate-400">{sub.period}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {sub.fileCount} file
                    {sub.submittedAt ? ` · Inviato: ${ts(sub.submittedAt)}` : ` · Bozza · ${ts(sub.createdAt)}`}
                  </div>
                  {sub.adminComment && (
                    <p className="text-[10px] text-amber-700 rounded border border-amber-100 bg-amber-50 px-2 py-0.5 mt-1">
                      KORA: {sub.adminComment}
                    </p>
                  )}
                </div>
                {/* Resume draft */}
                {isAdmin && sub.status === 'submission_draft' && !activeDraft && (
                  <button onClick={() => setActiveDraft(sub.submissionId)}
                    className="text-[10px] text-[#6156F5] hover:underline shrink-0">
                    Continua bozza →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9.5px] text-slate-400 pt-1">
        Caricamento dati ≠ scoring KORA · La revisione è svolta da KORA Admin · Nessuna UEF generata automaticamente.
      </p>
    </div>
  );
}
