'use client';

// KoraActivationSignature — B140-C
// Worker STRATO: 5 bande orizzontali centrate proporzionali al mix pillar del periodo.
//
// INVARIANTI ARCHITETTURALI (non negoziabili):
//   - Normalizzato al 100%: due worker con stesso mix e IU diverse → stesso emblema
//   - Non mostra valori IU assoluti, percentuali o label pillar nell'emblema
//   - Non employer-visible. Worker-owned. Privato.
//   - Ordine bande fisso: LIFE → GROWTH → CONNECTION → IMPACT → LEGACY
//   - Banda assente (iu_total = 0): non renderizzata (opacity 0)
//   - Stato emergente (total IU = 0): 5 bande uguali sottili, opacità 0.15

import { ACTIVATION_SIGNATURE } from '@/lib/design/kora-design-tokens';
import type { PillarPreview } from '@/services/my-kora-preview/MyKoraPreviewService';

interface KoraActivationSignatureProps {
  pillarBreakdown: PillarPreview[];
  className?: string;
}

const PILLAR_ORDER = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;

export function KoraActivationSignature({ pillarBreakdown, className }: KoraActivationSignatureProps) {
  const ordered = PILLAR_ORDER.map(
    (code) =>
      pillarBreakdown.find((p) => p.pillar === code) ?? {
        pillar: code, iu_total: 0, score: 0, label: code, trend: 'not_available' as const, event_count: 0,
      },
  );

  const total      = ordered.reduce((sum, p) => sum + p.iu_total, 0);
  const isEmergente = total === 0;

  // Normalize to 100% — width driven by percentage, never by absolute IU value.
  // Two workers with identical mix but different total IU produce the same STRATO.
  const percentages = ordered.map((p) =>
    isEmergente ? 20 : (p.iu_total / total) * 100,
  );

  const activePcts = isEmergente
    ? [20]
    : percentages.filter((_, i) => ordered[i].iu_total > 0);
  const maxPct = activePcts.length > 0 ? Math.max(...activePcts) : 20;

  return (
    <div
      className={className}
      role="img"
      aria-label="KORA Activation Signature — composizione pillar del periodo"
      data-testid="kora-activation-signature"
    >
      <div
        style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 7,
          paddingTop: 6, paddingBottom: 6,
        }}
      >
        {ordered.map((p, i) => {
          const pct      = percentages[i];
          const isActive = isEmergente || p.iu_total > 0;

          if (!isActive) return null;

          // Opacity: dominant band → 0.95, smallest active → ≥ 0.25
          const opacity = isEmergente
            ? 0.15
            : 0.25 + (pct / maxPct) * 0.70;

          return (
            <div
              key={p.pillar}
              aria-hidden="true"
              style={{
                width:        `${pct}%`,
                height:       14,
                borderRadius: 3,
                background:   ACTIVATION_SIGNATURE.cotto,
                opacity:      Math.round(opacity * 100) / 100,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
