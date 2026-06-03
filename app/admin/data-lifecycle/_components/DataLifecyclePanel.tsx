'use client';

// app/admin/data-lifecycle/_components/DataLifecyclePanel.tsx
// B10 — Data Lifecycle: inspect, archive, delete batches.
// No scoring. No tenant delete. No PII in display.

import { useEffect, useState } from 'react';

interface BatchSummary {
  batchId: string; sourceName: string | null; sourceType: string;
  reportingPeriod: string; batchStatus: string; rowCount: number;
  createdAt: string; tenantCode: string | null; companyName: string | null;
}

interface InspectResult {
  ok: boolean;
  batchId?: string;
  batch?: { sourceName:string|null; sourceType:string; reportingPeriod:string; batchStatus:string; rowCount:number; createdAt:string; createdBy:string|null };
  tenant?: { tenantCode:string; companyName:string };
  counts?: { uploadedRecords:number; uefRecords:number; uefApproved:number; koraIndexResults:number; decisionPacks:number };
  decisionPacks?: Array<{ id:string; versionId:string; status:string; archivedAt:string|null; createdAt:string }>;
  deletionRisk?: 'safe' | 'active_results' | 'exported_report';
  recommendedAction?: 'delete' | 'archive' | 'review';
  blockingReason?: string | null;
  error?: string;
}

interface ActionResult { ok: boolean; message?: string; archivedDPCount?: number; deletedUploadedCount?: number; deletedUefCount?: number; error?: string; hint?: string; }

const RISK_CLS: Record<string, string> = {
  safe:            'bg-green-50 text-green-700 border-green-200',
  active_results:  'bg-amber-50 text-amber-700 border-amber-200',
  exported_report: 'bg-red-50 text-red-700 border-red-200',
};
const STATUS_CLS: Record<string, string> = {
  pending:    'bg-amber-50 text-amber-700 border-amber-200',
  processing: 'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  approved:   'bg-green-50 text-green-700 border-green-200',
  rejected:   'bg-red-50 text-red-700 border-red-200',
  partial:    'bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]',
  archived:   'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day:'2-digit', month:'short', year:'numeric' }); }
  catch { return s; }
}

