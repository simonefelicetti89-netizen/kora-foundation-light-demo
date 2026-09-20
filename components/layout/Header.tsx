'use client';

import { useEffect, useState } from 'react';
import { useRole, useEnvironment } from '@/lib/demo-state';
import { resolveRealRoleFromSession, shouldShowDemoControls } from '@/lib/demo-state/demo-controls-guard';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { EnvironmentSwitcher } from '@/components/demo/EnvironmentSwitcher';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';
import { TOKENS } from '@/lib/design/kora-design-tokens';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { AccountMenu } from '@/components/auth/AccountMenu';
import { useSidebarDrawer, SIDEBAR_DRAWER_ID } from '@/components/layout/SidebarDrawerContext';
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
      setRealRole(resolveRealRoleFromSession(data.session));
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setRealRole(resolveRealRoleFromSession(session));
    });
    return () => subscription.unsubscribe();
  }, []);

  const showDemoControls = shouldShowDemoControls(realRole);
  const drawer = useSidebarDrawer();

  const showScenarioSwitcher =
    showDemoControls &&
    (isEmployerRole(activeRole) || isAdminRole(activeRole)) &&
    activeEnvironment === 'demo';

  return (
    <header
      className="flex h-13 items-center justify-between gap-2 px-3 sm:px-6"
      style={{
        height:       '52px',
        background:   TOKENS.surface,
        borderBottom: TOKENS.cardBorder,
        flexShrink:   0,
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* WP-088: mobile-only sidebar drawer toggle. Hidden at md+ where the
            sidebar is a permanent column. Presentation only — opens the same
            navigation, changes no route or nav structure. */}
        <button
          type="button"
          onClick={drawer.toggle}
          aria-label={drawer.open ? 'Chiudi navigazione' : 'Apri navigazione'}
          aria-expanded={drawer.open}
          aria-controls={SIDEBAR_DRAWER_ID}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg md:hidden"
          style={{ background: 'transparent', border: `1px solid ${TOKENS.inkBorder}`, cursor: 'pointer' }}
        >
          <span aria-hidden="true" className="flex flex-col gap-[3px]">
            <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: TOKENS.ink }} />
            <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: TOKENS.ink }} />
            <span style={{ display: 'block', width: 16, height: 2, borderRadius: 1, background: TOKENS.ink }} />
          </span>
        </button>
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
