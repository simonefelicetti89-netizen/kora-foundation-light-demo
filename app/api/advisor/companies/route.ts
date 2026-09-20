// app/api/advisor/companies/route.ts
// KORA-WP-033 — Company Advisor Action-Matrix Surface + Portal Pilot Slice.
//
// GET — the Advisor's own assigned Companies (Assignment Role Context +
// validity), field-minimized. advisorId is always resolved server-side via
// getAdvisorIdentityByAuthUserId(auth.id) — never a request parameter, so a
// caller cannot enumerate another Advisor's Companies (KORA-WP-030's own
// self-resolution convention, reused unchanged).

import { NextRequest, NextResponse } from 'next/server';
import { requireAdvisorUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getAdvisorIdentityByAuthUserId } from '@/lib/advisor-identity/advisor-identity-service';
import { getAdvisorAssignedCompanies } from '@/lib/advisor-portal/advisor-portal-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdvisorUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const identity = await getAdvisorIdentityByAuthUserId(auth.id);
    if (!identity) {
      return NextResponse.json({ ok: true, companies: [] });
    }

    const companies = await getAdvisorAssignedCompanies(identity.id);

    return NextResponse.json({ ok: true, companies });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[advisor/companies] read failed:', msg);
    return NextResponse.json({ ok: false, error: 'Impossibile recuperare le Company assegnate.' }, { status: 500 });
  }
}
