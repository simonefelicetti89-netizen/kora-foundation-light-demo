'use client';

import { useScenario, useRole } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { CalibrationBadge } from '@/components/badges/CalibrationBadge';
import { CALIBRATION_STATUS } from '@/lib/constants/kora';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';

export function Header() {
  const { activeScenario } = useScenario();
  const { activeRole } = useRole();
  const showScenarioSwitcher = isEmployerRole(activeRole) || isAdminRole(activeRole);

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-800">KORA Foundation Light</span>
        {showScenarioSwitcher && (
          <span className="text-xs text-slate-400">
            Scenario: <span className="font-medium text-slate-600">{activeScenario}</span>
          </span>
        )}
        <CalibrationBadge status={CALIBRATION_STATUS} />
      </div>
      <div className="flex items-center gap-4">
        <PersonaSwitcher />
        {showScenarioSwitcher && <ScenarioSwitcher />}
        <RoleSwitcher />
      </div>
    </header>
  );
}
