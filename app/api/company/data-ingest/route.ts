// app/api/company/data-ingest/route.ts
// KORA-WP-028 — Ingestion Hardening — Sync Path + Retry Contract.
//
// POST /api/company/data-ingest
//
// The first real, synchronous, Company-scoped, idempotent server-side
// ingestion write for the `app/company/data/upload` domain (KORA-WP-001's
// own Runtime Evidence Spike, `105`, found that page has zero server call
// today). Wholly additive — the existing `app/api/company/data-submissions`
// flow (B39) is untouched.
//
// Retry-safe: pass an `Idempotency-Key` header to correlate an explicit
// retry, or omit it — a plain re-submission of the same file content is
// still safely deduplicated by content hash (see
// lib/ingestion-hardening/company-ingest-service.ts).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { assertSameOrigin } from '@/lib/security/origin';
import {
  ingestCompanyDataFile, CompanyIngestValidationError, ALLOWED_INGEST_EXTENSIONS, MAX_INGEST_BYTES,
} from '@/lib/ingestion-hardening/company-ingest-service';

function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? '';
}

export async function POST(request: NextRequest) {
  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Campo "file" obbligatorio.' }, { status: 400 });
  }

  const fileExtension = getFileExtension(file.name ?? 'upload');
  if (!ALLOWED_INGEST_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_INGEST_EXTENSIONS)[number])) {
    return NextResponse.json({
      error: `Tipo file non supportato: .${fileExtension}. Supportati: ${ALLOWED_INGEST_EXTENSIONS.join(', ').toUpperCase()}.`,
    }, { status: 422 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.byteLength > MAX_INGEST_BYTES) {
    return NextResponse.json({
      error: `File troppo grande. Limite: ${Math.round(MAX_INGEST_BYTES / 1024 / 1024)} MB.`,
    }, { status: 422 });
  }

  const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;

  try {
    const outcome = await ingestCompanyDataFile({
      tenantId: auth.tenantId,
      actorId: auth.email,
      fileName: file.name ?? 'upload',
      fileExtension,
      fileBuffer,
      idempotencyKey,
    });

    switch (outcome.kind) {
      case 'executed':
        return NextResponse.json({
          ok: true, replayed: false, batchId: outcome.batchId, rowCount: outcome.rowCount, fileType: outcome.fileType,
        }, { status: 201 });
      case 'replayed':
        return NextResponse.json({
          ok: true, replayed: true, batchId: outcome.batchId, rowCount: outcome.rowCount, fileType: outcome.fileType,
        }, { status: 200 });
      case 'replayed_failure':
        return NextResponse.json({ ok: false, replayed: true, error: outcome.error }, { status: 422 });
      case 'conflict':
        return NextResponse.json({
          ok: false, error: 'Idempotency-Key già usata con un file diverso.',
        }, { status: 409 });
      case 'in_progress':
        return NextResponse.json({
          ok: false, error: 'Ingestione già in corso per questa chiave. Riprovare tra qualche istante.',
        }, { status: 409 });
      default:
        return NextResponse.json({ error: 'Errore interno.' }, { status: 500 });
    }
  } catch (e) {
    if (e instanceof CompanyIngestValidationError) {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    return NextResponse.json({ error: 'Errore durante l\'ingestione del file.' }, { status: 500 });
  }
}
