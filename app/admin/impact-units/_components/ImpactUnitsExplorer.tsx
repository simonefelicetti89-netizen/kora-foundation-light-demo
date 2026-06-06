'use client';
// app/admin/impact-units/_components/ImpactUnitsExplorer.tsx
// Client-side explorer panel for Impact Units™ trace layer.
// KORA_ADMIN only. No worker identity. Factor trace is audit-safe (methodology values only).

import { Fragment, useState, useEffect, useCallback } from 'react';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';

// ── Types mirroring the API response ─────────────────────────────────────────

interface TenantOption {
  id: string;
  tenantCode: string;
  companyName: string;
}

interface PillarTotals {
  LIFE: number;
  GROWTH: number;
  CONNECTION: number;
  IMPACT: number;
  LEGACY: number;
}

interface FactorTrace {
  factor_code:           string;
  label:                 string;
  value:                 number;
  reason:                string;
  data_source:           string;
  foundation_light_stub: boolean;
}

interface IURecord {
  id:                 string;
  uefRecordId:        string;
  sourceBatchId:      string;
  rawName:            string | null;
  primaryPillar:      string | null;
  eligibility:        string | null;
  computed:           boolean;
  exclusionReason:    string | null;
  impactUnitsTotal:   number;
  pillarIU:           PillarTotals;
  nm: number; bc: number; cq: number; ev: number; cf: number; agf: number;
  factorTrace:        FactorTrace[];
  methodologyVersion: string;
  calibrationStatus:  string;
  createdAt:          string;
}

interface IUSummary {
  totalRecords:       number;
  computedRecords:    number;
  blockedRecords:     number;
  totalIU:            number;
  pillarTotals:       PillarTotals;
  avgNM: number; avgCQ: number; avgEV: number; avgCF: number;
  methodologyVersion: string;
  calibrationStatus:  string;
  costPerIU:          null;
}

interface ExplorerData {
  tenant:           TenantOption;
  period:           string | null;
  availablePeriods: string[];
  summary:          IUSummary | null;
  records:          IURecord[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PILLAR_COLOR: Record<string, string> = {
  LIFE: '#10b981', GROWTH: '#3b82f6', CONNECTION: '#f59e0b', IMPACT: '#8b5cf6', LEGACY: '#ef4444',
};

const PILLAR_ORDER = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const FACTOR_FULL_LABEL: Record<string, string> = {
  NM:  'Normalized Magnitude',
  BC:  'Base Contribution',
  CQ:  'Completeness Quality',
  EV:  'Evidence Verification',
  CF:  'Correction Factor',
  AGF: 'Anti-Gaming Factor',
};

// ── ImpactUnitsExplorer ───────────────────────────────────────────────────────

export function ImpactUnitsExplorer({ userEmail }: { userEmail: string }) {
  const [tenants, setTenants]               = useState<TenantOption[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [selectedPeriod, setSelectedPeriod]     = useState('');
  const [data, setData]       = useState<ExplorerData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Load tenant list ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(d.tenants ?? []))
      .catch(() => setError('Impossibile caricare la lista tenant.'))
      .finally(() => setTenantsLoading(false));
  }, []);

