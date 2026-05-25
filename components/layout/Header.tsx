'use client';

import { useScenario, useRole } from '@/lib/demo-state';
import { RoleSwitcher } from '@/components/demo/RoleSwitcher';
import { ScenarioSwitcher } from '@/components/demo/ScenarioSwitcher';
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher';
import { CalibrationBadge } from '@/components/badges/CalibrationBadge';
import { CALIBRATION_STATUS } from '@/lib/constants/kora';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';

const SCENARIO_LABELS: Record<string, string> = {
  S1: 'S1 Baseline',
  S2: 'S2 Miglioramento',
};

export function Header() {
  const { activeScenario } = useScenario();
  const { activeRole } = useRole();
  const showScenarioSwitcher = isEmployerRole(activeRole) || isAdminRole(activeRole);
  const scenarioLabel = SCENARIO_LABELS[activeScenario] ?? activeScenario;

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-slate-800">KORA Foundation Light</span>
        {showScenarioSwitcher && (
          <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 whitespace-nowrap">
            Scenario attivo: {scenarioLabel} · dati demo sintetici
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
