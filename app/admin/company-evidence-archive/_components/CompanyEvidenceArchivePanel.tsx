'use client';

// app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx
// B29/B31: Company Evidence Archive — read-only lineage + evidence attachment metadata.
// No edit (except attachment register), no scoring, no delete. Privacy-safe view.

import { useEffect, useState, useMemo, useCallback } from 'react';
import { EvidenceAttachmentPanel } from './EvidenceAttachmentPanel';
import { EvidenceRecordDrawer } from './EvidenceRecordDrawer';
import { AttachmentLifecycleActions } from './AttachmentLifecycleActions';
import { useSearchParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

// B34/B35: individual attachment metadata (safe fields — no storagePath, no signed URL)
interface AttachmentItem {
  attachmentId: string;
  fileNameSafe: string;
  fileType: string;
  fileSizeBytes: number;
  attachmentType: string;
  parserStatus: string;
  evidenceLevelSuggestion: string | null;
  storageStatus: 'stored_private' | 'metadata_only';
  createdAt: string;
  // B35: lifecycle fields
  lifecycleStatus:  string;
  lifecycleLabel?:  string;
  canOpenSecurely:  boolean;
  archivedAt?:      string | null;
  removedAt?:       string | null;
  storageRemovedAt?: string | null;
}

interface BatchSummary {
  batchId: string;
  batchIdFull?: string;
  createdAt: string;
  sourceType: string;
  sourceName: string | null;
  batchStatus: string;
  rowCount: number;
  fileType: string | null;
  selectedSheetName: string | null;
  fileMode: string;
  fileCount: number;
  mappingApplied: boolean;
  mappingFieldCount: number | null;
  manualCompletionUsed: boolean;
  manualFields: string[];
  matchSummary: Record<string, number> | null;
  provenanceEnabled?: boolean;
  provenanceSummary?: Record<string, number> | null;
  hasAttachments?: boolean;
  attachmentSummary?: Record<string, unknown> | null;
  attachmentCount?: number;
  // B34: individual attachment metadata
  attachments?: AttachmentItem[];
}

interface ContributionSummary {
  totalInitiatives: number;
  contributesToKoraIndex: number;
  koraIndexAndBti: number;
  koraIndexOnly: number;
  btiOnlyEconomicRelief: number;
  reportingContextOnly: number;
  excludedCompliance: number;
  needsInfo: number;
  rejected: number;
  pendingReview: number;
}

interface Initiative {
  id: string;
  // B35: full IDs for Evidence Record Viewer (system UUIDs, not PII)
  recordIdFull?: string;
  batchIdFull?: string;
  safeName: string;
  pillar: string | null;
  eligibility: string;
  reviewStatus: string;
  approvedForScoring: boolean;
  budgetClass: string | null;
  evidenceLevel: string | null;
  reportingReadiness: string | null;
  contributionRole: string;
  contributionRoleLabel: string;
  contributionExplanation: string;
  hasManualCompletion: boolean;
  manualFields: string[];
  hasColumnMapping: boolean;
  hasMultiFileMatch: boolean;
  hasB30Provenance?: boolean;
  provenanceSummary?: {
    fieldCount?: number;
    kindCounts?: Record<string, number>;
    sourceRoles?: string[];
    conflictRetainedCount?: number;
    preciseSourceCount?: number;
  } | null;
  sourceBatchId: string;
}

interface ArchiveData {
  ok: boolean;
  tenant: { tenantCode: string; companyName: string; reportingPeriod: string };
  batches: BatchSummary[];
  contributionSummary: ContributionSummary;
  initiatives: Initiative[];
  caveats: string[];
  error?: string;
}

interface TenantOption { id: string; tenantCode: string; companyName: string }

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

type Filter =
  | 'all'
  | 'kora_index_and_bti'
  | 'kora_index_only'
  | 'bti_only_economic_relief'
  | 'excluded_compliance'
  | 'needs_info'
  | 'reporting_context_only'
  | 'manual_completion'
  | 'multi_file'
  | 'pending_review'
  | 'rejected';

const FILTER_LABELS: Record<Filter, string> = {
  all:                      'Tutti',
  kora_index_and_bti:       'KORA Index + BTI',
  kora_index_only:          'KORA Index',
  bti_only_economic_relief: 'BTI / Economic Relief',
  excluded_compliance:      'Compliance Excluded',
  needs_info:               'Needs Info',
  reporting_context_only:   'Reporting Context',
  manual_completion:        'Manual Completion',
  multi_file:               'Multi-File',
  pending_review:           'Pending Review',
  rejected:                 'Rejected',
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  kora_index_and_bti:       { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  kora_index_only:          { bg: '#f5f4ff', text: '#4d3d9e', border: '#c7c4f8' },
  bti_only_economic_relief: { bg: '#fffbeb', text: '#854d0e', border: '#fde68a' },
  reporting_context_only:   { bg: '#f0f9ff', text: '#0c4a6e', border: '#bae6fd' },
  excluded_compliance:      { bg: '#fef9c3', text: '#713f12', border: '#fef08a' },
  needs_info:               { bg: '#faf5ff', text: '#581c87', border: '#e9d5ff' },
  rejected:                 { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  pending_review:           { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' },
};

const ELIG_LABELS: Record<string, string> = {
  eligible: 'Eligible', limited: 'Limited', blocked: 'Blocked',
  review_required: 'Review req.', approved: 'Approved',
};
const ELIG_CLS: Record<string, string> = {
  eligible: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  limited:  'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  blocked:  'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
  review_required: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
};
const READINESS_CLS: Record<string, string> = {
  report_ready:       'text-green-700',
  usable_with_caveat: 'text-[#8A5A00]',
  needs_evidence:     'text-[#9E3B2F]',
  not_ready:          'text-[rgba(6,3,43,0.40)]',
};

function StatCard({ label, value, sub, color = '#06032B', highlight = false }: {
  label: string; value: number | string; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded border px-3 py-2.5 ${highlight ? 'border-[#c7c4f8] bg-[#f5f4ff]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-0.5">{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function CompanyEvidenceArchivePanel() {
  const searchParams = useSearchParams();

  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [TENANT, setTENANT] = useState(searchParams?.get('tenantCode') ?? '');
  const [PERIOD, setPERIOD] = useState(searchParams?.get('reportingPeriod') ?? '2026-Q1');
  const [data, setData]     = useState<ArchiveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selectedBatchIdFull, setSelectedBatchIdFull] = useState<string | null>(null);
  const [showAttachPanel, setShowAttachPanel] = useState(false);
  // B35: Evidence Record Drawer
  const [drawerRecord, setDrawerRecord] = useState<{ recordIdFull: string; batchIdFull: string } | null>(null);
  // B34: open link status per attachmentId
  const [openLinkLoading, setOpenLinkLoading] = useState<string | null>(null); // attachmentId being opened
  const [openLinkErrors, setOpenLinkErrors]   = useState<Record<string, string>>({});

  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok && d.tenants) setTenantList(d.tenants);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadArchive = useCallback(() => {
    if (!TENANT) return;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/admin/company-evidence-archive?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`, {
      credentials: 'include',
    })
      .then(r => r.json() as Promise<ArchiveData>)
      .then(d => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TENANT, PERIOD]);

  // Client-side filter + search
  const filteredInitiatives = useMemo(() => {
    if (!data?.initiatives) return [];
    let list = data.initiatives;

    if (filter === 'manual_completion')    list = list.filter(i => i.hasManualCompletion);
    else if (filter === 'multi_file')      list = list.filter(i => i.hasMultiFileMatch);
    else if (filter !== 'all')             list = list.filter(i => i.contributionRole === filter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(i =>
        i.safeName.toLowerCase().includes(q) ||
        (i.pillar ?? '').toLowerCase().includes(q) ||
        (i.budgetClass ?? '').toLowerCase().includes(q) ||
        i.contributionRoleLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [data, filter, search]);

  // B34: open stored attachment via signed URL — never stored in state
  async function handleOpenSecureLink(batchIdFull: string, attachmentId: string) {
    setOpenLinkLoading(attachmentId);
    setOpenLinkErrors(prev => { const n = { ...prev }; delete n[attachmentId]; return n; });
    try {
      const res = await fetch('/api/admin/evidence-attachments/signed-url', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT, batchId: batchIdFull, attachmentId }),
      });
      const d = await res.json() as { ok: boolean; signedUrl?: string; error?: string };
      if (!res.ok || !d.ok || !d.signedUrl) {
        setOpenLinkErrors(prev => ({ ...prev, [attachmentId]: d.error ?? `HTTP ${res.status}` }));
      } else {
        // Open immediately — do not store signed URL in state
        window.open(d.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (e) {
      setOpenLinkErrors(prev => ({ ...prev, [attachmentId]: e instanceof Error ? e.message : String(e) }));
    } finally {
      setOpenLinkLoading(null);
    }
  }

  return (
    <>
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">

      {/* ── Header ── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D]">KORA</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Company Evidence Archive</h1>
          <p className="text-sm text-white/45 mt-0.5">Archivio Evidenze Azienda · Read-only lineage · {TENANT || '—'} · {PERIOD}</p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1">
          <span className="rounded border border-[#D99A2B]/40 bg-[#D99A2B]/10 px-2 py-0.5 text-xs font-semibold text-[#D99A2B]">Read-only</span>
          <span className="rounded border border-[#C8FF47]/40 bg-[#C8FF47]/10 px-2 py-0.5 text-xs font-semibold text-[#d4ff6b]">No operational actions</span>
        </div>
      </div>

      {/* ── Selector ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Azienda</p>
          {tenantList.length > 0 ? (
            <select value={TENANT} onChange={e => { setTENANT(e.target.value); setData(null); }}
              className="rounded border border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[160px]">
              <option value="">— Seleziona azienda —</option>
              {tenantList.map(t => (
                <option key={t.tenantCode} value={t.tenantCode}>{t.tenantCode} — {t.companyName}</option>
              ))}
            </select>
          ) : (
            <input value={TENANT} onChange={e => setTENANT(e.target.value.toUpperCase())}
              placeholder="Codice azienda"
              className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none w-36" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Reporting Period</p>
          <input value={PERIOD} onChange={e => setPERIOD(e.target.value)} placeholder="2026-Q1"
            className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none w-28" />
        </div>
        <button onClick={loadArchive} disabled={!TENANT || loading}
          className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? '⏳ Caricamento…' : '↻ Carica archivio'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-sm text-[#9E3B2F]">⚠ {error}</div>
      )}

      {data?.ok === false && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-sm text-[#9E3B2F]">⚠ {data.error ?? 'Errore nel caricamento archivio.'}</div>
      )}

      {data?.ok && <>

        {/* ── Batch Archive ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-[#C76F3D] rounded-full" />
            <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Batch Archive — {data.batches.length} batch</p>
          </div>
          {data.batches.length === 0 ? (
            <p className="text-xs text-[rgba(6,3,43,0.40)]">Nessun batch trovato per questo periodo.</p>
          ) : (
            <div className="space-y-2">
              {data.batches.map((b, i) => (
                <div key={i} className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-3">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="font-mono text-[10px] text-[rgba(6,3,43,0.40)]">{b.batchId}</span>
                    <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{fmtDate(b.createdAt)}</span>
                    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase">{b.batchStatus}</span>
                    <span className="text-[10px] text-[rgba(6,3,43,0.52)]">{b.rowCount} righe</span>
                    {b.fileMode === 'multi' && (
                      <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-semibold text-[#C76F3D]">
                        multi-file · {b.fileCount} file
                      </span>
                    )}
                    {b.selectedSheetName && (
                      <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[9px] font-mono text-[rgba(6,3,43,0.52)]">
                        sheet: {b.selectedSheetName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.mappingApplied && (
                      <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.52)]">
                        mapping: {b.mappingFieldCount ?? '?'} campi
                      </span>
                    )}
                    {b.manualCompletionUsed && (
                      <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[9px] text-[#8A5A00]">
                        manual: {b.manualFields.join(', ')}
                      </span>
                    )}
                    {b.matchSummary && (
                      <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-1.5 py-0.5 text-[9px] text-green-700">
                        match: {b.matchSummary['matched'] ?? 0}✓ {b.matchSummary['possibleMatch'] ?? 0}≈ {b.matchSummary['unmatched'] ?? 0}✗
                      </span>
                    )}
                    {b.hasAttachments && (
                      <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.72)] cursor-pointer"
                        onClick={() => { setSelectedBatchIdFull(b.batchIdFull ?? b.batchId.replace('…', '')); setShowAttachPanel(v => !v); }}>
                        📎 {b.attachmentCount ?? 0} attachment{(b.attachmentCount ?? 0) !== 1 ? 's' : ''}
                        {b.attachmentSummary?.['suggestedL3Count'] ? ` · L3×${b.attachmentSummary['suggestedL3Count']}` : ''}
                        {(b.attachments ?? []).some(a => a.storageStatus === 'stored_private') ? ' · 🔒 private' : ''}
                      </span>
                    )}
                    {b.provenanceEnabled && (
                      <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.72)]">
                        provenance ✓
                        {b.provenanceSummary ? ` · ${b.provenanceSummary['originalFileFields'] ?? 0} orig + ${b.provenanceSummary['columnMappedFields'] ?? 0} mapped` : ''}
                      </span>
                    )}
                  </div>
                  {b.sourceName && (
                    <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-1 font-mono truncate">{b.sourceName}</p>
                  )}
                  {/* B34/B35.1: individual attachment list with open + lifecycle actions */}
                  {b.attachments && b.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[rgba(6,3,43,0.05)] space-y-2">
                      {b.attachments.map(att => (
                        <div key={att.attachmentId} className="rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-mono text-[rgba(6,3,43,0.62)] truncate max-w-[160px]">{att.fileNameSafe}</span>
                            <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.40)] uppercase">{att.fileType}</span>
                            {att.evidenceLevelSuggestion && (
                              <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-bold text-[#C76F3D]">{att.evidenceLevelSuggestion}</span>
                            )}
                            {/* B35.1: lifecycle badge */}
                            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
                              att.lifecycleStatus === 'active'          ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' :
                              att.lifecycleStatus === 'archived'        ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-[#8A5A00]' :
                              att.lifecycleStatus === 'removed'         ? 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-[#9E3B2F]' :
                              att.lifecycleStatus === 'storage_removed' ? 'border-red-100 bg-[rgba(158,59,47,0.06)] text-red-500' :
                              'border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.40)]'
                            }`}>
                              {att.lifecycleLabel ?? att.lifecycleStatus}
                            </span>
                          </div>
                          {/* Open button (conditioned by lifecycle) */}
                          <div className="flex items-center gap-2 mt-1.5">
                            {att.canOpenSecurely ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => b.batchIdFull && handleOpenSecureLink(b.batchIdFull, att.attachmentId)}
                                  disabled={openLinkLoading === att.attachmentId}
                                  className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-[9px] font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.06)] disabled:opacity-50 transition-colors"
                                >
                                  {openLinkLoading === att.attachmentId ? '⏳' : '🔒 Apri'}
                                </button>
                                {openLinkErrors[att.attachmentId] && (
                                  <span className="text-[9px] text-[#9E3B2F]">⚠ {openLinkErrors[att.attachmentId]}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[9px] text-[rgba(6,3,43,0.40)]">
                                {att.lifecycleStatus === 'archived' ? '⚠ Archiviato' :
                                 att.lifecycleStatus === 'removed' ? '⊘ Rimosso' :
                                 att.lifecycleStatus === 'storage_removed' ? '⊘ File rimosso' :
                                 '📋 Solo metadati'}
                              </span>
                            )}
                          </div>
                          {/* B35.1: Lifecycle action buttons */}
                          {b.batchIdFull && (
                            <AttachmentLifecycleActions
                              tenantCode={TENANT}
                              batchId={b.batchIdFull}
                              attachmentId={att.attachmentId}
                              fileNameSafe={att.fileNameSafe}
                              lifecycleStatus={att.lifecycleStatus}
                              storageStatus={att.storageStatus}
                              onActionCompleted={loadArchive}
                            />
                          )}
                        </div>
                      ))}
                      <p className="text-[9px] text-[#D99A2B]">
                        🔒 Link temporanei (5 min) · Non condividere · Non influenzano scoring
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── B31: Evidence Attachments ── */}
        {showAttachPanel && selectedBatchIdFull && (
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-[#F8F6F1] px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-0.5 h-4 bg-[rgba(199,111,61,0.08)]0 rounded-full" />
                <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Evidence Attachments</p>
                <span className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-2 py-0.5 text-[9px] font-semibold text-[rgba(6,3,43,0.72)]">B34 · Private storage · No raw content</span>
              </div>
              <button onClick={() => setShowAttachPanel(false)} className="text-[10px] text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.62)]">✕ Chiudi</button>
            </div>
            <EvidenceAttachmentPanel tenantCode={TENANT} batchId={selectedBatchIdFull} />
          </div>
        )}

        {!showAttachPanel && data.batches.some(b => b.batchIdFull) && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const firstBatch = data.batches.find(b => b.batchIdFull);
                if (firstBatch?.batchIdFull) { setSelectedBatchIdFull(firstBatch.batchIdFull); setShowAttachPanel(true); }
              }}
              className="rounded border border-[rgba(199,111,61,0.22)] bg-[rgba(199,111,61,0.08)] px-3 py-1 text-[10px] font-semibold text-[rgba(6,3,43,0.72)] hover:bg-[rgba(6,3,43,0.06)] transition-colors">
              📎 Aggiungi evidence attachment
            </button>
            <span className="text-[10px] text-[rgba(6,3,43,0.40)]">Allega fatture, export provider, LMS, policy (metadata only)</span>
          </div>
        )}

        {/* ── Contribution Summary ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-[#C76F3D] rounded-full" />
            <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Contribution Summary</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="Totale iniziative"        value={data.contributionSummary.totalInitiatives} />
            <StatCard label="→ KORA Index"             value={data.contributionSummary.contributesToKoraIndex} color="#059669" highlight />
            <StatCard label="KORA Index + BTI"         value={data.contributionSummary.koraIndexAndBti} color="#166534" />
            <StatCard label="KORA Index only"          value={data.contributionSummary.koraIndexOnly} color="#C76F3D" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="BTI / Economic Relief"  value={data.contributionSummary.btiOnlyEconomicRelief} color="#854d0e" />
            <StatCard label="Reporting Context"      value={data.contributionSummary.reportingContextOnly} color="#0c4a6e" />
            <StatCard label="Compliance Excluded"    value={data.contributionSummary.excludedCompliance} color="#713f12" />
            <StatCard label="Needs Info / Pending"   value={data.contributionSummary.needsInfo + data.contributionSummary.pendingReview} color="#6b7280" />
          </div>
        </div>

        {/* ── Initiative Lineage ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-4 bg-[#C76F3D] rounded-full" />
              <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Initiative Lineage</p>
              <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{filteredInitiatives.length}/{data.initiatives.length}</span>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca iniziativa…"
              className="rounded border border-[rgba(6,3,43,0.08)] px-2 py-1 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D] w-40" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${filter === f ? 'bg-[#06032B] text-white border-[#06032B]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.05)]'}`}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.08)]">
                  {['Iniziativa', 'Pillar', 'Eligibility', 'Budget Class', 'Evidenza', 'Readiness', 'Contributo', ''].map(h => (
                    <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInitiatives.slice(0, 100).map((ini, i) => {
                  const rc = ROLE_COLORS[ini.contributionRole] ?? ROLE_COLORS['pending_review'];
                  return (
                    <tr key={i} className="border-b border-[rgba(6,3,43,0.05)] hover:bg-[rgba(6,3,43,0.03)]">
                      <td className="py-2 px-2 max-w-[180px]">
                        <div className="font-medium text-[rgba(6,3,43,0.78)] truncate" title={ini.safeName}>{ini.safeName}</div>
                        <div className="flex gap-1 mt-0.5 flex-wrap">
                          {ini.hasManualCompletion && <span className="text-[8px] text-[#D99A2B] font-medium">manual</span>}
                          {ini.hasColumnMapping    && <span className="text-[8px] text-[#C76F3D] font-medium">mapped</span>}
                          {ini.hasMultiFileMatch   && <span className="text-[8px] text-green-600 font-medium">multi-file</span>}
                          {ini.hasB30Provenance    && (
                            <span className="text-[8px] text-[#C76F3D] font-medium"
                              title={ini.provenanceSummary
                                ? [
                                    `${ini.provenanceSummary.fieldCount ?? 0} fields tracked`,
                                    ini.provenanceSummary.sourceRoles?.length
                                      ? `merged from: ${ini.provenanceSummary.sourceRoles.join(', ')}`
                                      : '',
                                    ini.provenanceSummary.conflictRetainedCount
                                      ? `${ini.provenanceSummary.conflictRetainedCount} conflict(s) retained`
                                      : '',
                                  ].filter(Boolean).join(' · ')
                                : 'provenance tracked'}>
                              prov{ini.provenanceSummary?.sourceRoles?.length
                                ? `←${ini.provenanceSummary.sourceRoles.join('/')}` : ''}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-[rgba(6,3,43,0.52)]">{ini.pillar ?? '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${ELIG_CLS[ini.eligibility] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]'}`}>
                          {ELIG_LABELS[ini.eligibility] ?? ini.eligibility}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-[rgba(6,3,43,0.52)] text-[10px]">{ini.budgetClass ?? '—'}</td>
                      <td className="py-2 px-2 text-[rgba(6,3,43,0.52)] text-[10px]">{ini.evidenceLevel ?? '—'}</td>
                      <td className={`py-2 px-2 text-[10px] font-medium ${READINESS_CLS[ini.reportingReadiness ?? ''] ?? 'text-[rgba(6,3,43,0.40)]'}`}>
                        {ini.reportingReadiness?.replace('_', ' ') ?? '—'}
                      </td>
                      <td className="py-2 px-2">
                        <span className="rounded border px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ background: rc.bg, color: rc.text, borderColor: rc.border }}
                          title={ini.contributionExplanation}>
                          {ini.contributionRoleLabel}
                        </span>
                      </td>
                      {/* B35: View evidence button */}
                      <td className="py-2 px-2">
                        {ini.recordIdFull && ini.batchIdFull ? (
                          <button
                            onClick={() => setDrawerRecord({ recordIdFull: ini.recordIdFull!, batchIdFull: ini.batchIdFull! })}
                            className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-2 py-0.5 text-[9px] font-semibold text-[#C76F3D] hover:bg-[#ede9ff] transition-colors whitespace-nowrap"
                          >
                            View →
                          </button>
                        ) : <span className="text-[9px] text-[rgba(6,3,43,0.28)]">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredInitiatives.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-xs text-[rgba(6,3,43,0.40)]">Nessuna iniziativa trovata per questo filtro.</td></tr>
                )}
              </tbody>
            </table>
            {filteredInitiatives.length > 100 && (
              <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">Mostrando prime 100 di {filteredInitiatives.length}.</p>
            )}
          </div>
        </div>

        {/* ── Caveats ── */}
        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-5 py-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8A5A00]">Privacy & Methodology Boundaries</p>
          <ul className="space-y-1">
            {data.caveats.map((c, i) => (
              <li key={i} className="text-[10px] text-[#8A5A00] leading-relaxed">· {c}</li>
            ))}
          </ul>
          <p className="text-[10px] text-[#8A5A00] font-semibold pt-1 border-t border-[rgba(217,154,43,0.25)]">
            No edit · No upload · No scoring · No delete. Sola lettura.
          </p>
        </div>

        {/* ── Navigation links ── */}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={`/admin/company-live-preview?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`}
            className="rounded-lg border border-[#C76F3D] text-[#C76F3D] px-4 py-2 text-xs font-semibold hover:bg-[#f5f4ff] transition-colors">
            ← Company Live Preview
          </a>
          <a href={`/admin/company-workspace?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`}
            className="rounded-lg border border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.62)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors">
            Spazio Azienda
          </a>
          <a href="/admin/data-intake"
            className="rounded-lg border border-[rgba(6,3,43,0.08)] text-[rgba(6,3,43,0.62)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors">
            Data Intake
          </a>
        </div>

      </>}

      {!data && !loading && !error && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-5 py-8 text-center text-sm text-[rgba(6,3,43,0.40)]">
          Seleziona un&apos;azienda e un periodo, poi clicca &quot;Carica archivio&quot;.
        </div>
      )}

    </div>

    {/* B35: Evidence Record Drawer — full-screen overlay */}
    {drawerRecord && (
      <EvidenceRecordDrawer
        tenantCode={TENANT}
        recordIdFull={drawerRecord.recordIdFull}
        batchIdFull={drawerRecord.batchIdFull}
        onClose={() => setDrawerRecord(null)}
      />
    )}
    </>
  );
}
