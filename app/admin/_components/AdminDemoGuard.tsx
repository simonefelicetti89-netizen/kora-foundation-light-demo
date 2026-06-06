'use client';
// Client component: demo-state role check for the admin workspace.
// Server-side Supabase auth is enforced by app/admin/layout.tsx (Server Component).
// This guard provides additional demo-mode protection via useRole().

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';

export function AdminDemoGuard({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  if (!isAdminRole(activeRole)) {
    return (
      <AccessDeniedState
        role={activeRole}
        route="/admin"
        reason="Il workspace admin è riservato agli operatori KORA Admin."
      />
    );
  }
  return <>{children}</>;
}
