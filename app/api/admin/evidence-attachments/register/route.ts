// app/api/admin/evidence-attachments/register/route.ts
// B31/B34: Evidence Attachment Register. KORA_ADMIN only.
//
// B31: registers safe metadata into source_batch.payload_sample._b31_attachments[].
// B34: uploads binary to private Supabase Storage bucket; updates metadata with
//      storagePath, storageBucket, storageStatus.
//
// NO public URL. NO raw content in DB. NO signed URL stored.
// File is re-parsed server-side (never trusts preview).
// Binary stored only for allowed types that pass PII check.
// DOCX / unsupported / PII-rejected: metadata-only, no binary.
// If storage bucket not configured → returns storage_not_configured error (Conditional Pass).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  parseAttachmentMetadata, buildAttachmentSummary,
  type EvidenceAttachmentType, type EvidenceAttachmentScope,
} from '@/lib/data-intake/evidence-attachment';
import {
  storeEvidenceAttachment, isBinaryStorable,
} from '@/lib/data-intake/evidence-attachment-storage';
import { assertSameOrigin } from '@/lib/security/origin';

const VALID_ATTACHMENT_TYPES = new Set<EvidenceAttachmentType>([
  'invoice', 'provider_export', 'lms_report', 'policy_document', 'contract',
  'budget_report', 'attendance_report', 'coverage_report', 'other',
]);

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid multipart/form-data.' }, { status: 400 }); }

  const fileEntry = formData.get('file');
  if (!fileEntry || !(fileEntry instanceof File)) {
    return NextResponse.json({ error: 'Missing required field: file.' }, { status: 400 });
  }

  const tenantCode = String(formData.get('tenantCode') ?? '').trim();
  if (!tenantCode) return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });

  const batchId = String(formData.get('batchId') ?? '').trim();
  if (!batchId) return NextResponse.json({ error: 'batchId is required.' }, { status: 400 });

  const confirmationRaw = String(formData.get('confirmation') ?? '').trim();
  if (confirmationRaw !== 'true') {
    return NextResponse.json({ error: 'confirmation must be "true". Operator must confirm attachment before registering.' }, { status: 400 });
  }

  const rawType = String(formData.get('attachmentType') ?? 'other').trim() as EvidenceAttachmentType;
  if (!VALID_ATTACHMENT_TYPES.has(rawType)) {
    return NextResponse.json({ error: `Invalid attachmentType: "${rawType}".` }, { status: 400 });
  }

  const scope         = (String(formData.get('scope') ?? 'batch').trim()) as EvidenceAttachmentScope;
  const linkedInit    = formData.get('linkedInitiativeName') ? String(formData.get('linkedInitiativeName')).slice(0, 80) : undefined;
  const linkedField   = formData.get('linkedField')          ? String(formData.get('linkedField')).slice(0, 50) : undefined;

  // Re-parse server-side — never trust preview
  const metadata = await parseAttachmentMetadata({
    file: fileEntry, attachmentType: rawType, scope,
    linkedInitiativeName: linkedInit, linkedField, linkedBatchId: batchId,
  });

  if (metadata.parserStatus === 'rejected_pii') {
    return NextResponse.json({
      ok: false, error: 'Attachment rejected: PII detected in document metadata.',
      piiStatus: 'rejected', findings: metadata.piiFindings ?? [],
      note: 'No metadata has been stored.',
    }, { status: 422 });
  }

  const db = getSupabaseServiceClient();

  // Tenant + batch lookup
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('id').eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantId = (tenantRow as any).id as string;

  const { data: batchRow } = await db.schema('analytics').from('source_batch')
    .select('id, payload_sample')
    .eq('id', batchId).eq('tenant_id', tenantId).maybeSingle();
  if (!batchRow) return NextResponse.json({ error: `Batch not found: ${batchId}` }, { status: 404 });

  // B34: attempt binary storage for allowed file types that passed PII check
  let storageResult: { storageBucket: string; storagePath: string; storageStatus: 'stored_private' | 'metadata_only' } = {
    storageBucket: '',
    storagePath:   '',
    storageStatus: 'metadata_only',
  };

  const shouldStore = isBinaryStorable({ fileType: metadata.fileType, parserStatus: metadata.parserStatus });
  if (shouldStore) {
    try {
      // Re-read the file buffer for storage (parseAttachmentMetadata has already consumed it)
      const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
      const stored = await storeEvidenceAttachment({
        tenantId:     tenantId,
        batchId:      batchId,
        attachmentId: metadata.attachmentId,
        fileNameSafe: metadata.fileNameSafe,
        fileBuffer,
        fileType:     metadata.fileType,
      });
      storageResult = {
        storageBucket: stored.storageBucket,
        storagePath:   stored.storagePath,
        storageStatus: 'stored_private',
      };
    } catch (storageErr) {
      const msg = storageErr instanceof Error ? storageErr.message : String(storageErr);
      if (msg.startsWith('storage_not_configured')) {
        return NextResponse.json({
          ok:    false,
          error: 'storage_not_configured',
          hint:  msg,
          note:  'Preview metadata still works. Create the Supabase storage bucket to enable binary storage.',
        }, { status: 503 });
      }
      // Other storage errors — fail the register with a clear message
      return NextResponse.json({
        ok:    false,
        error: `Attachment storage failed: ${msg}`,
      }, { status: 500 });
    }
  }

  // Append metadata to payload_sample._b31_attachments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPayload = ((batchRow as any).payload_sample ?? {}) as Record<string, unknown>;
  const existingAttachments = Array.isArray(existingPayload['_b31_attachments'])
    ? (existingPayload['_b31_attachments'] as unknown[])
    : [];

  // Strip any inadvertent raw content before storage.
  // B34: includes storageStatus/storagePath/storageBucket — no signed URL.
  const safeMetadata = {
    attachmentId:           metadata.attachmentId,
    fileNameSafe:           metadata.fileNameSafe,
    fileSizeBytes:          metadata.fileSizeBytes,
    fileType:               metadata.fileType,
    attachmentType:         metadata.attachmentType,
    scope:                  metadata.scope,
    linkedInitiativeName:   metadata.linkedInitiativeName,
    linkedField:            metadata.linkedField,
    sourceStrength:         metadata.sourceStrength,
    evidenceLevelSuggestion: metadata.evidenceLevelSuggestion,
    parserStatus:           metadata.parserStatus,
    extractedMetadata:      metadata.extractedMetadata,   // no raw values in extractedMetadata
    createdAt:              metadata.createdAt,
    // B34: storage metadata — NO signed URL stored here
    storageStatus:   storageResult.storageStatus,
    ...(storageResult.storageStatus === 'stored_private' ? {
      storageBucket: storageResult.storageBucket,
      storagePath:   storageResult.storagePath,
    } : {}),
    // NEVER store: raw content, full text, binary data, PII values, signed URLs
  };

  const updatedAttachments = [...existingAttachments, safeMetadata];
  const updatedPayload = {
    ...existingPayload,
    _b31: true,
    _b31_attachments: updatedAttachments,
    _b31_summary: buildAttachmentSummary(
      updatedAttachments.map(a => a as Parameters<typeof buildAttachmentSummary>[0][0])
    ),
  };

  const { error: updateErr } = await db.schema('analytics').from('source_batch')
    .update({ payload_sample: updatedPayload })
    .eq('id', batchId).eq('tenant_id', tenantId);

  if (updateErr) {
    return NextResponse.json({ error: `Failed to register attachment: ${updateErr.message}` }, { status: 500 });
  }

  // Audit event — B34: includes storageStatus, NO signed URL, NO storagePath
  await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        storageResult.storageStatus === 'stored_private'
      ? 'evidence_attachment_stored_private'
      : 'evidence_attachment_registered',
    resource_type: 'analytics.source_batch',
    resource_id:   batchId,
    payload: {
      attachmentId:   safeMetadata.attachmentId,
      fileNameSafe:   safeMetadata.fileNameSafe,
      fileType:       safeMetadata.fileType,
      fileSizeBytes:  safeMetadata.fileSizeBytes,
      attachmentType: safeMetadata.attachmentType,
      scope:          safeMetadata.scope,
      parserStatus:   safeMetadata.parserStatus,
      storageStatus:  storageResult.storageStatus,
      // no raw values, no binary, no document content, no signed URL, no storagePath
    },
    ip_address: null,
  });

  const noteText = storageResult.storageStatus === 'stored_private'
    ? 'Attachment stored in private storage. Evidence level requires UEF Review before affecting scoring. Use the signed-url endpoint to access the document.'
    : 'Attachment metadata registered. File binary was not stored (unsupported type). Evidence level requires UEF Review before affecting scoring.';

  return NextResponse.json({
    ok: true,
    attachmentId:            safeMetadata.attachmentId,
    fileNameSafe:            safeMetadata.fileNameSafe,
    attachmentType:          safeMetadata.attachmentType,
    parserStatus:            safeMetadata.parserStatus,
    evidenceLevelSuggestion: safeMetadata.evidenceLevelSuggestion,
    storageStatus:           storageResult.storageStatus,
    note:                    noteText,
  });
}
