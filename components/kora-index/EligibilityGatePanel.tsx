'use client';

import { TOKENS } from '@/lib/design/kora-design-tokens';
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
  LIFE:       { bg: 'rgba(81,133,238,0.10)',  text: '#1B3A8A', border: 'rgba(81,133,238,0.30)'  },
  GROWTH:     { bg: 'rgba(123,97,245,0.10)',  text: '#4A3595', border: 'rgba(123,97,245,0.30)'  },
  CONNECTION: { bg: 'rgba(149,116,234,0.10)', text: '#50368C', border: 'rgba(149,116,234,0.30)' },
  IMPACT:     { bg: 'rgba(200,255,71,0.12)',  text: '#3B6D11', border: 'rgba(200,255,71,0.40)'  },
  LEGACY:     { bg: 'rgba(63,58,143,0.10)',   text: '#2D2866', border: 'rgba(63,58,143,0.30)'   },
};

export function EligibilityGatePanel({ summary }: EligibilityGatePanelProps) {
  return (
    <div
      className="p-5 space-y-6"
      style={{ background: TOKENS.surface, border: TOKENS.cardBorder, borderRadius: TOKENS.cardRadius }}
    >
      <div>
        <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}>
          Eligibility Gate
        </p>
        <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
          Ogni item caricato è classificato prima del calcolo delle Impact Units.
          La classificazione è obbligatoria e non bypassabile.
        </p>
      </div>

      {/* Three gate classes — semantic colors preserved */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[10px] border border-[rgba(47,125,85,0.22)] bg-[rgba(47,125,85,0.08)] p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2F7D55]">Eligible</p>
          <p className="text-3xl font-bold text-[#1A4A2E]" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.eligible_row_count.toLocaleString('it-IT')}
          </p>
          <p className="text-xs text-[#2F7D55] leading-relaxed">
            Azioni che possono generare attivazione umana verificata. Processate dall&apos;IU Engine — contribuiscono al KORA Index.
          </p>
        </div>
        <div className="rounded-[10px] border border-[rgba(217,154,43,0.25)] bg-[rgba(217,154,43,0.08)] p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Limited</p>
          <p className="text-3xl font-bold text-amber-900" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.limited_count.toLocaleString('it-IT')}
          </p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Benefit monetari utili, ma a bassa profondità di attivazione. 0 IU — tracciati come spesa in benefit monetari nel motore BTI.
          </p>
        </div>
        <div className="rounded-[10px] border border-[rgba(158,59,47,0.20)] bg-[rgba(158,59,47,0.06)] p-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-[#9E3B2F]">Blocked</p>
          <p className="text-3xl font-bold text-[#9E3B2F]" style={{ fontFamily: 'var(--font-jakarta)' }}>
            {summary.blocked_count.toLocaleString('it-IT')}
          </p>
          <p className="text-xs text-[#9E3B2F] leading-relaxed">
            Compliance legale/HSE/documentale esclusa per design. 0 IU · 0 KORA Index · 0 PIB · 0 KORA Contribution.
          </p>
        </div>
      </div>

      <div
        className="rounded-[10px] p-3 text-xs leading-relaxed"
        style={{ background: TOKENS.inkBorder, color: TOKENS.inkSecondary }}
      >
        <span className="font-semibold" style={{ color: TOKENS.ink }}>KORA non trasforma la compliance in impatto. </span>
        La conformità legale è una baseline, non impatto. I record Blocked non sono &quot;punteggio basso&quot; — sono esclusi per design per garantire che il KORA Index misuri solo attivazione genuina e addizionale.
      </div>

      {/* KORA Activation Core */}
      <div className="space-y-3 pt-4" style={{ borderTop: TOKENS.cardBorder }}>
        <div>
          <p className="font-kora-sans text-kora-ink" style={{ fontSize: '1rem' }}>KORA Activation Core</p>
          <p className="mt-1 text-xs leading-relaxed max-w-2xl" style={{ color: TOKENS.inkSecondary }}>
            Queste sono le azioni che possono contribuire all&apos;attivazione umana profonda quando sono verificate, distribuite e continue.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ACTIVATION_CORE_EXAMPLES.map((ex) => {
            const c = PILLAR_COLORS[ex.pillar] ?? { bg: TOKENS.inkBorder, text: TOKENS.inkSecondary, border: TOKENS.inkHint };
            return (
              <div
                key={ex.label}
                className="rounded px-2.5 py-1.5 text-xs flex items-center gap-1.5"
                style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
              >
                <span className="font-mono text-[10px] font-bold opacity-60">{ex.pillar}</span>
                <span>{ex.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
