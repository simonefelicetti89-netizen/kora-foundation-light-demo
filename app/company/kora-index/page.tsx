'use client';

// C-02: KORA Index™ — scomposizione analitica del punteggio.
// Scopo: rispondere a "come si costruisce il punteggio, cosa lo vincola
//        e cosa lo può migliorare?" — la domanda decisionale di un HR/CFO.
// Struttura: Hero Diagnosis → Score Drivers → Board Actions → Technical Breakdown.
// Significato prima dei numeri. Verdetto prima dei componenti.
// Explainer compact su ogni metrica non autoesplicativa.

import { useDemoState } from '@/lib/demo-state';
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { useCompanySession } from '../_providers/CompanySessionProvider';
import { activationSafeguardService }           from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService }                from '@/services/explainability/ExplainabilityService';
import { budgetToHumanImpactService }           from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { ingestionSimulatorService }            from '@/services/ingestion-simulator/IngestionSimulatorService';
import { accountProvisioningService }           from '@/services/account/AccountProvisioningService';
import { tenantService }                        from '@/services/tenant/TenantService';
import { equityAccessIntelligenceService }      from '@/services/equity-access/EquityAccessIntelligenceService';
import { evidenceReliabilityIntelligenceService } from '@/services/evidence-reliability/EvidenceReliabilityIntelligenceService';
import { workforceBaselineService }             from '@/services/workforce-baseline/WorkforceBaselineService';
import { uefReviewService }                     from '@/services/uef-review/UEFReviewService';
import { TOKENS }                      from '@/lib/design/kora-design-tokens';
import type { MacroblockScore }        from '@/lib/types';

// ── Narrative components — FIRST ──────────────────────────────────────────────
import { HeroDiagnosis, generateDiagnosisSentence } from '@/components/kora-index/HeroDiagnosis';
import { ScoreDrivers }    from '@/components/kora-index/ScoreDrivers';
import { BoardActions }    from '@/components/kora-index/BoardActions';

// ── UI primitives ─────────────────────────────────────────────────────────────
import { PageMasthead }    from '@/components/ui/PageMasthead';
import { SectionLabel }    from '@/components/ui/SectionLabel';
import { Explainer }       from '@/components/ui/Explainer';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';
import { TM }              from '@/components/ui/TM';

// ── Explainer definitions — cosa misura / come si legge ──────────────────────
// Per COPY_GUIDE: ogni metrica non autoesplicativa deve avere un Explainer.
const EXP = {
  koraIndex: {
    what: 'Efficacia complessiva nel convertire iniziative people in attivazione verificata, distribuita e significativa.',
    how:  '0–100. ≥70 = solido; 50–69 = in sviluppo; <50 = intervento necessario. Il punteggio è a livello organizzazione, mai individuale.',
  },
  cs: {
    what: 'Qualità e completezza delle fonti dati usate nel calcolo del KORA Index™.',
    how:  'Esterno al KORA Index™ (peso = 0). Non misura impatto: segnala affidabilità. Più alto = fonti più solide e verificabili.',
  },
  safeguard: {
    what: 'Gate interpretativo che verifica se i requisiti minimi di attivazione sono soddisfatti.',
    how:  'CLEAR = soglie rispettate. WARNING = sotto i minimi. FLAGGED = intervento urgente. Non è una componente del punteggio.',
  },
  reach: {
    what: 'Misura se l\'attivazione raggiunge una quota significativa della popolazione aziendale.',
    how:  'Basso reach = la maggior parte della workforce non è mai stata attivata nel periodo.',
  },
  quality: {
    what: 'Misura se le azioni generano attivazione profonda, verificata, addizionale e continua.',
    how:  'Bassa quality = il programma esiste ma l\'attivazione è superficiale o non sostenuta.',
  },
  equity: {
    what: 'Misura se valore e attivazione sono distribuiti tra lavoratori, sedi, reparti e cluster demografici.',
    how:  'Bassa equity = l\'attivazione è concentrata su un subset privilegiato della workforce.',
  },
  bti: {
    what: 'Misura quanto efficacemente il budget welfare si converte in attivazione umana reale.',
    how:  'Basso BTI™ = alta quota di budget va in economic relief o compliance, non in attivazione profonda.',
  },
  eligibility: {
    what: 'Classifica ogni record come Eligible (genera IU), Limited (economic relief, 0 IU) o Blocked (compliance, 0 IU).',
    how:  'Solo i record Eligible contribuiscono al KORA Index™. Blocked e Limited sono tracciati nel BTI™.',
  },
  confidence: {
    what: 'Dettaglio delle fonti che compongono il Confidence Score™: completezza, verifica, qualità.',
    how:  'CS basso = fonti autodichiarate o incomplete. Non impatta il KORA Index™ ma segnala fragilità dell\'output.',
  },
} as const;