export function DataLifecyclePanel({ userEmail, userRole }: { userEmail:string; userRole:string }) {
  const [batches, setBatches]       = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [inspect, setInspect]       = useState<InspectResult|null>(null);
  const [inspecting, setInspecting] = useState(false);

  const [archiveStatus, setArchiveStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [archiveResult, setArchiveResult] = useState<ActionResult|null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteStatus, setDeleteStatus]   = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [deleteResult, setDeleteResult]   = useState<ActionResult|null>(null);

  useEffect(() => {
    fetch('/api/admin/data-lifecycle', { credentials:'include' })
      .then(r => r.json())
      .then((d: { ok?:boolean; batches?:BatchSummary[] }) => { if (d.ok) setBatches(d.batches ?? []); })
      .catch(() => {})
      .finally(() => setBatchesLoading(false));
  }, []);

  async function handleInspect(batchId: string) {
    setSelectedId(batchId); setInspecting(true); setInspect(null);
    setArchiveStatus('idle'); setArchiveResult(null);
    setDeleteStatus('idle'); setDeleteResult(null); setDeleteConfirm('');
    const res  = await fetch(`/api/admin/data-lifecycle?batchId=${batchId}`, { credentials:'include' });
    const data = await res.json() as InspectResult;
    setInspect(data); setInspecting(false);
  }

  async function handleArchive() {
    if (!selectedId) return;
    setArchiveStatus('loading'); setArchiveResult(null);
    const res  = await fetch('/api/admin/data-lifecycle/archive', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ batchId: selectedId, reason: 'Archived via Data Lifecycle Panel' }),
    });
    const data = await res.json() as ActionResult;
    setArchiveResult(data); setArchiveStatus(data.ok ? 'done' : 'error');
    if (data.ok) { await handleInspect(selectedId); }
  }

  async function handleDelete() {
    if (!selectedId || deleteConfirm !== 'DELETE_BATCH') return;
    setDeleteStatus('loading'); setDeleteResult(null);
    const res  = await fetch('/api/admin/data-lifecycle/delete', {
      method:'POST', credentials:'include',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ batchId: selectedId, confirmation: 'DELETE_BATCH', reason: 'Deleted via Data Lifecycle Panel' }),
    });
    const data = await res.json() as ActionResult;
    setDeleteResult(data); setDeleteStatus(data.ok ? 'done' : 'error');
    if (data.ok) {
      setBatches(prev => prev.map(b => b.batchId === selectedId ? { ...b, batchStatus: 'rejected' } : b));
      await handleInspect(selectedId);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">Data Lifecycle</h1>
          <p className="text-sm text-white/45 mt-0.5">B10 — Inspect · Archive · Controlled Delete</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <div className="flex flex-wrap gap-1">
            {['No company delete', 'No PII', 'Audit required'].map(m => (
              <span key={m} className="rounded border border-white/12 bg-[#F8F6F1]/5 px-2 py-0.5 text-[10px] text-white/38">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">

        {/* ── Left: batch list ── */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">Recent Batches</p>
          {batchesLoading && <p className="text-xs text-[rgba(6,3,43,0.40)]">Loading…</p>}
          {!batchesLoading && batches.length === 0 && (
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 text-xs text-[rgba(6,3,43,0.40)]">
              No batches found. Accept a CSV via Data Intake first.
            </div>
          )}
          {batches.map(b => (
            <div key={b.batchId}
              onClick={() => handleInspect(b.batchId)}
              className={`rounded-lg border px-4 py-3 cursor-pointer space-y-1.5 transition-colors ${selectedId===b.batchId?'border-[#C76F3D] bg-[#f5f4ff]':'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] hover:border-[rgba(6,3,43,0.14)]'}`}>
              {b.companyName && (
                <p className="text-[10px] font-semibold text-[#C76F3D]">{b.companyName} <span className="font-mono opacity-70">· {b.tenantCode}</span></p>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[rgba(6,3,43,0.90)] truncate">{b.sourceName ?? b.batchId.slice(0,12)+'…'}</p>
                <Badge label={b.batchStatus} cls={STATUS_CLS[b.batchStatus] ?? STATUS_CLS['partial']} />
              </div>
              <div className="flex gap-3 text-[10px] text-[rgba(6,3,43,0.52)]">
                <span>Period: {b.reportingPeriod}</span>
                <span>Rows: {b.rowCount}</span>
                <span>{ts(b.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Right: inspection + actions ── */}
        <div className="space-y-4">
          {!selectedId && (
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-5 py-8 text-center text-sm text-[rgba(6,3,43,0.40)]">
              Select a batch to inspect its data lifecycle.
            </div>
          )}

          {inspecting && <p className="text-xs text-[rgba(6,3,43,0.40)]">Loading inspection…</p>}

          {inspect?.ok && inspect.counts && (
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-4">

              {/* Overview */}
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-bold text-[rgba(6,3,43,0.90)]">{inspect.tenant?.companyName}</p>
                  <p className="text-xs font-mono text-[rgba(6,3,43,0.52)]">{inspect.tenant?.tenantCode} · {inspect.batch?.reportingPeriod}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Badge label={inspect.batch?.batchStatus ?? '—'} cls={STATUS_CLS[inspect.batch?.batchStatus ?? ''] ?? STATUS_CLS['partial']} />
                  {inspect.deletionRisk && (
                    <Badge label={`Risk: ${inspect.deletionRisk}`} cls={RISK_CLS[inspect.deletionRisk] ?? ''} />
                  )}
                </div>
              </div>

              {/* Counts */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                <span className="text-[rgba(6,3,43,0.40)]">Uploaded Records <strong className="text-[rgba(6,3,43,0.90)] tabular-nums">{inspect.counts.uploadedRecords}</strong></span>
                <span className="text-[rgba(6,3,43,0.40)]">UEF Records <strong className="text-[rgba(6,3,43,0.90)] tabular-nums">{inspect.counts.uefRecords}</strong></span>
                <span className="text-[rgba(6,3,43,0.40)]">Approved UEF <strong className="text-[rgba(6,3,43,0.90)] tabular-nums">{inspect.counts.uefApproved}</strong></span>
                <span className="text-[rgba(6,3,43,0.40)]">KORA Index Results <strong className="text-[rgba(6,3,43,0.90)] tabular-nums">{inspect.counts.koraIndexResults}</strong></span>
                <span className="text-[rgba(6,3,43,0.40)]">Decision Packs <strong className="text-[rgba(6,3,43,0.90)] tabular-nums">{inspect.counts.decisionPacks}</strong></span>
              </div>

              {/* Decision Packs */}
              {inspect.decisionPacks && inspect.decisionPacks.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Decision Packs</p>
                  {inspect.decisionPacks.map(dp => (
                    <div key={dp.id} className="flex items-center justify-between py-1 border-t border-[rgba(6,3,43,0.05)] text-xs">
                      <span className="font-mono text-[rgba(6,3,43,0.52)] truncate">{dp.versionId.slice(0,30)}…</span>
                      <Badge label={dp.status} cls={STATUS_CLS[dp.status] ?? STATUS_CLS['partial']} />
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended action */}
              {inspect.blockingReason && (
                <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  ⚠ {inspect.blockingReason}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 border-t border-[rgba(6,3,43,0.05)] space-y-3">

                {/* Archive */}
                <div>
                  <button onClick={handleArchive} disabled={archiveStatus==='loading'}
                    className="rounded border border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] px-4 py-1.5 text-xs font-medium text-[rgba(6,3,43,0.78)] hover:bg-[rgba(6,3,43,0.05)] disabled:opacity-50 transition-colors">
                    {archiveStatus==='loading' ? '⏳ Archiving…' : '□ Archive (Decision Packs)'}
                  </button>
                  {archiveStatus==='done' && archiveResult?.ok && (
                    <p className="text-[10px] text-green-700 mt-1">✓ {archiveResult.message}</p>
                  )}
                  {archiveStatus==='error' && archiveResult && (
                    <p className="text-[10px] text-red-600 mt-1">⚠ {archiveResult.error}</p>
                  )}
                </div>

                {/* Delete */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">⚠ Delete Batch Data</p>
                  <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Permanently deletes uploaded_record + uef_record. Type DELETE_BATCH to confirm.</p>
                  <div className="flex gap-2 flex-wrap">
                    <input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE_BATCH"
                      className="rounded border border-red-300 px-2.5 py-1.5 text-xs font-mono text-red-700 w-36 focus:outline-none focus:ring-1 focus:ring-red-400"
                    />
                    <button onClick={handleDelete}
                      disabled={deleteConfirm !== 'DELETE_BATCH' || deleteStatus==='loading'}
                      className="rounded border border-red-400 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {deleteStatus==='loading' ? '⏳ Deleting…' : '✕ Delete batch data'}
                    </button>
                  </div>
                  {deleteStatus==='done' && deleteResult?.ok && (
                    <p className="text-[10px] text-green-700">✓ {deleteResult.message}</p>
                  )}
                  {deleteStatus==='error' && deleteResult && (
                    <div className="text-[10px] text-red-600">
                      <p>⚠ {deleteResult.error}</p>
                      {deleteResult.hint && <p className="text-[rgba(6,3,43,0.52)] mt-0.5">{deleteResult.hint}</p>}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {inspect && !inspect.ok && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
              ⚠ {inspect.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
