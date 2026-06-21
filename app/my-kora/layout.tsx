'use client';

// B81-B: My KORA layout gates on role, then wraps permitted sessions in
// WorkerSessionProvider so all child pages can call useWorkerSession().
// Current mode: always PREVIEW (synthetic personas, no live worker JWT).
// Pilot+: WorkerSessionProvider detects real Supabase worker session automatically.
//
// B141-B: Added real Supabase session detection for KORA_ADMIN.
// B151-A: Gate now admits real WORKER sessions directly, without requiring the Role Switcher.
//   Admission priority:
//   1. realRole === 'WORKER'    — real worker session → always admitted
//   2. realRole === 'KORA_ADMIN' — admin session → admitted for founder/admin preview
//   3. realRole === null + demo-state isWorker/isAdmin — pure demo visitor → admitted
//   4. any other real session (COMPANY_ADMIN, etc.) → hard-blocked

import { useState, useEffect } from 'react';
import { useRole } from '@/lib/demo-state';
import { resolveRealRoleFromSession } from '@/lib/demo-state/demo-controls-guard';
import { PrivacyBoundaryNotice } from '@/components/privacy/PrivacyBoundaryNotice';
import { isWorkerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { WorkerSessionProvider } from './_providers/WorkerSessionProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function MyKoraLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  // undefined = session check pending, null = no session, string = real kora_role
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setRealRole(resolveRealRoleFromSession(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealRole(resolveRealRoleFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  // Hold render until session resolves — avoids any flash of access-denied for real workers
  if (realRole === undefined) return null;

  // Real authenticated users: WORKER and KORA_ADMIN are admitted
  const realUserPermitted = realRole === 'WORKER' || realRole === 'KORA_ADMIN';

  // Pure demo visitors (no session): respect demo-state activeRole
  const demoVisitorPermitted =
    realRole === null &&
    (isWorkerRole(activeRole as Parameters<typeof isWorkerRole>[0]) ||
     isAdminRole(activeRole as Parameters<typeof isAdminRole>[0]));

  if (realUserPermitted || demoVisitorPermitted) {
    return (
      <WorkerSessionProvider>
        {/* Navigation bridge: real workers can return to authenticated workspace */}
        {realRole === 'WORKER' && (
          <div style={{ marginBottom: 12 }}>
            <a
              href="/worker/workspace"
              data-testid="my-kora-workspace-link"
              style={{
                fontSize:       11,
                fontWeight:     600,
                color:          'rgba(6,3,43,0.45)',
                textDecoration: 'none',
                display:        'inline-block',
                padding:        '4px 0',
              }}
            >
              ← Spazio operativo
            </a>
          </div>
        )}
        {children}
      </WorkerSessionProvider>
    );
  }

  // Access denied — message differs for real users vs. demo visitors
  const isRealUser = realRole !== null;

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
        {isRealUser
          ? 'Il tuo account non ha accesso a questa area. Contatta il tuo KORA referente.'
          : <>Ruolo attivo: <strong style={{ color: TOKENS.inkSecondary }}>{activeRole}</strong>{' '}— usa il Role Switcher per passare a WORKER.</>
        }
      </p>
    </div>
  );
}
