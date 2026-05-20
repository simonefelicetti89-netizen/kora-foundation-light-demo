'use client';

import { cn } from '@/lib/utils';
import type { KoraIndexOutput, CompanyAggregateExtended, ActivationSafeguardResult } from '@/lib/types';

interface KoraIndexBuildCardProps {
  output: KoraIndexOutput;
  safeguard: ActivationSafeguardResult | null;
  aggregate: CompanyAggregateExtended | null;
  className?: string;
}

interface PipelineStep {
  num: number;
  label: string;
  detail: string;
  note: string;
  colorClass: string;
}

function safeguardStepColor(status: string): string {
  if (status === 'CLEAR') return 'bg-green-50 border-green-200 text-green-800';
  if (status === 'FLAGGED') return 'bg-red-50 border-red-200 text-red-800';
  return 'bg-amber-50 border-amber-200 text-amber-800';
}

export function KoraIndexBuildCard({ output, safeguard, aggregate, className }: KoraIndexBuildCardProps) {
  const totalWorkers = aggregate?.total_workers ?? '—';
  const activeWorkers = aggregate?.active_worker_count ?? '—';
  const safeguardStatus = safeguard?.status ?? output.safeguard_status;
  const arPct = safeguard != null ? `AR ${(safeguard.ar_value * 100).toFixed(0)}%` : 'AR —';
  const marPct = safeguard != null ? `MAR ${(safeguard.mar_value * 100).toFixed(0)}%` : 'MAR —';
  const confPct = `${(output.confidence_score * 100).toFixed(0)}%`;

  const steps: PipelineStep[] = [
    {
      num: 1,
      label: 'Dati grezzi / azioni sorgente',
      detail: `${totalWorkers} lavoratori · HR, welfare, LMS, upload manuale`,
      note: 'Ingestione batch — nessuna API live in Foundation Light',
      colorClass: 'bg-slate-50 border-slate-200 text-slate-700',
    },
    {
      num: 2,
      label: 'UEF approvati',
      detail: `${activeWorkers} lavoratori con eventi normalizzati`,
      note: 'Ogni UEF ha pillar, fonte, livello evidenza e review umana',
      colorClass: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    {
      num: 3,
      label: 'Impact Units → PIB',
      detail: 'IU per evento per pillar · aggregati nel PIB individuale',
      note: 'Il PIB è obbligatorio, non bypassabile e mai visibile al datore di lavoro',
      colorClass: 'bg-violet-50 border-violet-200 text-violet-800',
    },
    {
      num: 4,
      label: 'Activation Safeguard',
      detail: `${arPct} · ${marPct} · ${safeguardStatus}`,
      note: "Verifica che l'attivazione sia abbastanza ampia e significativa",
      colorClass: safeguardStepColor(safeguardStatus),
    },
    {
      num: 5,
      label: 'KORA Index + Confidence Score',
      detail: `KORA Index ${output.kora_index_value} / 100 · Confidence ${confPct}`,
      note: 'Output inseparabile — taggato con methodology_version_id e calibration_status',
      colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    },
  ];

  const pipelineElements: React.ReactNode[] = [];
  steps.forEach((step, i) => {
    pipelineElements.push(
      <div
        key={`step-${step.num}`}
        className={cn('flex-1 rounded-lg border p-3 text-xs', step.colorClass)}
      >
        <p className="font-mono text-[10px] font-bold opacity-50 mb-1">Fase {step.num}</p>
        <p className="text-[11px] font-semibold leading-snug mb-1">{step.label}</p>
        <p className="text-[10px] opacity-80 leading-relaxed">{step.detail}</p>
        <p className="text-[10px] opacity-55 leading-relaxed italic border-t border-current/10 pt-1.5 mt-1.5">
          {step.note}
        </p>
      </div>,
    );
    if (i < steps.length - 1) {
      pipelineElements.push(
        <div
          key={`arrow-${i}`}
          className="hidden lg:flex items-center justify-center shrink-0 px-1 text-slate-300 text-sm select-none"
        >
          →
        </div>,
      );
    }
  });

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-5 space-y-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">
          Come è stato costruito questo KORA Index
        </h3>
        <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
          Il KORA Index non è un punteggio dichiarato dall&apos;azienda. È il risultato di una pipeline
          protetta di azioni, evidenze, review umana, aggregazione e spiegabilità.
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch lg:gap-0">
        {pipelineElements}
      </div>

      <div className="border-t border-slate-100 pt-3 grid gap-2 sm:grid-cols-2 text-xs">
        <p className="text-slate-500">
          <span className="font-semibold text-slate-700">Privacy:</span>{' '}
          Il PIB individuale resta privato. L&apos;azienda vede solo aggregati sopra soglia privacy (≥10 lavoratori per segmento).
        </p>
        <p className="text-slate-500">
          <span className="font-semibold text-slate-700">Metodologia:</span>{' '}
          Ogni output porta{' '}
          <span className="font-mono text-[10px] text-slate-600">methodology_version_id</span> e{' '}
          <span className="font-mono text-[10px] text-slate-600">calibration_status = pre_empirical_calibration</span>.
        </p>
      </div>
    </div>
  );
}
