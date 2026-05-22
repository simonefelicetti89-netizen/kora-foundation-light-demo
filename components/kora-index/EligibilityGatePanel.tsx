'use client';

import { cn } from '@/lib/utils';
import type { EligibilityGateSummary } from '@/services/ingestion-simulator/IngestionSimulatorService';

interface EligibilityGatePanelProps {
  summary: EligibilityGateSummary;
  className?: string;
}

const ACTIVATION_CORE_EXAMPLES = [
  { label: 'Asilo nido / childcare', pillar: 'LIFE' },
  { label: 'Supporto caregiver', pillar: 'LIFE' },
  { label: 'Supporto psicologico strutturato', pillar: 'LIFE' },
  { label: 'Upskilling / reskilling', pillar: 'GROWTH' },
  { label: 'Formazione certificata volontaria', pillar: 'GROWTH' },
  { label: 'Mentoring / coaching', pillar: 'CONNECTION' },
  { label: 'Volontariato territoriale', pillar: 'IMPACT' },
  { label: 'Iniziative di comunità', pillar: 'IMPACT' },
  { label: 'Trasferimento di conoscenza senior-junior', pillar: 'LEGACY' },
  { label: 'Supporto previdenziale / pensionistico', pillar: 'LEGACY' },
];

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       'bg-blue-50 text-blue-700 border-blue-200',
  GROWTH:     'bg-violet-50 text-violet-700 border-violet-200',
  CONNECTION: 'bg-teal-50 text-teal-700 border-teal-200',
  IMPACT:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  LEGACY:     'bg-amber-50 text-amber-700 border-amber-200',
};

export function EligibilityGatePanel({ summary, className }: EligibilityGatePanelProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 space-y-6', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Eligibility Gate</h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
          Ogni item caricato è classificato prima del calcolo delle Impact Units.
          La classificazione è obbligatoria e non bypassabile.
        </p>
      </div>

      {/* Three gate classes */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Eligible</p>
          <p className="text-3xl font-bold text-emerald-900">{summary.eligible_row_count.toLocaleString('it-IT')}</p>
          <p className="text-xs text-emerald-700 leading-relaxed">
            Azioni che possono generare attivazione umana verificata.
            Processate dall&apos;IU Engine — contribuiscono al KORA Index.
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Limited</p>
          <p className="text-3xl font-bold text-amber-900">{summary.limited_count.toLocaleString('it-IT')}</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Benefit economici utili, ma a bassa profondità di attivazione.
            0 IU — tracciati come economic_relief_spend nel BTI engine.
          </p>
        </div>

        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-rose-700">Blocked</p>
          <p className="text-3xl font-bold text-rose-900">{summary.blocked_count.toLocaleString('it-IT')}</p>
          <p className="text-xs text-rose-700 leading-relaxed">
            Compliance legale/HSE/documentale esclusa per design.
            0 IU · 0 KORA Index · 0 PIB · 0 KORA Contribution.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed">
        <span className="font-semibold">KORA non trasforma la compliance in impatto.</span>
        {' '}La conformità legale è una baseline, non impatto. I record Blocked non sono &quot;punteggio basso&quot; — sono esclusi per design per garantire che il KORA Index misuri solo attivazione genuina e addizionale.
      </div>

      {/* KORA Activation Core */}
      <div className="space-y-3 border-t border-slate-100 pt-5">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">KORA Activation Core</h4>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
            Queste sono le azioni che possono contribuire all&apos;attivazione umana profonda quando sono verificate, distribuite e continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIVATION_CORE_EXAMPLES.map((ex) => (
            <div
              key={ex.label}
              className={cn(
                'rounded border px-2.5 py-1.5 text-xs flex items-center gap-1.5',
                PILLAR_COLORS[ex.pillar],
              )}
            >
              <span className="font-mono text-[10px] font-bold opacity-60">{ex.pillar}</span>
              <span>{ex.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
