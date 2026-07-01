// components/kora-link/KoraLinkReadinessPanel.tsx
// KORA Link Ecosystem (KL-23) — renders the 9-gate readiness ladder.
// Pure presentational — no data fetching, no Supabase. Server-renderable.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { KoraLinkGateDefinition, KoraLinkGateStatusValue } from '@/lib/kora-link/ecosystem';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export type KoraLinkReadinessPanelProps = {
  gates: ReadonlyArray<KoraLinkGateDefinition & { status: KoraLinkGateStatusValue }>;
  title?: string;
};

export function KoraLinkReadinessPanel({ gates, title = 'Gate readiness' }: KoraLinkReadinessPanelProps) {
  return (
    <div
      style={{
        background:   TOKENS.surface,
        border:       TOKENS.cardBorder,
        borderRadius: TOKENS.cardRadiusSm,
        padding:      '16px 18px',
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 12px' }}>
        {title}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {gates.map((gate) => {
          const closed = gate.status === 'closed';
          return (
            <div key={gate.id} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                style={{
                  flexShrink: 0,
                  width: 68,
                  fontFamily: FONT,
                  fontSize: 9.5,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: closed ? TOKENS.safeguard.pass.text : TOKENS.safeguard.watch.text,
                }}
              >
                {closed ? 'Closed' : 'Open'}
              </span>
              <span style={{ fontFamily: FONT, fontSize: 12, color: TOKENS.ink, fontWeight: closed ? 400 : 600 }}>
                {gate.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
