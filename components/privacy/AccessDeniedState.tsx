'use client';

import { cn } from '@/lib/utils';
import type { KoraRole } from '@/lib/types';
import { formatRole } from '@/lib/formatters';

interface AccessDeniedStateProps {
  role: KoraRole;
  route: string;
  reason?: string;
  className?: string;
}

export function AccessDeniedState({ role, route, reason, className }: AccessDeniedStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 text-center',
        className,
      )}
      role="alert"
    >
      <div className="mb-4 text-4xl text-slate-300">🔒</div>
      <h2 className="text-lg font-semibold text-slate-700">Access Denied</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-500">
        The route <code className="rounded bg-slate-200 px-1 text-xs">{route}</code> is not accessible
        for role <span className="font-medium">{formatRole(role)}</span>.
      </p>
      {reason && <p className="mt-2 text-xs text-slate-400">{reason}</p>}
      <p className="mt-4 text-xs text-slate-400">
        Use the Role Switcher to switch to an appropriate role for this section.
      </p>
    </div>
  );
}
