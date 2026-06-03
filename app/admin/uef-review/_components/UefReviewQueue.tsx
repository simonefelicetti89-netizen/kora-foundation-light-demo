'use client';

// app/admin/uef-review/_components/UefReviewQueue.tsx
// B5 — UEF Review Queue: review rule-based interpreter proposals.
// NO scoring. NO KORA Index. NO Decision Pack.
// Human review gates approved_for_scoring — actual scoring runs in B6.

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BatchSummary {
  batchId:         string;
  sourceName:      string | null;
  reportingPeriod: string;
  batchStatus:     string;
  rowCount:        number;
  candidateCount:  number;
  canGenerate:     boolean;
  canReview:       boolean;
  createdAt:       string;
  createdBy:       string | null;
  tenantCode:      string | null;   // B9.1: tenant visibility in batch selector
  companyName:     string | null;
}

interface UefCandidate {
  id:                string;
  rawName:           string;
  eligibility:       string;
  pillar:            string | null;
  actionFamily:      string | null;
  eventNature:       string | null;
  reviewStatus:      string;
  approvedForScoring: boolean;
  mappingConfidence: number;
  warnings:          string[];
  reviewerNotes:     string | null;
  reviewedAt:        string | null;
  eventType:         string | null;
  reasonCodes:       string[];
  budgetAmount:      number | null;
  participants:      number | null;
  evidenceLevel:     string | null;
  createdAt:         string;
  // B11: enrichment classification
  initiativeDomain:        string | null;
  budgetClass:             string | null;
  needsEnrichment:         boolean;
  financialConfidence:     number | null;
  enrichmentMissingFields: string[];
  enrichedBy:              string | null;
  enrichedAt:              string | null;
  b11Enriched:             boolean;
}

// B11 enrichment form state
interface EnrichmentForm {
  initiativeDomain: string;
  eventType:        string;
  eligibilityClass: string;
  pillar:           string;
  budgetClass:      string;
  budgetAmount:     string;
  budgetSource:     string;
  evidenceLevel:    string;
  notes:            string;
}
const EMPTY_ENRICHMENT: EnrichmentForm = {
  initiativeDomain: '', eventType: '', eligibilityClass: '',
  pillar: '', budgetClass: '', budgetAmount: '',
  budgetSource: '', evidenceLevel: '', notes: '',
};

const DOMAIN_OPTIONS   = ['welfare','fringe_benefit','economic_relief','hr_learning','esg_volunteering','compliance_hse','previdenza_future','wellbeing_mental_health'];
const BUDGET_CLS_OPTS  = ['deep_activation','economic_relief','compliance_blocked'];
const PILLAR_OPTIONS   = ['LIFE','GROWTH','CONNECTION','IMPACT','LEGACY'];
const EVID_OPTS        = ['L0','L1','L2','L3','L4'];
const ELIG_OPTS        = ['eligible','limited','blocked'];
const EVENT_TYPE_OPTS  = ['mental_health_support','professional_training','mentoring_program','volunteering','economic_relief','compliance_baseline','health_wellness_program','knowledge_transfer','pension_future_support','caregiver_support','childcare_support'];


interface ReviewSummary {
  total: number; approved: number; rejected: number;
  needsInfo: number; pending: number; avgConfidence: number;
}

interface Props { userEmail: string; userRole: string; }

