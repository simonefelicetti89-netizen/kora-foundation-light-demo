'use client';

// app/admin/company-evidence-archive/_components/EvidenceAttachmentPanel.tsx
// B31: Evidence Attachment Panel — metadata-only attachment registry.
// No raw document content. No public URLs. No scoring actions.

import { useState } from 'react';

type AttachmentType = 'invoice'|'provider_export'|'lms_report'|'policy_document'|
  'contract'|'budget_report'|'attendance_report'|'coverage_report'|'other';

interface PreviewResult {
  ok: boolean;
  preview?: boolean;
  dryRunNote?: string;
  metadata?: {
    attachmentId: string;
    fileNameSafe: string;
    fileSizeBytes: number;
    fileType: string;
    attachmentType: string;
    sourceStrength: string;
    evidenceLevelSuggestion: string | null;
    evidenceLevelCaveat: string;
    parserStatus: string;
    extractedMetadata?: {
      pageCount?: number;
      sheetCount?: number;
      sheetNames?: string[];
      headerCount?: number;
      rowCount?: number;
      detectedAmountHint?: boolean;
      detectedParticipantHint?: boolean;
    };
    piiFindings?: Array<{ location: string; riskType: string; severity: string }>;
    caveats: string[];
  };
  error?: string;
}

interface RegisterResult {
  ok: boolean;
  attachmentId?: string;
  fileNameSafe?: string;
  parserStatus?: string;
  evidenceLevelSuggestion?: string | null;
  note?: string;
  error?: string;
}

const ATTACHMENT_TYPE_LABELS: Record<AttachmentType, string> = {
  invoice:           'Fattura / Invoice',
  provider_export:   'Export fornitore welfare',
  lms_report:        'Report LMS / Formazione',
  policy_document:   'Policy / Regolamento',
  contract:          'Contratto / Accordo',
  budget_report:     'Report budget / Consuntivo',
  attendance_report: 'Report presenze / Partecipazione',
  coverage_report:   'Report copertura / Uptake',
  other:             'Altro documento',
};

const LEVEL_COLORS: Record<string, string> = {
  L3: 'text-green-700 bg-green-50 border-green-200',
  L2: 'text-[#6156F5] bg-[#f5f4ff] border-[#c7c4f8]',
  L1: 'text-amber-700 bg-amber-50 border-amber-200',
  L0: 'text-slate-500 bg-slate-50 border-slate-200',
};

const STATUS_COLORS: Record<string, string> = {
  parsed_metadata: 'text-green-700',
  metadata_only:   'text-amber-700',
  needs_review:    'text-amber-700',
  rejected_pii:    'text-red-700',
  rejected_size:   'text-red-700',
  unsupported:     'text-slate-400',
};

