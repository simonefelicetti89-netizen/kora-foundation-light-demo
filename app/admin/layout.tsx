'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (!isAdminRole(activeRole)) {
    return <AccessDeniedState role={activeRole} route="/admin" reason="Il workspace admin è riservato ai ruoli KORA Admin, Analyst e Founder." />;
  }
  return <>{children}</>;
}
