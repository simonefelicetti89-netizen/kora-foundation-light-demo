'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { ComponentBreakdownChart } from '@/components/charts/ComponentBreakdownChart';
import { ActivationSafeguardPanel } from '@/components/kora-index/ActivationSafeguardPanel';
import { ConfidenceBreakdown } from '@/components/kora-index/ConfidenceBreakdown';
import { ExplainabilityPanel } from '@/components/kora-index/ExplainabilityPanel';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

// C-02: KORA Index Detail
export default function KoraIndexDetail() {
  const { activeScenario } = useScenario();

  const output       = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const safeguard    = scoringSimulatorService.getActivationSafeguard('meridiana-group', activeScenario);
  const confidence   = scoringSimulatorService.getConfidenceRecord('meridiana-group', activeScenario);
  const explanation  = explainabilityService.getExplanation('meridiana-group', activeScenario);
  const weakCodes    = (explanation?.weak_components ?? []).map((c) => c.code);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">KORA Index Detail</h1>
        <p className="text-sm text-slate-500">
          Meridiana Group S.r.l. — {output.reporting_period}
        </p>
      </div>

      {/* KORA Index Hero — CS + Safeguard + Calibration non-suppressible */}
      <KoraIndexHero output={output} />

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

      {/* Explainability — full text explanation, weak/strong, next actions, limitations */}
      <ExplainabilityPanel record={explanation} />

      {/* Additionality Guardrail */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-800">Additionality Guardrail</h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          KORA rewards additionality, verified activation and distributed participation — not mere compliance.
          Mandatory legal minimum activities receive low or zero activation value unless they exceed the minimum
          requirement or demonstrate additionality.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              label: 'Mandatory legal safety course',
              value: 'Low activation value',
              note: 'Compliance with law is baseline, not activation. Evidence context only.',
              color: 'border-rose-200 bg-rose-50 text-rose-800',
            },
            {
              label: 'Additional safety culture workshop',
              value: 'Higher activation value',
              note: 'Beyond legal minimum, participatory, evidence-backed. KORA rewards going further.',
              color: 'border-green-200 bg-green-50 text-green-800',
            },
            {
              label: 'Cross-company volunteering initiative',
              value: 'High KORA Contribution relevance',
              note: 'Collective, verified, multi-company scope. Highest activation signal if above threshold.',
              color: 'border-indigo-200 bg-indigo-50 text-indigo-800',
            },
          ].map((ex) => (
            <div key={ex.label} className={`rounded border p-3 ${ex.color}`}>
              <p className="text-xs font-semibold mb-1">{ex.label}</p>
              <p className="text-xs font-bold mb-1">{ex.value}</p>
              <p className="text-xs opacity-80 leading-relaxed">{ex.note}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-emerald-200 pt-3 space-y-2">
          <p className="text-xs text-emerald-700 leading-relaxed">
            Additionality modifies upstream IU qualification and weighting — it does not add a new KORA Index component.
            The KORA Index has exactly 10 components. Additionality affects the UEF feature vector, IU computation, and explainability.
          </p>
          <p className="text-xs text-emerald-700 leading-relaxed">
            To improve the KORA Index, launch a KORA-reviewed initiative targeting weak pillar coverage —
            such as an additional voluntary safety culture workshop or a cross-company volunteering action.
            See <span className="font-semibold">Pillars &amp; Initiatives → Initiative Studio</span> to propose or join an initiative.
          </p>
        </div>
      </div>
    </div>
  );
}
