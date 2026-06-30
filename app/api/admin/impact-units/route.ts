// app/api/admin/impact-units/route.ts
// Impact Units™ Explorer API — KORA_ADMIN only.
//
// GET /api/admin/impact-units?tenantId=<uuid>[&reportingPeriod=<string>]
//
// Returns aggregate IU summary + per-record factor traces for a tenant/period.
// No worker_pseudonym_id. No individual worker data. factor_trace is admin-safe
// (methodology factors only — NM, BC, CQ, EV, CF, AGF — no PII).
//
// Privacy: analytics.impact_unit has no worker identity column.
// factor_trace JSONB contains only methodology factor codes and values.
// Safe to return to KORA_ADMIN in full.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { queryImpactUnits, queryImpactUnitPeriods } from '@/lib/supabase/impact-unit-service-key';
import type { ImpactUnitFactorTrace } from '@/lib/types';

// ── Response types ────────────────────────────────────────────────────────────

interface PillarTotals {
  LIFE: number;
  GROWTH: number;
  CONNECTION: number;
  IMPACT: number;
  LEGACY: number;
}

interface IUTraceRecord {
  id:                 string;
  uefRecordId:        string;
  sourceBatchId:      string;
  rawName:            string | null;
  primaryPillar:      string | null;
  eligibility:        string | null;
  computed:           boolean;
  exclusionReason:    string | null;
  impactUnitsTotal:   number;
  pillarIU:           PillarTotals;
  nm:                 number;
  bc:                 number;
  cq:                 number;
  ev:                 number;
  cf:                 number;
  agf:                number;
  factorTrace:        ImpactUnitFactorTrace[];
  methodologyVersion: string;
  calibrationStatus:  string;
  createdAt:          string;
}

