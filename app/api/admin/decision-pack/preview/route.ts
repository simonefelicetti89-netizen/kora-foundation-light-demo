// app/api/admin/decision-pack/preview/route.ts
// Decision Pack HTML preview — KORA_ADMIN only.
//
// Returns the same executive-grade HTML document as the PDF endpoint,
// but as text/html so the browser renders it directly.
// Vercel-compatible alternative to the PDF download endpoint.
//
// Usage: open in browser tab → File → Print → Save as PDF
//   or use as fallback when Playwright is not available.

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { fetchPdfData } from '@/lib/decision-pack/pdf-data';
import { buildDecisionPackHtml } from '@/lib/decision-pack/html-template';

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = searchParams.get('tenantCode')      ?? 'OP-001';
  const reportingPeriod = searchParams.get('reportingPeriod') ?? '2026-Q1';

  const data = await fetchPdfData(tenantCode, reportingPeriod);
  if (!data) {
    return NextResponse.json(
      { error: `No data found for ${tenantCode} / ${reportingPeriod}. Run operator flow first.` },
      { status: 404 },
    );
  }

  const html = buildDecisionPackHtml(data);
  return new NextResponse(html, {
    status:  200,
    headers: {
      'Content-Type':  'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
