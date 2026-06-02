// app/api/admin/company-live-preview/route.ts
// B20 — Company Live Preview read-model. KORA_ADMIN only.
//
// Board-safe aggregated view of a live pilot.
// Read-only. No raw payload. No individual worker records. No PII.
// No operational actions (upload, approve, scoring, delete).
//
// Returns: pilot status, KORA Index, pillar distribution, BTI/financial,
//          reporting alignment (B18), reporting readiness (B19), Decision Pack links.

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';

export type LivePreviewPilotStatus =
  | 'not_started'
  | 'batch_pending'
  | 'review_ready'
  | 'needs_enrichment'
  | 'ready_for_scoring'
  | 'scored'
  | 'decision_pack_ready'
  | 'decision_pack_exported';

function derivePilotStatus(
  hasBatch: boolean,
  uef: { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null,
  hasScoring: boolean,
  dpStatus: string | null,
): LivePreviewPilotStatus {
  if (!hasBatch)                                                 return 'not_started';
  if (!uef || uef.total === 0)                                   return 'batch_pending';
  if (uef.pendingReview > 0)                                     return 'review_ready';
  if (uef.needsEnrichment > 0 && uef.pendingReview === 0)        return 'needs_enrichment';
  if (uef.approved > 0 && !hasScoring)                           return 'ready_for_scoring';
  if (hasScoring && dpStatus === 'exported')                      return 'decision_pack_exported';
  if (hasScoring && dpStatus)                                     return 'decision_pack_ready';
  return 'scored';
}

export async function GET(request: NextRequest) {
  const authResult = await requireKoraAdmin(request);
  if (isKoraAuthError(authResult)) return authResult;

  const { searchParams } = new URL(request.url);
  const tenantCode      = (searchParams.get('tenantCode') ?? '').trim();
  const reportingPeriod = (searchParams.get('reportingPeriod') ?? '2026-Q1').trim();

  if (!tenantCode) {
    return NextResponse.json({ error: 'tenantCode is required.' }, { status: 400 });
  }

  const db = getSupabaseServiceClient();

  // ── 1. Tenant ─────────────────────────────────────────────────────────────
  const { data: tenantRow, error: tErr } = await db.schema('analytics').from('tenant')
    .select('id, tenant_code, company_name, onboarding_status')
    .eq('tenant_code', tenantCode).eq('is_active', true).maybeSingle();

  if (tErr)      return NextResponse.json({ error: tErr.message }, { status: 500 });
  if (!tenantRow) return NextResponse.json({ error: `Tenant not found: ${tenantCode}` }, { status: 404 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = tenantRow as any;
  const tenantId = t.id as string;

  // ── 2. Workforce baseline ─────────────────────────────────────────────────
  const { data: wbRows } = await db.schema('personal').from('workforce_baseline')
    .select('total_workers, created_at')
    .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wb = ((wbRows ?? []) as any[])[0];

  // ── 3. Latest batch ───────────────────────────────────────────────────────
  const { data: batchRows } = await db.schema('analytics').from('source_batch')
    .select('id, source_name, batch_status, row_count, created_at')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .neq('batch_status', 'rejected')
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latestBatch = ((batchRows ?? []) as any[])[0];

  // ── 4. UEF counts ─────────────────────────────────────────────────────────
  let uef: { total: number; pendingReview: number; approved: number; needsEnrichment: number } | null = null;

  if (latestBatch) {
    const { data: uefRows } = await db.schema('analytics').from('uef_record')
      .select('review_status, approved_for_scoring, payload')
      .eq('batch_id', latestBatch.id);

    if (uefRows) {
      uef = { total: 0, pendingReview: 0, approved: 0, needsEnrichment: 0 };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of uefRows as any[]) {
        uef.total++;
        if (row.review_status === 'pending_review') {
          uef.pendingReview++;
        } else if (row.review_status === 'approved') {
          uef.approved++;
          const pl = (row.payload ?? {}) as Record<string, unknown>;
          if (pl['needs_enrichment'] === true) uef.needsEnrichment++;
        }
      }
    }
  }

  // ── 5. KORA Index + pillar distribution ──────────────────────────────────
  const { data: kiRows } = await db.schema('analytics').from('kora_index_result')
    .select('kora_index_value, safeguard_status, calibration_status, methodology_version_id, is_current, created_at, components, confidence_result:confidence_result_id(confidence_score), activation_result:activation_result_id(activation_rate, meaningful_activation_rate, pillar_distribution)')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ki = ((kiRows ?? []) as any[])[0];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actRow = ki ? (ki.activation_result as any) : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confRow = ki ? (ki.confidence_result as any) : null;
  const rawConf = confRow?.confidence_score ?? 0;
  const cs01 = rawConf > 1 ? rawConf / 100 : rawConf;

  const rawPillar = actRow?.pillar_distribution as Record<string, number> | null | undefined;
  const pillarDistribution = rawPillar
    ? {
        LIFE:       Number(rawPillar['LIFE']       ?? 0),
        GROWTH:     Number(rawPillar['GROWTH']     ?? 0),
        CONNECTION: Number(rawPillar['CONNECTION'] ?? 0),
        IMPACT:     Number(rawPillar['IMPACT']     ?? 0),
        LEGACY:     Number(rawPillar['LEGACY']     ?? 0),
      }
    : null;

  // ── 6. Decision Pack + BTI ────────────────────────────────────────────────
  const { data: dpRows } = await db.schema('analytics').from('decision_pack_version')
    .select('id, version_id, status, bti_result_id, created_at')
    .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false }).limit(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dp = ((dpRows ?? []) as any[])[0];

  let bti: {
    totalBudget: number; deepActivation: number; economicRelief: number;
    blockedCompliance: number; activationDebt: number;
    btiScore: number; costPerIU: number | null;
  } | null = null;

  const btiResultId = (dp as { bti_result_id?: string | null } | null)?.bti_result_id ?? null;
  if (btiResultId) {
    const { data: btiData } = await db.schema('analytics').from('bti_result')
      .select('total_people_welfare_budget, deep_activation_spend, economic_relief_spend, blocked_compliance_spend, activation_debt_eur, bti_score, cost_per_impact_unit')
      .eq('id', btiResultId).maybeSingle();
    if (btiData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = btiData as any;
      bti = {
        totalBudget:       b.total_people_welfare_budget ?? 0,
        deepActivation:    b.deep_activation_spend       ?? 0,
        economicRelief:    b.economic_relief_spend       ?? 0,
        blockedCompliance: b.blocked_compliance_spend    ?? 0,
        activationDebt:    b.activation_debt_eur         ?? 0,
        btiScore:          b.bti_score                   ?? 0,
        costPerIU:         b.cost_per_impact_unit        ?? null,
      };
    }
  }

  // ── 7. Reporting alignment + readiness — aggregated, no PII, no raw payload ──
  let reportingAlignment: {
    totalMapped: number;
    areas: Array<{ code: string; label: string; count: number; maxStrength: string }>;
  } | null = null;

  let reportingReadiness: {
    totalAreas: number; reportReady: number; usableWithCaveat: number;
    needsEvidence: number; notReady: number;
    topGaps: Array<{
      areaCode: string; areaLabel: string; readiness: string;
      missingEvidence: string[]; recommendedActions: string[]; ownerHint: string;
    }>;
  } | null = null;

  {
    const { data: raRows } = await db.schema('analytics').from('uef_record')
      .select('payload')
      .eq('tenant_id', tenantId).eq('reporting_period', reportingPeriod)
      .eq('approved_for_scoring', true);

    if (raRows && raRows.length > 0) {
      // ── B18 alignment ──────────────────────────────────────────────────────
      type AreaEntry = { code: string; label: string; count: number; strong: number; medium: number; weak: number };
      const areaMap = new Map<string, AreaEntry>();
      let mappedCount = 0;

      // ── B19 readiness ──────────────────────────────────────────────────────
      const READINESS_RANK: Record<string, number> = {
        not_ready: 0, needs_evidence: 1, usable_with_caveat: 2, report_ready: 3,
      };
      type GapEntry = {
        areaCode: string; areaLabel: string; readiness: string;
        readinessRank: number; count: number;
        missingEvidence: Set<string>; recommendedActions: Set<string>; ownerHint: string;
      };
      const gapMap = new Map<string, GapEntry>();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const row of raRows as any[]) {
        const pl = (row.payload ?? {}) as Record<string, unknown>;

        // B18
        const ra = pl['reporting_alignment'] as {
          areas?: Array<{ code: string; label: string; strength?: string }>;
        } | null | undefined;
        if (ra?.areas?.length) {
          mappedCount++;
          for (const area of ra.areas) {
            if (!area.code) continue;
            const e: AreaEntry = areaMap.get(area.code) ?? { code: area.code, label: area.label ?? area.code, count: 0, strong: 0, medium: 0, weak: 0 };
            e.count++;
            if      (area.strength === 'strong') e.strong++;
            else if (area.strength === 'medium') e.medium++;
            else                                 e.weak++;
            areaMap.set(area.code, e);
          }
        }

        // B19
        const gaps = pl['evidence_gaps'] as Array<{
          areaCode: string; areaLabel: string; readiness: string;
          missingEvidence?: string[]; recommendedActions?: string[]; ownerHint?: string;
        }> | null | undefined;
        if (!Array.isArray(gaps) || gaps.length === 0) continue;

        for (const gap of gaps) {
          if (!gap.areaCode) continue;
          const incomingRank = READINESS_RANK[gap.readiness] ?? 1;
          const existing = gapMap.get(gap.areaCode);
          if (!existing) {
            gapMap.set(gap.areaCode, {
              areaCode: gap.areaCode, areaLabel: gap.areaLabel ?? gap.areaCode,
              readiness: gap.readiness, readinessRank: incomingRank, count: 1,
              missingEvidence:    new Set(gap.missingEvidence ?? []),
              recommendedActions: new Set(gap.recommendedActions ?? []),
              ownerHint: gap.ownerHint ?? 'Unknown',
            });
          } else {
            if (incomingRank < existing.readinessRank) {
              existing.readiness = gap.readiness;
              existing.readinessRank = incomingRank;
            }
            (gap.missingEvidence ?? []).forEach(m => existing.missingEvidence.add(m));
            (gap.recommendedActions ?? []).forEach(a => existing.recommendedActions.add(a));
            existing.count++;
          }
        }
      }

      if (areaMap.size > 0) {
        reportingAlignment = {
          totalMapped: mappedCount,
          areas: Array.from(areaMap.values())
            .sort((a, b) => b.count - a.count)
            .map(e => ({
              code:        e.code,
              label:       e.label,
              count:       e.count,
              maxStrength: e.strong > 0 ? 'strong' : e.medium > 0 ? 'medium' : 'weak',
            })),
        };
      }

      if (gapMap.size > 0) {
        let rr = 0, uc = 0, ne = 0, nr = 0;
        for (const g of gapMap.values()) {
          if      (g.readiness === 'report_ready')       rr++;
          else if (g.readiness === 'usable_with_caveat') uc++;
          else if (g.readiness === 'needs_evidence')     ne++;
          else                                           nr++;
        }
        reportingReadiness = {
          totalAreas:       gapMap.size,
          reportReady:      rr,
          usableWithCaveat: uc,
          needsEvidence:    ne,
          notReady:         nr,
          topGaps: Array.from(gapMap.values())
            .sort((a, b) => a.readinessRank - b.readinessRank || b.count - a.count)
            .slice(0, 5)
            .map(g => ({
              areaCode:           g.areaCode,
              areaLabel:          g.areaLabel,
              readiness:          g.readiness,
              missingEvidence:    Array.from(g.missingEvidence).slice(0, 3),
              recommendedActions: Array.from(g.recommendedActions).slice(0, 2),
              ownerHint:          g.ownerHint,
            })),
        };
      }
    }
  }

  // ── 8. Derive pilot status ────────────────────────────────────────────────
  const pilotStatus = derivePilotStatus(!!latestBatch, uef, !!ki, dp?.status ?? null);

  const tcEnc = encodeURIComponent(tenantCode);
  const rpEnc = encodeURIComponent(reportingPeriod);

  return NextResponse.json({
    ok: true,
    tenant: {
      tenantCode:  t.tenant_code  as string,
      companyName: t.company_name as string,
    },
    reportingPeriod,
    pilotStatus,
    workforce: {
      totalWorkers: (wb?.total_workers as number | null) ?? null,
    },
    latestBatch: latestBatch ? {
      sourceName: latestBatch.source_name as string | null,
      status:     latestBatch.batch_status as string,
      rowCount:   latestBatch.row_count   as number,
      createdAt:  latestBatch.created_at  as string,
    } : null,
    uef,
    scoring: ki ? {
      koraIndex:                ki.kora_index_value                    as number,
      confidenceScore:          cs01,
      safeguard:                ki.safeguard_status                    as string,
      activationRate:           actRow?.activation_rate                as number | null,
      meaningfulActivationRate: actRow?.meaningful_activation_rate     as number | null,
      calibrationStatus:        ki.calibration_status                  as string,
      methodologyVersionId:     ki.methodology_version_id              as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      componentCount:           ((ki.components as any[]) ?? []).length,
    } : null,
    pillarDistribution,
    bti,
    reportingAlignment,
    reportingReadiness,
    decisionPack: dp ? {
      status:     dp.status     as string,
      createdAt:  dp.created_at as string,
      previewUrl: `/api/admin/decision-pack/preview?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
      pdfUrl:     `/api/admin/decision-pack/pdf?tenantCode=${tcEnc}&reportingPeriod=${rpEnc}`,
    } : null,
  });
}
