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
  koraRole: 'COMPANY_ADMIN' | 'COMPANY_VIEWER' | null;
  companyName: string | null;
  sessionLoading: boolean;
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
  children:    React.ReactNode;
  tenantId:    string;
  koraRole:    'COMPANY_ADMIN' | 'COMPANY_VIEWER';
  companyName: string | null;
}

export function CompanySessionProvider({ children, tenantId, koraRole, companyName }: Props) {
  return (
    <CompanySessionContext.Provider
      value={{
        isLive: true,    // server guard guarantees a real company session
        tenantId,
        koraRole,
        companyName,
        sessionLoading: false,   // no async detection — data is ready at mount
      }}
    >
      {children}
    </CompanySessionContext.Provider>
  );
}
