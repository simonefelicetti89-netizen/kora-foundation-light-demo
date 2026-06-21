'use client';

// app/company/workspace/_components/DataSubmissionSection.tsx
// B93-B — Submission Wizard, Template Library, Type Guidance, Clarification Panel,
//         Submission Timeline, File Safety Warning.
//
// COMPANY_ADMIN: full wizard flow (create draft → upload → submit).
//
// Backend API (unchanged from B39):
//   POST /api/company/data-submissions            → create draft
//   POST /api/company/data-submissions/:id/files  → upload file
//   POST /api/company/data-submissions/:id/submit → submit for review

import { useState, useEffect } from 'react';
import {
  SUBMISSION_TYPE_GUIDANCE,
  UPLOAD_PRIVACY_WARNING,
  SUBMISSION_TIMELINE_STEPS,
  getTemplatesBySubmissionType,
  type SubmissionTypeGuidance,
} from '@/lib/company-submissions/templates';

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

// ── Constants ─────────────────────────────────────────────────────────────────

const SUBMISSION_TYPES = [
  'initiatives', 'budget', 'participation', 'evidence', 'lms', 'provider', 'policy', 'mixed', 'other',
] as const;

const FILE_PURPOSES = ['initiatives','budget','participation','evidence','lms','provider','policy','other'] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  submission_draft:               'Bozza',
  submission_pending:             'Inviato a KORA',
  submission_needs_clarification: 'Chiarimento richiesto',
  submission_accepted:            'Accettato',
  submission_rejected:            'Rifiutato',
  submission_archived:            'Archiviato',
};

