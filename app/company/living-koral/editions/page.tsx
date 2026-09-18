// app/company/living-koral/editions/page.tsx — Server Component.
// KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
//
// Canonical route (pre-check 174 §16, Registry 142's own "Hub `Editions`
// tab"): /company/living-koral/editions — the archive/list + creation
// action. A nested route under the existing WP-114 Overview, sharing its
// auth boundary (app/company/layout.tsx) and its tenant-resolution helper
// (lib/auth/resolve-company-tenant-id.ts) verbatim — no new auth pattern.
//
// Server Component for the initial data (matching app/company/living-koral/
// page.tsx's own established direction) — the interactive create-form/
// submit/refresh behavior lives in the client EditionsArchive component
// this page hands its initial data to.

import { redirect } from 'next/navigation';
import { resolveCompanyTenantId } from '@/lib/auth/resolve-company-tenant-id';
import { getLivingKoralCompanyView } from '@/lib/living-koral-company-view/company-view-service';
import { listLivingKoralEditionsForTenant } from '@/lib/living-koral-edition/edition-service';
import { toEditionView } from '@/lib/living-koral-edition/edition-view';
import { PageHeader } from '@/components/ui/PageHeader';
import { LivingKoralNav } from '@/components/company/living-koral/LivingKoralNav';
import { EditionsArchive } from '@/components/company/living-koral/EditionsArchive';

export default async function LivingKoralEditionsPage() {
  const tenantId = await resolveCompanyTenantId();

  // Defense in depth only — app/company/layout.tsx already redirects any
  // session without a resolvable tenant before this page renders.
  if (!tenantId) {
    redirect('/login?role_hint=company');
  }

  const [companyView, editions] = await Promise.all([
    getLivingKoralCompanyView(tenantId),
    listLivingKoralEditionsForTenant(tenantId),
  ]);

  return (
    <div style={{ maxWidth: 880 }}>
      <PageHeader
        eyebrow="Living KORAL"
        title="Edizioni"
        subline="Momenti della Living KORAL della tua azienda che hai scelto di preservare in modo permanente e immutabile."
      />
      <LivingKoralNav />
      <EditionsArchive
        initialEditions={editions.map(toEditionView)}
        canCreate={companyView.status !== 'no_state_yet'}
      />
    </div>
  );
}
