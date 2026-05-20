'use client';

import { cn } from '@/lib/utils';
import type { ExplainabilityRecord } from '@/services/explainability/ExplainabilityService';

interface ExplainabilityPanelProps {
  record?: ExplainabilityRecord | null;
  className?: string;
}

const FALLBACK_LIMITATIONS =
  'Questo punteggio è prodotto da KORA Foundation Light v0.1 con metodologia provvisoria. È intelligence diagnostica di livello pilot — non validata scientificamente, non calibrata empiricamente, non di livello regolamentare.';

export function ExplainabilityPanel({ record, className }: ExplainabilityPanelProps) {
  return (
    <div className={cn('rounded-lg border border-slate-200 bg-white p-4 space-y-4', className)}>
      <h3 className="text-sm font-semibold text-slate-700">Spiegazione del Punteggio</h3>

      {record ? (
        <>
          <p className="text-sm text-slate-600 leading-relaxed">{record.kora_index_explanation}</p>

          {record.strong_components.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                Componenti Forti
              </p>
              <div className="space-y-2">
                {record.strong_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold text-emerald-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.weak_components.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
                Aree di Miglioramento
              </p>
              <div className="space-y-2">
                {record.weak_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold text-amber-700 w-8 shrink-0">{c.code}</span>
                    <span className="text-slate-600">{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.next_best_actions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                Azioni Raccomandate
              </p>
              <div className="space-y-2">
                {record.next_best_actions.slice(0, 3).map((a) => (
                  <div key={a.priority} className="flex gap-2 text-xs">
                    <span className="font-mono text-indigo-400 shrink-0">{a.priority}.</span>
                    <div>
                      <span className="font-semibold text-slate-700">{a.action}</span>
                      <span className="text-slate-500"> — {a.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Pannello di spiegabilità — connessione al servizio di explainability in corso.
        </p>
      )}

      <div className="rounded bg-amber-50 p-3 text-xs text-amber-700 border border-amber-200">
        <span className="font-semibold">Limitazioni: </span>
        {record?.limitations_statement ?? FALLBACK_LIMITATIONS}
      </div>
    </div>
  );
}
