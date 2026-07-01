// components/kora-link/KoraLinkRoleDashboard.tsx
// KORA Link Ecosystem (KL-23) — composes the capability grid, privacy boundary
// card, and gate readiness panel for a single role summary. Every role-facing
// KORA Link page (admin, worker, company, partner) is built on this shell so
// the surfaces stay structurally consistent instead of diverging over time.
//
// Pure presentational — no data fetching, no Supabase. Server-renderable.

import { TOKENS } from '@/lib/design/kora-design-tokens';
import type { KoraLinkRoleSummary } from '@/lib/kora-link/ecosystem';
import { KoraLinkCapabilityCard } from './KoraLinkCapabilityCard';
import { KoraLinkBoundaryCard } from './KoraLinkBoundaryCard';
import { KoraLinkReadinessPanel } from './KoraLinkReadinessPanel';

const FONT = 'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif';

export type KoraLinkRoleDashboardProps = {
  summary: KoraLinkRoleSummary;
  capabilitiesTitle?: string;
  showReadiness?: boolean;
  children?: React.ReactNode; // role-specific content rendered between capabilities and boundaries
};

export function KoraLinkRoleDashboard({
  summary,
  capabilitiesTitle = 'Capacità KORA Link',
  showReadiness = true,
  children,
}: KoraLinkRoleDashboardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TOKENS.inkHint, margin: '0 0 12px' }}>
          {capabilitiesTitle}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {summary.capabilities.map((c) => (
            <KoraLinkCapabilityCard key={c.id} capability={c} />
          ))}
        </div>
      </div>

      {children}

      {showReadiness && <KoraLinkReadinessPanel gates={summary.gates} />}

      <KoraLinkBoundaryCard boundaries={summary.boundaries} />
    </div>
  );
}
