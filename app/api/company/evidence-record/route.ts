// app/api/company/evidence-record/route.ts
// B36 PART 2 — Company evidence record detail — COMPANY_ADMIN only (B143: COMPANY_VIEWER rimosso).
//
// GET /api/company/evidence-record?recordId=<uuid>
//
// Tenant verification: checks that the record's batch belongs to the session tenant.
// NEVER allows cross-tenant record access — even if recordId is guessed.
//
// Returns safe metadata for a single evidence record:
//   - Safe name, pillar, action family, evidence level
//   - Review status, eligibility status
//   - Attachment presence + lifecycle status (metadata only)
//   - Contribution category
//
// NEVER returns:
//   - pseudonym_id, raw_hash, created_by, full raw payload
//   - storagePath, signedUrl, attachment raw content
//   - Lifecycle mutation actions
//   - Worker-level data, PII, health data

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { resolveLifecycleStatus, LIFECYCLE_LABELS } from '@/lib/data-intake/attachment-lifecycle';

const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
  /\b[A-Z][A-Z0-9]{15}\b/,
  /\b\d{3}[\s.-]?\d{3}[\s.-]?\d{4}\b/,
];

function buildSafeName(initiativeName: string | null, actionFamily: string | null, idx: number): string {
  if (initiativeName && initiativeName.length > 0 && initiativeName.length <= 100) {
    const name = initiativeName.trim();
    if (!PII_PATTERNS.some(p => p.test(name))) return name.slice(0, 80);
  }
  if (actionFamily) return `[${actionFamily}] Iniziativa #${idx + 1}`;
  return `Iniziativa #${idx + 1}`;
}

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId } = authResult;

  const { searchParams } = new URL(request.url);
  const recordId = (searchParams.get('recordId') ?? '').trim();

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── 1. Fetch record — safe fields only (no pseudonym_id, no raw_hash) ──────
  const { data: recRow, error: rErr } = await db
    .schema('personal').from('uploaded_record')
    .select('id, batch_id, eligibility_status, primary_pillar, action_family, event_nature, review_status, payload')
    .eq('id', recordId)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: 'Errore caricamento evidenza.' }, { status: 500 });
  if (!recRow) return NextResponse.json({ error: 'Evidenza non trovata.' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = recRow as any;

  // ── 2. Cross-tenant check — verify batch belongs to session tenant ──────────
  const { data: batchRow } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, source_type, batch_status')
    .eq('id', rec.batch_id as string)
    .maybeSingle();

  if (!batchRow) return NextResponse.json({ error: 'Evidenza non trovata.' }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = batchRow as any;

  if (b.tenant_id !== tenantId) {
    // Cross-tenant access attempt — 403, no data leaked
    return NextResponse.json({ error: 'Accesso negato.' }, { status: 403 });
  }

  // ── 3. Extract safe payload fields ────────────────────────────────────────
  const payload = (rec.payload ?? {}) as Record<string, unknown>;
  const initiativeName = typeof payload['initiative_name'] === 'string' ? payload['initiative_name'] : null;
  const evidenceLevel  = typeof payload['evidence_level']  === 'string' ? payload['evidence_level']  : null;
  const budgetClass    = typeof payload['budget_class']    === 'string' ? payload['budget_class']    : null;

  const safeName = buildSafeName(initiativeName, rec.action_family as string | null, 0);

  // ── 4. Attachment metadata — safe only, no storagePath, no signedUrl ───────
  const ps = (b.batch_id ? payload : (b as unknown as Record<string, unknown>)) || {};
  // Read attachments from payload_sample of the batch (stored in batch payload_sample)
  const { data: fullBatchRow } = await db
    .schema('analytics').from('source_batch')
    .select('payload_sample')
    .eq('id', rec.batch_id as string)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bps = ((fullBatchRow as any)?.payload_sample ?? {}) as Record<string, unknown>;
  const rawAttachments = Array.isArray(bps['_b31_attachments']) ? bps['_b31_attachments'] as Record<string, unknown>[] : [];

  const attachments = rawAttachments.map(a => {
    const lifecycle = resolveLifecycleStatus(a);
    return {
      attachmentId:   a['attachmentId'],
      fileNameSafe:   a['fileNameSafe'],
      fileType:       a['fileType'],
      fileSizeBytes:  a['fileSizeBytes'],
      attachmentType: a['attachmentType'],
      storageStatus:  a['storageStatus'] ?? 'metadata_only',
      lifecycleStatus: lifecycle,
      lifecycleLabel:  LIFECYCLE_LABELS[lifecycle],
      createdAt:      a['createdAt'],
      // NEVER expose: storagePath, storageBucket, signedUrl
    };
  });

  void ps;

  return NextResponse.json({
    ok: true,
    record: {
      id:           (rec.id as string).slice(0, 8) + '…',
      recordIdFull: rec.id as string,
      safeName,
      pillar:        (rec.primary_pillar as string | null) ?? null,
      actionFamily:  (rec.action_family  as string | null) ?? null,
      eventNature:   (rec.event_nature   as string | null) ?? null,
      evidenceLevel,
      budgetClass,
      reviewStatus:  rec.review_status      as string,
      eligibility:   rec.eligibility_status as string,
      batchSourceType: b.source_type as string,
    },
    attachments,
    readOnly:  true,
    canMutate: false,
    // Non-suppressible privacy notice
    privacyNote: 'Nessun dato individuale del lavoratore incluso. Pseudonym ID non esposto.',
    caveat: 'Vista in sola lettura. Le azioni sul ciclo di vita sono riservate all\'operatore KORA Admin.',
  });
}
