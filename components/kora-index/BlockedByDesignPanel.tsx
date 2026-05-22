'use client';

import { cn } from '@/lib/utils';

interface BlockedByDesignPanelProps {
  blockedCount: number;
  blockedNote?: string;
  className?: string;
}

const BLOCKED_CATEGORIES = [
  { label: 'DVR / DUVRI — Documento di Valutazione Rischi', code: 'HSE' },
  { label: 'DPI — Distribuzione Dispositivi Protezione Individuale', code: 'HSE' },
  { label: 'D.Lgs 81/08 — Formazione sicurezza obbligatoria', code: 'LEGGE' },
  { label: 'Sorveglianza sanitaria obbligatoria', code: 'LEGGE' },
  { label: 'Privacy GDPR obbligatorio', code: 'LEGGE' },
  { label: 'Patentini e licenze obbligatorie per ruolo', code: 'RUOLO' },
];

const ZERO_INDICATORS = [
  { label: 'Impact Units (IU)', value: '0' },
  { label: 'KORA Index contribution', value: '0' },
  { label: 'PIB (Personal Impact Balance)', value: '0' },
  { label: 'KORA Contribution', value: '0' },
];

export function BlockedByDesignPanel({ blockedCount, blockedNote, className }: BlockedByDesignPanelProps) {
  return (
    <div className={cn('rounded-lg border border-rose-200 bg-white p-5 space-y-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Blocked by Design</h3>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed max-w-2xl">
            Compliance legale, HSE e documentale esclusa per design.
            Non è punteggio basso — è esclusione intenzionale e non bypassabile.
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-center">
          <p className="text-2xl font-bold text-rose-800">{blockedCount.toLocaleString('it-IT')}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-500">record bloccati</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorie bloccate</p>
          <div className="space-y-1.5">
            {BLOCKED_CATEGORIES.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2 text-xs">
                <span className="shrink-0 rounded border border-rose-200 bg-rose-50 px-1 py-0.5 text-[10px] font-bold text-rose-600 font-mono">
                  {cat.code}
                </span>
                <span className="text-slate-600">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributo a KORA</p>
          <div className="space-y-2">
            {ZERO_INDICATORS.map((ind) => (
              <div key={ind.label} className="flex items-center justify-between rounded border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs">
                <span className="text-slate-600">{ind.label}</span>
                <span className="font-bold text-rose-600 font-mono">{ind.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-md border border-rose-100 bg-rose-50 p-3 text-xs text-rose-800 leading-relaxed space-y-1">
        <p className="font-semibold">KORA non trasforma la compliance in impatto.</p>
        <p>La conformità legale è una baseline, non impatto. I record bloccati sono tracciati per governance e audit, ma non alimentano nessun punteggio KORA.</p>
        {blockedNote && (
          <p className="text-rose-600 mt-1 italic">{blockedNote}</p>
        )}
      </div>
    </div>
  );
}
