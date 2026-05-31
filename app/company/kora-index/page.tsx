'use client';

import { useDemoState } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { KoraIndexBuildCard } from '@/components/kora-index/KoraIndexBuildCard';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart } from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown } from '@/components/kora-index/ConfidenceBreakdown';
import { ExplainabilityPanel } from '@/components/kora-index/ExplainabilityPanel';
import { MacroblockCard } from '@/components/kora-index/MacroblockCard';
import { EligibilityGatePanel } from '@/components/kora-index/EligibilityGatePanel';
import { EconomicReliefPanel } from '@/components/kora-index/EconomicReliefPanel';
import { BlockedByDesignPanel } from '@/components/kora-index/BlockedByDesignPanel';
import { BudgetToHumanImpactPanel } from '@/components/kora-index/BudgetToHumanImpactPanel';
import { RecommendationsPanel } from '@/components/kora-index/RecommendationsPanel';
import { MethodologyGlossary } from '@/components/kora-index/MethodologyGlossary';
import { TrustGovernanceStrip } from '@/components/company/TrustGovernanceStrip';
import { DecisionSignalsPanel } from '@/components/company/DecisionSignalsPanel';
import { PillarConsequenceRow } from '@/components/kora-index/PillarConsequenceRow';
import { KoraLogo } from '@/components/brand/KoraLogo';
import Link from 'next/link';
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { ingestionSimulatorService } from '@/services/ingestion-simulator/IngestionSimulatorService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import type { MacroblockScore, PillarCode } from '@/lib/types';
import { METHODOLOGY_VERSION, CALIBRATION_STATUS } from '@/lib/constants/kora';

const SAFEGUARD_COLOR: Record<string, string> = {
  CLEAR:   '#C8FF47',
  WARNING: '#F59E0B',
  FLAGGED: '#EF4444',
};

