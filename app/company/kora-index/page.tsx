'use client';

import { useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { KoraIndexBuildCard } from '@/components/kora-index/KoraIndexBuildCard';
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
  const aggregate    = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
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
      <KoraIndexHero output={output} variant="dark" />

      {/* Pipeline trace — Come è stato costruito questo KORA Index */}
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

      {/* Explainability — full text explanation, weak/strong, next actions, limitations */}
      <ExplainabilityPanel record={explanation} />

      {/* Additionality Guardrail */}
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <h3 className="text-sm font-semibold text-emerald-800">Guardrail Addizionalità</h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          KORA premia l&apos;addizionalità, l&apos;attivazione verificata e la partecipazione distribuita — non la semplice compliance.
          Le attività obbligatorie minime di legge ricevono basso o zero valore di attivazione a meno che non superino il requisito minimo
          o dimostrino addizionalità.
        </p>

        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              label: 'Corso di sicurezza obbligatorio per legge',
              value: 'Basso valore di attivazione',
              note: 'La compliance alla legge è baseline, non attivazione. Solo contesto di evidenza.',
              color: 'border-rose-200 bg-rose-50 text-rose-800',
            },
            {
              label: 'Workshop aggiuntivo di cultura della sicurezza',
              value: 'Valore di attivazione più alto',
              note: 'Oltre il minimo legale, partecipativo, basato su evidenze. KORA premia chi va oltre.',
              color: 'border-green-200 bg-green-50 text-green-800',
            },
            {
              label: 'Iniziativa di volontariato cross-azienda',
              value: 'Alta rilevanza per KORA Contribution',
              note: 'Collettiva, verificata, portata multi-aziendale. Segnale di attivazione più alto se sopra soglia.',
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
            L&apos;addizionalità modifica la qualificazione e il peso upstream delle IU — non aggiunge un nuovo componente al KORA Index.
            Il KORA Index ha esattamente 10 componenti. L&apos;addizionalità influisce sul feature vector UEF, sul calcolo delle IU e sulla spiegabilità.
          </p>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Per migliorare il KORA Index, avvia un&apos;iniziativa revisionata da KORA che punti alle lacune di copertura pillar deboli —
            come un workshop aggiuntivo volontario sulla cultura della sicurezza o un&apos;azione di volontariato cross-aziendale.
            Vedi <span className="font-semibold">Pilastri &amp; Iniziative → Initiative Studio</span> per proporre o aderire a un&apos;iniziativa.
          </p>
        </div>
      </div>
    </div>
  );
}
