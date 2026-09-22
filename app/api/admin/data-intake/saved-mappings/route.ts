// app/api/admin/data-intake/saved-mappings/route.ts
// KORA-WP-066 — Saved Mappings: read path for the Admin Data Intake workflow.
//
// ONE read route only. The SAVE path deliberately has no endpoint of its own:
// it rides on the existing POST /api/admin/data-intake/accept, which is the
// only place a mapping has already been reconstructed and verified
// server-side. Adding a second write endpoint would persist a client-supplied
// mapping that the server had not validated — weaker, not neater.
//
// Listing, by contrast, has no existing host: upload-preview never receives a
// tenantCode, so it cannot return a Company's saved mappings. This route
// therefore exists because it is mechanically required, not for symmetry.
//
// Tenant identity is resolved server-side from a tenant CODE, matching the
// existing accept and company-workspace routes; a raw tenant_id is never
// accepted from the client, and RLS (migration 090) has no cross-tenant read
// policy behind it.

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { listSavedMappingsForTenant } from '@/lib/saved-mappings/saved-mapping-service';

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode = (searchParams.get('tenantCode') ?? '').trim();

  if (!tenantCode) {
    return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  }

  const savedMappings = await listSavedMappingsForTenant(tenantCode);

  // An unknown Company and a Company with no saved mapping are both simply an
  // empty list: Saved Mappings are an accelerator and never an error path.
  return NextResponse.json({ ok: true, tenantCode, savedMappings });
}
