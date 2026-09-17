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
import { assertRateLimit } from '@/lib/security/rate-limit';
import {
  ingestCompanyDataFile, CompanyIngestValidationError, ALLOWED_INGEST_EXTENSIONS, MAX_INGEST_BYTES,
} from '@/lib/ingestion-hardening/company-ingest-service';
import { getOrCreateCorrelationId, logInfo, captureError } from '@/lib/observability/observability';

const ROUTE = '/api/company/data-ingest';
const OPERATION = 'company_data_upload.ingest';

function getFileExtension(filename: string): string {
  return filename.toLowerCase().split('.').pop() ?? '';
}

export async function POST(request: NextRequest) {
  // KORA-WP-046: one correlation id per request, generated (or reused if the
  // caller supplied a safely-shaped one) as early as possible so it can
  // travel through parsing, the idempotency claim, and any error — and be
  // echoed back to the caller on every response, success or failure.
  const correlationId = getOrCreateCorrelationId(request.headers.get('x-correlation-id'));

  const originGuard = assertSameOrigin(request);
  if (originGuard) return originGuard;

  const auth = await requireCompanyUser(request);
  if (isKoraAuthError(auth)) return auth;

  // KORA-WP-044: a real file-upload/ingestion write — the same risk shape
  // (storage/compute cost, bulk-misuse potential) heavy_provisioning
  // already exists to cover, not a new category invented for this route.
  const rateLimitGuard = await assertRateLimit('heavy_provisioning', auth.id);
  if (rateLimitGuard) return rateLimitGuard;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data.', correlationId }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'Campo "file" obbligatorio.', correlationId }, { status: 400 });
  }

  const fileExtension = getFileExtension(file.name ?? 'upload');
  if (!ALLOWED_INGEST_EXTENSIONS.includes(fileExtension as (typeof ALLOWED_INGEST_EXTENSIONS)[number])) {
    return NextResponse.json({
      error: `Tipo file non supportato: .${fileExtension}. Supportati: ${ALLOWED_INGEST_EXTENSIONS.join(', ').toUpperCase()}.`, correlationId,
    }, { status: 422 });
  }

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  if (fileBuffer.byteLength > MAX_INGEST_BYTES) {
    return NextResponse.json({
      error: `File troppo grande. Limite: ${Math.round(MAX_INGEST_BYTES / 1024 / 1024)} MB.`, correlationId,
    }, { status: 422 });
  }

  const idempotencyKey = request.headers.get('idempotency-key') ?? undefined;
  const obsCtx = { correlationId, operation: OPERATION, route: ROUTE, actorRole: auth.koraRole, tenantId: auth.tenantId };

  // Every response below carries `correlationId` — a support reference a
  // Company user can quote, never a stack trace or internal detail
  // (this WP's own §21).
  try {
    const outcome = await ingestCompanyDataFile({
      tenantId: auth.tenantId,
      actorId: auth.email,
      fileName: file.name ?? 'upload',
      fileExtension,
      fileBuffer,
      idempotencyKey,
      correlationId,
    });

    switch (outcome.kind) {
      case 'executed':
        logInfo('ingest executed', obsCtx);
        return NextResponse.json({
          ok: true, replayed: false, batchId: outcome.batchId, rowCount: outcome.rowCount, fileType: outcome.fileType, correlationId,
        }, { status: 201 });
      case 'replayed':
        logInfo('ingest replayed', obsCtx);
        return NextResponse.json({
          ok: true, replayed: true, batchId: outcome.batchId, rowCount: outcome.rowCount, fileType: outcome.fileType, correlationId,
        }, { status: 200 });
      case 'replayed_failure':
        logInfo('ingest replayed_failure', obsCtx);
        return NextResponse.json({ ok: false, replayed: true, error: outcome.error, correlationId }, { status: 422 });
      case 'conflict':
        logInfo('ingest conflict', obsCtx);
        return NextResponse.json({
          ok: false, error: 'Idempotency-Key già usata con un file diverso.', correlationId,
        }, { status: 409 });
      case 'in_progress':
        logInfo('ingest in_progress', obsCtx);
        return NextResponse.json({
          ok: false, error: 'Ingestione già in corso per questa chiave. Riprovare tra qualche istante.', correlationId,
        }, { status: 409 });
      default:
        captureError(new Error(`unreachable ingest outcome kind: ${(outcome as { kind: string }).kind}`), obsCtx);
        return NextResponse.json({ error: 'Errore interno.', correlationId }, { status: 500 });
    }
  } catch (e) {
    if (e instanceof CompanyIngestValidationError) {
      // A validation rejection is expected domain behavior, not an
      // unexpected technical failure — logged, never sent to Sentry.
      logInfo('ingest validation rejected', obsCtx);
      return NextResponse.json({ error: e.message, correlationId }, { status: 422 });
    }
    captureError(e, obsCtx, 'ingest failed unexpectedly');
    return NextResponse.json({ error: 'Errore durante l\'ingestione del file.', correlationId }, { status: 500 });
  }
}
