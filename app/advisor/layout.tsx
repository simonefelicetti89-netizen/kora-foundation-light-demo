'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (activeRole !== 'ADVISOR_EXTERNAL_LIGHT') {
    return <AccessDeniedState role={activeRole} route="/advisor" requiredRole="ADVISOR_EXTERNAL_LIGHT" reason="Il workspace advisor è riservato al ruolo Advisor External Light." />;
  }
  return <>{children}</>;
}
