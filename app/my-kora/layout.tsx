'use client';

// B81-B: My KORA layout gates on role, then wraps permitted sessions in
// WorkerSessionProvider so all child pages can call useWorkerSession().
// Current mode: always PREVIEW (synthetic personas, no live worker JWT).
// Pilot+: WorkerSessionProvider detects real Supabase worker session automatically.
//
// B141-B: Added real Supabase session detection for KORA_ADMIN.
// When demo-state defaults to COMPANY_ADMIN, a real KORA_ADMIN session was blocked.
// Fix: mirrors Sidebar.tsx realRole detection — admits KORA_ADMIN from real session
// regardless of demo-state. No additional data exposure: PIB data is synthetic only.

import { useState, useEffect } from 'react';
import { useRole } from '@/lib/demo-state';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { WorkerSessionProvider } from './_providers/WorkerSessionProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

// My KORA is worker-private.
// WORKER roles: full access — their personal space.
// KORA_ADMIN: allowed to navigate and review demo content (uses synthetic data only).
//   Admission is based on real Supabase session role, not demo-state.
// Employer roles (COMPANY_ADMIN): hard-blocked — suppression always visible.
export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  // Detect real Supabase session role — same pattern as Sidebar.tsx.
  // undefined = loading, null = no session, string = role from kora_role app_metadata.
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setRealRole(data.session?.user?.app_metadata?.kora_role ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealRole(session?.user?.app_metadata?.kora_role ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const demoPermitted = isWorkerRole(activeRole) || isAdminRole(activeRole);
  const realAdminPermitted = realRole === 'KORA_ADMIN';

  // Avoid flash of PrivacyBoundaryNotice for KORA_ADMIN while session resolves.
  // If demo-state alone does not permit and session is still loading, render nothing.
  if (!demoPermitted && realRole === undefined) return null;

  if (demoPermitted || realAdminPermitted) {
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
