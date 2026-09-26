'use client';

import { cn } from '@/lib/utils';
import { COMPONENT_LABELS, COMPONENT_MACROBLOCK, MACROBLOCK_LABELS } from '@/lib/constants/kora';
import { PX } from '@/lib/design/kora-design-tokens';
import type { KoraIndexComponent } from '@/lib/types';
import { assessmentFor, ENCODED_METRICS, type MetricCode } from '@/lib/design/encoding-grammar';
import { ThresholdMeter, ContributionBars, ConfidenceGauge, type ContributionItem } from '@/components/ui/px/encoding';

interface ComponentBreakdownProps {
  components?: KoraIndexComponent[];
  className?: string;
}

// Required copy per CLAUDE.md §12 — do not paraphrase
const COMPONENT_SHORT_DEFS: Record<string, string> = {
  AR:   'AR misura la quota di popolazione attivata almeno una volta nel periodo. Non coincide con l\'intero macroblocco Activation Reach.',
  MAR:  'Quota della forza lavoro con Impact Units sopra la soglia di materialità. MAR < AR per definizione — la differenza segnala la quota di partecipazione superficiale.',
  EVQ:  'Quota delle IU supportate da evidenze verificate o parzialmente verificate. Un EVQ basso si riflette nel Confidence Score.',
  INT:  'Media delle Impact Units per lavoratore attivo, normalizzata sul target di configurazione. Misura la profondità dell\'engagement.',
  CONT: 'CONT misura la continuità delle attivazioni nel tempo. Non coincide con l\'intero macroblocco Activation Quality.',
  EQW:  'Uniformità della distribuzione delle IU tra i lavoratori attivi. EQW basso segnala concentrazione strutturale.',
  EQS:  'Equità del tasso di attivazione tra segmenti aggregati (dipartimenti, siti, seniority — solo gruppi ≥ 10 lavoratori).',
  PC:   'Numero di pillar con presenza significativa nel periodo, espresso su 5 pillar KORA totali.',
  PB:   'Uniformità della distribuzione delle IU tra i pillar attivi. Un pillar dominante abbassa PB anche se PC è moderato.',
};

// KORA-WP-142 — CORRECTION FOUND WHILE ENCODING THIS GRID. This list previously
// held the SUPERSEDED component codes (NI, VR, CO, WB, EQ). The engine emits the
// canonical ten, so five of the nine lookups missed and rendered an em dash
// where a value exists. A significance encoding over a silently empty grid would
// have demonstrated nothing, so the codes are corrected to the canonical set
// already declared by `KORA_INDEX_COMPONENTS`.
const OPERATIONAL_CODES = ['AR', 'MAR', 'EVQ', 'INT', 'CONT', 'EQW', 'EQS', 'PC', 'PB'] as const;

/** The subset whose significance the methodology defines a threshold for. */
const THRESHOLD_BEARING = new Set<string>(ENCODED_METRICS);

export function ComponentBreakdown({ components, className }: ComponentBreakdownProps) {
  const byCode  = new Map((components ?? []).map((c) => [c.code as string, c]));
  const csComp  = byCode.get('CS');
  const csValue = csComp?.value ?? null;

  const metered = OPERATIONAL_CODES.filter((c) => THRESHOLD_BEARING.has(c));
  const plain   = OPERATIONAL_CODES.filter((c) => !THRESHOLD_BEARING.has(c));

  const contributions: ContributionItem[] = plain.map((code) => {
    const comp  = byCode.get(code);
    const value = typeof comp?.value === 'number' ? comp.value : null;
    return {
      key:    code,
      label:  `${code} — ${COMPONENT_LABELS[code] ?? code}`,
      weight: comp?.weight ?? 0,
      value,
      // Neutral, deliberately: these components carry no methodology threshold,
      // so claiming they are healthy or at risk would be inventing one.
      assessment: { kind: 'neutral', label: 'Nessuna soglia definita' },
      absent: value === null ? 'no_data' : undefined,
    };
  });

  return (
    <div className={cn('space-y-5', className)} data-wp142-block="component-grid">

      {/* ── Threshold-bearing components — significance, not bare percentages ── */}
      <section>
        <p className="kt-meta" style={{ color: PX.ink3, marginBottom: 2 }}>
          Componenti con soglia metodologica
        </p>
        <p className="kt-caption" style={{ color: PX.inkMute, marginBottom: 10 }}>
          Soglie lette da methodology-config — safeguard_thresholds (AR, MAR) e scala di stato 0–100 (EVQ, CONT).
        </p>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {metered.map((code) => {
            const comp  = byCode.get(code);
            const value = typeof comp?.value === 'number' ? comp.value : null;
            const mb    = COMPONENT_MACROBLOCK[code];
            return (
              <div key={code} data-component-code={code}>
                <ThresholdMeter
                  metric={code as MetricCode}
                  value={value}
                  label={`${code} — ${COMPONENT_LABELS[code] ?? code}`}
                  note={
                    <p className="kt-caption" style={{ color: PX.ink3 }}>
                      → {MACROBLOCK_LABELS[mb] ?? mb} · {COMPONENT_SHORT_DEFS[code]}
                    </p>
                  }
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Components without a defined threshold — contribution, honestly ── */}
      <section>
        <p className="kt-meta" style={{ color: PX.ink3, marginBottom: 10 }}>
          Componenti senza soglia definita — contributo al KORA Index
        </p>
        <ContributionBars
          items={contributions}
          totalLabel="Punti contribuiti sul totale disponibile per ciascun componente (valore × peso efficace)."
        />
        <p className="kt-caption" style={{ color: PX.inkMute, marginTop: 8 }}>
          Ogni componente alimenta il proprio macroblocco, non il KORA Index™ direttamente.
        </p>
      </section>

      {/* ── CS — external indicator, and a DIFFERENT visual register ── */}
      <section
        style={{
          borderRadius: 12,
          border:       `1px solid ${PX.line}`,
          background:   PX.l2,
          padding:      16,
        }}
      >
        <ConfidenceGauge
          value={csValue}
          caption="CS misura affidabilità e qualità dei dati, non impatto. Un Confidence Score basso riduce la fiducia interpretativa nell’output — non ne modifica il valore numerico."
        />
      </section>

    </div>
  );
}

/** Exported for the WP142 contract test: no bare threshold-bearing metric. */
export const __WP142_METERED_CODES = OPERATIONAL_CODES.filter((c) => THRESHOLD_BEARING.has(c));
export { assessmentFor as __wp142AssessmentFor };
