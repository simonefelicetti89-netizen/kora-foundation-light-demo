'use client';

import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isEmployerRole, isAdminRole, isViewerRole } from '@/lib/permissions';

// B36.1: All /company/* routes that are demo-driven (use synthetic Meridiana data).
// These are DEMO_SYNTHETIC pages — accessible via demo-state, labeled clearly.
// Real company sessions are blocked upstream in middleware.ts (redirected to /company/workspace).
const DEMO_DRIVEN_ROUTES = [
  '/company/shared',
  '/company/profile',
  '/company/activation',
  '/company/contribution',
  '/company/pillars',
  '/company/onboarding',
  '/company/kora-index',
  '/company/financial',
  '/company/reports',
  '/company/reports/board-pack',
  '/company/data',
  '/company/data/upload',
  '/company/ingestion',
  '/company/ingestion/mapping-review',
  '/company/scoring',
  '/company/uef-review',
  '/company/workforce-baseline',
  '/company/setup',
];

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
  '/company/profile',
  '/company/shared',
];

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const pathname = usePathname();

  // /company/workspace has its own server-side auth (requireCompanyUser) — bypass demo-state check.
  const isWorkspacePath = pathname.startsWith('/company/workspace');

  const allowed = isEmployerRole(activeRole) || isAdminRole(activeRole) || isWorkspacePath;
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
        reason="Company Viewer è una vista privacy-safe e read-only. Questa sezione è riservata a Company Admin e KORA Admin."
      />
    );
  }

  // B36.1: Show synthetic demo banner on all non-workspace company pages.
  // Middleware has already redirected any real company session users to /company/workspace,
  // so this banner is only seen by demo-state users (KORA_ADMIN, demo roles, demo guide).
  const isDemoDrivenPath = !isWorkspacePath && (
    pathname === '/company' || DEMO_DRIVEN_ROUTES.some((r) => pathname.startsWith(r))
  );

  return (
    <>
      {isDemoDrivenPath && (
        <div
          className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 text-[11px] font-semibold"
          style={{
            background:   'var(--env-soft)',
            borderBottom: '1px solid var(--env-border)',
            color:        'var(--env-text)',
            fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          }}
        >
          <span
            style={{
              borderRadius: 4,
              padding:      '2px 6px',
              fontSize:     '9px',
              fontWeight:   700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
              background:   'var(--env-border)',
              color:        'var(--env-text)',
            }}
          >
            SYNTHETIC DEMO
          </span>
          <span>Dati sintetici Meridiana Group · Non un workspace aziendale live</span>
        </div>
      )}
      {children}
    </>
  );
}
