'use client';

import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isEmployerRole, isAdminRole, isViewerRole } from '@/lib/permissions';

// Routes that require COMPANY_ADMIN or KORA_ADMIN — COMPANY_VIEWER is blocked.
const VIEWER_BLOCKED_ROUTES = [
  '/company/data',
  '/company/financial',
  '/company/reports',
  '/company/reports/board-pack',
  '/company/activation',
  '/company/contribution',
  '/company/pillars',
  '/company/scoring',
  '/company/uef-review',
  '/company/onboarding',
  '/company/workforce-baseline',
  '/company/setup',
  '/company/ingestion',
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const pathname = usePathname();

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

  if (isViewerRole(activeRole) && VIEWER_BLOCKED_ROUTES.some((r) => pathname.startsWith(r))) {
    return (
      <AccessDeniedState
        role={activeRole}
        route={pathname}
        reason="Company Viewer è una vista privacy-safe e read-only. Questa sezione è riservata a Company Admin. Il Company Viewer non può accedere a dati operativi, Data Room, report completi, worker activation o backstage metodologico."
      />
    );
  }

  return <>{children}</>;
}
