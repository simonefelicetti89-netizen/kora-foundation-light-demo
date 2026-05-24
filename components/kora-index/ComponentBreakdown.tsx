'use client';

import { cn } from '@/lib/utils';
import { COMPONENT_LABELS, COMPONENT_MACROBLOCK, MACROBLOCK_LABELS } from '@/lib/constants/kora';
import type { KoraIndexComponent } from '@/lib/types';
import { formatPercentage } from '@/lib/formatters';

interface ComponentBreakdownProps {
  components?: KoraIndexComponent[];
  className?: string;
}

// Required copy per CLAUDE.md §12 — do not paraphrase
const COMPONENT_SHORT_DEFS: Record<string, string> = {
  AR:  'AR misura la quota di popolazione attivata almeno una volta nel periodo. Non coincide con l\'intero macroblocco Activation Reach.',
  MAR: 'Quota della forza lavoro con Impact Units sopra la soglia di materialità. MAR < AR per definizione — la differenza segnala la quota di partecipazione superficiale.',
  NI:  'Media delle Impact Units per lavoratore attivo, normalizzata. Misura la profondità dell\'engagement. Un NI alto su base AR bassa segnala attivazione intensa su una minoranza.',
  VR:  'Quota delle IU supportate da evidenze verificate o parzialmente verificate. Un VR basso si riflette nel Confidence Score.',
  CO:  'CO misura la continuità delle attivazioni nel tempo. Non coincide con l\'intero macroblocco Activation Quality.',
  WB:  'Uniformità della distribuzione delle IU tra i lavoratori attivi. WB basso segnala concentrazione strutturale.',
  PC:  'Numero di pillar con presenza significativa nel periodo, espresso su 5 pillar KORA totali.',
  PB:  'Uniformità della distribuzione delle IU tra i pillar attivi. Un pillar dominante abbassa PB anche se PC è moderato.',
  EQ:  'Equità distributiva dell\'attivazione tra segmenti aggregati (dipartimenti, siti, seniority — solo gruppi ≥ 10 lavoratori).',
};

const MACROBLOCK_ACCENT: Record<string, string> = {
  REACH:   'text-blue-600 bg-blue-50 border-blue-200',
  QUALITY: 'text-violet-600 bg-violet-50 border-violet-200',
  EQUITY:  'text-teal-600 bg-teal-50 border-teal-200',
  BTI:     'text-amber-600 bg-amber-50 border-amber-200',
};

const OPERATIONAL_CODES = ['AR', 'MAR', 'NI', 'VR', 'CO', 'WB', 'PC', 'PB', 'EQ'] as const;

export function ComponentBreakdown({ components, className }: ComponentBreakdownProps) {
  const csComp = components?.find((c) => c.code === 'CS');
  const csValue = csComp?.value ?? null;

  return (
    <div className={cn('space-y-5', className)}>

      {/* ── 9 operational components ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
          Componenti analitici (9) — ogni componente alimenta il proprio macroblocco, non il KORA Index direttamente
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {OPERATIONAL_CODES.map((code) => {
            const comp = components?.find((c) => c.code === code);
            const value = comp?.value ?? null;
            const weight = comp?.weight ?? null;
            const macroblockCode = COMPONENT_MACROBLOCK[code];
            const macroblockLabel = MACROBLOCK_LABELS[macroblockCode] ?? macroblockCode;
            const accentClass = MACROBLOCK_ACCENT[macroblockCode] ?? 'text-slate-500 bg-slate-50 border-slate-200';

            return (
              <div key={code} className="rounded-md border border-slate-100 bg-white p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center rounded border border-slate-100 bg-slate-50 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                      Componente analitico
                    </span>
                    <p className="text-sm font-bold text-slate-800 mt-1">{code}</p>
                    <p className="text-[10px] text-slate-400">{COMPONENT_LABELS[code]}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-slate-800">
                      {value !== null ? formatPercentage(value) : '—'}
                    </p>
                    {weight !== null && (
                      <p className="text-[9px] text-slate-300 font-mono">w: {formatPercentage(weight)}</p>
                    )}
                  </div>
                </div>

                <div className="rounded bg-slate-50 px-2 py-1.5 space-y-1">
                  <span className={cn('inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-semibold', accentClass)}>
                    → {macroblockLabel}
                  </span>
                  <p className="text-[9px] text-slate-400 leading-snug">{COMPONENT_SHORT_DEFS[code]}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CS — external indicator, visually separated ── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/30 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-400 mb-2">
          Indicatore esterno — non entra nel calcolo KORA Index
        </p>
        <div className="flex items-start gap-4">
          <div>
            <span className="inline-flex items-center rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-blue-500">
              Indicatore esterno
            </span>
            <p className="text-sm font-bold text-slate-800 mt-1">CS</p>
            <p className="text-[10px] text-slate-500">{COMPONENT_LABELS['CS']}</p>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-slate-700">
                {csValue !== null ? formatPercentage(csValue) : '—'}
              </p>
              <span className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-blue-600">
                Peso = 0
              </span>
              <span className="rounded border border-blue-200 bg-white px-1.5 py-0.5 text-[9px] text-blue-500">
                Non entra nel KORA Index
              </span>
            </div>
            <p className="text-[9px] text-blue-600 leading-snug">
              CS è esterno al KORA Index: misura affidabilità/qualità dei dati, non impatto. Peso = 0.
              Un Confidence Score basso riduce la fiducia interpretativa nell&apos;output — non ne modifica il valore numerico.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
