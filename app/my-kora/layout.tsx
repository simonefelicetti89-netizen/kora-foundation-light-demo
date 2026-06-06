'use client';

// B81-B: My KORA layout gates on role, then wraps permitted sessions in
// WorkerSessionProvider so all child pages can call useWorkerSession().
// Current mode: always PREVIEW (synthetic personas, no live worker JWT).
// Pilot+: WorkerSessionProvider detects real Supabase worker session automatically.

import { useRole } from '@/lib/demo-state';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { WorkerSessionProvider } from './_providers/WorkerSessionProvider';

// My KORA is worker-private.
// WORKER roles: full access — their personal space.
// KORA_ADMIN: allowed to navigate and review demo content (uses synthetic data only).
// Employer roles (COMPANY_ADMIN, COMPANY_VIEWER): hard-blocked — suppression always visible.
export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  if (isWorkerRole(activeRole) || isAdminRole(activeRole)) {
    return <WorkerSessionProvider>{children}</WorkerSessionProvider>;
  }

  return (
    <div className="p-6" style={{ maxWidth: 600 }}>
      {/* Title — Jakarta, no serif class (fase 0 flip active) */}
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
        Ruolo attivo: <strong style={{ color: TOKENS.inkSecondary }}>{activeRole}</strong>
        {' '}— usa il Role Switcher per passare a WORKER.
      </p>
    </div>
  );
}
