'use client';

import { useEffect, useState } from 'react';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { EnvironmentSwitcher } from '@/components/demo/EnvironmentSwitcher';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/auth/AccountMenu';
import type { Environment } from '@/lib/types';

const ENV_BADGE_TEXT: Record<Environment, string> = {
  demo:   'DEMO · dati simulati',
  live:   'LIVE · service-assisted · operato da KORA',
  future: 'FUTURE · roadmap · non attivo',
};

export function Header() {
  const { activeRole } = useRole();
  const { activeEnvironment } = useEnvironment();

  // B117: Read real Supabase session to gate demo controls.
  // Demo controls (RoleSwitcher, EnvironmentSwitcher, etc.) are ONLY for KORA_ADMIN
  // and unauthenticated demo-state users. Real COMPANY/WORKER sessions should never
  // see the Vista/DEMO-LIVE-FUTURE switchers — they make no sense to real users.
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.app_metadata?.kora_role as string | undefined;
      setRealRole(role ?? null);
    });
    // Listen for auth state changes (login/logout without page reload)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const role = session?.user?.app_metadata?.kora_role as string | undefined;
      setRealRole(role ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Show demo controls when:
  // - No real session (null) → pure demo mode, all controls visible
  // - Real session with KORA_ADMIN → full operator access
  // Hide demo controls when:
  // - Session check still pending (undefined) → HIDE (fail-safe toward live — avoids
  //   DEMO banner flash for real users; getSession() resolves fast from memory for demo)
  // - Real session with COMPANY_ADMIN, WORKER → real user, controls irrelevant
  const realRoleIsCompanyOrWorker =
    realRole === 'COMPANY_ADMIN' ||
    realRole === 'WORKER';

  const showDemoControls = realRole !== undefined && !realRoleIsCompanyOrWorker;

  const showScenarioSwitcher =
    showDemoControls &&
    (isEmployerRole(activeRole) || isAdminRole(activeRole)) &&
    activeEnvironment === 'demo';

  return (
    <header
      className="flex h-13 items-center justify-between px-6"
      style={{
        height:       '52px',
        background:   TOKENS.surface,
        borderBottom: TOKENS.cardBorder,
        flexShrink:   0,
      }}
    >
      <div className="flex items-center gap-3">
        {showDemoControls && (
          <span
            className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold whitespace-nowrap tracking-wide"
            style={{
              borderWidth:     1,
              borderStyle:     'solid',
              borderColor:     'var(--env-border)',
              backgroundColor: 'var(--env-soft)',
              color:           'var(--env-text)',
              fontFamily:      'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
            }}
          >
            {ENV_BADGE_TEXT[activeEnvironment]}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showDemoControls && <EnvironmentSwitcher />}
        {showDemoControls && <PersonaSwitcher />}
        {showScenarioSwitcher && <ScenarioSwitcher />}
        {showDemoControls && <RoleSwitcher />}
        <AccountMenu />
      </div>
    </header>
  );
}
