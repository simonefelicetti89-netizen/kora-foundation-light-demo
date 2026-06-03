'use client';
// Partner layout — portale operativo per il ruolo Partner.
// KORA_ADMIN: accesso in review mode (policy B45, coerente con my-kora).

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';
import type { KoraRole } from '@/lib/types';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();

  // PARTNER: accesso pieno. KORA_ADMIN: review dati sintetici (B45).
  if (activeRole === 'PARTNER' || isAdminRole(activeRole as KoraRole)) {
    return <>{children}</>;
  }

  return (
    <AccessDeniedState
      role={activeRole as KoraRole}
      route="/partner"
      requiredRole={'PARTNER' as KoraRole}
      reason="Il workspace partner è riservato al ruolo Partner."
    />
  );
}
