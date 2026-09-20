// app/api/admin/advisor-governance/route.ts
// KORA-WP-032 — Advisor Governance: Qualification Grant, Manual First-Pilot.
//
// GET  — lists all Advisor identities with their role qualifications, for
//        the minimal Admin grant UI (file 102: "UI: Admin grant UI (minimal)").
// POST — performs the governed grant/renew decision. KORA_ADMIN-only,
//        exactly matching doc 81 §11: "an explicit, authorized KORA
//        governance decision is required to grant or renew each Advisor
//        Role Qualification." No automated/policy-based path exists here —
//        every call is one explicit, single decision.
//
// Protected by app/admin/layout.tsx's requireKoraAdmin() guard already, but
// this route re-checks explicitly (defense in depth, matching every other
// /api/admin/** route convention in this codebase) since it performs a
// governed, security-sensitive write. grantedByOperatorId is always the
// trusted, session-verified requireKoraAdmin() id — never a client-supplied
// value, so a caller cannot forge who performed the grant.

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import {
  listAllAdvisorIdentities,
  listRoleQualificationsForAdvisor,
  grantAdvisorRoleQualification,
} from '@/lib/advisor-identity/advisor-identity-service';

export async function GET(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  try {
    const identities = await listAllAdvisorIdentities();
    const advisors = await Promise.all(
      identities.map(async (identity) => ({
        id: identity.id,
        fullName: identity.fullName,
        status: identity.status,
        qualifications: (await listRoleQualificationsForAdvisor(identity.id)).map((q) => ({
          id: q.id,
          role: q.role,
          status: q.status,
        })),
      })),
    );

    return NextResponse.json({ ok: true, advisors });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin/advisor-governance] read failed:', msg);
    return NextResponse.json({ ok: false, error: 'Impossibile recuperare gli Advisor.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: a governed qualification grant/renew decision — same risk
  // shape (an authenticated KORA_ADMIN actor triggering a costly/side-
  // effecting write too often) as every other costly_admin_operation route.
  const rateLimitGuard = await assertRateLimit('costly_admin_operation', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: { qualificationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const qualificationId = body.qualificationId?.trim();
  if (!qualificationId) {
    return NextResponse.json({ ok: false, error: 'qualificationId è obbligatorio.' }, { status: 400 });
  }

  try {
    const granted = await grantAdvisorRoleQualification({
      qualificationId,
      grantedByOperatorId: auth.id,
    });
    return NextResponse.json({
      ok: true,
      qualification: { id: granted.id, role: granted.role, status: granted.status },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin/advisor-governance] grant failed:', msg);
    // Surface the specific, safe rejection reasons (not found / already
    // qualified / not grant-eligible) — these are legitimate governance
    // feedback, not internal error leakage.
    const safeReasons = /rejected:|not exists|already QUALIFIED|not eligible/i;
    return NextResponse.json(
      { ok: false, error: safeReasons.test(msg) ? msg.replace(/^\[KORA\]\s*/, '') : 'Impossibile completare la concessione.' },
      { status: safeReasons.test(msg) ? 422 : 500 },
    );
  }
}
