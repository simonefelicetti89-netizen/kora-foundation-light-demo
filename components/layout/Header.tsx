'use client';

import { useRole } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';

export function Header() {
  const { activeRole } = useRole();
  const showScenarioSwitcher = isEmployerRole(activeRole) || isAdminRole(activeRole);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-800">KORA Foundation Light</span>
        <span className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-400 whitespace-nowrap">
          dati sintetici
        </span>
      </div>
      <div className="flex items-center gap-4">
        <PersonaSwitcher />
        {showScenarioSwitcher && <ScenarioSwitcher />}
        <RoleSwitcher />
      </div>
    </header>
  );
}
