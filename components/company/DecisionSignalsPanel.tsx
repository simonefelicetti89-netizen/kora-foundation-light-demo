'use client';

import { cn } from '@/lib/utils';
import type { MacroblockScore, ExplainabilityComponentRef, ExplainabilityAction } from '@/lib/types';

interface DecisionSignalsPanelProps {
  macroblocks?: MacroblockScore[];
  weakComponents?: ExplainabilityComponentRef[];
  nextActions?: ExplainabilityAction[];
  className?: string;
}

export function DecisionSignalsPanel({
  macroblocks = [],
  weakComponents = [],
  nextActions = [],
  className,
}: DecisionSignalsPanelProps) {
  // Primary driver: macroblock with the lowest score
  const weakestMb     = [...macroblocks].sort((a, b) => a.score - b.score)[0] ?? null;
  const primaryDriver = weakestMb?.main_driver ?? null;

  // Main constraint: first weak component
  const mainConstraint = weakComponents[0] ?? null;

  // Next decision: first next best action
  const nextDecision = nextActions[0] ?? null;

  if (!primaryDriver && !mainConstraint && !nextDecision) return null;

  return (
    <div className={cn('rounded-2xl border border-kora-cosmic-blue/8 bg-white overflow-hidden', className)}>

      <div className="px-7 pt-6 pb-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40">
          Lettura decisionale
        </p>
      </div>

      <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-kora-cosmic-blue/8 mt-4">

        {/* Column 1: Primary Driver */}
        <div className="px-7 py-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-5 rounded-full shrink-0" style={{ background: '#6156F5' }} />
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-kora-violet">
              Driver primario
            </p>
          </div>
          {primaryDriver ? (
            <p className="text-xs text-kora-cosmic-blue/80 leading-relaxed">
              {primaryDriver}
            </p>
          ) : (
            <p className="text-xs text-kora-cosmic-blue/35 italic">Non disponibile</p>
          )}
          {weakestMb && (
            <p className="text-[9px] font-mono text-kora-cosmic-blue/30 border-t border-kora-cosmic-blue/8 pt-2">
              Macroblocco {weakestMb.code} · {weakestMb.score.toFixed(0)}/100
            </p>
          )}
        </div>

        {/* Column 2: Main Constraint */}
        <div className="px-7 py-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-5 rounded-full shrink-0 bg-amber-400" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-600">
              Vincolo principale
            </p>
          </div>
          {mainConstraint ? (
            <>
              <p className="text-xs font-semibold text-kora-cosmic-blue">
                {mainConstraint.label}
              </p>
              <p className="text-xs text-kora-cosmic-blue/70 leading-relaxed">
                {mainConstraint.explanation}
              </p>
            </>
          ) : (
            <p className="text-xs text-kora-cosmic-blue/35 italic">Non disponibile</p>
          )}
          {mainConstraint && (
            <p className="text-[9px] font-mono text-kora-cosmic-blue/30 border-t border-kora-cosmic-blue/8 pt-2">
              Componente {mainConstraint.code} · {(mainConstraint.value * 100).toFixed(0)}/100
            </p>
          )}
        </div>

        {/* Column 3: Next Decision */}
        <div className="px-7 py-5 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-5 rounded-full shrink-0" style={{ background: '#C8FF47' }} />
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-kora-cosmic-blue/55">
              Prossima decisione
            </p>
          </div>
          {nextDecision ? (
            <>
              <p className="text-xs font-semibold text-kora-cosmic-blue">
                {nextDecision.action}
              </p>
              <p className="text-xs text-kora-cosmic-blue/70 leading-relaxed">
                {nextDecision.detail}
              </p>
            </>
          ) : (
            <p className="text-xs text-kora-cosmic-blue/35 italic">Non disponibile</p>
          )}
          {nextDecision && nextDecision.target_components.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1.5 border-t border-kora-cosmic-blue/8">
              {nextDecision.target_components.slice(0, 4).map((c) => (
                <span
                  key={c}
                  className="rounded border border-kora-violet/20 bg-kora-violet/5 px-1.5 py-0.5 text-[9px] font-mono text-kora-violet"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
