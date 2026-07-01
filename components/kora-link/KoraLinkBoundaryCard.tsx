// components/kora-link/KoraLinkBoundaryCard.tsx
// KORA Link Ecosystem (KL-23) — renders the privacy boundaries that apply to a role.
// Pure presentational — no data fetching, no Supabase. Server-renderable.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { KoraLinkPrivacyBoundary } from '@/lib/kora-link/ecosystem';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export type KoraLinkBoundaryCardProps = {
  boundaries: readonly KoraLinkPrivacyBoundary[];
  title?: string;
};

export function KoraLinkBoundaryCard({ boundaries, title = 'Confini privacy' }: KoraLinkBoundaryCardProps) {
  if (boundaries.length === 0) return null;

  return (
    <div
      style={{
        background:   '#fffaf5',
        border:       `1px dashed ${TOKENS.inkBorder}`,
        borderRadius: TOKENS.cardRadiusSm,
        padding:      '16px 18px',
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 10px' }}>
        {title}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {boundaries.map((b) => (
          <li key={b.id} style={{ fontFamily: FONT, fontSize: 12, color: TOKENS.inkSecondary, lineHeight: 1.6 }}>
            {b.statement}
          </li>
        ))}
      </ul>
    </div>
  );
}
