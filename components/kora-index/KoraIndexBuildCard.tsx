'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { KoraIndexOutput, CompanyAggregateExtended, ActivationSafeguardResult } from '@/lib/types';

interface KoraIndexBuildCardProps {
  output: KoraIndexOutput;
  safeguard: ActivationSafeguardResult | null;
  aggregate: CompanyAggregateExtended | null;
}

interface PipelineStep { num: number; label: string; detail: string; note: string }

function safeguardColor(status: string) {
  if (status === 'CLEAR')   return { bg: TOKENS.safeguard.pass.bg,  border: TOKENS.safeguard.pass.dot,  text: TOKENS.safeguard.pass.text  };
  if (status === 'FLAGGED') return { bg: TOKENS.safeguard.cap.bg,   border: TOKENS.safeguard.cap.dot,   text: TOKENS.safeguard.cap.text   };
  return { bg: TOKENS.safeguard.watch.bg, border: TOKENS.safeguard.watch.dot, text: TOKENS.safeguard.watch.text };
}

export function KoraIndexBuildCard({ output, safeguard, aggregate }: KoraIndexBuildCardProps) {
  const totalWorkers  = aggregate?.total_workers ?? '—';
  const activeWorkers = aggregate?.active_worker_count ?? '—';
  const safeguardStatus = safeguard?.status ?? output.safeguard_status;
  const arPct  = safeguard != null ? `AR ${(safeguard.ar_value * 100).toFixed(0)}%` : 'AR —';
  const marPct = safeguard != null ? `MAR ${(safeguard.mar_value * 100).toFixed(0)}%` : 'MAR —';
  const confPct = `${(output.confidence_score * 100).toFixed(0)}%`;
  const sgColor = safeguardColor(safeguardStatus);

  const steps: PipelineStep[] = [
    { num: 1, label: 'Dati grezzi / azioni sorgente',       detail: `${totalWorkers} lavoratori · HR, welfare, LMS, upload manuale`,             note: 'Ingestione batch — nessuna API live in Foundation Light' },
    { num: 2, label: 'UEF approvati',                        detail: `${activeWorkers} lavoratori con eventi normalizzati`,                        note: 'Ogni UEF ha pillar, fonte, livello evidenza e review umana' },
    { num: 3, label: 'Impact Units → PIB',                   detail: 'IU per evento per pillar · aggregati nel PIB individuale',                   note: 'Il PIB è obbligatorio, non bypassabile e mai visibile al datore di lavoro' },
    { num: 4, label: 'Activation Safeguard',                 detail: `${arPct} · ${marPct} · ${safeguardStatus}`,                                  note: "Verifica che l'attivazione sia abbastanza ampia e significativa" },
    { num: 5, label: 'KORA Index + Confidence Score',        detail: `KORA Index ${output.kora_index_value} / 100 · Confidence ${confPct}`,        note: 'Output inseparabile — taggato con methodology_version_id e calibration_status' },
  ];

  return (
    <div
      className="p-5 space-y-4"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <div>
        <p className="font-kora-serif text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Come è stato costruito questo KORA Index
        </p>
        <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
          Il KORA Index non è un punteggio dichiarato dall&apos;azienda. È il risultato di una pipeline
          protetta di azioni, evidenze, review umana, aggregazione e spiegabilità.
        </p>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        {steps.map((step, i) => {
          const isStep4 = step.num === 4;
          const stepBg   = isStep4 ? sgColor.bg   : TOKENS.inkBorder;
          const stepText = isStep4 ? sgColor.text  : TOKENS.ink;
          return (
            <div key={step.num} className="flex items-stretch lg:flex-1 gap-0">
              <div
                className="flex-1 rounded-[10px] p-3 space-y-1 text-xs"
                style={{ background: stepBg }}
              >
                <p className="font-mono text-[9px] font-bold uppercase tracking-widest" style={{ color: TOKENS.inkHint }}>
                  Fase {step.num}
                </p>
                <p className="font-semibold leading-snug" style={{ color: stepText }}>{step.label}</p>
                <p className="text-[10.5px] leading-relaxed" style={{ color: stepText, opacity: 0.8 }}>{step.detail}</p>
                <p className="text-[10px] leading-relaxed italic" style={{ color: stepText, opacity: 0.55 }}>{step.note}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden lg:flex items-center justify-center px-1.5 text-xs select-none" style={{ color: TOKENS.inkHint }}>→</div>
              )}
            </div>
          );
        })}
      </div>

      <div
        className="grid gap-3 sm:grid-cols-2 text-xs pt-3"
        style={{ borderTop: TOKENS.cardBorder }}
      >
        <p style={{ color: TOKENS.inkSecondary }}>
          <span className="font-semibold" style={{ color: TOKENS.ink }}>Privacy: </span>
          Il PIB individuale resta privato. L&apos;azienda vede solo aggregati sopra soglia privacy (≥10 lavoratori per segmento).
        </p>
        <p style={{ color: TOKENS.inkSecondary }}>
          <span className="font-semibold" style={{ color: TOKENS.ink }}>Metodologia: </span>
          Ogni output porta{' '}
          <span className="font-mono text-[10px]">methodology_version_id</span> e{' '}
          <span className="font-mono text-[10px]">calibration_status = pre_empirical_calibration</span>.
        </p>
      </div>
    </div>
  );
}
