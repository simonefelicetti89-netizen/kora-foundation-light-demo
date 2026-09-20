// app/api/company/needs/route.ts
// GET /api/company/needs — KORA-WP-018: Company Needs View.
//
// Read-only. Returns the authenticated Company's own persisted Need
// Hypotheses (analytics.need_hypothesis, KORA-WP-017/migration 055).
//
// Tenant is derived EXCLUSIVELY from requireCompanyUser()'s trusted,
// session-resolved tenantId — never from a query string, request body, or
// any other caller-supplied value. This matters more than usual here:
// listNeedHypothesesForTenant() uses the service-role client, which
// bypasses RLS entirely, so this route's own tenant handling IS the
// isolation guarantee for this read, not a defense-in-depth layer on top
// of a real-DB-enforced policy. No request parameter of any kind is read
// for tenant identity — there is nothing to forge.
//
// Field projection is deliberately minimal: only id/statement/
// classification/createdAt are returned. recordedByRole/recordedById are
// internal provenance, not Company-facing information, and are never sent
// to the browser (CLAUDE.md §13 privacy boundary; no frozen source for
// WP-018 requires exposing them).

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { listNeedHypothesesForTenant } from '@/lib/needs-map/need-hypothesis-service';

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const hypotheses = await listNeedHypothesesForTenant(auth.tenantId);

    return NextResponse.json({
      ok: true,
      needs: hypotheses.map((h) => ({
        id: h.id,
        statement: h.statement,
        classification: h.classification,
        createdAt: h.createdAt,
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[company/needs] read failed:', msg);
    return NextResponse.json(
      { ok: false, error: 'Impossibile recuperare i bisogni aziendali in questo momento.' },
      { status: 500 },
    );
  }
}
