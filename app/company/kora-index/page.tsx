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
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService }       from '@/services/explainability/ExplainabilityService';
import { budgetToHumanImpactService }  from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { ingestionSimulatorService }   from '@/services/ingestion-simulator/IngestionSimulatorService';
import { accountProvisioningService }  from '@/services/account/AccountProvisioningService';
import { tenantService }               from '@/services/tenant/TenantService';
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
