'use client';

import React, { createContext, useContext, useState } from 'react';
import type { KoraRole, ScenarioId, WorkerPersona } from '@/lib/types';

interface DemoState {
  activeRole: KoraRole;
  activeScenario: ScenarioId;
  activePersona: WorkerPersona | null;
  setRole: (role: KoraRole) => void;
  setScenario: (scenario: ScenarioId) => void;
  setPersona: (persona: WorkerPersona | null) => void;
}

const DemoStateContext = createContext<DemoState | null>(null);

export function DemoStateProvider({ children }: { children: React.ReactNode }) {
  const [activeRole, setActiveRole] = useState<KoraRole>('COMPANY_ADMIN');
  const [activeScenario, setActiveScenario] = useState<ScenarioId>('S1');
  const [activePersona, setActivePersona] = useState<WorkerPersona | null>(null);

  const value: DemoState = {
    activeRole,
    activeScenario,
    activePersona,
    setRole: setActiveRole,
    setScenario: setActiveScenario,
    setPersona: setActivePersona,
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
