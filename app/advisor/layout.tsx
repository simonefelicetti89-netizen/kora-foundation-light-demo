'use client';
// Advisor layout — workspace governance per il ruolo Advisor.
// KORA_ADMIN: accesso in review mode (policy B45, coerente con my-kora).

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';
import type { KoraRole } from '@/lib/types';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  // ADVISOR: accesso pieno. KORA_ADMIN: review dati sintetici (B45).
  if (activeRole === 'ADVISOR' || isAdminRole(activeRole as KoraRole)) {
    return <>{children}</>;
  }

  return (
    <AccessDeniedState
      role={activeRole as KoraRole}
      route="/advisor"
      requiredRole={'ADVISOR' as KoraRole}
      reason="Il workspace advisor è riservato al ruolo Advisor."
    />
  );
}
