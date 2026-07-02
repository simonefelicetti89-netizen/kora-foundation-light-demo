'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { KoraRole, ScenarioId, WorkerPersona, Environment } from '@/lib/types';

interface DemoState {
  activeRole: KoraRole;
  activeScenario: ScenarioId;
  activePersona: WorkerPersona | null;
  activeEnvironment: Environment;
  setRole: (role: KoraRole) => void;
  setScenario: (scenario: ScenarioId) => void;
  setPersona: (persona: WorkerPersona | null) => void;
  setEnvironment: (env: Environment) => void;
}

const DemoStateContext = createContext<DemoState | null>(null);

// ROLE-SWITCHER-02: pure reconciliation logic, exported for direct unit
// testing without a React renderer (this project has no React
// rendering-test dependency — see tests/unit/role-switcher-*-reconcile).
//
// activeRole is seeded once from initialRole at DemoStateProvider mount;
// React does not re-sync a useState initial value on later prop changes.
// So a role that only becomes known after login (initialRole flips from
// null to KORA_ADMIN post-auth, via router.refresh()) never reached
// activeRole, leaving a stale COMPANY_ADMIN view fighting a real
// KORA_ADMIN session. This reconciles activeRole to the real role once it
// becomes available, unless the operator has since deliberately switched
// the preview role — a manual switch always wins over reconciliation.
export function reconcileActiveRole(
  currentRole: KoraRole,
  initialRole: KoraRole | null | undefined,
  manualOverride: boolean,
): KoraRole {
  if (initialRole && !manualOverride) {
    return initialRole;
  }
  return currentRole;
}

export function DemoStateProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: KoraRole | null;
}) {
  const [activeRole, setActiveRole] = useState<KoraRole>(initialRole ?? 'COMPANY_ADMIN');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('S1');
  const [activePersona, setActivePersona] = useState<WorkerPersona | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment>('demo');
  const manualOverrideRef = useRef(false);

  useEffect(() => {
    setActiveRole((current) => reconcileActiveRole(current, initialRole, manualOverrideRef.current));
  }, [initialRole]);

  function setRole(role: KoraRole) {
    manualOverrideRef.current = true;
    setActiveRole(role);
  }

  const value: DemoState = {
    activeRole,
    activeScenario,
    activePersona,
    activeEnvironment,
    setRole,
    setScenario: setActiveScenario,
    setPersona: setActivePersona,
    setEnvironment: setActiveEnvironment,
  };

  return React.createElement(DemoStateContext.Provider, { value }, children);
}

export function useDemoState(): DemoState {
  const ctx = useContext(DemoStateContext);
  if (!ctx) throw new Error('useDemoState must be inside DemoStateProvider');
  return ctx;
}

export function useRole() {
  const { activeRole, setRole } = useDemoState();
  return { activeRole, setRole };
}

export function useScenario() {
  const { activeScenario, setScenario } = useDemoState();
  return { activeScenario, setScenario };
}

export function usePersona() {
  const { activePersona, setPersona } = useDemoState();
  return { activePersona, setPersona };
}

export function useEnvironment() {
  const { activeEnvironment, setEnvironment } = useDemoState();
  return { activeEnvironment, setEnvironment };
}
