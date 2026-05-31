'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { PILLAR_CODES, PILLAR_LABELS } from '@/lib/constants/kora';
import { PILLAR_COLORS } from '@/lib/design/kora-design-tokens';
import type { PillarCode } from '@/lib/types';

const PILLAR_DESCRIPTION: Record<string, string> = {
  LIFE:       'Benessere, prevenzione, salute, supporto psicologico',
  GROWTH:     'Formazione, competenze, sviluppo professionale',
  CONNECTION: 'Mentoring, collaborazione, coesione organizzativa',
  IMPACT:     'Volontariato, iniziative sociali, contributo territoriale',
  LEGACY:     'Trasferimento di conoscenza, pratiche durature',
};

function getSignal(share: number): { label: string; className: string } {
  if (share >= 0.25) return { label: 'Dominante',            className: 'text-kora-cosmic-blue/60' };
  if (share >= 0.10) return { label: 'Presente',             className: 'text-kora-cosmic-blue/40' };
  return              { label: 'Sottorappresentato',  className: 'text-amber-600' };
}

interface HumanImpactMapProps {
  data?: Partial<Record<PillarCode, number>>;
  className?: string;
}

export function HumanImpactMap({ data, className }: HumanImpactMapProps) {
  const values = PILLAR_CODES.map((c) => data?.[c] ?? 0);
  const max    = Math.max(...values, 0.01);

  return (
    <div
      className={cn('rounded-2xl border border-kora-cosmic-blue/8 px-7 py-6 space-y-5 bg-white', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-kora-cosmic-blue/40">
            Human Impact Map
          </p>
          <p className="text-sm font-semibold text-kora-cosmic-blue mt-0.5">
            Distribuzione Impact Units per pillar — aggregato aziendale
          </p>
        </div>
        <Link
          href="/company/pillars"
          className="text-[10px] font-semibold text-kora-violet hover:underline shrink-0"
        >
          Dettaglio →
        </Link>
      </div>

      <div className="space-y-3.5">
        {PILLAR_CODES.map((code, i) => {
          const share    = values[i];
          const pct      = Math.round(share * 100);
          const barWidth = (share / max) * 100;
          const signal   = getSignal(share);
          const color    = PILLAR_COLORS[code];

          return (
            <div key={code} className="flex items-center gap-4">
              <div className="w-32 shrink-0">
                <p className="text-[10px] font-bold font-mono text-kora-cosmic-blue leading-none">{code}</p>
                <p className="text-[9px] text-kora-cosmic-blue/40 leading-snug mt-0.5">
                  {PILLAR_DESCRIPTION[code]}
                </p>
              </div>

              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#F0F1F8' }}>
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${barWidth}%`, background: color }}
                />
              </div>

              <div className="shrink-0 flex items-center gap-3 w-36">
                <span className="text-sm font-bold tabular-nums text-kora-cosmic-blue w-8 text-right">
                  {pct}%
                </span>
                <span className={cn('text-[9px] font-semibold', signal.className)}>
                  {signal.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[9px] font-mono text-kora-cosmic-blue/28 border-t border-kora-cosmic-blue/8 pt-3">
        {PILLAR_LABELS['LIFE']} · Aggregato aziendale · Impact Units totali per pillar · dati sintetici demo
      </p>
    </div>
  );
}
