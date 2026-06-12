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
  '/company/contribution',
  '/company/onboarding',
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
          className="sticky top-0 z-10 flex items-center gap-3 px-4"
          style={{
            minHeight:    40,
            background:   'rgba(199,111,61,0.14)',
            borderBottom: '1.5px solid rgba(199,111,61,0.38)',
            color:        '#C76F3D',
            fontFamily:   'Plus Jakarta Sans, var(--font-jakarta), system-ui, sans-serif',
          }}
        >
          <span
            style={{
              borderRadius:  5,
              padding:       '3px 8px',
              fontSize:      '9px',
              fontWeight:    800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              background:    'rgba(199,111,61,0.25)',
              color:         '#C76F3D',
              border:        '1.5px solid rgba(199,111,61,0.45)',
              flexShrink:    0,
            }}
          >
            SYNTHETIC DEMO
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(199,111,61,0.85)' }}>
            Stai visualizzando dati sintetici di Meridiana Group S.r.l.
          </span>
          <span style={{ fontSize: 11, color: 'rgba(199,111,61,0.55)', marginLeft: 'auto' }}>
            Non un workspace aziendale live
          </span>
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
