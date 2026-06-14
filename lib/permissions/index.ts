import type { KoraRole } from '@/lib/types';
import { EMPLOYER_ROLES, WORKER_ROLES, ADMIN_ROLES } from '@/lib/constants/kora';

export function isEmployerRole(role: KoraRole): boolean {
  return (EMPLOYER_ROLES as readonly string[]).includes(role);
}

export function isWorkerRole(role: KoraRole): boolean {
  return (WORKER_ROLES as readonly string[]).includes(role);
}

export function isAdminRole(role: KoraRole): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(role);
}

// B143: COMPANY_VIEWER rimosso. isViewerRole() restituisce sempre false.
// Il meccanismo read-only (isViewer/canWrite) è conservato nei componenti per riuso futuro
// (un futuro ruolo sola-lettura potrà riattivarlo). Non rimuovere le chiamate a questa funzione.
export function isViewerRole(role: KoraRole): boolean {
  void role;
  return false;
}

// Resources that only a worker may access (never employer roles)
const WORKER_PRIVATE_RESOURCES = new Set([
  'pib-records',
  'dynamic-cv',
  'bookings',
  'consent-records',
  'milestones',
  'my-kora',
  'opportunities',
  'personal',
  'worker-profiles-individual',
]);

// Resources restricted to admin/internal roles
const ADMIN_ONLY_RESOURCES = new Set([
  'founder-validation',
  'scoring-run-create',
  'uef-review',
  'impact-units',
]);

// Resources restricted to Finance + Admin roles (informational governance data)
const FINANCE_ADMIN_RESOURCES = new Set([
  'financial_governance',
  'source-batches',
]);

export function resolvePermission(role: KoraRole, resource: string): boolean {
  if (WORKER_PRIVATE_RESOURCES.has(resource)) return isWorkerRole(role);
  if (ADMIN_ONLY_RESOURCES.has(resource)) return isAdminRole(role) || role === 'COMPANY_ADMIN';
  if (FINANCE_ADMIN_RESOURCES.has(resource)) {
    return isAdminRole(role) || role === 'COMPANY_ADMIN';
  }
  return true;
}

// ── Route Authorization — Two Separate Maps ───────────────────────────────────
//
// IMPORTANT: There are two distinct route access models in KORA.
//
// 1. getAccessibleRoutes() — PRODUCTION middleware helper.
//    Maps what server-side middleware/RLS allows for authenticated real sessions.
//    COMPANY_ADMIN is restricted to /company/workspace for live server-auth sessions
//    (B36.1 design decision; B143: COMPANY_VIEWER removed).
//    All other /company/* screens are DEMO_SYNTHETIC — served via demo-state
//    and KORA_ADMIN role, not by real company sessions in production.
//    DO NOT use this function to build demo navigation or sidebar items.
//    Gate 2 condition: once real company sessions go live, this map expands.
//
// 2. getDemoNavigationRoutes() — DEMO navigation helper.
//    Maps the full set of routes accessible in demo mode for each role.
//    Used by: sidebar navigation, role-switcher, demo-state routing.
//    Employer roles access all /company/* pages in demo (synthetic data only).
//    My KORA is accessible to WORKER role only — never employer roles.

export function getAccessibleRoutes(role: KoraRole): string[] {
  const routes: string[] = ['/', '/demo-guide'];
  if (isAdminRole(role)) {
    routes.push(
      '/admin', '/admin/portfolio', '/admin/index-registry',
      '/admin/benchmarks', '/admin/network', '/admin/gtm', '/admin/ai-onboarding',
      '/company', '/company/ingestion', '/company/ingestion/mapping-review',
      '/company/uef-review', '/company/scoring', '/company/kora-index', '/company/reports',
      '/company/activation', '/company/contribution', '/company/pillars',
      '/company/data', '/company/financial', '/company/opportunities', '/company/workspace',
      '/company/profile',
    );
  }
  // B36.1: Company roles are restricted to /company/workspace (live, server-auth).
  // Demo-driven /company/* routes are DEMO_SYNTHETIC — accessible via demo-state only.
  // Use getDemoNavigationRoutes() for demo sidebar/navigation decisions.
  if (role === 'COMPANY_ADMIN') routes.push('/company/workspace');
  if (isWorkerRole(role)) {
    routes.push(
      '/my-kora', '/my-kora/privacy', '/my-kora/dynamic-cv',
      '/my-kora/opportunities', '/my-kora/bookings', '/my-kora/collective',
      '/my-kora/personal-impact-balance', '/my-kora/kora-space',
    );
  }
  if (role === 'PARTNER') routes.push('/partner');
  if (role === 'ADVISOR') routes.push('/advisor');
  if (role !== 'COMPANY_ADMIN') {
    routes.push('/future-vision');
  }
  return [...new Set(routes)];
}

// Full company route set accessible in demo mode (synthetic data, no live auth).
// All employer roles see all /company/* pages — data is DEMO_SYNTHETIC throughout.
// Employer roles never access /my-kora live data — only WORKER sees My KORA.
const COMPANY_DEMO_ROUTES = [
  '/company',
  '/company/kora-index',
  '/company/financial',
  '/company/activation',
  '/company/contribution',
  '/company/pillars',
  '/company/reports',
  '/company/opportunities',
  '/company/workspace',
  '/company/profile',
  '/company/ingestion',
  '/company/ingestion/mapping-review',
  '/company/uef-review',
  '/company/scoring',
  '/company/data',
] as const;

export function getDemoNavigationRoutes(role: KoraRole): string[] {
  const routes: string[] = ['/', '/demo-guide'];

  if (isAdminRole(role)) {
    routes.push(
      '/admin', '/admin/portfolio', '/admin/index-registry',
      '/admin/companies', '/admin/companies/new', '/admin/company-users',
      '/admin/data-intake', '/admin/uef-review', '/admin/company-live-preview',
      '/admin/company-workspace', '/admin/benchmarks', '/admin/network',
      '/admin/gtm', '/admin/ai-onboarding',
      ...COMPANY_DEMO_ROUTES,
      '/future-vision',
    );
  }

  // Company roles access all company pages in demo (synthetic data only).
  // My KORA is never accessible to employer roles — worker-private space.
  if (role === 'COMPANY_ADMIN') {
    routes.push(...COMPANY_DEMO_ROUTES);
  }

  if (isWorkerRole(role)) {
    routes.push(
      '/my-kora', '/my-kora/privacy', '/my-kora/dynamic-cv',
      '/my-kora/opportunities', '/my-kora/bookings', '/my-kora/collective',
      '/my-kora/personal-impact-balance', '/my-kora/kora-space',
    );
  }

  if (role === 'PARTNER') routes.push('/partner');
  if (role === 'ADVISOR') routes.push('/advisor');

  return [...new Set(routes)];
}
