'use client';

import { PX } from '@/lib/design/kora-design-tokens';
import { assessmentTreatment, type Assessment } from '@/lib/design/surface-state-grammar';
import { InsufficientData } from '../states';

export interface ContributionItem {
  readonly key:   string;
  readonly label: string;
  /** Weight of this item in the parent total, 0–1. */
  readonly weight: number;
  /** Item score on its own 0–1 scale, or null when it has no value. */
  readonly value: number | null;
  /** Derived, never passed as a colour. */
  readonly assessment: Assessment;
  /** Why this item has no value, when it has none. */
  readonly absent?: 'no_data' | 'insufficient_data' | 'suppressed';
}

/**
 * KORA-WP-142 — "what contributes?".
 *
 * Contribution is weight × value, which is NOT the same as the value: a
 * component can score badly and still barely move the index, and a reader
 * deciding where to act needs the product, not the factor. The bar encodes the
 * CONTRIBUTED points; the caption keeps the raw score visible so the two are
 * never confused.
 *
 * An item with no value renders its absence in place, at its own row. It is
 * never dropped (which would silently change the denominator the reader sees)
 * and never drawn as a zero-length bar (which would assert a measured zero).
 */
export function ContributionBars({
  items, totalLabel, max,
}: {
  items: readonly ContributionItem[];
  totalLabel?: string;
  /** Track maximum in contributed points. Defaults to the largest weight present. */
  max?: number;
}) {
  const scale = max ?? Math.max(...items.map((i) => i.weight), 0.0001);

  return (
    <div data-kora-encoding="contribution-bars">
      {totalLabel && (
        <p className="kt-caption" style={{ color: PX.ink3, marginBottom: 8 }}>{totalLabel}</p>
      )}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {items.map((it) => {
          const treat = assessmentTreatment(it.assessment);
          const contributed = it.value === null ? null : it.value * it.weight;
          return (
            <li key={it.key} data-contribution-item={it.key}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
                <p className="kt-caption" style={{ color: PX.ink, minWidth: 0 }}>{it.label}</p>
                <p className="kt-caption kt-num" style={{ color: PX.ink3, flexShrink: 0 }}>
                  {it.value === null ? '—' : `${Math.round(it.value * 100)}% × ${Math.round(it.weight * 100)}%`}
                </p>
              </div>

              {contributed === null ? (
                <div style={{ marginTop: 4 }}>
                  {it.absent === 'insufficient_data'
                    ? <InsufficientData measure={it.label} have={0} need={10} />
                    : <p className="kt-caption" style={{ color: PX.ink3 }}>
                        {it.absent === 'suppressed'
                          ? 'Soppresso — gruppo sotto la soglia di privacy.'
                          : 'Nessun dato per questo componente in questo periodo.'}
                      </p>}
                </div>
              ) : (
                <div
                  role="meter"
                  aria-label={`${it.label}: contribuisce ${(contributed * 100).toFixed(1)} punti su ${(it.weight * 100).toFixed(1)} disponibili — ${it.assessment.label}`}
                  aria-valuenow={contributed} aria-valuemin={0} aria-valuemax={it.weight}
                  style={{ position: 'relative', height: 6, marginTop: 5, background: PX.inkWash, borderRadius: 999 }}
                >
                  {/* The pale segment is the weight this item COULD contribute;
                      the solid one is what it actually does. The gap between
                      them is the headroom a reader is choosing between. */}
                  <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, width: `${(it.weight / scale) * 100}%`,
                    background: PX.inkWash, borderRadius: 999, border: `1px solid ${PX.line}`,
                  }} />
                  <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, width: `${(contributed / scale) * 100}%`,
                    background: treat.fill, borderRadius: 999,
                  }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
