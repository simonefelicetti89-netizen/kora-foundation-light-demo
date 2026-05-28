'use client';

import { useRole, useEnvironment } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { EnvironmentSwitcher } from '@/components/demo/EnvironmentSwitcher';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';

const ENV_BADGE: Record<string, { text: string; cls: string }> = {
  demo:   { text: 'DEMO · dati simulati',                         cls: 'border-blue-200 bg-blue-50 text-blue-600' },
  live:   { text: 'LIVE · service-assisted · operato da KORA',    cls: 'border-slate-300 bg-slate-100 text-slate-700' },
  future: { text: 'FUTURE · roadmap · non attivo',                cls: 'border-slate-200 bg-slate-50 text-slate-400' },
};

export function Header() {
  const { activeRole } = useRole();
  const { activeEnvironment } = useEnvironment();

  const showScenarioSwitcher =
    (isEmployerRole(activeRole) || isAdminRole(activeRole)) && activeEnvironment === 'demo';

  const badge = ENV_BADGE[activeEnvironment] ?? ENV_BADGE.demo;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-800">KORA Foundation Light</span>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap ${badge.cls}`}>
          {badge.text}
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
