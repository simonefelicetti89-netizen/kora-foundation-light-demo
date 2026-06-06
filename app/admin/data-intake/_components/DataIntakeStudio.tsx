'use client';

// app/admin/data-intake/_components/DataIntakeStudio.tsx
// KORA Data Intake Studio — KORA_ADMIN client component.
//
// Fetches /api/admin/data-intake/preview for batch/PII/Eligibility/UEF preview data.
// Calls /api/admin/operator-flow GET/POST for run actions and result snapshot.
// Links to Decision Pack preview and PDF download.
//
// No file upload. No CSV/XLSX input. No scoring recalculation. No PII exposed.

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { PilotOnboardingChecklist } from '@/components/admin/PilotOnboardingChecklist';
import { MatchReviewPanel, type MatchReviewDecision, type MatchReviewSection } from './MatchReviewPanel';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

// ── API response types ─────────────────────────────────────────────────────

interface BatchRecord {
  recordId: string;
  rowIndex: number;
  nomeInitiativa: string;
  categoria: string;
  tipo: string;
  partecipanti: number | null;
  detectedRecordType: string;
  eligibilityStatus: string;
}

interface PiiGuardStatus {
  checked:       boolean;
  piiFound:      boolean;
  recordCount:   number;
  policy:        string;
  totalFindings: number;
  status:        string;
  summary: { total: number; highSeverityCount: number; byRiskType: Record<string,number>; fieldPaths: string[] };
}

interface EligRecord {
  recordId: string; nomeInitiativa: string; status: string;
  confidence: number; impactTreatment: string; budgetTreatment: string; reason: string;
}

interface UefRecord {
  recordId: string; rawName: string; eligibility: string; actionFamily: string;
  eventNature: string; approvedForScoring: boolean; approvedForBTI: boolean;
  confidence: number; impactTreatment: string;
}

interface ResultSnapshot {
  koraIndex: number; safeguardStatus: string; confidenceScore: number;
  activationRate: number; meaningfulActivationRate: number;
  calibrationStatus: string; methodologyVersionId: string;
  decisionPack: { id: string; versionId: string; status: string };
}

interface PreviewData {
  meta: { tenantCode: string; reportingPeriod: string; generatedAt: string };
  batch: { totalCount: number; batchLabel: string; records: BatchRecord[] };
  piiGuard: PiiGuardStatus;
  eligibility: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number; records: EligRecord[] };
  uefPreview: { total: number; approvedForScoring: number; approvedForBTI: number; categoryDistribution: Record<string,number>; records: UefRecord[] };
  resultSnapshot: ResultSnapshot | null;
}

interface OperatorResult {
  ok: boolean;
  scoring?: { kora_index_value?: number; safeguard_status?: string; confidence_score?: number; activation_rate?: number; meaningful_activation_rate?: number };
  kora_index?: { value?: number; safeguard?: string; confidence?: number; activation_rate?: number; meaningful_activation_rate?: number };
  decision_pack?: { version_id?: string; status?: string };
  error?: string;
}

// B4.2 — Accept batch result type
interface AcceptResult {
  ok: boolean;
  batchId?: string;
  tenantCode?: string;
  reportingPeriod?: string;
  fileType?: 'csv' | 'xlsx';
  selectedSheetName?: string;
  mappingApplied?: boolean;
  manualCompletionApplied?: string[];
  rowCount?: number;
  eligibilitySummary?: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number };
  batchStatus?: string;
  message?: string;
  warnings?: string[];
  skippedPreHeaderRows?: number;
  forbiddenHeaders?: string[];
  findings?: Array<{ rowIndex: number; fieldPath: string; riskType: string; severity: string }>;
  error?: string;
  note?: string;
  // B33: match review summary from accept route
  matchReviewSummary?: {
    override_accepted?: number; override_rejected?: number; override_needs_review?: number;
    default_merged?: number; default_skipped?: number; unmatched?: number; invalid_overrides?: number;
  };
}

