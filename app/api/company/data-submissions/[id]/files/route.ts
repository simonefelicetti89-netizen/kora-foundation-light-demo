// app/api/company/data-submissions/[id]/files/route.ts
// B39 — Upload file to company data submission. COMPANY_ADMIN only.
//
// POST /api/company/data-submissions/[id]/files
//
// Validates: submission belongs to authenticated tenant, status is draft.
// Runs PII detection on CSV/XLSX before storing.
// Stores file to private Supabase Storage bucket.
// Returns safe metadata only — no storagePath, no signedUrl.
// Rejected files (PII or type) are NOT stored.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { uploadToAttachmentBucket } from '@/lib/supabase/storage-service-key';
import { detectPiiInPayload, summarizePiiFindings } from '@/lib/privacy/pii-guard';
import { parseCsvContent } from '@/lib/data-intake/csv-parser';
import { parseExcelSheet } from '@/lib/data-intake/excel-parser';
import {
  isBinaryStorable, getAttachmentContentType,
} from '@/lib/data-intake/evidence-attachment-storage';
import { randomUUID } from 'crypto';
import { COMPANY_SUBMISSION_SOURCE_TYPE } from '../../route';
import { assertSameOrigin } from '@/lib/security/origin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function logAudit(db: any, row: Record<string, unknown>): Promise<void> {
  try { await db.schema('audit').from('audit_log').insert(row); }
  catch (e) { console.error('[data-submissions/files audit]', (e as Error).message); }
}

// ── Limits ────────────────────────────────────────────────────────────────────

const MAX_BYTES_CSV  = 2 * 1024 * 1024; // 2 MB
const MAX_BYTES_XLSX = 5 * 1024 * 1024; // 5 MB
const MAX_BYTES_PDF  = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS       = 500;
const MAX_FILES_PER_SUBMISSION = 5;

// ── Forbidden column headers (CSV/XLSX) ───────────────────────────────────────

const FORBIDDEN_HEADERS = new Set([
  'email', 'e-mail', 'email_address', 'mail',
  'phone', 'telefono', 'mobile', 'cel', 'cellulare', 'phone_number', 'tel',
  'codice_fiscale', 'cf', 'tax_code', 'fiscal_code', 'codice_fiscale_lavoratore',
  'iban', 'bic', 'iban_number',
  'name', 'first_name', 'last_name', 'surname',
  'nome', 'cognome', 'full_name', 'employee_name',
  'nominativo', 'worker_name', 'nome_lavoratore', 'cognome_lavoratore',
  'address', 'indirizzo', 'street', 'via', 'citta', 'city', 'cap',
  'domicilio', 'residenza',
  'birth_date', 'data_nascita', 'date_of_birth', 'age', 'eta',
  'health', 'salute', 'diagnosi', 'diagnosis', 'referto', 'medical_data',
  'matricola',
]);

// ── Allowed file extensions ───────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = new Set(['csv', 'xlsx', 'pdf']);

function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? 'unknown';
}

function safeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\-_.]/g, '_')
    .replace(/\.{2,}/g, '_')
    .slice(0, 80);
}

// ── Storage path for company submissions ──────────────────────────────────────

