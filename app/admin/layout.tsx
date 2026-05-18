'use client';

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (!isAdminRole(activeRole)) {
    return <AccessDeniedState role={activeRole} route="/admin" reason="Admin workspace is restricted to KORA Admin, Analyst, and Founder roles." />;
  }
  return <>{children}</>;
}
