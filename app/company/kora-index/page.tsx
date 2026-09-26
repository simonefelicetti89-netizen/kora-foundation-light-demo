'use client';

// C-02: KORA Index™ — scomposizione analitica del punteggio.
// Live-only: richiede una sessione company autenticata (COMPANY_ADMIN). B143: COMPANY_VIEWER rimosso.
// Senza sessione live → NoDataState. Nessun dato sintetico. Nessun branch demo.

import { useState, useEffect } from 'react';

import { useScoringResult }                       from '@/lib/scoring-result';
import { useCompanySession }                      from '../_providers/CompanySessionProvider';
import { activationSafeguardService }             from '@/services/activation-safeguard/ActivationSafeguardService';
import { equityAccessIntelligenceService }        from '@/services/equity-access/EquityAccessIntelligenceService';
import { evidenceReliabilityIntelligenceService } from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import { lifeDiversityService }                   from '@/services/life-diversity/LifeDiversityService';
import { careEconomyIntelligenceService }         from '@/services/care-economy/CareEconomyIntelligenceService';
import { generateLiveRecommendations }            from '@/lib/live/live-recommendations';
import { generateLiveBoardActions }               from '@/lib/live/live-board-actions';
import { getMacroblockStatusThresholds }          from '@/lib/methodology-config/v0.1';
import { computeExecutiveIntelligence }           from '@/services/executive-intelligence/ExecutiveIntelligenceService';
import { ExecutiveIntelligencePanel }             from '@/components/executive-intelligence/ExecutiveIntelligencePanel';
import type { UEFReviewSummary, ImpactUnitComputationSummary } from '@/lib/types';
import type { LiveEligibilityContext }            from '@/app/api/company/live-eligibility/route';
import { BADGE_TOKENS, TOKENS, PX }                             from '@/lib/design/kora-design-tokens';
import type { MacroblockScore }                   from '@/lib/types';

import { ScoreDrivers }    from '@/components/kora-index/ScoreDrivers';
import { BoardActions }    from '@/components/kora-index/BoardActions';

import { PageMasthead }    from '@/components/ui/PageMasthead';
import { SectionLabel }    from '@/components/ui/SectionLabel';
import { Explainer }       from '@/components/ui/Explainer';
import { TM }              from '@/components/ui/TM';
import {
  Chapter, Priority,
  ExecutiveSurface, ExecutiveRule, VerdictLine, SignalRow, Signal,
  ScoreBandScale, ThresholdMeter,
} from '@/components/ui/px';
import { macroblockScale } from '@/lib/design/encoding-grammar';
import { resolveVerdict, buildPrecisionLine } from '@/lib/verdict/resolve';
import { actionDivergesFromConstraint } from '@/lib/verdict/binding-constraint';

import { MacroblockCard }           from '@/components/kora-index/MacroblockCard';
import { KoraIndexBuildCard }       from '@/components/kora-index/KoraIndexBuildCard';
import { ComponentBreakdown }       from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart }  from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown }      from '@/components/kora-index/ConfidenceBreakdown';
import { EligibilityGatePanel }     from '@/components/kora-index/EligibilityGatePanel';
import { BlockedByDesignPanel }     from '@/components/kora-index/BlockedByDesignPanel';
import { RecommendationsPanel }     from '@/components/kora-index/RecommendationsPanel';
import { MethodologyGlossary }      from '@/components/kora-index/MethodologyGlossary';
import { BoundaryBadge }                    from '@/components/ui/BoundaryBadge';
import { InitiativeExplainabilityPanel }    from '@/components/company/InitiativeExplainabilityPanel';

// Safeguard presentation — a closed record, so no prop can change the semantic
// state. The mark is a 7px dot; semantic colour never becomes a surface.
const SAFEGUARD_WORD: Record<string, string> = { CLEAR: 'Clear', WARNING: 'Warning', FLAGGED: 'Flagged' };
const SAFEGUARD_SUB:  Record<string, string> = {
  CLEAR:   'Soglie minime rispettate',
  WARNING: 'Sotto le soglie di qualità',
  FLAGGED: 'Attivazione a rischio strutturale',
};
const SAFEGUARD_MARK: Record<string, string> = { CLEAR: PX.ok, WARNING: PX.warn, FLAGGED: PX.risk };

// BTI status cutoffs read from the methodology config — never hardcoded here.
const BTI_STATUS = getMacroblockStatusThresholds();
const BTI_GOOD = BTI_STATUS.buono.min;
const BTI_DEV  = BTI_STATUS.sviluppo.min;

// The declared 375px reading order. Inert above 767px.
//   1 judgment (order 0, always first)   4 the reading
//   2 drivers + actions                  5 BTI detail
//   3 —                                  6 disclosures   7 reference
const MOBILE_ORDER = {
  ranked: 1, reading: 2, bti: 3, disclosures: 4, reference: 5,
  d1: 1, d2: 2, d3: 3, d4: 4,
} as const;

