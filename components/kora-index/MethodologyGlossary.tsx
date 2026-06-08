'use client';

import { useState } from 'react';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { explainabilityService } from '@/services/explainability/ExplainabilityService';

type ConceptType =
  | 'KORA Index'
  | 'Macroblocco'
  | 'Componente analitico'
  | 'Indicatore esterno'
  | 'Gate interpretativo'
  | 'Indicatore BTI'
  | 'Concetto metodologico';

const CONCEPT_TYPE_TOKEN: Record<ConceptType, { bg: string; text: string; border: string }> = {
  'KORA Index':            { bg: TOKENS.ink,                         text: '#FFFFFF',           border: TOKENS.ink        },
  'Macroblocco':           { bg: 'rgba(199,111,61,0.10)',             text: TOKENS.accent,       border: TOKENS.accent     },
  'Componente analitico':  { bg: TOKENS.inkBorder,                   text: TOKENS.inkSecondary, border: TOKENS.inkHint    },
  'Indicatore esterno':    { bg: 'rgba(43,92,230,0.08)',             text: '#1B2A4A',           border: '#2B5CE6'         },
  'Gate interpretativo':   { bg: TOKENS.safeguard.watch.bg,         text: TOKENS.safeguard.watch.text, border: TOKENS.safeguard.watch.dot },
  'Indicatore BTI':        { bg: TOKENS.safeguard.watch.bg,         text: TOKENS.safeguard.watch.text, border: TOKENS.safeguard.watch.dot },
  'Concetto metodologico': { bg: TOKENS.inkBorder,                   text: TOKENS.inkHint,      border: TOKENS.inkBorder  },
};

interface GlossaryEntry { key: string; type: ConceptType; weight?: string; }

const GLOSSARY_SECTIONS: { heading: string; entries: GlossaryEntry[] }[] = [
  { heading: 'KORA Index',       entries: [{ key: 'kora_index', type: 'KORA Index' }] },
  { heading: 'Macroblocks (4)',  entries: [
    { key: 'activation_reach',    type: 'Macroblocco', weight: '25%' },
    { key: 'activation_quality',  type: 'Macroblocco', weight: '30%' },
    { key: 'distribution_equity', type: 'Macroblocco', weight: '25%' },
    { key: 'bti_macroblock',      type: 'Macroblocco', weight: '20%' },
  ]},
  { heading: 'Componenti analitici (9)', entries: [
    { key: 'activation_rate',            type: 'Componente analitico', weight: '12.5%' },
    { key: 'meaningful_activation_rate', type: 'Componente analitico', weight: '12.5%' },
    { key: 'normalized_intensity',       type: 'Componente analitico', weight: '10%' },
    { key: 'verification_rate',          type: 'Componente analitico', weight: '10%' },
    { key: 'continuity',                 type: 'Componente analitico', weight: '10%' },
    { key: 'worker_balance',             type: 'Componente analitico', weight: '6.25%' },
    { key: 'pillar_coverage',            type: 'Componente analitico', weight: '6.25%' },
    { key: 'pillar_balance',             type: 'Componente analitico', weight: '6.25%' },
    { key: 'equity',                     type: 'Componente analitico', weight: '6.25%' },
  ]},
  { heading: 'Indicatore esterno',  entries: [{ key: 'confidence_score',  type: 'Indicatore esterno', weight: '0 (esterno)' }] },
  { heading: 'Gate interpretativo', entries: [{ key: 'activation_safeguard', type: 'Gate interpretativo' }] },
  { heading: 'Indicatori BTI', entries: [
    { key: 'economic_relief',               type: 'Indicatore BTI' },
    { key: 'deep_activation',               type: 'Indicatore BTI' },
    { key: 'activation_debt',               type: 'Indicatore BTI' },
    { key: 'reallocation_opportunity',      type: 'Indicatore BTI' },
    { key: 'cost_per_deep_activated_worker', type: 'Indicatore BTI' },
  ]},
  { heading: 'Concetti metodologici', entries: [
    { key: 'impact_unit',               type: 'Concetto metodologico' },
    { key: 'eligibility_gate',          type: 'Concetto metodologico' },
    { key: 'pre_empirical_calibration', type: 'Concetto metodologico' },
    { key: 'kora_contribution',         type: 'Concetto metodologico' },
    { key: 'kora_pillar',               type: 'Concetto metodologico' },
  ]},
];

function ConceptRow({ entry }: { entry: GlossaryEntry }) {
  const concept = explainabilityService.getConceptExplanation(entry.key);
  if (!concept) return null;
  const ts = CONCEPT_TYPE_TOKEN[entry.type];
  return (
    <div className="rounded-[8px] p-3 space-y-2" style={{ background: TOKENS.surface, border: TOKENS.cardBorder }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: ts.bg, color: ts.text, border: `1px solid ${ts.border}` }}>
            {entry.type}
          </span>
          {entry.weight && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-mono" style={{ background: TOKENS.inkBorder, color: TOKENS.inkSecondary, border: TOKENS.cardBorder }}>
              Peso: {entry.weight}
            </span>
          )}
        </div>
        <p className="text-xs font-semibold w-full sm:w-auto" style={{ color: TOKENS.ink }}>
          {concept.label_it}
          {concept.label_en !== concept.label_it && (
            <span className="ml-1.5 text-[10px] font-normal" style={{ color: TOKENS.inkHint }}>({concept.label_en})</span>
          )}
        </p>
      </div>
      <p className="text-[11px] leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{concept.definition_it}</p>
    </div>
  );
}

export function MethodologyGlossary() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors"
        style={{ borderRadius: TOKENS.cardRadius }}
      >
        <div>
          <p className="text-xs font-semibold" style={{ color: TOKENS.ink }}>
            Glossario metodologico — KORA Index v1.0
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: TOKENS.inkHint }}>
            4 macroblocks · 9 componenti analitici · CS esterno · Indicatori BTI · Concetti metodologici
          </p>
        </div>
        <span className="shrink-0 text-sm font-mono ml-3" style={{ color: TOKENS.inkHint }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 max-h-[70vh] overflow-y-auto" style={{ borderTop: TOKENS.cardBorder }}>
          <div
            className="mt-3 rounded-[8px] px-3 py-2 text-[10px] leading-relaxed"
            style={{ background: TOKENS.safeguard.watch.bg, color: TOKENS.safeguard.watch.text }}
          >
            <span className="font-semibold">KORA Foundation Light — Pre-calibrazione empirica. </span>
            I pesi dei macroblocks sono provvisori, non ancora calibrati tramite Studio Delphi.
            Tutti gli output sono strumenti di intelligence diagnostica pilot-grade — non certificati, non adatti a decisioni legali, fiscali o regolamentari.
          </div>

          {GLOSSARY_SECTIONS.map((section) => (
            <div key={section.heading} className="space-y-2">
              <p
                className="text-[9px] font-bold uppercase tracking-widest pb-1"
                style={{ color: TOKENS.inkHint, borderBottom: TOKENS.cardBorder }}
              >
                {section.heading}
              </p>
              {section.entries.map((entry) => (
                <ConceptRow key={entry.key} entry={entry} />
              ))}
            </div>
          ))}

          <p className="text-[10px] font-mono pt-1" style={{ color: TOKENS.inkHint }}>
            KORA Index v1.0 · calibration_status: pre_empirical_calibration · synthetic_demo_data: true
          </p>
        </div>
      )}
    </div>
  );
}
