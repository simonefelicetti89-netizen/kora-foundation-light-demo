'use client';

import { useDemoState } from '@/lib/demo-state';
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService }       from '@/services/explainability/ExplainabilityService';
import { budgetToHumanImpactService }  from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { ingestionSimulatorService }   from '@/services/ingestion-simulator/IngestionSimulatorService';
import { accountProvisioningService }  from '@/services/account/AccountProvisioningService';
import { tenantService }               from '@/services/tenant/TenantService';
import { formatConfidenceScore }       from '@/lib/formatters';
import { TOKENS }                      from '@/lib/design/kora-design-tokens';
import type { MacroblockScore }        from '@/lib/types';

// ── Shared components — reused from cockpit ────────────────────────────────────
import { PageMasthead }    from '@/components/ui/PageMasthead';
import { DecisionContext }  from '@/components/ui/DecisionContext';
import { SectionLabel }    from '@/components/ui/SectionLabel';
import { IndexRingCard }   from '@/components/company/cockpit/IndexRingCard';
import { ProvenanceFooter } from '@/components/company/cockpit/ProvenanceFooter';

// ── Restored analytical panels ─────────────────────────────────────────────────
import { MacroblockCard }          from '@/components/kora-index/MacroblockCard';
import { KoraIndexBuildCard }      from '@/components/kora-index/KoraIndexBuildCard';
import { ComponentBreakdown }      from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart } from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown }     from '@/components/kora-index/ConfidenceBreakdown';
import { ExplainabilityPanel }     from '@/components/kora-index/ExplainabilityPanel';
import { EligibilityGatePanel }    from '@/components/kora-index/EligibilityGatePanel';
import { EconomicReliefPanel }     from '@/components/kora-index/EconomicReliefPanel';
import { BlockedByDesignPanel }    from '@/components/kora-index/BlockedByDesignPanel';
import { BudgetToHumanImpactPanel } from '@/components/kora-index/BudgetToHumanImpactPanel';
import { RecommendationsPanel }    from '@/components/kora-index/RecommendationsPanel';
import { MethodologyGlossary }     from '@/components/kora-index/MethodologyGlossary';

// ── Local: S1/S2 scenario strip ───────────────────────────────────────────────

const SAFEGUARD_STYLE: Record<string, { bg: string; text: string }> = {
  CLEAR:   { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text  },
  WARNING: { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text },
  FLAGGED: { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text   },
};

function ScenarioStrip({ activeScenario, s1Output, s2Output }: {
  activeScenario: string;
  s1Output: { kora_index_value: number; safeguard_status: string; confidence_score: number } | null;
  s2Output: { kora_index_value: number; safeguard_status: string; confidence_score: number } | null;
}) {
  const scenarios = [{ id: 'S1', out: s1Output }, { id: 'S2', out: s2Output }] as const;
  return (
    <div className="flex flex-col p-6 space-y-4" style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}>
      {/* §3 — eyebrow Inter non mono */}
      <p className="uppercase" style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '11px', letterSpacing: '0.08em', color: TOKENS.inkHint }}>
        Confronto scenari · solo demo
      </p>
      <div className="grid grid-cols-2 gap-3 flex-1">
        {scenarios.map(({ id, out }) => {
          if (!out) return null;
          const isActive = id === activeScenario;
          const ss = SAFEGUARD_STYLE[out.safeguard_status] ?? SAFEGUARD_STYLE['WARNING'];
          return (
            <div
              key={id}
              className="rounded-[10px] p-4"
              style={
                isActive
                  ? {
                      background:  TOKENS.surface,
                      border:      `2px solid ${TOKENS.accent}`,
                      borderLeft:  `3px solid ${TOKENS.accent}`,
                    }
                  : { background: TOKENS.inkBorder, border: TOKENS.cardBorder }
              }
            >
              <div className="flex items-center justify-between mb-2">
                {/* §3 — Inter non mono per scenario ID */}
                <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 600, fontSize: '11px', color: isActive ? TOKENS.ink : TOKENS.inkHint }}>{id}</span>
                {/* §6/§7 — chip "Attivo": sentence case, colore violet non verde */}
                {isActive && (
                  <span
                    className="rounded"
                    style={{ fontFamily: 'var(--font-jakarta)', fontSize: '9px', fontWeight: 500, padding: '2px 6px', background: 'rgba(199,111,61,0.10)', color: TOKENS.accent }}
                  >
                    Attivo
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 700, fontSize: '28px', color: TOKENS.ink, letterSpacing: '-0.025em', lineHeight: 1 }}>{out.kora_index_value}</span>
                <span style={{ fontSize: '11px', color: TOKENS.inkHint }}>/100</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {/* Safeguard pill — Inter, sentence case */}
                <span
                  className="rounded"
                  style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '9px', padding: '2px 6px', background: ss.bg, color: ss.text }}
                >
                  {out.safeguard_status.charAt(0) + out.safeguard_status.slice(1).toLowerCase()}
                </span>
                <span style={{ fontSize: '10px', color: TOKENS.inkHint }}>CS {formatConfidenceScore(out.confidence_score)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '10.5px', color: TOKENS.inkSecondary, lineHeight: 1.5 }}>
        Confidence Score esterno al KORA Index v3 — indicatore di affidabilità dati, non componente pesato.
      </p>
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

