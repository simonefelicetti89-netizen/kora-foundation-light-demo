'use client';

import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { KoraRole } from '@/lib/types';
import { formatRole } from '@/lib/formatters';
import { useRole } from '@/lib/demo-state';

interface AccessDeniedStateProps {
  role: KoraRole;
  route: string;
  reason?: string;
  requiredRole?: KoraRole;
  className?: string;
}

export function AccessDeniedState({ role, route, reason, requiredRole, className }: AccessDeniedStateProps) {
  const { setRole } = useRole();
  const router = useRouter();

  function handleRoleSwitch() {
    if (!requiredRole) return;
    setRole(requiredRole);
    router.push(route);
  }

  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-[rgba(6,3,43,0.08)] bg-[rgba(6,3,43,0.03)] p-8 text-center',
        className,
      )}
      role="alert"
    >
      <div className="mb-4 text-4xl text-[rgba(6,3,43,0.28)]">🔒</div>
      <h2 className="text-lg font-semibold text-[rgba(6,3,43,0.78)]">Accesso Negato</h2>
      <p className="mt-2 max-w-sm text-sm text-[rgba(6,3,43,0.52)]">
        La route <code className="rounded bg-[rgba(6,3,43,0.12)] px-1 text-xs">{route}</code> non è accessibile
        per il ruolo <span className="font-medium">{formatRole(role)}</span>.
      </p>
      {reason && <p className="mt-2 text-xs text-[rgba(6,3,43,0.40)]">{reason}</p>}
      {requiredRole ? (
        <div className="mt-5 flex flex-col items-center gap-3">
          <p className="max-w-sm text-xs text-[rgba(6,3,43,0.40)]">
            Questo workspace è protetto da ruolo demo. Per visualizzarlo, seleziona il ruolo{' '}
            <span className="font-semibold text-[rgba(6,3,43,0.62)]">{formatRole(requiredRole)}</span> dal Role Switcher
            oppure usa il pulsante qui sotto.
          </p>
          <button
            onClick={handleRoleSwitch}
            className="rounded-md bg-[#06032B] px-4 py-2 text-sm font-semibold text-white hover:bg-[rgba(6,3,43,0.88)] transition-colors"
          >
            Passa al ruolo corretto
          </button>
        </div>
      ) : (
        <p className="mt-4 text-xs text-[rgba(6,3,43,0.40)]">
          Usa il Role Switcher per passare a un ruolo appropriato per questa sezione.
        </p>
      )}
    </div>
  );
}
