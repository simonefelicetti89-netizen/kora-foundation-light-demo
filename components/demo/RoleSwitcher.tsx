'use client';

import { useRole } from '@/lib/demo-state';
import { KORA_ROLES } from '@/lib/constants/kora';
import { formatRole } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { KoraRole } from '@/lib/types';

const ROLE_COLORS: Record<string, string> = {
  KORA_ADMIN:     'text-indigo-700',
  COMPANY_ADMIN:  'text-slate-700',
  COMPANY_VIEWER: 'text-slate-600',
  WORKER:         'text-emerald-700',
  PARTNER:        'text-violet-700',
  ADVISOR:        'text-blue-700',
};

export function RoleSwitcher() {
  const { activeRole, setRole } = useRole();
  const colorClass = ROLE_COLORS[activeRole] ?? 'text-slate-700';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 select-none whitespace-nowrap">
        Vista
      </span>
      <div className="relative">
        <select
          value={activeRole}
          onChange={(e) => setRole(e.target.value as KoraRole)}
          className={cn(
            'appearance-none rounded-md border border-slate-200 bg-slate-50 pl-2.5 pr-6 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300',
            colorClass,
          )}
          aria-label="Switch demo role"
        >
          {KORA_ROLES.map((role) => (
            <option key={role} value={role}>
              {formatRole(role)}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-slate-400 text-[10px]">
          ▾
        </span>
      </div>
    </div>
  );
}
