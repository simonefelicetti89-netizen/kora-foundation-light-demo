'use client';

import { TOKENS, PILLAR_SURFACE } from '@/lib/design/kora-design-tokens';
import type { EligibilityGateSummary } from '@/lib/types';

interface EligibilityGatePanelProps {
  summary: EligibilityGateSummary;
}

const ACTIVATION_CORE_EXAMPLES = [
  { label: 'Asilo nido / childcare', pillar: 'LIFE' },
  { label: 'Supporto caregiver', pillar: 'LIFE' },
  { label: 'Supporto psicologico strutturato', pillar: 'LIFE' },
  { label: 'Upskilling / reskilling', pillar: 'GROWTH' },
  { label: 'Formazione certificata volontaria', pillar: 'GROWTH' },
  { label: 'Mentoring / coaching', pillar: 'CONNECTION' },
  { label: 'Volontariato territoriale', pillar: 'IMPACT' },
  { label: 'Iniziative di comunità', pillar: 'IMPACT' },
  { label: 'Trasferimento di conoscenza senior-junior', pillar: 'LEGACY' },
  { label: 'Supporto previdenziale / pensionistico', pillar: 'LEGACY' },
];

const PILLAR_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LIFE:       { bg: PILLAR_SURFACE.LIFE.bg, text: PILLAR_SURFACE.LIFE.color, border: PILLAR_SURFACE.LIFE.border },
  GROWTH:     { bg: PILLAR_SURFACE.GROWTH.bg, text: PILLAR_SURFACE.GROWTH.color, border: PILLAR_SURFACE.GROWTH.border },
  CONNECTION: { bg: PILLAR_SURFACE.CONNECTION.bg, text: PILLAR_SURFACE.CONNECTION.color, border: PILLAR_SURFACE.CONNECTION.border },
  IMPACT:     { bg: PILLAR_SURFACE.IMPACT.bg, text: PILLAR_SURFACE.IMPACT.color, border: PILLAR_SURFACE.IMPACT.border },
  LEGACY:     { bg: PILLAR_SURFACE.LEGACY.bg, text: PILLAR_SURFACE.LEGACY.color, border: PILLAR_SURFACE.LEGACY.border },
};

export function EligibilityGatePanel({ summary }: EligibilityGatePanelProps) {
  return (
    <div
      className="p-5 space-y-6"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <div>
        <p className="font-kora-sans text-kora-ink" style={{ fontSize: '20px', letterSpacing: '-0.01em' }}>
          Eligibility Gate
        </p>
        <p className="mt-1 kt-caption leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
          Ogni item caricato è classificato prima del calcolo delle Impact Units.
          La classificazione è obbligatoria e non bypassabile.
        </p>
      </div>

      {/* Three gate classes — semantic colors preserved */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] p-4 space-y-2">
          <p className="kt-meta font-bold uppercase  text-kora-success">Eligible</p>
          <p className="kt-title font-bold text-kora-success" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.eligible_row_count.toLocaleString('it-IT')}
          </p>
          <p className="kt-caption text-kora-success leading-relaxed">
            Azioni che possono generare attivazione umana verificata. Processate dall&apos;IU Engine — contribuiscono al KORA Index.
          </p>
        </div>
        <div className="rounded-[10px] border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-4 space-y-2">
          <p className="kt-meta font-bold uppercase  text-amber-700">Limited</p>
          <p className="kt-title font-bold text-amber-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.limited_count.toLocaleString('it-IT')}
          </p>
          <p className="kt-caption text-amber-700 leading-relaxed">
            Benefit monetari utili, ma a bassa profondità di attivazione. 0 IU — tracciati come spesa in benefit monetari nel motore BTI.
          </p>
        </div>
        <div className="rounded-[10px] border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-4 space-y-2">
          <p className="kt-meta font-bold uppercase  text-kora-critical">Blocked</p>
          <p className="kt-title font-bold text-kora-critical" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.blocked_count.toLocaleString('it-IT')}
          </p>
          <p className="kt-caption text-kora-critical leading-relaxed">
            Compliance legale/HSE/documentale esclusa per design. 0 IU · 0 KORA Index · 0 PIB · 0 KORA Contribution.
          </p>
        </div>
      </div>

      <div
        className="rounded-[10px] p-3 kt-caption leading-relaxed"
        style={{ background: TOKENS.inkBorder, color: TOKENS.inkSecondary }}
      >
        <span className="font-semibold" style={{ color: TOKENS.ink }}>KORA non trasforma la compliance in impatto. </span>
        La conformità legale è una baseline, non impatto. I record Blocked non sono &quot;punteggio basso&quot; — sono esclusi per design per garantire che il KORA Index misuri solo attivazione genuina e addizionale.
      </div>

      {/* KORA Activation Core */}
      <div className="space-y-3 pt-4" style={{ borderTop: TOKENS.cardBorder }}>
        <div>
          <p className="font-kora-sans text-kora-ink" style={{ fontSize: '16px' }}>KORA Activation Core</p>
          <p className="mt-1 kt-caption leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
            Queste sono le azioni che possono contribuire all&apos;attivazione umana profonda quando sono verificate, distribuite e continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIVATION_CORE_EXAMPLES.map((ex) => {
            const c = PILLAR_COLORS[ex.pillar] ?? { bg: TOKENS.inkBorder, text: TOKENS.inkSecondary, border: TOKENS.inkHint };
            return (
              <div
                key={ex.label}
                className="rounded px-2.5 py-1.5 kt-caption flex items-center gap-1.5"
                style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
              >
                <span className="font-mono kt-caption font-bold opacity-60">{ex.pillar}</span>
                <span>{ex.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
