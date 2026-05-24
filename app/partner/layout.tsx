'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (activeRole !== 'PARTNER') {
    return <AccessDeniedState role={activeRole} route="/partner" requiredRole="PARTNER" reason="Il workspace partner è riservato al ruolo Partner." />;
  }
  return <>{children}</>;
}