interface IUSummary {
  totalRecords:       number;
  computedRecords:    number;
  blockedRecords:     number;
  totalIU:            number;
  pillarTotals:       PillarTotals;
  avgNM:              number;
  avgCQ:              number;
  avgEV:              number;
  avgCF:              number;
  methodologyVersion: string;
  calibrationStatus:  string;
  costPerIU:          null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function r4(n: number): number { return Math.round(n * 10000) / 10000; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

function avg(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

// ── GET handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantIdParsed       = z.string().uuid().safeParse(searchParams.get('tenantId'));
  const reportingPeriodParam = (searchParams.get('reportingPeriod') ?? '').trim();

  if (!tenantIdParsed.success) {
    return NextResponse.json({ error: 'tenantId non valido.' }, { status: 400 });
  }
  const tenantId = tenantIdParsed.data;

  const db = getSupabaseServiceClient();

  // ── Tenant lookup ─────────────────────────────────────────────────────────
  const { data: tenantRow, error: tenantError } = await db
    .schema('analytics').from('tenant')
    .select('id, tenant_code, company_name')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenantRow) {
    return NextResponse.json({ error: 'Tenant non trovato.' }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenant = tenantRow as any;

  // ── Available periods (scoped service-key) ────────────────────────────────
  const { data: allPeriods, error: periodsError } = await queryImpactUnitPeriods({ tenantId });
  if (periodsError) {
    return NextResponse.json({ error: periodsError }, { status: 500 });
  }
  const availablePeriods = [...new Set(allPeriods ?? [])] as string[];

  // ── Resolve period ────────────────────────────────────────────────────────
  const period = reportingPeriodParam || availablePeriods[0] || '';

  if (!period) {
    return NextResponse.json({
      ok:               true,
      tenant:           { id: tenant.id, tenantCode: tenant.tenant_code, companyName: tenant.company_name },
      period:           null,
      availablePeriods: [],
      summary:          null,
      records:          [],
    });
  }

  // ── Fetch impact_unit rows (scoped service-key, column whitelist) ─────────
  const IU_COLUMNS = [
    'id', 'uef_record_id', 'source_batch_id', 'reporting_period',
    'nm', 'bc', 'cq', 'ev', 'cf', 'agf',
    'impact_units_total',
    'life_iu', 'growth_iu', 'connection_iu', 'impact_iu', 'legacy_iu',
    'computed', 'exclusion_reason', 'factor_trace',
    'methodology_version', 'calibration_status', 'created_at',
  ];

  const { data: iuData, error: iuError } = await queryImpactUnits({
    tenantId,
    reportingPeriod: period,
    columns: IU_COLUMNS,
    orderBy: { column: 'impact_units_total', ascending: false },
  });

  if (iuError) {
    return NextResponse.json({ error: iuError }, { status: 500 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = iuData ?? [];

  // ── Fetch UEF record metadata ─────────────────────────────────────────────
  const uefIds = [...new Set(rows.map((r) => r.uef_record_id))] as string[];
  const uefMeta: Record<string, { raw_name: string | null; primary_pillar: string | null; eligibility: string | null }> = {};

  if (uefIds.length > 0) {
    const { data: uefData } = await db
      .schema('analytics').from('uef_record')
      .select('id, raw_name, primary_pillar, eligibility')
      .in('id', uefIds);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const u of (uefData ?? []) as any[]) {
      uefMeta[u.id] = { raw_name: u.raw_name ?? null, primary_pillar: u.primary_pillar ?? null, eligibility: u.eligibility ?? null };
    }
  }

  // ── Aggregate summary ─────────────────────────────────────────────────────
  const computedRows = rows.filter((r) => r.computed);
  const blockedRows  = rows.filter((r) => !r.computed);

  const totalIU = r4(rows.reduce((s, r) => s + (r.impact_units_total ?? 0), 0));
  const pillarTotals: PillarTotals = {
    LIFE:       r4(rows.reduce((s, r) => s + (r.life_iu ?? 0), 0)),
    GROWTH:     r4(rows.reduce((s, r) => s + (r.growth_iu ?? 0), 0)),
    CONNECTION: r4(rows.reduce((s, r) => s + (r.connection_iu ?? 0), 0)),
    IMPACT:     r4(rows.reduce((s, r) => s + (r.impact_iu ?? 0), 0)),
    LEGACY:     r4(rows.reduce((s, r) => s + (r.legacy_iu ?? 0), 0)),
  };

  const summary: IUSummary = {
    totalRecords:    rows.length,
    computedRecords: computedRows.length,
    blockedRecords:  blockedRows.length,
    totalIU,
    pillarTotals,
    avgNM: r3(avg(computedRows.map((r) => r.nm ?? 0))),
    avgCQ: r3(avg(computedRows.map((r) => r.cq ?? 0))),
    avgEV: r3(avg(computedRows.map((r) => r.ev ?? 0))),
    avgCF: r3(avg(computedRows.map((r) => r.cf ?? 0))),
    methodologyVersion: computedRows[0]?.methodology_version ?? 'unknown',
    calibrationStatus:  computedRows[0]?.calibration_status  ?? 'pre_empirical_calibration',
    costPerIU: null,
  };

  // ── Map records ───────────────────────────────────────────────────────────
  const records: IUTraceRecord[] = rows.map((r) => {
    const meta       = uefMeta[r.uef_record_id] ?? { raw_name: null, primary_pillar: null, eligibility: null };
    const factorTrace: ImpactUnitFactorTrace[] = Array.isArray(r.factor_trace)
      ? r.factor_trace as ImpactUnitFactorTrace[]
      : [];

    return {
      id:                r.id,
      uefRecordId:       r.uef_record_id,
      sourceBatchId:     r.source_batch_id,
      rawName:           meta.raw_name,
      primaryPillar:     meta.primary_pillar,
      eligibility:       meta.eligibility,
      computed:          r.computed,
      exclusionReason:   r.exclusion_reason ?? null,
      impactUnitsTotal:  r.impact_units_total,
      pillarIU: {
        LIFE:       r.life_iu,
        GROWTH:     r.growth_iu,
        CONNECTION: r.connection_iu,
        IMPACT:     r.impact_iu,
        LEGACY:     r.legacy_iu,
      },
      nm: r.nm, bc: r.bc, cq: r.cq, ev: r.ev, cf: r.cf, agf: r.agf,
      factorTrace,
      methodologyVersion: r.methodology_version,
      calibrationStatus:  r.calibration_status,
      createdAt:          r.created_at,
    };
  });

  return NextResponse.json({
    ok: true,
    tenant: {
      id:          tenant.id,
      tenantCode:  tenant.tenant_code,
      companyName: tenant.company_name,
    },
    period,
    availablePeriods,
    summary,
    records,
  });
}
