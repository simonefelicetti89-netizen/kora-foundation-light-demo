// app/api/admin/decision-pack/pdf/route.ts
// Decision Pack PDF download — KORA_ADMIN only.
//
// Reads persisted OP-001 data (no scoring recalculation),
// builds executive-grade HTML, renders to PDF via Playwright chromium.
//
// Auth: KORA_ADMIN Supabase session (cookie or Authorization: Bearer).
//   company roles → 403; no session → 401.
//
// Vercel note: Playwright chromium is not available on Vercel serverless
//   by default. If launch fails, returns 501 with hint to use the
//   HTML preview endpoint instead (/api/admin/decision-pack/preview).

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

  let pdfBuffer: Buffer;
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });
    const page    = await browser.newPage();
    // networkidle ensures base64 images and CSS are fully processed
    await page.setContent(html, { waitUntil: 'networkidle' });
    pdfBuffer = await page.pdf({
      format:          'A4',
      printBackground: true,
      margin:          { top: '0', right: '0', bottom: '0', left: '0' },
    });
    await browser.close();
  } catch {
    return NextResponse.json(
      {
        error:   'PDF generation unavailable in this environment.',
        detail:  'Playwright chromium could not be launched. Use the HTML preview instead.',
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
