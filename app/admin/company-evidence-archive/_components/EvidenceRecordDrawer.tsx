'use client';

// app/admin/company-evidence-archive/_components/EvidenceRecordDrawer.tsx
// B35: Evidence Record Viewer — safe per-record detail drawer.
//
// Shows: contribution role, safe fields, provenance, attachments, evidence gaps.
// No raw payload, no PII, no pseudonym_id, no storagePath, no signedUrl in render.
// Attachment opening goes through signed-url route only.
// Read-only: no scoring, no approve, no edit actions.

import { useEffect, useState, useCallback, useRef } from 'react';
import { AttachmentLifecycleActions } from './AttachmentLifecycleActions';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SafeField {
  field: string;
  valuePreview: string | number | null;
  provenanceKind?: string;
  sourceStrength?: string;
  confidence?: number;
  flags: string[];
  caveat?: string;
}

interface ProvenanceField {
  field: string;
  kind: string;
  confidence: number;
  sourceStrength: string;
  fileRole?: string;
  isManual?: boolean;
  isMerged?: boolean;
  isDerived?: boolean;
  conflictRetained?: boolean;
  caveat?: string;
}

interface AttachmentItem {
  attachmentId: string;
  fileNameSafe: string;
  attachmentType: string;
  fileType: string;
  fileSizeBytes?: number;
  evidenceLevelSuggestion?: string | null;
  parserStatus: string;
  storageStatus: string;
  lifecycleStatus: string;
  lifecycleLabel: string;
  canOpenSecurely: boolean;
  batchId: string;
}

interface RecordDetail {
  ok: boolean;
  tenant: { tenantCode: string; companyName: string; reportingPeriod: string };
  record: {
    id: string; safeName: string; pillar: string | null;
    eligibility: string; reviewStatus: string; approvedForScoring: boolean;
    budgetClass: string | null; evidenceLevel: string | null; reportingReadiness: string | null;
    contributionRole: string; contributionRoleLabel: string;
    contributionExplanation: string; contributes: boolean;
  };
  safeFields: SafeField[];
  provenance: {
    summary: { originalFields: number; mappedFields: number; manualFields: number; mergedFields: number; derivedFields: number; conflictFieldsRetained: number };
    fields: ProvenanceField[];
  };
  matchReview: Record<string, unknown> | null;
  attachments: AttachmentItem[];
  evidenceGaps: Array<{ code: string | null; severity: string | null; message: string | null }>;
  caveats: string[];
  error?: string;
}

