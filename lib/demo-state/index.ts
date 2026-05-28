'use client';

import React, { createContext, useContext, useState } from 'react';
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

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<KoraRole>('COMPANY_ADMIN');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('S1');
  const [activePersona, setActivePersona] = useState<WorkerPersona | null>(null);
  const [activeEnvironment, setActiveEnvironment] = useState<Environment>('demo');

  const value: DemoState = {
    activeRole,
    activeScenario,
    activePersona,
    activeEnvironment,
    setRole: setActiveRole,
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
