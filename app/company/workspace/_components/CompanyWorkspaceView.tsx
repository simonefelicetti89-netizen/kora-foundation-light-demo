'use client';

// app/company/workspace/_components/CompanyWorkspaceView.tsx
// B36 PART 4 — Company-facing workspace — board-grade, clean, read-only.
// Rendered after session auth. No demo-state. No admin controls.
// Covers: KORA Index summary, Reporting Readiness, Evidence Archive, Decision Pack, Methodology & Privacy.
// B83-B: Worker Space section added (WorkerAdoptionPanel — aggregate-safe, no individual data).

import { useState, useEffect } from 'react';
import { DataSubmissionSection } from './DataSubmissionSection';
import type { KoraIndexHistoryResponse } from '@/app/api/company/kora-index/history/route';

// ── Types ───────────────────────────────────────────────────────────────────────

type PillarAggregateClear = {
  pillar: string;
  published_initiatives: number;
  suppressed: false;
  total_participations: number;
};

type PillarAggregateSuppressed = {
  pillar: string;
  published_initiatives: number;
  suppressed: true;
  suppression_reason: 'privacy_threshold';
  suppression_threshold: number;
};

type PillarAggregate = PillarAggregateClear | PillarAggregateSuppressed;

type CountOrSuppressed =
  | { suppressed: false; value: number }
  | { suppressed: true; suppression_reason: 'privacy_threshold'; suppression_threshold: number };

interface WorkerInitiativeAggregateData {
  ok: boolean;
  aggregate: {
    total_published_initiatives: number;
    participation_summary: CountOrSuppressed;
    pillar_breakdown: PillarAggregate[];
    privacy_note: string;
  };
}

interface WorkspaceData {
  ok: boolean;
  role: string;
  tenant: {
    tenantCode: string;
    companyName: string;
    methodologyVersion: string;
    calibrationStatus: string;
    isActive: boolean;
  };
  workforceBaseline: { totalWorkers: number; reportingPeriod: string } | null;
  koraIndex: {
    koraIndexValue: number;
    confidenceScore: number;
    safeguardStatus: string;
    activationRate: number | null;
    meaningfulActivationRate: number | null;
    reportingPeriod: string;
    methodologyVersion: string;
    calibrationStatus: string;
    displayLabels: { methodology: string; calibration: string; disclaimer: string };
  } | null;
  reportingReadiness: {
    hasWorkforceBaseline: boolean;
    hasEvidenceBatches: boolean;
    batchCount: number;
    hasScoring: boolean;
    hasDecisionPack: boolean;
    decisionPackStatus: string;
    readinessLevel: string;
    caveat: string;
  };
  decisionPack: { status: string; reportingPeriod: string; versionId: string; createdAt: string; previewUrl: string | null } | null;
  methodologyDisclaimer: {
    kora_measures: string;
    privacy_guarantee: string;
    no_compliance: string;
    data_status: string;
  };
}

interface Initiative {
  id: string;
  recordIdFull: string;
  batchIdFull: string;
  safeName: string;
  pillar: string | null;
  actionFamily: string | null;
  evidenceLevel: string | null;
  reviewStatus: string;
  eligibility: string;
}

interface ArchiveData {
  ok: boolean;
  tenant: { companyName: string; methodologyVersion: string; calibrationStatus: string };
  batches: Array<{ batchId: string; batchStatus: string; rowCount: number; attachmentCount: number; createdAt: string }>;
  initiatives: Initiative[];
  summary: { total: number; withEvidence: number; pendingReview: number; approved: number };
  privacyNote: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]',
  WARNING: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.10)] text-[#8A5A00]',
  FLAGGED: 'border-[rgba(158,59,47,0.25)] bg-[rgba(158,59,47,0.08)] text-[#9E3B2F]',
};

const SAFEGUARD_LABEL: Record<string, string> = {
  CLEAR:   'Activation Safeguard: CLEAR',
  WARNING: 'Activation Safeguard: WARNING',
  FLAGGED: 'Activation Safeguard: FLAGGED',
};

const REVIEW_CLS: Record<string, string> = {
  approved:             'text-[#2F7D55]',
  approved_for_scoring: 'text-[#2F7D55]',
  pending:              'text-[#D99A2B]',
  pending_review:       'text-[#D99A2B]',
  rejected:             'text-[#9E3B2F]',
};

