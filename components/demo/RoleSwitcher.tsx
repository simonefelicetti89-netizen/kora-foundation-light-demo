'use client';

import { useRole } from '@/lib/demo-state';
import { KORA_ROLES } from '@/lib/constants/kora';
import { formatRole } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { KoraRole } from '@/lib/types';

// Role colors — Layer token–aligned, no raw Tailwind color classes
const ROLE_COLORS: Record<string, string> = {
  KORA_ADMIN:     'text-[#C76F3D]',
  COMPANY_ADMIN:  'text-[rgba(6,3,43,0.78)]',
  WORKER:         'text-[#2F7D55]',
  PARTNER:        'text-[#D99767]',   // warm sand — partner color
  ADVISOR:        'text-[#4A7FE0]',   // institutional blue — advisor
};

export function RoleSwitcher() {
  const { activeRole, setRole } = useRole();
  const colorClass = ROLE_COLORS[activeRole] ?? 'text-[rgba(6,3,43,0.78)]';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold uppercase tracking-widest text-[rgba(6,3,43,0.40)] select-none whitespace-nowrap">
        Vista
      </span>
      <div className="relative">
        <select
          value={activeRole}
          onChange={(e) => setRole(e.target.value as KoraRole)}
          className={cn(
            'appearance-none rounded-md border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] pl-2.5 pr-6 py-1.5 text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300',
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
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[rgba(6,3,43,0.40)] text-[10px]">
          ▾
        </span>
      </div>
    </div>
  );
}