function buildSubmissionFilePath(params: {
  tenantId: string;
  submissionId: string;
  fileId: string;
  fileNameSafe: string;
}): string {
  const seg = (s: string) => s.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, 50);
  const fileSeg = (s: string) => s.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/\.{2,}/g, '_').slice(0, 80);
  return `tenant/${seg(params.tenantId)}/submissions/${seg(params.submissionId)}/${seg(params.fileId)}/${fileSeg(params.fileNameSafe)}`;
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const { id: submissionId } = await params;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  if (auth.koraRole !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: 'Company Viewer non può caricare file.' }, { status: 403 });
  }

  const db = await getSupabaseServerClient();

  // Verify submission belongs to this tenant and is in draft state
  const { data: subRow, error: subErr } = await db
    .schema('analytics').from('source_batch')
    .select('id, tenant_id, batch_status, row_count, payload_sample')
    .eq('id', submissionId)
    .eq('tenant_id', auth.tenantId)
    .eq('source_type', COMPANY_SUBMISSION_SOURCE_TYPE)
    .maybeSingle();

  if (subErr || !subRow) {
    return NextResponse.json({ error: 'Submission non trovata.' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subRow as any;
  if (sub.batch_status !== 'submission_draft') {
    return NextResponse.json({ error: 'Non è possibile aggiungere file a una submission già inviata.' }, { status: 422 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingFiles = (sub.payload_sample?._cs?.files ?? []) as any[];
  if (existingFiles.length >= MAX_FILES_PER_SUBMISSION) {
    return NextResponse.json({
      error: `Massimo ${MAX_FILES_PER_SUBMISSION} file per submission.`,
    }, { status: 422 });
  }

  // Parse multipart
  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 }); }

  const file = formData.get('file') as File | null;
  const purpose = (formData.get('purpose') as string | null)?.trim() ?? 'other';

  if (!file) return NextResponse.json({ error: 'Campo "file" obbligatorio.' }, { status: 400 });

  const fileName    = file.name ?? 'upload';
  const fileExt     = getFileExtension(fileName);
  const fileNameSafe = safeFileName(`${randomUUID().slice(0, 8)}_${fileName}`);

  // Type validation
  if (!ALLOWED_EXTENSIONS.has(fileExt)) {
    return NextResponse.json({
      error: `Tipo file non supportato: .${fileExt}. Supportati: CSV, XLSX, PDF.`,
      rejectionReason: 'unsupported_type',
    }, { status: 422 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileSizeBytes = fileBuffer.byteLength;

  // Size validation
  const sizeLimit = fileExt === 'csv' ? MAX_BYTES_CSV : MAX_BYTES_XLSX;
  if (fileExt !== 'pdf' && fileSizeBytes > sizeLimit) {
    return NextResponse.json({
      error: `File troppo grande. Limite: ${Math.round(sizeLimit / 1024 / 1024)} MB.`,
      rejectionReason: 'rejected_size',
    }, { status: 422 });
  }
  if (fileExt === 'pdf' && fileSizeBytes > MAX_BYTES_PDF) {
    return NextResponse.json({
      error: 'PDF troppo grande. Limite: 5 MB.',
      rejectionReason: 'rejected_size',
    }, { status: 422 });
  }

  // ── PII scan for CSV/XLSX ─────────────────────────────────────────────────
  let parserStatus = 'metadata_only';
  let rowCount = 0;

  if (fileExt === 'csv' || fileExt === 'xlsx') {
    let rows: Record<string, string>[] = [];
    let headers: string[] = [];

    try {
      if (fileExt === 'csv') {
        const content = fileBuffer.toString('utf-8');
        const parsed  = parseCsvContent(content);
        rows    = parsed.rows;
        headers = parsed.headers;
        rowCount = rows.length;
      } else {
        // XLSX — use first sheet
        const parsed = await parseExcelSheet(fileBuffer, '', MAX_ROWS);
        rows    = parsed.rows;
        headers = parsed.headers;
        rowCount = rows.length;
      }
    } catch (e) {
      return NextResponse.json({ error: `Errore parsing file: ${(e as Error).message}` }, { status: 422 });
    }

    // Row limit
    if (rowCount > MAX_ROWS) {
      return NextResponse.json({
        error: `Troppe righe nel file. Massimo ${MAX_ROWS} righe.`,
        rejectionReason: 'rejected_size',
      }, { status: 422 });
    }

    // Header blocklist check
    const forbiddenFound = headers
      .map((h) => h.toLowerCase().trim())
      .filter((h) => FORBIDDEN_HEADERS.has(h));

    if (forbiddenFound.length > 0) {
      await logAudit(db, {
        tenant_id:     auth.tenantId,
        actor_role:    auth.koraRole,
        actor_id:      auth.id,
        action:        'company_submission_file_rejected',
        resource_type: 'analytics.source_batch',
        resource_id:   submissionId,
        payload:       { file_name_safe: fileNameSafe, file_type: fileExt, rejection: 'forbidden_headers', forbidden_count: forbiddenFound.length, operator: auth.email },
        ip_address:    null,
      });

      return NextResponse.json({
        error: 'Il file contiene colonne non consentite (dati identificativi diretti). Rimuovere le colonne PII prima di caricare.',
        rejectionReason: 'rejected_pii',
        forbiddenHeaderCount: forbiddenFound.length,
      }, { status: 422 });
    }

    // Value-level PII scan on original rows — wrap array in object for type safety
    const piiScan = detectPiiInPayload({ rows } as unknown as Record<string, unknown>);
    if (piiScan.hasPii) {
      const summary = summarizePiiFindings(piiScan.findings);

      await logAudit(db, {
        tenant_id:     auth.tenantId,
        actor_role:    auth.koraRole,
        actor_id:      auth.id,
        action:        'company_submission_file_rejected',
        resource_type: 'analytics.source_batch',
        resource_id:   submissionId,
        payload:       { file_name_safe: fileNameSafe, file_type: fileExt, rejection: 'pii_detected', pii_findings: summary, operator: auth.email },
        ip_address:    null,
      });

      return NextResponse.json({
        error: 'Il file contiene dati che potrebbero identificare individui. Rimuovere i dati personali prima di caricare.',
        rejectionReason: 'rejected_pii',
        piiSummary: summary,
      }, { status: 422 });
    }

    parserStatus = 'parsed_metadata';
  }

  // ── Store binary to private bucket ────────────────────────────────────────
  const fileId = randomUUID();
  let storageStatus: 'stored_private' | 'metadata_only' = 'metadata_only';
  let storageWarning: string | undefined;

  if (isBinaryStorable({ fileType: fileExt, parserStatus: 'metadata_only' })) {
    const storagePath = buildSubmissionFilePath({
      tenantId:     auth.tenantId,
      submissionId,
      fileId,
      fileNameSafe,
    });
    const contentType = getAttachmentContentType(fileExt);

    // Storage upload usa service-role isolato (bucket privato by design Supabase).
    // La route usa getSupabaseServerClient per tutte le operazioni DB — solo l'upload
    // passa per uploadToAttachmentBucket (lib/supabase/storage-service-key.ts).
    const uploadResult = await uploadToAttachmentBucket(storagePath, fileBuffer, contentType);
    if (!uploadResult.ok) {
      storageWarning = uploadResult.error;
    } else {
      storageStatus = 'stored_private';
    }
  }

  // ── Update submission payload_sample with new file metadata ──────────────
  const newFileMeta = {
    file_id:          fileId,
    safe_name:        fileNameSafe,
    original_name:    fileName.slice(0, 80),
    file_type:        fileExt,
    file_size_bytes:  fileSizeBytes,
    purpose,
    uploaded_at:      new Date().toISOString(),
    storage_status:   storageStatus,
    parser_status:    parserStatus,
    row_count:        rowCount,
    pii_rejected:     false,
    // NO storagePath, NO storageBucket stored here (company-visible payload)
  };

  const updatedFiles = [...existingFiles, newFileMeta];
  const updatedCs = {
    ...((sub.payload_sample?._cs ?? {}) as Record<string, unknown>),
    files: updatedFiles,
  };

  const { error: updateErr } = await db
    .schema('analytics').from('source_batch')
    .update({
      row_count:      updatedFiles.length,
      payload_sample: { ...(sub.payload_sample ?? {}), _cs: updatedCs },
      updated_at:     new Date().toISOString(),
    })
    .eq('id', submissionId)
    .eq('tenant_id', auth.tenantId);

  if (updateErr) {
    return NextResponse.json({ error: 'Errore salvataggio metadata file.' }, { status: 500 });
  }

  await logAudit(db, {
    tenant_id:     auth.tenantId,
    actor_role:    auth.koraRole,
    actor_id:      auth.id,
    action:        'company_submission_file_uploaded',
    resource_type: 'analytics.source_batch',
    resource_id:   submissionId,
    payload:       { file_id: fileId, file_name_safe: fileNameSafe, file_type: fileExt, file_size_bytes: fileSizeBytes, storage_status: storageStatus, parser_status: parserStatus, purpose, operator: auth.email },
    ip_address:    null,
  });

  return NextResponse.json({
    ok:              true,
    fileId,
    fileNameSafe,
    fileType:        fileExt,
    fileSizeBytes,
    storageStatus,
    parserStatus,
    rowCount:        rowCount > 0 ? rowCount : undefined,
    purpose,
    ...(storageWarning ? { storageWarning } : {}),
    // NO storagePath, NO signedUrl
  }, { status: 201 });
}