// B6 — scoring result type
interface ScoringResult {
  ok:                       boolean;
  koraIndex?:               number;
  confidenceScore?:         number;
  safeguard?:               string;
  activationRate?:          number;
  meaningfulActivationRate?: number;
  scoringMode?:             string;
  approvedUefCount?:        number;
  workforcePopulation?:     number;
  decisionPack?: { id: string; versionId: string; status: string };
  previewUrl?:  string;
  pdfUrl?:      string;
  error?:       string;
  hint?:        string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function confColor(c: number) {
  if (c >= 0.70) return 'text-green-700';
  if (c >= 0.50) return 'text-amber-700';
  return 'text-red-700';
}

const ELIG_BADGE: Record<string, string> = {
  eligible: 'bg-green-100 text-green-800 border-green-200',
  limited:  'bg-amber-100 text-amber-800 border-amber-200',
  blocked:  'bg-red-100 text-red-800 border-red-200',
};
const STATUS_BADGE: Record<string, string> = {
  pending_review: 'bg-slate-100 text-slate-600 border-slate-200',
  approved:       'bg-green-100 text-green-700 border-green-200',
  rejected:       'bg-red-100 text-red-700 border-red-200',
  needs_info:     'bg-amber-100 text-amber-700 border-amber-200',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function UefReviewQueue({ userEmail, userRole }: Props) {
  // B9.2: read ?batchId= from URL for auto-selection (e.g. from Data Intake CTA)
  const searchParams = useSearchParams();

  const [batches, setBatches]               = useState<BatchSummary[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(true);  // true on mount — no sync setState needed
  const [batchesErr, setBatchesErr]         = useState<string | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [candidates, setCandidates]           = useState<UefCandidate[]>([]);
  const [summary, setSummary]                 = useState<ReviewSummary | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesErr, setCandidatesErr]         = useState<string | null>(null);

  const [genStatus, setGenStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [genMsg, setGenMsg]       = useState<string | null>(null);

  // B6 — live scoring state
  const [scoringWfPop, setScoringWfPop]   = useState<string>('');
  const [scoringStatus, setScoringStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(null);

  const [actionState, setActionState] = useState<Record<string, 'loading'|'done'|'error'>>({});

  // B11: enrichment panel state
  const [enrichOpen, setEnrichOpen]       = useState<string | null>(null);  // uefRecordId
  const [enrichForm, setEnrichForm]       = useState<EnrichmentForm>(EMPTY_ENRICHMENT);
  const [enrichStatus, setEnrichStatus]   = useState<Record<string, 'idle'|'loading'|'done'|'error'>>({});
  const [enrichMsg, setEnrichMsg]         = useState<Record<string, string>>({});

  function openEnrich(c: UefCandidate) {
    setEnrichOpen(c.id);
    setEnrichForm({
      initiativeDomain: c.initiativeDomain ?? '',
      eventType:        c.eventType        ?? '',
      eligibilityClass: c.eligibility      ?? '',
      pillar:           c.pillar           ?? '',
      budgetClass:      c.budgetClass      ?? '',
      budgetAmount:     c.budgetAmount     != null ? String(c.budgetAmount) : '',
      budgetSource:     '',
      evidenceLevel:    c.evidenceLevel    ?? '',
      notes:            '',
    });
  }

  async function handleEnrich(uefRecordId: string) {
    setEnrichStatus(s => ({ ...s, [uefRecordId]: 'loading' }));
    setEnrichMsg(s => ({ ...s, [uefRecordId]: '' }));
    const body: Record<string, unknown> = { uefRecordId };
    if (enrichForm.initiativeDomain) body['initiativeDomain'] = enrichForm.initiativeDomain;
    if (enrichForm.eventType)        body['eventType']        = enrichForm.eventType;
    if (enrichForm.eligibilityClass) body['eligibilityClass'] = enrichForm.eligibilityClass;
    if (enrichForm.pillar)           body['pillar']           = enrichForm.pillar;
    if (enrichForm.budgetClass)      body['budgetClass']      = enrichForm.budgetClass;
    if (enrichForm.budgetAmount)     body['budgetAmount']     = parseFloat(enrichForm.budgetAmount);
    if (enrichForm.budgetSource)     body['budgetSource']     = enrichForm.budgetSource;
    if (enrichForm.evidenceLevel)    body['evidenceLevel']    = enrichForm.evidenceLevel;
    if (enrichForm.notes)            body['notes']            = enrichForm.notes;
    try {
      const res  = await fetch('/api/admin/uef/enrich', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok?: boolean; needsEnrichment?: boolean; financialConfidence?: number; error?: string };
      if (!res.ok || !data.ok) {
        setEnrichStatus(s => ({ ...s, [uefRecordId]: 'error' }));
        setEnrichMsg(s => ({ ...s, [uefRecordId]: data.error ?? `HTTP ${res.status}` }));
      } else {
        setEnrichStatus(s => ({ ...s, [uefRecordId]: 'done' }));
        const still = data.needsEnrichment ? ' · ancora incompleto' : ' · completato';
        setEnrichMsg(s => ({ ...s, [uefRecordId]: `✓ Enrichment saved. Confidence: ${data.financialConfidence != null ? Math.round(data.financialConfidence * 100) + '%' : '—'}${still}` }));
        if (selectedBatchId) loadCandidates(selectedBatchId);
      }
    } catch (e) {
      setEnrichStatus(s => ({ ...s, [uefRecordId]: 'error' }));
      setEnrichMsg(s => ({ ...s, [uefRecordId]: e instanceof Error ? e.message : String(e) }));
    }
  }

  // ── Load batches ──────────────────────────────────────────────────────────────
  // Used by refresh button (event handler context — no ESLint effect rule applies).
  const loadBatches = useCallback(async () => {
    setBatchesLoading(true);
    try {
      const res  = await fetch('/api/admin/uef/review', { credentials: 'include' });
      const data = await res.json() as { ok?: boolean; batches?: BatchSummary[]; error?: string };
      if (!res.ok || !data.ok) setBatchesErr(data.error ?? `HTTP ${res.status}`);
      else { setBatchesErr(null); setBatches(data.batches ?? []); }
    } catch (e) { setBatchesErr(e instanceof Error ? e.message : String(e)); }
    finally     { setBatchesLoading(false); }
  }, []);

  // Initial load — Promise chain keeps all setState calls in async callbacks.
  useEffect(() => {
    fetch('/api/admin/uef/review', { credentials: 'include' })
      .then(r => r.json() as Promise<{ ok?: boolean; batches?: BatchSummary[]; error?: string }>)
      .then(data => {
        if (!data.ok) setBatchesErr(data.error ?? 'Error loading batches');
        else { setBatchesErr(null); setBatches(data.batches ?? []); }
      })
      .catch((e: Error) => setBatchesErr(e.message))
      .finally(() => setBatchesLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load candidates for selected batch ───────────────────────────────────────
  const loadCandidates = useCallback(async (batchId: string) => {
    setCandidatesLoading(true); setCandidatesErr(null); setCandidates([]); setSummary(null);
    try {
      const res  = await fetch(`/api/admin/uef/review?batchId=${batchId}`, { credentials: 'include' });
      const data = await res.json() as { ok?: boolean; candidates?: UefCandidate[]; summary?: ReviewSummary; error?: string };
      if (!res.ok || !data.ok) { setCandidatesErr(data.error ?? `HTTP ${res.status}`); }
      else { setCandidates(data.candidates ?? []); setSummary(data.summary ?? null); }
    } catch (e) { setCandidatesErr(e instanceof Error ? e.message : String(e)); }
    finally     { setCandidatesLoading(false); }
  }, []);

  function selectBatch(batchId: string) {
    setSelectedBatchId(batchId);
    loadCandidates(batchId);
  }

  // B9.2: auto-select batch from ?batchId= query param after batches load.
  // Uses Promise chain to keep setState calls out of the synchronous effect body.
  useEffect(() => {
    if (batchesLoading || selectedBatchId) return;
    const qBatchId = searchParams?.get('batchId');
    if (!qBatchId) return;
    const exists = batches.some(b => b.batchId === qBatchId);
    if (!exists) return;
    // Defer state updates to async context — setSelectedBatchId then fetch candidates
    Promise.resolve().then(() => {
      setSelectedBatchId(qBatchId);
      setCandidates([]); setSummary(null); setCandidatesErr(null);
      setCandidatesLoading(true);
      fetch(`/api/admin/uef/review?batchId=${qBatchId}`, { credentials: 'include' })
        .then(r => r.json())
        .then((d: { ok?: boolean; candidates?: UefCandidate[]; summary?: ReviewSummary; error?: string }) => {
          if (d.ok) { setCandidates(d.candidates ?? []); setSummary(d.summary ?? null); }
          else setCandidatesErr(d.error ?? 'Error loading candidates');
        })
        .catch((e: Error) => setCandidatesErr(e.message))
        .finally(() => setCandidatesLoading(false));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches, batchesLoading]);

  // ── Generate candidates ───────────────────────────────────────────────────────
  async function handleGenerate(batchId: string) {
    setGenStatus('loading'); setGenMsg(null);
    try {
      const res  = await fetch('/api/admin/uef/generate-candidates', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId }),
      });
      const data = await res.json() as { ok?: boolean; generatedCount?: number; message?: string; error?: string };
      if (!res.ok || !data.ok) { setGenStatus('error'); setGenMsg(data.error ?? `HTTP ${res.status}`); }
      else {
        setGenStatus('done');
        setGenMsg(`${data.generatedCount} UEF candidates generated. ${data.message ?? ''}`);
        await loadBatches();
        loadCandidates(batchId);
      }
    } catch (e) { setGenStatus('error'); setGenMsg(e instanceof Error ? e.message : String(e)); }
  }

  // ── B6: Run live scoring from approved UEF ────────────────────────────────────
  async function handleRunScoring(batchId: string) {
    setScoringStatus('loading'); setScoringResult(null);
    const body: Record<string, unknown> = { batchId };
    const wf = parseInt(scoringWfPop, 10);
    if (!isNaN(wf) && wf > 0) body['workforcePopulation'] = wf;
    try {
      const res  = await fetch('/api/admin/scoring/run-approved-batch', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as ScoringResult;
      setScoringResult(data);
      setScoringStatus(data.ok ? 'done' : 'error');
      if (data.ok && batchId) { loadCandidates(batchId); }
    } catch (e) {
      setScoringResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setScoringStatus('error');
    }
  }

  // ── Review action ─────────────────────────────────────────────────────────────
  async function handleAction(uefRecordId: string, action: 'approve'|'reject'|'needs_info') {
    setActionState(s => ({ ...s, [uefRecordId]: 'loading' }));
    try {
      const res  = await fetch('/api/admin/uef/review', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uefRecordId, action }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setActionState(s => ({ ...s, [uefRecordId]: 'error' }));
      } else {
        setActionState(s => ({ ...s, [uefRecordId]: 'done' }));
        if (selectedBatchId) loadCandidates(selectedBatchId);
      }
    } catch { setActionState(s => ({ ...s, [uefRecordId]: 'error' })); }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto py-6 px-3 space-y-5">

      {/* Header */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">KORA · Admin</p>
          <h1 className="text-xl font-bold text-white tracking-tight">UEF Review Queue</h1>
          <p className="text-sm text-white/45 mt-0.5">B5 — Raw-to-UEF Interpreter · human review required</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#9d97ff]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <div className="flex flex-wrap gap-1">
            <span className="rounded border border-red-400/40 bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">Scoring remains locked until B6.</span>
          </div>
        </div>
      </div>

      {/* Mandatory messages */}
      <div className="flex flex-wrap gap-2">
        {[
          'Scoring remains locked until B6.',
          'Only approved UEF records can enter scoring.',
          'Rule-based interpreter — no LLM.',
          'Human review required for each candidate.',
        ].map(m => (
          <span key={m} className="text-[10px] border border-slate-200 bg-slate-50 rounded px-2 py-0.5 text-slate-500 font-medium">{m}</span>
        ))}
      </div>

      {/* Generate status */}
      {genStatus === 'done'  && genMsg  && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs text-green-700">✓ {genMsg}</div>}
      {genStatus === 'error' && genMsg  && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">⚠ {genMsg}</div>}

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">

        {/* ── Left: batch selector ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Batches</p>
            <button onClick={loadBatches}
              className="text-[10px] text-slate-400 underline hover:text-slate-700 transition-colors">
              ↻ Refresh
            </button>
          </div>

          {batchesLoading && <p className="text-xs text-slate-400">Loading batches…</p>}
          {batchesErr    && <p className="text-xs text-red-600">⚠ {batchesErr}</p>}

          {!batchesLoading && batches.length === 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-400">
              No CSV batches pending review. Accept a CSV batch via Data Intake first.
            </div>
          )}

          {batches.map(b => (
            <div key={b.batchId}
              onClick={() => b.canReview && selectBatch(b.batchId)}
              className={`rounded-lg border px-4 py-3 space-y-2 cursor-pointer transition-colors ${selectedBatchId === b.batchId ? 'border-[#C76F3D] bg-[#f5f4ff]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  {/* B9.1: tenant label for multi-tenant clarity */}
                  {b.companyName && (
                    <p className="text-[10px] font-semibold text-[#C76F3D] mb-0.5">{b.companyName} <span className="font-mono opacity-75">· {b.tenantCode}</span></p>
                  )}
                  <p className="text-xs font-semibold text-slate-800 break-all">{b.sourceName ?? b.batchId.slice(0, 12) + '…'}</p>
                </div>
                <Badge label={b.batchStatus} cls={b.batchStatus === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'} />
              </div>
              <div className="flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span>Period: {b.reportingPeriod}</span>
                <span>Rows: {b.rowCount}</span>
                <span>Candidates: {b.candidateCount}</span>
              </div>
              {b.canGenerate && (
                <button
                  onClick={e => { e.stopPropagation(); handleGenerate(b.batchId); }}
                  disabled={genStatus === 'loading'}
                  className="w-full text-xs font-semibold rounded bg-[#06032B] text-white px-3 py-1.5 hover:bg-[#1a1756] disabled:opacity-50 transition-colors">
                  {genStatus === 'loading' ? '⏳ Generating…' : '⚙ Generate UEF candidates'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* ── Right: candidate list ── */}
        <div className="space-y-3">

          {!selectedBatchId && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
              Select a batch to review UEF candidates.
            </div>
          )}

          {selectedBatchId && candidatesLoading && (
            <p className="text-xs text-slate-400">Loading candidates…</p>
          )}

          {selectedBatchId && candidatesErr && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">⚠ {candidatesErr}</div>
          )}

          {/* Summary bar */}
          {summary && summary.total > 0 && (
            <div className="flex flex-wrap gap-3 text-[10px]">
              <span className="text-slate-500">Total: <strong>{summary.total}</strong></span>
              <span className="text-green-700">Approved: <strong>{summary.approved}</strong></span>
              <span className="text-red-700">Rejected: <strong>{summary.rejected}</strong></span>
              <span className="text-amber-700">Needs info: <strong>{summary.needsInfo}</strong></span>
              <span className="text-slate-500">Pending: <strong>{summary.pending}</strong></span>
              <span className="text-slate-500">Avg confidence: <strong>{Math.round(summary.avgConfidence * 100)}%</strong></span>
            </div>
          )}

          {/* Candidate cards */}
          {candidates.map(c => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-white px-4 py-4 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{c.rawName}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {c.eventType && <span className="text-[10px] font-mono bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">{c.eventType}</span>}
                    {c.pillar    && <span className="text-[10px] font-semibold bg-[#C76F3D]/10 text-[#C76F3D] rounded px-1.5 py-0.5">{c.pillar}</span>}
                    {c.eligibility && <Badge label={c.eligibility} cls={ELIG_BADGE[c.eligibility] ?? ''} />}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge label={c.reviewStatus.replace('_', ' ')} cls={STATUS_BADGE[c.reviewStatus] ?? STATUS_BADGE['pending_review']} />
                  <span className={`text-xs font-bold tabular-nums ${confColor(c.mappingConfidence)}`}>
                    {Math.round(c.mappingConfidence * 100)}% confidence
                  </span>
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-500">
                {c.budgetAmount      != null && <span>Budget: <strong>€{c.budgetAmount.toLocaleString('it-IT')}</strong></span>}
                {c.participants      != null && <span>Participants: <strong>{c.participants}</strong></span>}
                {c.evidenceLevel     != null && <span>Evidence: <strong>{c.evidenceLevel}</strong></span>}
                {c.actionFamily      != null && <span>Category: <strong>{c.actionFamily}</strong></span>}
                {c.initiativeDomain  != null && <span>Domain: <strong>{c.initiativeDomain}</strong></span>}
                {c.budgetClass       != null && <span>Budget class: <strong>{c.budgetClass}</strong></span>}
                {c.financialConfidence != null && <span>Fin. confidence: <strong>{Math.round(c.financialConfidence * 100)}%</strong></span>}
              </div>

              {/* B11: needs_enrichment pill */}
              {c.needsEnrichment && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded border border-orange-300 bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                    ⚡ Enrichment needed: {c.enrichmentMissingFields.join(', ')}
                  </span>
                  {c.b11Enriched && <span className="text-[9px] text-slate-400">Partially enriched by {c.enrichedBy ?? '—'}</span>}
                  <button
                    onClick={() => enrichOpen === c.id ? setEnrichOpen(null) : openEnrich(c)}
                    className="text-[10px] font-medium text-[#C76F3D] underline hover:no-underline transition-all">
                    {enrichOpen === c.id ? '▲ Chiudi' : '▼ Arricchisci manualmente'}
                  </button>
                </div>
              )}
              {!c.needsEnrichment && c.b11Enriched && (
                <p className="text-[9px] text-green-700">✓ Enriched — all classification fields present</p>
              )}

              {/* B11: enrichment panel */}
              {enrichOpen === c.id && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/30 px-4 py-3 space-y-3">
                  <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wide">Enrichment manuale</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Initiative Domain</span>
                      <select value={enrichForm.initiativeDomain} onChange={e => setEnrichForm(f => ({ ...f, initiativeDomain: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {DOMAIN_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Event Type</span>
                      <select value={enrichForm.eventType} onChange={e => setEnrichForm(f => ({ ...f, eventType: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {EVENT_TYPE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Eligibility</span>
                      <select value={enrichForm.eligibilityClass} onChange={e => setEnrichForm(f => ({ ...f, eligibilityClass: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {ELIG_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Pillar</span>
                      <select value={enrichForm.pillar} onChange={e => setEnrichForm(f => ({ ...f, pillar: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {PILLAR_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Budget Class</span>
                      <select value={enrichForm.budgetClass} onChange={e => setEnrichForm(f => ({ ...f, budgetClass: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {BUDGET_CLS_OPTS.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Evidence Level</span>
                      <select value={enrichForm.evidenceLevel} onChange={e => setEnrichForm(f => ({ ...f, evidenceLevel: e.target.value }))}
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                        <option value="">— non cambiare —</option>
                        {EVID_OPTS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Budget Amount (€)</span>
                      <input type="number" min={0} value={enrichForm.budgetAmount}
                        onChange={e => setEnrichForm(f => ({ ...f, budgetAmount: e.target.value }))}
                        placeholder="es. 12500"
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
                    </label>
                    <label className="space-y-0.5">
                      <span className="text-slate-500 font-medium">Budget Source</span>
                      <input type="text" value={enrichForm.budgetSource}
                        onChange={e => setEnrichForm(f => ({ ...f, budgetSource: e.target.value }))}
                        placeholder="es. export fornitore welfare"
                        className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
                    </label>
                  </div>
                  <label className="block space-y-0.5 text-[10px]">
                    <span className="text-slate-500 font-medium">Note enrichment (max 500 car.)</span>
                    <textarea rows={2} value={enrichForm.notes} maxLength={500}
                      onChange={e => setEnrichForm(f => ({ ...f, notes: e.target.value }))}
                      className="block w-full rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-700 resize-none focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
                  </label>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => handleEnrich(c.id)}
                      disabled={enrichStatus[c.id] === 'loading'}
                      className="rounded border border-[#C76F3D] bg-[#C76F3D] text-white px-4 py-1.5 text-[11px] font-semibold hover:bg-[#4d43d4] disabled:opacity-50 transition-colors">
                      {enrichStatus[c.id] === 'loading' ? '⏳ Saving…' : '✓ Salva enrichment'}
                    </button>
                    <button onClick={() => setEnrichOpen(null)}
                      className="text-[10px] text-slate-400 underline hover:text-slate-600 transition-colors">
                      Annulla
                    </button>
                  </div>
                  {enrichMsg[c.id] && (
                    <p className={`text-[10px] ${enrichStatus[c.id] === 'done' ? 'text-green-700' : 'text-red-600'}`}>
                      {enrichMsg[c.id]}
                    </p>
                  )}
                </div>
              )}

              {/* Reason codes */}
              {c.reasonCodes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.reasonCodes.slice(0, 6).map(rc => (
                    <span key={rc} className="text-[9px] font-mono bg-slate-50 border border-slate-200 text-slate-500 rounded px-1.5 py-0.5">{rc}</span>
                  ))}
                  {c.reasonCodes.length > 6 && <span className="text-[9px] text-slate-400">+{c.reasonCodes.length - 6} more</span>}
                </div>
              )}

              {/* Warnings */}
              {c.warnings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.warnings.map(w => (
                    <span key={w} className="text-[9px] font-mono bg-amber-50 border border-amber-200 text-amber-700 rounded px-1.5 py-0.5">⚠ {w}</span>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {c.reviewStatus === 'pending_review' && (
                <div className="flex gap-2 flex-wrap pt-1 border-t border-slate-100">
                  <button
                    onClick={() => handleAction(c.id, 'approve')}
                    disabled={actionState[c.id] === 'loading'}
                    className="rounded border border-green-300 bg-green-50 px-3 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors">
                    {actionState[c.id] === 'loading' ? '⏳' : '✓'} Approve
                  </button>
                  <button
                    onClick={() => handleAction(c.id, 'reject')}
                    disabled={actionState[c.id] === 'loading'}
                    className="rounded border border-red-300 bg-red-50 px-3 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors">
                    ✕ Reject
                  </button>
                  <button
                    onClick={() => handleAction(c.id, 'needs_info')}
                    disabled={actionState[c.id] === 'loading'}
                    className="rounded border border-amber-300 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                    ? Needs info
                  </button>
                  {actionState[c.id] === 'error' && <span className="text-[10px] text-red-600">⚠ Action failed. Retry.</span>}
                </div>
              )}
              {c.reviewStatus !== 'pending_review' && (
                <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                  {c.reviewStatus === 'approved' ? `✓ Approved by ${c.reviewedAt ? new Date(c.reviewedAt).toLocaleDateString('it-IT') : '—'}` : `Status: ${c.reviewStatus}`}
                  {c.approvedForScoring && ' · Approved for scoring (B6)'}
                </p>
              )}
            </div>
          ))}

        </div>
      </div>

      {/* ── B6: Live Scoring panel ── */}
      {selectedBatchId && summary && summary.approved > 0 && (
        <div className="rounded-lg border border-[#06032B] bg-white px-5 py-4 space-y-3">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs font-bold text-[#06032B] uppercase tracking-wide">Run Live Scoring</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Only approved UEF records enter scoring.</p>
            </div>
            <span className="rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
              {summary.approved} approved
            </span>
          </div>

          <p className="text-[10px] text-amber-700 border border-amber-200 bg-amber-50 rounded px-2 py-1">
            Provide workforcePopulation if no workforce baseline exists for this company/period.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="number" min={10}
              placeholder="workforcePopulation (≥10)"
              value={scoringWfPop}
              onChange={e => setScoringWfPop(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 w-56 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <button
              onClick={() => handleRunScoring(selectedBatchId)}
              disabled={scoringStatus === 'loading'}
              className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-50 transition-colors">
              {scoringStatus === 'loading' ? '⏳ Running scoring…' : '▶ Run scoring from approved UEF'}
            </button>
          </div>

          {/* Success result */}
          {scoringStatus === 'done' && scoringResult?.ok && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 space-y-2">
              <p className="text-xs font-bold text-green-700">✓ Decision Pack generated from approved UEF records.</p>
              <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-[10px]">
                <span className="text-slate-500">KORA Index <strong className="text-slate-900 tabular-nums text-base">{scoringResult.koraIndex ?? '—'}</strong></span>
                <span className="text-slate-500">Confidence <strong className="text-slate-900 tabular-nums">{scoringResult.confidenceScore != null ? `${scoringResult.confidenceScore}%` : '—'}</strong></span>
                <span className="text-slate-500">Safeguard <strong className="text-slate-900">{scoringResult.safeguard ?? '—'}</strong></span>
                <span className="text-slate-500">AR <strong className="tabular-nums text-slate-900">{scoringResult.activationRate != null ? `${Math.round(scoringResult.activationRate * 100)}%` : '—'}</strong></span>
                <span className="text-slate-500">MAR <strong className="tabular-nums text-slate-900">{scoringResult.meaningfulActivationRate != null ? `${Math.round(scoringResult.meaningfulActivationRate * 100)}%` : '—'}</strong></span>
                <span className="text-slate-500">UEF count <strong className="text-slate-900">{scoringResult.approvedUefCount}</strong></span>
              </div>
              {scoringResult.decisionPack && (
                <p className="text-[10px] text-slate-500">
                  Decision Pack: <span className="font-mono text-slate-700">{scoringResult.decisionPack.versionId}</span> · <span className="font-semibold">{scoringResult.decisionPack.status}</span>
                </p>
              )}
              <div className="flex gap-2 flex-wrap pt-1 border-t border-green-100">
                {scoringResult.previewUrl && (
                  <a href={scoringResult.previewUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 border border-[#C76F3D] text-[#C76F3D] rounded px-3 py-1 text-[11px] font-medium hover:bg-[#f5f4ff] transition-colors">
                    ↗ HTML Preview
                  </a>
                )}
                {scoringResult.pdfUrl && (
                  <a href={scoringResult.pdfUrl} download
                    className="inline-flex items-center gap-1 bg-[#06032B] text-white rounded px-3 py-1 text-[11px] font-medium hover:bg-[#1a1756] transition-colors">
                    ↓ Download PDF
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Error / blocked */}
          {scoringStatus === 'error' && scoringResult && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 space-y-1">
              <p className="text-xs font-bold text-red-700">⚠ {scoringResult.error}</p>
              {scoringResult.hint && <p className="text-[10px] text-red-600">{scoringResult.hint}</p>}
            </div>
          )}
        </div>
      )}

      {selectedBatchId && summary && summary.approved === 0 && summary.total > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-400">
          No approved records yet. Approve UEF candidates above to enable scoring.
        </div>
      )}

    </div>
  );
}
