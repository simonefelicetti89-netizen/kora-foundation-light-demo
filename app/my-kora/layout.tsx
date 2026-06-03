'use client';

import { useRole } from '@/lib/demo-state';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';

// My KORA is worker-private.
// Employer roles (COMPANY_ADMIN, COMPANY_VIEWER) are actively blocked — never silently bypassed.
// KORA_ADMIN (demo-state admin role) is allowed in Founder Preview mode for operational review.
//
// Security note: this is a demo-state (viewMode) guard, not a backend auth gate.
// Real server-side security is enforced by kora-session.ts + middleware.
// KORA_ADMIN seeing My KORA here is the same as using the role switcher —
// no backend permissions are elevated.
export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  // KORA_ADMIN is allowed in Founder Preview mode.
  // The FounderPreviewBanner (in AppShell) makes this visible to the user.
  if (isAdminRole(activeRole)) {
    return <>{children}</>;
  }

  // Worker roles: full access — this is their private space.
  if (isWorkerRole(activeRole)) {
    return <>{children}</>;
  }

  // Employer roles (COMPANY_ADMIN, COMPANY_VIEWER, PARTNER, ADVISOR): hard block.
  // Suppression is always visible — never a silent empty state.
  return (
    <div className="p-6" style={{ maxWidth: 600 }}>
      <p
        className="font-kora-serif text-kora-ink mb-6"
        style={{ fontSize: '1.875rem', letterSpacing: '-0.02em', lineHeight: 1.1 }}
      >
        My KORA
      </p>
      <PrivacyBoundaryNotice
        reason="employer_role"
        dataType="my_kora"
      />
      <p style={{
        fontFamily:  'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
        fontSize:    '11.5px',
        color:       TOKENS.inkHint,
        marginTop:   12,
        lineHeight:  1.5,
      }}>
        Ruolo attivo: <strong style={{ color: TOKENS.inkSecondary }}>{activeRole}</strong>
        {' '}— usa il Role Switcher per passare a WORKER o usa il ruolo KORA_ADMIN per la Founder Preview.
      </p>
    </div>
  );
}
