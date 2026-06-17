'use client';

// app/company/_providers/CompanySessionProvider.tsx
// B137: No longer a session detector. Distributes pre-validated session data
// received from the server layout (app/company/layout.tsx).
//
// The session is validated server-side by requireCompanyUser() before this
// component mounts — no client-side async detection needed.
// sessionLoading is always false; isLive is always true.

import { createContext, useContext } from 'react';

export interface CompanySessionCtx {
  isLive: boolean;
  tenantId: string | null;
  koraRole: 'COMPANY_ADMIN' | 'KORA_ADMIN' | null;
  companyName: string | null;
  sessionLoading: boolean;
  // Presente solo quando KORA_ADMIN accede con accesso privilegiato — per banner Phase 5.
  adminServiceAccess?: boolean;
}

const CompanySessionContext = createContext<CompanySessionCtx>({
  isLive:         false,
  tenantId:       null,
  koraRole:       null,
  companyName:    null,
  sessionLoading: false,
});

export function useCompanySession(): CompanySessionCtx {
  return useContext(CompanySessionContext);
}

interface Props {
  children:           React.ReactNode;
  tenantId:           string;
  koraRole:           'COMPANY_ADMIN' | 'KORA_ADMIN';
  companyName:        string | null;
  adminServiceAccess?: boolean;
}

export function CompanySessionProvider({ children, tenantId, koraRole, companyName, adminServiceAccess }: Props) {
  return (
    <CompanySessionContext.Provider
      value={{
        isLive: true,
        tenantId,
        koraRole,
        companyName,
        sessionLoading: false,
        adminServiceAccess,
      }}
    >
      {children}
    </CompanySessionContext.Provider>
  );
}
