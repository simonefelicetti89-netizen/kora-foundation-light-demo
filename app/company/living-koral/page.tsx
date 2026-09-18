// app/company/living-koral/page.tsx — Server Component.
// KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
// Founder adjudication, .kora-audit/output/172_..._PRE_CHECK.md §31).
//
// Canonical route (Registry 142's own text, `142:275`): /company/living-koral
// — a single Overview surface (no History/Editions/Create/Review/Publish/
// Mark/Settings tabs — this WP's own §1 instruction). Read-only throughout.
//
// Server Component, matching app/company/layout.tsx's own post-B137
// direction ("Converted from 'use client' to server-side guard — eliminates
// auth flicker") and pre-check 172 §16's own recommended pattern — zero
// interactivity exists in V1, so there is no runtime reason to prefer a
// client component + REST API route here (report 172 §16).
//
// Tenant resolution mirrors app/company/layout.tsx's own two-branch logic
// exactly (COMPANY_ADMIN via requireCompanyUser(); KORA_ADMIN service
// access via the existing kora-service-tenant-id cookie), because
// requireCompanyUser() alone rejects KORA_ADMIN — reusing ONLY
// requireCompanyUser() here would silently break the existing KORA_ADMIN
// company-impersonation path this WP's own §9 relies on to satisfy Admin
// visibility without a new Admin UI (pre-check 172 §15). Layout.tsx has
// already performed the real authorization/redirect before this page ever
// renders — this is tenant-id resolution for the data read, not a second
// auth gate.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { requireCompanyUser, getCurrentKoraUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getLivingKoralCompanyView } from '@/lib/living-koral-company-view/company-view-service';
import { LivingKoralOverview } from '@/components/company/living-koral/LivingKoralOverview';

async function resolveTenantId(): Promise<string | null> {
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

export default async function LivingKoralPage() {
  const tenantId = await resolveTenantId();

  // Defense in depth only — app/company/layout.tsx already redirects any
  // session without a resolvable tenant before this page renders.
  if (!tenantId) {
    redirect('/login?role_hint=company');
  }

  const view = await getLivingKoralCompanyView(tenantId);

  return <LivingKoralOverview view={view} />;
}
