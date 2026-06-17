// app/api/company/decision-pack/route.ts
// Company Decision Pack HTML preview — COMPANY_ADMIN only (B143: COMPANY_VIEWER rimosso).
//
// GET /api/company/decision-pack?reportingPeriod=...
//
// Tenant is ALWAYS derived from authenticated session (app_metadata.kora_tenant_id).
// NEVER accepts tenantId from query params or request body.
//
// Returns the Decision Pack HTML for the company's current result.
// Company can only see their own Decision Pack (tenant isolation enforced by session).

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { fetchPdfData } from '@/lib/decision-pack/pdf-data';
import { buildDecisionPackHtml } from '@/lib/decision-pack/html-template';

export async function GET(request: NextRequest) {
  const authResult = await requireCompanyUser(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { tenantId } = authResult;

  // Resolve tenant_code from session tenantId (never from URL params)
  const db = await getSupabaseServerClient();
  const { data: tenantRow, error: tenantErr } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, is_active')
    .eq('id', tenantId)
    .maybeSingle();

  if (tenantErr || !tenantRow) {
    return NextResponse.json({ error: 'Workspace non trovato.' }, { status: 404 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(tenantRow as any).is_active) {
    return NextResponse.json({ error: 'Workspace sospeso.' }, { status: 403 });
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantCode = (tenantRow as any).tenant_code as string;

  // Reporting period from query param (informational — actual data lookup uses tenantId from session)
  const { searchParams } = new URL(request.url);
  const reportingPeriod = searchParams.get('reportingPeriod') ?? '';

  // If no specific period requested, use the most recent result
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
    return NextResponse.json(
      { error: 'Nessun KORA Index disponibile per questa azienda. Completa il processo di scoring.', hint: 'Run scoring first via KORA_ADMIN pipeline.' },
      { status: 404 },
    );
  }

  // Check company can access this Decision Pack (status must be 'ready' or 'exported')
  const { data: dp } = await db
    .schema('analytics').from('decision_pack_version')
    .select('id, status, version_id')
    .eq('tenant_id', tenantId)
    .eq('reporting_period', resolvedPeriod)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dpStatus = (dp as any)?.status as string | undefined;
  if (!dpStatus) {
    return NextResponse.json(
      { error: 'Decision Pack non trovato per il periodo richiesto.', reportingPeriod: resolvedPeriod },
      { status: 404 },
    );
  }
  if (dpStatus !== 'ready' && dpStatus !== 'exported' && dpStatus !== 'draft') {
    return NextResponse.json(
      { error: `Decision Pack non disponibile. Stato attuale: ${dpStatus}. Contatta il tuo KORA Admin.` },
      { status: 403 },
    );
  }

  const data = await fetchPdfData(tenantCode, resolvedPeriod);
  if (!data) {
    return NextResponse.json(
      { error: `Nessun dato trovato per ${tenantCode} / ${resolvedPeriod}.` },
      { status: 404 },
    );
  }

  const html = buildDecisionPackHtml(data);
  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type':        'text/html; charset=utf-8',
      'Cache-Control':       'no-store',
      'X-Tenant-Code':       tenantCode,
      'X-Reporting-Period':  resolvedPeriod,
    },
  });
}
