// components/kora-link/KoraLinkCapabilityCard.tsx
// KORA Link Ecosystem (KL-23) — renders one capability with its derived state.
// Pure presentational — no data fetching, no Supabase. Server-renderable.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import {
  KORA_LINK_CAPABILITY_STATE_LABEL,
  type KoraLinkCapabilityDefinition,
  type KoraLinkCapabilityState,
} from '@/lib/kora-link/ecosystem';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

const STATE_STYLE: Record<KoraLinkCapabilityState, { bg: string; text: string; border: string }> = {
  available:     { bg: TOKENS.safeguard.pass.bg,  text: TOKENS.safeguard.pass.text,  border: `1px solid ${TOKENS.safeguard.pass.dot}40` },
  configured:    { bg: TOKENS.safeguard.watch.bg, text: TOKENS.safeguard.watch.text, border: `1px solid ${TOKENS.safeguard.watch.dot}40` },
  requires_gate: { bg: 'rgba(97,86,245,0.10)',    text: TOKENS.violet,               border: `1px solid ${TOKENS.violet}40` },
  locked:        { bg: TOKENS.inkTrack,           text: TOKENS.inkSecondary,         border: TOKENS.cardBorder },
  planned:       { bg: TOKENS.taupe,              text: TOKENS.inkHint,              border: TOKENS.cardBorder },
  disabled:      { bg: TOKENS.safeguard.cap.bg,   text: TOKENS.safeguard.cap.text,   border: `1px solid ${TOKENS.safeguard.cap.dot}40` },
};

export type KoraLinkCapabilityCardProps = {
  capability: KoraLinkCapabilityDefinition & { state: KoraLinkCapabilityState };
};

export function KoraLinkCapabilityCard({ capability }: KoraLinkCapabilityCardProps) {
  const stateStyle = STATE_STYLE[capability.state];

  return (
    <div
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadiusSm,
        padding:      '16px 18px',
        display:      'flex',
        flexDirection: 'column',
        gap:          8,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: TOKENS.ink, margin: 0 }}>
          {capability.label}
        </p>
        <span
          style={{
            flexShrink: 0,
            borderRadius: 999,
            padding: '3px 9px',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.02em',
            fontFamily: FONT,
            background: stateStyle.bg,
            color: stateStyle.text,
            border: stateStyle.border,
            whiteSpace: 'nowrap',
          }}
        >
          {KORA_LINK_CAPABILITY_STATE_LABEL[capability.state]}
        </span>
      </div>
      <p style={{ fontFamily: FONT, fontSize: 12, color: TOKENS.inkSecondary, margin: 0, lineHeight: 1.6 }}>
        {capability.description}
      </p>
      {capability.requiredGates.length > 0 && (capability.state === 'locked' || capability.state === 'configured' || capability.state === 'requires_gate') && (
        <p style={{ fontFamily: FONT, fontSize: 10.5, color: TOKENS.inkHint, margin: '2px 0 0' }}>
          Gate richiesti: {capability.requiredGates.length}
        </p>
      )}
    </div>
  );
}
