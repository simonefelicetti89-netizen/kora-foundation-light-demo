// app/api/company/decision-pack/pdf/route.ts
// Company Decision Pack PDF download — COMPANY_ADMIN only (B143: COMPANY_VIEWER rimosso).
//
// GET /api/company/decision-pack/pdf?reportingPeriod=...
//
// Tenant is ALWAYS from authenticated session — never from URL params.
// Generates the PDF from persisted Supabase data for the company's own tenant.
// Uses Puppeteer (same path as admin PDF route).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { fetchPdfData } from '@/lib/decision-pack/pdf-data';
import { buildDecisionPackHtml } from '@/lib/decision-pack/html-template';
import { renderHtmlToPdf } from '@/lib/decision-pack/pdf-runtime';

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId } = authResult;

  const db = getSupabaseServiceClient();
  const { data: tenantRow } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, is_active')
    .eq('id', tenantId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!tenantRow || !(tenantRow as any).is_active) {
    return NextResponse.json({ error: 'Workspace non trovato o sospeso.' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantCode = (tenantRow as any).tenant_code as string;

  const { searchParams } = new URL(request.url);
  const reportingPeriod = searchParams.get('reportingPeriod') ?? '';

  let resolvedPeriod = reportingPeriod;
  if (!resolvedPeriod) {
    const { data: ki } = await db
      .schema('analytics').from('kora_index_result')
      .select('reporting_period')
      .eq('tenant_id', tenantId)
      .eq('is_current', true)
      .maybeSingle();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolvedPeriod = (ki as any)?.reporting_period ?? '';
  }

  if (!resolvedPeriod) {
    return NextResponse.json({ error: 'Nessun scoring disponibile.' }, { status: 404 });
  }

  const data = await fetchPdfData(tenantCode, resolvedPeriod);
  if (!data) {
    return NextResponse.json({ error: `Nessun dato per ${tenantCode} / ${resolvedPeriod}.` }, { status: 404 });
  }

  const html = buildDecisionPackHtml(data);
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderHtmlToPdf(html);
  } catch {
    // Fallback to HTML if Puppeteer is unavailable (e.g., local dev without headless Chrome)
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  const filename = `KORA_DecisionPack_${tenantCode}_${resolvedPeriod}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control':       'no-store',
    },
  });
}
