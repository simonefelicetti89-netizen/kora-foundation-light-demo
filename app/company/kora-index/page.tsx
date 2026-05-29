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
import Link from 'next/link';
import { useScoringResult, useDemoScenarioComparison } from '@/lib/scoring-result';
import { activationSafeguardService } from '@/services/activation-safeguard/ActivationSafeguardService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { budgetToHumanImpactService } from '@/services/budget-to-human-impact/BudgetToHumanImpactService';
import { ingestionSimulatorService } from '@/services/ingestion-simulator/IngestionSimulatorService';
import { accountProvisioningService } from '@/services/account/AccountProvisioningService';
import { tenantService } from '@/services/tenant/TenantService';
import type { MacroblockScore } from '@/lib/types';

// C-02: KORA Index Detail — v3
export default function KoraIndexDetail() {
  const { activeScenario, activeRole } = useDemoState();

  // Resolve company from current demo user — company-scoped
  const currentUser = accountProvisioningService.getCurrentDemoUser(activeRole);
  const COMPANY_ID  = currentUser.company_id ?? 'meridiana-group';
  const tenant      = tenantService.getTenant(COMPANY_ID);

  // All hooks at the top — React rules require hooks before any conditional return.
  const { data: scoring } = useScoringResult({ tenantId: COMPANY_ID, scenarioId: activeScenario });
  // Demo-only scenario comparison (S1/S2). Returns null in live/future — never crashes.
  const { s1: scoringS1, s2: scoringS2, isDemo } = useDemoScenarioComparison(COMPANY_ID);

  const hasKoraData = scoring?.status === 'ok';

  // If this company has no KORA Index data yet, show onboarding-pending state
  if (!hasKoraData) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">KORA Index</p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            {tenant?.company_name ?? COMPANY_ID}
          </h1>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
          <p className="text-sm font-semibold text-amber-800">KORA Index non ancora disponibile</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Il KORA Index sarà disponibile al termine della pipeline dati (onboarding → UEF Review → Scoring Run).
            Questa azienda non ha ancora completato il caricamento dati.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            {[
              ['Onboarding', tenant?.onboarding_status?.replace(/_/g, ' ') ?? 'non avviato'],
              ['Readiness dati', tenant?.data_readiness_status ?? '—'],
              ['Decision Pack', tenant?.decision_pack_status ?? '—'],
              ['Prossima azione', tenant ? tenantService.getNextAction(tenant) : 'Contatta KORA Admin'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <p className="text-amber-600">{label}</p>
                <p className="text-amber-800 font-semibold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] font-mono text-slate-300">
          KORA Methodology v0.1 · pre_empirical_calibration · synthetic_demo_data: true · onboarding pending
        </p>
      </div>
    );
  }

  // Active scenario data — koraIndex is non-null past the hasKoraData guard above.
  const output     = scoring!.koraIndex!;
  const aggregate  = scoring!.aggregate;
  const confidence = scoring!.confidence;
  const safeguard  = activationSafeguardService.evaluateFromSeed(COMPANY_ID, activeScenario);
  const explanation = explainabilityService.getExplanation(COMPANY_ID, activeScenario);
  const weakCodes  = (explanation?.weak_components ?? []).map((c) => c.code);

  // Macroblock scores for active scenario
  const macroblocks: MacroblockScore[] = output.macroblocks ?? [];

  // Demo-only: S1/S2 comparison — null-safe for live/future environments.
  // In live mode isDemo === false and both are null, so the comparison strip is hidden.
  const s1Output = scoringS1?.koraIndex ?? null;
  const s2Output = scoringS2?.koraIndex ?? null;
  const s1Macroblocks: MacroblockScore[] = s1Output?.macroblocks ?? [];
  const s2Macroblocks: MacroblockScore[] = s2Output?.macroblocks ?? [];

  // BTI data (both scenarios for comparison panels)
  const s1BtiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S1', activeRole);
  const s2BtiResult = budgetToHumanImpactService.getBudgetToHumanImpactByScenario(COMPANY_ID, 'S2', activeRole);
  const s1BtiRecord = s1BtiResult.record;
  const s2BtiRecord = s2BtiResult.record;

  // Economic relief summaries (both scenarios)
  const s1EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S1', activeRole);
  const s2EconRelief = budgetToHumanImpactService.getEconomicReliefSummary(COMPANY_ID, 'S2', activeRole);

  // Recommendations for active scenario
  const btiRecommendations = budgetToHumanImpactService.getRecommendations(COMPANY_ID, activeScenario, activeRole);

  // Eligibility gate summary for active scenario
  const eligibilityGate = ingestionSimulatorService.getEligibilityGateSummary(COMPANY_ID, activeScenario);

  // S1/S2 BTI scores for delta display
  const s1BtiScore = s1Macroblocks.find((m) => m.code === 'BTI')?.score;
  const s2BtiScore = s2Macroblocks.find((m) => m.code === 'BTI')?.score;

  return (
    <div className="space-y-8">

      {/* ── HEADER ─────────────────────────────────────────────────────────────── */}
      <div>
        <div className="mb-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            KORA Index v3 / KORA Methodology v0.1
          </p>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">KORA Index Detail</h1>
          <p className="text-sm text-slate-500">{tenant?.company_name ?? COMPANY_ID} — {output.reporting_period}</p>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-600 italic">
          &quot;KORA misura ciò che accade dopo la spesa.&quot;
        </p>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
          KORA Index v3 misura la capacità dell&apos;organizzazione di trasformare risorse people/welfare in
          attivazione umana verificata, distribuita e continua.
        </p>
      </div>

      {/* ── KORA INDEX HERO ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <KoraIndexHero output={output} variant="dark" />
        </div>

        {/* S1 → S2 scenario comparison strip — demo-only, hidden in live environment */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Confronto Scenari</p>
          {isDemo && (['S1', 'S2'] as const).map((sid) => {
            const out = sid === 'S1' ? s1Output : s2Output;
            if (!out) return null;
            const isActive = sid === activeScenario;
            return (
              <div
                key={sid}
                className={`rounded-lg border p-3 ${isActive ? 'border-slate-700 bg-slate-900' : 'border-slate-100 bg-slate-50'}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>{sid}</span>
                  {isActive && (
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">attivo</span>
                  )}
                </div>
                <div className="flex items-end gap-2 mt-1">
                  <span className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-slate-700'}`}>
                    {out.kora_index_value}
                  </span>
                  <span className={`text-xs mb-0.5 ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>/100</span>
                  <span className={`text-xs mb-0.5 font-semibold ${out.safeguard_status === 'CLEAR' ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {out.safeguard_status}
                  </span>
                </div>
                <div className={`text-[10px] mt-0.5 ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                  CS {Math.round(out.confidence_score * 100)}%
                </div>
              </div>
            );
          })}
          <div className="rounded border border-blue-100 bg-blue-50 p-2 text-[10px] text-blue-700 leading-relaxed">
            Confidence Score è esterno al calcolo del KORA Index v3 — indicatore di affidabilità dei dati, non punteggio pesato.
          </div>
        </div>
      </div>

      {/* ── MACROBLOCKS ─────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-800">Macroblock Architecture — KORA Index v3</h2>
          <p className="mt-1 text-xs font-semibold text-slate-600">
            KORA Index v3 = 4 macroblocchi pesati. Ogni macroblocco sintetizza più componenti analitici.
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-2xl">
            Ciascun macroblocco misura una dimensione distinta dell&apos;attivazione e aggrega più segnali — non coincide con un singolo componente.
            Il Confidence Score (CS) è esterno — indicatore di affidabilità dei dati, non componente pesato nel calcolo.
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
      </div>

      {/* ── ELIGIBILITY GATE ─────────────────────────────────────────────────────── */}
      <EligibilityGatePanel summary={eligibilityGate} />

      {/* ── ECONOMIC RELIEF & ACTIVATION OPPORTUNITY ────────────────────────────── */}
      <EconomicReliefPanel
        s1={s1EconRelief}
        s2={s2EconRelief}
        s1BtiScore={s1BtiScore}
        s2BtiScore={s2BtiScore}
      />

      {/* ── BLOCKED BY DESIGN ────────────────────────────────────────────────────── */}
      <BlockedByDesignPanel
        blockedCount={eligibilityGate.blocked_count}
        blockedNote={eligibilityGate.blocked_note}
      />

      {/* ── BUDGET-TO-HUMAN-IMPACT PANEL ─────────────────────────────────────────── */}
      <BudgetToHumanImpactPanel s1={s1BtiRecord} s2={s2BtiRecord} />

      {/* ── RECOMMENDATIONS ──────────────────────────────────────────────────────── */}
      <RecommendationsPanel btiRecommendations={btiRecommendations} />

      {/* ── TECHNICAL DETAIL ─────────────────────────────────────────────────────── */}
      <div className="space-y-4 border-t border-slate-100 pt-6">
        <h2 className="text-sm font-semibold text-slate-700">Dettaglio Tecnico</h2>

        {/* Pipeline trace */}
        <KoraIndexBuildCard output={output} safeguard={safeguard} aggregate={aggregate} />

        {/* Component chart + 10-component grid */}
        <ComponentBreakdownChart components={output.components} weakCodes={weakCodes} />
        <ComponentBreakdown components={output.components} />

        {/* Safeguard + Confidence panels side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ActivationSafeguardPanel
            result={safeguard}
            explanation={explanation?.safeguard_explanation}
          />
          <ConfidenceBreakdown record={confidence} />
        </div>

        {/* Full explainability */}
        <ExplainabilityPanel record={explanation} />

        {/* ── Methodology glossary ── */}
        <MethodologyGlossary />

        {/* ── Company-safe lineage note ── */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs text-slate-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="font-semibold text-slate-600 text-[11px] uppercase tracking-wide">
              Tracciabilità dell&apos;output
            </p>
            <Link
              href="/company/scoring"
              className="text-[10px] text-slate-400 hover:text-slate-600 underline whitespace-nowrap"
            >
              Lineage operativa →
            </Link>
          </div>
          <p>
            La vista Company mostra lineage aggregata e semplificata.
            La lineage completa è strumento KORA Operator / Advisor.
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] pl-1">
            <li>Ogni componente del KORA Index deriva da record classificati e aggregati per pillar.</li>
            <li>Eligible → IU generati → Activation Reach e componenti analitici.</li>
            <li>Limited → economic_relief_spend in BTI Engine → macroblocco BTI (20%).</li>
            <li>Blocked → baseline legale, escluso per design, non penalizzato.</li>
            <li>Company vede solo aggregati sopra soglia privacy N≥10 — nessun record individuale.</li>
          </ul>
          <p className="text-[10px] font-mono text-slate-400 border-t border-slate-100 pt-2">
            KORA Methodology v0.1 · pre_empirical_calibration · lineage semplificata Company
          </p>
        </div>
      </div>
    </div>
  );
}
