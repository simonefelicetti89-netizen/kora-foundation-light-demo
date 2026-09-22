'use client';

// app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx
// B29/B31: Company Evidence Archive — read-only lineage + evidence attachment metadata.
// No edit (except attachment register), no scoring, no delete. Privacy-safe view.

import { useEffect, useState, useMemo, useCallback } from 'react';
import { EvidenceAttachmentPanel } from './EvidenceAttachmentPanel';
import { EvidenceRecordDrawer } from './EvidenceRecordDrawer';
import { AttachmentLifecycleActions } from './AttachmentLifecycleActions';
import { useSearchParams } from 'next/navigation';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { BADGE_TOKENS, TOKENS } from '@/lib/design/kora-design-tokens';

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
  kora_index_and_bti:       { bg: BADGE_TOKENS.eligible.bg, text: BADGE_TOKENS.eligible.text, border: BADGE_TOKENS.eligible.border },
  kora_index_only:          { bg: TOKENS.accentSoft, text: TOKENS.violet, border: TOKENS.accentSoft },
  bti_only_economic_relief: { bg: BADGE_TOKENS.limited.bg, text: BADGE_TOKENS.limited.text, border: BADGE_TOKENS.limited.border },
  reporting_context_only:   { bg: BADGE_TOKENS.info.bg, text: BADGE_TOKENS.info.text, border: BADGE_TOKENS.info.border },
  excluded_compliance:      { bg: BADGE_TOKENS.limited.bg, text: BADGE_TOKENS.limited.text, border: BADGE_TOKENS.limited.border },
  needs_info:               { bg: TOKENS.accentSoft, text: TOKENS.violet, border: TOKENS.accentSoft },
  rejected:                 { bg: BADGE_TOKENS.blocked.bg, text: BADGE_TOKENS.blocked.text, border: BADGE_TOKENS.blocked.border },
  pending_review:           { bg: TOKENS.surface, text: TOKENS.inkSecondary, border: TOKENS.inkBorder },
};

const ELIG_LABELS: Record<string, string> = {
  eligible: 'Eligible', limited: 'Limited', blocked: 'Blocked',
  review_required: 'Review req.', approved: 'Approved',
};
const ELIG_CLS: Record<string, string> = {
  eligible: 'bg-[rgba(47,125,85,0.10)] text-kora-success border-[rgba(47,125,85,0.22)]',
  limited:  'bg-[rgba(217,154,43,0.12)] text-kora-warning-text border-[rgba(217,154,43,0.25)]',
  blocked:  'bg-[rgba(158,59,47,0.10)] text-kora-critical border-[rgba(158,59,47,0.22)]',
  review_required: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-[rgba(47,125,85,0.10)] text-kora-success border-[rgba(47,125,85,0.22)]',
};
const READINESS_CLS: Record<string, string> = {
  report_ready:       'text-green-700',
  usable_with_caveat: 'text-kora-warning-text',
  needs_evidence:     'text-kora-critical',
  not_ready:          'text-[rgba(6,3,43,0.40)]',
};

