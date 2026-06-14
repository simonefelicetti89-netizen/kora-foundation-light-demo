// app/api/company/evidence-record/route.ts
// B36 PART 2 — Company evidence record detail — COMPANY_ADMIN only (B143: COMPANY_VIEWER rimosso).
// B152-B: Migrated to getSupabaseServerClient + analytics.v_company_uploaded_record_safe
//         (company-safe aggregation layer, migration 015).
//
// GET /api/company/evidence-record?recordId=<uuid>
//
// Tenant verification: enforced by view WHERE tenant_id = kora.tenant_id().
// Cross-tenant recordId → view returns no rows → 404. No application-layer cross-tenant check needed.
//
// Returns safe metadata for a single evidence record:
//   - Safe name, pillar, action family, evidence level
//   - Review status, eligibility status
//   - Attachment presence + lifecycle status (metadata only)
//   - Contribution category
//
// NEVER returns:
//   - pseudonym_id, raw_hash, created_by (excluded by view [G1])
//   - full raw payload
//   - storagePath, signedUrl, attachment raw content
//   - Lifecycle mutation actions
//   - Worker-level data, PII, health data

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
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

  const { searchParams } = new URL(request.url);
  const recordId = (searchParams.get('recordId') ?? '').trim();

  if (!recordId) {
    return NextResponse.json({ error: 'recordId is required.' }, { status: 400 });
  }

  const db = await getSupabaseServerClient();

  // ── 1. Fetch record via company-safe view ──────────────────────────────────
  // v_company_uploaded_record_safe excludes pseudonym_id, raw_hash by construction [G1].
  // Tenant isolation: view WHERE tenant_id = kora.tenant_id() — cross-tenant recordId → null → 404.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recRow, error: rErr } = await (db.schema('analytics') as any)
    .from('v_company_uploaded_record_safe')
    .select('*')
    .eq('record_id', recordId)
    .maybeSingle();

  if (rErr) return NextResponse.json({ error: 'Errore caricamento evidenza.' }, { status: 500 });
  if (!recRow) return NextResponse.json({ error: 'Evidenza non trovata.' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rec = recRow as Record<string, any>;

  // initiative_name_raw: PII guard applied at application layer (view exposes raw field).
  // Founder decision B153: assumed programme name, not PII — if violated, revisit view.
  const safeName = buildSafeName(
    rec['initiative_name_raw'] as string | null,
    rec['action_family']      as string | null,
    0,
  );

  // ── 2. Attachment metadata — from source_batch.payload_sample ─────────────
  // source_batch has company_own_source_batch_read RLS — server client enforces tenant isolation.
  const { data: fullBatchRow } = await db
    .schema('analytics').from('source_batch')
    .select('payload_sample')
    .eq('id', rec['batch_id'] as string)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bps = ((fullBatchRow as any)?.payload_sample ?? {}) as Record<string, unknown>;
  const rawAttachments = Array.isArray(bps['_b31_attachments'])
    ? bps['_b31_attachments'] as Record<string, unknown>[]
    : [];

  const attachments = rawAttachments.map(a => {
    const lifecycle = resolveLifecycleStatus(a);
    return {
      attachmentId:    a['attachmentId'],
      fileNameSafe:    a['fileNameSafe'],
      fileType:        a['fileType'],
      fileSizeBytes:   a['fileSizeBytes'],
      attachmentType:  a['attachmentType'],
      storageStatus:   a['storageStatus'] ?? 'metadata_only',
      lifecycleStatus: lifecycle,
      lifecycleLabel:  LIFECYCLE_LABELS[lifecycle],
      createdAt:       a['createdAt'],
      // NEVER expose: storagePath, storageBucket, signedUrl
    };
  });

  return NextResponse.json({
    ok: true,
    record: {
      id:             (rec['record_id'] as string).slice(0, 8) + '…',
      recordIdFull:   rec['record_id']         as string,
      safeName,
      pillar:         (rec['primary_pillar']   as string | null) ?? null,
      actionFamily:   (rec['action_family']    as string | null) ?? null,
      eventNature:    (rec['event_nature']     as string | null) ?? null,
      evidenceLevel:  (rec['evidence_level']   as string | null) ?? null,
      budgetClass:    (rec['budget_class']     as string | null) ?? null,
      reviewStatus:   rec['review_status']      as string,
      eligibility:    rec['eligibility_status'] as string,
      batchSourceType: rec['batch_source_type'] as string,
    },
    attachments,
    readOnly:  true,
    canMutate: false,
    // Non-suppressible privacy notice
    privacyNote: 'Nessun dato individuale del lavoratore incluso. Pseudonym ID non esposto.',
    caveat: 'Vista in sola lettura. Le azioni sul ciclo di vita sono riservate all\'operatore KORA Admin.',
  });
}
