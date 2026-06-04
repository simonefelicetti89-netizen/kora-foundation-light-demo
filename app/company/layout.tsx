'use client';

import { usePathname } from 'next/navigation';
import { useRole } from '@/lib/demo-state';
import { AccessDeniedState } from '@/components/privacy/AccessDeniedState';
import { isEmployerRole, isAdminRole, isViewerRole } from '@/lib/permissions';
import { CompanySessionProvider, useCompanySession } from './_providers/CompanySessionProvider';

// B36.1: All /company/* routes that are demo-driven (use synthetic Meridiana data)
// when accessed without a real Supabase company session.
// B59: Real company sessions (COMPANY_ADMIN/VIEWER) now access these routes with live data.
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

// ── Inner layout — uses session context for DEMO banner suppression ─────────────
// Separate from the outer layout so it can consume the CompanySessionProvider.

function CompanyLayoutInner({ children }: { children: React.ReactNode }) {
  const { activeRole } = useRole();
  const { isLive, sessionLoading } = useCompanySession();
  const pathname = usePathname();

  const isWorkspacePath = pathname.startsWith('/company/workspace');

  // Demo-state role check applies to non-live, non-workspace paths
  const allowed = isEmployerRole(activeRole) || isAdminRole(activeRole) || isWorkspacePath || isLive;
  if (!allowed) {
    return (
      <AccessDeniedState
        role={activeRole}
        route="/company"
        reason="Il workspace aziendale è accessibile ai ruoli company e admin soltanto."
      />
    );
  }

  // COMPANY_VIEWER blocks: applies in demo mode. In live mode, middleware + server auth
  // handle viewer restrictions; the layout does not need to re-enforce them.
  if (!isLive && isViewerRole(activeRole) && VIEWER_BLOCKED_ROUTES.some((r) => pathname.startsWith(r))) {
    return (
      <AccessDeniedState
        role={activeRole}
        route={pathname}
        reason="Company Viewer è una vista privacy-safe e read-only. Questa sezione è riservata a Company Admin e KORA Admin."
      />
    );
  }

  // Show SYNTHETIC DEMO banner only when:
  //   - Not a live session (isLive = false after session check completes)
  //   - Not the workspace path (workspace has its own auth)
  //   - On a demo-driven route
  // Hidden for real company sessions (they see their own live data, not Meridiana).
  const isDemoDrivenPath = !isWorkspacePath && (
    pathname === '/company' || DEMO_DRIVEN_ROUTES.some((r) => pathname.startsWith(r))
  );
  const showDemoBanner = isDemoDrivenPath && !isLive && !sessionLoading;

  return (
    <>
      {showDemoBanner && (
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

// ── Outer layout — wraps children with CompanySessionProvider ─────────────────

export default function CompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompanySessionProvider>
      <CompanyLayoutInner>
        {children}
      </CompanyLayoutInner>
    </CompanySessionProvider>
  );
}
