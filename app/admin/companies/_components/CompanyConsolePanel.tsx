'use client';

// app/admin/companies/_components/CompanyConsolePanel.tsx
// B37 — KORA Admin Company Console. Operational live tenant registry.
// Read-only. No PII beyond admin email. No worker data. No raw payload.

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import type { TenantLifecycleStatus } from '@/app/api/admin/company-console/route';

// ── Types ────────────────────────────────────────────────────────────────────

interface UefCounts {
  total: number;
  pendingReview: number;
  approved: number;
  rejected: number;
  needsInfo: number;
  needsEnrichment: number;
}

interface ConsoleTenant {
  tenantId:           string;
  tenantCode:         string;
  companyName:        string;
  tenantStatus:       'active' | 'suspended';
  methodologyVersion: string;
  createdAt:          string;
  onboardingStatus:   string | null;
  companyUsersCount:  number;
  primaryAdminEmail:  string | null;
  totalWorkers:       number | null;
  latestBatch: {
    batchId: string;
    status: string;
    rowCount: number;
    reportingPeriod: string;
    createdAt: string;
  } | null;
  uefCounts:          UefCounts | null;
  evidenceReadiness:  string;
  latestKoraIndex: {
    value: number;
    confidenceScore: number;
    safeguardStatus: string;
    activationRate: number | null;
    reportingPeriod: string;
    methodologyVersion: string;
    calibrationStatus: string;
    scoredAt: string;
  } | null;
  decisionPack: {
    versionId:       string;
    status:          string;
    reportingPeriod: string;
    createdAt:       string;
  } | null;
  submissions: {
    total: number;
    pending: number;
    needsClarification: number;
    accepted: number;
  };
  lifecycleStatus:  TenantLifecycleStatus;
  warningFlags:     string[];
  quickActions: {
    viewWorkspace:   string;
    manageUsers:     string;
    evidenceArchive: string;
    livePreview:     string;
    dataIntake:      string | null;
    uefReview:       string | null;
    submissions:     string | null;
  };
}

interface ConsoleData {
  ok:          boolean;
  generatedAt: string;
  summary: {
    total: number;
    active: number;
    suspended: number;
    scored: number;
    decisionPackReady: number;
    needsAction: number;
  };
  tenants:  ConsoleTenant[];
  caveat:   string;
}

// ── Style maps ───────────────────────────────────────────────────────────────

const LIFECYCLE_LABEL: Record<TenantLifecycleStatus, string> = {
  suspended:              'SOSPESO',
  no_users:               'NO USERS',
  workspace_ready:        'WORKSPACE READY',
  data_pending:           'DATA PENDING',
  review_in_progress:     'REVIEW IN PROGRESS',
  enrichment_needed:      'ENRICHMENT NEEDED',
  scoring_available:      'READY FOR SCORING',
  scored:                 'SCORED',
  decision_pack_available:'DECISION PACK READY',
};

const LIFECYCLE_CLS: Record<TenantLifecycleStatus, string> = {
  suspended:              'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.14)]',
  no_users:               'bg-[rgba(158,59,47,0.06)] text-[#9E3B2F] border-[rgba(158,59,47,0.20)]',
  workspace_ready:        'bg-[rgba(43,92,230,0.08)] text-[#1E4A8A] border-[rgba(43,92,230,0.20)]',
  data_pending:           'bg-[rgba(199,111,61,0.08)] text-[#C76F3D] border-[rgba(199,111,61,0.22)]',
  review_in_progress:     'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]',
  enrichment_needed:      'bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.22)]',
  scoring_available:      'bg-[rgba(107,122,146,0.10)] text-[#344256] border-[rgba(107,122,146,0.22)]',
  scored:                 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]',
  decision_pack_available:'bg-green-50 text-[#2F7D55] border-green-300',
};

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'text-green-700 bg-green-50 border-[rgba(47,125,85,0.22)]',
  WARNING: 'text-[#8A5A00] bg-[rgba(217,154,43,0.08)] border-[rgba(217,154,43,0.25)]',
  FLAGGED: 'text-[#9E3B2F] bg-[rgba(158,59,47,0.06)] border-[rgba(158,59,47,0.22)]',
};

const DP_STATUS_LABEL: Record<string, string> = {
  draft:    'Bozza',
  ready:    'Pronto',
  exported: 'Esportato',
  archived: 'Archiviato',
};

