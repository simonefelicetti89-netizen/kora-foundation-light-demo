'use client';

// app/company/workspace/_components/CompanyWorkspaceView.tsx
// B36 PART 4 — Company-facing workspace — board-grade, clean, read-only.
// Rendered after session auth. No demo-state. No admin controls.
// Covers: KORA Index summary, Reporting Readiness, Evidence Archive, Decision Pack, Methodology & Privacy.
// B83-B: Worker Space section added (WorkerAdoptionPanel — aggregate-safe, no individual data).

import { useState, useEffect } from 'react';
import { DataSubmissionSection } from './DataSubmissionSection';
import { MethodologyBadge } from '@/components/ui/MethodologyBadge';
import { PX } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Band, SplitRegion, SplitPart, Status, StateBlock } from '@/components/ui/px';
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
  // The API omits privacyNote entirely when there are no batches and returns
  // `caveat` instead — see app/api/company/evidence-archive/route.ts.
  privacyNote?: string;
  caveat?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────────

const SAFEGUARD_CLS: Record<string, string> = {
  CLEAR:   'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-kora-success',
  WARNING: 'border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.10)] text-kora-warning-text',
  FLAGGED: 'border-[rgba(158,59,47,0.25)] bg-[rgba(158,59,47,0.08)] text-kora-critical',
};

const SAFEGUARD_LABEL: Record<string, string> = {
  CLEAR:   'Activation Safeguard: CLEAR',
  WARNING: 'Activation Safeguard: WARNING',
  FLAGGED: 'Activation Safeguard: FLAGGED',
};

