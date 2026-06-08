// app/api/admin/decision-pack/pdf/route.ts
// Decision Pack PDF download — KORA_ADMIN only.
//
// Auth: KORA_ADMIN Supabase session (cookie or Authorization: Bearer).
//   no session → 401 | company role → 403 | KORA_ADMIN → PDF generation
//
// PDF runtime (lib/decision-pack/pdf-runtime.ts):
//   Linux / Vercel Pro → @sparticuz/chromium + puppeteer-core
//   macOS / dev        → playwright (local installation)
//
// Fallback: if PDF generation fails, returns 501 JSON with preview hint.
//   No crash. No stack trace exposed.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { fetchPdfData } from '@/lib/decision-pack/pdf-data';
import { buildDecisionPackHtml } from '@/lib/decision-pack/html-template';
import { renderHtmlToPdf } from '@/lib/decision-pack/pdf-runtime';

export async function GET(request: NextRequest) {
  // Auth before any PDF work — 401/403 returned here if not authorized
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = searchParams.get('tenantCode');
  const reportingPeriod = searchParams.get('reportingPeriod') ?? '2026-Q1';

  // B101: tenantCode is required — no silent OP-001 fallback.
  if (!tenantCode || !tenantCode.trim()) {
    return NextResponse.json(
      { error: 'tenantCode is required. Provide ?tenantCode=YOUR_CODE in the query string.' },
      { status: 400 },
    );
  }

  const data = await fetchPdfData(tenantCode, reportingPeriod);
  if (!data) {
    return NextResponse.json(
      { error: `No data found for ${tenantCode} / ${reportingPeriod}. Run operator flow first.` },
      { status: 404 },
    );
  }

  const html = buildDecisionPackHtml(data);

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderHtmlToPdf(html);
  } catch {
    // Controlled 501 — no internal errors or stack traces exposed
    return NextResponse.json(
      {
        error:   'PDF generation unavailable in this environment.',
        detail:  'The PDF runtime could not be launched. Use the HTML preview instead.',
        preview: `/api/admin/decision-pack/preview?tenantCode=${tenantCode}&reportingPeriod=${reportingPeriod}`,
      },
      { status: 501 },
    );
  }

  const filename = `kora-decision-pack-${tenantCode}-${reportingPeriod}.pdf`;
  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status:  200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      String(pdfBuffer.length),
      'Cache-Control':       'no-store',
    },
  });
}