const STATUS_CLS: Record<string, string> = {
  submission_draft:               'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
  submission_pending:             'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  submission_needs_clarification: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
  submission_accepted:            'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  submission_rejected:            'bg-[rgba(158,59,47,0.06)] text-red-500 border-[rgba(158,59,47,0.22)]',
  submission_archived:            'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function ts(s: string | null) {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

// ── File Safety Warning ───────────────────────────────────────────────────────

function FileSafetyWarning() {
  return (
    <div
      className="rounded-lg border px-3 py-2.5"
      style={{ background: 'rgba(158,59,47,0.05)', borderColor: 'rgba(158,59,47,0.22)' }}
      data-testid="file-safety-warning"
    >
      <p className="text-[10.5px] font-semibold text-red-600 leading-relaxed">
        ⚠ {UPLOAD_PRIVACY_WARNING}
      </p>
    </div>
  );
}

// ── Submission Mini Timeline ──────────────────────────────────────────────────

function SubmissionTimeline({ status }: { status: string }) {
  return (
    <div className="flex items-center gap-1 mt-1 flex-wrap" data-testid="submission-timeline">
      {SUBMISSION_TIMELINE_STEPS.map((step, idx) => {
        const isDone     = idx < SUBMISSION_TIMELINE_STEPS.findIndex(
          (s) => !(s.statuses as readonly string[]).includes(status) && idx >= 0
        );

        // Determine visual state
        let dotStyle = 'bg-[rgba(6,3,43,0.12)] border-[rgba(6,3,43,0.16)]';
        let labelStyle = 'text-[rgba(6,3,43,0.30)]';

        const allStepsUpToHere = SUBMISSION_TIMELINE_STEPS.slice(0, idx + 1);
        const reached = allStepsUpToHere.some(
          (s) => (s.statuses as readonly string[]).includes(status)
        );
        void isDone;

        if (reached) {
          dotStyle  = 'bg-[#2F7D55] border-[rgba(47,125,85,0.50)]';
          labelStyle = 'text-[#2F7D55]';
        }
        // Special: needs_clarification is amber
        if (status === 'submission_needs_clarification' && step.key === 'reviewed') {
          dotStyle  = 'bg-amber-400 border-amber-300';
          labelStyle = 'text-amber-600 font-bold';
        }
        // Special: rejected is red
        if (status === 'submission_rejected' && step.key === 'outcome') {
          dotStyle  = 'bg-red-400 border-red-300';
          labelStyle = 'text-red-500 font-bold';
        }
        // Current step pulse
        const isCurrent = !reached && idx === SUBMISSION_TIMELINE_STEPS.findIndex(
          (s) => !(s.statuses as readonly string[]).includes(status)
        );
        if (isCurrent) {
          dotStyle  = 'bg-[rgba(43,92,230,0.60)] border-[rgba(43,92,230,0.40)]';
          labelStyle = 'text-[#1E4A8A]';
        }

        return (
          <div key={step.key} className="flex items-center gap-1">
            {idx > 0 && (
              <div className="w-4 h-px bg-[rgba(6,3,43,0.12)]" />
            )}
            <div className="flex flex-col items-center">
              <div className={`w-1.5 h-1.5 rounded-full border ${dotStyle}`} />
              <span className={`text-[8px] mt-0.5 ${labelStyle}`}>{step.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Type Guidance Panel ───────────────────────────────────────────────────────

function TypeGuidancePanel({ type }: { type: string }) {
  const guidance: SubmissionTypeGuidance | undefined = SUBMISSION_TYPE_GUIDANCE[type];
  if (!guidance) return null;

  const suggested = getTemplatesBySubmissionType(guidance.suggestedTemplateId
    ? guidance.suggestedTemplateId : type);

  return (
    <div
      className="space-y-2 mt-2"
      data-testid="type-guidance-panel"
      data-submission-type={type}
    >
      <div className="rounded-lg border border-[rgba(43,92,230,0.18)] bg-[rgba(43,92,230,0.04)] px-3 py-2.5 space-y-2">
        <p className="text-[9px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.50)]">
          {guidance.label} — cosa includere
        </p>
        <p className="text-[11px] text-[rgba(6,3,43,0.72)] leading-relaxed">
          ✓ {guidance.allowedSummary}
        </p>
        <p className="text-[11px] text-red-500 leading-relaxed">
          ✗ {guidance.forbiddenSummary}
        </p>
        <p className="text-[10px] text-[rgba(6,3,43,0.50)] italic border-t border-[rgba(6,3,43,0.06)] pt-2">
          Cosa farà KORA Admin: {guidance.whatKoraDoesNext}
        </p>
      </div>

      {suggested.length > 0 && (
        <div>
          <p className="text-[9px] font-semibold text-[rgba(6,3,43,0.50)] uppercase tracking-wide mb-1">
            Template consigliato
          </p>
          {suggested.slice(0, 1).map((tmpl) => (
            <a
              key={tmpl.id}
              href={`/templates/${tmpl.fileName}`}
              download
              className="flex items-center gap-2 rounded-lg border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] px-3 py-2 hover:bg-[rgba(6,3,43,0.04)] transition-colors"
              data-testid="suggested-template-link"
            >
              <span className="text-base">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.78)]">{tmpl.title}</p>
                <p className="text-[9px] text-[rgba(6,3,43,0.40)]">{tmpl.description}</p>
              </div>
              <span className="text-[10px] font-semibold text-[#4A7FE0] shrink-0">↓ Scarica</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Upload Form (used inside wizard and clarification panel) ──────────────────

function UploadForm({ submissionId, onFileDone, label }: {
  submissionId: string;
  onFileDone: () => void;
  label?: string;
}) {
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
    <div className="space-y-2" data-testid="upload-form">
      {label && <p className="text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">{label}</p>}
      <FileSafetyWarning />
      <div className="flex gap-2 flex-wrap items-end mt-1">
        <div>
          <label className="block text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-0.5">Scopo</label>
          <select value={purpose} onChange={e => setPurpose(e.target.value)}
            className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none">
            {FILE_PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-0.5">File (CSV, XLSX, PDF)</label>
          <input type="file" accept=".csv,.xlsx,.pdf"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            className="text-xs text-[rgba(6,3,43,0.78)] w-full" />
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

// ── Clarification Response Panel ──────────────────────────────────────────────

function ClarificationPanel({ sub, onResolved }: {
  sub: SubmissionSummary;
  onResolved: () => void;
}) {
  const [fileCount,   setFileCount]   = useState(sub.fileCount);
  const [note,        setNote]        = useState('');
  const [submitting,  setSubmitting]  = useState(false);
  const [msg,         setMsg]         = useState('');

  async function resubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/company/data-submissions/${sub.submissionId}/submit`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMsg('Risposta inviata a KORA Admin per revisione.');
        setTimeout(onResolved, 1500);
      } else {
        setMsg(`⚠ ${data.error ?? 'Errore invio.'}`);
        setSubmitting(false);
      }
    } catch {
      setMsg('⚠ Errore di rete.');
      setSubmitting(false);
    }
  }

  return (
    <div
      className="rounded-lg border-2 p-4 space-y-4"
      style={{ borderColor: 'rgba(217,154,43,0.50)', background: 'rgba(217,154,43,0.06)' }}
      data-testid="clarification-panel"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
            background: 'rgba(217,154,43,0.20)', color: '#b45309',
            border: '1.5px solid rgba(217,154,43,0.40)', borderRadius: 4, padding: '2px 6px',
          }}>
            Azione richiesta
          </span>
          <span className="text-sm font-bold text-amber-800">Chiarimento richiesto da KORA Admin</span>
        </div>

        {sub.adminComment && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mt-2">
            <p className="text-[9px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">KORA Admin ha scritto</p>
            <p className="text-[11px] text-amber-800 italic leading-relaxed">{sub.adminComment}</p>
          </div>
        )}

        <p className="text-[11px] text-[rgba(6,3,43,0.58)] mt-2 leading-relaxed">
          Carica i file aggiuntivi o corretti richiesti da KORA Admin, poi invia la risposta.
          Puoi aggiungere una nota per spiegare le modifiche apportate.
        </p>
      </div>

      {/* File upload */}
      <UploadForm
        submissionId={sub.submissionId}
        onFileDone={() => setFileCount((c) => c + 1)}
        label="Carica file aggiuntivi o corretti"
      />

      {/* Response note */}
      <div>
        <label className="block text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-0.5">
          Nota di risposta (facoltativa, max 300 car.)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 300))}
          rows={2}
          placeholder="Descrivi le modifiche o le informazioni aggiuntive fornite…"
          className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none resize-none"
          data-testid="clarification-note"
        />
      </div>

      {/* Submit */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-[rgba(6,3,43,0.45)]">{fileCount} file totali</span>
        {!msg && (
          <button
            onClick={resubmit}
            disabled={submitting}
            className="rounded-lg px-4 py-2 text-xs font-bold transition-colors disabled:opacity-50"
            style={{ background: 'rgba(217,154,43,0.22)', color: '#b45309', border: '1.5px solid rgba(217,154,43,0.45)' }}
            data-testid="clarification-submit-btn"
          >
            {submitting ? '⏳ Invio…' : 'Invia risposta a KORA Admin →'}
          </button>
        )}
      </div>
      {msg && (
        <p className={`text-[10.5px] ${msg.startsWith('⚠') ? 'text-red-500' : 'text-green-600'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

// ── Submission Wizard ─────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5;

const WIZARD_STEP_LABELS: Record<WizardStep, string> = {
  1: 'Tipo dati',
  2: 'Template',
  3: 'Carica file',
  4: 'Nota',
  5: 'Conferma',
};

interface WizardProps {
  onDone: () => void;
}

function SubmissionWizard({ onDone }: WizardProps) {
  const [step,         setStep]         = useState<WizardStep>(1);
  const [subType,      setSubType]      = useState<string>('initiatives');
  const [period,       setPeriod]       = useState('2026-Q1');
  const [note,         setNote]         = useState('');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [fileCount,    setFileCount]    = useState(0);
  const [creating,     setCreating]     = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [errorMsg,     setErrorMsg]     = useState('');
  const [doneMsg,      setDoneMsg]      = useState('');

  async function createDraft() {
    setCreating(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/company/data-submissions', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionType: subType, period }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setSubmissionId(data.submissionId);
        setStep(3);
      } else {
        setErrorMsg(data.error ?? 'Errore creazione bozza.');
      }
    } catch {
      setErrorMsg('Errore di rete.');
    } finally {
      setCreating(false);
    }
  }

  async function submit() {
    if (!submissionId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/company/data-submissions/${submissionId}/submit`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDoneMsg('Submission inviata a KORA Admin per la revisione.');
        setTimeout(onDone, 1800);
      } else {
        setErrorMsg(data.error ?? 'Errore invio.');
        setSubmitting(false);
      }
    } catch {
      setErrorMsg('Errore di rete.');
      setSubmitting(false);
    }
  }

  const guidance = SUBMISSION_TYPE_GUIDANCE[subType];

  return (
    <div
      className="rounded-lg border border-[rgba(43,92,230,0.20)] bg-[rgba(43,92,230,0.03)] p-4 space-y-4"
      data-testid="submission-wizard"
    >
      {/* Step indicator */}
      <div className="flex items-center gap-1 flex-wrap" data-testid="wizard-step-indicator">
        {([1, 2, 3, 4, 5] as WizardStep[]).map((s) => (
          <div key={s} className="flex items-center gap-1">
            {s > 1 && <div className="w-4 h-px bg-[rgba(6,3,43,0.15)]" />}
            <div className="flex items-center gap-1">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  s < step ? 'bg-[#2F7D55] text-white' :
                  s === step ? 'bg-[#06032B] text-white' :
                  'bg-[rgba(6,3,43,0.10)] text-[rgba(6,3,43,0.40)]'
                }`}
              >
                {s < step ? '✓' : s}
              </div>
              <span className={`text-[9px] ${s === step ? 'text-[rgba(6,3,43,0.78)] font-semibold' : 'text-[rgba(6,3,43,0.35)]'}`}>
                {WIZARD_STEP_LABELS[s]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Step 1: Type selection ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3" data-testid="wizard-step-1">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Seleziona il tipo di dati da inviare</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex-1">
              <label className="block text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-0.5">Tipo submission</label>
              <select
                value={subType}
                onChange={(e) => setSubType(e.target.value)}
                className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none"
              >
                {SUBMISSION_TYPES.map((t) => (
                  <option key={t} value={t}>{SUBMISSION_TYPE_GUIDANCE[t]?.label ?? t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-0.5">Periodo</label>
              <input
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder="2026-Q1"
                className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.78)] focus:outline-none"
              />
            </div>
          </div>

          {guidance && <TypeGuidancePanel type={subType} />}

          <button
            onClick={() => setStep(2)}
            className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
          >
            Avanti: scegli template →
          </button>
        </div>
      )}

      {/* ── Step 2: Download template ───────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-3" data-testid="wizard-step-2">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">
            Scarica il template CSV e compila con i tuoi dati
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.48)]">
            Il template include la struttura corretta e le colonne richieste da KORA.
            Puoi saltare questo step se hai già il file pronto.
          </p>

          {/* Relevant templates for this type */}
          <div className="space-y-2">
            {getTemplatesBySubmissionType(subType).slice(0, 2).map((tmpl) => (
              <a
                key={tmpl.id}
                href={`/templates/${tmpl.fileName}`}
                download
                className="flex items-center gap-3 rounded-lg border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] px-3 py-2.5 hover:bg-[rgba(6,3,43,0.04)] transition-colors"
                data-testid="wizard-template-download"
              >
                <span className="text-base">📄</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{tmpl.title}</p>
                  <p className="text-[9px] text-[rgba(6,3,43,0.45)]">{tmpl.description} · {tmpl.pillarHint}</p>
                </div>
                <span className="text-[10px] font-bold text-[#4A7FE0]">↓ Scarica CSV</span>
              </a>
            ))}
            {getTemplatesBySubmissionType(subType).length === 0 && (
              <p className="text-[10px] text-[rgba(6,3,43,0.42)]">
                Nessun template specifico per questo tipo. Usa un CSV con le colonne pertinenti.
              </p>
            )}
          </div>

          <FileSafetyWarning />

          <div className="flex gap-2">
            <button onClick={() => setStep(1)} className="rounded-lg border border-[rgba(6,3,43,0.14)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.60)] hover:bg-[rgba(6,3,43,0.04)] transition-colors">
              ← Indietro
            </button>
            <button
              onClick={createDraft}
              disabled={creating}
              className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors"
            >
              {creating ? '⏳ Creazione bozza…' : 'Avanti: carica file →'}
            </button>
          </div>
          {errorMsg && <p className="text-red-500 text-[10px]">⚠ {errorMsg}</p>}
        </div>
      )}

      {/* ── Step 3: Upload files ────────────────────────────────────────────── */}
      {step === 3 && submissionId && (
        <div className="space-y-3" data-testid="wizard-step-3">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Carica i file dati</p>
          <UploadForm
            submissionId={submissionId}
            onFileDone={() => setFileCount((c) => c + 1)}
          />
          <div className="flex gap-2 items-center">
            <span className="text-[10px] text-[rgba(6,3,43,0.42)]">{fileCount} file caricati</span>
            {fileCount > 0 && (
              <button
                onClick={() => setStep(4)}
                className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
              >
                Avanti: aggiungi nota →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Step 4: Add note ────────────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-3" data-testid="wizard-step-4">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Aggiungi una nota (facoltativa)</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.48)]">
            Puoi descrivere brevemente i dati inviati per aiutare KORA Admin nella revisione.
            Non includere dati personali nella nota.
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 300))}
            rows={3}
            placeholder="Descrizione breve dei dati inviati… (max 300 car.)"
            className="w-full rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none resize-none"
            data-testid="wizard-note"
          />
          <div className="flex gap-2">
            <button onClick={() => setStep(3)} className="rounded-lg border border-[rgba(6,3,43,0.14)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.60)] hover:bg-[rgba(6,3,43,0.04)] transition-colors">
              ← Indietro
            </button>
            <button
              onClick={() => setStep(5)}
              className="rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
            >
              Avanti: conferma →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 5: Confirm & submit ────────────────────────────────────────── */}
      {step === 5 && (
        <div className="space-y-3" data-testid="wizard-step-5">
          <p className="text-xs font-semibold text-[rgba(6,3,43,0.72)]">Conferma e invia a KORA Admin</p>
          <div className="rounded-lg border border-[rgba(6,3,43,0.10)] bg-[rgba(6,3,43,0.02)] px-3 py-3 space-y-1">
            <p className="text-[10px] text-[rgba(6,3,43,0.50)]">Riepilogo</p>
            <p className="text-xs text-[rgba(6,3,43,0.72)]">
              <strong>Tipo:</strong> {SUBMISSION_TYPE_GUIDANCE[subType]?.label ?? subType}
            </p>
            <p className="text-xs text-[rgba(6,3,43,0.72)]"><strong>Periodo:</strong> {period}</p>
            <p className="text-xs text-[rgba(6,3,43,0.72)]"><strong>File caricati:</strong> {fileCount}</p>
            {note && <p className="text-xs text-[rgba(6,3,43,0.60)] italic">&ldquo;{note}&rdquo;</p>}
          </div>
          <p className="text-[10px] text-[rgba(6,3,43,0.45)] leading-relaxed">
            Dopo l&apos;invio, KORA Admin riceverà la notifica e avvierà la revisione.
            Non potrai modificare i file dopo l&apos;invio.
          </p>
          {!doneMsg && (
            <div className="flex gap-2">
              <button onClick={() => setStep(4)} className="rounded-lg border border-[rgba(6,3,43,0.14)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.60)] hover:bg-[rgba(6,3,43,0.04)] transition-colors">
                ← Indietro
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-bold hover:bg-[#a55a2e] disabled:opacity-50 transition-colors"
                data-testid="wizard-submit-btn"
              >
                {submitting ? '⏳ Invio in corso…' : 'Invia per revisione KORA Admin →'}
              </button>
            </div>
          )}
          {doneMsg && <p className="text-green-600 text-[10.5px] font-semibold">{doneMsg}</p>}
          {errorMsg && <p className="text-red-500 text-[10px]">⚠ {errorMsg}</p>}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props {
  userRole: string;
}

// ── History entry from /api/company/data-submissions/history ────────────────

interface HistoryEntry {
  batchId:          string;
  sourceType:       string;
  sourceName:       string | null;
  period:           string | null;
  status:           string;
  statusLabel:      string;
  rowCount:         number | null;
  mappedCount:      number | null;
  createdAt:        string | null;
  processedAt:      string | null;
  eligibilityCounts: Record<string, number> | null;
  submissionType:   string | null;
  fileCount:        number | null;
}

const HISTORY_STATUS_CLS: Record<string, string> = {
  pending:                        'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  approved:                       'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  rejected:                       'bg-[rgba(158,59,47,0.06)] text-red-500 border-[rgba(158,59,47,0.22)]',
  archived:                       'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.42)] border-[rgba(6,3,43,0.10)]',
  submission_draft:               'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]',
  submission_pending:             'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  submission_needs_clarification: 'bg-[rgba(217,154,43,0.08)] text-amber-700 border-[rgba(217,154,43,0.25)]',
  submission_accepted:            'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  submission_rejected:            'bg-[rgba(158,59,47,0.06)] text-red-500 border-[rgba(158,59,47,0.22)]',
};

export function DataSubmissionSection({ userRole }: Props) {
  const isAdmin = userRole === 'COMPANY_ADMIN';
  const [list,          setList]          = useState<SubmissionSummary[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [showWizard,    setShowWizard]    = useState(false);
  const [activeClarSub, setActiveClarSub] = useState<SubmissionSummary | null>(null);
  const [history,       setHistory]       = useState<HistoryEntry[]>([]);
  const [historyOpen,   setHistoryOpen]   = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  async function loadList() {
    try {
      const r = await fetch('/api/company/data-submissions', { credentials: 'include' });
      const d: ListData = await r.json();
      if (d.ok) setList(d.submissions);
    } catch { /* network error — keep empty list */ }
    finally { setLoading(false); }
  }

  async function loadHistory() {
    if (historyLoaded) return;
    try {
      const r = await fetch('/api/company/data-submissions/history', { credentials: 'include' });
      const d = await r.json() as { ok: boolean; history: HistoryEntry[] };
      if (d.ok) setHistory(d.history);
    } catch { /* ignore */ }
    finally { setHistoryLoaded(true); }
  }

  useEffect(() => { loadList(); }, []); // eslint-disable-line react-hooks/set-state-in-effect

  const hasClarification = list.some((s) => s.status === 'submission_needs_clarification');

  return (
    <div className="space-y-4" id="data-submission" data-testid="data-submission-section">

      {/* ── Section header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">
            Data Submission
          </p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
            I dati inviati saranno revisionati da KORA Admin prima di entrare nella pipeline di scoring.
          </p>
        </div>
        {isAdmin && !showWizard && !activeClarSub && (
          <button
            onClick={() => setShowWizard(true)}
            className="rounded-lg bg-[#06032B] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#1a1756] transition-colors shrink-0"
            data-testid="new-submission-btn"
          >
            + Nuova submission
          </button>
        )}
      </div>

      {/* ── Clarification alert banner ──────────────────────────────────────── */}
      {hasClarification && !activeClarSub && !showWizard && (() => {
        const cSub = list.find((s) => s.status === 'submission_needs_clarification')!;
        return (
          <div
            className="rounded-lg px-4 py-3.5 space-y-2"
            style={{ background: 'rgba(217,154,43,0.10)', border: '2px solid rgba(217,154,43,0.42)' }}
            data-testid="clarification-banner"
          >
            <div className="flex items-center gap-2">
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'rgba(217,154,43,0.20)', color: '#b45309',
                border: '1.5px solid rgba(217,154,43,0.40)', borderRadius: 4, padding: '2px 6px',
              }}>
                Azione richiesta
              </span>
              <span className="text-sm font-bold text-amber-800">Chiarimento richiesto da KORA Admin</span>
            </div>
            {cSub.adminComment && (
              <p className="text-[11px] text-amber-700 italic">&ldquo;{cSub.adminComment}&rdquo;</p>
            )}
            <button
              onClick={() => setActiveClarSub(cSub)}
              className="rounded-md px-3 py-1.5 text-[10px] font-bold transition-colors"
              style={{ background: 'rgba(217,154,43,0.20)', color: '#b45309', border: '1.5px solid rgba(217,154,43,0.40)' }}
              data-testid="open-clarification-btn"
            >
              Rispondi al chiarimento →
            </button>
          </div>
        );
      })()}

      {/* ── Clarification response panel ───────────────────────────────────── */}
      {activeClarSub && (
        <ClarificationPanel
          sub={activeClarSub}
          onResolved={() => { setActiveClarSub(null); loadList(); }}
        />
      )}

      {/* ── Submission wizard ───────────────────────────────────────────────── */}
      {isAdmin && showWizard && (
        <SubmissionWizard onDone={() => { setShowWizard(false); loadList(); }} />
      )}

      {/* ── Submissions list ─────────────────────────────────────────────────── */}
      {loading && <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-3">Caricamento…</p>}

      {!loading && list.length === 0 && !showWizard && !activeClarSub && (
        <div className="text-center py-5 space-y-1">
          <p className="text-xs text-[rgba(6,3,43,0.62)] font-semibold">Nessuna data submission ancora.</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
            {isAdmin
              ? 'Usa il pulsante "Nuova submission" per inviare i dati a KORA Admin.'
              : 'Il Company Admin potrà inviare dati per la revisione KORA.'}
          </p>
        </div>
      )}

      {list.length > 0 && (
        <div className="space-y-2" data-testid="submission-list">
          {list.slice(0, 10).map((sub) => (
            <div
              key={sub.submissionId}
              className="rounded-lg border px-4 py-3"
              style={{
                background: sub.status === 'submission_needs_clarification'
                  ? 'rgba(217,154,43,0.06)' : '#F8F6F1',
                borderColor: sub.status === 'submission_needs_clarification'
                  ? 'rgba(217,154,43,0.35)' : 'rgba(6,3,43,0.08)',
                borderWidth: sub.status === 'submission_needs_clarification' ? '1.5px' : '1px',
              }}
              data-testid="submission-card"
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      label={STATUS_LABEL[sub.status] ?? sub.status}
                      cls={STATUS_CLS[sub.status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
                    />
                    {sub.submissionType && (
                      <span className="text-[10px] text-[rgba(6,3,43,0.52)]">
                        {SUBMISSION_TYPE_GUIDANCE[sub.submissionType]?.label ?? sub.submissionType}
                      </span>
                    )}
                    <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{sub.period}</span>
                  </div>
                  <div className="text-[10px] text-[rgba(6,3,43,0.40)]">
                    {sub.fileCount} file
                    {sub.submittedAt
                      ? ` · Inviato: ${ts(sub.submittedAt)}`
                      : ` · Bozza · ${ts(sub.createdAt)}`}
                  </div>
                  {sub.adminComment && (
                    <p className="text-[10px] text-amber-700 rounded border border-amber-100 bg-[rgba(217,154,43,0.08)] px-2 py-0.5 mt-1">
                      KORA Admin: {sub.adminComment}
                    </p>
                  )}
                  {/* Mini timeline */}
                  <SubmissionTimeline status={sub.status} />
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {isAdmin && sub.status === 'submission_needs_clarification' && !activeClarSub && (
                    <button
                      onClick={() => setActiveClarSub(sub)}
                      className="rounded-md px-3 py-1 text-[10px] font-bold transition-colors"
                      style={{ background: 'rgba(217,154,43,0.18)', color: '#b45309', border: '1.5px solid rgba(217,154,43,0.40)' }}
                      data-testid="reply-clarification-btn"
                    >
                      Rispondi →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Template library (collapsed hint) ──────────────────────────────── */}
      {!showWizard && isAdmin && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.06)] bg-[rgba(6,3,43,0.02)] px-3 py-2 flex items-center gap-2">
          <span className="text-[10px] text-[rgba(6,3,43,0.40)]">Hai bisogno di un template CSV?</span>
          <a href="/company/status#template-library" className="text-[10px] font-semibold text-[#4A7FE0] hover:underline">
            Scarica dal Template Library →
          </a>
        </div>
      )}

      {/* ── Cronologia Upload — all batches for this tenant ────────────────── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] overflow-hidden" data-testid="upload-history-panel">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-[rgba(6,3,43,0.02)] hover:bg-[rgba(6,3,43,0.04)] transition-colors text-left"
          onClick={() => { setHistoryOpen((v) => !v); loadHistory(); }}
          data-testid="upload-history-toggle"
        >
          <div>
            <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.72)]">Cronologia Upload</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Tutti i batch caricati per il tuo tenant</p>
          </div>
          <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{historyOpen ? '▲' : '▼'}</span>
        </button>

        {historyOpen && (
          <div className="divide-y divide-[rgba(6,3,43,0.05)]">
            {!historyLoaded && (
              <div className="px-4 py-3 text-[11px] text-[rgba(6,3,43,0.40)]">Caricamento…</div>
            )}
            {historyLoaded && history.length === 0 && (
              <div className="px-4 py-5 text-center" data-testid="upload-history-empty">
                <p className="text-xs text-[rgba(6,3,43,0.45)]">Nessun upload registrato per questo tenant.</p>
                <p className="text-[10px] text-[rgba(6,3,43,0.35)] mt-1">I batch compariranno qui una volta che KORA Admin avrà accettato i tuoi file.</p>
              </div>
            )}
            {historyLoaded && history.map((entry) => (
              <div key={entry.batchId} className="px-4 py-3 flex items-start gap-3" data-testid="upload-history-entry">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-medium text-[rgba(6,3,43,0.80)] truncate max-w-[200px]">
                      {entry.sourceName ?? entry.sourceType}
                    </span>
                    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${HISTORY_STATUS_CLS[entry.status] ?? 'bg-[rgba(6,3,43,0.04)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.12)]'}`}>
                      {entry.statusLabel}
                    </span>
                  </div>
                  <div className="text-[10px] text-[rgba(6,3,43,0.42)] mt-0.5 flex flex-wrap gap-2">
                    {entry.period && <span>{entry.period}</span>}
                    {entry.rowCount != null && <span>{entry.rowCount} righe</span>}
                    {entry.mappedCount != null && <span>{entry.mappedCount} idonee</span>}
                    {entry.fileCount != null && <span>{entry.fileCount} file</span>}
                    {entry.createdAt && <span>{ts(entry.createdAt)}</span>}
                  </div>
                  {entry.eligibilityCounts && (
                    <div className="text-[9px] text-[rgba(6,3,43,0.38)] mt-0.5 flex gap-2 flex-wrap">
                      {Object.entries(entry.eligibilityCounts).map(([k, v]) => (
                        <span key={k}>{k}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] pt-1">
        Caricamento dati ≠ scoring KORA · La revisione è svolta da KORA Admin · Nessuna UEF generata automaticamente.
      </p>
    </div>
  );
}