interface Props {
  tenantCode: string;
  recordIdFull: string;
  batchIdFull: string;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PROV_KIND_COLORS: Record<string, string> = {
  original_file:     'bg-green-100 text-green-700 border-green-200',
  column_mapping:    'bg-blue-100 text-blue-700 border-blue-200',
  manual_completion: 'bg-amber-100 text-amber-700 border-amber-200',
  multi_file_merge:  'bg-purple-100 text-purple-700 border-purple-200',
  derived:           'bg-slate-100 text-slate-600 border-slate-200',
  system_default:    'bg-slate-50 text-slate-400 border-slate-100',
};

const LIFECYCLE_COLORS: Record<string, string> = {
  active:          'bg-green-100 text-green-700 border-green-200',
  archived:        'bg-amber-100 text-amber-700 border-amber-200',
  removed:         'bg-red-100 text-red-700 border-red-200',
  storage_removed: 'bg-red-50 text-red-500 border-red-100',
  metadata_only:   'bg-slate-100 text-slate-500 border-slate-200',
};

const CONTRIB_COLORS: Record<string, { bg: string; text: string }> = {
  kora_index_and_bti:       { bg: '#f0fdf4', text: '#166534' },
  kora_index_only:          { bg: '#f5f4ff', text: '#4d3d9e' },
  bti_only_economic_relief: { bg: '#fffbeb', text: '#854d0e' },
  reporting_context_only:   { bg: '#f0f9ff', text: '#0c4a6e' },
  excluded_compliance:      { bg: '#fef9c3', text: '#713f12' },
  needs_info:               { bg: '#faf5ff', text: '#581c87' },
  rejected:                 { bg: '#fef2f2', text: '#991b1b' },
  pending_review:           { bg: '#f8fafc', text: '#64748b' },
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold ${cls}`}>{label}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EvidenceRecordDrawer({ tenantCode, recordIdFull, batchIdFull, onClose }: Props) {
  const [detail, setDetail]     = useState<RecordDetail | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [openLinkLoading, setOpenLinkLoading] = useState<string | null>(null);
  const [openLinkErrors, setOpenLinkErrors]   = useState<Record<string, string>>({});
  const [activeSection, setActiveSection] = useState<'fields'|'provenance'|'attachments'|'gaps'>('fields');
  // B35.1: refreshKey incremented after lifecycle action to re-fetch record detail
  const [refreshKey, setRefreshKey] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleLifecycleActionCompleted = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true); setError(null);
    fetch(
      `/api/admin/company-evidence-record?tenantCode=${encodeURIComponent(tenantCode)}&recordId=${encodeURIComponent(recordIdFull)}`,
      { credentials: 'include', signal: ctrl.signal },
    )
      .then(r => r.json() as Promise<RecordDetail>)
      .then(d => { if (!ctrl.signal.aborted) { setDetail(d); setLoading(false); } })
      .catch((e: Error) => { if (!ctrl.signal.aborted) { setError(e.message); setLoading(false); } });

    return () => ctrl.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantCode, recordIdFull, refreshKey]);

  const handleOpenSecureLink = useCallback(async (att: AttachmentItem) => {
    setOpenLinkLoading(att.attachmentId);
    setOpenLinkErrors(prev => { const n = { ...prev }; delete n[att.attachmentId]; return n; });
    try {
      const res = await fetch('/api/admin/evidence-attachments/signed-url', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode, batchId: att.batchId || batchIdFull, attachmentId: att.attachmentId }),
      });
      const d = await res.json() as { ok: boolean; signedUrl?: string; error?: string };
      if (!res.ok || !d.ok || !d.signedUrl) {
        setOpenLinkErrors(prev => ({ ...prev, [att.attachmentId]: d.error ?? `HTTP ${res.status}` }));
      } else {
        window.open(d.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      setOpenLinkErrors(prev => ({ ...prev, [att.attachmentId]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setOpenLinkLoading(null);
    }
  }, [tenantCode, batchIdFull]);

  const cc = detail?.record ? (CONTRIB_COLORS[detail.record.contributionRole] ?? { bg: '#f8fafc', text: '#64748b' }) : null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-[#06032B] px-5 py-4 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold tracking-widest uppercase text-[#6156F5]">KORA</span>
              <span className="text-[9px] text-white/30">·</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase text-white/40">Evidence Record Viewer</span>
            </div>
            <p className="text-sm font-bold text-white truncate max-w-[440px]">
              {loading ? '⏳ Caricamento…' : (detail?.record?.safeName ?? 'Record')}
            </p>
            <p className="text-[10px] text-white/40 mt-0.5">{tenantCode} · Read-only</p>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg leading-none mt-1">✕</button>
        </div>

        {/* Loading / error */}
        {loading && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">⏳ Caricamento record…</div>
        )}
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 m-4">⚠ {error}</div>
          </div>
        )}

        {detail?.ok && detail.record && (
          <div className="flex-1 overflow-y-auto">

            {/* Contribution role */}
            <div className="px-5 py-3 border-b border-slate-100" style={{ backgroundColor: cc?.bg ?? '#f8fafc' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cc?.text ?? '#64748b' }}>
                  {detail.record.contributionRoleLabel}
                </span>
                {detail.record.contributes && (
                  <span className="rounded border border-green-200 bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">→ KORA Index</span>
                )}
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
                  detail.record.eligibility === 'eligible' ? 'bg-green-50 text-green-700 border-green-200' :
                  detail.record.eligibility === 'limited'  ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-red-50 text-red-700 border-red-200'
                }`}>{detail.record.eligibility}</span>
                {detail.record.approvedForScoring && (
                  <span className="rounded border border-[#6156F5]/40 bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-bold text-[#6156F5]">approved</span>
                )}
                {detail.record.pillar && (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-500">{detail.record.pillar}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 leading-snug">{detail.record.contributionExplanation}</p>
            </div>

            {/* Section tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              {([
                ['fields', 'Campi', detail.safeFields.length],
                ['provenance', 'Provenance', detail.provenance.fields.length],
                ['attachments', 'Allegati', detail.attachments.length],
                ['gaps', 'Gaps', detail.evidenceGaps.length],
              ] as [typeof activeSection, string, number][]).map(([id, label, count]) => (
                <button key={id} onClick={() => setActiveSection(id)}
                  className={`px-3 py-2 text-[10px] font-semibold border-b-2 transition-colors ${activeSection === id ? 'border-[#6156F5] text-[#6156F5] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {label}{count > 0 ? ` (${count})` : ''}
                </button>
              ))}
            </div>

            {/* Safe Fields */}
            {activeSection === 'fields' && (
              <div className="px-5 py-4 space-y-2">
                {detail.safeFields.length === 0 && (
                  <p className="text-[10px] text-slate-400">Nessun campo safe disponibile.</p>
                )}
                {detail.safeFields.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-50">
                    <div className="w-36 shrink-0">
                      <span className="text-[10px] font-mono text-slate-400">{f.field}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-slate-700 font-medium">
                        {f.valuePreview !== null ? String(f.valuePreview) : <span className="text-slate-300">—</span>}
                      </span>
                      {f.caveat && <p className="text-[9px] text-amber-600 mt-0.5 leading-tight">{f.caveat}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {f.provenanceKind && (
                        <Badge label={f.provenanceKind.replace(/_/g,' ')} cls={PROV_KIND_COLORS[f.provenanceKind] ?? 'bg-slate-50 text-slate-400 border-slate-100'} />
                      )}
                      {f.flags.map((fl, j) => (
                        <Badge key={j} label={fl} cls="bg-slate-50 text-slate-400 border-slate-100" />
                      ))}
                      {f.confidence !== undefined && (
                        <span className="text-[9px] font-mono text-slate-400">{Math.round(f.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Provenance */}
            {activeSection === 'provenance' && (
              <div className="px-5 py-4 space-y-3">
                {/* Summary */}
                <div className="rounded border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-1.5">Provenance Summary</p>
                  <div className="flex flex-wrap gap-2 text-[9px]">
                    {Object.entries(detail.provenance.summary).map(([k, v]) => (
                      <span key={k} className="rounded bg-white border border-slate-200 px-1.5 py-0.5 font-mono text-slate-500">
                        {k.replace(/Fields?$/, '').replace(/([A-Z])/g, ' $1').trim()}: {v}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Field provenance */}
                {detail.provenance.fields.length === 0 && (
                  <p className="text-[10px] text-slate-400">Provenance field-level non disponibile.</p>
                )}
                {detail.provenance.fields.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 border-b border-slate-50 py-1.5">
                    <span className="w-32 text-[9px] font-mono text-slate-400 shrink-0">{p.field}</span>
                    <Badge label={p.kind.replace(/_/g,' ')} cls={PROV_KIND_COLORS[p.kind] ?? 'bg-slate-50 text-slate-400 border-slate-100'} />
                    {p.fileRole && <span className="text-[9px] text-slate-400">{p.fileRole}</span>}
                    <span className="text-[9px] font-mono text-slate-400 ml-auto">{Math.round(p.confidence * 100)}%</span>
                    {p.conflictRetained && <Badge label="conflict" cls="bg-amber-50 text-amber-600 border-amber-100" />}
                    {p.isManual && <Badge label="manual" cls="bg-amber-50 text-amber-600 border-amber-100" />}
                  </div>
                ))}
              </div>
            )}

            {/* Attachments */}
            {activeSection === 'attachments' && (
              <div className="px-5 py-4 space-y-2">
                {detail.attachments.length === 0 && (
                  <p className="text-[10px] text-slate-400">Nessun attachment collegato a questo record.</p>
                )}
                {detail.attachments.map((att, i) => (
                  <div key={i} className="rounded border border-slate-200 bg-white px-4 py-3">
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className="text-[10px] font-mono text-slate-600 truncate max-w-[200px]">{att.fileNameSafe}</span>
                      <span className="rounded border border-slate-100 bg-slate-50 px-1.5 py-0.5 text-[9px] uppercase text-slate-400">{att.fileType}</span>
                      {att.evidenceLevelSuggestion && (
                        <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-bold text-[#6156F5]">{att.evidenceLevelSuggestion}</span>
                      )}
                      <Badge
                        label={att.lifecycleLabel ?? att.lifecycleStatus}
                        cls={LIFECYCLE_COLORS[att.lifecycleStatus] ?? 'bg-slate-50 text-slate-400 border-slate-100'}
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {att.canOpenSecurely ? (
                        <button
                          onClick={() => handleOpenSecureLink(att)}
                          disabled={openLinkLoading === att.attachmentId}
                          className="rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[9px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                        >
                          {openLinkLoading === att.attachmentId ? '⏳' : '🔒 Apri documento sicuro'}
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-400">
                          {att.lifecycleStatus === 'archived' ? '⚠ Archiviato — ripristinare per aprire' :
                           att.lifecycleStatus === 'removed' ? '⊘ Rimosso' :
                           att.lifecycleStatus === 'storage_removed' ? '⊘ File rimosso' :
                           '📋 Solo metadati'}
                        </span>
                      )}
                      {openLinkErrors[att.attachmentId] && (
                        <span className="text-[9px] text-red-600">⚠ {openLinkErrors[att.attachmentId]}</span>
                      )}
                    </div>
                    {/* B35.1: Lifecycle action buttons */}
                    <AttachmentLifecycleActions
                      tenantCode={tenantCode}
                      batchId={att.batchId || batchIdFull}
                      attachmentId={att.attachmentId}
                      fileNameSafe={att.fileNameSafe}
                      lifecycleStatus={att.lifecycleStatus}
                      storageStatus={att.storageStatus}
                      onActionCompleted={handleLifecycleActionCompleted}
                    />
                  </div>
                ))}
                {detail.attachments.some(a => a.canOpenSecurely) && (
                  <p className="text-[9px] text-amber-600 pt-1">
                    🔒 Link temporanei (5 min) · Non condividere · Non influenzano scoring
                  </p>
                )}
              </div>
            )}

            {/* Evidence Gaps */}
            {activeSection === 'gaps' && (
              <div className="px-5 py-4 space-y-2">
                {detail.record.reportingReadiness && (
                  <div className={`rounded border px-3 py-2 text-[10px] font-semibold mb-2 ${
                    detail.record.reportingReadiness === 'report_ready' ? 'border-green-200 bg-green-50 text-green-700' :
                    detail.record.reportingReadiness === 'usable_with_caveat' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                    'border-red-200 bg-red-50 text-red-700'
                  }`}>
                    Reporting Readiness: {detail.record.reportingReadiness.replace(/_/g,' ')}
                  </div>
                )}
                {detail.evidenceGaps.length === 0 && (
                  <p className="text-[10px] text-slate-400">Nessun evidence gap rilevato.</p>
                )}
                {detail.evidenceGaps.map((g, i) => (
                  <div key={i} className={`rounded border px-3 py-2 text-[10px] ${
                    g.severity === 'high' ? 'border-red-200 bg-red-50 text-red-700' :
                    g.severity === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' :
                    'border-slate-200 bg-slate-50 text-slate-600'
                  }`}>
                    {g.code && <span className="font-mono mr-2">{g.code}</span>}
                    {g.message}
                  </div>
                ))}
              </div>
            )}

            {/* Privacy boundary + caveats */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
              <p className="text-[9px] text-slate-400">
                🔒 Vista sicura — solo metadati evidence canonici. Payload raw, PII e dati lavoratori mai esposti.
                Evidence level non influenza scoring senza UEF Review.
              </p>
            </div>
          </div>
        )}

        {detail && !detail.ok && (
          <div className="flex-1 flex items-center justify-center">
            <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 m-4">
              ⚠ {detail.error ?? 'Errore nel caricamento record.'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
