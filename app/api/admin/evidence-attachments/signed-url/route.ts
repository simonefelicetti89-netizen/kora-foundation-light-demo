// app/api/admin/evidence-attachments/signed-url/route.ts
// B34/B35: Generate a short-lived signed URL for a stored private attachment.
// KORA_ADMIN only. POST only (no GET — prevents caching).
//
// Security:
//   - Signed URL never stored in DB or logged.
//   - Expiry: max 300 seconds (5 minutes).
//   - Validates tenant/batch scope before generating URL.
//   - Only for attachments with storageStatus = stored_private.
//   - B35: lifecycle guard — archived/removed/storage_removed → 422, no URL.
//   - KORA_ADMIN only (company self-service: not implemented).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { createEvidenceAttachmentSignedUrl } from '@/lib/data-intake/evidence-attachment-storage';
import { canGenerateSignedUrl } from '@/lib/data-intake/attachment-lifecycle';
import { assertSameOrigin } from '@/lib/security/origin';

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const tenantCode  = String(body['tenantCode']  ?? '').trim();
  const batchId     = String(body['batchId']     ?? '').trim();
  const attachmentId = String(body['attachmentId'] ?? '').trim();

  if (!tenantCode)   return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  if (!batchId)      return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });
  if (!attachmentId) return NextResponse.json({ error: 'attachmentId is required.' }, { status: 400 });

  const db = getSupabaseServiceClient();

  // ── 1. Tenant scope check ─────────────────────────────────────────────────
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();

  if (!tenantRow) {
    return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantRow as any).id as string;

  // ── 2. Batch scope check ──────────────────────────────────────────────────
  const { data: batchRow } = await db.schema('analytics').from('source_batch')
    .select('id, payload_sample').eq('id', batchId).eq('tenant_id', tenantId).maybeSingle();

  if (!batchRow) {
    return NextResponse.json({ error: `Batch not found or access denied: ${batchId}` }, { status: 404 });
  }

  // ── 3. Find attachment metadata in payload_sample ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps = ((batchRow as any).payload_sample ?? {}) as Record<string, unknown>;
  const attachments = Array.isArray(ps['_b31_attachments'])
    ? (ps['_b31_attachments'] as Record<string, unknown>[])
    : [];

  const att = attachments.find(a => a['attachmentId'] === attachmentId);
  if (!att) {
    return NextResponse.json({ error: `Attachment not found: ${attachmentId}` }, { status: 404 });
  }

  // ── 4. B35: lifecycle + storageStatus guard ───────────────────────────────
  const eligibility = canGenerateSignedUrl(att);
  if (!eligibility.allowed) {
    return NextResponse.json({
      ok:        false,
      error:     eligibility.errorMessage,
      errorCode: eligibility.errorCode,
      storageStatus:   att['storageStatus']   ?? 'metadata_only',
      lifecycleStatus: att['lifecycleStatus'] ?? null,
    }, { status: 422 });
  }

  const storageBucket = String(att['storageBucket'] ?? '');
  const storagePath   = String(att['storagePath']   ?? '');

  if (!storageBucket || !storagePath) {
    return NextResponse.json({ error: 'Storage path missing from attachment metadata.' }, { status: 500 });
  }

  // ── 5. Generate signed URL ────────────────────────────────────────────────
  let signedUrl: string;
  let expiresInSeconds: number;
  try {
    const result = await createEvidenceAttachmentSignedUrl({ storageBucket, storagePath });
    signedUrl        = result.signedUrl;
    expiresInSeconds = result.expiresInSeconds;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Failed to generate signed URL: ${msg}` }, { status: 500 });
  }

  // ── 6. Audit — never log signedUrl ───────────────────────────────────────
  await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        'evidence_attachment_signed_url_created',
    resource_type: 'analytics.source_batch',
    resource_id:   batchId,
    payload: {
      attachmentId,
      fileNameSafe:  att['fileNameSafe'],
      fileType:      att['fileType'],
      attachmentType: att['attachmentType'],
      expiresInSeconds,
      // NEVER log: signedUrl, storagePath, raw content
    },
    ip_address: null,
  });

  // ── 7. Return — signed URL is temporary, must be used immediately ─────────
  return NextResponse.json({
    ok:              true,
    signedUrl,          // short-lived — open immediately, never store
    expiresInSeconds,
    fileNameSafe:    att['fileNameSafe'],
    fileType:        att['fileType'],
    attachmentType:  att['attachmentType'],
    caveat:          'Link temporaneo. Non condividere. Scade entro 5 minuti.',
  });
}
