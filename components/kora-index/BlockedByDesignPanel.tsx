'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';

interface BlockedByDesignPanelProps {
  blockedCount: number;
  blockedNote?: string;
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
  { label: 'Impact Units (IU)' },
  { label: 'KORA Index contribution' },
  { label: 'PIB (Personal Impact Balance)' },
  { label: 'KORA Contribution' },
];

export function BlockedByDesignPanel({ blockedCount, blockedNote }: BlockedByDesignPanelProps) {
  return (
    <div
      className="p-5 space-y-5"
      style={{
        background:    TOKENS.surface,
        border:        `1px solid ${TOKENS.safeguard.cap.dot}`,
        borderRadius:  TOKENS.cardRadius,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
            Blocked by Design
          </p>
          <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
            Compliance legale, HSE e documentale esclusa per design.
            Non è punteggio basso — è esclusione intenzionale e non bypassabile.
          </p>
        </div>
        <div
          className="shrink-0 rounded-[10px] px-4 py-2 text-center"
          style={{ background: TOKENS.safeguard.cap.bg, border: `1px solid ${TOKENS.safeguard.cap.dot}` }}
        >
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-jakarta)', color: TOKENS.safeguard.cap.text }}
          >
            {blockedCount.toLocaleString('it-IT')}
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TOKENS.safeguard.cap.text }}>
            record bloccati
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TOKENS.inkHint }}>Categorie bloccate</p>
          <div className="space-y-1.5">
            {BLOCKED_CATEGORIES.map((cat) => (
              <div key={cat.label} className="flex items-center gap-2 text-xs">
                <span
                  className="shrink-0 rounded px-1 py-0.5 text-[10px] font-bold font-mono"
                  style={{ background: TOKENS.safeguard.cap.bg, color: TOKENS.safeguard.cap.text, border: `1px solid ${TOKENS.safeguard.cap.dot}` }}
                >
                  {cat.code}
                </span>
                <span style={{ color: TOKENS.inkSecondary }}>{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: TOKENS.inkHint }}>Contributo a KORA</p>
          <div className="space-y-2">
            {ZERO_INDICATORS.map((ind) => (
              <div
                key={ind.label}
                className="flex items-center justify-between rounded-[8px] px-3 py-1.5 text-xs"
                style={{ background: TOKENS.inkBorder }}
              >
                <span style={{ color: TOKENS.inkSecondary }}>{ind.label}</span>
                <span className="font-bold font-mono" style={{ color: TOKENS.safeguard.cap.text }}>0</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-[10px] p-3 text-xs leading-relaxed space-y-1"
        style={{ background: TOKENS.safeguard.cap.bg, color: TOKENS.safeguard.cap.text }}
      >
        <p className="font-semibold">KORA non trasforma la compliance in impatto.</p>
        <p>La conformità legale è una baseline, non impatto. I record bloccati sono tracciati per governance e audit, ma non alimentano nessun punteggio KORA.</p>
        {blockedNote && <p className="mt-1 italic" style={{ opacity: 0.75 }}>{blockedNote}</p>}
      </div>
    </div>
  );
}