export function EvidenceAttachmentPanel({ tenantCode, batchId }: { tenantCode: string; batchId: string }) {
  const [file, setFile]               = useState<File | null>(null);
  const [attachType, setAttachType]   = useState<AttachmentType>('other');
  const [linkedInit, setLinkedInit]   = useState('');
  const [linkedField, setLinkedField] = useState('');
  const [preview, setPreview]         = useState<PreviewResult | null>(null);
  const [previewStatus, setPreviewStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [registerResult, setRegisterResult] = useState<RegisterResult | null>(null);
  const [registerStatus, setRegisterStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [confirmed, setConfirmed]     = useState(false);

  async function handlePreview() {
    if (!file) return;
    setPreviewStatus('loading'); setPreview(null); setRegisterResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('attachmentType', attachType);
    fd.append('scope', linkedInit ? 'initiative' : 'batch');
    if (linkedInit.trim()) fd.append('linkedInitiativeName', linkedInit.trim());
    if (linkedField.trim()) fd.append('linkedField', linkedField.trim());
    if (batchId) fd.append('linkedBatchId', batchId);
    try {
      const res  = await fetch('/api/admin/evidence-attachments/preview', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json() as PreviewResult;
      setPreview(data); setPreviewStatus(data.ok ? 'done' : 'error');
    } catch (e) {
      setPreview({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setPreviewStatus('error');
    }
  }

  async function handleRegister() {
    if (!file || !confirmed || !batchId) return;
    setRegisterStatus('loading'); setRegisterResult(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tenantCode', tenantCode);
    fd.append('batchId', batchId);
    fd.append('attachmentType', attachType);
    fd.append('scope', linkedInit ? 'initiative' : 'batch');
    if (linkedInit.trim()) fd.append('linkedInitiativeName', linkedInit.trim());
    if (linkedField.trim()) fd.append('linkedField', linkedField.trim());
    fd.append('confirmation', 'true');
    try {
      const res  = await fetch('/api/admin/evidence-attachments/register', { method: 'POST', credentials: 'include', body: fd });
      const data = await res.json() as RegisterResult;
      setRegisterResult(data); setRegisterStatus(data.ok ? 'done' : 'error');
    } catch (e) {
      setRegisterResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setRegisterStatus('error');
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#c7c4f8] bg-[#f5f4ff] px-4 py-3">
        <p className="text-[10px] font-bold text-[#6156F5] uppercase tracking-wide mb-1">Evidence Attachment — Metadata Only</p>
        <p className="text-[10px] text-[#3d3a6a] leading-relaxed">
          Allega documenti di evidenza (fatture, export provider, LMS, policy).
          Solo metadati vengono salvati — nessun contenuto raw, nessun URL pubblico, nessuna azione di scoring.
        </p>
      </div>

      {/* File + type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Documento</label>
          <input type="file" accept=".pdf,.xlsx,.csv"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); setRegisterResult(null); setConfirmed(false); }}
            className="text-xs text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-200 file:bg-white file:text-xs file:cursor-pointer" />
          <p className="text-[9px] text-slate-400 mt-0.5">PDF / XLSX / CSV · Max 20MB</p>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Tipo documento</label>
          <select value={attachType} onChange={e => setAttachType(e.target.value as AttachmentType)}
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6156F5]">
            {Object.entries(ATTACHMENT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Iniziativa (opzionale)</label>
          <input value={linkedInit} onChange={e => setLinkedInit(e.target.value)} placeholder="es. Formazione Digitale"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6156F5]" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Campo canonico (opzionale)</label>
          <input value={linkedField} onChange={e => setLinkedField(e.target.value)} placeholder="es. amount, participants, hours"
            className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6156F5]" />
        </div>
      </div>

      {/* Preview button */}
      <button onClick={handlePreview} disabled={!file || previewStatus === 'loading'}
        className="rounded-lg bg-slate-800 text-white px-4 py-1.5 text-xs font-semibold hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
        {previewStatus === 'loading' ? '⏳ Analisi metadati…' : '↻ Preview metadata documento'}
      </button>

      {/* Preview result */}
      {preview?.ok && preview.metadata && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 space-y-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Metadata Preview</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-600">{preview.metadata.fileNameSafe}</span>
            <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500">{preview.metadata.fileType.toUpperCase()}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[preview.metadata.parserStatus] ?? 'text-slate-500'}`}>
              {preview.metadata.parserStatus}
            </span>
            {preview.metadata.evidenceLevelSuggestion && (
              <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${LEVEL_COLORS[preview.metadata.evidenceLevelSuggestion] ?? 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                Suggerisce {preview.metadata.evidenceLevelSuggestion}
              </span>
            )}
          </div>
          {preview.metadata.extractedMetadata && (
            <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
              {preview.metadata.extractedMetadata.pageCount !== undefined && <span>Pagine: {preview.metadata.extractedMetadata.pageCount}</span>}
              {preview.metadata.extractedMetadata.sheetCount !== undefined && <span>Fogli: {preview.metadata.extractedMetadata.sheetCount}</span>}
              {preview.metadata.extractedMetadata.rowCount !== undefined && <span>Righe: {preview.metadata.extractedMetadata.rowCount}</span>}
              {preview.metadata.extractedMetadata.detectedAmountHint && <span className="text-green-700">✓ importo rilevato</span>}
              {preview.metadata.extractedMetadata.detectedParticipantHint && <span className="text-green-700">✓ partecipanti rilevati</span>}
            </div>
          )}
          <p className="text-[10px] text-[#3d3a6a] bg-[#f5f4ff] border border-[#c7c4f8] rounded px-2 py-1">
            {preview.metadata.evidenceLevelCaveat}
          </p>
        </div>
      )}

      {preview && !preview.ok && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">
          ⚠ {preview.error ?? preview.metadata?.parserStatus ?? 'Errore preview.'}
          {preview.metadata?.piiFindings && preview.metadata.piiFindings.length > 0 && (
            <div className="mt-1">PII rilevata: {preview.metadata.piiFindings.map(f => f.location).join(' · ')}</div>
          )}
        </div>
      )}

      {/* Confirmation + register (only if preview passed) */}
      {previewStatus === 'done' && preview?.ok && preview.metadata?.parserStatus !== 'rejected_pii' && preview.metadata?.parserStatus !== 'rejected_size' && registerStatus !== 'done' && (
        <div className="space-y-2">
          <label className="flex items-start gap-2 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-[#6156F5] focus:ring-[#6156F5]" />
            <span className="text-xs text-slate-700">
              Confermo che il documento non contiene PII individuali e che i metadati sono corretti.
              Il livello evidenza proposto richiede UEF Review prima di influenzare lo scoring.
            </span>
          </label>
          <button onClick={handleRegister} disabled={!confirmed || registerStatus === 'loading' || !batchId}
            className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {registerStatus === 'loading' ? '⏳ Registrazione…' : '↓ Registra metadata attachment'}
          </button>
          {!batchId && <p className="text-[10px] text-red-600">⚠ batchId non disponibile — seleziona un batch valido.</p>}
        </div>
      )}

      {/* Register result */}
      {registerStatus === 'done' && registerResult?.ok && (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-[10px] text-green-700 space-y-0.5">
          <p className="font-semibold">✓ Attachment metadata registrato</p>
          <p className="font-mono">{registerResult.fileNameSafe} · {registerResult.parserStatus}</p>
          {registerResult.evidenceLevelSuggestion && <p>Livello suggerito: {registerResult.evidenceLevelSuggestion} (richiede UEF Review)</p>}
          <p className="text-slate-500">{registerResult.note}</p>
        </div>
      )}
      {registerStatus === 'error' && registerResult && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">⚠ {registerResult.error}</div>
      )}

      <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
        Solo metadati vengono salvati. Nessun contenuto documento. Nessun URL pubblico. Nessuna azione di scoring automatica.
      </p>
    </div>
  );
}
