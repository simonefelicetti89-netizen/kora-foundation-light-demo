// app/api/company/advisor/content/route.ts
// KORA-WP-036 — Advisor Document/Note Five-Class Taxonomy.
//
// GET — the Company-visible content for its own assigned Advisor: Class 1
// (Organisation-shareable note) and shared (shared=true) Class 5
// (Communication/call follow-up) only. Never Classes 2/3/4, never an
// unshared Class 5 — enforced both by RLS and, defensively, by
// lib/advisor-portal/advisor-content-service.ts's own filter.
//
// The Company never creates content (doc 73 §14/§6: Advisor drafts, Company
// reads) — no POST handler exists on this route.

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getCompanyAssignmentForHistoricalRead } from '@/lib/advisor-portal/advisor-portal-service';
import { listContentForCompany } from '@/lib/advisor-portal/advisor-content-service';

export async function GET(request: NextRequest) {
  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    // Founder Decision 4: read via the historical resolver (any status) —
    // retention ≠ operational access. Content is Advisor-authored only, so
    // this route never had a write path to keep active-only.
    const historical = await getCompanyAssignmentForHistoricalRead(auth.tenantId);
    if (!historical) {
      return NextResponse.json({ ok: true, content: [] });
    }

    const content = await listContentForCompany(auth.tenantId, historical.assignmentId);
    return NextResponse.json({ ok: true, content });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[company/advisor/content] read failed:', msg);
    return NextResponse.json({ ok: false, error: 'Impossibile recuperare le note condivise.' }, { status: 500 });
  }
}
