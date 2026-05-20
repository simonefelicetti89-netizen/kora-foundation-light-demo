'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isEmployerRole, isAdminRole } from '@/lib/permissions';

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const allowed = isEmployerRole(activeRole) || isAdminRole(activeRole);

  if (!allowed) {
    return (
      <AccessDeniedState
        role={activeRole}
        route="/company"
        reason="Il workspace aziendale è accessibile ai ruoli company e admin soltanto."
      />
    );
  }
  return <>{children}</>;
}
