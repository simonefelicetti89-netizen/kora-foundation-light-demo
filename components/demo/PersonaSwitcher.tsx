'use client';

import { usePersona, useRole } from '@/lib/demo-state';
import { isWorkerRole } from '@/lib/permissions';

export function PersonaSwitcher() {
  const { activeRole } = useRole();
  const { activePersona, setPersona } = usePersona();

  if (!isWorkerRole(activeRole)) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 select-none whitespace-nowrap">
        Profilo
      </span>
      <div className="relative">
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
          className="appearance-none rounded-md border border-slate-200 bg-slate-50 pl-2.5 pr-6 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
          aria-label="Switch worker persona"
        >
          <option value="">— Seleziona profilo —</option>
          <option value="persona-elena-m">Elena M.</option>
          <option value="persona-marco-t">Marco T.</option>
          <option value="persona-sofia-r">Sofia R.</option>
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-[10px]">
          ▾
        </span>
      </div>
    </div>
  );
}
