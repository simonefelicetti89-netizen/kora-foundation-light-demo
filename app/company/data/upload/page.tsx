// app/company/data/upload/page.tsx
//
// KORA-WP-132 — Canonical Intake Actor Model Remediation.
//
// This route is retired as an ingestion surface. Canonical intake is
// operator-mediated (`/admin/data-intake`, guarded by requireKoraAdmin); the
// canonical Company surface is `/company/data`. A Company actor has no path to
// canonical ingestion-state creation.
//
// The route itself is kept only as a redirect so that a bookmarked or
// externally-linked URL cannot 404 — it renders nothing and reaches no
// ingestion code. Restoring the retired self-service flow requires a Founder
// ruling (KORA-WP-132, Rollback).

import { redirect } from 'next/navigation';

export default function RetiredCompanyUploadPage(): never {
  redirect('/company/data');
}
