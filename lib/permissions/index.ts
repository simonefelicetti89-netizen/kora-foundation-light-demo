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
    return isAdminRole(role) || role === 'COMPANY_ADMIN' || role === 'COMPANY_FINANCE' || role === 'COMPANY_HR';
  }
  return true;
}

export function getAccessibleRoutes(role: KoraRole): string[] {
  const routes: string[] = ['/'];
  if (isAdminRole(role)) {
    routes.push('/admin', '/company', '/company/ingestion', '/company/ingestion/mapping-review',
      '/company/uef-review', '/company/scoring', '/company/kora-index', '/company/reports',
      '/company/activation', '/company/data', '/company/financial');
  }
  if (isEmployerRole(role)) {
    routes.push(
      '/company', '/company/kora-index', '/company/reports', '/company/activation',
      '/company/contribution', '/company/pillars',
    );
    if (role === 'COMPANY_ADMIN' || role === 'COMPANY_HR') {
      routes.push('/company/ingestion', '/company/ingestion/mapping-review',
        '/company/uef-review', '/company/scoring', '/company/data');
    }
    if (role === 'COMPANY_ADMIN' || role === 'COMPANY_FINANCE') {
      routes.push('/company/financial');
    }
  }
  if (isWorkerRole(role)) {
    routes.push('/my-kora', '/my-kora/privacy', '/my-kora/dynamic-cv',
      '/my-kora/opportunities', '/my-kora/bookings', '/my-kora/collective');
  }
  if (role === 'PARTNER_ADMIN_LIGHT') routes.push('/partner');
  if (role === 'ADVISOR_EXTERNAL_LIGHT') routes.push('/advisor');
  routes.push('/future-vision');
  return [...new Set(routes)];
}
