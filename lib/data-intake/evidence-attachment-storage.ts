// lib/data-intake/evidence-attachment-storage.ts
// B34: Private Attachment Storage — Supabase Storage, server-side only.
//
// Design:
//   - Server-side only. Never import from browser components.
//   - Service role used for upload/signed URL (bypasses RLS).
//   - Private bucket only — no public URLs.
//   - Short signed URL expiry (max 300 seconds / 5 minutes).
//   - Storage path: no raw filenames, no initiative names, no PII.
//   - Signed URLs never stored in DB or logged.
//   - Binary not stored for unsupported (DOCX) or PII-rejected files.
//
// Bucket setup (one-time manual):
//   Supabase dashboard → Storage → New bucket → name: kora-evidence-attachments → Private
//   Or run: supabase storage create kora-evidence-attachments --no-public

import { getSupabaseServiceClient } from '@/lib/supabase/server';

export const ATTACHMENT_BUCKET = 'kora-evidence-attachments';

// Max signed URL lifetime — never exceed this regardless of caller input
const MAX_SIGNED_URL_EXPIRY_SECONDS = 300;

// ── Types ─────────────────────────────────────────────────────────────────────

export type StorageStatus = 'stored_private' | 'metadata_only';

export type StoredEvidenceAttachment = {
  storageBucket: string;
  storagePath: string;
  fileSizeBytes: number;
  storageStatus: 'stored_private';
};

// ── Storage path builder ──────────────────────────────────────────────────────
// No raw initiative names, no raw filenames with PII, no path traversal.

export function buildAttachmentStoragePath(params: {
  tenantId: string;
  batchId: string;
  attachmentId: string;
  fileNameSafe: string;
}): string {
  // Path segments (tenantId/batchId/attachmentId): alphanumeric, dash, underscore only
  // No dots to prevent path traversal via ".." sequences
  const safeSegment = (s: string, maxLen: number) =>
    s.replace(/[^a-zA-Z0-9\-_]/g, '_').slice(0, maxLen);

  // File name: allow dots (for extension) but no other special chars
  const safeFile = (s: string, maxLen: number) =>
    s.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/\.{2,}/g, '_').slice(0, maxLen);

  const tenantSeg = safeSegment(params.tenantId,    50);
  const batchSeg  = safeSegment(params.batchId,     50);
  const attSeg    = safeSegment(params.attachmentId, 50);
  const fileSeg   = safeFile(params.fileNameSafe,   80);

  return `tenant/${tenantSeg}/batch/${batchSeg}/attachments/${attSeg}/${fileSeg}`;
}

// ── Content-type mapping ──────────────────────────────────────────────────────

const CONTENT_TYPES: Record<string, string> = {
  pdf:  'application/pdf',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv:  'text/csv',
};

export function getAttachmentContentType(fileType: string): string {
  return CONTENT_TYPES[fileType] ?? 'application/octet-stream';
}

// ── Is binary storable? ───────────────────────────────────────────────────────
// Only store binary for supported file types that passed PII check.

export function isBinaryStorable(params: {
  fileType: string;
  parserStatus: string;
}): boolean {
  const { fileType, parserStatus } = params;
  if (parserStatus === 'rejected_pii')  return false;
  if (parserStatus === 'rejected_size') return false;
  if (fileType === 'docx')    return false;
  if (fileType === 'unknown') return false;
  return ['pdf', 'xlsx', 'csv'].includes(fileType);
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function storeEvidenceAttachment(params: {
  tenantId: string;
  batchId: string;
  attachmentId: string;
  fileNameSafe: string;
  fileBuffer: Buffer;
  fileType: string;
}): Promise<StoredEvidenceAttachment> {
  const { tenantId, batchId, attachmentId, fileNameSafe, fileBuffer, fileType } = params;

  const db = getSupabaseServiceClient();
  const storagePath = buildAttachmentStoragePath({ tenantId, batchId, attachmentId, fileNameSafe });
  const contentType = getAttachmentContentType(fileType);

  const { error } = await db.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, fileBuffer, { contentType, upsert: false });

  if (error) {
    const msg = error.message ?? '';
    if (
      msg.toLowerCase().includes('bucket') ||
      msg.toLowerCase().includes('not found') ||
      msg.toLowerCase().includes('does not exist')
    ) {
      throw new Error(
        `storage_not_configured: Bucket "${ATTACHMENT_BUCKET}" not found. ` +
        `Create it manually: Supabase dashboard → Storage → New bucket → ` +
        `name="${ATTACHMENT_BUCKET}", private=true.`,
      );
    }
    throw new Error(`storage_upload_failed: ${msg}`);
  }

  return {
    storageBucket: ATTACHMENT_BUCKET,
    storagePath,
    fileSizeBytes: fileBuffer.byteLength,
    storageStatus: 'stored_private',
  };
}

// ── Signed URL (short expiry, never stored) ───────────────────────────────────

export async function createEvidenceAttachmentSignedUrl(params: {
  storageBucket: string;
  storagePath: string;
  expiresInSeconds?: number;
}): Promise<{ signedUrl: string; expiresInSeconds: number }> {
  const db = getSupabaseServiceClient();
  const expiry = Math.min(
    params.expiresInSeconds ?? MAX_SIGNED_URL_EXPIRY_SECONDS,
    MAX_SIGNED_URL_EXPIRY_SECONDS,
  );

  const { data, error } = await db.storage
    .from(params.storageBucket)
    .createSignedUrl(params.storagePath, expiry);

  if (error || !data?.signedUrl) {
    throw new Error(`signed_url_failed: ${error?.message ?? 'No signed URL returned'}`);
  }

  // NEVER log or store the signed URL — caller must use it immediately
  return { signedUrl: data.signedUrl, expiresInSeconds: expiry };
}
