'use client';
// Partner layout — portale operativo per il ruolo Partner.
// B127: Handles both real PARTNER Supabase sessions and demo-state PARTNER role.
// KORA_ADMIN: review access in demo mode (B45).

import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isAdminRole } from '@/lib/permissions';
import type { KoraRole } from '@/lib/types';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const [realRole, setRealRole] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      const role = data.session?.user?.app_metadata?.kora_role as string | undefined;
      setRealRole(role ?? null);
    });
  }, []);

  // Real PARTNER session always passes through — no demo-state dependency
  if (realRole === 'PARTNER') return <>{children}</>;

  // Demo mode: PARTNER or KORA_ADMIN demo roles pass through
  if (activeRole === 'PARTNER' || isAdminRole(activeRole as KoraRole)) {
    return <>{children}</>;
  }

  // Brief loading state — avoids flash of access-denied for real PARTNER sessions
  if (realRole === undefined) return null;

  return (
    <AccessDeniedState
      role={activeRole as KoraRole}
      route="/partner"
      requiredRole={'PARTNER' as KoraRole}
      reason="Il workspace partner è riservato al ruolo Partner."
    />
  );
}