  // ── Fetch IU data ─────────────────────────────────────────────────────────
  const fetchData = useCallback(async (tenantId: string, period: string) => {
    if (!tenantId) return;
    setLoading(true);
    setError('');
    try {
      const url = period
        ? `/api/admin/impact-units?tenantId=${tenantId}&reportingPeriod=${encodeURIComponent(period)}`
        : `/api/admin/impact-units?tenantId=${tenantId}`;
      const res = await fetch(url);
      const d   = await res.json();
      if (d.ok) {
        setData(d);
      } else {
        setError(d.error ?? 'Errore nel caricamento dei dati.');
      }
    } catch {
      setError('Errore di rete.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTenantId) fetchData(selectedTenantId, selectedPeriod);
  }, [selectedTenantId, selectedPeriod, fetchData]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const computedRecords = data?.records.filter((r) => r.computed) ?? [];
  const blockedRecords  = data?.records.filter((r) => !r.computed) ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', color: '#e2e8f0', padding: '1.5rem', maxWidth: 1200 }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Impact Units™ Explorer</h1>
        <BoundaryBadge mode="LIVE" variant="light" style={{ marginTop: 6 }} />
        <p style={{ color: '#64748b', fontSize: '0.8rem', marginTop: 4 }}>
          Trace layer metodologico — KORA_ADMIN only · Nessun dato individuale
        </p>
      </div>

      {/* ── Selectors ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tenant
          </label>
          <select
            value={selectedTenantId}
            onChange={(e) => {
              setSelectedTenantId(e.target.value);
              setSelectedPeriod('');
              setData(null);
              setExpandedId(null);
            }}
            disabled={tenantsLoading}
            style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '0.5rem 0.75rem', minWidth: 240, fontSize: '0.875rem' }}
          >
            <option value="">— Seleziona tenant —</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.companyName} ({t.tenantCode})
              </option>
            ))}
          </select>
        </div>

        {data?.availablePeriods && data.availablePeriods.length > 0 && (
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Periodo
            </label>
            <select
              value={data.period ?? ''}
              onChange={(e) => { setSelectedPeriod(e.target.value); setExpandedId(null); }}
              disabled={loading}
              style={{ background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '0.5rem 0.75rem', minWidth: 180, fontSize: '0.875rem' }}
            >
              {data.availablePeriods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── States ────────────────────────────────────────────────────────── */}
      {loading && <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Caricamento...</p>}
      {error   && <p style={{ color: '#f87171', fontSize: '0.875rem' }}>{error}</p>}

      {/* ── No data ───────────────────────────────────────────────────────── */}
      {data && !loading && !data.summary && (
        <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
          Nessun dato Impact Units™ disponibile per questo tenant.
        </p>
      )}

      {/* ── Main content ──────────────────────────────────────────────────── */}
      {data?.summary && !loading && (
        <>
          {/* Summary KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <KpiCard label="Total Impact Units™"  value={data.summary.totalIU.toFixed(4)}                                accent="#3b82f6" />
            <KpiCard label="Record Calcolati"      value={`${data.summary.computedRecords} / ${data.summary.totalRecords}`} accent="#10b981" />
            <KpiCard label="Record Bloccati"       value={String(data.summary.blockedRecords)}                             accent={data.summary.blockedRecords > 0 ? '#f59e0b' : '#475569'} />
            <KpiCard label="Media CQ"              value={data.summary.avgCQ.toFixed(3)}                                  accent="#8b5cf6" />
            <KpiCard label="Media EV"              value={data.summary.avgEV.toFixed(3)}                                  accent="#8b5cf6" />
            <KpiCard label="Cost per IU"           value="n/d"                                                            accent="#475569" />
          </div>

          {/* Methodology badges */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <InlineBadge label={data.summary.methodologyVersion} color="#3b82f6" />
            <InlineBadge label={data.summary.calibrationStatus}  color="#f59e0b" />
            <InlineBadge label="KORA_ADMIN only"                 color="#475569" />
          </div>

          {/* Pillar breakdown */}
          <SectionHeading>Distribuzione per Pillar</SectionHeading>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {PILLAR_ORDER.map((p) => {
              const iu  = data.summary!.pillarTotals[p];
              const pct = data.summary!.totalIU > 0 ? (iu / data.summary!.totalIU * 100).toFixed(1) : '0.0';
              return (
                <div key={p} style={{ background: '#1e293b', borderRadius: 8, padding: '0.75rem', borderTop: `3px solid ${PILLAR_COLOR[p]}` }}>
                  <div style={{ fontSize: '0.65rem', color: PILLAR_COLOR[p], fontWeight: 700, marginBottom: 4 }}>{p}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{iu.toFixed(2)}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{pct}%</div>
                </div>
              );
            })}
          </div>

          {/* Top contributing records */}
          <SectionHeading>Record con Impact Units™ ({computedRecords.length})</SectionHeading>
          {computedRecords.length === 0
            ? <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>Nessun record calcolato per questo periodo.</p>
            : (
              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#64748b' }}>
                      <Th align="left">Iniziativa</Th>
                      <Th align="left">Pillar</Th>
                      <Th align="right">IU Totale</Th>
                      <Th align="center">NM</Th>
                      <Th align="center">AGF</Th>
                      <Th align="center">Eligibility</Th>
                      <Th align="center"></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {computedRecords.map((r) => (
                      <Fragment key={r.id}>
                        <tr style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '0.5rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.rawName ?? <span style={{ color: '#475569' }}>—</span>}
                          </td>
                          <td style={{ padding: '0.5rem' }}>
                            {r.primaryPillar
                              ? <span style={{ color: PILLAR_COLOR[r.primaryPillar] ?? '#94a3b8', fontWeight: 700, fontSize: '0.7rem' }}>{r.primaryPillar}</span>
                              : <span style={{ color: '#475569' }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 700 }}>
                            {r.impactUnitsTotal.toFixed(4)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: '#94a3b8' }}>{r.nm.toFixed(3)}</td>
                          <td style={{ padding: '0.5rem', textAlign: 'center', color: r.agf < 0.5 ? '#f59e0b' : '#94a3b8', fontWeight: r.agf < 0.5 ? 700 : 400 }}>
                            {r.agf.toFixed(3)}
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <EligibilityTag status={r.eligibility} />
                          </td>
                          <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                            <button
                              onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                              style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 4, padding: '2px 10px', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                              {expandedId === r.id ? 'Chiudi' : 'Trace'}
                            </button>
                          </td>
                        </tr>
                        {expandedId === r.id && (
                          <tr>
                            <td colSpan={7} style={{ padding: '1rem', background: '#0f172a', borderBottom: '1px solid #334155' }}>
                              <FactorTracePanel record={r} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          {/* Blocked records */}
          {blockedRecords.length > 0 && (
            <>
              <SectionHeading>Record Bloccati / Esclusi ({blockedRecords.length})</SectionHeading>
              <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155', color: '#64748b' }}>
                      <Th align="left">Iniziativa</Th>
                      <Th align="left">Pillar</Th>
                      <Th align="left">Motivo esclusione</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedRecords.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #1e293b', opacity: 0.75 }}>
                        <td style={{ padding: '0.5rem', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.rawName ?? <span style={{ color: '#475569' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>
                          {r.primaryPillar
                            ? <span style={{ color: PILLAR_COLOR[r.primaryPillar] ?? '#94a3b8', fontSize: '0.7rem', fontWeight: 700 }}>{r.primaryPillar}</span>
                            : <span style={{ color: '#475569' }}>—</span>
                          }
                        </td>
                        <td style={{ padding: '0.5rem', color: '#f59e0b', fontStyle: 'italic', fontSize: '0.75rem' }}>
                          {r.exclusionReason ?? 'computed=false'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      {selectedTenantId && (
        <div style={{ marginTop: '1.5rem', padding: '0.75rem 1rem', background: '#0f172a', borderRadius: 8, borderLeft: '3px solid #334155' }}>
          <p style={{ fontSize: '0.7rem', color: '#475569', margin: 0 }}>
            Impact Units™ Explorer — KORA_ADMIN only · Nessun worker_pseudonym_id · Factor trace: codici metodologia, nessun PII · Autenticato: {userEmail}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{ background: '#1e293b', borderRadius: 8, padding: '0.875rem', borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f1f5f9' }}>{value}</div>
    </div>
  );
}

function InlineBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 4,
      background: `${color}22`, color, border: `1px solid ${color}55`,
      fontSize: '0.7rem', fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.75rem', marginTop: 0 }}>
      {children}
    </h2>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align: 'left' | 'right' | 'center' }) {
  return (
    <th style={{ padding: '0.5rem', textAlign: align, fontWeight: 600, fontSize: '0.7rem' }}>{children}</th>
  );
}

function EligibilityTag({ status }: { status: string | null }) {
  const colors: Record<string, string> = { eligible: '#10b981', limited: '#f59e0b', blocked: '#ef4444' };
  const c = status ? (colors[status] ?? '#64748b') : '#64748b';
  return <span style={{ color: c, fontSize: '0.7rem', fontWeight: 600 }}>{status ?? '—'}</span>;
}

function FactorTracePanel({ record }: { record: IURecord }) {
  const factors: { code: string; value: number }[] = [
    { code: 'NM', value: record.nm }, { code: 'BC', value: record.bc },
    { code: 'CQ', value: record.cq }, { code: 'EV', value: record.ev },
    { code: 'CF', value: record.cf }, { code: 'AGF', value: record.agf },
  ];

  return (
    <div>
      {/* Formula header */}
      <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: '0.75rem' }}>
        IU = NM × BC × CQ × EV × CF × AGF — Formula Trace
      </div>

      {/* Factor pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'flex-end' }}>
        {factors.map((f) => (
          <div key={f.code} style={{ background: '#1e293b', borderRadius: 6, padding: '0.375rem 0.75rem', textAlign: 'center', minWidth: 72 }}>
            <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: 2 }}>{FACTOR_FULL_LABEL[f.code] ?? f.code}</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: f.code === 'AGF' && f.value < 0.5 ? '#f59e0b' : '#e2e8f0' }}>
              {f.value.toFixed(4)}
            </div>
          </div>
        ))}
        {/* IU result */}
        <div style={{ background: '#1e293b', borderRadius: 6, padding: '0.375rem 0.75rem', textAlign: 'center', minWidth: 72, borderLeft: '2px solid #3b82f6' }}>
          <div style={{ fontSize: '0.6rem', color: '#64748b', marginBottom: 2 }}>IU Totale</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#3b82f6' }}>{record.impactUnitsTotal.toFixed(4)}</div>
        </div>
      </div>

      {/* Pillar IU breakdown */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {PILLAR_ORDER.map((p) => (
          <span key={p} style={{ fontSize: '0.7rem', color: PILLAR_COLOR[p], fontWeight: 600 }}>
            {p}: {record.pillarIU[p].toFixed(3)}
          </span>
        ))}
      </div>

      {/* Detailed factor trace from DB */}
      {record.factorTrace.length > 0 && (
        <div style={{ marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#475569', marginBottom: '0.25rem' }}>Factor trace dettagliato (DB):</div>
          {record.factorTrace.map((ft, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#94a3b8', marginBottom: 2 }}>
              <span style={{ fontWeight: 700, minWidth: 40, color: '#e2e8f0' }}>{ft.factor_code}</span>
              <span style={{ minWidth: 64, color: '#3b82f6' }}>{ft.value.toFixed(4)}</span>
              <span style={{ color: '#64748b' }}>{ft.label}</span>
              {ft.foundation_light_stub && (
                <span style={{ color: '#f59e0b', fontSize: '0.6rem' }}>[stub]</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Audit footer */}
      <div style={{ fontSize: '0.65rem', color: '#334155' }}>
        Batch: {record.sourceBatchId} · {record.methodologyVersion} · {record.calibrationStatus}
      </div>
    </div>
  );
}
