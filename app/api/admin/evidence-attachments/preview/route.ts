// app/api/admin/evidence-attachments/preview/route.ts
// B31: Evidence Attachment Preview — dry-run. KORA_ADMIN only.
//
// Parses document metadata. NOTHING is stored. No binary persistence.
// Returns: safe metadata, parser status, PII status, evidence level suggestion.
// Never returns: raw content, full text, public URLs, raw values.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import {
  parseAttachmentMetadata,
  type EvidenceAttachmentType,
  type EvidenceAttachmentScope,
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

  const rawType = String(formData.get('attachmentType') ?? 'other').trim() as EvidenceAttachmentType;
  if (!VALID_ATTACHMENT_TYPES.has(rawType)) {
    return NextResponse.json({ error: `Invalid attachmentType: "${rawType}".` }, { status: 400 });
  }

  const scope             = (String(formData.get('scope') ?? 'batch').trim()) as EvidenceAttachmentScope;
  const linkedInit        = formData.get('linkedInitiativeName') ? String(formData.get('linkedInitiativeName')).slice(0, 80) : undefined;
  const linkedField       = formData.get('linkedField')          ? String(formData.get('linkedField')).slice(0, 50) : undefined;
  const linkedBatchId     = formData.get('linkedBatchId')        ? String(formData.get('linkedBatchId')).slice(0, 36) : undefined;

  const metadata = await parseAttachmentMetadata({
    file: fileEntry,
    attachmentType: rawType,
    scope,
    linkedInitiativeName: linkedInit,
    linkedField,
    linkedBatchId,
  });

  return NextResponse.json({
    ok: true,
    preview: true,
    dryRunNote: 'Preview only — no data has been stored. Use /register to attach metadata.',
    metadata,
  });
}
