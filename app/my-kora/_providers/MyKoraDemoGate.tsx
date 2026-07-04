'use client';

// app/my-kora/_providers/MyKoraDemoGate.tsx
// MYKORA-01: Layer 2 of the My KORA guard — demo-state role check.
//
// Server-side session authorization is enforced by app/my-kora/layout.tsx
// (Server Component): any REAL authenticated session (WORKER, KORA_ADMIN, or
// anything else) is decided there, before this component ever renders.
// This gate only runs when getSessionKoraRole() resolved to null — i.e. there
// is no real session at all, so this is a pure demo/persona visitor. In that
// case, admission is a product/demo-mode concern, not a privacy boundary:
// My KORA in Foundation Light is PREVIEW-only and serves synthetic persona
// data regardless (see lib/worker-identity/worker-context.ts), so gating it
// with demo-state here does not protect any real worker data.

import { useRole } from '@/lib/demo-state';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { WorkerSessionProvider } from './WorkerSessionProvider';

export function MyKoraDemoGate({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  const demoVisitorPermitted = isWorkerRole(activeRole) || isAdminRole(activeRole);

  if (demoVisitorPermitted) {
    return <WorkerSessionProvider>{children}</WorkerSessionProvider>;
  }

  return (
    <div className="p-6" style={{ maxWidth: 600 }}>
      <h1
        style={{
          fontFamily:    'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          fontWeight:    800,
          fontSize:      '2rem',
          letterSpacing: '-0.03em',
          lineHeight:    1.06,
          color:         '#06032B',
          marginBottom:  24,
        }}
      >
        My KORA
      </h1>
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
        Ruolo attivo: <strong style={{ color: TOKENS.inkSecondary }}>{activeRole}</strong>{' '}— usa il Role Switcher per passare a WORKER.
      </p>
    </div>
  );
}
