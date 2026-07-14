// app/api/admin/evidence-attachments/lifecycle/route.ts
// B35: Attachment Lifecycle Management. KORA_ADMIN only.
//
// POST: archive | restore | remove_metadata | remove_storage
//
// Rules:
//   - Metadata always retained (no hard delete of payload_sample entry).
//   - remove_storage: physically deletes from Supabase Storage.
//     If storage delete fails → error returned, metadata NOT updated.
//   - Signed URL disabled for archived/removed/storage_removed.
//   - Lifecycle reason: optional, short, PII-scanned, not stored if PII detected.
//   - Audit: no signed URLs, no raw values, no file content.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  resolveLifecycleStatus, buildLifecycleUpdate, sanitizeLifecycleReason,
  type LifecycleAction,
} from '@/lib/data-intake/attachment-lifecycle';
import { assertSameOrigin } from '@/lib/security/origin';

const VALID_ACTIONS: LifecycleAction[] = ['archive', 'restore', 'remove_metadata', 'remove_storage'];

const AUDIT_ACTIONS: Record<LifecycleAction, string> = {
  archive:         'evidence_attachment_archived',
  restore:         'evidence_attachment_restored',
  remove_metadata: 'evidence_attachment_removed_metadata',
  remove_storage:  'evidence_attachment_storage_removed',
};

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 }); }

  const tenantCode   = String(body['tenantCode']   ?? '').trim();
  const batchId      = String(body['batchId']      ?? '').trim();
  const attachmentId = String(body['attachmentId'] ?? '').trim();
  const action       = String(body['action']       ?? '').trim() as LifecycleAction;
  const reason       = body['reason'] != null ? String(body['reason']) : undefined;

  if (!tenantCode)   return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  if (!batchId)      return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });
  if (!attachmentId) return NextResponse.json({ error: 'attachmentId is required.' }, { status: 400 });
  if (!VALID_ACTIONS.includes(action)) {
    return NextResponse.json({
      error: `Invalid action: "${action}". Must be one of: ${VALID_ACTIONS.join(', ')}.`,
    }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── 1. Tenant + batch scope ───────────────────────────────────────────────
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantRow as any).id as string;

  const { data: batchRow } = await db.schema('analytics').from('source_batch')
    .select('id, payload_sample').eq('id', batchId).eq('tenant_id', tenantId).maybeSingle();
  if (!batchRow) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });

  // ── 2. Find attachment ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ps = ((batchRow as any).payload_sample ?? {}) as Record<string, unknown>;
  const attachments = Array.isArray(ps['_b31_attachments'])
    ? (ps['_b31_attachments'] as Record<string, unknown>[])
    : [];

  const attIdx = attachments.findIndex(a => a['attachmentId'] === attachmentId);
  if (attIdx < 0) return NextResponse.json({ error: `Attachment not found: ${attachmentId}` }, { status: 404 });

  const att = attachments[attIdx];

  // ── 3. Compute lifecycle update ───────────────────────────────────────────
  const now = new Date().toISOString();
  const { fields: lifecycleFields, error: transitionError } = buildLifecycleUpdate({
    action, att, reason, now,
  });

  if (transitionError) {
    return NextResponse.json({ error: transitionError }, { status: 422 });
  }

  // ── 4. remove_storage: physically delete from Supabase Storage ───────────
  if (action === 'remove_storage') {
    const storageBucket = String(att['storageBucket'] ?? '');
    const storagePath   = String(att['storagePath']   ?? '');
    if (!storageBucket || !storagePath) {
      return NextResponse.json({ error: 'No storagePath/storageBucket found for this attachment.' }, { status: 422 });
    }
    const { error: storageErr } = await db.storage
      .from(storageBucket).remove([storagePath]);
    if (storageErr) {
      return NextResponse.json({
        error: `Storage delete failed: ${storageErr.message}. Metadata not updated.`,
      }, { status: 500 });
    }
  }

  // ── 5. Update payload_sample with new lifecycle fields ────────────────────
  const updatedAtt = { ...att, ...lifecycleFields };
  const updatedAttachments = attachments.map((a, i) => i === attIdx ? updatedAtt : a);
  const updatedPayload = { ...ps, _b31_attachments: updatedAttachments };

  const { error: dbErr } = await db.schema('analytics').from('source_batch')
    .update({ payload_sample: updatedPayload }).eq('id', batchId);
  if (dbErr) {
    return NextResponse.json({ error: `Failed to update attachment lifecycle: ${dbErr.message}` }, { status: 500 });
  }

  // ── 6. Audit — no signed URL, no raw values, no storagePath ──────────────
  const sanitizedReason = sanitizeLifecycleReason(reason);
  await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        AUDIT_ACTIONS[action],
    resource_type: 'analytics.source_batch',
    resource_id:   batchId,
    payload: {
      attachmentId,
      fileNameSafe:     att['fileNameSafe'],
      fileType:         att['fileType'],
      attachmentType:   att['attachmentType'],
      previousLifecycle: resolveLifecycleStatus(att),
      newLifecycle:      lifecycleFields.lifecycleStatus,
      action,
      ...(sanitizedReason ? { reason: sanitizedReason } : {}),
      // NEVER log: signedUrl, storagePath, rawContent, file content
    },
    ip_address: null,
  });

  return NextResponse.json({
    ok:             true,
    attachmentId,
    action,
    previousLifecycle: resolveLifecycleStatus(att),
    newLifecycle:      lifecycleFields.lifecycleStatus,
    lifecycleFields,
    canOpenSecurely:   lifecycleFields.lifecycleStatus === 'active' && att['storageStatus'] === 'stored_private',
    note:              action === 'remove_storage'
      ? 'Storage file permanently deleted. Metadata retained for audit trail.'
      : action === 'remove_metadata'
      ? 'Attachment removed from active evidence view. Metadata retained for audit. Storage file (if any) not deleted.'
      : action === 'archive'
      ? 'Attachment archived. Secure access disabled until restored.'
      : 'Attachment restored to active state.',
  });
}
