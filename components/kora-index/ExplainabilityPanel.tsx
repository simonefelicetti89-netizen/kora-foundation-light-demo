'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { ExplainabilityRecord } from '@/services/explainability/ExplainabilityService';

interface ExplainabilityPanelProps {
  record?: ExplainabilityRecord | null;
}

const FALLBACK_LIMITATIONS =
  'Questo punteggio è prodotto da KORA Foundation Light v0.1 con metodologia provvisoria. È intelligence diagnostica di livello pilot — non validata scientificamente, non calibrata empiricamente, non di livello regolamentare.';

export function ExplainabilityPanel({ record }: ExplainabilityPanelProps) {
  return (
    <div
      className="p-4 space-y-4"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <p className="font-kora-serif text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
        Spiegazione del Punteggio
      </p>

      {record ? (
        <>
          <p className="text-sm leading-relaxed" style={{ color: TOKENS.inkSecondary }}>{record.kora_index_explanation}</p>

          {record.strong_components.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: TOKENS.safeguard.pass.text }}
              >
                Componenti Forti
              </p>
              <div className="space-y-2">
                {record.strong_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold w-8 shrink-0" style={{ color: TOKENS.safeguard.pass.text }}>{c.code}</span>
                    <span style={{ color: TOKENS.inkSecondary }}>{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.weak_components.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: TOKENS.safeguard.watch.text }}
              >
                Aree di Miglioramento
              </p>
              <div className="space-y-2">
                {record.weak_components.map((c) => (
                  <div key={c.code} className="flex gap-2 text-xs">
                    <span className="font-mono font-semibold w-8 shrink-0" style={{ color: TOKENS.safeguard.watch.text }}>{c.code}</span>
                    <span style={{ color: TOKENS.inkSecondary }}>{c.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.next_best_actions.length > 0 && (
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-wide mb-2"
                style={{ color: TOKENS.accent }}
              >
                Azioni Raccomandate
              </p>
              <div className="space-y-2">
                {record.next_best_actions.slice(0, 3).map((a) => (
                  <div key={a.priority} className="flex gap-2 text-xs">
                    <span className="font-mono shrink-0" style={{ color: TOKENS.inkHint }}>{a.priority}.</span>
                    <div>
                      <span className="font-semibold" style={{ color: TOKENS.ink }}>{a.action}</span>
                      <span style={{ color: TOKENS.inkSecondary }}> — {a.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: TOKENS.inkHint }}>
          Pannello di spiegabilità — connessione al servizio di explainability in corso.
        </p>
      )}

      <div
        className="rounded-[10px] p-3 text-xs leading-relaxed"
        style={{ background: TOKENS.safeguard.watch.bg, border: `1px solid ${TOKENS.safeguard.watch.dot}`, color: TOKENS.safeguard.watch.text }}
      >
        <span className="font-semibold">Limitazioni: </span>
        {record?.limitations_statement ?? FALLBACK_LIMITATIONS}
      </div>
    </div>
  );
}