function StatCard({ label, value, sub, color = TOKENS.ink, highlight = false }: {
  label: string; value: number | string; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded border px-3 py-2.5 ${highlight ? 'border-kora-accent/25 bg-kora-accent/8' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)]'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-0.5">{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

interface Props { initialTenantCode?: string; }

export function CompanyEvidenceArchivePanel({ initialTenantCode }: Props = {}) {
  const searchParams = useSearchParams();
  const showSelector = !initialTenantCode;

  const [tenantList, setTenantList] = useState<TenantOption[]>([]);
  const [TENANT, setTENANT] = useState(initialTenantCode ?? searchParams?.get('tenantCode') ?? '');
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
      <div className="rounded-xl bg-kora-ink px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-kora-accent">KORA</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Company Evidence Archive</h1>
          <BoundaryBadge mode="LIVE" variant="dark" style={{ marginTop: 6 }} />
          <p className="text-sm text-white/45 mt-0.5">Archivio Evidenze Azienda · Read-only lineage · {TENANT || '—'} · {PERIOD}</p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1">
          <span className="rounded border border-kora-warning/40 bg-kora-warning/10 px-2 py-0.5 text-xs font-semibold text-kora-warning">Read-only</span>
          <span className="rounded border border-kora-accent/40 bg-kora-accent/10 px-2 py-0.5 text-xs font-semibold text-kora-accent">No operational actions</span>
        </div>
      </div>

      {/* ── Selector — hidden when initialTenantCode provided (drill-in context) ── */}
      {showSelector && <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-kora-paper px-4 py-3 flex flex-wrap items-end gap-4">
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
              placeholder="Codice azienda" aria-label="Codice azienda"
              className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none w-36" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Reporting Period</p>
          <input value={PERIOD} onChange={e => setPERIOD(e.target.value)} placeholder="2026-Q1" aria-label="Reporting Period"
            className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none w-28" />
        </div>
        <button onClick={loadArchive} disabled={!TENANT || loading}
          className="rounded-lg bg-kora-ink text-white px-4 py-1.5 text-xs font-semibold hover:bg-kora-ink-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? '⏳ Caricamento…' : '↻ Carica archivio'}
        </button>
      </div>}

      {error && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-sm text-kora-critical">⚠ {error}</div>
      )}

      {data?.ok === false && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-sm text-kora-critical">⚠ {data.error ?? 'Errore nel caricamento archivio.'}</div>
      )}

      {data?.ok && <>

        {/* ── Batch Archive ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-kora-paper px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-kora-accent rounded-full" />
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
                    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-kora-paper px-1.5 py-0.5 text-[9px] font-semibold text-[rgba(6,3,43,0.52)] uppercase">{b.batchStatus}</span>
                    <span className="text-[10px] text-[rgba(6,3,43,0.52)]">{b.rowCount} righe</span>
                    {b.fileMode === 'multi' && (
                      <span className="rounded border border-kora-accent/25 bg-kora-accent/8 px-1.5 py-0.5 text-[9px] font-semibold text-kora-accent">
                        multi-file · {b.fileCount} file
                      </span>
                    )}
                    {b.selectedSheetName && (
                      <span className="rounded border border-[rgba(6,3,43,0.08)] bg-kora-paper px-1.5 py-0.5 text-[9px] font-mono text-[rgba(6,3,43,0.52)]">
                        sheet: {b.selectedSheetName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.mappingApplied && (
                      <span className="rounded border border-[rgba(6,3,43,0.08)] bg-kora-paper px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.52)]">
                        mapping: {b.mappingFieldCount ?? '?'} campi
                      </span>
                    )}
                    {b.manualCompletionUsed && (
                      <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-1.5 py-0.5 text-[9px] text-kora-warning-text">
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
                            <span className="rounded border border-[rgba(6,3,43,0.08)] bg-kora-paper px-1.5 py-0.5 text-[9px] text-[rgba(6,3,43,0.40)] uppercase">{att.fileType}</span>
                            {att.evidenceLevelSuggestion && (
                              <span className="rounded border border-kora-accent/25 bg-kora-accent/8 px-1.5 py-0.5 text-[9px] font-bold text-kora-accent">{att.evidenceLevelSuggestion}</span>
                            )}
                            {/* B35.1: lifecycle badge */}
                            <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${
                              att.lifecycleStatus === 'active'          ? 'border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] text-kora-success' :
                              att.lifecycleStatus === 'archived'        ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-kora-warning-text' :
                              att.lifecycleStatus === 'removed'         ? 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] text-kora-critical' :
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
                                  <span className="text-[9px] text-kora-critical">⚠ {openLinkErrors[att.attachmentId]}</span>
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
                      <p className="text-[9px] text-kora-warning">
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
          <div className="rounded-lg border border-[rgba(199,111,61,0.22)] bg-kora-paper px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-0.5 h-4 bg-kora-accent rounded-full" />
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
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-kora-paper px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-kora-accent rounded-full" />
            <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Contribution Summary</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="Totale iniziative"        value={data.contributionSummary.totalInitiatives} />
            <StatCard label="→ KORA Index"             value={data.contributionSummary.contributesToKoraIndex} color={BADGE_TOKENS.eligible.text} highlight />
            <StatCard label="KORA Index + BTI"         value={data.contributionSummary.koraIndexAndBti} color={BADGE_TOKENS.eligible.text} />
            <StatCard label="KORA Index only"          value={data.contributionSummary.koraIndexOnly} color={TOKENS.accent} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="BTI / Economic Relief"  value={data.contributionSummary.btiOnlyEconomicRelief} color={BADGE_TOKENS.limited.text} />
            <StatCard label="Reporting Context"      value={data.contributionSummary.reportingContextOnly} color={BADGE_TOKENS.info.text} />
            <StatCard label="Compliance Excluded"    value={data.contributionSummary.excludedCompliance} color={BADGE_TOKENS.limited.text} />
            <StatCard label="Needs Info / Pending"   value={data.contributionSummary.needsInfo + data.contributionSummary.pendingReview} color={TOKENS.inkSecondary} />
          </div>
        </div>

        {/* ── Initiative Lineage ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-kora-paper px-5 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-4 bg-kora-accent rounded-full" />
              <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Initiative Lineage</p>
              <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{filteredInitiatives.length}/{data.initiatives.length}</span>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca iniziativa…" aria-label="Cerca iniziativa"
              className="rounded border border-[rgba(6,3,43,0.08)] px-2 py-1 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-kora-accent w-40" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${filter === f ? 'bg-kora-ink text-white border-kora-ink' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] hover:bg-[rgba(6,3,43,0.05)]'}`}>
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
                    <th scope="col" key={h} className="text-left py-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] whitespace-nowrap">{h}</th>
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
                          {ini.hasManualCompletion && <span className="text-[8px] text-kora-warning font-medium">manual</span>}
                          {ini.hasColumnMapping    && <span className="text-[8px] text-kora-accent font-medium">mapped</span>}
                          {ini.hasMultiFileMatch   && <span className="text-[8px] text-green-600 font-medium">multi-file</span>}
                          {ini.hasB30Provenance    && (
                            <span className="text-[8px] text-kora-accent font-medium"
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
                            className="rounded border border-kora-accent/25 bg-kora-accent/8 px-2 py-0.5 text-[9px] font-semibold text-kora-accent hover:bg-kora-accent/8 transition-colors whitespace-nowrap"
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
          <p className="text-[10px] font-bold uppercase tracking-wide text-kora-warning-text">Privacy & Methodology Boundaries</p>
          <ul className="space-y-1">
            {data.caveats.map((c, i) => (
              <li key={i} className="text-[10px] text-kora-warning-text leading-relaxed">· {c}</li>
            ))}
          </ul>
          <p className="text-[10px] text-kora-warning-text font-semibold pt-1 border-t border-[rgba(217,154,43,0.25)]">
            No edit · No upload · No scoring · No delete. Sola lettura.
          </p>
        </div>

        {/* ── Navigation links ── */}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={`/admin/companies/${encodeURIComponent(TENANT)}/preview`}
            className="rounded-lg border border-kora-accent text-kora-accent px-4 py-2 text-xs font-semibold hover:bg-kora-accent/8 transition-colors">
            ← Company Live Preview
          </a>
          <a href={`/admin/companies/${encodeURIComponent(TENANT)}/workspace`}
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
