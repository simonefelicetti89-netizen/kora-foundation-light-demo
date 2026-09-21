// app/api/admin/advisor-prerequisites/route.ts
// KORA-WP-039 — Advisor Academy Interface: prerequisite-eligibility surface.
//
// GET  — reads the recorded prerequisite eligibility for a set of Advisor
//        Role Qualifications, so the Admin surface can render the governed
//        state it already holds. Batched by id because the surface lists
//        many qualifications at once; the per-qualification read remains the
//        canonical one (getPrerequisiteEligibilityForQualification).
// POST — records an explicit KORA_ADMIN prerequisite-eligibility decision.
//
// This route holds NO business logic of its own. Validity, actor
// authorization, the audit event and the canonical status set all live in
// lib/advisor-assignment/advisor-assignment-service.ts (KORA-WP-031) and are
// unchanged by this WP — the route only authenticates, shapes input and
// forwards. actorRole/actorId are always derived from the session-verified
// requireKoraAdmin() result, never from the request body, so a caller cannot
// forge who recorded the decision.

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertRateLimit } from '@/lib/security/rate-limit';
import {
  getPrerequisiteEligibilityForQualification,
  setAdvisorPrerequisiteEligibility,
  type AdvisorPrerequisiteEligibility,
  type PrerequisiteEligibilityStatus,
} from '@/lib/advisor-assignment/advisor-assignment-service';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 200;
const CANONICAL_STATUSES: readonly PrerequisiteEligibilityStatus[] = ['MET', 'NOT_MET'];

function toView(e: AdvisorPrerequisiteEligibility) {
  return {
    id: e.id,
    roleQualificationId: e.roleQualificationId,
    status: e.status,
    sourceReference: e.sourceReference,
    effectiveDate: e.effectiveDate,
    expiryDate: e.expiryDate,
    lastVerifiedAt: e.lastVerifiedAt,
    verifiedBy: e.verifiedBy,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  const raw = request.nextUrl.searchParams.get('qualificationIds') ?? '';
  const ids = Array.from(new Set(raw.split(',').map((s) => s.trim()).filter(Boolean)));

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, eligibility: {} });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { ok: false, error: `Troppe qualificazioni richieste (massimo ${MAX_IDS}).` },
      { status: 400 },
    );
  }
  if (ids.some((id) => !UUID_RE.test(id))) {
    return NextResponse.json({ ok: false, error: 'qualificationIds non valido.' }, { status: 400 });
  }

  try {
    const rows = await Promise.all(
      ids.map(async (id) => [id, await getPrerequisiteEligibilityForQualification(id)] as const),
    );
    const eligibility: Record<string, ReturnType<typeof toView> | null> = {};
    for (const [id, row] of rows) eligibility[id] = row ? toView(row) : null;

    return NextResponse.json({ ok: true, eligibility });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin/advisor-prerequisites] read failed:', msg);
    return NextResponse.json(
      { ok: false, error: 'Impossibile recuperare i requisiti di eleggibilità.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireKoraAdmin(request);
  if (isKoraAuthError(auth)) return auth;

  // Same risk shape as every other governed, side-effecting Admin write
  // (KORA-WP-044): an authenticated KORA_ADMIN actor triggering it too often.
  const rateLimitGuard = await assertRateLimit('costly_admin_operation', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let body: {
    roleQualificationId?: string;
    status?: string;
    sourceReference?: string | null;
    effectiveDate?: string | null;
    expiryDate?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Corpo della richiesta non valido.' }, { status: 400 });
  }

  const roleQualificationId = body.roleQualificationId?.trim();
  if (!roleQualificationId || !UUID_RE.test(roleQualificationId)) {
    return NextResponse.json({ ok: false, error: 'roleQualificationId è obbligatorio.' }, { status: 400 });
  }

  const status = body.status?.trim() as PrerequisiteEligibilityStatus | undefined;
  if (!status || !CANONICAL_STATUSES.includes(status)) {
    return NextResponse.json(
      { ok: false, error: 'status deve essere MET oppure NOT_MET.' },
      { status: 400 },
    );
  }

  const effective = normaliseDate(body.effectiveDate);
  const expiry = normaliseDate(body.expiryDate);
  if (!effective.ok || !expiry.ok) {
    return NextResponse.json({ ok: false, error: 'Data non valida.' }, { status: 400 });
  }
  const effectiveDate = effective.value;
  const expiryDate = expiry.value;
  // Mirrors the table's own no-impossible-range CHECK (migration 057) so the
  // operator gets a readable rejection instead of a raw constraint violation.
  if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
    return NextResponse.json(
      { ok: false, error: 'La data di scadenza non può precedere la data di efficacia.' },
      { status: 422 },
    );
  }

  const sourceReference = typeof body.sourceReference === 'string' ? body.sourceReference.trim() : null;

  try {
    const eligibility = await setAdvisorPrerequisiteEligibility({
      roleQualificationId,
      status,
      sourceReference: sourceReference || null,
      effectiveDate,
      expiryDate,
      actorRole: 'KORA_ADMIN',
      actorId: auth.id,
    });
    return NextResponse.json({ ok: true, eligibility: toView(eligibility) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[admin/advisor-prerequisites] set failed:', msg);
    // Surface only the service's explicit, safe governance rejections.
    const safeReasons = /rejected:/i;
    return NextResponse.json(
      {
        ok: false,
        error: safeReasons.test(msg)
          ? msg.replace(/^\[KORA\]\s*/, '')
          : "Impossibile registrare il requisito di eleggibilità.",
      },
      { status: safeReasons.test(msg) ? 422 : 500 },
    );
  }
}

/** '' / null / undefined → null; a valid date → ISO; anything else rejects. */
function normaliseDate(value: string | null | undefined): { ok: true; value: string | null } | { ok: false } {
  if (value === null || value === undefined) return { ok: true, value: null };
  const trimmed = String(value).trim();
  if (trimmed === '') return { ok: true, value: null };
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return { ok: false };
  return { ok: true, value: parsed.toISOString() };
}
