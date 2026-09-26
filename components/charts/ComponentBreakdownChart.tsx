'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { KORA_INDEX_COMPONENTS, COMPONENT_LABELS, COMPONENT_MACROBLOCK } from '@/lib/constants/kora';
import { getMacroblockWeights } from '@/lib/methodology-config/v0.1';
import type { KoraIndexComponent } from '@/lib/types';
import type { Assessment } from '@/lib/design/surface-state-grammar';
import { ContributionBars, DistributionStrip, type ContributionItem, type DistributionSlice } from '@/components/ui/px/encoding';

interface ComponentBreakdownChartProps {
  components?: KoraIndexComponent[];
  weakCodes?: string[];
}

/**
 * KORA-WP-142 — replaced a ten-bar chart with the question it could not answer.
 *
 * WHAT WAS WRONG, beyond taste:
 *  · `value: Math.round((comp?.value ?? 0) * 100)` rendered an ABSENT component
 *    as a measured zero. A component with no data and a component that scored
 *    nothing drew the same bar.
 *  · `<ReferenceLine x={50} />` drew a threshold at 50% for all ten components.
 *    No such threshold exists in the methodology configuration for any of them —
 *    it was invented in the visual layer and read as methodology.
 *  · Ten percentages on one shared 0–100 axis invited exactly the comparison the
 *    methodology forbids: the components do not share a scale and do not carry
 *    equal weight, so "AR is taller than EVQ" meant nothing.
 *
 * The panel now encodes CONTRIBUTION — value × effective weight — which is the
 * question a reader deciding where to act actually has, and which no surface in
 * the Product answered. Absent stays absent.
 */
export function ComponentBreakdownChart({ components, weakCodes = [] }: ComponentBreakdownChartProps) {
  const byCode = new Map((components ?? []).map((c) => [c.code as string, c]));

  const items: ContributionItem[] = KORA_INDEX_COMPONENTS
    .filter((code) => !byCode.get(code)?.external && code !== 'CS')
    .map((code) => {
      const comp  = byCode.get(code);
      const value = typeof comp?.value === 'number' ? comp.value : null;
      const weak  = weakCodes.includes(code);
      return {
        key:    code,
        label:  `${code} — ${COMPONENT_LABELS[code] ?? code}`,
        weight: comp?.weight ?? 0,
        value,
        assessment: (weak
          ? { kind: 'watch', label: 'Area di miglioramento', reason: 'Fra i componenti più deboli del periodo.' }
          : { kind: 'neutral', label: 'Contributo osservato' }) as Assessment,
        absent: (value === null ? 'no_data' : undefined) as ContributionItem['absent'],
      };
    })
    .sort((a, b) => (b.value ?? -1) * b.weight - (a.value ?? -1) * a.weight);

  // Macroblock weights ARE a genuine distribution: four shares of one whole,
  // read from config. This is the only comparison on the panel that is real.
  const mbWeights = getMacroblockWeights();
  const slices: DistributionSlice[] = Object.entries(mbWeights).map(([code, w]) => ({
    key: code, label: code, share: w,
  }));

  const counted = items.filter((i) => i.value !== null).length;

  return (
    <div
      data-wp142-block="breakdown-chart"
      style={{
        padding:      '1.5rem',
        background:   PX.l1,
        border:       `1px solid ${PX.line}`,
        borderRadius: 16,
      }}
    >
      <p className="kt-subsection" style={{ color: PX.ink }}>Contributo dei componenti</p>
      <p className="kt-caption" style={{ color: PX.ink3, marginTop: 3, marginBottom: 14 }}>
        Quanto ciascun componente porta effettivamente al KORA Index™ — valore × peso efficace.
        Non è un confronto fra punteggi: i componenti non condividono la stessa scala.
      </p>

      <ContributionBars items={items} />

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${PX.line}` }}>
        <p className="kt-caption" style={{ color: PX.ink3, marginBottom: 6 }}>
          Ripartizione del peso fra macroblocchi (configurazione metodologica)
        </p>
        <DistributionStrip
          slices={slices}
          caption={`Pesi da methodology-config · ${counted}/${items.length} componenti con valore nel periodo.`}
        />
      </div>
    </div>
  );
}
