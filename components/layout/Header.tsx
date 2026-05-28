'use client';

import { useRole, useEnvironment } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { EnvironmentSwitcher } from '@/components/demo/EnvironmentSwitcher';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';
import type { Environment } from '@/lib/types';

const ENV_BADGE_TEXT: Record<Environment, string> = {
  demo:   'DEMO · dati simulati',
  live:   'LIVE · service-assisted · operato da KORA',
  future: 'FUTURE · roadmap · non attivo',
};

export function Header() {
  const { activeRole } = useRole();
  const { activeEnvironment } = useEnvironment();

  const showScenarioSwitcher =
    (isEmployerRole(activeRole) || isAdminRole(activeRole)) && activeEnvironment === 'demo';

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-800">KORA Foundation Light</span>
        <span
          className="rounded border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
          style={{
            borderColor:      'var(--env-border)',
            backgroundColor:  'var(--env-soft)',
            color:            'var(--env-text)',
          }}
        >
          {ENV_BADGE_TEXT[activeEnvironment]}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <EnvironmentSwitcher />
        <PersonaSwitcher />
        {showScenarioSwitcher && <ScenarioSwitcher />}
        <RoleSwitcher />
      </div>
    </header>
  );
}