// ── Explainer definitions ─────────────────────────────────────────────────────
const EXP = {
  cs: {
    what: 'Qualità e completezza delle fonti dati usate nel calcolo del KORA Index™.',
    how:  'Esterno al KORA Index™ (peso = 0). Non misura impatto: segnala affidabilità. Più alto = fonti più solide e verificabili.',
  },
  safeguard: {
    what: 'Gate interpretativo che verifica se i requisiti minimi di attivazione sono soddisfatti.',
    how:  'CLEAR = soglie rispettate. WARNING = sotto i minimi. FLAGGED = intervento urgente. Non è una componente del punteggio.',
  },
  eligibility: {
    what: 'Classifica ogni record come Eligible (genera IU), Limited (economic relief, 0 IU) o Blocked (compliance, 0 IU).',
    how:  'Solo i record Eligible contribuiscono al KORA Index™. Blocked e Limited sono tracciati nel BTI™.',
  },
} as const;

// ── Section divider ───────────────────────────────────────────────────────────

function Divider({ label }: { label: string }) {
  return (
    <div style={{ paddingTop: 32, marginTop: 32, borderTop: `1px solid ${TOKENS.inkBorder}`, marginBottom: 20 }}>
      <p style={{
        fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontWeight:    600,
        fontSize:      '9.5px',
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        color:         TOKENS.inkHint,
      }}>
        {label}
      </p>
    </div>
  );
}

// ── No-data / no-session state ────────────────────────────────────────────────

