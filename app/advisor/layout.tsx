'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (activeRole !== 'ADVISOR') {
    return <AccessDeniedState role={activeRole} route="/advisor" requiredRole="ADVISOR" reason="Il workspace advisor è riservato al ruolo Advisor." />;
  }
  return <>{children}</>;
}
