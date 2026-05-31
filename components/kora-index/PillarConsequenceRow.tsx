'use client';

import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import { PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import type { PillarCode } from '@/lib/types';

const PILLAR_IMPLICATION: Record<string, (share: number) => string> = {
  LIFE:       (s) => s >= 0.35 ? 'Pillar dominante — copertura ampia nel periodo.' : s >= 0.15 ? 'Presenza significativa. Monitorare la qualità delle iniziative.' : 'Sottorappresentato. Considerare iniziative Life aggiuntive.',
  GROWTH:     (s) => s >= 0.25 ? 'Formazione ben rappresentata nel portfolio di attivazione.' : s >= 0.12 ? 'Presenza moderata. Spazio per iniziative di sviluppo professionale.' : 'Copertura limitata. Gap formativo potenzialmente rilevante.',
  CONNECTION: (s) => s >= 0.15 ? 'Coesione organizzativa ben attivata nel periodo.' : s >= 0.08 ? 'Presenza bassa. Considerare programmi di mentoring e collaborazione.' : 'Pillar critico. Rischio di discontinuità relazionale.',
  IMPACT:     (s) => s >= 0.15 ? 'Contributo esterno ben presidiato.' : s >= 0.08 ? 'Nella norma per aziende in avvio KORA.' : 'Volontariato e contributo sociale limitati nel periodo.',
  LEGACY:     (s) => s >= 0.12 ? 'Trasferimento di conoscenza strutturato.' : s >= 0.05 ? 'Presenza minima. Rischio di discontinuità nella conoscenza organizzativa.' : 'Gap critico. Conoscenza senior a rischio di dispersione.',
};

function getSignal(share: number): { label: string; dot: string; labelClass: string } {
  if (share >= 0.25) return { label: 'Dominante',           dot: '#6156F5', labelClass: 'text-kora-cosmic-blue/60' };
  if (share >= 0.10) return { label: 'Presente',            dot: '#06032B', labelClass: 'text-kora-cosmic-blue/45' };
  return              { label: 'Sottorapp.',        dot: '#F59E0B', labelClass: 'text-amber-600' };
}

interface PillarConsequenceRowProps {
  data?: Partial<Record<PillarCode, number>>;
  weakCodes?: string[];
  className?: string;
}

export function PillarConsequenceRow({ data, weakCodes = [], className }: PillarConsequenceRowProps) {
  if (!data) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40">
          Conseguenze per Pillar
        </p>
        <p className="text-xs text-kora-cosmic-blue/55 mt-0.5">
          Come l&apos;attivazione si distribuisce tra i cinque pillar KORA — aggregato aziendale
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        {PILLAR_CODES.map((code) => {
          const share       = data[code] ?? 0;
          const pct         = Math.round(share * 100);
          const signal      = getSignal(share);
          const implication = PILLAR_IMPLICATION[code]?.(share) ?? '';
          const isWeak      = weakCodes.includes(code);
          const barWidth    = Math.min(pct * 2, 100);

          return (
            <div
              key={code}
              className={cn(
                'rounded-xl border p-4 space-y-3 flex flex-col',
                isWeak
                  ? 'border-amber-200/70 bg-amber-50/30'
                  : 'border-kora-cosmic-blue/8 bg-white',
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-1">
                <div>
                  <p className="text-[10px] font-bold font-mono text-kora-cosmic-blue leading-none">{code}</p>
                  <p className="text-[9px] text-kora-cosmic-blue/45 leading-tight mt-0.5">
                    {PILLAR_LABELS[code]}
                  </p>
                </div>
                <span
                  className="h-2 w-2 rounded-full shrink-0 mt-0.5"
                  style={{ background: signal.dot }}
                />
              </div>

              {/* Bar */}
              <div className="h-1.5 w-full rounded-full" style={{ background: '#F0F1F8' }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${barWidth}%`, background: PILLAR_COLORS[code] }}
                />
              </div>

              {/* Value + signal */}
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-xl font-bold tabular-nums text-kora-cosmic-blue leading-none">
                  {pct}%
                </span>
                <span className={cn('text-[9px] font-semibold leading-none', signal.labelClass)}>
                  {signal.label}
                </span>
              </div>

              {/* Implication */}
              <p className="text-[9px] text-kora-cosmic-blue/55 leading-snug border-t border-kora-cosmic-blue/8 pt-2 flex-1">
                {implication}
              </p>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] font-mono text-kora-cosmic-blue/28">
        Distribuzione IU per pillar · aggregato aziendale · dati sintetici demo
      </p>
    </div>
  );
}