function NoDataState({ companyName }: { companyName?: string | null }) {
  return (
    <div className="space-y-5" data-testid="company-kora-index-page">
      <PageMasthead
        eyebrow="KORA Index v1.0 · Scomposizione analitica"
        title={companyName ?? 'La tua organizzazione'}
        subline="Il KORA Index™ sarà disponibile al termine della pipeline dati."
      />
      <div style={{
        background:   'rgba(186,117,23,0.07)',
        border:       '1px solid rgba(186,117,23,0.20)',
        borderRadius: TOKENS.cardRadius,
        padding:      '24px 28px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: BADGE_TOKENS.limited.text, marginBottom: 8 }}>
          Dati non ancora disponibili
        </p>
        <p style={{ fontSize: '12px', color: BADGE_TOKENS.limited.text, lineHeight: 1.6, maxWidth: 480 }}>
          Completa il data intake e la review delle evidenze per generare il KORA Index™.
          Contatta il tuo referente KORA per procedere.
        </p>
        <p style={{ fontSize: '11px', color: BADGE_TOKENS.limited.text, lineHeight: 1.6, maxWidth: 480, marginTop: 8, opacity: 0.85 }}>
          Quando disponibile, il KORA Index™ mostrerà solo dati aggregati e privacy-safe — mai informazioni
          individuali sui singoli lavoratori.
        </p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KoraIndexDetail() {
  const { isLive, tenantId: liveId, sessionLoading, koraRole, companyName: liveCompanyName } = useCompanySession();

  const COMPANY_ID = liveId ?? '';

  // KORA-WP-138: the page-specific `forceEnvironment: 'live'` override is
  // removed. It was the ONLY reason this surface escaped OBS-02, which means
  // retaining it would mask a regression of the canonical invariant rather than
  // exercise it. An authenticated COMPANY_ADMIN now resolves to live through
  // `useEffectiveEnvironment`, exactly as the other four Company surfaces do.
  // The `forceEnvironment` API itself is KEPT — it remains legitimate for
  // KORA_ADMIN preview and test contexts.
  const { data: scoring, loading } = useScoringResult({
    tenantId:   COMPANY_ID,
    scenarioId: 'S1',
  });

  const [liveCtx, setLiveCtx] = useState<LiveEligibilityContext | null>(null);

  const reportingPeriodForLive = scoring?.status === 'ok' ? scoring.koraIndex?.reporting_period : undefined;
  useEffect(() => {
    let active = true;
    async function fetchLiveCtx() {
      if (!isLive || !reportingPeriodForLive) {
        if (active) setLiveCtx(null);
        return;
      }
      try {
        const r = await fetch(
          `/api/company/live-eligibility?period=${encodeURIComponent(reportingPeriodForLive)}`,
          { credentials: 'include' },
        );
        const d = r.ok ? (await r.json() as LiveEligibilityContext) : null;
        if (active) setLiveCtx(d);
      } catch {
        if (active) setLiveCtx(null);
      }
    }
    fetchLiveCtx();
    return () => { active = false; };
  }, [isLive, reportingPeriodForLive]);

  // Loading guard — MUST come before any data access.
  // Covers both the async session check (sessionLoading) and the Supabase scoring fetch (loading).
  if (sessionLoading || loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento in corso…</p>
      </div>
    );
  }

  const hasKoraData = scoring?.status === 'ok';
  if (!hasKoraData) return <NoDataState companyName={liveCompanyName} />;

  const output     = scoring!.koraIndex!;
  const aggregate  = scoring!.aggregate;
  const confidence = scoring!.confidence;

  const safeguard = activationSafeguardService.evaluate(
    aggregate?.activation_rate ?? 0,
    aggregate?.meaningful_activation_rate ?? 0,
  );

  const macroblocks: MacroblockScore[] = output.macroblocks ?? [];

  // B143: COMPANY_VIEWER rimosso. Se koraRole è null la sessione è in errore — non assumere alcun ruolo.
  if (!koraRole) {
    return (
      <div className="rounded-lg border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] px-4 py-6 text-xs text-kora-critical text-center">
        Sessione non disponibile. Ricaricare la pagina o effettuare nuovamente il login.
      </div>
    );
  }

  // ── Equity & Access Intelligence™ ────────────────────────────────────────
  // department_activation already filtered at N≥10 server-side.
  // Sprint 1: EQ→EQS (Equity Segments). Use EQW when available (Pilot+), else EQS.
  const eqComponent  = output.components.find((c) => c.code === 'EQS' || c.code === 'EQW');
  const eqValue      = eqComponent?.value ?? 0;
  const eqCode       = eqComponent?.code ?? 'EQS';
  const equityAccess = equityAccessIntelligenceService.compute(aggregate ?? null, eqValue, koraRole, undefined);

  // ── Evidence Reliability Intelligence™ ───────────────────────────────────
  const liveUefSummary: UEFReviewSummary | null = liveCtx ? {
    total_records:                     liveCtx.uef_review.total,
    pending_count:                     liveCtx.uef_review.pending_count,
    approved_for_scoring_count:        liveCtx.uef_review.approved_for_scoring_count,
    approved_for_bti_governance_count: liveCtx.eligibility.limited,
    blocked_count:                     liveCtx.eligibility.blocked,
    needs_more_data_count:             liveCtx.uef_review.needs_more_data_count,
    rejected_count:                    liveCtx.uef_review.rejected_count,
    override_count:                    0,
    kora_ready_for_iu_count:           liveCtx.uef_review.approved_for_scoring_count,
    kora_ready_for_bti_count:          liveCtx.eligibility.limited,
    review_completion_rate:            liveCtx.uef_review.review_completion_rate,
    methodology_version:               'KORA Index v1.0',
    calibration_status:                'pre_empirical_calibration',
  } : null;

  const liveIuSummary: ImpactUnitComputationSummary | null = liveCtx ? {
    total_records:           liveCtx.eligibility.total,
    computed_records:        liveCtx.uef_review.approved_for_scoring_count,
    blocked_records:         liveCtx.eligibility.blocked,
    limited_records:         liveCtx.eligibility.limited,
    review_required_records: liveCtx.uef_review.pending_count + liveCtx.uef_review.needs_more_data_count,
    total_impact_units:      0,
    impact_units_by_pillar:  {},
    records_without_iu:      liveCtx.eligibility.blocked + liveCtx.eligibility.limited,
    average_cq:              0,
    average_ev:              liveCtx.iu_average_ev,
    average_cf:              0,
    average_agf:             0,
    methodology_version:     'KORA Index v1.0',
    calibration_status:      'pre_empirical_calibration',
  } : null;

  // DEMO-GUARD-01: no synthetic fallback. When liveCtx has not resolved yet
  // (loading, or /api/company/live-eligibility failed), evidenceReliability
  // stays null and the panel below renders a pending/unavailable state —
  // never synthetic seed content on this live page.
  const evidenceReliability = liveCtx
    ? evidenceReliabilityIntelligenceService.compute(
        liveIuSummary, liveUefSummary, confidence ?? null, koraRole,
      )
    : null;

  // ── LIFE Diversity & Care Economy Intelligence™ ───────────────────────────
  const lifePillarShare = (aggregate?.pillar_distribution?.['LIFE'] as number | undefined) ?? 0;
  const lifeSummary = liveCtx
    ? lifeDiversityService.computeFromProgramNames(
        liveCtx.life_program_names,
        lifePillarShare,
        0,
      )
    : null;

  const careSummary = careEconomyIntelligenceService.compute(lifeSummary, koraRole);

  // ── Eligibility gate ──────────────────────────────────────────────────────
  const eligibilityGate = liveCtx
    ? {
        eligible_row_count: liveCtx.eligibility.eligible,
        limited_count:      liveCtx.eligibility.limited,
        blocked_count:      liveCtx.eligibility.blocked,
        total_row_count:    liveCtx.eligibility.total,
        blocked_note:       'Record compliance/HSE esclusi per design — 0 IU per design.',
        limited_note:       'Benefit monetari: supporto economico verificato, contributo IU nullo.',
      }
    : { eligible_row_count: 0, limited_count: 0, blocked_count: 0, total_row_count: 0, blocked_note: 'Caricamento…', limited_note: 'Caricamento…' };

  // `generateDiagnosisSentence` is SUPERSEDED by the deterministic verdict
  // library: it emitted templated strings from thresholds, and at display scale
  // a formulaic sentence is the most conspicuous weakness on the page. The
  // function is left in HeroDiagnosis for its other callers; this surface no
  // longer uses it.


  // ── Board Actions ─────────────────────────────────────────────────────────
  const boardActions = generateLiveBoardActions({
    macroblocks,
    safeguardStatus:  output.safeguard_status,
    confidenceScore:  output.confidence_score,
    equityAccess,
    evidenceReliability,
  });

  // ── Recommendations ───────────────────────────────────────────────────────
  // Sprint 1: VR→EVQ (Evidence Quality proxy for recommendation logic)
  const vrValue  = output.components.find((c) => c.code === 'EVQ')?.value ?? 0;
  const arValue  = aggregate?.activation_rate ?? 0;
  const marValue = aggregate?.meaningful_activation_rate ?? 0;

  const btiRecommendations = generateLiveRecommendations({
    safeguardStatus:         output.safeguard_status,
    arValue,
    marValue,
    vrValue,
    eqValue,
    confidenceScore:         output.confidence_score,
    confidenceGaps:          confidence?.gaps_identified ?? [],
    eligibleCount:           liveCtx?.eligibility.eligible ?? 0,
    limitedCount:            liveCtx?.eligibility.limited ?? 0,
    totalUef:                liveCtx?.eligibility.total ?? 0,
    equityAccess,
    evidenceReliability,
    lifeConcentrationStatus: lifeSummary?.concentrationStatus ?? null,
  });

  // ── Executive Intelligence Layer™ ─────────────────────────────────────────
  const limitedShareRaw = eligibilityGate.total_row_count > 0
    ? eligibilityGate.limited_count / eligibilityGate.total_row_count
    : null;
  const executiveIntelligence = computeExecutiveIntelligence({
    koraIndexValue:           output.kora_index_value,
    safeguardStatus:          output.safeguard_status,
    confidenceScore:          output.confidence_score,
    activationRate:           aggregate?.activation_rate ?? 0,
    meaningfulActivationRate: aggregate?.meaningful_activation_rate ?? 0,
    macroblocks,
    equityAccess,
    evidenceReliability,
    lifeDiversity:            lifeSummary,
    limitedShare:             limitedShareRaw,
    economicReliefShare:      null,
  });

  // ── Approved design V2 — the declared 375px reading order ──────────────────
  //   judgment -> index -> Safeguard/Confidence/BTI -> action -> drivers ->
  //   actions -> reading -> BTI detail -> disclosures -> reference.
  // Inert above 767px.

  // Not every component deserves first-level visibility: the three weakest
  // SELECT and ORDER existing values; nothing is computed or encoded here.
  const weakComponents = [...output.components]
    .filter((c) => !c.external && typeof c.value === 'number')
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((c) => ({ code: c.code as string, label: c.label }));

  const safeguardStatus = safeguard?.status ?? 'WARNING';
  const btiMacroblock   = macroblocks.find((m) => m.code === 'BTI');
  const btiScore        = typeof btiMacroblock?.score === 'number' ? btiMacroblock.score : null;
  const btiMark         = btiScore === null ? undefined
    : btiScore >= BTI_GOOD ? PX.ok : btiScore >= BTI_DEV ? PX.warn : PX.risk;
  const btiSub          = btiScore === null ? 'Dato non disponibile'
    : btiScore >= BTI_GOOD ? `Sopra il target di ${BTI_GOOD}` : `Sotto il target di ${BTI_GOOD}`;

  // The verdict is AUTHORED (lib/verdict) and resolved deterministically; the
  // precision line is generated from the actual figures. Neither is composed here.
  const verdict = resolveVerdict({
    koraIndexValue:  output.kora_index_value,
    safeguardStatus,
    components:      output.components,
    macroblocks,
  });
  const precisionLine = buildPrecisionLine({
    koraIndexValue:  output.kora_index_value,
    safeguardStatus,
    components:      output.components,
    macroblocks,
    activationRate:  safeguard?.ar_value ?? null,
    meaningfulActivationRate: safeguard?.mar_value ?? null,
  });

  // BoardActions is the SOLE source of imperatives; the T2 line is a promotion
  // of its first item, never a second recommendation.
  const primaryAction = boardActions[0]?.action ?? null;

  // BoardActions ranks by weighted macroblock leverage; the binding constraint is
  // the weakest signal. They are different questions and may legitimately point
  // elsewhere — but the surface must SAY SO rather than silently telling two
  // stories, which is what it did.
  const actionDiverges = actionDivergesFromConstraint(
    verdict.binding,
    boardActions[0]?.macroblock ?? null,
    macroblocks,
  );

  return (
    <div className="kora-priority-stack" style={{ maxWidth: 1120 }} data-testid="company-kora-index-page">

      {/* ── CHROME — one line ─────────────────────────────────────────────── */}
      <div className="kora-masthead" style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <span className="kt-meta" style={{ color: PX.inkMute }}><TM>KORA Index</TM> v1.0</span>
        <h1 className="kt-title" style={{ margin: 0, color: PX.ink, minWidth: 0 }}>
          {liveCompanyName ?? 'La tua organizzazione'}
        </h1>
        <BoundaryBadge mode="LIVE" variant="light" />
      </div>

      {/* ── T1 + T2 — the ONE filled surface ──────────────────────────────── */}
      <ExecutiveSurface>
        <VerdictLine period={output.reporting_period} verdict={verdict.text} precision={precisionLine} />

        <ExecutiveRule />

        <SignalRow
          index={
            <>
              <p className="kt-meta" style={{ color: 'rgba(255,255,255,0.50)', marginBottom: 8 }}>
                <TM>KORA Index</TM>
              </p>
              <p style={{ color: '#FFFFFF', display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span className="kt-title kt-num">{Math.round(output.kora_index_value)}</span>
                <span className="kt-secondary kt-num" style={{ color: 'rgba(255,255,255,0.34)', fontWeight: 600 }}>/100</span>
              </p>
              <div style={{ marginTop: 10 }}>
                <ScoreBandScale value={output.kora_index_value} onDark />
              </div>
            </>
          }
          signals={[
            <Signal
              key="safeguard"
              label="Activation Safeguard™"
              shortLabel="Safeguard"
              mark={SAFEGUARD_MARK[safeguardStatus]}
              value={<span className="kt-subsection">{SAFEGUARD_WORD[safeguardStatus]}</span>}
              sub={SAFEGUARD_SUB[safeguardStatus]}
            />,
            <Signal
              key="confidence"
              label="Confidence Score™"
              shortLabel="Confidence"
              value={<span className="kt-subsection kt-num">{Math.round(output.confidence_score * 100)}%</span>}
              sub={'Affidabilità dell’interpretazione · peso = 0'}
            />,
            <Signal
              key="bti"
              label="Budget → impatto"
              shortLabel="Budget"
              mark={btiMark}
              value={btiScore === null
                ? <span className="kt-subsection">—</span>
                : <><span className="kt-subsection kt-num">{Math.round(btiScore)}</span><span className="kt-secondary kt-num" style={{ color: 'rgba(255,255,255,0.34)', fontWeight: 600 }}>/100</span></>}
              sub={btiSub}
            />,
          ]}
        />

        <ExecutiveRule />

        {primaryAction && (
          <p className="kt-section" style={{ fontWeight: 600, color: '#FFFFFF', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span aria-hidden="true" style={{ color: 'rgba(255,255,255,0.50)', flex: '0 0 auto' }}>→</span>
            <span>
              {primaryAction}
              {actionDiverges && (
                <span className="kt-caption" style={{ display: 'block', fontWeight: 400, color: 'rgba(255,255,255,0.50)', marginTop: 6 }}>
                  Azione a maggiore impatto ponderato: agisce su un macroblocco diverso dal vincolo primario.
                </span>
              )}
            </span>
          </p>
        )}
      </ExecutiveSurface>

      {/* ── T3 — localisation | imperatives ───────────────────────────────── */}
      <Priority order={MOBILE_ORDER.ranked}>
        <div className="kora-two-col" style={{ marginTop: 40 }}>
          <ScoreDrivers weakComponents={weakComponents} />
          <div className="kora-two-col-rule" aria-hidden="true" />
          <BoardActions actions={boardActions} />
        </div>
      </Priority>

      {/* ── T3 — the reading. Names no component, issues no imperative. ───── */}
      <Priority order={MOBILE_ORDER.reading}>
        <div style={{ marginTop: 40, paddingTop: 40, borderTop: `1px solid ${PX.line}` }}>
          <ExecutiveIntelligencePanel summary={executiveIntelligence} />
        </div>
      </Priority>

      {/* ── T3 — BTI detail ───────────────────────────────────────────────── */}
      {btiScore !== null && (
        <Priority order={MOBILE_ORDER.bti}>
          <div style={{ marginTop: 40, paddingTop: 40, borderTop: `1px solid ${PX.line}` }}>
            <p className="kt-meta" style={{ color: PX.inkMute, marginBottom: 8 }}>Budget-to-Human-Impact™</p>
            {/* Constrained measure: a threshold track spanning 1,120px reads as
                an arbitrary progress bar rather than a position against a scale. */}
            <div style={{ maxWidth: 520 }}>
            <ThresholdMeter
              scale={macroblockScale('BTI')}
              value={btiScore}
              label="Budget-to-Human-Impact™"
              unitSuffix="/100"
              showSource
            />
            </div>
          </div>
        </Priority>
      )}

      {/* ── T4/T5 — exactly four disclosure groups ────────────────────────── */}
      <Priority order={MOBILE_ORDER.disclosures}>
      <div className="kora-disclosure-region" style={{ marginTop: 48 }}>

        <Chapter id="costruzione" label="Come è costruito il punteggio" tier="T4" index={1} mobileOrder={MOBILE_ORDER.d1} collapsible
          aside={<span className="kt-caption" style={{ color: PX.ink3 }}>4 macroblocchi · 10 componenti con valori e pesi · pipeline</span>}>
          <SectionLabel>4 macroblocchi</SectionLabel>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-4 mt-4">
            {macroblocks.map((mbk) => (
              <MacroblockCard key={mbk.code} macroblock={mbk} />
            ))}
          </div>
          <div className="mt-6" id="componenti">
            <SectionLabel>10 componenti analitici</SectionLabel>
            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <ComponentBreakdownChart components={output.components} weakCodes={[]} />
              <ComponentBreakdown components={output.components} />
            </div>
          </div>
          <div className="mt-6">
            <SectionLabel>Pipeline di costruzione</SectionLabel>
            <div className="mt-4">
              <KoraIndexBuildCard output={output} safeguard={safeguard} aggregate={aggregate} />
            </div>
          </div>
        </Chapter>

        <Chapter id="affidabilita" label="Qualità e affidabilità delle evidenze" tier="T4" index={2} mobileOrder={MOBILE_ORDER.d2} collapsible
          aside={<span className="kt-caption" style={{ color: PX.ink3 }}>Safeguard AR/MAR · Confidence in dettaglio · Evidence Reliability</span>}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <Explainer {...EXP.safeguard} compact />
            <Explainer {...EXP.cs} compact />
          </div>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <ActivationSafeguardPanel result={safeguard} explanation={undefined} />
            <ConfidenceBreakdown record={confidence} />
          </div>
          {/* Evidence Reliability Intelligence™ */}
          {!evidenceReliability && !liveCtx && evidenceReliabilityIntelligenceService.canAccess(koraRole) && (
            <div
              data-testid="evidence-reliability-pending"
              style={{
                marginTop:    16,
                background:   TOKENS.surface,
                border:       TOKENS.cardBorder,
                borderRadius: TOKENS.cardRadius,
                padding:      '0.875rem 1.25rem',
              }}
            >
              <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, marginBottom: 4 }}>
                Evidence Reliability Intelligence™
              </p>
              <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
                Dati evidenza non ancora disponibili per questo periodo. Nessun dato sintetico viene mostrato al posto dei dati live.
              </p>
            </div>
          )}
          {evidenceReliability && (
            <div style={{
              marginTop:    16,
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              overflow:     'hidden',
            }}>
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: TOKENS.cardBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, flex: 1 }}>
                  Evidence Reliability Intelligence™
                </p>
                <span style={{
                  fontSize: '10px', fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                  background: evidenceReliability.evidenceRiskLevel === 'alta' ? TOKENS.safeguard.cap.bg
                    : evidenceReliability.evidenceRiskLevel === 'media' ? TOKENS.safeguard.watch.bg
                    : TOKENS.safeguard.pass.bg,
                  color: evidenceReliability.evidenceRiskLevel === 'alta' ? TOKENS.safeguard.cap.text
                    : evidenceReliability.evidenceRiskLevel === 'media' ? TOKENS.safeguard.watch.text
                    : TOKENS.safeguard.pass.text,
                }}>
                  Rischio evidenza: {evidenceReliability.evidenceRiskLevel}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 500, background: 'rgba(6,3,43,0.05)', color: TOKENS.inkHint, borderRadius: 4, padding: '2px 8px' }}>
                  {evidenceReliability.evidenceLevelDistribution.primaryTier}
                </span>
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink, marginBottom: 6 }}>Distribuzione livello evidenza</p>
                  <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                    {evidenceReliability.evidenceLevelDistribution.strongShare > 0 && (
                      <div style={{ flex: evidenceReliability.evidenceLevelDistribution.strongShare, background: TOKENS.safeguard.pass.text, opacity: 0.85 }} title={`Strong: ${Math.round(evidenceReliability.evidenceLevelDistribution.strongShare * 100)}%`} />
                    )}
                    {evidenceReliability.evidenceLevelDistribution.acceptableShare > 0 && (
                      <div style={{ flex: evidenceReliability.evidenceLevelDistribution.acceptableShare, background: TOKENS.safeguard.watch.text, opacity: 0.70 }} title={`Acceptable: ${Math.round(evidenceReliability.evidenceLevelDistribution.acceptableShare * 100)}%`} />
                    )}
                    {evidenceReliability.evidenceLevelDistribution.weakShare > 0 && (
                      <div style={{ flex: evidenceReliability.evidenceLevelDistribution.weakShare, background: TOKENS.safeguard.cap.text, opacity: 0.65 }} title={`Weak: ${Math.round(evidenceReliability.evidenceLevelDistribution.weakShare * 100)}%`} />
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 5 }}>
                    {[
                      { label: `Strong (L3/L4): ${Math.round(evidenceReliability.evidenceLevelDistribution.strongShare * 100)}%`, color: TOKENS.safeguard.pass.text },
                      { label: `Acceptable (L2): ${Math.round(evidenceReliability.evidenceLevelDistribution.acceptableShare * 100)}%`, color: TOKENS.safeguard.watch.text },
                      { label: `Weak (L0/L1): ${Math.round(evidenceReliability.evidenceLevelDistribution.weakShare * 100)}%`, color: TOKENS.safeguard.cap.text },
                    ].map(({ label, color }) => (
                      <span key={label} style={{ fontSize: '10px', color, fontWeight: 500 }}>{label}</span>
                    ))}
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginBottom: 10 }}>
                  {evidenceReliability.advisorNarrative}
                </p>
                {evidenceReliability.upgradeOpportunities.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                    <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: TOKENS.inkHint, marginBottom: 2 }}>
                      Opportunità di miglioramento evidenza
                    </p>
                    {evidenceReliability.upgradeOpportunities.map((opp, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, padding: '7px 10px', background: 'rgba(6,3,43,0.03)', borderRadius: 6, border: `1px solid rgba(6,3,43,0.07)` }}>
                        <span style={{ fontSize: '10px', fontWeight: 600, borderRadius: 4, padding: '1px 6px', whiteSpace: 'nowrap' as const, alignSelf: 'flex-start', marginTop: 1,
                          background: opp.priority === 'alta' ? TOKENS.safeguard.cap.bg : TOKENS.safeguard.watch.bg,
                          color:      opp.priority === 'alta' ? TOKENS.safeguard.cap.text : TOKENS.safeguard.watch.text,
                        }}>
                          {opp.priority === 'alta' ? 'Alta' : 'Media'}
                        </span>
                        <div>
                          <p style={{ fontSize: '11px', color: TOKENS.ink, fontWeight: 500, lineHeight: 1.4 }}>{opp.area}</p>
                          <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5, marginTop: 2 }}>{opp.upgradeAction}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ padding: '8px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
                Evidence Reliability Intelligence™ · pre_empirical_calibration · non modifica CS, EVQ né KORA Index™ · not_kora_index_component
              </p>
            </div>
          )}

        {/* LIFE Diversity + Care Economy Intelligence™ */}
        {lifeSummary && (
          <div style={{ marginTop: 16 }}>
            <div style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              overflow:     'hidden',
            }}>
              <div style={{ padding: '0.875rem 1.25rem', borderBottom: TOKENS.cardBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, flex: 1 }}>
                  LIFE Diversity & Care Economy Intelligence™
                </p>
                <span style={{
                  fontSize: '10px', fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                  background: lifeSummary.concentrationStatus === 'diverse' ? TOKENS.safeguard.pass.bg
                    : lifeSummary.concentrationStatus === 'no_life_data' ? TOKENS.inkBorder
                    : TOKENS.safeguard.watch.bg,
                  color: lifeSummary.concentrationStatus === 'diverse' ? TOKENS.safeguard.pass.text
                    : lifeSummary.concentrationStatus === 'no_life_data' ? TOKENS.inkSecondary
                    : TOKENS.safeguard.watch.text,
                }}>
                  {lifeSummary.concentrationStatus.replace(/_/g, ' ')}
                </span>
                {careSummary && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                    background: careSummary.careEconomyStatus === 'broad' ? TOKENS.safeguard.pass.bg
                      : careSummary.careEconomyStatus === 'absent' ? TOKENS.safeguard.cap.bg
                      : TOKENS.safeguard.watch.bg,
                    color: careSummary.careEconomyStatus === 'broad' ? TOKENS.safeguard.pass.text
                      : careSummary.careEconomyStatus === 'absent' ? TOKENS.safeguard.cap.text
                      : TOKENS.safeguard.watch.text,
                  }}>
                    Care Economy: {careSummary.careEconomyStatus}
                  </span>
                )}
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'grid', gap: 12, gridTemplateColumns: careSummary ? '1fr 1fr' : '1fr' }}>
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>LIFE Diversity</p>
                  <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginBottom: 8 }}>
                    Subcategorie attive: <strong>{lifeSummary.activeSubcategories.length}/10</strong>
                    {lifeSummary.dominantSubcategory && ` · Dominante: ${lifeSummary.dominantSubcategory.replace(/_/g, ' ')}`}
                  </p>
                  {lifeSummary.recommendations.slice(0, 1).map((rec) => (
                    <div key={rec.id} style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5, padding: '6px 8px', background: 'rgba(6,3,43,0.03)', borderRadius: 5, border: `1px solid rgba(6,3,43,0.07)` }}>
                      › {rec.text}
                    </div>
                  ))}
                </div>
                {careSummary && (
                  <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, color: TOKENS.ink, marginBottom: 4 }}>Care Economy</p>
                    <p style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.55, marginBottom: 8 }}>
                      {careSummary.narrative}
                    </p>
                    {careSummary.recommendations.slice(0, 1).map((rec) => (
                      <div key={rec.id} style={{ fontSize: '11px', color: TOKENS.inkSecondary, lineHeight: 1.5, padding: '6px 8px', background: 'rgba(6,3,43,0.03)', borderRadius: 5, border: `1px solid rgba(6,3,43,0.07)` }}>
                        › {rec.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p style={{ padding: '8px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
                LIFE Diversity & Care Economy Intelligence™ · pre_empirical_calibration · non modifica KORA Index™ · not_kora_index_component
              </p>
            </div>
          </div>
        )}
        </Chapter>

        <Chapter id="perimetro" label="Cosa è stato incluso ed escluso" tier="T4" index={3} mobileOrder={MOBILE_ORDER.d3} collapsible
          aside={<span className="kt-caption" style={{ color: PX.ink3 }}>Eligibility gate · compliance · perché le iniziative hanno inciso</span>}>
          <SectionLabel>Eligibility gate</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <Explainer {...EXP.eligibility} compact />
          </div>
          <div className="mt-4">
            <EligibilityGatePanel summary={eligibilityGate} />
          </div>
          <div className="mt-6">
            <SectionLabel>Compliance &amp; blocked</SectionLabel>
            <div className="mt-4">
              <BlockedByDesignPanel blockedCount={eligibilityGate.blocked_count} blockedNote={eligibilityGate.blocked_note} />
            </div>
          </div>
          <div className="mt-6">
            <SectionLabel>Perché le iniziative hanno inciso</SectionLabel>
            <div className="mt-4">
              <InitiativeExplainabilityPanel period={reportingPeriodForLive} />
            </div>
          </div>
          <div className="mt-6">
            <SectionLabel>Raccomandazioni BTI™</SectionLabel>
            <div className="mt-4">
              <RecommendationsPanel btiRecommendations={btiRecommendations} />
            </div>
          </div>
        </Chapter>

        <Chapter id="approfondimenti" label="Approfondimenti" tier="T4" index={4} mobileOrder={MOBILE_ORDER.d4} collapsible
          aside={<span className="kt-caption" style={{ color: PX.ink3 }}>Equity &amp; Access · LIFE Diversity &amp; Care Economy · glossario</span>}>
          {/* Equity & Access Intelligence™ */}
          {equityAccess && (
            <div className="mt-6">
              <SectionLabel>Equity & Access Intelligence™</SectionLabel>
              <div style={{
                background:   TOKENS.surface,
                border:       TOKENS.cardBorder,
                borderRadius: TOKENS.cardRadius,
                overflow:     'hidden',
                marginTop:    16,
              }}>
                <div style={{ padding: '0.875rem 1.25rem', borderBottom: TOKENS.cardBorder, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <p style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '13px', color: TOKENS.ink, flex: 1 }}>
                    Distribuzione attivazione per segmento
                  </p>
                  {equityAccess.accessRiskLevel !== 'insufficient_data' && (
                    <span style={{
                      fontSize: '10px', fontWeight: 600, borderRadius: 4, padding: '2px 8px',
                      background: equityAccess.accessRiskLevel === 'alta' ? TOKENS.safeguard.cap.bg
                        : equityAccess.accessRiskLevel === 'media' ? TOKENS.safeguard.watch.bg
                        : TOKENS.safeguard.pass.bg,
                      color: equityAccess.accessRiskLevel === 'alta' ? TOKENS.safeguard.cap.text
                        : equityAccess.accessRiskLevel === 'media' ? TOKENS.safeguard.watch.text
                        : TOKENS.safeguard.pass.text,
                    }}>
                      Rischio equità: {equityAccess.accessRiskLevel}
                    </span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 500, background: 'rgba(6,3,43,0.05)', color: TOKENS.inkHint, borderRadius: 4, padding: '2px 8px' }}>
                    {eqCode} = {Math.round(equityAccess.eqValue * 100)}%
                  </span>
                </div>
                <div style={{ padding: '1rem 1.25rem' }}>
                  {equityAccess.accessRiskLevel === 'insufficient_data' ? (
                    <p style={{ fontSize: '12px', color: TOKENS.inkHint, fontStyle: 'italic' }}>{equityAccess.narrative}</p>
                  ) : (
                    <>
                      {[
                        { label: 'Segmenti sotto-attivati', items: equityAccess.underActivatedSegments, tone: TOKENS.safeguard.cap },
                        { label: 'Segmenti in parità', items: equityAccess.nearParitySegments, tone: null },
                        { label: 'Segmenti sovra-attivati', items: equityAccess.overActivatedSegments, tone: TOKENS.safeguard.pass },
                      ].filter(({ items }) => items.length > 0).map(({ label, items, tone }) => (
                        <div key={label} style={{ marginBottom: '0.875rem' }}>
                          <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: TOKENS.inkHint, marginBottom: 6 }}>{label}</p>
                          {items.map((seg) => (
                            <div key={seg.segmentId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 5, marginBottom: 3, background: 'rgba(6,3,43,0.02)', border: `1px solid rgba(6,3,43,0.06)` }}>
                              <p style={{ flex: 1, fontSize: '12px', color: TOKENS.ink, fontWeight: 500 }}>{seg.segmentLabel}</p>
                              <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, fontVariantNumeric: 'tabular-nums' }}>
                                {Math.round(seg.activationRate * 100)}%
                              </p>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: tone?.text ?? TOKENS.inkSecondary, background: tone?.bg ?? 'rgba(6,3,43,0.05)', borderRadius: 4, padding: '1px 6px' }}>
                                {seg.gapVsAverage >= 0 ? '+' : ''}{Math.round(seg.gapVsAverage * 100)}pp
                              </span>
                            </div>
                          ))}
                        </div>
                      ))}
                      {equityAccess.suppressedSegmentCount > 0 && (
                        <p style={{ fontSize: '11px', color: TOKENS.inkHint, fontStyle: 'italic', marginBottom: 8 }}>
                          {equityAccess.suppressedSegmentCount} {equityAccess.suppressedSegmentCount === 1 ? 'segmento' : 'segmenti'} non visibili (N &lt; 10, soglia privacy).
                        </p>
                      )}
                      <p style={{ fontSize: '12px', color: TOKENS.inkSecondary, lineHeight: 1.65, marginTop: 8 }}>
                        {equityAccess.narrative}
                      </p>
                      {equityAccess.recommendations.length > 0 && (
                        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column' as const, gap: 5 }}>
                          {equityAccess.recommendations.map((rec, i) => (
                            <div key={i} style={{ display: 'flex', gap: 6, padding: '7px 10px', background: 'rgba(6,3,43,0.03)', borderRadius: 6, border: `1px solid rgba(6,3,43,0.07)` }}>
                              <span style={{ color: TOKENS.inkHint, fontSize: '12px', flexShrink: 0, marginTop: 1 }}>›</span>
                              <p style={{ fontSize: '11px', color: TOKENS.ink, lineHeight: 1.55 }}>{rec}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p style={{ padding: '8px 14px', fontSize: '10px', color: TOKENS.inkHint, borderTop: TOKENS.cardBorder, fontStyle: 'italic' }}>
                  Equity & Access Intelligence™ · pre_empirical_calibration · non modifica EQS né KORA Index™ · not_kora_index_component
                </p>
              </div>
            </div>
          )}
          <div className="mt-6">
            <SectionLabel>Glossario metodologico</SectionLabel>
            <div className="mt-4">
              <MethodologyGlossary />
            </div>
          </div>
        </Chapter>

      </div>
      </Priority>

      {/* ── Reference line — non-suppressible, last on every width ─────────── */}
      <Priority order={MOBILE_ORDER.reference}>
        <div style={{ marginTop: 48 }}>
          {/* The reference layer is canvas, caption typography, no card and no
              coloured pill. `MethodologyBadge` renders `calibration_status` as an
              amber pill; it is shared with /company/reports, which is approved
              and must not be reopened, so this surface states the same
              non-suppressible values as quiet text rather than changing it. */}
          <p className="kt-caption" style={{ color: PX.inkMute, maxWidth: '88ch' }}>
            {output.methodology_version_id} · metodologia KORA v0.1 · {output.calibration_status} ·
            periodo {output.reporting_period} · N≥10 ·
            Libreria verdetti {verdict.libraryVersion} · correlazione ≠ causalità ·
            KORA supporta la rendicontazione CSR/ESG fornendo evidenze people strutturate,
            verificate e spiegabili. Non garantisce conformità normativa e non sostituisce
            consulenza ESG, legale, fiscale, assurance o reporting obbligatorio.
          </p>
        </div>
      </Priority>

    </div>
  );
}