// B4.1 — CSV dry-run types
interface DryRunFinding {
  rowIndex: number; fieldPath: string; riskType: string; severity: string;
  // NEVER includes value
}
interface XlsxSheetInfo {
  sheetName: string;
  rowCount: number;
  headers: string[];
  warnings: Array<{ code: string; message: string }>;
  errors: Array<{ code: string; message: string }>;
  sampleRows: Array<Record<string, string>>;
}
interface DryRunResult {
  ok: boolean;
  fileType?: 'csv' | 'xlsx';
  mode?: string;
  dryRunNote?: string;
  rowCount?: number;
  piiStatus?: 'passed' | 'rejected';
  eligibilityPreview?: { eligible: number; limited: number; blocked: number; reviewRequired: number; total: number };
  sampleRows?: Array<Record<string, string | number>>;
  warnings?: string[];
  forbiddenHeaders?: string[];
  findings?: DryRunFinding[];
  error?: string;
  note?: string;
  // B26 XLSX
  requiresSheetSelection?: boolean;
  sheetCount?: number;
  sheets?: XlsxSheetInfo[];
  selectedSheetName?: string;
  affectedSheet?: string;
  skippedPreHeaderRows?: number;
  // B28 multi-file
  fileMode?: 'single' | 'multi';
  fileCount?: number;
  files?: Array<{ fileIndex: number; fileName: string; fileType: string; role: string; rowCount: number; headers: string[]; warnings: string[]; skippedPreHeaderRows?: number }>;
  matchSummary?: { matched: number; possibleMatch: number; unmatched: number; needsReview: number; totalFromPrimary: number; totalFromSecondary: number };
  matches?: Array<{ matchId: string; status: string; confidence: number; initiativeName: string; linkedFileCount: number; conflictCount: number }>;
  mergedPreviewRows?: Array<Record<string, string | number>>;
  pendingSheetSelection?: Array<{ fileIndex: number; fileName: string; sheets: unknown[] }>;
  // B33: match review section
  matchReview?: MatchReviewSection;
  // B27 column mapping
  originalHeaders?: string[];
  mappingSuggestions?: Array<{
    sourceHeader: string;
    normalizedHeader: string;
    suggestedField: string | null;
    confidence: number;
    reason: string;
    alternatives: string[];
    pillarHint?: { pillar: string; eventType: string; confidence: number; requiresReview: boolean };
  }>;
  appliedMapping?: Record<string, string>;
  manualCompletionApplied?: string[];
  missingFieldSummary?: {
    totalRows: number;
    blockingCount: number;
    warningCount: number;
    overallSeverity: 'ok' | 'warning' | 'blocking';
    fillableWithDefaults: string[];
    missingByField: Record<string, number>;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function pct(n: number | null | undefined) { return n != null ? `${Math.round(n * 100)}%` : '—'; }
function fmt(n: number | null | undefined, d = 1) { return n != null ? n.toFixed(d) : '—'; }

const ELIGIBILITY_COLOR: Record<string, string> = {
  eligible:        'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  limited:         'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  blocked:         'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
  review_required: 'bg-purple-100 text-purple-800 border-purple-200',
};
const SAFEGUARD_COLOR: Record<string, string> = {
  CLEAR:   'bg-[rgba(47,125,85,0.10)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  WARNING: 'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  FLAGGED: 'bg-[rgba(158,59,47,0.10)] text-[#9E3B2F] border-[rgba(158,59,47,0.22)]',
};
function badge(val: string, colorMap: Record<string,string>, fallback = 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]') {
  const cls = colorMap[val] ?? fallback;
  return <span className={`inline-block rounded border px-2 py-0.5 text-xs font-semibold ${cls}`}>{val}</span>;
}

// ── Flow timeline phases ────────────────────────────────────────────────────

const FLOW_PHASES = [
  { id: 'batch',       label: 'Synthetic Batch',   icon: '📦' },
  { id: 'pii',         label: 'PII Guard',          icon: '🛡️' },
  { id: 'eligibility', label: 'Eligibility Gate',   icon: '⚙️' },
  { id: 'uef',         label: 'UEF Preview',        icon: '📋' },
  { id: 'scoring',     label: 'Scoring Run',        icon: '📊' },
  { id: 'decpack',     label: 'Decision Pack',      icon: '🗂️' },
];

// ── Props ──────────────────────────────────────────────────────────────────

interface Props { userEmail: string; userRole: string; }

// ── Main component ─────────────────────────────────────────────────────────

// B9: tenant option shape for selector
interface TenantOption { id: string; tenantCode: string; companyName: string; }

export function DataIntakeStudio({ userEmail, userRole }: Props) {
  // B9.2: read query params for pre-selection (e.g. from /admin/tenants CTA)
  const searchParams = useSearchParams();

  // B9: tenant selector — no default; operator must select explicitly (B13 footgun fix)
  const [tenantList, setTenantList]       = useState<TenantOption[]>([]);
  const [TENANT, setTENANT]               = useState(() => searchParams?.get('tenantCode') ?? '');
  const [PERIOD, setPERIOD]               = useState(() => searchParams?.get('reportingPeriod') ?? '2026-Q1');

  // Load available tenants on mount
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok && d.tenants) setTenantList(d.tenants);
      })
      .catch(() => {});
  }, []);

  const [preview, setPreview]     = useState<PreviewData | null>(null);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [opStatus, setOpStatus]   = useState<'idle'|'running'|'reading'|'done'|'error'>('idle');
  const [opResult, setOpResult]   = useState<OperatorResult | null>(null);
  const [opErr, setOpErr]         = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

      // B28: multi-file state
  const [additionalFiles, setAdditionalFiles] = useState<File[]>([]);
  const [additionalFileRoles, setAdditionalFileRoles] = useState<Record<number, string>>({});
  const [multiFileResult, setMultiFileResult] = useState<DryRunResult | null>(null);
  const [multiFileStatus, setMultiFileStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');

  // B33: match review decisions (matchId → decision)
  const [matchDecisions, setMatchDecisions] = useState<Record<string, MatchReviewDecision>>({});
  const handleMatchDecisionsChange = useCallback((d: Record<string, MatchReviewDecision>) => {
    setMatchDecisions(d);
  }, []);

  // B27: column mapping state
  const [userMapping, setUserMapping]   = useState<Record<string, string>>({});
  const [manualSource, setManualSource]      = useState('');
  const [manualEvidLevel, setManualEvidLevel] = useState('');
  const [manualBudgetClass, setManualBudgetClass] = useState('');
  const [manualProvider, setManualProvider] = useState('');
  const [manualPeriod, setManualPeriod]     = useState('');

  // B4.1 — CSV / XLSX dry-run state
  const [csvFile, setCsvFile]           = useState<File | null>(null);
  const [csvStatus, setCsvStatus]       = useState<'idle'|'loading'|'passed'|'rejected'|'error'>('idle');
  const [csvResult, setCsvResult]       = useState<DryRunResult | null>(null);

  // B26 — XLSX multi-sheet state
  const [fileType, setFileType]               = useState<'csv'|'xlsx'>('csv');
  const [xlsxSheetList, setXlsxSheetList]     = useState<DryRunResult | null>(null);
  const [xlsxSheetStatus, setXlsxSheetStatus] = useState<'idle'|'loading'|'loaded'|'error'>('idle');
  const [selectedSheet, setSelectedSheet]     = useState<string>('');

  // B4.2 — Accept batch state
  const [acceptStatus, setAcceptStatus] = useState<'idle'|'loading'|'created'|'rejected'|'error'>('idle');
  const [acceptResult, setAcceptResult] = useState<AcceptResult | null>(null);

  // B13 FASE 1: derived tenant guards
  const isTenantSelected = TENANT.trim() !== '';
  const isOp001          = TENANT === 'OP-001';

  // B13 FASE 3: pseudonymization confirmation gate — all 4 required before accept
  const [pCheck1, setPCheck1] = useState(false); // no names/emails/CF/phones/addresses
  const [pCheck2, setPCheck2] = useState(false); // identifiers are non-reversible pseudonyms
  const [pCheck3, setPCheck3] = useState(false); // aggregate org analysis only, not individual
  const [pCheck4, setPCheck4] = useState(false); // aware of PII strict-reject and no individual reports
  const allPseudonymChecked   = pCheck1 && pCheck2 && pCheck3 && pCheck4;

  // B11.3: batch-level financial metadata — collected here, sent with accept
  // financialNotes is local only — intentionally NOT sent to server (privacy boundary)
  const [finSourceType,    setFinSourceType]    = useState<string>('unknown');
  const [finEvidLevel,     setFinEvidLevel]     = useState<string>('L0');
  const [finBudgetScope,   setFinBudgetScope]   = useState<string>('unknown');
  const [finContainsAmt,   setFinContainsAmt]   = useState<string>('unknown');
  const [finEconRelief,    setFinEconRelief]     = useState<string>('unknown');
  const [finComplianceSpd, setFinComplianceSpd] = useState<string>('unknown');
  const [finNotes,         setFinNotes]          = useState<string>(''); // never sent to server

  // loading is derived — true only while we have neither data nor an error
  const loading = !preview && !loadErr;

  // All setState calls inside .then()/.catch() — no synchronous setState in effect.
  useEffect(() => {
    let active = true;
    fetch(
      `/api/admin/data-intake/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`,
      { credentials: 'include' },
    )
      .then(res => {
        if (!res.ok) return Promise.reject(new Error(`HTTP ${res.status}`));
        return res.json() as Promise<PreviewData>;
      })
      .then(data => { if (active) { setPreview(data); setLoadErr(null); } })
      .catch((e: Error) => { if (active) setLoadErr(e.message); });
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  function refreshPreview() {
    setPreview(null);   // clear data so loading indicator shows during refresh
    setLoadErr(null);
    setRefreshKey(k => k + 1);
  }

  async function handleRun() {
    setOpStatus('running'); setOpErr(null); setOpResult(null);
    try {
      const res  = await fetch('/api/admin/operator-flow', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantCode: TENANT, reportingPeriod: PERIOD }),
      });
      const data = await res.json() as OperatorResult;
      if (!res.ok || !data.ok) { setOpErr(data.error ?? `HTTP ${res.status}`); setOpStatus('error'); return; }
      setOpResult(data); setOpStatus('done');
      refreshPreview();
    } catch (e) { setOpErr(e instanceof Error ? e.message : String(e)); setOpStatus('error'); }
  }

  async function handleRead() {
    setOpStatus('reading'); setOpErr(null);
    try {
      const res  = await fetch(`/api/admin/operator-flow?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`, { credentials: 'include' });
      const data = await res.json() as OperatorResult;
      if (!res.ok) { setOpErr(`HTTP ${res.status}`); setOpStatus('error'); return; }
      setOpResult(data); setOpStatus('done');
      refreshPreview();
    } catch (e) { setOpErr(e instanceof Error ? e.message : String(e)); setOpStatus('error'); }
  }

  // B4.2 — Accept batch: sends file again (server reruns all checks — never trusts dry-run)
  async function handleAcceptBatch() {
    if (!csvFile) return;
    if (fileType === 'xlsx' && !selectedSheet) return;
    setAcceptStatus('loading'); setAcceptResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      // B28: send additional files for multi-file batch
      for (const f of additionalFiles) fd.append('file', f);
      if (additionalFiles.length > 0) {
        const roles = ['unknown', ...additionalFiles.map((_, i) => additionalFileRoles[i] ?? 'unknown')];
        fd.append('fileRoles', JSON.stringify(roles));
        const sheets = [fileType === 'xlsx' ? selectedSheet || null : null,
          ...additionalFiles.map(() => null)];
        fd.append('selectedSheetNames', JSON.stringify(sheets));
      }
      // B26: pass selectedSheetName for XLSX (single-file path)
      if (additionalFiles.length === 0 && fileType === 'xlsx' && selectedSheet) {
        fd.append('selectedSheetName', selectedSheet);
      }
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      // B11.3: append financial metadata — financialNotes intentionally excluded
      const hasAnyMeta = finSourceType !== 'unknown' || finEvidLevel !== 'L0'
        || finBudgetScope !== 'unknown' || finContainsAmt !== 'unknown'
        || finEconRelief !== 'unknown' || finComplianceSpd !== 'unknown';
      if (hasAnyMeta) {
        fd.append('financialMetadata', JSON.stringify({
          currency:                'EUR',
          financialSourceType:     finSourceType,
          defaultEvidenceLevel:    finEvidLevel,
          budgetScope:             finBudgetScope,
          containsAmounts:         finContainsAmt,
          containsEconomicRelief:  finEconRelief,
          containsComplianceSpend: finComplianceSpd,
        }));
      }
      // B13 FASE 3: pseudonymization confirmation gate
      fd.append('pseudonymizationConfirmation', 'true');
      // B27: send column mapping + manual defaults to accept (server re-applies)
      appendB27Fields(fd);
      // B33: send match review decisions for multi-file batches
      if (additionalFiles.length > 0 && Object.keys(matchDecisions).length > 0) {
        const overrides = Object.entries(matchDecisions).map(([matchId, decision]) => ({ matchId, decision }));
        fd.append('matchReviewOverrides', JSON.stringify(overrides));
      }
      const res  = await fetch('/api/admin/data-intake/accept', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as AcceptResult;
      setAcceptResult(data);
      setAcceptStatus(data.ok ? 'created' : 'rejected');
    } catch (e) {
      setAcceptResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setAcceptStatus('error');
    }
  }

  // B26 — XLSX: load sheet list (no selectedSheetName → returns sheet list)
  async function handleLoadXlsxSheets() {
    if (!csvFile) return;
    setXlsxSheetStatus('loading'); setXlsxSheetList(null);
    setSelectedSheet(''); setCsvResult(null); setCsvStatus('idle');
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      const res  = await fetch('/api/admin/data-intake/upload-preview', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as DryRunResult;
      setXlsxSheetList(data);
      setXlsxSheetStatus(data.ok ? 'loaded' : 'error');
      if (!data.ok) setCsvResult(data); // show error in main result area
    } catch (e) {
      setXlsxSheetList({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setXlsxSheetStatus('error');
    }
  }

  // B28: multi-file preview handler
  async function handleMultiFilePreview() {
    if (!csvFile) return;
    setMultiFileStatus('loading'); setMultiFileResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      for (const f of additionalFiles) fd.append('file', f);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      const roles: string[] = [fileType === 'xlsx' ? 'unknown' : 'unknown'];
      for (let i = 0; i < additionalFiles.length; i++) {
        roles.push(additionalFileRoles[i] ?? 'unknown');
      }
      fd.append('fileRoles', JSON.stringify(roles));
      // sheet names: first file
      const sheets: (string | null)[] = [fileType === 'xlsx' ? selectedSheet || null : null];
      for (let i = 0; i < additionalFiles.length; i++) sheets.push(null);
      fd.append('selectedSheetNames', JSON.stringify(sheets));
      appendB27Fields(fd);
      const res = await fetch('/api/admin/data-intake/upload-preview', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as DryRunResult;
      setMultiFileResult(data);
      setMultiFileStatus(data.ok ? 'done' : 'error');
    } catch (e) {
      setMultiFileResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setMultiFileStatus('error');
    }
  }

  // B27: build mapping + manual completion form data fields
  function appendB27Fields(fd: FormData) {
    const effectiveMapping = { ...userMapping };
    if (Object.keys(effectiveMapping).length > 0) {
      fd.append('columnMapping', JSON.stringify(effectiveMapping));
    }
    const manualDefaults: Record<string, string> = {};
    if (manualSource.trim())     manualDefaults['source']           = manualSource.trim();
    if (manualEvidLevel.trim())  manualDefaults['evidence_level']   = manualEvidLevel.trim();
    if (manualBudgetClass.trim()) manualDefaults['budget_class']    = manualBudgetClass.trim();
    if (manualProvider.trim())   manualDefaults['provider']         = manualProvider.trim();
    if (manualPeriod.trim())     manualDefaults['reporting_period'] = manualPeriod.trim();
    if (Object.keys(manualDefaults).length > 0) {
      fd.append('manualCompletion', JSON.stringify(manualDefaults));
    }
  }

  // B26 — XLSX: preview selected sheet
  async function handlePreviewXlsxSheet() {
    if (!csvFile || !selectedSheet) return;
    setCsvStatus('loading'); setCsvResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      fd.append('selectedSheetName', selectedSheet);
      appendB27Fields(fd);
      const res  = await fetch('/api/admin/data-intake/upload-preview', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as DryRunResult;
      setCsvResult(data);
      setCsvStatus(data.ok ? 'passed' : 'rejected');
      // Initialise userMapping from suggestions if not already set
      if (data.ok && data.mappingSuggestions && Object.keys(userMapping).length === 0) {
        const initial: Record<string, string> = {};
        for (const s of data.mappingSuggestions) {
          if (s.suggestedField) initial[s.sourceHeader] = s.suggestedField;
        }
        setUserMapping(initial);
      }
    } catch (e) {
      setCsvResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setCsvStatus('error');
    }
  }

  // B4.1 — CSV dry-run handler (CSV only — XLSX uses handlePreviewXlsxSheet)
  async function handleValidateCsv() {
    if (!csvFile) return;
    setCsvStatus('loading'); setCsvResult(null);
    try {
      const fd = new FormData();
      fd.append('file', csvFile);
      fd.append('tenantCode', TENANT);
      fd.append('reportingPeriod', PERIOD);
      appendB27Fields(fd);
      const res  = await fetch('/api/admin/data-intake/upload-preview', {
        method: 'POST', credentials: 'include', body: fd,
      });
      const data = await res.json() as DryRunResult;
      setCsvResult(data);
      setCsvStatus(data.ok ? 'passed' : 'rejected');
      if (data.ok && data.mappingSuggestions && Object.keys(userMapping).length === 0) {
        const initial: Record<string, string> = {};
        for (const s of data.mappingSuggestions) {
          if (s.suggestedField) initial[s.sourceHeader] = s.suggestedField;
        }
        setUserMapping(initial);
      }
    } catch (e) {
      setCsvResult({ ok: false, error: e instanceof Error ? e.message : String(e) });
      setCsvStatus('error');
    }
  }

  const snapshot = opResult?.scoring
    ? { ki: opResult.scoring.kora_index_value, sf: opResult.scoring.safeguard_status, cs: (opResult.scoring.confidence_score ?? 0) / 100, ar: opResult.scoring.activation_rate, mar: opResult.scoring.meaningful_activation_rate }
    : opResult?.kora_index
    ? { ki: opResult.kora_index.value, sf: opResult.kora_index.safeguard, cs: opResult.kora_index.confidence, ar: opResult.kora_index.activation_rate, mar: opResult.kora_index.meaningful_activation_rate }
    : preview?.resultSnapshot
    ? { ki: preview.resultSnapshot.koraIndex, sf: preview.resultSnapshot.safeguardStatus, cs: preview.resultSnapshot.confidenceScore, ar: preview.resultSnapshot.activationRate, mar: preview.resultSnapshot.meaningfulActivationRate }
    : null;

  const phaseStatus = (id: string): string => {
    if (!preview) return 'not-run';
    if (id === 'batch')       return 'ready';
    if (id === 'pii')         return preview.piiGuard.status === 'passed' ? 'passed' : 'review';
    if (id === 'eligibility') return 'passed';
    if (id === 'uef')         return 'passed';
    if (id === 'scoring')     return snapshot ? 'completed' : 'not-run';
    if (id === 'decpack')     return snapshot ? 'completed' : 'not-run';
    return 'not-run';
  };
  const PHASE_BADGE: Record<string, string> = {
    ready:     'bg-blue-100 text-blue-700 border-blue-200',
    passed:    'bg-[rgba(47,125,85,0.10)] text-green-700 border-[rgba(47,125,85,0.22)]',
    completed: 'bg-[#06032B] text-white border-[#06032B]',
    review:    'bg-[rgba(217,154,43,0.12)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
    'not-run': 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.08)]',
  };
  const PHASE_LABEL: Record<string, string> = {
    ready: 'Ready', passed: 'Passed', completed: 'Completed', review: 'Review required', 'not-run': 'Not run yet',
  };

  const isOp = opStatus === 'running' || opStatus === 'reading';

  return (
    <div className="max-w-4xl mx-auto py-6 px-3 space-y-5">

      {/* ── A. HEADER ── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D]">KORA</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Data Intake Studio</h1>
          <BoundaryBadge mode="LIVE" variant="dark" style={{ marginTop: 6 }} />
          <p className="text-sm text-white/45 mt-0.5">Synthetic Live v1 · {TENANT} · {PERIOD}</p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          <span className="rounded border border-[#C8FF47]/40 bg-[#C8FF47]/10 px-2 py-0.5 text-xs font-semibold text-[#d4ff6b]">Synthetic data only</span>
        </div>
      </div>

      {/* B61-B: Pilot checklist — step 3 highlighted */}
      <PilotOnboardingChecklist currentStep={3} compact />

      {/* ── B4.1 / B26. CSV + XLSX DRY-RUN PREVIEW ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide">Live Intake Preview — dry run</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">Validate a CSV or Excel (.xlsx) file against KORA intake rules. No data is stored.</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">Dry-run only: no data is stored.</span>
            <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-2 py-0.5 text-[10px] font-semibold text-[#9E3B2F]">PII direct identifiers are strictly rejected.</span>
          </div>
        </div>

        {/* File input + action — B26: accepts .csv and .xlsx */}
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={e => {
              const f = e.target.files?.[0] ?? null;
              setCsvFile(f);
              setCsvStatus('idle'); setCsvResult(null);
              setAcceptStatus('idle'); setAcceptResult(null);
              setXlsxSheetList(null); setXlsxSheetStatus('idle'); setSelectedSheet('');
              // B27: reset mapping state on file change
              setUserMapping({});
              setManualSource(''); setManualEvidLevel(''); setManualBudgetClass('');
              setManualProvider(''); setManualPeriod('');
              // B28: reset multi-file state
              setAdditionalFiles([]); setAdditionalFileRoles({});
              setMultiFileResult(null); setMultiFileStatus('idle');
              // B33: reset match review decisions on file change
              setMatchDecisions({});
              const isXlsx = f?.name.toLowerCase().endsWith('.xlsx') ?? false;
              setFileType(isXlsx ? 'xlsx' : 'csv');
            }}
            className="text-xs text-[rgba(6,3,43,0.62)] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[rgba(6,3,43,0.14)] file:bg-[rgba(6,3,43,0.03)] file:text-xs file:font-medium file:text-[rgba(6,3,43,0.78)] file:cursor-pointer hover:file:bg-[rgba(6,3,43,0.05)]"
          />
          {/* CSV: validate directly */}
          {fileType === 'csv' && (
            <button
              onClick={handleValidateCsv}
              disabled={!csvFile || csvStatus === 'loading' || !isTenantSelected}
              className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[rgba(6,3,43,0.88)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {csvStatus === 'loading' ? '⏳ Validating…' : '✓ Validate CSV'}
            </button>
          )}
          {/* XLSX: first load sheets */}
          {fileType === 'xlsx' && xlsxSheetStatus !== 'loaded' && (
            <button
              onClick={handleLoadXlsxSheets}
              disabled={!csvFile || xlsxSheetStatus === 'loading' || !isTenantSelected}
              className="rounded-lg bg-[#C76F3D] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#4d48d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {xlsxSheetStatus === 'loading' ? '⏳ Reading workbook…' : '📋 Load sheet list'}
            </button>
          )}
          {csvFile && <span className="text-[10px] text-[rgba(6,3,43,0.40)] font-mono">{csvFile.name} · {(csvFile.size / 1024).toFixed(0)} KB · {fileType.toUpperCase()}</span>}
        </div>

        {/* B28: Additional files (multi-file batch) */}
        {csvFile && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-3">
            <p className="text-[10px] font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">
              File aggiuntivi — Multi-File Batch (opzionale)
            </p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
              Aggiungi file budget, LMS, provider o policy per arricchire il batch.
              Ogni file viene scansionato per PII separatamente prima del merge.
            </p>
            <input
              type="file"
              accept=".csv,.xlsx"
              multiple
              onChange={e => {
                const files = Array.from(e.target.files ?? []);
                setAdditionalFiles(files);
                setAdditionalFileRoles({});
                setMultiFileResult(null); setMultiFileStatus('idle');
                setMatchDecisions({});
              }}
              className="text-xs text-[rgba(6,3,43,0.62)] file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-[rgba(6,3,43,0.08)] file:bg-[#F8F6F1] file:text-xs file:font-medium file:text-[rgba(6,3,43,0.62)] file:cursor-pointer"
            />
            {additionalFiles.length > 0 && (
              <div className="space-y-2">
                {additionalFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] font-mono text-[rgba(6,3,43,0.52)]">{f.name}</span>
                    <select
                      value={additionalFileRoles[i] ?? 'unknown'}
                      onChange={e => setAdditionalFileRoles(r => ({ ...r, [i]: e.target.value }))}
                      className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]"
                    >
                      <option value="unknown">— Tipo file —</option>
                      <option value="initiatives">Iniziative / Programmi</option>
                      <option value="budget">Budget / Finanziario</option>
                      <option value="participation">Partecipazione / Usage</option>
                      <option value="lms">LMS / Formazione</option>
                      <option value="provider">Provider / Fornitore</option>
                      <option value="policy">Policy / Regolamenti</option>
                      <option value="evidence">Evidenze / Documenti</option>
                    </select>
                  </div>
                ))}
                <button
                  onClick={handleMultiFilePreview}
                  disabled={multiFileStatus === 'loading' || !isTenantSelected}
                  className="rounded-lg bg-[#C76F3D] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#4d48d0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {multiFileStatus === 'loading' ? '⏳ Analisi multi-file…' : '⚡ Preview multi-file batch'}
                </button>
              </div>
            )}

            {/* Multi-file match result + B33 Match Review Panel */}
            {multiFileStatus === 'done' && multiFileResult?.ok && multiFileResult.matchSummary && (
              <div className="space-y-3">
                {/* Quick summary header */}
                <div className="rounded-lg border border-[#C76F3D]/20 bg-[#F8F6F1] px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className="text-[10px] font-bold text-[#C76F3D] uppercase tracking-wide">Initiative Matching — Risultati</p>
                    <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
                      {multiFileResult.fileCount} file · {multiFileResult.rowCount} righe totali
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-green-700 font-medium">
                      ✓ Matched: {multiFileResult.matchSummary.matched}
                    </span>
                    <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[#8A5A00] font-medium">
                      ≈ Possible: {multiFileResult.matchSummary.possibleMatch}
                    </span>
                    <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-purple-700 font-medium">
                      ? Review: {multiFileResult.matchSummary.needsReview}
                    </span>
                    <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[rgba(6,3,43,0.62)] font-medium">
                      ✗ Unmatched: {multiFileResult.matchSummary.unmatched}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#C76F3D] font-medium">
                    ↓ Rivedi i match qui sotto prima di creare il batch.
                    I <strong>possible match</strong> e i match <strong>needs_review</strong> richiedono conferma esplicita — non vengono mergiati automaticamente.
                  </p>
                </div>

                {/* B33: Match Review Panel */}
                {multiFileResult.matchReview && (
                  <MatchReviewPanel
                    matchReview={multiFileResult.matchReview}
                    decisions={matchDecisions}
                    onDecisionsChange={handleMatchDecisionsChange}
                  />
                )}
              </div>
            )}
            {multiFileStatus === 'error' && multiFileResult && !multiFileResult.ok && (
              <div className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-3 py-2 text-[10px] text-[#9E3B2F]">
                ⚠ {multiFileResult.error ?? 'Errore nel multi-file preview.'}
              </div>
            )}
          </div>
        )}

        {/* B26: XLSX sheet selector — shown after workbook is read */}
        {fileType === 'xlsx' && xlsxSheetStatus === 'loaded' && xlsxSheetList?.ok && xlsxSheetList.sheets && (
          <div className="rounded-lg border border-[#C76F3D]/25 bg-[#f5f4ff] px-4 py-3 space-y-3">
            <p className="text-[10px] font-bold text-[#C76F3D] uppercase tracking-wide">
              Seleziona foglio — {xlsxSheetList.sheetCount} sheet trovati
            </p>
            <div className="space-y-2">
              {xlsxSheetList.sheets.map(s => (
                <label key={s.sheetName} className={`flex items-start gap-3 p-2.5 rounded border cursor-pointer transition-colors ${selectedSheet === s.sheetName ? 'border-[#C76F3D] bg-[#F8F6F1]' : 'border-[rgba(6,3,43,0.08)] bg-[#F8F6F1]/60 hover:bg-[#F8F6F1]'}`}>
                  <input
                    type="radio"
                    name="sheetSelector"
                    value={s.sheetName}
                    checked={selectedSheet === s.sheetName}
                    onChange={() => { setSelectedSheet(s.sheetName); setCsvResult(null); setCsvStatus('idle'); setAcceptStatus('idle'); setAcceptResult(null); }}
                    className="mt-0.5 h-3.5 w-3.5 text-[#C76F3D] focus:ring-[#C76F3D]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-[rgba(6,3,43,0.78)]">{s.sheetName}</span>
                      <span className="text-[10px] text-[rgba(6,3,43,0.40)]">{s.rowCount} righe · {s.headers.length} colonne</span>
                      {s.errors.length > 0 && <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-1.5 py-0.5 text-[9px] font-bold text-[#9E3B2F]">Errore</span>}
                    </div>
                    {s.headers.length > 0 && (
                      <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5 font-mono truncate">{s.headers.slice(0, 6).join(' · ')}{s.headers.length > 6 ? ` +${s.headers.length - 6}` : ''}</p>
                    )}
                    {s.errors.length > 0 && (
                      <p className="text-[10px] text-[#9E3B2F] mt-0.5">{s.errors[0].message}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
            {selectedSheet && (
              <button
                onClick={handlePreviewXlsxSheet}
                disabled={csvStatus === 'loading' || !isTenantSelected}
                className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[rgba(6,3,43,0.88)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {csvStatus === 'loading' ? '⏳ Previewing…' : `✓ Preview sheet "${selectedSheet}"`}
              </button>
            )}
            {!selectedSheet && (
              <p className="text-[10px] text-[#8A5A00] font-medium">⚠ Seleziona un foglio per procedere.</p>
            )}
          </div>
        )}

        {/* B26: XLSX workbook load error */}
        {fileType === 'xlsx' && xlsxSheetStatus === 'error' && xlsxSheetList && !xlsxSheetList.ok && (
          <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-2 text-xs text-[#9E3B2F]">
            ⚠ {xlsxSheetList.error ?? 'Errore nel leggere il workbook Excel.'}
          </div>
        )}

        {/* Result: passed */}
        {csvStatus === 'passed' && csvResult?.ok && (
          <div className="rounded-lg border border-[rgba(47,125,85,0.22)] bg-green-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-green-700">✓ File validation passed</span>
              <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.10)] px-2 py-0.5 text-[10px] font-semibold text-green-700">PII: passed</span>
              <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[10px] font-mono text-[rgba(6,3,43,0.62)]">{csvResult.rowCount} rows</span>
            </div>
            {csvResult.eligibilityPreview && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-green-700 font-medium">Eligible: {csvResult.eligibilityPreview.eligible}</span>
                <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[#F8F6F1] px-2 py-0.5 text-[#8A5A00] font-medium">Limited: {csvResult.eligibilityPreview.limited}</span>
                <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-[#9E3B2F] font-medium">Blocked: {csvResult.eligibilityPreview.blocked}</span>
                {csvResult.eligibilityPreview.reviewRequired > 0 && (
                  <span className="rounded border border-purple-200 bg-[#F8F6F1] px-2 py-0.5 text-purple-700 font-medium">Review required: {csvResult.eligibilityPreview.reviewRequired}</span>
                )}
              </div>
            )}
            {csvResult.sampleRows && csvResult.sampleRows.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Sample rows (max 5)</p>
                <div className="space-y-0.5">
                  {csvResult.sampleRows.map((row, i) => (
                    <div key={i} className="text-[10px] font-mono text-[rgba(6,3,43,0.52)] bg-[#F8F6F1] border border-[rgba(6,3,43,0.05)] rounded px-2 py-1 truncate">
                      {Object.entries(row).slice(0, 6).map(([k, v]) => `${k}=${v}`).join(' · ')}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {csvResult.skippedPreHeaderRows != null && csvResult.skippedPreHeaderRows > 0 && (
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] text-blue-700">
                ℹ {csvResult.skippedPreHeaderRows} riga{csvResult.skippedPreHeaderRows > 1 ? 'he' : ''} di intestazione pre-header saltata{csvResult.skippedPreHeaderRows > 1 ? '' : ''} automaticamente. Prima riga valida usata come header.
              </div>
            )}
            {csvResult.warnings && csvResult.warnings.length > 0 && (
              <div className="space-y-0.5">
                {csvResult.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-[#8A5A00]">⚠ {w}</p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[rgba(6,3,43,0.40)] border-t border-green-100 pt-2">
              {csvResult.dryRunNote} · Live scoring remains locked until B4.2/B5.
            </p>
          </div>
        )}

        {/* B27 — Column Mapping Assistant */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' &&
          csvResult.mappingSuggestions && csvResult.mappingSuggestions.length > 0 && (
          <div className="rounded-lg border border-[#C76F3D]/20 bg-[#F8F6F1] px-4 py-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-[#C76F3D] uppercase tracking-wide">Column Mapping Assistant</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
                KORA ha suggerito un mapping per le colonne del file. Verifica e modifica se necessario.
                Colonne non mappate vengono mantenute con il nome originale.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[rgba(6,3,43,0.08)]">
                    {['Colonna file', 'Campo canonico KORA', 'Conf.', 'Pillar hint'].map(h => (
                      <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvResult.mappingSuggestions.map((s, i) => {
                    const currentVal = userMapping[s.sourceHeader] ?? s.suggestedField ?? 'keep_original';
                    const confColor = s.confidence >= 0.9 ? 'text-green-700' : s.confidence >= 0.7 ? 'text-[#8A5A00]' : 'text-[rgba(6,3,43,0.40)]';
                    const PILLAR_COLORS: Record<string, string> = {
                      LIFE: 'bg-blue-50 text-blue-700 border-blue-200',
                      GROWTH: 'bg-green-50 text-green-700 border-green-200',
                      CONNECTION: 'bg-purple-50 text-purple-700 border-purple-200',
                      IMPACT: 'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.28)]',
                      LEGACY: 'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.28)]',
                    };
                    return (
                      <tr key={i} className="border-b border-[rgba(6,3,43,0.05)] hover:bg-[rgba(6,3,43,0.03)]">
                        <td className="py-1.5 px-2 font-mono text-[rgba(6,3,43,0.78)]">{s.sourceHeader}</td>
                        <td className="py-1.5 px-2">
                          <select
                            value={currentVal}
                            onChange={e => setUserMapping(m => ({ ...m, [s.sourceHeader]: e.target.value }))}
                            className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[10px] text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D] min-w-[160px]"
                          >
                            <option value="keep_original">— Mantieni originale —</option>
                            <option value="ignore">✕ Ignora colonna</option>
                            {['initiative_name','description','category','type','amount','participants',
                              'source','evidence_level','pillar','reporting_period','provider',
                              'budget_class','cost_center','hours','coverage','uptake','policy_evidence'
                            ].map(f => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </td>
                        <td className={`py-1.5 px-2 text-[10px] font-mono ${confColor}`}>
                          {s.confidence > 0 ? `${Math.round(s.confidence * 100)}%` : '—'}
                        </td>
                        <td className="py-1.5 px-2">
                          {s.pillarHint
                            ? <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${PILLAR_COLORS[s.pillarHint.pillar] ?? ''}`}>
                                {s.pillarHint.pillar}{s.pillarHint.requiresReview ? ' ?' : ''}
                              </span>
                            : <span className="text-[9px] text-[rgba(6,3,43,0.28)]">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button
              onClick={fileType === 'xlsx' ? handlePreviewXlsxSheet : handleValidateCsv}
              className="rounded-lg bg-[#C76F3D] text-white px-3 py-1.5 text-[10px] font-semibold hover:bg-[#4d48d0] transition-colors"
            >
              ↻ Applica mapping e ri-preview
            </button>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">
              La colonna selezionata come &quot;Ignora&quot; viene comunque scansionata per PII prima di essere scartata.
            </p>
          </div>
        )}

        {/* B27 — Missing Fields Summary */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' &&
          csvResult.missingFieldSummary && csvResult.missingFieldSummary.totalRows > 0 && (
          <div className={`rounded-lg border px-4 py-3 space-y-2 ${
            csvResult.missingFieldSummary.overallSeverity === 'blocking' ? 'border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)]' :
            csvResult.missingFieldSummary.overallSeverity === 'warning'  ? 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)]' :
            'border-[rgba(47,125,85,0.22)] bg-green-50'
          }`}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.62)]">Missing Fields</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              {csvResult.missingFieldSummary.blockingCount > 0 && (
                <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-[#9E3B2F] font-medium">
                  ⊗ Blocking: {csvResult.missingFieldSummary.blockingCount} righe
                </span>
              )}
              {csvResult.missingFieldSummary.warningCount > 0 && (
                <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[#F8F6F1] px-2 py-0.5 text-[#8A5A00] font-medium">
                  ⚠ Warning: {csvResult.missingFieldSummary.warningCount} righe
                </span>
              )}
              {csvResult.missingFieldSummary.overallSeverity === 'ok' && (
                <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-green-700 font-medium">✓ Campi chiave presenti</span>
              )}
            </div>
            {Object.keys(csvResult.missingFieldSummary.missingByField).length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {Object.entries(csvResult.missingFieldSummary.missingByField).slice(0, 8).map(([f, n]) => (
                  <span key={f} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-1.5 py-0.5 text-[9px] font-mono text-[rgba(6,3,43,0.52)]">
                    {f}: {n}/{csvResult.missingFieldSummary!.totalRows}
                  </span>
                ))}
              </div>
            )}
            {csvResult.missingFieldSummary.fillableWithDefaults.length > 0 && (
              <p className="text-[10px] text-[rgba(6,3,43,0.52)]">
                💡 Campi completabili con default batch: {csvResult.missingFieldSummary.fillableWithDefaults.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* B27 — Manual Completion Light (batch-level defaults) */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-[rgba(6,3,43,0.62)] uppercase tracking-wide">Manual Completion — Default Batch</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">
                Valori di default applicati solo alle righe con campo vuoto. Non sovrascrivono dati presenti.
                Tracciati come <code className="bg-[rgba(6,3,43,0.05)] px-1 rounded text-[9px]">_manual_completion</code> nel payload — non bypassano UEF Review.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Fonte default</label>
                <input value={manualSource} onChange={e => setManualSource(e.target.value)}
                  placeholder="es. provider_export, hr_declaration"
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Evidence level default</label>
                <select value={manualEvidLevel} onChange={e => setManualEvidLevel(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="">— Non specificato —</option>
                  <option value="L0">L0 — Nessuna evidenza</option>
                  <option value="L1">L1 — Auto-dichiarato</option>
                  <option value="L2">L2 — Documento interno</option>
                  <option value="L3">L3 — Terze parti / Verificato</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Budget class default</label>
                <select value={manualBudgetClass} onChange={e => setManualBudgetClass(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="">— Non specificato —</option>
                  <option value="deep_activation">Deep Activation</option>
                  <option value="economic_relief">Economic Relief</option>
                  <option value="compliance_blocked">Compliance Blocked</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Provider default</label>
                <input value={manualProvider} onChange={e => setManualProvider(e.target.value)}
                  placeholder="es. Welfare Provider S.p.A."
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Periodo di default</label>
                <input value={manualPeriod} onChange={e => setManualPeriod(e.target.value)}
                  placeholder="es. 2026-Q1"
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]" />
              </div>
            </div>
          </div>
        )}

        {/* B11.3 — Financial metadata panel (shown after dry-run passed, before accept) */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' && (
          <div className="rounded-lg border border-[#C76F3D]/25 bg-[#f5f4ff] px-4 py-4 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-[#C76F3D] uppercase tracking-wide">Metadati finanziari del batch</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5">
                Questi metadati aiutano KORA a interpretare la qualità finanziaria del batch. Non sovrascrivono i dati riga-per-riga e non inventano importi mancanti.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Valuta */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Valuta</label>
                <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.52)] font-mono">EUR</div>
              </div>

              {/* Fonte finanziaria */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Fonte finanziaria prevalente</label>
                <select value={finSourceType} onChange={e => setFinSourceType(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="unknown">Non specificata</option>
                  <option value="provider_export">Export fornitore welfare</option>
                  <option value="lms_export">Export piattaforma LMS</option>
                  <option value="internal_accounting">Contabilità interna</option>
                  <option value="invoice_consuntivo">Fattura / Consuntivo</option>
                  <option value="hr_declaration">Dichiarazione HR</option>
                </select>
              </div>

              {/* Evidence level di default */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Evidence level di default</label>
                <select value={finEvidLevel} onChange={e => setFinEvidLevel(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="L0">L0 — Nessuna evidenza (default)</option>
                  <option value="L1">L1 — Auto-dichiarato / Spreadsheet</option>
                  <option value="L2">L2 — Documento interno</option>
                  <option value="L3">L3 — Export terze parti / Verificato</option>
                </select>
              </div>

              {/* Ambito budget */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Ambito budget</label>
                <select value={finBudgetScope} onChange={e => setFinBudgetScope(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="unknown">Non specificato</option>
                  <option value="welfare">Welfare</option>
                  <option value="fringe_benefit">Fringe benefit</option>
                  <option value="hr_learning">Formazione / HR Learning</option>
                  <option value="esg_volunteering">ESG / Volontariato</option>
                  <option value="compliance_hse">Compliance / HSE</option>
                  <option value="mixed">Misto</option>
                </select>
              </div>

              {/* Contiene importi? */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Il file contiene importi?</label>
                <select value={finContainsAmt} onChange={e => setFinContainsAmt(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="unknown">Non noto</option>
                  <option value="yes">Sì</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Benefit monetari */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Contiene benefit monetari / fringe / voucher?</label>
                <select value={finEconRelief} onChange={e => setFinEconRelief(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="unknown">Non noto</option>
                  <option value="yes">Sì</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Compliance/HSE */}
              <div>
                <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">Contiene spese compliance / HSE?</label>
                <select value={finComplianceSpd} onChange={e => setFinComplianceSpd(e.target.value)}
                  className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none focus:ring-1 focus:ring-[#C76F3D]">
                  <option value="unknown">Non noto</option>
                  <option value="yes">Sì</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            {/* Note finanziarie interne — locale only, mai inviato al server */}
            <div>
              <label className="block text-[10px] font-semibold text-[rgba(6,3,43,0.52)] uppercase tracking-wide mb-1">
                Note finanziarie interne
                <span className="ml-1.5 rounded bg-[rgba(217,154,43,0.12)] text-[#8A5A00] px-1 py-0.5 text-[9px] font-bold">Solo locale — non salvato</span>
              </label>
              <textarea
                value={finNotes} onChange={e => setFinNotes(e.target.value)}
                rows={2}
                placeholder="Note operative interne (non vengono salvate nel sistema)"
                className="w-full rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2 text-xs text-[rgba(6,3,43,0.78)] placeholder-slate-300 focus:outline-none focus:ring-1 focus:ring-[#C76F3D] resize-none"
              />
            </div>
          </div>
        )}

        {/* B13 FASE 3 — Pseudonymization confirmation gate (shown after dry-run passed) */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.14)] bg-[#F8F6F1] px-4 py-4 space-y-3">
            <p className="text-[10px] font-bold text-[rgba(6,3,43,0.62)] uppercase tracking-wide">Conferma pseudonimizzazione</p>
            <div className="space-y-2">
              {([
                [pCheck1, setPCheck1, 'Il file non contiene nomi, cognomi, email, codici fiscali, telefoni o indirizzi.'],
                [pCheck2, setPCheck2, 'Eventuali identificativi lavoratore sono pseudonimi non reversibili.'],
                [pCheck3, setPCheck3, 'I dati sono caricati per analisi organizzativa aggregata, non per valutazione individuale.'],
                [pCheck4, setPCheck4, 'Sono consapevole che KORA rifiuterà PII dirette e non produrrà report individuali.'],
              ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label], i) => (
                <label key={i} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={val} onChange={e => setter(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-[rgba(6,3,43,0.14)] text-[#C76F3D] focus:ring-[#C76F3D]" />
                  <span className="text-xs text-[rgba(6,3,43,0.78)]">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* B4.2 — Accept batch section (shown after dry-run passed) */}
        {csvStatus === 'passed' && csvResult?.ok && acceptStatus === 'idle' && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-2">
            <p className="text-[10px] font-bold text-[rgba(6,3,43,0.52)] uppercase tracking-wide">Create Intake Batch</p>
            <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Only PII-free / pseudonymized files can be persisted. Scoring is not executed in B4.2.</p>
            {fileType === 'xlsx' && selectedSheet && (
              <p className="text-[10px] text-[#C76F3D] font-medium">📋 Sheet selezionato: <strong>{selectedSheet}</strong></p>
            )}
            {!isTenantSelected && (
              <p className="text-[10px] text-[#9E3B2F] font-medium">⚠ Seleziona un&apos;azienda prima di procedere.</p>
            )}
            {!allPseudonymChecked && isTenantSelected && (
              <p className="text-[10px] text-[#8A5A00] font-medium">⚠ Conferma tutte le dichiarazioni di pseudonimizzazione per procedere.</p>
            )}
            <button
              onClick={handleAcceptBatch}
              disabled={!isTenantSelected || !allPseudonymChecked || (fileType === 'xlsx' && !selectedSheet && additionalFiles.length === 0)}
              className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ↓ {additionalFiles.length > 0 ? `Create multi-file batch (${1 + additionalFiles.length} file)` : 'Create intake batch'}
            </button>
          </div>
        )}

        {/* Accept: loading */}
        {acceptStatus === 'loading' && (
          <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2 text-xs text-[rgba(6,3,43,0.52)]">
            ⏳ Creating batch — re-validating file server-side…
          </div>
        )}

        {/* Accept: created */}
        {acceptStatus === 'created' && acceptResult?.ok && (
          <div className="rounded-lg border border-[rgba(47,125,85,0.22)] bg-green-50 px-4 py-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-green-700">✓ Batch created</span>
              <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-[10px] font-mono text-green-700">{acceptResult.batchId?.slice(0, 8)}…</span>
              <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[10px] font-semibold text-[rgba(6,3,43,0.62)]">status: {acceptResult.batchStatus}</span>
              {acceptResult.fileType === 'xlsx' && acceptResult.selectedSheetName && (
                <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-2 py-0.5 text-[10px] font-semibold text-[#C76F3D]">xlsx · {acceptResult.selectedSheetName}</span>
              )}
              {acceptResult.mappingApplied && (
                <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[10px] text-[rgba(6,3,43,0.52)]">mapping applicato</span>
              )}
              {acceptResult.manualCompletionApplied && acceptResult.manualCompletionApplied.length > 0 && (
                <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[10px] text-[#8A5A00]">manual: {acceptResult.manualCompletionApplied.join(', ')}</span>
              )}
              {acceptResult.matchReviewSummary && (acceptResult.matchReviewSummary.override_accepted ?? 0) > 0 && (
                <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-[10px] text-green-700">match review applicato</span>
              )}
            </div>
            {acceptResult.eligibilitySummary && (
              <div className="flex flex-wrap gap-2 text-[10px]">
                <span className="rounded border border-[rgba(47,125,85,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-green-700 font-medium">Eligible: {acceptResult.eligibilitySummary.eligible}</span>
                <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[#F8F6F1] px-2 py-0.5 text-[#8A5A00] font-medium">Limited: {acceptResult.eligibilitySummary.limited}</span>
                <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[#F8F6F1] px-2 py-0.5 text-[#9E3B2F] font-medium">Blocked: {acceptResult.eligibilitySummary.blocked}</span>
                <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-2 py-0.5 text-[rgba(6,3,43,0.62)] font-medium">Total: {acceptResult.rowCount}</span>
              </div>
            )}
            {/* B33: match review summary */}
            {acceptResult.matchReviewSummary && (
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {(acceptResult.matchReviewSummary.override_accepted ?? 0) > 0 && (
                  <span className="rounded border border-[rgba(47,125,85,0.22)] bg-green-50 px-2 py-0.5 text-green-700">✓ Accepted: {acceptResult.matchReviewSummary.override_accepted}</span>
                )}
                {(acceptResult.matchReviewSummary.override_rejected ?? 0) > 0 && (
                  <span className="rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-2 py-0.5 text-[#9E3B2F]">✗ Rejected: {acceptResult.matchReviewSummary.override_rejected}</span>
                )}
                {(acceptResult.matchReviewSummary.override_needs_review ?? 0) > 0 && (
                  <span className="rounded border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[#8A5A00]">? Needs review: {acceptResult.matchReviewSummary.override_needs_review}</span>
                )}
                {(acceptResult.matchReviewSummary.default_merged ?? 0) > 0 && (
                  <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-[rgba(6,3,43,0.62)]">Default merged: {acceptResult.matchReviewSummary.default_merged}</span>
                )}
                {(acceptResult.matchReviewSummary.default_skipped ?? 0) > 0 && (
                  <span className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-2 py-0.5 text-[rgba(6,3,43,0.52)]">Skipped (possible): {acceptResult.matchReviewSummary.default_skipped}</span>
                )}
              </div>
            )}
            {acceptResult.skippedPreHeaderRows != null && acceptResult.skippedPreHeaderRows > 0 && (
              <div className="rounded border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] text-blue-700">
                ℹ {acceptResult.skippedPreHeaderRows} riga{acceptResult.skippedPreHeaderRows > 1 ? 'he' : ''} pre-header saltata{acceptResult.skippedPreHeaderRows > 1 ? '' : ''} automaticamente durante l&apos;accettazione.
              </div>
            )}
            {acceptResult.warnings && acceptResult.warnings.length > 0 && (
              <div className="space-y-0.5">
                {acceptResult.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-[#8A5A00]">⚠ {w}</p>
                ))}
              </div>
            )}
            <div className="space-y-0.5">
              <p className="text-[10px] text-green-700 font-medium">Batch creato — in attesa di review UEF. Lo scoring rimane bloccato fino all&apos;approvazione.</p>
              <p className="text-[10px] text-[rgba(6,3,43,0.40)]">Lo scoring non viene eseguito in questa fase.</p>
            </div>
            {/* B9.2: next-step CTA with batchId query param */}
            {acceptResult.batchId && (
              <div className="pt-2 border-t border-green-100 space-y-1">
                <p className="text-[9px] font-bold uppercase tracking-widest text-green-700">Passo successivo</p>
                <a
                  href={`/admin/uef-review?batchId=${encodeURIComponent(acceptResult.batchId)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#06032B] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1a1756] transition-colors"
                >
                  → Genera candidati UEF
                </a>
              </div>
            )}
          </div>
        )}

        {/* Accept: rejected (PII found on re-run) */}
        {acceptStatus === 'rejected' && acceptResult && !acceptResult.ok && (
          <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-[#9E3B2F]">⚠ {acceptResult.error ?? 'Batch rejected during server-side re-validation.'}</p>
            {acceptResult.forbiddenHeaders && acceptResult.forbiddenHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-[#9E3B2F] font-medium">Forbidden headers:</span>
                {acceptResult.forbiddenHeaders.map(h => (
                  <span key={h} className="rounded border border-[rgba(158,59,47,0.22)] bg-[#F8F6F1] px-1.5 py-0.5 text-[10px] font-mono text-[#9E3B2F]">{h}</span>
                ))}
              </div>
            )}
            {acceptResult.findings && acceptResult.findings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-[#9E3B2F] mb-1">PII findings (field paths only — no values):</p>
                {acceptResult.findings.slice(0, 8).map((f, i) => (
                  <p key={i} className="text-[10px] font-mono text-[#9E3B2F]">Row {f.rowIndex} · {f.fieldPath} · {f.riskType} · {f.severity}</p>
                ))}
              </div>
            )}
            <p className="text-[10px] text-[#9E3B2F] border-t border-red-100 pt-1">
              {acceptResult.note ?? 'No data has been stored.'}
            </p>
          </div>
        )}

        {/* Accept: error */}
        {acceptStatus === 'error' && acceptResult && (
          <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-2 text-xs text-[#9E3B2F]">
            ⚠ {acceptResult.error ?? 'Unknown error during batch creation.'}
          </div>
        )}

        {/* Result: rejected */}
        {csvStatus === 'rejected' && csvResult && !csvResult.ok && (
          <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 space-y-2">
            <p className="text-xs font-bold text-[#9E3B2F]">⚠ {csvResult.error ?? 'Batch rejected.'}</p>
            {csvResult.forbiddenHeaders && csvResult.forbiddenHeaders.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-[#9E3B2F] font-medium">Forbidden headers:</span>
                {csvResult.forbiddenHeaders.map(h => (
                  <span key={h} className="rounded border border-[rgba(158,59,47,0.22)] bg-[#F8F6F1] px-1.5 py-0.5 text-[10px] font-mono text-[#9E3B2F]">{h}</span>
                ))}
              </div>
            )}
            {csvResult.findings && csvResult.findings.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-[#9E3B2F] mb-1">PII findings (field paths only — no values shown):</p>
                <div className="space-y-0.5">
                  {csvResult.findings.slice(0, 10).map((f, i) => (
                    <p key={i} className="text-[10px] font-mono text-[#9E3B2F]">
                      Row {f.rowIndex} · {f.fieldPath} · {f.riskType} · {f.severity}
                    </p>
                  ))}
                  {csvResult.findings.length > 10 && (
                    <p className="text-[10px] text-red-500">…and {csvResult.findings.length - 10} more findings.</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-[10px] text-[#9E3B2F] border-t border-red-100 pt-2">
              {csvResult.note ?? 'No data has been stored. Remove direct personal identifiers and re-submit.'}
            </p>
          </div>
        )}

        {/* Result: error */}
        {csvStatus === 'error' && csvResult && (
          <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-2 text-xs text-[#9E3B2F]">
            ⚠ {csvResult.error ?? 'Unknown error during validation.'}
          </div>
        )}
      </div>

      {/* ── B9. TENANT SELECTOR ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Azienda</p>
          {tenantList.length > 0 ? (
            <select
              value={TENANT}
              onChange={e => {
                setTENANT(e.target.value);
                setPreview(null); setLoadErr(null); setOpResult(null);
                setAcceptResult(null); setAcceptStatus('idle');
                setCsvResult(null); setCsvStatus('idle');
              }}
              className="rounded border border-[rgba(6,3,43,0.14)] bg-[rgba(6,3,43,0.03)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[160px]"
            >
              <option value="">— Seleziona azienda —</option>
              {tenantList.map(t => (
                <option key={t.tenantCode} value={t.tenantCode}>
                  {t.tenantCode} — {t.companyName}
                </option>
              ))}
            </select>
          ) : (
            <input
              value={TENANT}
              onChange={e => setTENANT(e.target.value.toUpperCase())}
              placeholder="Codice azienda"
              className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400 w-36"
            />
          )}
          {/* B13: OP-001 synthetic warning */}
          {isOp001 && (
            <span className="rounded border border-amber-300 bg-[rgba(217,154,43,0.08)] px-2 py-0.5 text-[10px] font-semibold text-[#8A5A00]">
              Synthetic demo tenant — non usare per dati reali.
            </span>
          )}
          {/* B13: no tenant selected alert */}
          {!isTenantSelected && (
            <p className="text-[10px] text-[#9E3B2F] font-medium">
              Seleziona un&apos;azienda prima di caricare dati. OP-001 è riservato alla demo synthetic.
            </p>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Reporting Period</p>
          <input
            value={PERIOD}
            onChange={e => setPERIOD(e.target.value)}
            placeholder="2026-Q1"
            className="rounded border border-[rgba(6,3,43,0.14)] px-2.5 py-1.5 text-xs font-mono text-[rgba(6,3,43,0.90)] focus:outline-none focus:ring-1 focus:ring-slate-400 w-28"
          />
        </div>
        <a href="/admin/tenants"
          className="text-[10px] text-[#C76F3D] underline underline-offset-2 hover:text-[#4a41d4] pb-1.5">
          + Crea azienda
        </a>
      </div>

      {/* ── B. FLOW TIMELINE ── */}
      <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4">
        <p className="text-xs font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wider mb-3">Data Intake Flow</p>
        <div className="flex items-start gap-0 overflow-x-auto pb-1">
          {FLOW_PHASES.map((ph, i) => {
            const st = phaseStatus(ph.id);
            return (
              <div key={ph.id} className="flex items-center flex-shrink-0">
                <div className="flex flex-col items-center gap-1.5 w-[90px]">
                  <div className="text-lg leading-none">{ph.icon}</div>
                  <span className="text-[10px] font-semibold text-[rgba(6,3,43,0.62)] text-center leading-tight">{ph.label}</span>
                  <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${PHASE_BADGE[st]}`}>
                    {PHASE_LABEL[st]}
                  </span>
                </div>
                {i < FLOW_PHASES.length - 1 && (
                  <div className="flex-shrink-0 w-6 h-px bg-[rgba(6,3,43,0.12)] mx-1 mt-[-18px]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-5 py-4 text-sm text-[rgba(6,3,43,0.52)] flex gap-2 items-center">
          <span className="animate-spin">⏳</span> Caricamento preview…
        </div>
      )}
      {loadErr && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-5 py-3 text-sm text-[#9E3B2F]">⚠ {loadErr}</div>
      )}

      {preview && <>

        {/* ── C. BATCH PREVIEW ── */}
        <Section title="Synthetic Batch Preview" sub={`${preview.batch.totalCount} record sintetici · ${preview.batch.batchLabel}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.08)]">
                  {['#','Iniziativa','Categoria','Tipo','Partecipanti','Eligibility'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.batch.records.map(rec => (
                  <tr key={rec.recordId} className="border-b border-[rgba(6,3,43,0.05)] hover:bg-[rgba(6,3,43,0.03)]">
                    <td className="py-2 px-3 font-mono text-[rgba(6,3,43,0.40)]">{rec.rowIndex + 1}</td>
                    <td className="py-2 px-3 font-medium text-[rgba(6,3,43,0.78)] max-w-[200px] truncate">{rec.nomeInitiativa}</td>
                    <td className="py-2 px-3 text-[rgba(6,3,43,0.52)]">{rec.categoria}</td>
                    <td className="py-2 px-3 text-[rgba(6,3,43,0.52)]">{rec.tipo}</td>
                    <td className="py-2 px-3 text-[rgba(6,3,43,0.62)] text-right">{rec.partecipanti ?? '—'}</td>
                    <td className="py-2 px-3">{badge(rec.eligibilityStatus, ELIGIBILITY_COLOR)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">Dati sintetici generati deterministicamente. Nessun dato reale o PII.</p>
        </Section>

        {/* ── D. PII GUARD ── */}
        <Section title="PII Guard" sub={`${preview.piiGuard.recordCount} record uploaded · policy: ${preview.piiGuard.policy}`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-3">
            <KPICard label="Checked" value={preview.piiGuard.checked ? '✓ Yes' : 'No'} accent />
            <KPICard label="PII Found" value={preview.piiGuard.piiFound ? '⚠ Yes' : '✓ No'} ok={!preview.piiGuard.piiFound} />
            <KPICard label="Findings" value={String(preview.piiGuard.totalFindings)} />
            <KPICard label="Status" value={preview.piiGuard.status === 'passed' ? '✓ Passed' : '⚠ Review'} ok={preview.piiGuard.status === 'passed'} />
          </div>
          <div className="rounded bg-[#f5f4ff] border border-[#c7c4f8] px-4 py-2.5 text-xs text-[#3d3a6a]">
            <strong>PII Guard</strong> è un livello di sicurezza tecnico, non un sostituto per la pseudonimizzazione all&apos;origine, il DPA o le clausole contrattuali.
            Sostituisce i valori PII rilevati con <code className="bg-[#F8F6F1]/60 px-1 rounded">[REDACTED_PII:TYPE]</code> — nessun valore viene mai salvato in audit o response.
          </div>
        </Section>

        {/* ── E. ELIGIBILITY GATE ── */}
        <Section title="Eligibility Gate" sub={`${preview.eligibility.total} record classificati`}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
            <KPICard label="Eligible" value={String(preview.eligibility.eligible)} ok />
            <KPICard label="Limited" value={String(preview.eligibility.limited)} />
            <KPICard label="Blocked" value={String(preview.eligibility.blocked)} warn={preview.eligibility.blocked > 0} />
            <KPICard label="Review req." value={String(preview.eligibility.reviewRequired)} />
          </div>
          <div className="space-y-1.5">
            {preview.eligibility.records.map(r => (
              <div key={r.recordId} className="flex items-start gap-3 py-2 px-3 rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] text-xs">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-[rgba(6,3,43,0.78)] truncate block">{r.nomeInitiativa}</span>
                  <span className="text-[rgba(6,3,43,0.40)]">{r.impactTreatment} · conf {(r.confidence * 100).toFixed(0)}%</span>
                  {r.reason && <span className="block text-[rgba(6,3,43,0.40)] italic truncate">{r.reason}</span>}
                </div>
                {badge(r.status, ELIGIBILITY_COLOR)}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-2">Eligibility Gate riusa <code>lib/kora-engine/eligibility-gate.ts</code> — nessuna logica duplicata.</p>
        </Section>

        {/* ── F. UEF PREVIEW ── */}
        <Section title="UEF Preview" sub={`${preview.uefPreview.total} UEF records · ${preview.uefPreview.approvedForScoring} approved for scoring`}>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <KPICard label="Tot. UEF" value={String(preview.uefPreview.total)} />
            <KPICard label="→ Scoring" value={String(preview.uefPreview.approvedForScoring)} ok />
            <KPICard label="→ BTI Gov." value={String(preview.uefPreview.approvedForBTI)} />
          </div>
          <div className="mb-3">
            <p className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wider mb-1.5">Distribuzione categorie</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(preview.uefPreview.categoryDistribution).map(([cat, n]) => (
                <span key={cat} className="rounded border border-[#C76F3D]/30 bg-[#f5f4ff] px-2 py-0.5 text-xs text-[#4d48d0] font-medium">
                  {cat}: {n}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-[rgba(6,3,43,0.08)]">
                  {['Iniziativa','Categoria','Event Nature','Eligibility','Impact Treatment','Conf.','Scoring'].map(h => (
                    <th key={h} className="text-left py-2 px-2.5 text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.uefPreview.records.map(r => (
                  <tr key={r.recordId} className="border-b border-[rgba(6,3,43,0.05)] hover:bg-[rgba(6,3,43,0.03)]">
                    <td className="py-2 px-2.5 font-medium text-[rgba(6,3,43,0.78)] max-w-[160px] truncate">{r.rawName}</td>
                    <td className="py-2 px-2.5 text-[rgba(6,3,43,0.52)]">{r.actionFamily}</td>
                    <td className="py-2 px-2.5 text-[rgba(6,3,43,0.52)]">{r.eventNature}</td>
                    <td className="py-2 px-2.5">{badge(r.eligibility, ELIGIBILITY_COLOR)}</td>
                    <td className="py-2 px-2.5 text-[rgba(6,3,43,0.52)] text-[10px]">{r.impactTreatment}</td>
                    <td className="py-2 px-2.5 text-[rgba(6,3,43,0.52)] text-right">{(r.confidence * 100).toFixed(0)}%</td>
                    <td className="py-2 px-2.5">
                      <span className={`text-xs font-semibold ${r.approvedForScoring ? 'text-green-700' : 'text-[rgba(6,3,43,0.40)]'}`}>
                        {r.approvedForScoring ? '✓' : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ── G. ACTIONS ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4">
          <p className="text-xs font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wider mb-1">Actions</p>
          <p className="text-[10px] text-[rgba(6,3,43,0.40)] mb-3">
            {isOp001
              ? 'Pipeline sintetica OP-001 — dati di demo, non tenant live.'
              : 'Attenzione: il flusso operator-flow usa la pipeline sintetica OP-001. Per i tenant live usa il flusso standard: Data Intake → UEF Review → Scoring.'}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <button onClick={handleRun} disabled={isOp}
              className="bg-[#06032B] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#1a1756] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
              {opStatus === 'running' ? '⏳ Esecuzione…' : '▶ Run operator flow'}
            </button>
            <button onClick={handleRead} disabled={isOp}
              className="border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[rgba(6,3,43,0.03)] disabled:opacity-50 transition-colors">
              {opStatus === 'reading' ? '⏳ Lettura…' : '↻ Read current result'}
            </button>
            <a href={`/api/admin/decision-pack/preview?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`}
              target="_blank" rel="noopener noreferrer"
              className="border border-[#C76F3D] text-[#C76F3D] rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#f5f4ff] transition-colors">
              ↗ Decision Pack Preview
            </a>
            <a href={`/api/admin/decision-pack/pdf?tenantCode=${TENANT}&reportingPeriod=${PERIOD}`}
              download={`kora-decision-pack-${TENANT}-${PERIOD}.pdf`}
              className="bg-[#C76F3D] text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-[#4d48d0] transition-colors">
              ↓ Download Decision Pack PDF
            </a>
          </div>
          {opStatus === 'error' && opErr && (
            <div className="mt-2 rounded border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-3 py-2 text-xs text-[#9E3B2F]">⚠ {opErr}</div>
          )}
        </div>

        {/* ── H. RESULT SNAPSHOT ── */}
        {snapshot && (
          <Section title="Result Snapshot" sub={`${TENANT} · ${PERIOD} · dati live persistiti`}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mb-3">
              <div className="col-span-2 sm:col-span-1 rounded-lg bg-[#06032B] px-5 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">KORA Index</p>
                <p className="text-4xl font-bold text-white tracking-tight leading-none">{fmt(snapshot.ki)}</p>
                <p className="text-[10px] text-white/30 mt-2 font-mono">pre_empirical_calibration</p>
              </div>
              <KPICard label="Activation Safeguard" value={snapshot.sf ?? '—'} raw>
                {snapshot.sf && <span className={`rounded border px-2 py-0.5 text-xs font-bold mt-1 inline-block ${SAFEGUARD_COLOR[snapshot.sf] ?? 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.62)] border-[rgba(6,3,43,0.08)]'}`}>{snapshot.sf}</span>}
              </KPICard>
              <KPICard label="Confidence Score" value={pct(snapshot.cs)} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KPICard label="Activation Rate"     value={pct(snapshot.ar)} />
              <KPICard label="Meaningful AR"        value={pct(snapshot.mar)} />
              {preview.resultSnapshot && <>
                <KPICard label="Decision Pack" value={preview.resultSnapshot.decisionPack.status.toUpperCase()} />
                <KPICard label="Metodologia"   value="v0.1" />
              </>}
            </div>
          </Section>
        )}

        {/* ── I. SAFETY BOUNDARIES ── */}
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-5 py-3">
          <p className="text-[10px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-wider mb-2">Safety Boundaries</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              'No real data', 'N≥10 enforced',
              'PII Guard active · strict-reject', 'KORA_ADMIN only',
              'CSV + XLSX (.xlsx)', 'Sheet selection required for XLSX',
              'No scoring recalculation', 'Gate 3B required before real data',
            ].map(n => (
              <span key={n} className="text-[10px] border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] rounded px-2 py-0.5 text-[rgba(6,3,43,0.52)] font-medium">{n}</span>
            ))}
          </div>
        </div>

      </>}

    </div>
  );
}

// ── Layout sub-components ──────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-5 py-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-0.5 h-4 bg-[#C76F3D] rounded-full flex-shrink-0" />
        <div>
          <p className="text-xs font-bold text-[rgba(6,3,43,0.78)] uppercase tracking-wide leading-none">{title}</p>
          {sub && <p className="text-[10px] text-[rgba(6,3,43,0.40)] mt-0.5">{sub}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function KPICard({ label, value, ok, warn, accent, raw, children }: {
  label: string; value?: string; ok?: boolean; warn?: boolean; accent?: boolean; raw?: boolean; children?: React.ReactNode;
}) {
  const valColor = ok ? 'text-green-700' : warn ? 'text-[#8A5A00]' : accent ? 'text-[#C76F3D]' : 'text-[#06032B]';
  return (
    <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[#fafafa] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[rgba(6,3,43,0.40)] mb-1">{label}</p>
      {!raw && value && <p className={`text-base font-bold ${valColor} leading-tight`}>{value}</p>}
      {children}
    </div>
  );
}