// ── Technical breakdown components — LAST ────────────────────────────────────
import { MacroblockCard }           from '@/components/kora-index/MacroblockCard';
import { KoraIndexBuildCard }       from '@/components/kora-index/KoraIndexBuildCard';
import { ComponentBreakdown }       from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart }  from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown }      from '@/components/kora-index/ConfidenceBreakdown';
import { ExplainabilityPanel }      from '@/components/kora-index/ExplainabilityPanel';
import { EligibilityGatePanel }     from '@/components/kora-index/EligibilityGatePanel';
import { EconomicReliefPanel }      from '@/components/kora-index/EconomicReliefPanel';
import { BlockedByDesignPanel }     from '@/components/kora-index/BlockedByDesignPanel';
import { BudgetToHumanImpactPanel } from '@/components/kora-index/BudgetToHumanImpactPanel';
import { RecommendationsPanel }     from '@/components/kora-index/RecommendationsPanel';
import { MethodologyGlossary }      from '@/components/kora-index/MethodologyGlossary';

// ── Section divider ──────────────────────────────────────────────────────────

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

// ── No-data state ─────────────────────────────────────────────────────────────

function NoDataState({ tenantId }: { tenantId: string }) {
  const tenant = tenantService.getTenant(tenantId);
  return (
    <div className="space-y-5">
      <PageMasthead
        eyebrow="KORA Index™ v3 · Scomposizione analitica"
        title={tenant?.company_name ?? tenantId}
        subline="Il KORA Index™ sarà disponibile al termine della pipeline dati."
      />
      <div style={{
        background:   'rgba(186,117,23,0.07)',
        border:       '1px solid rgba(186,117,23,0.20)',
        borderRadius: TOKENS.cardRadius,
        padding:      '24px 28px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#5C3509', marginBottom: 8 }}>
          Dati non ancora disponibili
        </p>
        <p style={{ fontSize: '12px', color: '#7A4A1A', lineHeight: 1.6, maxWidth: 480 }}>
          Completa il data intake e la review delle evidenze per generare il KORA Index™.
          Contatta il tuo referente KORA per procedere.
        </p>
        {tenant && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(186,117,23,0.15)' }}>
            {[
              ['Onboarding',      tenant.onboarding_status.replace(/_/g, ' ')],
              ['Data readiness',  tenant.data_readiness_status],
              ['Decision Pack',   tenant.decision_pack_status],
              ['Prossima azione', tenantService.getNextAction(tenant)],
            ].map(([l, v]) => (
              <div key={l as string}>
                <p style={{ fontSize: '10px', fontWeight: 600, color: '#854F0B' }}>{l}</p>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#5C3509', marginTop: 2 }}>{v}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KoraIndexDetail() {
  const { isLive, tenantId: liveId, sessionLoading } = useCompanySession();
  const { activeScenario, activeRole } = useDemoState();

  // B59: When a real company session is detected, use live tenantId.
  // Otherwise use the demo user's company_id (Meridiana seed).
  const demoUser   = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID = isLive ? (liveId ?? 'meridiana-group') : (demoUser.company_id ?? 'meridiana-group');
  const tenant     = isLive ? null : tenantService.getTenant(COMPANY_ID);

  const { data: scoring, loading } = useScoringResult({
    tenantId:         COMPANY_ID,
    scenarioId:       activeScenario,
    forceEnvironment: isLive ? 'live' : undefined,
  });

  // S1/S2 scenario comparison is demo-only — live tenants have a single current period.
  const { s1: scoringS1, s2: scoringS2, isDemo } = useDemoScenarioComparison(COMPANY_ID);

  // While session detection is in progress, show nothing until we know the mode.
  if (sessionLoading || (loading && isLive)) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: 'rgba(6,3,43,0.40)' }}>Caricamento in corso…</p>
      </div>
    );
  }

  const hasKoraData = scoring?.status === 'ok';
  if (!hasKoraData) return <NoDataState tenantId={COMPANY_ID} />;

  const output     = scoring!.koraIndex!;
  const aggregate  = scoring!.aggregate;
  const confidence = scoring!.confidence;

  // Activation Safeguard: for live sessions compute from real AR/MAR;
  // for demo sessions read from the seed fixture.
  const safeguard = isLive
    ? activationSafeguardService.evaluate(
        aggregate?.activation_rate ?? 0,
        aggregate?.meaningful_activation_rate ?? 0,
      )
    : (activationSafeguardService.evaluateFromSeed(COMPANY_ID, activeScenario) ??
       activationSafeguardService.evaluate(
         aggregate?.activation_rate ?? 0,
         aggregate?.meaningful_activation_rate ?? 0,
       ));

  // Explainability — demo seed only; null for live sessions.
  const explanation = isLive ? null : explainabilityService.getExplanation(COMPANY_ID, activeScenario);
  const weakCodes   = (explanation?.weak_components ?? []).map((c) => c.code);

  const macroblocks: MacroblockScore[] = output.macroblocks ?? [];
  const s1Mbs: MacroblockScore[] = scoringS1?.koraIndex?.macroblocks ?? [];

  // BTI panels — demo seed only; null for live sessions.
  const s1BtiResult = isLive ? { record: null } : budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S1', activeRole);
  const s2BtiResult = isLive ? { record: null } : budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S2', activeRole);
  const s1BtiScore  = isLive ? macroblocks.find((m) => m.code === 'BTI')?.score
                              : s1Mbs.find((m) => m.code === 'BTI')?.score;
  const s2BtiScore  = isLive ? undefined
                              : (scoringS2?.koraIndex?.macroblocks ?? []).find((m) => m.code === 'BTI')?.score;

  const btiRecommendations = isLive ? [] : budgetToHumanImpactService.getRecommendations(COMPANY_ID, activeScenario, activeRole);

  // B69-B: Equity & Access Intelligence™ — near EQ component
  const eqValue         = output.components.find((c) => c.code === 'EQ')?.value ?? 0;
  const visibleGroups   = isLive ? undefined : workforceBaselineService.getVisibleGroups(COMPANY_ID);
  const equityAccess    = equityAccessIntelligenceService.compute(aggregate ?? null, eqValue, activeRole, visibleGroups);

  // B69-B: Evidence Reliability Intelligence™ — near Safeguard & Confidence
  const uefSummary     = isLive ? null : uefReviewService.getReviewSummary();
  const evidenceReliability = evidenceReliabilityIntelligenceService.compute(null, uefSummary, confidence ?? null, activeRole);

  const eligibilityGate    = isLive
    ? { eligible_count: 0, limited_count: 0, blocked_count: 0, total_count: 0, blocked_note: '', high_confidence_count: 0, ready_for_index_count: 0, limited_note: '', eligible_row_count: 0, total_row_count: 0 }
    : ingestionSimulatorService.getEligibilityGateSummary(COMPANY_ID, activeScenario);

  const s1EconRelief = isLive ? null : budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S1', activeRole);
  const s2EconRelief = isLive ? null : budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S2', activeRole);

  // Generate diagnosis sentence — pure frontend, works for both live and demo.
  const diagnosisSentence = generateDiagnosisSentence(
    output.kora_index_value,
    output.safeguard_status,
    aggregate?.activation_rate ?? 0,
    explanation?.weak_components[0]?.code,
  );

  // Board actions — demo seed only; empty for live.
  const boardActions = isLive ? [] : explainabilityService
    .getNextBestActions(COMPANY_ID, activeScenario)
    .slice(0, 3)
    .map((a, i) => ({
      priority: i + 1,
      action:   a.action,
      detail:   a.detail,
      signal:   undefined as string | undefined,
      effort:   undefined as string | undefined,
    }));

  return (
    <div style={{ maxWidth: 900 }}>

      {/* ── Page header — minimal, company name only ── */}
      <div style={{ marginBottom: 28 }}>
        <p style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    600,
          fontSize:      '10px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color:         TOKENS.accent,
          marginBottom:  8,
        }}>
          <TM>KORA Index</TM> v3 · Intelligence analitica
        </p>
        <h1 style={{
          fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontSize:    'clamp(1.75rem, 3vw, 2.25rem)',
          fontWeight:  400,
          color:       TOKENS.ink,
          letterSpacing: '-0.02em',
          lineHeight:  1.08,
        }}>
          {tenant?.company_name ?? (isLive ? 'La tua organizzazione' : COMPANY_ID)}
        </h1>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: HERO DIAGNOSIS — first thing user sees         */}
      {/* ══════════════════════════════════════════════════════════ */}

      <HeroDiagnosis
        value={output.kora_index_value}
        safeguardStatus={output.safeguard_status}
        confidenceScore={output.confidence_score}
        diagnosisSentence={diagnosisSentence}
        reportingPeriod={output.reporting_period}
        methodologyVersion={output.methodology_version_id}
        calibrationStatus={output.calibration_status}
      />

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 2: SCORE DRIVERS — what is limiting the score     */}
      {/* ══════════════════════════════════════════════════════════ */}

      {explanation?.weak_components.length ? (
        <div style={{ marginTop: 28 }}>
          <ScoreDrivers
            weakComponents={explanation.weak_components}
            macroblockScores={Object.fromEntries(macroblocks.map((m) => [m.code, m.score]))}
          />
        </div>
      ) : null}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 3: BOARD ACTIONS — what to decide                 */}
      {/* ══════════════════════════════════════════════════════════ */}

      {boardActions.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <BoardActions actions={boardActions} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 4: SCENARIO COMPARISON (demo only)                */}
      {/* ══════════════════════════════════════════════════════════ */}

      {isDemo && (scoringS1 ?? scoringS2) && (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              background:   TOKENS.surface,
              border:       TOKENS.cardBorder,
              borderRadius: TOKENS.cardRadius,
              padding:      '20px 24px',
              boxShadow:    TOKENS.cardShadow,
            }}
          >
            <p style={{
              fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              fontWeight:    600,
              fontSize:      '10px',
              letterSpacing: '0.09em',
              textTransform: 'uppercase',
              color:         TOKENS.inkHint,
              marginBottom:  14,
            }}>
              Confronto scenari · solo demo
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[{ id: 'S1', out: scoringS1?.koraIndex }, { id: 'S2', out: scoringS2?.koraIndex }].map(({ id, out }) => {
                if (!out) return null;
                const isActive = id === activeScenario;
                const ss = id === 'S1'
                  ? { bg: out.safeguard_status === 'CLEAR' ? TOKENS.safeguard.pass.bg : TOKENS.safeguard.watch.bg, text: out.safeguard_status === 'CLEAR' ? TOKENS.safeguard.pass.text : TOKENS.safeguard.watch.text }
                  : { bg: TOKENS.safeguard.pass.bg, text: TOKENS.safeguard.pass.text };
                return (
                  <div
                    key={id}
                    style={{
                      borderRadius: 12,
                      padding:      '16px',
                      background:   isActive ? TOKENS.ink : TOKENS.taupe,
                      border:       isActive ? `1px solid rgba(255,255,255,0.08)` : TOKENS.cardBorder,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 600, fontSize: '11px', color: isActive ? '#FFF' : TOKENS.ink }}>
                        {id === 'S1' ? 'Stato attuale' : 'Post-intervento'}
                      </span>
                      {isActive && (
                        <span style={{ borderRadius: 999, padding: '2px 8px', background: TOKENS.accentSoft, color: TOKENS.accent, fontSize: '9px', fontWeight: 700 }}>
                          Attivo
                        </span>
                      )}
                    </div>
                    <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontWeight: 700, fontSize: '30px', color: isActive ? '#FFF' : TOKENS.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>
                      {Math.round(out.kora_index_value)}
                      <span style={{ fontSize: '14px', color: isActive ? 'rgba(255,255,255,0.35)' : TOKENS.inkHint, marginLeft: 4 }}>/100</span>
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                      <span style={{ borderRadius: 999, padding: '3px 10px', background: ss.bg, color: ss.text, fontSize: '10px', fontWeight: 600 }}>
                        {out.safeguard_status}
                      </span>
                      <span style={{ fontSize: '10px', color: isActive ? 'rgba(255,255,255,0.40)' : TOKENS.inkHint }}>
                        CS {Math.round(out.confidence_score * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ fontFamily: 'Plus Jakarta Sans, var(--font-jakarta)', fontSize: '10.5px', color: TOKENS.inkSecondary, lineHeight: 1.5, marginTop: 12 }}>
              Confidence Score™ esterno al <TM>KORA Index</TM> v3 — indicatore di affidabilità dati, non componente pesato.
            </p>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 5: TECHNICAL BREAKDOWN — after the narrative      */}
      {/* ══════════════════════════════════════════════════════════ */}

      <Divider label="Scomposizione tecnica — macroblocchi e componenti" />

      {/* Macroblock grid */}
      <SectionLabel>4 macroblocchi</SectionLabel>
      {/* Explainer: ogni macroblocco pesa differentemente sul KORA Index™ */}
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 mt-4">
        {macroblocks.map((mb) => {
          const prevScore = activeScenario === 'S2' ? s1Mbs.find((m) => m.code === mb.code)?.score : undefined;
          return <MacroblockCard key={mb.code} macroblock={mb} previousScore={prevScore} />;
        })}
      </div>

      {/* 10 components */}
      <div className="mt-6" id="componenti">
        <SectionLabel>10 componenti analitici</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <ComponentBreakdownChart components={output.components} weakCodes={weakCodes} />
          <ComponentBreakdown components={output.components} />
        </div>
      </div>

      {/* Equity & Access Intelligence™ — explains EQ component */}
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
            {/* Header */}
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
                EQ = {Math.round(equityAccess.eqValue * 100)}%
              </span>
            </div>

            <div style={{ padding: '1rem 1.25rem' }}>
              {equityAccess.accessRiskLevel === 'insufficient_data' ? (
                <p style={{ fontSize: '12px', color: TOKENS.inkHint, fontStyle: 'italic' }}>{equityAccess.narrative}</p>
              ) : (
                <>
                  {/* Segment list */}
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
              Equity & Access Intelligence™ · pre_empirical_calibration · non modifica EQ né KORA Index™ · not_kora_index_component
            </p>
          </div>
        </div>
      )}

      {/* Pipeline build */}
      <div className="mt-6">
        <SectionLabel>Pipeline di costruzione</SectionLabel>
        <div className="mt-4">
          <KoraIndexBuildCard output={output} safeguard={safeguard} aggregate={aggregate} />
        </div>
      </div>

      {/* Eligibility gate */}
      <div className="mt-6">
        <SectionLabel>Eligibility gate</SectionLabel>
        <div style={{ marginBottom: 12 }}>
          <Explainer {...EXP.eligibility} compact />
        </div>
        <div className="mt-4">
          <EligibilityGatePanel summary={eligibilityGate} />
        </div>
      </div>

      {/* Economic relief + blocked */}
      <div className="mt-6">
        <SectionLabel>Economic relief & compliance</SectionLabel>
        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <EconomicReliefPanel s1={s1EconRelief} s2={s2EconRelief} s1BtiScore={s1BtiScore} s2BtiScore={s2BtiScore} />
          <BlockedByDesignPanel blockedCount={eligibilityGate.blocked_count} blockedNote={eligibilityGate.blocked_note} />
        </div>
      </div>

      {/* BTI */}
      <div className="mt-6">
        <SectionLabel><TM>Budget-to-Human-Impact</TM></SectionLabel>
        <div className="mt-4">
          <BudgetToHumanImpactPanel
            s1={s1BtiResult.record ?? undefined}
            s2={s2BtiResult.record ?? undefined}
          />
        </div>
      </div>

      {/* Safeguard + Confidence */}
      <div className="mt-6">
        <SectionLabel>Safeguard & confidence</SectionLabel>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <Explainer {...EXP.safeguard} compact />
          <Explainer {...EXP.cs} compact />
        </div>
        <div className="grid gap-4 lg:grid-cols-2 mt-4">
          <ActivationSafeguardPanel result={safeguard} explanation={explanation?.safeguard_explanation} />
          <ConfidenceBreakdown record={confidence} />
        </div>

        {/* Evidence Reliability Intelligence™ — explains CS/VR */}
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
              {/* Distribution bar */}
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
              Evidence Reliability Intelligence™ · pre_empirical_calibration · non modifica CS, VR né KORA Index™ · not_kora_index_component · Migliorare l&apos;evidenza può migliorare VR e Data Reliability Index™ — non implica variazione causale del KORA Index™.
            </p>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SECTION 6: EXPLAINABILITY + RECOMMENDATIONS + GLOSSARY    */}
      {/* ══════════════════════════════════════════════════════════ */}

      <Divider label="Spiegabilità, raccomandazioni e metodologia" />

      <div className="mt-4">
        <RecommendationsPanel btiRecommendations={btiRecommendations} />
      </div>

      <div className="mt-6">
        <SectionLabel>Spiegabilità del punteggio</SectionLabel>
        <div className="mt-4">
          <ExplainabilityPanel record={explanation} />
        </div>
      </div>

      <div className="mt-6">
        <MethodologyGlossary />
      </div>

      <ProvenanceFooter
        methodologyVersionId={output.methodology_version_id}
        calibrationStatus={output.calibration_status}
        reportingPeriod={output.reporting_period}
      />

    </div>
  );
}