// ── Page ──────────────────────────────────────────────────────────────────────

// C-02: KORA Index Detail — v3
export default function KoraIndexDetail() {
  const { activeScenario, activeRole } = useDemoState();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID  = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(COMPANY_ID);

  const { data: scoring }                        = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const { s1: scoringS1, s2: scoringS2, isDemo } = useDemoScenarioComparison(COMPANY_ID);

  const hasKoraData = scoring?.status === 'ok';

  if (!hasKoraData) {
    return (
      <div className="space-y-5">
        <PageMasthead
          eyebrow="KORA Index™ v3 · Scomposizione analitica"
          title={tenant?.company_name ?? COMPANY_ID}
          subline="Scomposizione analitica dell'indice"
        />
        <div className="rounded-2xl px-7 py-6 space-y-3"
          style={{ background: 'rgba(186,117,23,0.07)', border: '1px solid rgba(186,117,23,0.20)' }}>
          <p className="text-sm font-semibold" style={{ color: '#5C3509' }}>KORA Index non ancora disponibile</p>
          <p className="text-xs leading-relaxed" style={{ color: '#7A4A1A' }}>
            Il KORA Index sarà disponibile al termine della pipeline dati. Questa azienda non ha ancora completato il caricamento dati.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-2" style={{ borderTop: '1px solid rgba(186,117,23,0.15)' }}>
            {[
              ['Onboarding',      tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
              ['Readiness dati',  tenant?.data_readiness_status ?? '—'],
              ['Decision Pack',   tenant?.decision_pack_status ?? '—'],
              ['Prossima azione', tenant ? tenantService.getNextAction(tenant) : 'Contatta KORA Admin'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p style={{ color: '#854F0B' }}>{label}</p>
                <p className="font-semibold mt-0.5" style={{ color: '#5C3509' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const output      = scoring!.koraIndex!;
  const aggregate   = scoring!.aggregate;
  const confidence  = scoring!.confidence;
  const safeguard   = activationSafeguardService.evaluateFromSeed(COMPANY_ID, activeScenario);
  const explanation = explainabilityService.getExplanation(COMPANY_ID, activeScenario);
  const weakCodes   = (explanation?.weak_components ?? []).map((c) => c.code);

  const macroblocks: MacroblockScore[] = output.macroblocks ?? [];

  const s1Output    = scoringS1?.koraIndex ?? null;
  const s2Output    = scoringS2?.koraIndex ?? null;
  const s1Mbs: MacroblockScore[] = scoringS1?.koraIndex?.macroblocks ?? [];

  const s1BtiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S1', activeRole);
  const s2BtiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S2', activeRole);
  const s1BtiRecord = s1BtiResult.record;
  const s2BtiRecord = s2BtiResult.record;

  const s1EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S1', activeRole);
  const s2EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S2', activeRole);

  const btiRecommendations = budgetToHumanImpactService.getRecommendations(COMPANY_ID, activeScenario, activeRole);
  const eligibilityGate    = ingestionSimulatorService.getEligibilityGateSummary(COMPANY_ID, activeScenario);

  const s1BtiScore = s1Mbs.find((m) => m.code === 'BTI')?.score;
  const s2BtiScore = (scoringS2?.koraIndex?.macroblocks ?? []).find((m) => m.code === 'BTI')?.score;

  return (
    <div className="space-y-5">

      {/* 1. Masthead */}
      <PageMasthead
        eyebrow={`KORA Index™ v3 · ${output.reporting_period}`}
        title={tenant?.company_name ?? COMPANY_ID}
        subline="Scomposizione analitica dell'indice"
      />
      <DecisionContext
        question="Come si costruisce il punteggio, cosa lo vincola e cosa lo può migliorare?"
        boundary="Foundation Light v0.1 · pre_empirical_calibration · Confidence Score™ esterno al KORA Index™"
      />

      {/* ── GRUPPO PRIMARIO — Indice, macroblocchi, componenti ────────────────── */}

      {/* 2. Hero: IndexRing + ScenarioStrip side by side (demo only) — §9 items-stretch */}
      {isDemo && (s1Output ?? s2Output) ? (
        <div className="grid grid-cols-2 gap-4 items-stretch">
          <IndexRingCard
            value={output.kora_index_value}
            safeguardStatus={output.safeguard_status}
            confidenceScore={output.confidence_score}
          />
          <ScenarioStrip activeScenario={activeScenario} s1Output={s1Output} s2Output={s2Output} />
        </div>
      ) : (
        <IndexRingCard
          value={output.kora_index_value}
          safeguardStatus={output.safeguard_status}
          confidenceScore={output.confidence_score}
        />
      )}

      {/* 3. Macroblock cards — §8 subgrid alignment via gap-x/gap-y split */}
      <SectionLabel>Architettura macroblocchi</SectionLabel>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
        {macroblocks.map((mb) => {
          const prevScore = activeScenario === 'S2' ? s1Mbs.find((m) => m.code === mb.code)?.score : undefined;
          return <MacroblockCard key={mb.code} macroblock={mb} previousScore={prevScore} />;
        })}
      </div>

      {/* 4. Vincolo primario + CTA anchor verso la derivazione */}
      <div
        className="flex items-center justify-between gap-4 flex-wrap"
        style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius, padding: '0.875rem 1.125rem' }}
      >
        <p style={{ fontSize: '12px', color: TOKENS.ink }}>
          <span style={{ fontFamily: 'var(--font-jakarta)', fontWeight: 500, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: TOKENS.inkHint, marginRight: 10 }}>
            Vincolo primario
          </span>
          {explanation?.weak_components[0]
            ? `${explanation.weak_components[0].label} · ${explanation.weak_components[0].code}`
            : 'Nessun vincolo critico rilevato'}
        </p>
        <a
          href="#componenti"
          style={{ flexShrink: 0, fontSize: '12px', fontWeight: 600, color: TOKENS.accent, textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          Vedi i 10 componenti →
        </a>
      </div>

      {/* ── GRUPPO SECONDARIO — Componenti, pipeline, eligibility, safeguard, BTI ── */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.10)', marginTop: '2.5rem', paddingTop: '2.5rem' }}>

        {/* 5. 10 componenti analitici — spostati dal gruppo primario */}
        <div id="componenti" className="scroll-mt-24">
          <SectionLabel>10 componenti analitici</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <ComponentBreakdownChart components={output.components} weakCodes={weakCodes} />
            <ComponentBreakdown components={output.components} />
          </div>
        </div>

        {/* 6. Pipeline build card — full width */}
        <div className="mt-6">
          <SectionLabel>Pipeline di costruzione</SectionLabel>
          <div className="mt-4">
            <KoraIndexBuildCard output={output} safeguard={safeguard} aggregate={aggregate} />
          </div>
        </div>

        {/* 7. Eligibility gate — full width */}
        <div className="mt-6">
          <SectionLabel>Eligibility gate</SectionLabel>
          <div className="mt-4">
            <EligibilityGatePanel summary={eligibilityGate} />
          </div>
        </div>

        {/* 7. Economic relief + Blocked — 2 col */}
        <div className="mt-6">
          <SectionLabel>Economic relief & compliance</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <EconomicReliefPanel s1={s1EconRelief} s2={s2EconRelief} s1BtiScore={s1BtiScore} s2BtiScore={s2BtiScore} />
            <BlockedByDesignPanel blockedCount={eligibilityGate.blocked_count} blockedNote={eligibilityGate.blocked_note} />
          </div>
        </div>

        {/* 8. BTI table — full width */}
        <div className="mt-6">
          <SectionLabel>Budget-to-Human-Impact</SectionLabel>
          <div className="mt-4">
            <BudgetToHumanImpactPanel s1={s1BtiRecord ?? undefined} s2={s2BtiRecord ?? undefined} />
          </div>
        </div>

        {/* 10. Safeguard + Confidence — 2 col */}
        <div className="mt-6">
          <SectionLabel>Safeguard & confidence</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-2 mt-4">
            <ActivationSafeguardPanel result={safeguard} explanation={explanation?.safeguard_explanation} />
            <ConfidenceBreakdown record={confidence} />
          </div>
        </div>

      </div>

      {/* ── GRUPPO REFERENZA — Raccomandazioni, spiegabilità, glossario ─────────── */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.10)', marginTop: '2.5rem', paddingTop: '2.5rem' }}>

        <p
          style={{
            fontFamily:    'var(--font-jakarta)',
            fontWeight:    500,
            fontSize:      '10px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color:         'rgba(6,3,43,0.30)',
            marginBottom:  '1.25rem',
          }}
        >
          Appendice metodologica
        </p>

        {/* 9. Recommendations — full width */}
        <SectionLabel>Raccomandazioni</SectionLabel>
        <div className="mt-4">
          <RecommendationsPanel btiRecommendations={btiRecommendations} />
        </div>

        {/* 11. Explainability — full width */}
        <div className="mt-6">
          <SectionLabel>Spiegabilità del punteggio</SectionLabel>
          <div className="mt-4">
            <ExplainabilityPanel record={explanation} />
          </div>
        </div>

        {/* 12. Glossary — full width, collapsible */}
        <div className="mt-6">
          <MethodologyGlossary />
        </div>

      </div>

      {/* 13. Provenance footer */}
      <ProvenanceFooter
        methodologyVersionId={output.methodology_version_id}
        calibrationStatus={output.calibration_status}
        reportingPeriod={output.reporting_period}
      />

    </div>
  );
}
