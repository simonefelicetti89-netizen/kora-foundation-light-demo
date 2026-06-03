'use client';

import Link from 'next/link';
import { useScenario } from '@/lib/demo-state';
import { scenarioService } from '@/services/scenario/ScenarioService';

const PIPELINE_STEPS = [
  {
    num: 1,
    label: 'Data Intake Studio',
    sublabel: 'KORA Operator gestisce intake',
    href: '/admin/companies/data-intake',
  },
  {
    num: 2,
    label: 'Ingestion Preview',
    sublabel: 'AI classifica, Operator approva',
    href: '/company/ingestion',
  },
  {
    num: 3,
    label: 'Operator Review Queue',
    sublabel: 'review metodologica Operator',
    href: '/company/uef-review',
  },
  {
    num: 4,
    label: 'Scoring Preview',
    sublabel: 'IU → PIB → aggregazione',
    href: '/company/scoring',
  },
  {
    num: 5,
    label: 'Decision Pack',
    sublabel: 'output direzionale azienda',
    href: '/company/reports',
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
        className="flex-1 rounded-lg border border-indigo-200 bg-[#F8F6F1] p-3 text-xs hover:border-indigo-400 hover:shadow-sm transition-all min-w-0"
      >
        <p className="font-mono text-[10px] font-bold text-indigo-300 mb-1">
          {String(step.num).padStart(2, '0')}
        </p>
        <p className="text-[11px] font-semibold text-[rgba(6,3,43,0.90)] leading-snug">{step.label}</p>
        <p className="text-[10px] text-[rgba(6,3,43,0.52)] mt-0.5">{step.sublabel}</p>
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
          Flusso operativo KORA Operator
        </h2>
        <p className="mt-1 text-xs text-indigo-700 leading-relaxed max-w-2xl">
          KORA Operator gestisce l&apos;intero flusso: Data Intake, Ingestion Preview, Review Queue e Scoring Preview.
          L&apos;azienda riceve solo gli output aggregati validati — nessun self-service.
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
