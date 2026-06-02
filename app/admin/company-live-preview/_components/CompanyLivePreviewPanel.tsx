'use client';

// app/admin/company-live-preview/_components/CompanyLivePreviewPanel.tsx
// B20 — Company Live Preview. Read-only. Board-safe. No PII. No individual records.
// KORA Admin opens this during pilot to share progress with client/prospect.
// No upload, no approve, no scoring, no delete.

import { useEffect, useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TenantOption { id: string; tenantCode: string; companyName: string }

interface LivePreviewData {
  ok: boolean;
  tenant:           { tenantCode: string; companyName: string };
  reportingPeriod:  string;
  pilotStatus:      string;
  workforce:        { totalWorkers: number | null };
  latestBatch:      { sourceName: string | null; status: string; rowCount: number; createdAt: string } | null;
  uef:              { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null;
  scoring: {
    koraIndex: number; confidenceScore: number; safeguard: string;
    activationRate: number | null; meaningfulActivationRate: number | null;
    calibrationStatus: string; methodologyVersionId: string; componentCount: number;
  } | null;
  pillarDistribution: { LIFE: number; GROWTH: number; CONNECTION: number; IMPACT: number; LEGACY: number } | null;
  bti: {
    totalBudget: number; deepActivation: number; economicRelief: number;
    blockedCompliance: number; activationDebt: number;
    btiScore: number; costPerIU: number | null;
  } | null;
  reportingAlignment: {
    totalMapped: number;
    areas: Array<{ code: string; label: string; count: number; maxStrength: string }>;
  } | null;
  reportingReadiness: {
    totalAreas: number; reportReady: number; usableWithCaveat: number;
    needsEvidence: number; notReady: number;
    topGaps: Array<{
      areaCode: string; areaLabel: string; readiness: string;
      missingEvidence: string[]; recommendedActions: string[]; ownerHint: string;
    }>;
  } | null;
  decisionPack: { status: string; createdAt: string; previewUrl: string; pdfUrl: string } | null;
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#4A90D9', GROWTH: '#6156F5', CONNECTION: '#8B72E0',
  IMPACT: '#059669', LEGACY: '#1E3A5F',
};
const PILLAR_LABELS: Record<string, string> = {
  LIFE: 'LIFE — Salute & Benessere', GROWTH: 'GROWTH — Crescita',
  CONNECTION: 'CONNECTION — Comunità', IMPACT: 'IMPACT — Territorio',
  LEGACY: 'LEGACY — Conoscenza',
};
const PILLAR_ORDER = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

const SF_COLOR: Record<string, string> = {
  CLEAR: '#059669', WARNING: '#d97706', FLAGGED: '#dc2626',
};
const SF_BG: Record<string, string> = {
  CLEAR: '#ecfdf5', WARNING: '#fffbeb', FLAGGED: '#fef2f2',
};
const PILOT_LABEL: Record<string, string> = {
  not_started:             'Non avviato',
  batch_pending:           'Batch caricato',
  review_ready:            'Review in attesa',
  needs_enrichment:        'Enrichment incompleto',
  ready_for_scoring:       'Pronto per scoring',
  scored:                  'Scored',
  decision_pack_ready:     'Decision Pack pronto',
  decision_pack_exported:  'Decision Pack esportato',
};
const PILOT_CLS: Record<string, string> = {
  not_started:            'bg-slate-100 text-slate-500 border-slate-200',
  batch_pending:          'bg-blue-50 text-blue-600 border-blue-200',
  review_ready:           'bg-amber-50 text-amber-700 border-amber-200',
  needs_enrichment:       'bg-orange-50 text-orange-700 border-orange-200',
  ready_for_scoring:      'bg-purple-50 text-purple-700 border-purple-200',
  scored:                 'bg-[#6156F5]/10 text-[#6156F5] border-[#6156F5]/30',
  decision_pack_ready:    'bg-green-50 text-green-700 border-green-200',
  decision_pack_exported: 'bg-green-100 text-green-800 border-green-300',
};
const READINESS_BADGE: Record<string, string> = {
  report_ready:      'bg-green-100 text-green-700 border-green-200',
  usable_with_caveat:'bg-amber-50 text-amber-700 border-amber-200',
  needs_evidence:    'bg-red-50 text-red-600 border-red-200',
  not_ready:         'bg-slate-100 text-slate-500 border-slate-200',
};
const READINESS_LABEL: Record<string, string> = {
  report_ready:      'Report Ready',
  usable_with_caveat:'Usable + Caveat',
  needs_evidence:    'Needs Evidence',
  not_ready:         'Not Ready',
};

function fmtEur(n: number) {
  return `€${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}
function fmtDate(iso: string) {
  try { return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}
function pct(n: number | null) {
  return n !== null ? `${Math.round(n * 100)}%` : '—';
}

// ── Card shells ───────────────────────────────────────────────────────────────

function Card({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-5" style={{ borderColor: accent ? '#c7c4f8' : '#eaebf4', background: accent ? '#f5f4ff' : '#fff' }}>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: '#9899b3' }}>{title}</p>
      {children}
    </div>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 mb-0.5">{label}</p>
      <p className="text-2xl font-bold leading-tight" style={{ color: color ?? '#06032B' }}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">{msg}</div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function CompanyLivePreviewPanel() {
  const [tenants,    setTenants]    = useState<TenantOption[]>([]);
  const [tenantCode, setTenantCode] = useState('');
  const [period,     setPeriod]     = useState('2026-Q1');
  const [data,       setData]       = useState<LivePreviewData | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  // Fetch tenant list
  useEffect(() => {
    fetch('/api/admin/tenants', { credentials: 'include' })
      .then(r => r.json())
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then((json: any) => { if (json?.tenants) setTenants(json.tenants); })
      .catch(() => {});
  }, []);

  // Auto-load live preview when tenant or period changes
  useEffect(() => {
    if (!tenantCode) return;
    let cancelled = false;

    const doFetch = async () => {
      // State resets live inside the async fn so the effect body stays side-effect-free
      setData(prev => (prev === null ? null : null));
      setError(null);
      setLoading(true);
      try {
        const r = await fetch(
          `/api/admin/company-live-preview?tenantCode=${encodeURIComponent(tenantCode)}&reportingPeriod=${encodeURIComponent(period)}`,
          { credentials: 'include' },
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const json = await r.json() as any;
        if (cancelled) return;
        if (!json.ok) { setError(json.error ?? 'Errore caricamento dati.'); }
        else          { setData(json as LivePreviewData); }
      } catch {
        if (!cancelled) setError('Errore di rete.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void doFetch();
    return () => { cancelled = true; };
  }, [tenantCode, period]);

  return (
    <div className="min-h-screen" style={{ background: '#f4f4f9' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded bg-[#6156F5]" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6156F5]">Company Live Preview</p>
              <p className="text-lg font-bold text-[#06032B] leading-tight">
                {data ? data.tenant.companyName : 'Seleziona azienda'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.15em] text-amber-700">
              Read-only · Live Preview
            </span>
            <Link
              href="/admin/company-workspace"
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              ← KORA Admin Workspace
            </Link>
          </div>
        </div>
      </div>

      {/* ── Selector bar ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white px-8 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Azienda</label>
            <select
              value={tenantCode}
              onChange={e => setTenantCode(e.target.value)}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6156F5]/30"
            >
              <option value="">— seleziona —</option>
              {tenants.map(t => (
                <option key={t.tenantCode} value={t.tenantCode}>{t.companyName} ({t.tenantCode})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Periodo</label>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#6156F5]/30"
            >
              {['2026-Q1','2026-Q2','2026-H1','2025-Q4'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          {loading && (
            <span className="text-[12px] text-slate-400 italic">Caricamento...</span>
          )}
          {error && (
            <span className="text-[12px] text-red-500">{error}</span>
          )}
        </div>
      </div>

      {/* ── No selection state ────────────────────────────────────────────── */}
      {!tenantCode && (
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-400 text-sm">Seleziona un&apos;azienda per visualizzare la live preview.</p>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {data && (
        <div className="mx-auto max-w-5xl px-8 py-8 space-y-8">

          {/* Synthetic data warning */}
          {data.tenant.tenantCode === 'OP-001' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-700">
              <strong>Dati sintetici / Demo.</strong> Questo tenant usa dati di test. Non è un cliente reale.
            </div>
          )}

          {/* ── Row 1: Pilot Status + KORA Index ──────────────────────────── */}
          <div className="grid grid-cols-3 gap-5">
            {/* Pilot Status */}
            <Card title="Stato Pilot">
              <div className="space-y-3">
                <span className={`inline-block rounded border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${PILOT_CLS[data.pilotStatus] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                  {PILOT_LABEL[data.pilotStatus] ?? data.pilotStatus}
                </span>
                <div className="space-y-1.5 text-[12px] text-slate-600">
                  {data.workforce.totalWorkers !== null && (
                    <p><span className="text-slate-400">Workforce: </span><strong>{data.workforce.totalWorkers}</strong> lavoratori</p>
                  )}
                  {data.latestBatch && (
                    <p><span className="text-slate-400">Ultimo batch: </span><strong>{data.latestBatch.rowCount}</strong> record · {data.latestBatch.status}</p>
                  )}
                  {data.uef && (
                    <p><span className="text-slate-400">UEF: </span><strong>{data.uef.approved}</strong> approvati su {data.uef.total}</p>
                  )}
                  {data.latestBatch && (
                    <p className="text-slate-400 text-[11px]">Caricato il {fmtDate(data.latestBatch.createdAt)}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* KORA Index */}
            <Card title="KORA Index v3" accent>
              {data.scoring ? (
                <div className="space-y-3">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold text-[#6156F5] leading-none">{Math.round(data.scoring.koraIndex * 10) / 10}</span>
                    <span className="text-xl text-slate-400">/100</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="rounded border px-2 py-0.5 text-[11px] font-bold" style={{ background: SF_BG[data.scoring.safeguard] ?? '#f3f4f6', color: SF_COLOR[data.scoring.safeguard] ?? '#6b7280', borderColor: SF_COLOR[data.scoring.safeguard] ?? '#d1d5db' }}>
                      {data.scoring.safeguard}
                    </span>
                    <span className="rounded border border-[#c7c4f8] bg-[#f5f4ff] px-2 py-0.5 text-[11px] font-bold text-[#6156F5]">
                      CS {Math.round(data.scoring.confidenceScore * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em]">{data.scoring.calibrationStatus}</p>
                </div>
              ) : (
                <EmptyState msg="Scoring non ancora eseguito" />
              )}
            </Card>

            {/* Activation — B24: reach semantics breakdown */}
            <Card title="Activation">
              {data.scoring?.activationRate !== undefined ? (() => {
                const ar  = data.scoring.activationRate  ?? 0;
                const mar = data.scoring.meaningfulActivationRate ?? 0;
                const gapPp = Math.round((ar - mar) * 100);
                const gapWarn = gapPp > 20;
                return (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-0.5">Meaningful AR <span className="text-[#6156F5]">· SEGNALE PRIMARIO</span></p>
                      <p className="text-3xl font-bold text-[#6156F5] leading-none">{pct(mar)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.14em] uppercase text-slate-400 mb-0.5">Activation Rate · reach complessivo</p>
                      <p className="text-2xl font-bold text-[#06032B] leading-none">{pct(ar)}</p>
                    </div>
                    {gapPp > 0 && (
                      <div className={`rounded px-2.5 py-2 text-[10px] leading-relaxed ${gapWarn ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-slate-50 border border-slate-100 text-slate-500'}`}>
                        {gapWarn
                          ? `⚠ Gap AR→MAR: +${gapPp}pp — differenza attribuibile principalmente a benefit economici ad ampia copertura (voucher, fringe benefit). MAR è il segnale rilevante.`
                          : `Gap AR→MAR: +${gapPp}pp (economic relief reach)`}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
                      Safeguard CLEAR: AR ≥ 40% e MAR ≥ 30%. Reach ≠ depth.
                    </p>
                  </div>
                );
              })() : (
                <EmptyState msg="Nessun dato di attivazione" />
              )}
            </Card>
          </div>

          {/* ── Row 2: Pillar Balance ──────────────────────────────────────── */}
          <Card title="Pillar Balance — Distribuzione Attivazione">
            {data.pillarDistribution ? (() => {
              const total = PILLAR_ORDER.reduce((s, k) => s + (data.pillarDistribution![k] ?? 0), 0);
              return (
                <div className="space-y-3">
                  {PILLAR_ORDER.map(k => {
                    const v = data.pillarDistribution![k] ?? 0;
                    const p = total > 0 ? Math.round((v / total) * 100) : 0;
                    const color = PILLAR_COLORS[k];
                    return (
                      <div key={k}>
                        <div className="flex justify-between mb-1">
                          <span className="text-[12px] font-semibold text-[#06032B]">{PILLAR_LABELS[k]}</span>
                          <span className="text-[13px] font-bold" style={{ color }}>{p}%</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-100">
                          <div className="h-2.5 rounded-full" style={{ width: `${p}%`, background: color }} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{v} eventi classificati</p>
                      </div>
                    );
                  })}
                  <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                    Distribuzione aggregata · nessun dato individuale · N≥10 threshold applicata
                  </p>
                </div>
              );
            })() : (
              <EmptyState msg="Pillar distribution non disponibile. Richiede scoring completato." />
            )}
          </Card>

          {/* ── Row 3: Financial Governance ───────────────────────────────── */}
          <Card title="Financial Governance — Budget-to-Human-Impact">
            {data.bti ? (() => {
              const { totalBudget, deepActivation, economicRelief, blockedCompliance, activationDebt, btiScore } = data.bti;
              const deepPct    = totalBudget > 0 ? Math.round((deepActivation / totalBudget) * 100) : 0;
              const reliefPct  = totalBudget > 0 ? Math.round((economicRelief / totalBudget) * 100) : 0;
              const blockedPct = totalBudget > 0 ? Math.round((blockedCompliance / totalBudget) * 100) : 0;
              return (
                <div>
                  <div className="grid grid-cols-4 gap-4 mb-5">
                    <Stat label="Budget People / Welfare" value={fmtEur(totalBudget)} />
                    <Stat label="BTI Score" value={btiScore > 0 ? `${Math.round(btiScore)}/100` : '—'} color="#6156F5" />
                    <Stat label="Activation Debt (stima)" value={activationDebt > 0 ? fmtEur(activationDebt) : '—'} color="#d97706" />
                    <Stat label="Costo/Impact Unit" value={data.bti.costPerIU !== null ? fmtEur(data.bti.costPerIU) : '—'} />
                  </div>
                  {totalBudget > 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.12em] mb-2">Classificazione budget</p>
                      <div className="h-4 rounded flex overflow-hidden">
                        <div style={{ width: `${deepPct}%`, background: '#06032B' }} title={`Deep ${deepPct}%`} />
                        <div style={{ width: `${reliefPct}%`, background: '#c7c8dc' }} title={`Relief ${reliefPct}%`} />
                        <div style={{ width: `${blockedPct}%`, background: '#fde68a' }} title={`Blocked ${blockedPct}%`} />
                        <div style={{ flex: 1, background: '#eaebf4' }} />
                      </div>
                      <div className="flex gap-5 mt-2 text-[11px] text-slate-500">
                        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#06032B' }} />Deep {deepPct}%</span>
                        <span><span className="inline-block w-2 h-2 rounded-full mr-1 border border-slate-300" style={{ background: '#c7c8dc' }} />Relief {reliefPct}%</span>
                        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: '#fde68a' }} />Blocked {blockedPct}%</span>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
                    BTI è indicatore informativo — non dimostra causalità, non certifica ROI. Correlazione ≠ causalità.
                  </p>
                </div>
              );
            })() : (
              <EmptyState msg="Financial Governance non disponibile. Richiede Decision Pack con BTI." />
            )}
          </Card>

          {/* ── Row 4: Reporting Readiness (B19) ──────────────────────────── */}
          <Card title="Reporting Readiness — Evidence Gap Summary (B19)">
            {data.reportingReadiness ? (() => {
              const { reportReady, usableWithCaveat, needsEvidence, notReady, topGaps, totalAreas } = data.reportingReadiness;
              return (
                <div>
                  {/* Counters */}
                  <div className="grid grid-cols-4 gap-3 mb-5">
                    {[
                      { label: 'Report Ready',     value: reportReady,      color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
                      { label: 'Usable + Caveat',  value: usableWithCaveat, color: '#854d0e', bg: '#fffbeb', border: '#fde68a' },
                      { label: 'Needs Evidence',   value: needsEvidence,    color: '#991b1b', bg: '#fef2f2', border: '#fca5a5' },
                      { label: 'Not Ready',        value: notReady,         color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
                    ].map(c => (
                      <div key={c.label} className="rounded-lg border text-center p-3" style={{ background: c.bg, borderColor: c.border }}>
                        <p className="text-2xl font-bold leading-none" style={{ color: c.color }}>{c.value}</p>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] mt-1.5" style={{ color: c.color }}>{c.label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">{totalAreas} aree ESRS mappate · evidence-driven, non auto-compliance</p>

                  {/* Top evidence gaps */}
                  {topGaps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Top Evidence Gaps — Azioni Prioritarie</p>
                      {topGaps.map(g => (
                        <div key={g.areaCode} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <span className="text-[12px] font-semibold text-[#06032B]">{g.areaLabel}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${READINESS_BADGE[g.readiness] ?? 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                                {READINESS_LABEL[g.readiness] ?? g.readiness}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">{g.ownerHint}</span>
                            </div>
                          </div>
                          {g.missingEvidence.length > 0 && (
                            <p className="text-[11px] text-slate-600 mb-1">
                              <span className="font-semibold">Mancante: </span>
                              {g.missingEvidence.join(' · ')}
                            </p>
                          )}
                          {g.recommendedActions.length > 0 && (
                            <p className="text-[11px] text-slate-500">
                              <span className="font-semibold">Azione: </span>
                              {g.recommendedActions[0]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 rounded border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-400 leading-relaxed">
                    <strong className="text-slate-500">Nota:</strong> Readiness ≠ compliance CSRD/ESRS. Report Ready = evidenza sufficiente per supportare rendicontazione. Non costituisce assurance o certificazione.
                  </div>
                </div>
              );
            })() : (
              <EmptyState msg="Reporting Readiness non disponibile. Richiede UEF approvati processati con B19 interpreter." />
            )}
          </Card>

          {/* ── Row 5: Reporting Alignment (B18) ──────────────────────────── */}
          {data.reportingAlignment && (
            <Card title="Reporting Alignment — Aree ESRS (B18)">
              <p className="text-[12px] text-slate-500 mb-3">
                {data.reportingAlignment.totalMapped} iniziative mappate su {data.reportingAlignment.areas.length} aree ESRS possibili.
                Mapping indicativo — non certifica compliance.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {data.reportingAlignment.areas.slice(0, 6).map(a => (
                  <div key={a.code} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-2">
                    <div>
                      <p className="text-[12px] font-semibold text-[#06032B]">{a.label}</p>
                      <p className="text-[10px] text-slate-400">{a.code} · {a.count} iniziative</p>
                    </div>
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold capitalize ${
                      a.maxStrength === 'strong' ? 'bg-green-100 text-green-700 border-green-200' :
                      a.maxStrength === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {a.maxStrength}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-slate-400">
                KORA non certifica compliance CSRD/ESRS. Queste mappature indicano possibile supporto alla rendicontazione solo.
              </p>
            </Card>
          )}

          {/* ── Row 6: Decision Pack ──────────────────────────────────────── */}
          <Card title="Decision Pack">
            {data.decisionPack ? (
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <span className={`inline-block rounded border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    data.decisionPack.status === 'exported' ? 'bg-green-100 text-green-700 border-green-200' :
                    data.decisionPack.status === 'ready'    ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                              'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {data.decisionPack.status.toUpperCase()}
                  </span>
                  <p className="text-[12px] text-slate-500">Creato il {fmtDate(data.decisionPack.createdAt)}</p>
                  <p className="text-[11px] text-slate-400">
                    Include KORA Index, Pillar Balance, BTI, Reporting Alignment, Evidence Gaps, Methodology & Provenance.
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <a
                    href={data.decisionPack.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-[#6156F5]/30 bg-[#6156F5]/10 px-4 py-2 text-[12px] font-semibold text-[#6156F5] hover:bg-[#6156F5]/20 transition-colors"
                  >
                    Apri Preview
                  </a>
                  <a
                    href={data.decisionPack.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-slate-200 bg-white px-4 py-2 text-[12px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Scarica PDF
                  </a>
                </div>
              </div>
            ) : (
              <EmptyState msg="Decision Pack non ancora disponibile. Completa scoring e genera il pack da KORA Admin Workspace." />
            )}
          </Card>

          {/* ── Row 7: Privacy & Methodology Boundary ─────────────────────── */}
          <div className="rounded-xl border border-[#c7c4f8] bg-[#f5f4ff] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6156F5] mb-3">Privacy & Methodology Boundary</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[12px] text-slate-600">
              <p>🔒 <strong>Organization-Level Only</strong> — nessun worker identificabile</p>
              <p>🛡️ <strong>N≥10 Threshold</strong> — segmenti sotto soglia soppressi</p>
              <p>📊 <strong>Confidence Score Esterno</strong> — non influenza KORA Index</p>
              <p>⚗️ <strong>Pre-Empirical Calibration</strong> — pesi v0.1 provvisori</p>
              <p>🚫 <strong>No Worker Surveillance</strong> — PIB individuale non visibile</p>
              <p>📋 <strong>Read-Only Preview</strong> — nessuna azione operativa da questa vista</p>
            </div>
            <div className="mt-4 rounded border border-[#c7c4f8] bg-white px-3 py-2 text-[11px] text-slate-500 leading-relaxed">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili.
              Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
              Decision Pack supporta discussioni board/HR/ESG — non è certificazione.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
