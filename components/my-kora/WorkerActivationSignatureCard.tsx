'use client';

// WorkerActivationSignatureCard — B141-D/E
// Premium seal card: personal worker pictogram for the PIB section.
//
// Uses KoraActivationSignature (worker-owned, pillar-derived, private).
// Does not use the canonical brand mark — this card is personalised per worker mix.
// Merchandising-ready: ~240×240 quasi-square, light canvas surface, cotto STRATO.

import { KoraActivationSignature } from './KoraActivationSignature';
import { ACTIVATION_SIGNATURE } from '@/lib/design/kora-design-tokens';
import type { PillarPreview } from '@/services/my-kora-preview/MyKoraPreviewService';

type WorkerActivationSignatureCardProps = {
  pillarBreakdown: PillarPreview[];
  activationProfile: string;
  className?: string;
};

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export function WorkerActivationSignatureCard({
  pillarBreakdown,
  activationProfile,
  className,
}: WorkerActivationSignatureCardProps) {
  return (
    <div
      className={className}
      data-testid="worker-activation-signature-card"
      style={{
        background:      ACTIVATION_SIGNATURE.canvas,
        border:          '1px solid rgba(181,81,46,0.25)',
        borderRadius:    16,
        padding:         '28px 24px',
        width:           240,
        minHeight:       240,
        display:         'flex',
        flexDirection:   'column',
        alignItems:      'center',
        justifyContent:  'center',
        gap:             18,
      }}
    >
      <p style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.14em',
        color:         'rgba(6,3,43,0.38)',
        textTransform: 'uppercase',
        fontFamily:    FONT,
        textAlign:     'center',
      }}>
        KORA Activation Signature
      </p>

      <KoraActivationSignature
        pillarBreakdown={pillarBreakdown}
        className="w-36"
      />

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize:   11,
          fontWeight: 600,
          color:      'rgba(6,3,43,0.72)',
          fontFamily: FONT,
        }}>
          {activationProfile || 'Profilo del periodo'}
        </p>
        <p style={{
          fontSize:      9,
          color:         'rgba(6,3,43,0.38)',
          letterSpacing: '0.06em',
          fontFamily:    FONT,
          marginTop:     4,
        }}>
          privato · worker-owned
        </p>
      </div>
    </div>
  );
}