const DP_CLS: Record<string, string> = {
  draft:    'text-[#8A5A00] bg-[rgba(217,154,43,0.08)] border-[rgba(217,154,43,0.25)]',
  ready:    'text-blue-700 bg-blue-50 border-blue-200',
  exported: 'text-green-700 bg-green-50 border-[rgba(47,125,85,0.22)]',
  archived: 'text-[rgba(6,3,43,0.52)] bg-[rgba(6,3,43,0.03)] border-[rgba(6,3,43,0.08)]',
};

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ── Filters ───────────────────────────────────────────────────────────────────

type FilterStatus = 'all' | 'active' | 'suspended';
type FilterLifecycle = 'all' | TenantLifecycleStatus;
type FilterScoring = 'all' | 'scored' | 'not_scored';
type FilterDp = 'all' | 'ready' | 'not_ready';

// ── Main component ────────────────────────────────────────────────────────────

interface Props { userEmail: string }

export function CompanyConsolePanel({ userEmail }: Props) {
  const [data, setData]       = useState<ConsoleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const [search,          setSearch]          = useState('');
  const [filterStatus,    setFilterStatus]    = useState<FilterStatus>('all');
  const [filterLifecycle, setFilterLifecycle] = useState<FilterLifecycle>('all');
  const [filterScoring,   setFilterScoring]   = useState<FilterScoring>('all');
  const [filterDp,        setFilterDp]        = useState<FilterDp>('all');

  useEffect(() => {
    fetch('/api/admin/company-console', { credentials: 'include' })
      .then(r => r.json())
      .then((d: ConsoleData) => {
        if (d.ok) setData(d);
        else setError('Console data unavailable.');
      })
      .catch(() => setError('Network error loading console.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.tenants.filter(t => {
      if (search) {
        const q = search.toLowerCase();
        if (!t.companyName.toLowerCase().includes(q) && !t.tenantCode.toLowerCase().includes(q)) return false;
      }
      if (filterStatus !== 'all' && t.tenantStatus !== filterStatus) return false;
      if (filterLifecycle !== 'all' && t.lifecycleStatus !== filterLifecycle) return false;
      if (filterScoring === 'scored'     && !t.latestKoraIndex) return false;
      if (filterScoring === 'not_scored' && !!t.latestKoraIndex) return false;
      if (filterDp === 'ready' && !(t.decisionPack?.status === 'ready' || t.decisionPack?.status === 'exported')) return false;
      if (filterDp === 'not_ready' && (t.decisionPack?.status === 'ready' || t.decisionPack?.status === 'exported')) return false;
      return true;
    });
  }, [data, search, filterStatus, filterLifecycle, filterScoring, filterDp]);

  return (
    <div className="max-w-[1100px] mx-auto py-6 px-3 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
            KORA Admin · Company Console
          </p>
          <h1 className="text-xl font-bold text-white tracking-tight">Live Tenant Registry</h1>
          <p className="text-sm text-white/45 mt-0.5">
            Registro operativo pilot — stato live, scoring, evidenze, Decision Pack
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 mt-1 shrink-0">
          <Link
            href="/admin/companies/new"
            className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#4f44e0] transition-colors whitespace-nowrap"
          >
            + Crea Azienda Live
          </Link>
          <div className="flex flex-col items-end gap-1">
            <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">KORA_ADMIN</span>
            <span className="text-xs text-white/25 font-mono">{userEmail}</span>
          </div>
          <div className="flex gap-1 flex-wrap justify-end">
            {['LIVE PILOT', 'No PII', 'No Worker Data'].map(m => (
              <span key={m} className="rounded border border-white/15 bg-[#F8F6F1]/5 px-1.5 py-0.5 text-[9px] text-white/40 font-semibold uppercase">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Caveat ─────────────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-4 py-2 text-[10.5px] text-[#8A5A00]">
        Lifecycle status is pilot-derived from available KORA Admin data. · Confidence Score è esterno al KORA Index. · Foundation Light = pre_empirical_calibration.
      </div>

      {/* ── Loading / Error ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-8 text-xs text-[rgba(6,3,43,0.40)] text-center">
          Caricamento Company Console…
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.22)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-xs text-[#9E3B2F]">⚠ {error}</div>
      )}

      {data && !loading && (
        <>
          {/* ── Summary strip ──────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {[
              { label: 'Tenant totali',       value: String(data.summary.total) },
              { label: 'Attivi',              value: String(data.summary.active),           cls: 'text-green-700' },
              { label: 'Sospesi',             value: String(data.summary.suspended),        cls: data.summary.suspended > 0 ? 'text-[rgba(6,3,43,0.52)]' : undefined },
              { label: 'Scored',              value: String(data.summary.scored),           cls: 'text-violet-700' },
              { label: 'Decision Pack ready', value: String(data.summary.decisionPackReady), cls: 'text-[#2F7D55]' },
              { label: 'Needs action',        value: String(data.summary.needsAction),      cls: data.summary.needsAction > 0 ? 'text-[#8A5A00]' : undefined },
            ].map(({ label, value, cls }) => (
              <div key={label} className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2.5 text-center">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-[rgba(6,3,43,0.40)]">{label}</p>
                <p className={`text-xl font-bold text-[rgba(6,3,43,0.90)] mt-0.5 ${cls ?? ''}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ── Filters ────────────────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text" placeholder="Cerca azienda o codice…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-3 py-1.5 text-xs text-[rgba(6,3,43,0.90)] w-48 focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none"
            >
              <option value="all">Tutti gli stati</option>
              <option value="active">Attivi</option>
              <option value="suspended">Sospesi</option>
            </select>
            <select
              value={filterLifecycle} onChange={e => setFilterLifecycle(e.target.value as FilterLifecycle)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none"
            >
              <option value="all">Tutti i lifecycle</option>
              {(Object.keys(LIFECYCLE_LABEL) as TenantLifecycleStatus[]).map(s => (
                <option key={s} value={s}>{LIFECYCLE_LABEL[s]}</option>
              ))}
            </select>
            <select
              value={filterScoring} onChange={e => setFilterScoring(e.target.value as FilterScoring)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none"
            >
              <option value="all">Scoring: tutti</option>
              <option value="scored">Scored</option>
              <option value="not_scored">Non scored</option>
            </select>
            <select
              value={filterDp} onChange={e => setFilterDp(e.target.value as FilterDp)}
              className="rounded border border-[rgba(6,3,43,0.14)] px-2 py-1.5 text-xs text-[rgba(6,3,43,0.78)] focus:outline-none"
            >
              <option value="all">Decision Pack: tutti</option>
              <option value="ready">Pronto / Esportato</option>
              <option value="not_ready">Non pronto</option>
            </select>
            {(search || filterStatus !== 'all' || filterLifecycle !== 'all' || filterScoring !== 'all' || filterDp !== 'all') && (
              <button
                onClick={() => { setSearch(''); setFilterStatus('all'); setFilterLifecycle('all'); setFilterScoring('all'); setFilterDp('all'); }}
                className="text-[10px] text-[rgba(6,3,43,0.40)] underline hover:text-[rgba(6,3,43,0.78)]"
              >
                Rimuovi filtri
              </button>
            )}
            <span className="ml-auto text-[10px] text-[rgba(6,3,43,0.40)]">
              {filtered.length} di {data.tenants.length} aziende
            </span>
          </div>

          {/* ── Empty state ─────────────────────────────────────────────────── */}
          {data.tenants.length === 0 && (
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-6 py-10 text-center space-y-3">
              <p className="text-sm font-semibold text-[rgba(6,3,43,0.78)]">
                No live company tenant has been provisioned yet.
              </p>
              <p className="text-xs text-[rgba(6,3,43,0.52)]">
                Crea un&apos;azienda live e provisiona il primo Company Admin con un singolo flusso.
              </p>
              <div className="flex gap-3 justify-center pt-2 flex-wrap">
                <Link href="/admin/companies/new"
                  className="rounded-lg bg-[#C76F3D] text-white px-4 py-2 text-xs font-semibold hover:bg-[#4f44e0] transition-colors">
                  + Crea Azienda Live
                </Link>
                <Link href="/admin/tenants"
                  className="rounded-lg border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                  Onboarding avanzato
                </Link>
                <Link href="/admin/company-users"
                  className="rounded-lg border border-[rgba(6,3,43,0.14)] text-[rgba(6,3,43,0.78)] px-4 py-2 text-xs font-semibold hover:bg-[rgba(6,3,43,0.03)] transition-colors">
                  Gestisci utenti
                </Link>
              </div>
            </div>
          )}

          {filtered.length === 0 && data.tenants.length > 0 && (
            <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-4 text-xs text-[rgba(6,3,43,0.40)] text-center">
              Nessun tenant corrisponde ai filtri selezionati.
            </div>
          )}

          {/* ── Tenant table ─────────────────────────────────────────────────── */}
          {filtered.length > 0 && (
            <div className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                      {['Azienda', 'Lifecycle', 'Utenti', 'Workforce', 'KORA Index', 'Submission', 'Decision Pack', 'Azioni'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[9px] font-bold text-[rgba(6,3,43,0.40)] uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t) => (
                      <TenantRow key={t.tenantId} tenant={t} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] text-right">
            Generato: {ts(data.generatedAt)} · {data.caveat}
          </p>
        </>
      )}
    </div>
  );
}

// ── TenantRow — single row in the console table ────────────────────────────

function TenantRow({ tenant: t }: { tenant: ConsoleTenant }) {
  const [copied, setCopied] = useState(false);

  function copyId() {
    navigator.clipboard.writeText(t.tenantId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }

  return (
    <tr className="border-b border-[rgba(6,3,43,0.04)] hover:bg-[rgba(6,3,43,0.03)]/50">

      {/* Azienda */}
      <td className="px-4 py-3 min-w-[160px]">
        <p className="font-semibold text-[rgba(6,3,43,0.90)] leading-tight">{t.companyName}</p>
        <p className="text-[rgba(6,3,43,0.40)] font-mono text-[9px] mt-0.5">{t.tenantCode}</p>
        <div className="flex gap-1 mt-1 flex-wrap">
          <Badge
            label={t.tenantStatus === 'active' ? 'ACTIVE' : 'SUSPENDED'}
            cls={t.tenantStatus === 'active' ? 'bg-[rgba(47,125,85,0.08)] text-[#2F7D55] border-[rgba(47,125,85,0.22)]' : 'bg-[rgba(6,3,43,0.05)] text-[rgba(6,3,43,0.52)] border-[rgba(6,3,43,0.14)]'}
          />
          {t.warningFlags.length > 0 && (
            <Badge label={`${t.warningFlags.length} warn`} cls="bg-[rgba(217,154,43,0.08)] text-[#8A5A00] border-[rgba(217,154,43,0.25)]" />
          )}
        </div>
      </td>

      {/* Lifecycle */}
      <td className="px-4 py-3 min-w-[140px]">
        <Badge label={LIFECYCLE_LABEL[t.lifecycleStatus]} cls={LIFECYCLE_CLS[t.lifecycleStatus]} />
        {t.latestBatch && (
          <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-1">
            Periodo: {t.latestBatch.reportingPeriod}
          </p>
        )}
      </td>

      {/* Utenti */}
      <td className="px-4 py-3 min-w-[100px]">
        {t.companyUsersCount === 0 ? (
          <span className="text-[rgba(6,3,43,0.40)] italic">Nessun utente</span>
        ) : (
          <div>
            <p className="font-semibold text-[rgba(6,3,43,0.78)]">{t.companyUsersCount} utent{t.companyUsersCount === 1 ? 'e' : 'i'}</p>
            {t.primaryAdminEmail && (
              <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5 truncate max-w-[120px]" title={t.primaryAdminEmail}>
                {t.primaryAdminEmail}
              </p>
            )}
          </div>
        )}
      </td>

      {/* Workforce */}
      <td className="px-4 py-3 min-w-[80px]">
        {t.totalWorkers !== null ? (
          <p className="font-semibold text-[rgba(6,3,43,0.78)]">{t.totalWorkers.toLocaleString('it-IT')}</p>
        ) : (
          <span className="text-[rgba(6,3,43,0.40)] italic">—</span>
        )}
      </td>

      {/* KORA Index */}
      <td className="px-4 py-3 min-w-[160px]">
        {t.latestKoraIndex ? (
          <div className="space-y-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-[#06032B]">{t.latestKoraIndex.value}</span>
              <span className="text-[9px] text-[rgba(6,3,43,0.40)]">/100</span>
            </div>
            {/* Confidence Score visually separated from KORA Index (per doc 21b) */}
            <p className="text-[9px] text-[rgba(6,3,43,0.52)]">
              CS: <strong className="text-[rgba(6,3,43,0.78)]">{Math.round(t.latestKoraIndex.confidenceScore * 100)}%</strong>
              <span className="text-[rgba(6,3,43,0.40)]"> · esterno</span>
            </p>
            <Badge
              label={t.latestKoraIndex.safeguardStatus}
              cls={SAFEGUARD_CLS[t.latestKoraIndex.safeguardStatus] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
            />
            <p className="text-[8.5px] text-[rgba(6,3,43,0.40)]">{t.latestKoraIndex.reportingPeriod}</p>
          </div>
        ) : (
          <span className="text-[rgba(6,3,43,0.40)] italic text-[10px]">Not scored yet</span>
        )}
      </td>

      {/* Submission (B39) */}
      <td className="px-4 py-3 min-w-[110px]">
        {t.submissions.total === 0 ? (
          <span className="text-[rgba(6,3,43,0.40)] italic text-[10px]">Nessuna</span>
        ) : (
          <div className="space-y-0.5 text-[10px]">
            <p className="text-[rgba(6,3,43,0.62)]">{t.submissions.total} totali</p>
            {t.submissions.pending > 0 && (
              <p className="text-[#D99A2B]">⏳ {t.submissions.pending} in attesa</p>
            )}
            {t.submissions.needsClarification > 0 && (
              <p className="text-[#D99A2B]">⚠ {t.submissions.needsClarification} chiarimento</p>
            )}
            {t.submissions.accepted > 0 && (
              <p className="text-green-600">✓ {t.submissions.accepted} accettate</p>
            )}
            {t.quickActions.submissions && (
              <Link href={t.quickActions.submissions} className="text-[#C76F3D] hover:underline text-[9px]">
                Vedi →
              </Link>
            )}
          </div>
        )}
      </td>


      {/* Decision Pack */}
      <td className="px-4 py-3 min-w-[120px]">
        {t.decisionPack ? (
          <div className="space-y-1">
            <Badge
              label={DP_STATUS_LABEL[t.decisionPack.status] ?? t.decisionPack.status}
              cls={DP_CLS[t.decisionPack.status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
            />
            <p className="text-[9px] text-[rgba(6,3,43,0.40)]">{ts(t.decisionPack.createdAt)}</p>
            <p className="text-[8.5px] text-[rgba(6,3,43,0.40)]">{t.decisionPack.versionId}</p>
          </div>
        ) : (
          <span className="text-[rgba(6,3,43,0.40)] italic text-[10px]">Non generato</span>
        )}
      </td>

      {/* Azioni */}
      <td className="px-4 py-3 min-w-[140px]">
        <div className="flex flex-col gap-1">
          <Link
            href={t.quickActions.viewWorkspace}
            className="text-[10px] text-[#C76F3D] hover:underline font-medium"
          >
            Workspace →
          </Link>
          <Link
            href={t.quickActions.manageUsers}
            className="text-[10px] text-[rgba(6,3,43,0.62)] hover:underline"
          >
            Utenti
          </Link>
          <Link
            href={t.quickActions.evidenceArchive}
            className="text-[10px] text-[rgba(6,3,43,0.62)] hover:underline"
          >
            Evidence Archive
          </Link>
          <Link
            href={t.quickActions.livePreview}
            className="text-[10px] text-[rgba(6,3,43,0.62)] hover:underline"
          >
            Live Preview
          </Link>
          {t.quickActions.dataIntake && (
            <Link
              href={t.quickActions.dataIntake}
              className="text-[10px] text-blue-600 hover:underline"
            >
              Data Intake
            </Link>
          )}
          {t.quickActions.uefReview && (
            <Link
              href={t.quickActions.uefReview}
              className="text-[10px] text-[#D99A2B] hover:underline font-medium"
            >
              ⏳ UEF Review
            </Link>
          )}
          <button
            onClick={copyId}
            className="text-[9px] text-[rgba(6,3,43,0.40)] hover:text-[rgba(6,3,43,0.78)] text-left transition-colors"
          >
            {copied ? '✓ Copiato' : 'Copia tenant ID'}
          </button>
        </div>
      </td>

    </tr>
  );
}
