// app/api/admin/evidence-attachments/register/route.ts
// B31: Evidence Attachment Register — metadata-only. KORA_ADMIN only.
//
// Registers safe attachment metadata into source_batch.payload_sample.
// NO file binary storage. NO raw content. NO public URL.
// File is re-parsed server-side (never trusts preview).
//
// Storage: source_batch.payload_sample._b31_attachments[] (JSONB PATCH).
// No schema migration required.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import {
  parseAttachmentMetadata, buildAttachmentSummary,
  type EvidenceAttachmentType, type EvidenceAttachmentScope,
} from '@/lib/data-intake/evidence-attachment';

const VALID_ATTACHMENT_TYPES = new Set<EvidenceAttachmentType>([
  'invoice', 'provider_export', 'lms_report', 'policy_document', 'contract',
  'budget_report', 'attendance_report', 'coverage_report', 'other',
]);

export async function POST(request: NextRequest) {
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

  // Append metadata to payload_sample._b31_attachments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingPayload = ((batchRow as any).payload_sample ?? {}) as Record<string, unknown>;
  const existingAttachments = Array.isArray(existingPayload['_b31_attachments'])
    ? (existingPayload['_b31_attachments'] as unknown[])
    : [];

  // Strip any inadvertent raw content before storage
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
    // NEVER store: raw content, full text, binary data, PII values
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

  // Audit event
  await db.schema('audit').from('audit_log').insert({
    tenant_id:     tenantId,
    actor_role:    'KORA_ADMIN',
    actor_id:      authResult.id,
    action:        'evidence_attachment_registered',
    resource_type: 'analytics.source_batch',
    resource_id:   batchId,
    payload: {
      attachmentId:   safeMetadata.attachmentId,
      fileNameSafe:   safeMetadata.fileNameSafe,
      fileType:       safeMetadata.fileType,
      attachmentType: safeMetadata.attachmentType,
      scope:          safeMetadata.scope,
      parserStatus:   safeMetadata.parserStatus,
      // no raw values, no binary, no document content
    },
    ip_address: null,
  });

  return NextResponse.json({
    ok: true,
    attachmentId: safeMetadata.attachmentId,
    fileNameSafe: safeMetadata.fileNameSafe,
    attachmentType: safeMetadata.attachmentType,
    parserStatus: safeMetadata.parserStatus,
    evidenceLevelSuggestion: safeMetadata.evidenceLevelSuggestion,
    note: 'Attachment metadata registered. No file binary was stored. Evidence level requires UEF Review before affecting scoring.',
  });
}
