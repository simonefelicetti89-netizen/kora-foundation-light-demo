'use client';

// app/admin/company-evidence-archive/_components/CompanyEvidenceArchivePanel.tsx
// B29: Company Evidence Archive — read-only evidence lineage panel.
// No edit, no upload, no scoring, no delete. Privacy-safe aggregated view.

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface BatchSummary {
  batchId: string;
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
  eligible: 'bg-green-100 text-green-800 border-green-200',
  limited:  'bg-amber-100 text-amber-800 border-amber-200',
  blocked:  'bg-red-100 text-red-800 border-red-200',
  review_required: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
};
const READINESS_CLS: Record<string, string> = {
  report_ready:       'text-green-700',
  usable_with_caveat: 'text-amber-700',
  needs_evidence:     'text-red-700',
  not_ready:          'text-slate-400',
};

function StatCard({ label, value, sub, color = '#06032B', highlight = false }: {
  label: string; value: number | string; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div className={`rounded border px-3 py-2.5 ${highlight ? 'border-[#c7c4f8] bg-[#f5f4ff]' : 'border-slate-200 bg-slate-50'}`}>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <p className="text-xl font-bold leading-none" style={{ color }}>{value}</p>
      {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
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

  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      .then((d: { ok?: boolean; tenants?: TenantOption[] }) => {
        if (d.ok && d.tenants) setTenantList(d.tenants);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadArchive() {
    if (!TENANT) return;
    setLoading(true); setError(null); setData(null);
    fetch(`/api/admin/company-evidence-archive?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`, {
      credentials: 'include',
    })
      .then(r => r.json() as Promise<ArchiveData>)
      .then(d => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }

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

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-5">

      {/* ── Header ── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-widest uppercase text-[#6156F5]">KORA</span>
            <span className="text-xs text-white/30">·</span>
            <span className="text-xs font-semibold tracking-widest uppercase text-white/40">Admin</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Company Evidence Archive</h1>
          <p className="text-sm text-white/45 mt-0.5">Archivio Evidenze Azienda · Read-only lineage · {TENANT || '—'} · {PERIOD}</p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1">
          <span className="rounded border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300">Read-only</span>
          <span className="rounded border border-[#C8FF47]/40 bg-[#C8FF47]/10 px-2 py-0.5 text-xs font-semibold text-[#d4ff6b]">No operational actions</span>
        </div>
      </div>

      {/* ── Selector ── */}
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-end gap-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Azienda</p>
          {tenantList.length > 0 ? (
            <select value={TENANT} onChange={e => { setTENANT(e.target.value); setData(null); }}
              className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 min-w-[160px]">
              <option value="">— Seleziona azienda —</option>
              {tenantList.map(t => (
                <option key={t.tenantCode} value={t.tenantCode}>{t.tenantCode} — {t.companyName}</option>
              ))}
            </select>
          ) : (
            <input value={TENANT} onChange={e => setTENANT(e.target.value.toUpperCase())}
              placeholder="Codice azienda"
              className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none w-36" />
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Reporting Period</p>
          <input value={PERIOD} onChange={e => setPERIOD(e.target.value)} placeholder="2026-Q1"
            className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none w-28" />
        </div>
        <button onClick={loadArchive} disabled={!TENANT || loading}
          className="rounded-lg bg-[#06032B] text-white px-4 py-1.5 text-xs font-semibold hover:bg-[#1a1756] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          {loading ? '⏳ Caricamento…' : '↻ Carica archivio'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {error}</div>
      )}

      {data?.ok === false && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">⚠ {data.error ?? 'Errore nel caricamento archivio.'}</div>
      )}

      {data?.ok && <>

        {/* ── Batch Archive ── */}
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-[#6156F5] rounded-full" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Batch Archive — {data.batches.length} batch</p>
          </div>
          {data.batches.length === 0 ? (
            <p className="text-xs text-slate-400">Nessun batch trovato per questo periodo.</p>
          ) : (
            <div className="space-y-2">
              {data.batches.map((b, i) => (
                <div key={i} className="rounded border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap gap-2 items-center mb-2">
                    <span className="font-mono text-[10px] text-slate-400">{b.batchId}</span>
                    <span className="text-[10px] text-slate-400">{fmtDate(b.createdAt)}</span>
                    <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-semibold text-slate-500 uppercase">{b.batchStatus}</span>
                    <span className="text-[10px] text-slate-500">{b.rowCount} righe</span>
                    {b.fileMode === 'multi' && (
                      <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-1.5 py-0.5 text-[9px] font-semibold text-[#6156F5]">
                        multi-file · {b.fileCount} file
                      </span>
                    )}
                    {b.selectedSheetName && (
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
                        sheet: {b.selectedSheetName}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {b.mappingApplied && (
                      <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] text-slate-500">
                        mapping: {b.mappingFieldCount ?? '?'} campi
                      </span>
                    )}
                    {b.manualCompletionUsed && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700">
                        manual: {b.manualFields.join(', ')}
                      </span>
                    )}
                    {b.matchSummary && (
                      <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[9px] text-green-700">
                        match: {b.matchSummary['matched'] ?? 0}✓ {b.matchSummary['possibleMatch'] ?? 0}≈ {b.matchSummary['unmatched'] ?? 0}✗
                      </span>
                    )}
                  </div>
                  {b.sourceName && (
                    <p className="text-[9px] text-slate-400 mt-1 font-mono truncate">{b.sourceName}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Contribution Summary ── */}
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-0.5 h-4 bg-[#6156F5] rounded-full" />
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Contribution Summary</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="Totale iniziative"        value={data.contributionSummary.totalInitiatives} />
            <StatCard label="→ KORA Index"             value={data.contributionSummary.contributesToKoraIndex} color="#059669" highlight />
            <StatCard label="KORA Index + BTI"         value={data.contributionSummary.koraIndexAndBti} color="#166534" />
            <StatCard label="KORA Index only"          value={data.contributionSummary.koraIndexOnly} color="#6156F5" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="BTI / Economic Relief"  value={data.contributionSummary.btiOnlyEconomicRelief} color="#854d0e" />
            <StatCard label="Reporting Context"      value={data.contributionSummary.reportingContextOnly} color="#0c4a6e" />
            <StatCard label="Compliance Excluded"    value={data.contributionSummary.excludedCompliance} color="#713f12" />
            <StatCard label="Needs Info / Pending"   value={data.contributionSummary.needsInfo + data.contributionSummary.pendingReview} color="#6b7280" />
          </div>
        </div>

        {/* ── Initiative Lineage ── */}
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-0.5 h-4 bg-[#6156F5] rounded-full" />
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Initiative Lineage</p>
              <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono text-slate-500">{filteredInitiatives.length}/{data.initiatives.length}</span>
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cerca iniziativa…"
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#6156F5] w-40" />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(FILTER_LABELS) as Filter[]).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded border px-2 py-0.5 text-[10px] font-medium transition-colors ${filter === f ? 'bg-[#06032B] text-white border-[#06032B]' : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200">
                  {['Iniziativa', 'Pillar', 'Eligibility', 'Budget Class', 'Evidenza', 'Readiness', 'Contributo'].map(h => (
                    <th key={h} className="text-left py-1.5 px-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInitiatives.slice(0, 100).map((ini, i) => {
                  const rc = ROLE_COLORS[ini.contributionRole] ?? ROLE_COLORS['pending_review'];
                  return (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 max-w-[180px]">
                        <div className="font-medium text-slate-700 truncate" title={ini.safeName}>{ini.safeName}</div>
                        <div className="flex gap-1 mt-0.5">
                          {ini.hasManualCompletion && <span className="text-[8px] text-amber-600 font-medium">manual</span>}
                          {ini.hasColumnMapping    && <span className="text-[8px] text-[#6156F5] font-medium">mapped</span>}
                          {ini.hasMultiFileMatch   && <span className="text-[8px] text-green-600 font-medium">multi-file</span>}
                        </div>
                      </td>
                      <td className="py-2 px-2 text-slate-500">{ini.pillar ?? '—'}</td>
                      <td className="py-2 px-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${ELIG_CLS[ini.eligibility] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {ELIG_LABELS[ini.eligibility] ?? ini.eligibility}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-500 text-[10px]">{ini.budgetClass ?? '—'}</td>
                      <td className="py-2 px-2 text-slate-500 text-[10px]">{ini.evidenceLevel ?? '—'}</td>
                      <td className={`py-2 px-2 text-[10px] font-medium ${READINESS_CLS[ini.reportingReadiness ?? ''] ?? 'text-slate-400'}`}>
                        {ini.reportingReadiness?.replace('_', ' ') ?? '—'}
                      </td>
                      <td className="py-2 px-2">
                        <span className="rounded border px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ background: rc.bg, color: rc.text, borderColor: rc.border }}
                          title={ini.contributionExplanation}>
                          {ini.contributionRoleLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredInitiatives.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-xs text-slate-400">Nessuna iniziativa trovata per questo filtro.</td></tr>
                )}
              </tbody>
            </table>
            {filteredInitiatives.length > 100 && (
              <p className="text-[10px] text-slate-400 mt-2">Mostrando prime 100 di {filteredInitiatives.length}.</p>
            )}
          </div>
        </div>

        {/* ── Caveats ── */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Privacy & Methodology Boundaries</p>
          <ul className="space-y-1">
            {data.caveats.map((c, i) => (
              <li key={i} className="text-[10px] text-amber-800 leading-relaxed">· {c}</li>
            ))}
          </ul>
          <p className="text-[10px] text-amber-700 font-semibold pt-1 border-t border-amber-200">
            No edit · No upload · No scoring · No delete. Sola lettura.
          </p>
        </div>

        {/* ── Navigation links ── */}
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={`/admin/company-live-preview?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`}
            className="rounded-lg border border-[#6156F5] text-[#6156F5] px-4 py-2 text-xs font-semibold hover:bg-[#f5f4ff] transition-colors">
            ← Company Live Preview
          </a>
          <a href={`/admin/company-workspace?tenantCode=${encodeURIComponent(TENANT)}&reportingPeriod=${encodeURIComponent(PERIOD)}`}
            className="rounded-lg border border-slate-200 text-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
            Spazio Azienda
          </a>
          <a href="/admin/data-intake"
            className="rounded-lg border border-slate-200 text-slate-600 px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">
            Data Intake
          </a>
        </div>

      </>}

      {!data && !loading && !error && (
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-5 py-8 text-center text-sm text-slate-400">
          Seleziona un&apos;azienda e un periodo, poi clicca &quot;Carica archivio&quot;.
        </div>
      )}

    </div>
  );
}
