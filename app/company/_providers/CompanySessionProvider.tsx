'use client';

// app/company/_providers/CompanySessionProvider.tsx
// B59: Client-side Supabase session detection for company intelligence pages.
//
// Detects whether the current browser session belongs to a real
// COMPANY_ADMIN or COMPANY_VIEWER. When true, intelligence pages use live
// Supabase data instead of the synthetic Meridiana demo seed.
//
// Design invariants:
//   - Never modifies global demo-state — demo mode is preserved for KORA_ADMIN
//     and unauthenticated visitors.
//   - isLive = false during the async session check (loading state).
//   - LIVE must NEVER fallback to demo seed data (enforced in useScoringResult).
//   - tenantId is always sourced from app_metadata.kora_tenant_id (server-signed JWT).
//   - Never reads tenantId from URL params or request body.

import { createContext, useContext, useEffect, useState } from 'react';

export interface CompanySessionCtx {
  isLive: boolean;                   // true = real Supabase session with company role
  tenantId: string | null;           // UUID from app_metadata.kora_tenant_id
  koraRole: 'COMPANY_ADMIN' | 'COMPANY_VIEWER' | null;
  sessionLoading: boolean;           // true while session is being detected
}

const CompanySessionContext = createContext<CompanySessionCtx>({
  isLive: false,
  tenantId: null,
  koraRole: null,
  sessionLoading: true,
});

export function useCompanySession(): CompanySessionCtx {
  return useContext(CompanySessionContext);
}

interface Props { children: React.ReactNode; }

export function CompanySessionProvider({ children }: Props) {
  const [ctx, setCtx] = useState<CompanySessionCtx>({
    isLive: false,
    tenantId: null,
    koraRole: null,
    sessionLoading: true,
  });

  useEffect(() => {
    let active = true;

    async function detectSession() {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session || !active) {
          if (active) setCtx({ isLive: false, tenantId: null, koraRole: null, sessionLoading: false });
          return;
        }

        const appMeta = session.user.app_metadata as Record<string, unknown> | undefined;
        const role    = appMeta?.kora_role as string | undefined;
        const tid     = appMeta?.kora_tenant_id as string | undefined;
        const status  = appMeta?.kora_status as string | undefined;

        const isCompanyRole = role === 'COMPANY_ADMIN' || role === 'COMPANY_VIEWER';
        const isActive      = status !== 'suspended' && status !== 'disabled';

        if (isCompanyRole && isActive && tid) {
          if (active) setCtx({
            isLive:        true,
            tenantId:      tid,
            koraRole:      role as 'COMPANY_ADMIN' | 'COMPANY_VIEWER',
            sessionLoading: false,
          });
        } else {
          if (active) setCtx({ isLive: false, tenantId: null, koraRole: null, sessionLoading: false });
        }
      } catch {
        if (active) setCtx({ isLive: false, tenantId: null, koraRole: null, sessionLoading: false });
      }
    }

    detectSession();
    return () => { active = false; };
  }, []);

  return (
    <CompanySessionContext.Provider value={ctx}>
      {children}
    </CompanySessionContext.Provider>
  );
}