const ELIGIBILITY_LABEL: Record<string, string> = {
  eligible:  'Idoneo',
  limited:   'Sollievo economico',
  blocked:   'Bloccato',
  review_required: 'In revisione',
};

const READINESS_LEVEL_LABEL: Record<string, string> = {
  not_started:       'Non avviato',
  evidence_collected:'Evidenze raccolte',
  scored:            'Pipeline completata',
  decision_pack_ready: 'Decision Pack disponibile',
};

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>{label}</span>;
}

function ts(s: string) {
  try { return new Date(s).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] overflow-hidden scroll-mt-4">
      <div className="px-5 py-3.5 border-b border-[rgba(6,3,43,0.05)]">
        <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-widest">{title}</p>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────────

interface Props {
  userEmail: string;
  userRole: string;
}

export function CompanyWorkspaceView({ userEmail, userRole }: Props) {
  const [workspace, setWorkspace]   = useState<WorkspaceData | null>(null);
  const [archive, setArchive]       = useState<ArchiveData | null>(null);
  const [aggData, setAggData]       = useState<WorkerInitiativeAggregateData | null>(null);
  const [history, setHistory]       = useState<KoraIndexHistoryResponse | null>(null);
  const [wsLoading, setWsLoading]   = useState(true);
  const [archLoading, setArchLoading] = useState(true);
  const [aggLoading, setAggLoading] = useState(true);
  const [wsError, setWsError]       = useState<string | null>(null);
  const [archError, setArchError]   = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/company/workspace', { credentials: 'include' })
      .then(r => r.json())
      .then((d: WorkspaceData) => {
        if (d.ok) setWorkspace(d);
        else setWsError('Workspace non disponibile.');
      })
      .catch(() => setWsError('Errore di rete.'))
      .finally(() => setWsLoading(false));

    fetch('/api/company/evidence-archive', { credentials: 'include' })
      .then(r => r.json())
      .then((d: ArchiveData) => {
        if (d.ok) setArchive(d);
        else setArchError('Archivio non disponibile.');
      })
      .catch(() => setArchError('Errore di rete.'))
      .finally(() => setArchLoading(false));

    fetch('/api/company/workers/activation-aggregate', { credentials: 'include' })
      .then(r => r.json())
      .then((d: WorkerInitiativeAggregateData) => {
        if (d.ok) setAggData(d);
      })
      .catch(() => { /* non-critical — silently skip */ })
      .finally(() => setAggLoading(false));

    // P0-2: KORA Index period history (non-critical — silently skip on error)
    fetch('/api/company/kora-index/history', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then((d: KoraIndexHistoryResponse | null) => {
        if (d?.ok) setHistory(d);
      })
      .catch(() => { /* non-critical */ });
  }, []);

  const w = workspace;
  const ki = w?.koraIndex ?? null;
  const rr = w?.reportingReadiness ?? null;
  const dp = w?.decisionPack ?? null;
  // B143: COMPANY_VIEWER rimosso — meccanismo read-only conservato per riuso futuro (ruolo sola-lettura).
  // isViewer è sempre false; i branch isViewer? restano nel JSX ma non si attivano.
  const isViewer = false;

  return (
    <div className="max-w-3xl mx-auto py-6 px-3 space-y-5" data-testid="company-workspace-page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="rounded-xl bg-[#06032B] px-6 py-5 flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#C76F3D] mb-1">
            KORA · Workspace Aziendale
          </p>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {wsLoading ? '…' : (w?.tenant.companyName ?? 'La tua organizzazione')}
          </h1>
          {!wsLoading && w?.tenant.tenantCode && (
            <p className="text-xs text-white/35 mt-0.5 font-mono">{w.tenant.tenantCode}</p>
          )}
          <p className="text-sm text-white/45 mt-1">
            Vista aggregata · nessun dato individuale
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <span className="rounded border border-[#C76F3D]/60 bg-[#C76F3D]/15 px-2 py-0.5 text-xs font-semibold text-[#FFFFFF]">{userRole}</span>
          <span className="text-xs text-white/25 font-mono">{userEmail}</span>
        </div>
      </div>

      {/* Task E — plain-language purpose statement */}
      {!wsLoading && w && (
        <p className="text-xs text-[rgba(6,3,43,0.62)] leading-relaxed">
          Questa pagina mostra il quadro aggregato e privacy-safe della tua azienda su KORA: nessun dato individuale
          dei lavoratori è visibile qui. Il KORA Index e il Decision Pack riflettono la pipeline dati più recente;
          la calibrazione della metodologia resta pre-empirica finché non indicato diversamente.
        </p>
      )}

      {/* ── Loading / error ─────────────────────────────────────────────────── */}
      {wsLoading && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-4 py-6 text-xs text-[rgba(6,3,43,0.40)] text-center">
          Caricamento workspace…
        </div>
      )}
      {wsError && (
        <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] px-4 py-3 text-xs text-[#9E3B2F]">
          ⚠ {wsError}
        </div>
      )}

      {/* ── Calibration / status bar ─────────────────────────────────────────── */}
      {w && (
        <div className="rounded-lg border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] px-4 py-2.5 text-[10.5px] text-amber-700 font-medium">
          {w.tenant.calibrationStatus.replace(/_/g, ' ')} · {w.tenant.methodologyVersion} · Dati aggregati
        </div>
      )}

      {/* ── Welcome banner — new company with no data yet ─────────────────────── */}
      {w && !ki && rr?.readinessLevel === 'not_started' && (
        <div className="rounded-xl border border-[rgba(43,92,230,0.18)] bg-[rgba(43,92,230,0.06)] px-5 py-4 space-y-1.5">
          <p className="text-sm font-semibold text-[#1B2A4A]">
            La workspace aziendale è attiva
          </p>
          <p className="text-xs text-[rgba(30,74,138,0.85)] leading-relaxed">
            I dati KORA appariranno dopo il completamento dell&apos;onboarding dati e della review metodologica da parte di KORA Admin.
            Contatta il tuo referente KORA per avviare il processo di data intake.
          </p>
          <p className="text-[9.5px] text-[rgba(30,74,138,0.55)] pt-0.5">
            Workspace attivo · Nessun dato ancora disponibile · Nessun demo fallback
          </p>
        </div>
      )}

      {/* ── KORA Index Summary ───────────────────────────────────────────────── */}
      {w && (
        <Section title="KORA Index" id="kora-index">
          {ki ? (
            <div className="space-y-4">
              {/* Hero row */}
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">KORA Index</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-[#06032B] tracking-tight">{ki.koraIndexValue}</span>
                    <span className="text-sm text-[rgba(6,3,43,0.40)]">/100</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Confidence Score</p>
                  <span className="text-2xl font-bold text-[rgba(6,3,43,0.78)]">{Math.round(ki.confidenceScore * 100)}%</span>
                  <p className="text-[9px] text-[rgba(6,3,43,0.40)] mt-0.5">Esterno al KORA Index</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Activation Safeguard</p>
                  <Badge label={SAFEGUARD_LABEL[ki.safeguardStatus] ?? ki.safeguardStatus} cls={SAFEGUARD_CLS[ki.safeguardStatus] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'} />
                </div>
                {ki.activationRate !== null && (
                  <div>
                    <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">Activation Rate</p>
                    <span className="text-lg font-bold text-[rgba(6,3,43,0.78)]">{Math.round(ki.activationRate * 100)}%</span>
                  </div>
                )}
              </div>

              {/* Macroblock summary (text-only, no components detail) */}
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                {[
                  { label: 'Activation Reach (25%)', note: 'AR + MAR' },
                  { label: 'Activation Quality (30%)', note: 'EVQ + INT + CONT' },
                  { label: 'Distribution & Equity (25%)', note: 'EQW + EQS + PC + PB' },
                  { label: 'Budget-to-Human-Impact (20%)', note: 'BTI Engine' },
                ].map(({ label, note }) => (
                  <div key={label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
                    <p className="font-semibold text-[rgba(6,3,43,0.78)]">{label}</p>
                    <p className="text-[rgba(6,3,43,0.40)] text-[9px] mt-0.5">{note}</p>
                  </div>
                ))}
              </div>

              {/* Disclaimer — non-suppressible per doc 21b */}
              <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed pt-1 border-t border-[rgba(6,3,43,0.05)]">
                {ki.displayLabels.disclaimer}
              </p>
            </div>
          ) : (
            <div className="text-xs text-[rgba(6,3,43,0.52)] py-4 text-center space-y-1">
              <p className="font-semibold text-[rgba(6,3,43,0.78)]">KORA Index non ancora disponibile</p>
              <p>La pipeline dati non è ancora stata completata per questa azienda. Il punteggio apparirà qui non appena l&apos;operatore KORA completerà data intake, review e scoring.</p>
            </div>
          )}
        </Section>
      )}

      {/* ── KORA Index Storico (P0-2: period history) ───────────────────────────── */}
      {w && (
        <Section title="Storico KORA Index" id="kora-index-history">
          {history === null ? (
            <div className="text-xs text-[rgba(6,3,43,0.40)] py-2 text-center">
              Caricamento storico…
            </div>
          ) : history.period_count === 0 ? (
            <div data-testid="kora-history-no-data" className="text-xs text-[rgba(6,3,43,0.52)] py-2 space-y-1">
              <p className="font-semibold text-[rgba(6,3,43,0.72)]">Nessuno storico di punteggio ancora disponibile</p>
              <p>Il primo KORA Index sarà registrato al termine del prossimo scoring run.</p>
            </div>
          ) : history.period_count === 1 ? (
            <div data-testid="kora-history-first-period" className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-center">
                  <p className="text-[9px] text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-0.5">{history.periods[0].reporting_period}</p>
                  <p className="text-xl font-bold text-[#06032B]">{history.periods[0].kora_index_value}</p>
                  <p className="text-[9px] text-[rgba(6,3,43,0.35)]">/100</p>
                </div>
                <p className="text-xs text-[rgba(6,3,43,0.55)] leading-relaxed">
                  Primo periodo misurato. Il trend comparativo apparirà dopo il prossimo scoring run.
                </p>
              </div>
              <p className="text-[9px] text-[rgba(6,3,43,0.35)] font-mono pt-1">
                KORA Index v1.0 · pre_empirical_calibration · Dati aggregati
              </p>
            </div>
          ) : (
            <div data-testid="kora-history-trend" className="space-y-3">
              <div className="overflow-x-auto">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="text-left border-b border-[rgba(6,3,43,0.07)]">
                      <th className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Periodo</th>
                      <th className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">KORA Index</th>
                      <th className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Δ vs precedente</th>
                      <th className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Safeguard</th>
                      <th className="pb-1.5 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">CS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.periods.map((p) => (
                      <tr key={p.reporting_period} className={`border-b border-[rgba(6,3,43,0.04)] ${p.is_current ? 'bg-[rgba(47,125,85,0.04)]' : ''}`}>
                        <td className="py-1.5 pr-4 text-[rgba(6,3,43,0.70)] font-mono">
                          {p.reporting_period}
                          {p.is_current && <span className="ml-1.5 text-[8px] font-semibold text-[#2F7D55] uppercase tracking-wide">corrente</span>}
                        </td>
                        <td className="py-1.5 pr-4 font-bold text-[#06032B]">{p.kora_index_value}</td>
                        <td className="py-1.5 pr-4">
                          {p.delta === null ? (
                            <span className="text-[rgba(6,3,43,0.35)]">—</span>
                          ) : (
                            <span className={p.delta >= 0 ? 'text-[#2F7D55] font-semibold' : 'text-[#9E3B2F] font-semibold'}>
                              {p.delta >= 0 ? '+' : ''}{p.delta}
                            </span>
                          )}
                        </td>
                        <td className="py-1.5 pr-4">
                          {p.safeguard_status ? (
                            <Badge
                              label={p.safeguard_status}
                              cls={SAFEGUARD_CLS[p.safeguard_status] ?? 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
                            />
                          ) : <span className="text-[rgba(6,3,43,0.35)]">—</span>}
                        </td>
                        <td className="py-1.5 text-[rgba(6,3,43,0.55)]">
                          {p.confidence_score !== null ? `${p.confidence_score}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[9px] text-[rgba(6,3,43,0.35)] font-mono">
                KORA Index v1.0 · pre_empirical_calibration · Dati aggregati · Nessun dato individuale
              </p>
            </div>
          )}
        </Section>
      )}

      {/* ── Iniziative Worker (aggregate-only, N≥10 privacy threshold) ─────────── */}
      {!aggLoading && aggData && aggData.aggregate.total_published_initiatives > 0 && (
        <Section title="Iniziative Worker — Aggregato" id="worker-initiatives">
          <div className="space-y-3">
            <div className="flex gap-4 text-[10.5px] text-[rgba(6,3,43,0.52)]">
              <span>
                <strong className="text-[rgba(6,3,43,0.90)]">{aggData.aggregate.total_published_initiatives}</strong> iniziative pubblicate
              </span>
              {!aggData.aggregate.participation_summary.suppressed && (
                <span>
                  <strong className="text-[#2F7D55]">{aggData.aggregate.participation_summary.value}</strong> adesioni aggregate
                </span>
              )}
              {aggData.aggregate.participation_summary.suppressed && (
                <span className="text-amber-600">
                  Adesioni aggregate non disponibili (N&lt;{aggData.aggregate.participation_summary.suppression_threshold})
                </span>
              )}
            </div>

            {aggData.aggregate.pillar_breakdown.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {aggData.aggregate.pillar_breakdown.map(pb => (
                  <div key={pb.pillar} className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-3 py-2 text-[10.5px]">
                    <p className="font-semibold text-[rgba(6,3,43,0.70)] uppercase text-[9px] tracking-wide mb-0.5">{pb.pillar}</p>
                    <p className="text-[rgba(6,3,43,0.52)]">
                      {pb.published_initiatives} iniziative ·{' '}
                      {pb.suppressed
                        ? <span className="text-amber-600">dati aggregati non disponibili (N&lt;{pb.suppression_threshold})</span>
                        : <span>{pb.total_participations} adesioni</span>
                      }
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
              {aggData.aggregate.privacy_note}
            </p>
          </div>
        </Section>
      )}

      {/* ── Reporting Readiness ──────────────────────────────────────────────── */}
      {rr && (
        <Section title="Reporting Readiness" id="reporting-readiness">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={READINESS_LEVEL_LABEL[rr.readinessLevel] ?? rr.readinessLevel}
                cls={rr.hasScoring ? 'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]' : rr.hasEvidenceBatches ? 'border-[rgba(43,92,230,0.18)] bg-[rgba(43,92,230,0.06)] text-[#1B2A4A]' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
              />
              <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">{rr.batchCount} batch evidenza</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                ['Baseline workforce', rr.hasWorkforceBaseline],
                ['Evidenze caricate', rr.hasEvidenceBatches],
                ['Pipeline completata', rr.hasScoring],
                ['Decision Pack', rr.hasDecisionPack],
              ].map(([label, done]) => (
                <div key={String(label)} className="flex items-center gap-2">
                  <span className={done ? 'text-\[#2F7D55\]' : 'text-[rgba(6,3,43,0.28)]'}>
                    {done ? '✓' : '○'}
                  </span>
                  <span className={done ? 'text-[rgba(6,3,43,0.78)]' : 'text-[rgba(6,3,43,0.40)]'}>{String(label)}</span>
                </div>
              ))}
            </div>

            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed pt-2 border-t border-[rgba(6,3,43,0.05)]">
              {rr.caveat}
            </p>
          </div>
        </Section>
      )}

      {/* ── Evidence Archive ─────────────────────────────────────────────────── */}
      <Section title="Archivio Evidenze — Sola lettura" id="evidence-archive">
        {archLoading && (
          <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-4">Caricamento archivio…</p>
        )}
        {archError && (
          <p className="text-xs text-[#9E3B2F]">{archError}</p>
        )}
        {archive && !archLoading && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex gap-4 text-[10.5px] text-[rgba(6,3,43,0.52)]">
              <span><strong className="text-[rgba(6,3,43,0.90)]">{archive.summary.total}</strong> iniziative</span>
              <span><strong className="text-[#2F7D55]">{archive.summary.approved}</strong> approvate</span>
              <span><strong className="text-amber-600">{archive.summary.pendingReview}</strong> in revisione</span>
            </div>

            {/* Privacy notice */}
            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
              {archive.privacyNote}
            </p>

            {/* Initiatives table */}
            {archive.initiatives.length === 0 ? (
              <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-4">Nessuna evidenza disponibile.</p>
            ) : (
              <div className="overflow-hidden rounded border border-[rgba(6,3,43,0.08)]">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                      {['Iniziativa', 'Pilastro', 'Evidenza', 'Stato'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide text-[9px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {archive.initiatives.slice(0, 50).map((init, i) => (
                      <tr key={init.recordIdFull ?? i} className="border-b border-[rgba(6,3,43,0.04)] hover:bg-[rgba(6,3,43,0.03)]/50">
                        <td className="px-3 py-2 text-[rgba(6,3,43,0.78)] max-w-[200px] truncate">{init.safeName}</td>
                        <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{init.pillar ?? '—'}</td>
                        <td className="px-3 py-2 text-[rgba(6,3,43,0.52)]">{init.evidenceLevel ?? '—'}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-0.5">
                            <span className={REVIEW_CLS[init.reviewStatus] ?? 'text-[rgba(6,3,43,0.40)]'}>
                              {init.reviewStatus.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[9px] text-[rgba(6,3,43,0.40)]">
                              {ELIGIBILITY_LABEL[init.eligibility] ?? init.eligibility}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {archive.initiatives.length > 50 && (
                  <p className="px-3 py-2 text-[9.5px] text-[rgba(6,3,43,0.40)] border-t border-[rgba(6,3,43,0.05)]">
                    Mostrate 50 di {archive.initiatives.length} iniziative.
                  </p>
                )}
              </div>
            )}

            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] leading-relaxed">
              Sola lettura · Nessuna azione disponibile · Il ciclo di vita allegati è gestito dall&apos;operatore KORA Admin.
            </p>
          </div>
        )}
      </Section>

      {/* ── Decision Pack ────────────────────────────────────────────────────── */}
      <Section title="Decision Pack" id="decision-pack">
        {dp ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                label={dp.status.replace(/_/g, ' ')}
                cls={dp.status === 'ready' || dp.status === 'exported'
                  ? 'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-[#2F7D55]'
                  : 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] text-amber-700'}
              />
              <span className="text-[10.5px] text-[rgba(6,3,43,0.52)]">Generato: {ts(dp.createdAt)}</span>
              {dp.reportingPeriod && (
                <span className="text-[10.5px] text-[rgba(6,3,43,0.40)] font-mono">{dp.reportingPeriod}</span>
              )}
            </div>

            {dp.previewUrl && (dp.status === 'ready' || dp.status === 'exported' || dp.status === 'draft') && (
              <a
                href={dp.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.15)] bg-[#06032B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#06032B]/90 transition-colors"
              >
                Apri Decision Pack →
              </a>
            )}

            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)]">
              Il Decision Pack riflette il KORA Index di questo periodo con calibrazione pre-empirica. Non costituisce certificazione ESG, audit o giudizio di compliance.
            </p>
          </div>
        ) : (
          <div className="text-xs text-[rgba(6,3,43,0.52)] py-2 space-y-1">
            <p className="font-semibold text-[rgba(6,3,43,0.70)]">Nessun Decision Pack disponibile</p>
            <p>La pipeline dati non è ancora stata completata per questa azienda. Il documento apparirà qui non appena il processo di scoring sarà completato dall&apos;operatore KORA.</p>
          </div>
        )}
      </Section>

      {/* ── Data Submission ──────────────────────────────────────────────────── */}
      <Section title="Data Submission" id="data-submission">
        <DataSubmissionSection userRole={userRole} />
      </Section>

      {/* ── Methodology & Privacy ────────────────────────────────────────────── */}
      <Section title="Metodologia & Privacy" id="methodology">
        {w && (
          <div className="space-y-3 text-[10.5px] text-[rgba(6,3,43,0.62)] leading-relaxed">
            <div className="rounded border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-3 space-y-2">
              {[
                w.methodologyDisclaimer.kora_measures,
                w.methodologyDisclaimer.privacy_guarantee,
                w.methodologyDisclaimer.no_compliance,
              ].map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Stato calibrazione', value: w.methodologyDisclaimer.data_status },
                { label: 'Metodologia', value: w.tenant.methodologyVersion },
                { label: 'Soglia privacy', value: 'N≥10 per segmento' },
                { label: 'Dati individuali', value: 'Non accessibili al datore di lavoro' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded border border-[rgba(6,3,43,0.08)] bg-[#F8F6F1] px-3 py-2">
                  <p className="text-[9px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-0.5">{label}</p>
                  <p className="text-[rgba(6,3,43,0.78)] font-medium">{value}</p>
                </div>
              ))}
            </div>

            <p className="text-[9.5px] text-[rgba(6,3,43,0.40)]">
              KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate, verificate e spiegabili. Non garantisce conformità normativa e non sostituisce consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
            </p>
          </div>
        )}
      </Section>

      {/* ── Viewer read-only notice ──────────────────────────────────────────── */}
      {isViewer && (
        <div className="rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] px-4 py-2.5 text-[10.5px] text-[rgba(6,3,43,0.52)] text-center">
          Sei in modalità Company Viewer — sola lettura, nessuna azione disponibile.
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="text-[10px] text-[rgba(6,3,43,0.40)] text-center pt-2">
        KORA Foundation Light · Company Workspace · {w?.tenant.methodologyVersion ?? ''} · pre_empirical_calibration
      </div>

    </div>
  );
}
