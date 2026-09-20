// lib/auth/resolve-company-tenant-id.ts
// KORA-WP-115 — extracted from app/company/living-koral/page.tsx (KORA-WP-114)
// verbatim, unchanged logic — a second Server Component
// (app/company/living-koral/editions/page.tsx) now needs the identical
// tenant-resolution behavior, and duplicating auth-sensitive logic across
// two files is a real inconsistency risk (a future fix applied to one
// copy and not the other). This is a narrow, mechanical extraction, not a
// redesign — no behavior change, no new capability.
//
// Mirrors app/company/layout.tsx's own two-branch logic exactly
// (COMPANY_ADMIN via requireCompanyUser(); KORA_ADMIN service access via
// the existing kora-service-tenant-id cookie), because requireCompanyUser()
// alone rejects KORA_ADMIN — reusing only requireCompanyUser() would
// silently break the existing KORA_ADMIN company-impersonation path
// pre-check 172 §15 / 174 §19 rely on for Admin visibility without a new
// Admin UI. layout.tsx has already performed the real authorization/
// redirect before any Server Component page using this helper ever
// renders — this is tenant-id resolution for the data read, not a second
// auth gate.

import { cookies } from 'next/headers';
import { requireCompanyUser, getCurrentKoraUser, isKoraAuthError } from '@/lib/auth/kora-session';

export async function resolveCompanyTenantId(): Promise<string | null> {
  const auth = await requireCompanyUser();
  if (!isKoraAuthError(auth)) return auth.tenantId;

  const admin = await getCurrentKoraUser();
  if (admin?.koraRole === 'KORA_ADMIN') {
    const cookieStore = await cookies();
    const serviceTenantId = cookieStore.get('kora-service-tenant-id')?.value ?? null;
    if (serviceTenantId) return serviceTenantId;
  }
  return null;
}