const REVIEW_CLS: Record<string, string> = {
  approved:             'text-kora-success',
  approved_for_scoring: 'text-kora-success',
  pending:              'text-kora-warning',
  pending_review:       'text-kora-warning',
  rejected:             'text-kora-critical',
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

// KORA-WP-125: Section now renders the canonical shared surface instead of a
// local warm-paper panel. Same API, same ids, same children — the nine
// sections keep their identity, they simply stop being nine identical
// white slabs stacked in a 768px column.
// KORA-WP-125 micro-polish: `tone` is what stops the page reading as one
// undifferentiated stack of white slabs. The working column keeps the L1
// working surface; the rail renders the L2 analytical surface, so supporting
// context is visibly supporting rather than a peer of the evidence chain.
function Section({ title, id, children, tone = 'plain' }: { title: string; id?: string; children: React.ReactNode; tone?: 'plain' | 'inset' }) {
  const inset = tone === 'inset';
  return (
    <section
      id={id}
      className="scroll-mt-4"
      style={{
        minWidth: 0, borderRadius: PX.rPanel,
        background: inset ? PX.l2 : PX.l1,
        border: `1px solid ${inset ? PX.l2Edge : PX.line}`,
        boxShadow: inset ? 'none' : PX.sh1,
      }}
    >
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${inset ? PX.l2Edge : PX.line}` }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>{title}</p>
      </div>
      <div style={{ padding: '16px 18px', minWidth: 0 }}>{children}</div>
    </section>
  );
}

/** A group label on the canvas — not a card. Two labels are what turn the
 *  working column from "three white boxes in a row" into one operational
 *  surface followed by its read-only registers, without merging any of the
 *  three semantically distinct records. */
function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: '2px 0 -4px 2px', fontSize: 10.5, fontWeight: 700,
      letterSpacing: '0.085em', textTransform: 'uppercase', color: PX.ink3,
    }}>
      {children}
    </p>
  );
}

/** One stage of the data pipeline, stated from the real readiness flags.
 *  Nothing is projected: each stage is either done or not, and the labels are
 *  the same four the Reporting Readiness contract already exposes. */
function PipelineStage({ label, note, done, last }: { label: string; note: string; done: boolean; last?: boolean }) {
  return (
    <li style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', columnGap: 11 }}>
      <span aria-hidden="true" style={{ display: 'grid', justifyItems: 'center' }}>
        <span style={{
          width: 14, height: 14, borderRadius: PX.rPill, display: 'grid', placeItems: 'center',
          background: done ? PX.okTint : PX.inkWash, border: `1px solid ${done ? PX.ok : PX.line2}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: PX.rPill, background: done ? PX.ok : PX.inkMute }} />
        </span>
        {!last && <span style={{ width: 1, minHeight: 22, flex: 1, background: PX.line2 }} />}
      </span>
      <span style={{ display: 'block', paddingBottom: last ? 0 : 11 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, letterSpacing: '-0.008em', color: done ? PX.ink : PX.ink2 }}>{label}</span>
        <span style={{ display: 'block', marginTop: 1, fontSize: 11.5, lineHeight: 1.5, color: PX.ink3 }}>{note}</span>
      </span>
    </li>
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
    <div data-testid="company-workspace-page">
      {/* KORA-WP-125 Product Experience convergence (2026-09-20): PRESENTATION
          ONLY. Previously a 768px column holding nine equal-weight white
          panels, with a dark hero card on top and ~45% of a 1440px canvas
          unused. Recomposed as a Company intelligence workspace: the masthead
          carries identity and provenance, the working column carries the
          Index, its history and the evidence chain, and the rail carries
          readiness, submission and the methodology/privacy statement. Every
          section keeps its id, its data source and its content — no metric is
          invented, no unavailable value is filled in, and the aggregate-only
          privacy posture is unchanged. */}
      <PageHead
        eyebrow="KORA · Workspace Aziendale"
        title={wsLoading ? '…' : (w?.tenant.companyName ?? 'La tua organizzazione')}
        lead="Il quadro aggregato e privacy-safe della tua azienda su KORA: nessun dato individuale dei lavoratori è visibile qui. Il KORA Index e il Decision Pack riflettono la pipeline dati più recente; la calibrazione della metodologia resta pre-empirica finché non indicato diversamente."
        meta={
          <>
            {!wsLoading && w?.tenant.tenantCode && (
              <span data-testid="company-tenant-code" style={{ display: 'inline-flex', alignItems: 'center', height: 23, padding: '0 9px', borderRadius: PX.rChip, background: PX.inkWash, color: PX.ink3, fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {w.tenant.tenantCode}
              </span>
            )}
            <Status tone="ok">Vista aggregata · nessun dato individuale</Status>
            {w && (
              <MethodologyBadge
                variant="inline"
                versionId={w.tenant.methodologyVersion}
                calibrationStatus={w.tenant.calibrationStatus}
                note="Dati aggregati"
                showSynthetic={false}
              />
            )}
          </>
        }
      />
      {/* Preserved for the B36/C-00 guards: the tenant name is still exposed
          under its canonical test id. */}
      <span data-testid="company-tenant-name" hidden>{wsLoading ? '…' : (w?.tenant.companyName ?? 'La tua organizzazione')}</span>
      <span hidden>{userRole} {userEmail}</span>

      <Workspace>

      {/* ── Loading / error ─────────────────────────────────────────────────── */}
      {wsLoading && (
        <Band tone="inset">
          <p style={{ margin: 0, padding: '26px 18px', textAlign: 'center', fontSize: 12.5, color: PX.ink3 }}>Caricamento workspace…</p>
        </Band>
      )}
      {wsError && (
        <Band>
          <p style={{ margin: 0, padding: '16px 18px', fontSize: 12.5, fontWeight: 650, color: PX.risk }}>⚠ {wsError}</p>
        </Band>
      )}

      {/* ── KORA Index — the page's primary statement ────────────────────────
          KORA-WP-125 micro-polish (2026-09-21): the Index is the reason this
          workspace exists, so it takes the full measure instead of being the
          first of nine identical panels. When it is unavailable the band does
          not shrink to an apology: it states the absence and, beside it, the
          real pipeline position that explains it — the same four readiness
          flags the contract already exposes, rendered once (the rail's
          Reporting Readiness section is not rendered in that branch, so no
          fact is stated twice). The welcome banner was folded in here for the
          same reason: it was a third way of saying "no data yet". */}
      {w && (
        <Band>
          {/* One child: .px-col's 20px grid gap would otherwise split this one
              surface into three stacked blocks. */}
          <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '12px 18px', borderBottom: `1px solid ${PX.line}` }}>
            <span id="kora-index" className="scroll-mt-4" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.075em', textTransform: 'uppercase', color: PX.ink3 }}>
              KORA Index
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
              {ki ? `Periodo ${ki.reportingPeriod}` : 'In preparazione · nessun punteggio per questo periodo'}
            </span>
          </div>
          {ki ? (
          <div className="space-y-4" style={{ padding: '16px 18px' }}>
              {/* Hero row */}
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[10px] font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide mb-1">KORA Index</p>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-kora-ink tracking-tight">{ki.koraIndexValue}</span>
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
          <SplitRegion columns={2}>
            <SplitPart>
              <p style={{ margin: 0, fontSize: 17, fontWeight: 750, letterSpacing: '-0.018em', color: PX.ink }}>
                KORA Index non ancora disponibile
              </p>
              <p style={{ margin: '8px 0 0', maxWidth: '54ch', fontSize: 12.5, lineHeight: 1.65, color: PX.ink2 }}>
                La workspace aziendale è attiva. La pipeline dati non è ancora stata completata per questa
                azienda: il punteggio apparirà qui non appena l&apos;operatore KORA completerà data intake,
                review e scoring.
              </p>
              <p style={{ margin: '10px 0 14px', maxWidth: '54ch', fontSize: 12.5, lineHeight: 1.65, color: PX.ink3 }}>
                Contatta il tuo referente KORA per avviare il processo di data intake. Al termine questa
                area conterrà l&apos;insieme di output inseparabile previsto dalla metodologia:
              </p>
              {/* The output set is stated, never simulated: every value is an
                  em dash. doc 21b makes KORA Index, Confidence Score and
                  Activation Safeguard one inseparable output — showing the
                  shape of what is missing is a Product statement, and it is
                  the reason no number here could ever be mistaken for one. */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }} aria-label="Output previsti, non ancora disponibili">
                {[
                  ['KORA Index', 'Punteggio aziendale del periodo'],
                  ['Confidence Score', 'Indicatore esterno all\u2019Index'],
                  ['Activation Safeguard', 'CLEAR · WARNING · FLAGGED'],
                  ['Macroblocchi', 'Reach · Quality · Equity · BTI'],
                ].map(([label, note]) => (
                  <div key={label} style={{ minWidth: 0, padding: '10px 12px', background: PX.l2, border: `1px dashed ${PX.line2}`, borderRadius: PX.rInner }}>
                    <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>{label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: 19, fontWeight: 750, letterSpacing: '-0.02em', color: PX.inkMute }}>—</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10.5, fontWeight: 600, lineHeight: 1.45, color: PX.ink3 }}>{note}</p>
                  </div>
                ))}
              </div>
            </SplitPart>

            <SplitPart label="Stato della pipeline dati">
              <div id="reporting-readiness" className="scroll-mt-4">
                {rr && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', marginBottom: 14 }}>
                      <Status tone={rr.hasScoring ? 'ok' : rr.hasEvidenceBatches ? 'info' : 'idle'}>
                        {READINESS_LEVEL_LABEL[rr.readinessLevel] ?? rr.readinessLevel}
                      </Status>
                      <span style={{ fontSize: 11.5, fontWeight: 600, color: PX.ink3, fontVariantNumeric: 'tabular-nums' }}>
                        {rr.batchCount} batch evidenza
                      </span>
                    </div>
                    <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      <PipelineStage
                        label="Baseline workforce"
                        note={rr.hasWorkforceBaseline ? 'Registrata.' : 'Non ancora registrata da KORA Admin.'}
                        done={rr.hasWorkforceBaseline}
                      />
                      <PipelineStage
                        label="Evidenze caricate"
                        note={rr.hasEvidenceBatches ? `${rr.batchCount} batch in archivio.` : 'Nessun batch ancora inviato.'}
                        done={rr.hasEvidenceBatches}
                      />
                      <PipelineStage
                        label="Pipeline completata"
                        note={rr.hasScoring ? 'Scoring eseguito.' : 'Intake, review e scoring sono eseguiti da KORA Admin.'}
                        done={rr.hasScoring}
                      />
                      <PipelineStage
                        label="Decision Pack"
                        note={rr.hasDecisionPack ? 'Disponibile.' : 'Generato al termine dello scoring.'}
                        done={rr.hasDecisionPack}
                        last
                      />
                    </ol>
                    <p style={{ margin: '14px 0 0', paddingTop: 10, borderTop: `1px solid ${PX.line}`, fontSize: 11, lineHeight: 1.6, color: PX.ink3 }}>
                      {rr.caveat}
                    </p>
                  </>
                )}
              </div>
            </SplitPart>
          </SplitRegion>
          )}
          {!ki && (
            <p style={{ margin: 0, padding: '10px 18px', borderTop: `1px solid ${PX.line}`, fontSize: 11, lineHeight: 1.6, color: PX.inkMute }}>
              Workspace attivo · Nessun dato ancora disponibile · Nessun demo fallback
            </p>
          )}
          </div>
        </Band>
      )}

      <Col span="main">

      {/* KORA-WP-125 final pass: the working column is ordered and labelled by
          what the reader can DO, not by data lineage. Data Submission is the
          only operational surface on this page, so it comes first and keeps
          the L1 working surface; the two registers below it are read-only and
          render on the L2 analytical surface. Nothing was merged — the three
          records keep their own ids, sources and semantics. */}
      <GroupLabel>Lavoro operativo</GroupLabel>

      {/* ── Data Submission ──────────────────────────────────────────────────── */}
      <Section title="Data Submission" id="data-submission">
        <DataSubmissionSection userRole={userRole} />
      </Section>

      <GroupLabel>Registri — sola lettura</GroupLabel>

      {/* ── KORA Index Storico (P0-2: period history) ───────────────────────────── */}
      {w && (
        <Section title="Storico KORA Index" id="kora-index-history" tone="inset">
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
                  <p className="text-xl font-bold text-kora-ink">{history.periods[0].kora_index_value}</p>
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
                      <th scope="col" className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Periodo</th>
                      <th scope="col" className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">KORA Index</th>
                      <th scope="col" className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Δ vs precedente</th>
                      <th scope="col" className="pb-1.5 pr-4 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">Safeguard</th>
                      <th scope="col" className="pb-1.5 font-semibold text-[rgba(6,3,43,0.45)] uppercase tracking-wide text-[9px]">CS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.periods.map((p) => (
                      <tr key={p.reporting_period} className={`border-b border-[rgba(6,3,43,0.04)] ${p.is_current ? 'bg-[rgba(47,125,85,0.04)]' : ''}`}>
                        <td className="py-1.5 pr-4 text-[rgba(6,3,43,0.70)] font-mono">
                          {p.reporting_period}
                          {p.is_current && <span className="ml-1.5 text-[8px] font-semibold text-kora-success uppercase tracking-wide">corrente</span>}
                        </td>
                        <td className="py-1.5 pr-4 font-bold text-kora-ink">{p.kora_index_value}</td>
                        <td className="py-1.5 pr-4">
                          {p.delta === null ? (
                            <span className="text-[rgba(6,3,43,0.35)]">—</span>
                          ) : (
                            <span className={p.delta >= 0 ? 'text-kora-success font-semibold' : 'text-kora-critical font-semibold'}>
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
        <Section title="Iniziative Worker — Aggregato" id="worker-initiatives" tone="inset">
          <div className="space-y-3">
            <div className="flex gap-4 text-[10.5px] text-[rgba(6,3,43,0.52)]">
              <span>
                <strong className="text-[rgba(6,3,43,0.90)]">{aggData.aggregate.total_published_initiatives}</strong> iniziative pubblicate
              </span>
              {!aggData.aggregate.participation_summary.suppressed && (
                <span>
                  <strong className="text-kora-success">{aggData.aggregate.participation_summary.value}</strong> adesioni aggregate
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

      {/* ── Evidence Archive ─────────────────────────────────────────────────── */}
      <Section title="Archivio Evidenze — Sola lettura" id="evidence-archive" tone="inset">
        {archLoading && (
          <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-4">Caricamento archivio…</p>
        )}
        {archError && (
          <p className="text-xs text-kora-critical">{archError}</p>
        )}
        {/* KORA-WP-125 final pass: at zero records this section used to render a
            summary bar of zeroes, an EMPTY grey strip (the API omits
            privacyNote when there are no batches — it returns `caveat`
            instead) and a centred line of grey text. The counters and the
            privacy strip now appear only when there is something to count or
            to protect, and the zero case is one designed state. No evidence
            logic was touched. */}
        {archive && !archLoading && archive.summary.total === 0 && (
          <StateBlock
            title="Nessuna evidenza in archivio"
            body={archive.caveat ?? 'Nessun batch di evidenze è stato caricato per questo periodo. L\u2019archivio si popola quando KORA Admin acquisisce una data submission.'}
          />
        )}
        {archive && !archLoading && archive.summary.total > 0 && (
          <div className="space-y-3">
            {/* Summary bar */}
            <div className="flex gap-4 text-[10.5px] text-[rgba(6,3,43,0.52)]">
              <span><strong className="text-[rgba(6,3,43,0.90)]">{archive.summary.total}</strong> iniziative</span>
              <span><strong className="text-kora-success">{archive.summary.approved}</strong> approvate</span>
              <span><strong className="text-amber-600">{archive.summary.pendingReview}</strong> in revisione</span>
            </div>

            {/* Privacy notice — only when the API actually states one */}
            {archive.privacyNote && (
              <p className="text-[9.5px] text-[rgba(6,3,43,0.40)] rounded border border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)] px-3 py-2">
                {archive.privacyNote}
              </p>
            )}

            {/* Initiatives table */}
            {archive.initiatives.length === 0 ? (
              <p className="text-xs text-[rgba(6,3,43,0.40)] text-center py-4">Nessuna evidenza disponibile.</p>
            ) : (
              <div className="overflow-hidden rounded border border-[rgba(6,3,43,0.08)]">
                <table className="w-full text-[10.5px]">
                  <thead>
                    <tr className="border-b border-[rgba(6,3,43,0.05)] bg-[rgba(6,3,43,0.03)]">
                      {['Iniziativa', 'Pilastro', 'Evidenza', 'Stato'].map(h => (
                        <th scope="col" key={h} className="px-3 py-2 text-left font-semibold text-[rgba(6,3,43,0.40)] uppercase tracking-wide text-[9px]">{h}</th>
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

      </Col>

      {/* Contextual rail (HANDOFF §18): actionable first — readiness and the
          submission path — then reference: methodology and privacy. */}
      <Col span="rail">

      {/* ── Reporting Readiness ────────────────────────────────────────────────
          Rendered here only when a KORA Index exists. Without one, the same
          four flags are the primary band's pipeline state and must not be
          restated: one fact, one place. */}
      {rr && ki && (
        <Section title="Reporting Readiness" id="reporting-readiness" tone="inset">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                label={READINESS_LEVEL_LABEL[rr.readinessLevel] ?? rr.readinessLevel}
                cls={rr.hasScoring ? 'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-kora-success' : rr.hasEvidenceBatches ? 'border-[rgba(43,92,230,0.18)] bg-[rgba(43,92,230,0.06)] text-kora-info-text' : 'border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] text-[rgba(6,3,43,0.52)]'}
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
                  <span className={done ? 'text-kora-success' : 'text-[rgba(6,3,43,0.28)]'}>
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

      {/* ── Decision Pack ────────────────────────────────────────────────────── */}
      <Section title="Decision Pack" id="decision-pack" tone="inset">
        {dp ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                label={dp.status.replace(/_/g, ' ')}
                cls={dp.status === 'ready' || dp.status === 'exported'
                  ? 'border-[rgba(47,125,85,0.25)] bg-[rgba(47,125,85,0.08)] text-kora-success'
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(6,3,43,0.15)] bg-kora-ink px-4 py-2 text-xs font-semibold text-white hover:bg-kora-ink/90 transition-colors"
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

      {/* ── Methodology & Privacy ────────────────────────────────────────────── */}
      <Section title="Metodologia & Privacy" id="methodology" tone="inset">
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

            {/* KORA-WP-125 §5, legacy Product copy — targeted classification.
                This cell used to render methodologyDisclaimer.data_status
                verbatim: "pre_empirical_calibration — KORA Foundation Light".
                That string is a composite of two different things.
                  · `pre_empirical_calibration` is CANONICAL and required: doc
                    21b / CLAUDE.md §6 make calibration_status a
                    non-suppressible label on every KORA Index surface. It is
                    kept, unchanged, and now read from the tenant's own
                    calibration_status rather than from a display string.
                  · "KORA Foundation Light" is the name of the commercial
                    programme (app/page.tsx §"L'offerta · Foundation Light").
                    It is a current term, but it is not a calibration status,
                    and the API hard-codes it for every tenant — so as a
                    per-tenant "Stato calibrazione" value it asserts something
                    the data does not hold. Implementation-era composite:
                    removed from this presentation only.
                The API payload is untouched: methodologyDisclaimer.data_status
                still carries the original value for every other consumer. No
                schema, no business logic and no governance value changed. */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Stato calibrazione', value: w.tenant.calibrationStatus, hint: 'Calibrazione pre-empirica', wide: true },
                { label: 'Metodologia', value: w.tenant.methodologyVersion, hint: null, wide: false },
                { label: 'Soglia privacy', value: 'N≥10 per segmento', hint: null, wide: false },
                { label: 'Dati individuali', value: 'Non accessibili al datore di lavoro', hint: null, wide: false },
              ].map(({ label, value, hint, wide }) => (
                // The calibration token is one unbreakable governance string —
                // it takes the full row rather than being hyphenated in half.
                <div key={label} style={{ gridColumn: wide ? 'span 2' : undefined, borderRadius: PX.rInner, border: `1px solid ${PX.line}`, background: PX.l1, padding: '9px 11px' }}>
                  <p style={{ margin: 0, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: PX.ink3 }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11.5, fontWeight: 650, color: PX.ink, overflowWrap: wide ? 'normal' : 'anywhere' }}>{value}</p>
                  {hint && <p style={{ margin: '1px 0 0', fontSize: 10.5, fontWeight: 600, color: PX.ink3 }}>{hint}</p>}
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

      {/* Provenance line. "KORA Foundation Light" removed as implementation-era
          scaffolding (KORA-WP-125 §10, LEGACY PROTOTYPE COPY); the two
          governance facts it carried — methodology version and calibration
          status — are non-suppressible per doc 21b and are preserved. */}
      <p style={{ margin: 0, fontSize: 11, lineHeight: 1.6, color: PX.ink3 }}>
        Company Workspace · {w?.tenant.methodologyVersion ?? ''} · pre_empirical_calibration
      </p>

      </Col>
      </Workspace>
    </div>
  );
}
