'use client';

import { usePersona, useRole, useScenario } from '@/lib/demo-state';
import { isWorkerRole } from '@/lib/permissions';
import type { WorkerPersona } from '@/lib/types';

const PERSONAS: WorkerPersona[] = [
  {
    id:                 'persona-elena-m',
    display_name:       'Elena M.',
    department:         'Marketing & Comunicazione',
    site:               'HQ Milano',
    scenario_id:        'S1',
    synthetic_demo_data: true,
  },
  {
    id:                 'persona-marco-t',
    display_name:       'Marco T.',
    department:         'Operations & Supply Chain',
    site:               'Sede Torino',
    scenario_id:        'S1',
    synthetic_demo_data: true,
  },
  {
    id:                 'persona-sofia-r',
    display_name:       'Sofia R.',
    department:         'Technology & Digital',
    site:               'HQ Milano',
    scenario_id:        'S1',
    synthetic_demo_data: true,
  },
  {
    id:                 'persona-giovanni-b',
    display_name:       'Giovanni B.',
    department:         'HR & People',
    site:               'HQ Milano',
    scenario_id:        'S1',
    synthetic_demo_data: true,
  },
];

export function PersonaSwitcher() {
  const { activeRole } = useRole();
  const { activeScenario } = useScenario();
  const { activePersona, setPersona } = usePersona();

  if (!isWorkerRole(activeRole)) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(6,3,43,0.40)] select-none whitespace-nowrap">
        Profilo
      </span>
      <div className="relative">
        <select
          value={activePersona?.id ?? ''}
          onChange={(e) => {
            if (!e.target.value) { setPersona(null); return; }
            const persona = PERSONAS.find((p) => p.id === e.target.value);
            if (!persona) return;
            setPersona({ ...persona, scenario_id: activeScenario });
          }}
          className="appearance-none rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] pl-2.5 pr-6 py-1.5 text-xs font-semibold text-[#2F7D55] shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
          aria-label="Switch worker persona"
        >
          <option value="">— Seleziona profilo —</option>
          {PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>{p.display_name}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[rgba(6,3,43,0.40)] text-[10px]">
          ▾
        </span>
      </div>
    </div>
  );
}
