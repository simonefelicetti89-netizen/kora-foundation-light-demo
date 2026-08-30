// app/admin/companies/[companyId]/page.tsx
//
// B-TRUTH Root Control Room Wave 3 Hardening (2026-08-30): RETIRED.
//
// The governing B-TRUTH principle: a missing canonical capability is a
// product gap, not justification for keeping synthetic product truth in
// runtime. After Wave 2 and Wave 3 removed every capability that had a real
// replacement or no confirmed product requirement, what remained here was
// exactly three synthetic outputs displayed as if real, none of which had a
// legitimate reason to survive under that principle:
//   - Tile 1 (Tenant Status): TenantService.tenant_status — no canonical
//     draft/active/suspended/archived state machine exists anywhere
//     (analytics.tenant has only is_active + tenant_kind + deleted_at).
//     REQUIRED_BUT_UNIMPLEMENTED_GAP is not license to show a fake value.
//   - Section I (Worker Provisioning summary): WorkerProvisioningService —
//     100% synthetic except total_workers, which has a real analog
//     (personal.workforce_baseline.total_workers) not reachable from this
//     page's fake identity. The rest (invited/active/my_kora/pib/suppressed)
//     is B-WORKER's future domain — a future block owning a capability is
//     not license to preview it here with fake numbers.
//   - Header risk badge: CompanyIntelligenceService.getCompanyIntelligenceRecord —
//     aggregates 6 synthetic services under resolveRiskLevel(), an ad-hoc
//     heuristic with no Master Plan/current-methodology definition.
//     INVESTIGATE (the service's registry classification, unchanged by this
//     retirement) is not permission to keep displaying its output.
//
// What remained after removing those three was navigation/header chrome
// built on a still-synthetic company_name/tenant_id/tenant_status — not a
// legitimate reason to keep a page alive on its own (Phase 5/6 of the
// hardening pass: category C, nothing substantive survives).
//
// The real Company Console (CompanyConsolePanel, /api/admin/company-console)
// never linked here in the first place — its quickActions go straight to
// the Gen 3 sub-tabs (workspace/evidence/preview/submissions) by real
// tenant_code. The only routes that ever landed here were demo-only
// (app/admin/pipeline's DEMO_COMPANY_ID quick link, and this tree's own
// users/page.tsx breadcrumb) — both still resolve through this redirect.
//
// This redirect invents no compatibility mapping: it reuses the exact same
// real analytics.tenant.tenant_code existence check the workspace page
// already performs (Gen 3 route identity activation). A real tenant_code
// resolves to the real workspace; a synthetic id (e.g. "meridiana-group")
// honestly 404s there instead of rendering fabricated data here.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';

export default async function AdminCompanyControlRoom({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = await params;

  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  redirect(`/admin/companies/${companyId}/workspace`);
}
