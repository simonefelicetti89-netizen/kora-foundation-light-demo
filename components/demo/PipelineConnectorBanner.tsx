'use client';

import Link from 'next/link';
import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';

const PIPELINE_STEPS = [
  {
    num: 1,
    label: 'Data Intake',
    sublabel: 'KORA Operator carica fonti',
    href: '/admin/companies/data-intake',
  },
  {
    num: 2,
    label: 'AI Ingestion',
    sublabel: 'AI assiste, Operator approva',
    href: '/company/ingestion',
  },
  {
    num: 3,
    label: 'UEF Review',
    sublabel: 'record approvati da Operator',
    href: '/company/uef-review',
  },
  {
    num: 4,
    label: 'Scoring Run',
    sublabel: 'IU → PIB → aggregazione',
    href: '/company/scoring',
  },
  {
    num: 5,
    label: 'Executive Cockpit',
    sublabel: 'output aggregato azienda',
    href: '/company',
  },
] as const;

export function PipelineConnectorBanner() {
  const { activeScenario } = useScenario();
  const scenario = scenarioService.getScenario(activeScenario);

  const pipelineElements: React.ReactNode[] = [];
  PIPELINE_STEPS.forEach((step, i) => {
    pipelineElements.push(
      <Link
        key={`step-${step.num}`}
        href={step.href}
        className="flex-1 rounded-lg border border-indigo-200 bg-white p-3 text-xs hover:border-indigo-400 hover:shadow-sm transition-all min-w-0"
      >
        <p className="font-mono text-[10px] font-bold text-indigo-300 mb-1">
          {String(step.num).padStart(2, '0')}
        </p>
        <p className="text-[11px] font-semibold text-slate-800 leading-snug">{step.label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{step.sublabel}</p>
      </Link>,
    );
    if (i < PIPELINE_STEPS.length - 1) {
      pipelineElements.push(
        <div
          key={`arrow-${i}`}
          className="hidden sm:flex items-center justify-center shrink-0 px-1.5 text-indigo-200 text-sm select-none"
        >
          →
        </div>,
      );
    }
  });

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-indigo-900">
          Dalle azioni all&apos;intelligence KORA
        </h2>
        <p className="mt-1 text-xs text-indigo-700 leading-relaxed max-w-2xl">
          Prima delle dashboard c&apos;è una pipeline: KORA trasforma azioni grezze e dati sorgente in
          evidenze, Impact Units, aggregazione aziendale e KORA Index.
        </p>
        {scenario && (
          <p className="mt-1.5 text-xs font-medium text-indigo-600">
            Scenario attivo: {scenario.label}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-0">
        {pipelineElements}
      </div>

      <p className="text-[10px] text-indigo-400 leading-relaxed">
        Il PIB (Personal Impact Balance) è un layer intermedio obbligatorio e privato — non visibile nelle dashboard aziendali.
        Ogni fase è taggata con{' '}
        <span className="font-mono">methodology_version_id</span> e{' '}
        <span className="font-mono">calibration_status</span>.
      </p>
    </div>
  );
}
