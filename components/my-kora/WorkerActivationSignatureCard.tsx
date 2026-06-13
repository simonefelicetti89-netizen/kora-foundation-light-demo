'use client';

// WorkerActivationSignatureCard — B141-D
// Premium dark card: personal worker pictogram for the PIB section.
//
// Uses KoraActivationSignature (worker-owned, pillar-derived, private).
// Does not use the canonical brand mark — this card is personalised per worker mix.
// Intended as a future base for Dynamic CV and opt-in merchandising.

import { KoraActivationSignature } from './KoraActivationSignature';
import { KoraLogo } from '@/components/brand/KoraLogo';
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
        background:    ACTIVATION_SIGNATURE.inkWarm,
        borderRadius:  16,
        padding:       '24px 20px',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        gap:           14,
      }}
    >
      <p style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: '0.14em',
        color:         'rgba(246,244,239,0.45)',
        textTransform: 'uppercase',
        fontFamily:    FONT,
        textAlign:     'center',
      }}>
        KORA Activation Signature
      </p>

      <KoraActivationSignature
        pillarBreakdown={pillarBreakdown}
        className="w-48"
      />

      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontSize:   11,
          fontWeight: 600,
          color:      'rgba(246,244,239,0.88)',
          fontFamily: FONT,
        }}>
          {activationProfile || 'Profilo del periodo'}
        </p>
        <p style={{
          fontSize:      9,
          color:         'rgba(246,244,239,0.32)',
          letterSpacing: '0.06em',
          fontFamily:    FONT,
          marginTop:     3,
        }}>
          privato · worker-owned
        </p>
      </div>

      <KoraLogo variant="on-dark" className="h-4 w-auto opacity-30" />
    </div>
  );
}
