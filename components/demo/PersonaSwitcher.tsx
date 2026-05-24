'use client';

import { usePersona, useRole } from '@/lib/demo-state';
import { isWorkerRole } from '@/lib/permissions';

// My KORA only — shown when active role is WORKER
export function PersonaSwitcher() {
  const { activeRole } = useRole();
  const { activePersona, setPersona } = usePersona();

  if (!isWorkerRole(activeRole)) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        PERSONA
      </span>
      <select
        value={activePersona?.id ?? ''}
        onChange={(e) => {
          if (!e.target.value) { setPersona(null); return; }
          setPersona({
            id: e.target.value,
            display_name: e.target.value,
            department: 'Stub dept',
            site: 'HQ Milano',
            scenario_id: 'S1',
            synthetic_demo_data: true,
          });
        }}
        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        aria-label="Switch worker persona"
      >
        <option value="">— Select persona —</option>
        <option value="persona-elena-m">Persona: Elena M.</option>
        <option value="persona-marco-t">Persona: Marco T.</option>
        <option value="persona-sofia-r">Persona: Sofia R.</option>
      </select>
    </div>
  );
}
