'use client';

import { useRole } from '@/lib/demo-state';
import { KORA_ROLES } from '@/lib/constants/kora';
import { formatRole } from '@/lib/formatters';
import type { KoraRole } from '@/lib/types';

// DEMO ONLY — not production auth
export function RoleSwitcher() {
  const { activeRole, setRole } = useRole();

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        DEMO ROLE
      </span>
      <select
        value={activeRole}
        onChange={(e) => setRole(e.target.value as KoraRole)}
        className="rounded border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
        aria-label="Switch demo role"
      >
        {KORA_ROLES.map((role) => (
          <option key={role} value={role}>
            {formatRole(role)}
          </option>
        ))}
      </select>
    </div>
  );
}
