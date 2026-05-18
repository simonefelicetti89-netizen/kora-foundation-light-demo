'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';

export default function AdvisorLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (activeRole !== 'ADVISOR_EXTERNAL_LIGHT') {
    return <AccessDeniedState role={activeRole} route="/advisor" reason="Advisor workspace is for Advisor External Light role only." />;
  }
  return <>{children}</>;
}