// C-02: KORA Index Detail — executive intelligence rebuild
export default function KoraIndexDetail() {
  const { activeScenario, activeRole } = useDemoState();

  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID  = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(COMPANY_ID);

  const { data: scoring } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  const { s1: scoringS1, s2: scoringS2, isDemo } = useDemoScenarioComparison(COMPANY_ID);

  const hasKoraData = scoring?.status === 'ok';

  if (!hasKoraData) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-kora-cosmic-blue/40">KORA Index</p>
          <h1 className="text-xl font-bold text-kora-cosmic-blue mt-0.5">
            {tenant?.company_name ?? COMPANY_ID}
          </h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">KORA Index non ancora disponibile</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Il KORA Index sarà disponibile al termine della pipeline dati (onboarding → UEF Review → Scoring Run).
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {([
              ['Onboarding', tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
              ['Readiness dati', tenant?.data_readiness_status ?? '—'],
              ['Decision Pack', tenant?.decision_pack_status ?? '—'],
              ['Prossima azione', tenant ? tenantService.getNextAction(tenant) : 'Contatta KORA Admin'],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-amber-600">{label}</p>
                <p className="text-amber-800 font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] font-mono text-kora-cosmic-blue/30">
          {METHODOLOGY_VERSION} · {CALIBRATION_STATUS} · synthetic_demo_data: true
        </p>
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

  const s1Output      = scoringS1?.koraIndex ?? null;
  const s2Output      = scoringS2?.koraIndex ?? null;
  const s1Macroblocks: MacroblockScore[] = s1Output?.macroblocks ?? [];
  const s2Macroblocks: MacroblockScore[] = s2Output?.macroblocks ?? [];

  const s1BtiResult  = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S1', activeRole);
  const s2BtiResult  = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S2', activeRole);
  const s1EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S1', activeRole);
  const s2EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S2', activeRole);

  const btiRecommendations = budgetToHumanImpactService.getRecommendations(COMPANY_ID, activeScenario, activeRole);
  const eligibilityGate    = ingestionSimulatorService.getEligibilityGateSummary(COMPANY_ID, activeScenario);

  const s1BtiScore = s1Macroblocks.find((m) => m.code === 'BTI')?.score;
  const s2BtiScore = s2Macroblocks.find((m) => m.code === 'BTI')?.score;

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;
  const safeguardColor = SAFEGUARD_COLOR[output.safeguard_status] ?? '#F59E0B';

  return (
    <div className="space-y-7">

      {/* ── 1. EDITORIAL ANCHOR ────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(155deg, #06032B 0%, #0D0A3B 55%, #080620 100%)' }}
      >
        {/* Watermark brandmark */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 opacity-[0.04]"
          aria-hidden="true"
        >
          <svg viewBox="0 0 424 418" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
            <path
              fillRule="evenodd" clipRule="evenodd"
              d="M148.768 117.887C189.054 101.199 234.334 101.199 274.606 117.887C287.456 123.227 297.663 133.434 302.989 146.27C319.677 186.556 319.677 231.836 302.989 272.108C297.649 284.958 287.442 295.165 274.606 300.491C234.32 317.179 189.04 317.179 148.768 300.491C135.918 295.151 125.711 284.944 120.385 272.108C103.697 231.822 103.697 186.542 120.385 146.27C125.725 133.42 135.932 123.213 148.768 117.887ZM211.498 124.924C190.444 124.924 171.74 138.302 159.961 158.98C139.268 170.759 125.904 189.463 125.904 210.518C125.904 231.572 139.282 250.276 159.961 262.055C171.74 282.747 190.444 296.111 211.498 296.111C232.552 296.111 251.257 282.733 263.035 262.055C283.728 250.276 297.092 231.572 297.092 210.518C297.092 189.463 283.714 170.759 263.035 158.98C251.257 138.288 232.552 124.924 211.498 124.924Z"
              fill="white"
            />
          </svg>
        </div>

        <div className="relative px-8 py-7 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <KoraLogo variant="on-dark" className="h-6 w-auto mb-5" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-white/30 mb-2">
              KORA Index v3 · Intelligence Organizzativa
            </p>
            <h1
              className="font-kora-editorial font-bold text-white leading-tight"
              style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)', letterSpacing: '-0.02em' }}
            >
              {tenant?.company_name ?? COMPANY_ID}
            </h1>
            <p className="text-sm text-white/40 mt-1 font-kora-editorial">
              KORA misura ciò che accade dopo la spesa.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 sm:text-right">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold"
              style={{
                borderColor: `${safeguardColor}40`,
                color: safeguardColor,
                background: `${safeguardColor}12`,
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: safeguardColor }} />
              {output.safeguard_status}
            </span>
            <span className="text-[10px] font-mono text-white/25">{output.reporting_period}</span>
            <span className="text-[10px] font-mono text-white/18">{output.methodology_version_id}</span>
          </div>
        </div>
      </div>

      {/* ── 2. EXECUTIVE READING ────────────────────────────────────────────────── */}
      {explanation?.kora_index_explanation && (
        <div className="px-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40 mb-2">
            Lettura executive
          </p>
          <p className="text-sm text-kora-cosmic-blue/80 leading-relaxed max-w-3xl font-kora-interface">
            {explanation.kora_index_explanation}
          </p>
        </div>
      )}

      {/* ── 3. KORA INDEX INTELLIGENCE UNIT ────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <KoraIndexHero output={output} variant="dark" />
        </div>

        {/* S1 → S2 comparison — KORA palette */}
        <div
          className="rounded-xl border p-4 space-y-3"
          style={{ borderColor: 'rgba(6,3,43,0.1)', background: '#FFFFFF' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/40">
            Confronto scenari
          </p>
          {isDemo && (['S1', 'S2'] as const).map((sid) => {
            const out = sid === 'S1' ? s1Output : s2Output;
            if (!out) return null;
            const isActive  = sid === activeScenario;
            const sgColor   = SAFEGUARD_COLOR[out.safeguard_status] ?? '#F59E0B';
            return (
              <div
                key={sid}
                className="rounded-lg border p-3"
                style={isActive
                  ? { background: '#06032B', borderColor: 'rgba(97,86,245,0.3)' }
                  : { background: '#F5F6FA', borderColor: 'rgba(6,3,43,0.08)' }
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-bold font-mono"
                    style={{ color: isActive ? 'rgba(255,255,255,0.4)' : 'rgba(6,3,43,0.4)' }}
                  >
                    {sid}
                  </span>
                  {isActive && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-wide"
                      style={{ color: '#C8FF47' }}
                    >
                      attivo
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-2 mt-1.5">
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: isActive ? '#FFFFFF' : '#06032B' }}
                  >
                    {out.kora_index_value}
                  </span>
                  <span
                    className="text-xs mb-0.5"
                    style={{ color: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(6,3,43,0.3)' }}
                  >
                    /100
                  </span>
                  <span
                    className="text-[11px] mb-0.5 font-bold"
                    style={{ color: sgColor }}
                  >
                    {out.safeguard_status}
                  </span>
                </div>
                <p
                  className="text-[10px] mt-0.5 font-mono"
                  style={{ color: isActive ? 'rgba(255,255,255,0.25)' : 'rgba(6,3,43,0.35)' }}
                >
                  CS {Math.round(out.confidence_score * 100)}%
                </p>
              </div>
            );
          })}
          <div
            className="rounded-lg border p-2.5 text-[10px] leading-relaxed"
            style={{
              borderColor: 'rgba(97,86,245,0.15)',
              background: 'rgba(97,86,245,0.05)',
              color: 'rgba(6,3,43,0.6)',
            }}
          >
            Confidence Score è esterno al KORA Index v3 — indicatore di affidabilità dei dati, non componente pesato.
          </div>
        </div>
      </div>

      {/* ── 4. SIGNAL ROW — CS / SAFEGUARD / EVIDENCE ──────────────────────────── */}
      <TrustGovernanceStrip output={output} />

      {/* ── 5. DECISION SIGNALS ─────────────────────────────────────────────────── */}
      <DecisionSignalsPanel
        macroblocks={macroblocks}
        weakComponents={explanation?.weak_components}
        nextActions={explanation?.next_best_actions}
      />

      {/* ── 6. PILLAR CONSEQUENCES ──────────────────────────────────────────────── */}
      {pillarData && (
        <PillarConsequenceRow data={pillarData} weakCodes={weakCodes} />
      )}

      {/* ── 7. COMPOSITION LAYER — MACROBLOCCHI ─────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40">
            Composizione del KORA Index v3
          </p>
          <p className="text-xs text-kora-cosmic-blue/55 mt-0.5">
            4 macroblocchi pesati — ogni macroblocco sintetizza più componenti analitici
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {macroblocks.map((mb) => {
            const prevMb = (activeScenario === 'S2' ? s1Macroblocks : []).find((m) => m.code === mb.code);
            return (
              <MacroblockCard
                key={mb.code}
                macroblock={mb}
                previousScore={prevMb?.score}
              />
            );
          })}
        </div>
        <p className="text-[9px] font-mono text-kora-cosmic-blue/30">
          Pesi pre-empirici v0.1 — REACH 25% · QUALITY 30% · EQUITY 25% · BTI 20% · Confidence Score: indicatore esterno, peso 0
        </p>
      </div>

      {/* ── 8. BOUNDARY SECTION ─────────────────────────────────────────────────── */}
      <div
        className="rounded-xl border-l-4 px-5 py-5 space-y-2"
        style={{
          borderLeftColor: '#6156F5',
          background: '#F5F6FA',
          borderTopColor: 'rgba(6,3,43,0.08)',
          borderRightColor: 'rgba(6,3,43,0.08)',
          borderBottomColor: 'rgba(6,3,43,0.08)',
          borderTopWidth: '1px',
          borderRightWidth: '1px',
          borderBottomWidth: '1px',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/50">
          Cosa KORA misura e cosa esclude
        </p>
        <ul className="space-y-1.5 text-xs text-kora-cosmic-blue/70 leading-relaxed">
          <li>· Il KORA Index misura l&apos;organizzazione come sistema — mai gli individui. Il PIB personale è privato al lavoratore.</li>
          <li>· Confidence Score è esterno al KORA Index v3 — indicatore di affidabilità dei dati, peso = 0 nel calcolo.</li>
          <li>· La conformità legale è una baseline, non impatto. Gli eventi Blocked non sono penalizzati.</li>
          <li>· Correlazione ≠ causalità — tutti i segnali KORA sono associativi, non predittivi.</li>
        </ul>
        {explanation?.limitations_statement && (
          <p className="text-[10px] text-kora-cosmic-blue/50 leading-relaxed border-t border-kora-cosmic-blue/10 pt-2">
            {explanation.limitations_statement}
          </p>
        )}
        <p className="text-[9px] font-mono text-kora-cosmic-blue/30 border-t border-kora-cosmic-blue/10 pt-2">
          {output.methodology_version_id} · {output.calibration_status} · Company view: aggregati sopra soglia N≥10
        </p>
      </div>

      {/* ── 9. DETTAGLIO TECNICO — collapsed ────────────────────────────────────── */}
      <details className="group">
        <summary
          className="flex items-center justify-between cursor-pointer rounded-xl border border-kora-cosmic-blue/10 bg-white px-5 py-3.5 select-none hover:bg-kora-gray-base transition-colors"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/45">
              Dettaglio tecnico e lineage
            </p>
            <p className="text-xs text-kora-cosmic-blue/40 mt-0.5">
              Eligibility Gate · Economic Relief · BTI · Component breakdown · Explainability · Glossary
            </p>
          </div>
          <span className="text-kora-cosmic-blue/30 text-xs font-mono shrink-0 ml-4 group-open:hidden">
            Espandi →
          </span>
          <span className="text-kora-cosmic-blue/30 text-xs font-mono shrink-0 ml-4 hidden group-open:inline">
            Comprimi ↑
          </span>
        </summary>

        <div className="space-y-4 border border-kora-cosmic-blue/8 border-t-0 rounded-b-xl px-5 pt-5 pb-5 bg-white">

          <KoraIndexBuildCard output={output} safeguard={safeguard} aggregate={aggregate} />

          <ComponentBreakdownChart components={output.components} weakCodes={weakCodes} />
          <ComponentBreakdown components={output.components} />

          <div className="grid gap-4 lg:grid-cols-2">
            <ActivationSafeguardPanel
              result={safeguard}
              explanation={explanation?.safeguard_explanation}
            />
            <ConfidenceBreakdown record={confidence} />
          </div>

          <ExplainabilityPanel record={explanation} />

          <EligibilityGatePanel summary={eligibilityGate} />

          <EconomicReliefPanel
            s1={s1EconRelief}
            s2={s2EconRelief}
            s1BtiScore={s1BtiScore}
            s2BtiScore={s2BtiScore}
          />

          <BlockedByDesignPanel
            blockedCount={eligibilityGate.blocked_count}
            blockedNote={eligibilityGate.blocked_note}
          />

          <BudgetToHumanImpactPanel s1={s1BtiResult.record ?? undefined} s2={s2BtiResult.record ?? undefined} />

          <RecommendationsPanel btiRecommendations={btiRecommendations} />

          <MethodologyGlossary />

          <div className="rounded-lg border border-kora-cosmic-blue/8 bg-kora-gray-base p-4 space-y-2 text-xs text-kora-cosmic-blue/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-semibold text-kora-cosmic-blue/60 text-[11px] uppercase tracking-wide">
                Tracciabilità dell&apos;output
              </p>
              <Link
                href="/company/scoring"
                className="text-[10px] text-kora-cosmic-blue/35 hover:text-kora-cosmic-blue/60 underline whitespace-nowrap"
              >
                Lineage operativa →
              </Link>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
              <li>Eligible → IU generati → Activation Reach e componenti analitici.</li>
              <li>Limited → economic_relief_spend in BTI Engine → macroblocco BTI (20%).</li>
              <li>Blocked → baseline legale, escluso per design, non penalizzato.</li>
              <li>Company vede solo aggregati sopra soglia privacy N≥10 — nessun record individuale.</li>
            </ul>
            <p className="text-[10px] font-mono text-kora-cosmic-blue/30 border-t border-kora-cosmic-blue/10 pt-2">
              {output.methodology_version_id} · {output.calibration_status} · lineage semplificata Company
            </p>
          </div>
        </div>
      </details>

    </div>
  );
}
