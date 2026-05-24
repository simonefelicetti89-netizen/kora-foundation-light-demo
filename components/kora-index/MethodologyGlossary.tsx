'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

type ConceptType =
  | 'KORA Index'
  | 'Macroblocco'
  | 'Componente analitico'
  | 'Indicatore esterno'
  | 'Gate interpretativo'
  | 'Indicatore BTI'
  | 'Concetto metodologico';

const CONCEPT_TYPE_STYLE: Record<ConceptType, string> = {
  'KORA Index':            'bg-slate-800 text-white border-slate-700',
  'Macroblocco':           'bg-indigo-100 text-indigo-700 border-indigo-200',
  'Componente analitico':  'bg-slate-100 text-slate-600 border-slate-200',
  'Indicatore esterno':    'bg-blue-100 text-blue-600 border-blue-200',
  'Gate interpretativo':   'bg-amber-100 text-amber-700 border-amber-200',
  'Indicatore BTI':        'bg-orange-100 text-orange-700 border-orange-200',
  'Concetto metodologico': 'bg-slate-50 text-slate-500 border-slate-200',
};

interface GlossaryEntry {
  key: string;
  type: ConceptType;
  weight?: string;
}

// Ordered display list — must cover the required items per CLAUDE.md audit
const GLOSSARY_SECTIONS: { heading: string; entries: GlossaryEntry[] }[] = [
  {
    heading: 'KORA Index',
    entries: [
      { key: 'kora_index', type: 'KORA Index' },
    ],
  },
  {
    heading: 'Macroblocks (4)',
    entries: [
      { key: 'activation_reach',   type: 'Macroblocco', weight: '25%' },
      { key: 'activation_quality', type: 'Macroblocco', weight: '30%' },
      { key: 'distribution_equity', type: 'Macroblocco', weight: '25%' },
      { key: 'bti_macroblock',     type: 'Macroblocco', weight: '20%' },
    ],
  },
  {
    heading: 'Componenti analitici (9)',
    entries: [
      { key: 'activation_rate',           type: 'Componente analitico', weight: '12.5%' },
      { key: 'meaningful_activation_rate', type: 'Componente analitico', weight: '12.5%' },
      { key: 'normalized_intensity',       type: 'Componente analitico', weight: '10%' },
      { key: 'verification_rate',          type: 'Componente analitico', weight: '10%' },
      { key: 'continuity',                 type: 'Componente analitico', weight: '10%' },
      { key: 'worker_balance',             type: 'Componente analitico', weight: '6.25%' },
      { key: 'pillar_coverage',            type: 'Componente analitico', weight: '6.25%' },
      { key: 'pillar_balance',             type: 'Componente analitico', weight: '6.25%' },
      { key: 'equity',                     type: 'Componente analitico', weight: '6.25%' },
    ],
  },
  {
    heading: 'Indicatore esterno',
    entries: [
      { key: 'confidence_score', type: 'Indicatore esterno', weight: '0 (esterno)' },
    ],
  },
  {
    heading: 'Gate interpretativo',
    entries: [
      { key: 'activation_safeguard', type: 'Gate interpretativo' },
    ],
  },
  {
    heading: 'Indicatori BTI',
    entries: [
      { key: 'economic_relief',               type: 'Indicatore BTI' },
      { key: 'deep_activation',               type: 'Indicatore BTI' },
      { key: 'activation_debt',               type: 'Indicatore BTI' },
      { key: 'reallocation_opportunity',      type: 'Indicatore BTI' },
      { key: 'cost_per_deep_activated_worker', type: 'Indicatore BTI' },
    ],
  },
  {
    heading: 'Concetti metodologici',
    entries: [
      { key: 'impact_unit',             type: 'Concetto metodologico' },
      { key: 'eligibility_gate',        type: 'Concetto metodologico' },
      { key: 'pre_empirical_calibration', type: 'Concetto metodologico' },
      { key: 'kora_contribution',       type: 'Concetto metodologico' },
      { key: 'kora_pillar',             type: 'Concetto metodologico' },
    ],
  },
];

function ConceptRow({ entry }: { entry: GlossaryEntry }) {
  const concept = explainabilityService.getConceptExplanation(entry.key);
  if (!concept) return null;
  const typeStyle = CONCEPT_TYPE_STYLE[entry.type];

  return (
    <div className="rounded-md border border-slate-100 bg-white p-3 space-y-2">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={cn('rounded border px-1.5 py-0.5 text-[9px] font-semibold', typeStyle)}>
            {entry.type}
          </span>
          {entry.weight && (
            <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-mono text-slate-500">
              Peso: {entry.weight}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-800 w-full sm:w-auto">
          {concept.label_it}
          {concept.label_en !== concept.label_it && (
            <span className="ml-1.5 text-[10px] font-normal text-slate-400">({concept.label_en})</span>
          )}
        </p>
      </div>
      <p className="text-[11px] text-slate-500 leading-relaxed">{concept.definition_it}</p>
    </div>
  );
}

export function MethodologyGlossary() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors rounded-lg"
      >
        <div>
          <p className="text-xs font-semibold text-slate-700">
            Glossario metodologico — KORA Index v3
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            4 macroblocks · 9 componenti analitici · CS esterno · Indicatori BTI · Concetti metodologici
          </p>
        </div>
        <span className="shrink-0 text-slate-400 text-sm font-mono ml-3">
          {open ? '▲' : '▼'}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Calibration disclaimer */}
          <div className="mt-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-700 leading-relaxed">
            <span className="font-semibold">Foundation Light v0.1 — Pre-calibrazione empirica.</span>{' '}
            I pesi dei macroblocks sono provvisori, non ancora calibrati tramite Studio Delphi.
            Tutti gli output sono strumenti di intelligence diagnostica pilot-grade — non certificati, non adatti a decisioni legali, fiscali o regolamentari.
          </div>

          {GLOSSARY_SECTIONS.map((section) => (
            <div key={section.heading} className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-1">
                {section.heading}
              </p>
              {section.entries.map((entry) => (
                <ConceptRow key={entry.key} entry={entry} />
              ))}
            </div>
          ))}

          <p className="text-[10px] text-slate-300 font-mono pt-1">
            KORA Index v3 / KORA Methodology v0.1 · calibration_status: pre_empirical_calibration · synthetic_demo_data: true
          </p>
        </div>
      )}
    </div>
  );
}
