'use client';

import { useRole, useScenario } from '@/lib/demo-state';
import { KoraIndexHero } from '@/components/kora-index/KoraIndexHero';
import { ComponentBreakdown } from '@/components/kora-index/ComponentBreakdown';
import { PillarChart } from '@/components/charts/PillarChart';
import { WarningCard } from '@/components/cards/WarningCard';
import { NextActionCard } from '@/components/cards/NextActionCard';
import { SafeguardBadge } from '@/components/badges/SafeguardBadge';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';
import { cn } from '@/lib/utils';
import type { PillarCode } from '@/lib/types';

function MetricTile({ label, value, code, description }: { label: string; value: string; code: string; description?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
      <p className="text-xs font-mono text-slate-400 mt-0.5">{code}</p>
      {description && (
        <p className="text-xs text-slate-400 mt-1.5 leading-snug border-t border-slate-100 pt-1.5 text-left">
          {description}
        </p>
      )}
    </div>
  );
}

function InsightTile({
  label, labelColor, title, body,
}: {
  label: string; labelColor: string; title: string; body: string;
}) {
  return (
    <div className={cn('rounded border p-3', labelColor)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">{label}</p>
      <p className="text-sm font-semibold text-slate-800 leading-snug">{title}</p>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed line-clamp-3">{body}</p>
    </div>
  );
}

function pct(val: number) {
  return `${(val * 100).toFixed(0)}%`;
}

// C-01: Executive Cockpit
export default function ExecutiveCockpit() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();

  const output      = scoringSimulatorService.score('meridiana-group', activeScenario, '2025');
  const aggregate   = scoringSimulatorService.getCompanyAggregate('meridiana-group', activeScenario);
  const warnings    = explainabilityService.getWarnings('meridiana-group', activeScenario);
  const actions     = explainabilityService.getNextBestActions('meridiana-group', activeScenario);
  const weakComps   = explainabilityService.getTopWeakComponents('meridiana-group', activeScenario);
  const strongComps = explainabilityService.getTopStrongComponents('meridiana-group', activeScenario);

  const pillarData = aggregate?.pillar_distribution as Partial<Record<PillarCode, number>> | undefined;

  const mainWeakness = weakComps[0];
  const mainStrength = strongComps[0];
  const nextAction   = actions[0];

  return (
    <div className="space-y-6">

      {/* Narrative framing block */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <h1 className="text-xl font-bold text-slate-900">Executive Cockpit</h1>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mt-0.5">Snapshot Attivazione Organizzativa</p>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed max-w-2xl">
          Questo cockpit mostra dove le iniziative di Meridiana stanno attivando l&apos;organizzazione,
          dove la partecipazione è debole o concentrata, e quali azioni migliorano il KORA Index.
        </p>

        {/* 3 insight tiles */}
        {(mainWeakness || mainStrength || nextAction) && (
          <div className="grid gap-3 mt-4 sm:grid-cols-3">
            {mainWeakness && (
              <InsightTile
                label="Punto debole"
                labelColor="border-rose-200 bg-rose-50"
                title={`${mainWeakness.label} (${(mainWeakness.value * 100).toFixed(0)}%)`}
                body={mainWeakness.explanation}
              />
            )}
            {mainStrength && (
              <InsightTile
                label="Punto di forza"
                labelColor="border-green-200 bg-green-50"
                title={`${mainStrength.label} (${(mainStrength.value * 100).toFixed(0)}%)`}
                body={mainStrength.explanation}
              />
            )}
            {nextAction && (
              <InsightTile
                label="Prossima priorità"
                labelColor="border-blue-200 bg-blue-50"
                title={nextAction.action}
                body={nextAction.detail}
              />
            )}
          </div>
        )}

        <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-200">
          Il datore di lavoro vede solo intelligence organizzativa aggregata.
          My KORA individuale, PIB e Dynamic Impact CV restano di proprietà del lavoratore e non sono visibili al datore di lavoro.
        </p>
      </div>

      {/* Scenario context label */}
      <div className={cn(
        'rounded border px-3 py-2 text-xs font-medium mt-2',
        activeScenario === 'S2'
          ? 'border-green-200 bg-green-50 text-green-700'
          : 'border-amber-200 bg-amber-50 text-amber-700',
      )}>
        {activeScenario === 'S2'
          ? 'Scenario S2 — Post-intervento: KORA Index 64, Activation Rate CLEAR, distribuzione più bilanciata.'
          : activeScenario === 'S1'
          ? 'Scenario S1 — Stato attuale: KORA Index 47, Activation Rate WARNING, Activation Debt elevato.'
          : 'Scenario demo — dati sintetici Foundation Light.'}
      </div>

      {/* KORA Index Hero (CS + Safeguard + Calibration non-suppressible) */}
      <KoraIndexHero output={output} />

      {/* Activation Safeguard — Italian explanation, color-coded by status */}
      <div
        className={cn(
          'rounded-lg border p-4',
          output.safeguard_status === 'CLEAR'
            ? 'bg-green-50 border-green-200'
            : output.safeguard_status === 'FLAGGED'
            ? 'bg-red-50 border-red-200'
            : 'bg-amber-50 border-amber-200',
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Activation Safeguard
            </p>
            <p className="text-xs text-slate-700 leading-relaxed max-w-lg">
              Verifica se l&apos;attivazione è abbastanza ampia e significativa prima di interpretare il KORA Index.
              {output.safeguard_status === 'CLEAR' && (
                <span className="text-green-700">
                  {' '}Entrambe le soglie superate: il KORA Index può essere interpretato con piena validità.
                </span>
              )}
              {output.safeguard_status === 'WARNING' && (
                <span className="text-amber-700">
                  {' '}Una o entrambe le soglie non sono ancora raggiunte: il KORA Index è visibile ma da interpretare con cautela.
                </span>
              )}
              {output.safeguard_status === 'FLAGGED' && (
                <span className="text-red-700">
                  {' '}Attivazione insufficiente: il KORA Index è bloccato o fortemente qualificato. Serve AR ≥ 20% e MAR ≥ 15%.
                </span>
              )}
            </p>
          </div>
          <SafeguardBadge status={output.safeguard_status} className="shrink-0" />
        </div>
      </div>

      {/* Activation Summary */}
      {aggregate && (
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Riepilogo Attivazione
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Activation Rate"        value={pct(aggregate.activation_rate)}             code="AR"  description="Quota della forza lavoro con almeno un'Impact Unit approvata." />
            <MetricTile label="Meaningful Activation"  value={pct(aggregate.meaningful_activation_rate)}  code="MAR" description="Quota che supera la soglia di materialità — non solo nominale." />
            <MetricTile label="Continuity Rate"        value={pct(aggregate.continuity_rate)}             code="CO"  description="Lavoratori attivi in più periodi di rendicontazione." />
            <MetricTile label="Verification Rate"      value={pct(aggregate.verification_rate)}           code="VR"  description="Attività supportata da evidenze verificate o parzialmente verificate." />
          </div>
        </div>
      )}

      {/* Pillar Distribution + Component Breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <PillarChart data={pillarData} />
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Breakdown 10 Componenti
          </h2>
          <ComponentBreakdown components={output.components} />
        </div>
      </div>

      {/* Warnings + Next Actions */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Segnali Chiave
          </h2>
          {warnings.length > 0 ? (
            <div className="space-y-2">
              {warnings.map((w) => (
                <WarningCard key={w.code} warning={w} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              Nessun segnale critico per questo scenario.
            </p>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Azioni Raccomandate
          </h2>
          {actions.length > 0 ? (
            <div className="space-y-2">
              {actions.slice(0, 3).map((a) => (
                <NextActionCard key={a.priority} action={a} />
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-400">
              Nessuna azione disponibile per questo scenario.
            </p>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {output.methodology_version_id} · {output.calibration_status} · {output.reporting_period}
      </p>
    </div>
  );
}
