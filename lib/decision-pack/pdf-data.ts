// lib/decision-pack/pdf-data.ts
//
// ── CANONICAL DECISION PACK DOMAIN BUILDER (CC-013 / D-B) ───────────────────────
//
// D-B resolved: lib/decision-pack/* is the canonical KORA Decision Pack
// implementation. Within it, responsibilities are already cleanly separated
// by file — this is a documentation of that existing seam, not a new one:
//
//   pdf-data.ts (this file)      — DOMAIN BUILDER: owns retrieval of canonical
//                                   persisted KORA results and assembly of the
//                                   Decision Pack content model (PdfData).
//   html-template.ts             — HTML RENDERER: pure function of PdfData,
//                                   zero DB access, zero Supabase imports.
//   pdf-runtime.ts                — PDF RUNTIME: HTML -> PDF export only.
//
// This file never recomputes KORA Index, Confidence, or BTI — every number in
// PdfData is read directly from already-persisted analytics.kora_index_result
// (joined confidence_result/activation_result) and analytics.bti_result rows,
// the same tables lib/live/persistence.ts writes. Evidence-gap/area
// aggregation (B18/B19) IS legitimately owned here as local derivation over
// already-approved uef_record rows — not a competing source of truth for
// KORA Index/Confidence/BTI, and not extracted into a separate service per
// CC-013's own instruction not to create new abstractions for their own sake.
//
// services/report-factory/ReportFactoryService.ts (admin metadata/status/
// comparison, synthetic-backed today) and services/report-generator/
// ReportGeneratorService.ts (zero production callers) are explicitly NOT
// canonical — see lib/architecture/registry.ts for their recorded status.
//
// Reads persisted scoring results from Supabase for any tenant — NO scoring recalculation.
// Uses service_role server-side only (never exposed to client).
// isLiveData = true for all non-OP-001 tenants (OP-001 is synthetic demo only).

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { computeExecutiveIntelligence } from '@/services/executive-intelligence/ExecutiveIntelligenceService';
import { getNormativeMappingLight, type NormativeMappingLight } from '@/lib/normative-mapping/normative-mapping-light';

export interface PdfComponent {
  code: string;
  label: string;
  value: number;       // 0–1
  weight: number;      // effective weight in KORA Index
  macroblock: string | null;
  external: boolean;
}

export interface PdfMacroblock {
  code: string;
  label: string;
  weight: number;      // macroblock weight (e.g. 0.25)
  score: number;       // 0–100
}

export interface PdfData {
  meta: {
    tenantCode: string;
    companyName: string;
    companyLogoBase64?: string;
    reportingPeriod: string;
    generatedAt: string;
    decisionPackVersionId: string;
    decisionPackId: string;
    decisionPackStatus: string;
    isLiveData: boolean;           // true = from real company data, false = synthetic/demo
    notCertification: true;
    methodologyNote: string;       // "KORA KORA Foundation Light — pre-empirical calibration"
  };
  koraIndex: {
    value: number;
    safeguardStatus: string;
    confidenceScore: number;           // 0–1
    activationRate: number;            // 0–1
    meaningfulActivationRate: number;  // 0–1
    calibrationStatus: string;
    methodologyVersionId: string;
    isCurrent: boolean;
    createdAt: string;
    componentCount: number;
  };
  // v1.0: 10 diagnostic components and 4 macroblocks from persisted kora_index_result
  components: PdfComponent[] | null;
  macroblocks: PdfMacroblock[] | null;
  pillarDistribution: {
    LIFE:       number;
    GROWTH:     number;
    CONNECTION: number;
    IMPACT:     number;
    LEGACY:     number;
  } | null;
  bti: {
    totalPeopleWelfareBudget: number;
    deepActivationSpend:      number;
    economicReliefSpend:      number;
    blockedComplianceSpend:   number;
    activationDebtEur:        number;
    btiScore:                 number;
    costPerImpactUnit:        number | null;
    budgetEvidenceQuality:    number;     // 0–1
  } | null;
  // B12 — enrichment trace: derived from approved uef_record for this tenant+period.
  // Lineage: tenant_id + reporting_period (approved_for_scoring = true only).
  // No individual records, no PII, no operator identity.
  enrichment: {
    totalUefRecords:     number;
    approvedUefRecords:  number;
    enrichedRecords:     number;     // payload.b11_enriched = true
    needsEnrichmentOpen: number;     // approved records still needing enrichment
    budgetClassBreakdown: {
      deepActivation:    { count: number; amount: number };
      economicRelief:    { count: number; amount: number };
      complianceBlocked: { count: number; amount: number };
      unknown:           { count: number; amount: number };
    };
    evidenceLevelBreakdown: { L0: number; L1: number; L2: number; L3: number; L4: number };
    averageFinancialConfidence: number | null;
    manualEnrichmentCount: number;
    remainingWarnings: string[];
  } | null;
  // B18 — reporting alignment summary from approved UEF records (no compliance claim).
  // Aggregated server-side — no individual records, no PII.
  reportingAlignment: {
    totalMappedInitiatives: number;
    areas: Array<{
      code:   string;
      label:  string;
      count:  number;
      strong: number;
      medium: number;
      weak:   number;
    }>;
    caveat: string;
  } | null;
  // B19 — evidence gap readiness summary — aggregated, no individual records, no PII.
  // readiness depends on evidence quality, not area strength.
  // report_ready ≠ CSRD compliant.
  reportingReadiness: {
    totalAreas:       number;
    reportReady:      number;
    usableWithCaveat: number;
    needsEvidence:    number;
    notReady:         number;
    topEvidenceGaps:  Array<{
      areaCode:           string;
      areaLabel:          string;
      readiness:          string;
      missingEvidence:    string[];
      recommendedActions: string[];
      ownerHint:          string;
    }>;
    caveat: string;
  } | null;
  // B62-B: Impact Units™ aggregate summary — safe for company-level display.
  // Never includes raw factor traces (server-side only).
  iuSummary: {
    totalRecords:          number;
    computedRecords:       number;
    blockedRecords:        number;
    limitedRecords:        number;
    reviewRequiredRecords: number;
    totalImpactUnits:      number;
    impactUnitsByPillar:   { LIFE: number; GROWTH: number; CONNECTION: number; IMPACT: number; LEGACY: number };
    recordsWithoutIu:      number;
    averageCq:             number;
    averageEv:             number;
    methodologyVersion:    string;
    calibrationStatus:     string;
  } | null;
  // B63-B: PIB Aggregation Summary — Stage 11 mandatory intermediate layer (AG-01).
  // Aggregate-safe: no individual worker data, no PIB snapshots, no workerPseudonymId.
  // estimationBasis='aggregate_estimate' in KORA Foundation Light.
  pibAggregation: {
    period:                string;
    workforceCount:        number;
    activatedWorkers:      number;
    meaningfulWorkers:     number;
    estimatedAR:           number;
    estimatedMAR:          number;
    totalIU:               number;
    avgEstimatedPIB:       number;
    pillarTotals:          { LIFE: number; GROWTH: number; CONNECTION: number; IMPACT: number; LEGACY: number };
    pillarShares:          { LIFE: number; GROWTH: number; CONNECTION: number; IMPACT: number; LEGACY: number };
    wbEstimate:            number | null;
    pibSnapshotsAvailable: boolean;
    estimationBasis:       string;
    estimationNote:        string;
    calibrationStatus:     string;
    methodologyVersion:    string;
  } | null;
  auditSummary: Array<{
    action: string;
    resourceType: string | null;
    createdAt: string;
  }>;
  // B77-B: Executive Intelligence Layer™ — board-readable synthesis of all signals.
  // Computed server-side from available PdfData. notKoraIndexComponent: true.
  executiveBrief: {
    organizationStatus: string;
    primaryConstraint:  string;
    wasteSignal:        string;
    primaryAction:      string;
    confidenceNote:     string;
  } | null;
  // B138-B: Normative Mapping Light — static framework-level mapping.
  // Indicative and non-certificative. Populated from the static versioned mapping file.
  // Does not constitute ESG compliance, audit, assurance, or certification of any kind.
  normativeMappingLight: NormativeMappingLight;
  // B79-B: KORA Contribution™ companion indicator summary.
  // Not persisted in KORA Foundation Light — always null until Contribution pipeline is live.
  // notKoraIndexComponent: true — companion indicator, never part of KORA Index computation.
  contributionSummary: {
    contributionScore:       number;
    contributionLevel:       string;
    totalContributionIU:     number;
    initiativeCount:         number;
    ecosystemPartnerCount:   number;
    pillarSplit:             { IMPACT: number; CONNECTION: number; LEGACY: number } | null;
    evidenceDistribution:    { L0: number; L1: number; L2: number; L3: number; L4: number } | null;
  } | null;
}

export async function fetchPdfData(
  tenantCode: string,
  reportingPeriod: string,
): Promise<PdfData | null> {
  const db = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: tenant } = await db.schema('analytics').from('tenant')
    .select('id,company_name').eq('tenant_code', tenantCode).maybeSingle();
  if (!tenant) return null;

  const { data: ki } = await db.schema('analytics').from('kora_index_result')
    .select('*, confidence_result:confidence_result_id(*), activation_result:activation_result_id(*)')
    .eq('tenant_id', (tenant as { id: string }).id)
    .eq('reporting_period', reportingPeriod)
    .eq('is_current', true)
    .maybeSingle();
  if (!ki) return null;

  const { data: dp } = await db.schema('analytics').from('decision_pack_version')
    .select('id,version_id,status,bti_result_id')
    .eq('tenant_id', (tenant as { id: string }).id)
    .eq('reporting_period', reportingPeriod)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: auditEvents } = await db.schema('audit').from('audit_log')
    .select('action,resource_type,created_at')
    .eq('tenant_id', (tenant as { id: string }).id)
    .order('created_at', { ascending: false })
    .limit(10);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actRow = (ki as any).activation_result as {
    activation_rate?: number;
    meaningful_activation_rate?: number;
    pillar_distribution?: Record<string, number> | null;
  } | null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confRow = (ki as any).confidence_result as {
    confidence_score?: number;
  } | null;

  // Pillar distribution — from activation_result.pillar_distribution (Record<PillarCode, number>)
  const rawPillar = actRow?.pillar_distribution;
  const pillarDistribution: PdfData['pillarDistribution'] = rawPillar
    ? {
        LIFE:       Number((rawPillar as Record<string, unknown>)['LIFE']       ?? 0),
        GROWTH:     Number((rawPillar as Record<string, unknown>)['GROWTH']     ?? 0),
        CONNECTION: Number((rawPillar as Record<string, unknown>)['CONNECTION'] ?? 0),
        IMPACT:     Number((rawPillar as Record<string, unknown>)['IMPACT']     ?? 0),
        LEGACY:     Number((rawPillar as Record<string, unknown>)['LEGACY']     ?? 0),
      }
    : null;

  // BTI — separate query via decision_pack_version.bti_result_id.
  // kora_index_result does NOT have bti_result_id — never join BTI from there.
  const btiResultId = (dp as { bti_result_id?: string | null } | null)?.bti_result_id ?? null;

  let rawBtiRow: {
    total_people_welfare_budget?: number;
    deep_activation_spend?: number;
    economic_relief_spend?: number;
    blocked_compliance_spend?: number;
    activation_debt_eur?: number;
    bti_score?: number;
    cost_per_impact_unit?: number | null;
    budget_evidence_quality?: number;
  } | null = null;

  if (btiResultId) {
    const { data: btiData, error: btiErr } = await db
      .schema('analytics')
      .from('bti_result')
      .select('total_people_welfare_budget, deep_activation_spend, economic_relief_spend, blocked_compliance_spend, activation_debt_eur, bti_score, cost_per_impact_unit, budget_evidence_quality')
      .eq('id', btiResultId)
      .maybeSingle();
    if (btiErr) {
      console.error('[fetchPdfData] bti_result fetch failed:', btiErr.message);
      // bti stays null — PDF renders without Financial Governance data
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rawBtiRow = btiData as any;
    }
  }

  const bti: PdfData['bti'] = rawBtiRow
    ? {
        totalPeopleWelfareBudget: rawBtiRow.total_people_welfare_budget ?? 0,
        deepActivationSpend:      rawBtiRow.deep_activation_spend ?? 0,
        economicReliefSpend:      rawBtiRow.economic_relief_spend ?? 0,
        blockedComplianceSpend:   rawBtiRow.blocked_compliance_spend ?? 0,
        activationDebtEur:        rawBtiRow.activation_debt_eur ?? 0,
        btiScore:                 rawBtiRow.bti_score ?? 0,
        costPerImpactUnit:        rawBtiRow.cost_per_impact_unit ?? null,
        budgetEvidenceQuality:    rawBtiRow.budget_evidence_quality ?? 0,
      }
    : null;

  // ── B12 Enrichment summary — approved UEF records for this tenant+period ──────
  // Lineage: tenant_id + reporting_period, approved_for_scoring = true.
  // All aggregation is server-side JS — no individual records surface in PdfData.
  // No operator email, no enrichment_notes, no raw payload rows.
  let enrichment: PdfData['enrichment'] = null;
  {
    const { data: uefRows, error: uefErr } = await db
      .schema('analytics')
      .from('uef_record')
      .select('review_status, approved_for_scoring, data_completeness_score, payload')
      .eq('tenant_id', (tenant as { id: string }).id)
      .eq('reporting_period', reportingPeriod);

    if (uefErr) {
      console.error('[fetchPdfData] uef_record fetch failed:', uefErr.message);
    } else if (uefRows && uefRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allRows = uefRows as any[];
      const approvedRows = allRows.filter((r) => r.approved_for_scoring === true);
      const totalUefRecords    = allRows.length;
      const approvedUefRecords = approvedRows.length;

      const enrichedRecords = approvedRows.filter((r) => {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        return Boolean(p['b11_enriched']);
      }).length;

      const needsEnrichmentOpen = approvedRows.filter((r) => {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        return Boolean(p['needs_enrichment']);
      }).length;

      const manualEnrichmentCount = approvedRows.filter((r) => {
        const p = (r.payload ?? {}) as Record<string, unknown>;
        const codes = Array.isArray(p['reason_codes']) ? p['reason_codes'] as string[] : [];
        return codes.some((c: string) => c.startsWith('manual_enrichment:'));
      }).length;

      const budgetClassBreakdown = {
        deepActivation:    { count: 0, amount: 0 },
        economicRelief:    { count: 0, amount: 0 },
        complianceBlocked: { count: 0, amount: 0 },
        unknown:           { count: 0, amount: 0 },
      };
      const evidenceLevelBreakdown = { L0: 0, L1: 0, L2: 0, L3: 0, L4: 0 };
      const fcValues: number[] = [];

      for (const row of approvedRows) {
        const p = (row.payload ?? {}) as Record<string, unknown>;
        const cls = String(p['budget_class'] ?? 'unknown');
        const amt = p['budget_amount'] != null ? Number(p['budget_amount']) : 0;

        if (cls === 'deep_activation')     { budgetClassBreakdown.deepActivation.count++;    budgetClassBreakdown.deepActivation.amount    += amt; }
        else if (cls === 'economic_relief')    { budgetClassBreakdown.economicRelief.count++;    budgetClassBreakdown.economicRelief.amount    += amt; }
        else if (cls === 'compliance_blocked') { budgetClassBreakdown.complianceBlocked.count++; budgetClassBreakdown.complianceBlocked.amount += amt; }
        else                                   { budgetClassBreakdown.unknown.count++;           budgetClassBreakdown.unknown.amount           += amt; }

        const lvl = String(p['evidence_level'] ?? 'L0');
        if (lvl === 'L4') evidenceLevelBreakdown.L4++;
        else if (lvl === 'L3') evidenceLevelBreakdown.L3++;
        else if (lvl === 'L2') evidenceLevelBreakdown.L2++;
        else if (lvl === 'L1') evidenceLevelBreakdown.L1++;
        else evidenceLevelBreakdown.L0++;

        const fc = p['financial_confidence'];
        if (typeof fc === 'number') fcValues.push(fc);
      }

      const averageFinancialConfidence = fcValues.length > 0
        ? Math.round((fcValues.reduce((s, v) => s + v, 0) / fcValues.length) * 100) / 100
        : null;

      const remainingWarnings: string[] = [];
      if (needsEnrichmentOpen > 0)
        remainingWarnings.push(`${needsEnrichmentOpen} iniziative richiedono ancora enrichment budget/evidenza prima dell'interpretazione finanziaria definitiva.`);
      if (budgetClassBreakdown.unknown.count > 0)
        remainingWarnings.push(`${budgetClassBreakdown.unknown.count} record con budget_class non classificato — esclusi dal calcolo BTI.`);
      if (averageFinancialConfidence !== null && averageFinancialConfidence < 0.50)
        remainingWarnings.push('Confidence finanziaria media sotto soglia operativa (< 0.50) — interpretazione direzionale.');

      enrichment = {
        totalUefRecords,
        approvedUefRecords,
        enrichedRecords,
        needsEnrichmentOpen,
        budgetClassBreakdown,
        evidenceLevelBreakdown,
        averageFinancialConfidence,
        manualEnrichmentCount,
        remainingWarnings,
      };
    }
  }

  // ── B18+B19: Reporting alignment + evidence gap readiness ────────────────────
  // Single query — both B18 (area summary) and B19 (readiness summary) computed from
  // the same approved UEF records. No individual records, no PII, aggregated only.
  let reportingAlignment:  PdfData['reportingAlignment']  = null;
  let reportingReadiness:  PdfData['reportingReadiness']  = null;
  {
    const { data: raRows, error: raErr } = await db
      .schema('analytics')
      .from('uef_record')
      .select('payload, approved_for_scoring')
      .eq('tenant_id', (tenant as { id: string }).id)
      .eq('reporting_period', reportingPeriod)
      .eq('approved_for_scoring', true);

    if (raErr) {
      console.error('[fetchPdfData] reporting_alignment+readiness fetch failed:', raErr.message);
    } else if (raRows && raRows.length > 0) {
      // ── B18: area summary ──────────────────────────────────────────────────
      type AreaSummary = { code: string; label: string; count: number; strong: number; medium: number; weak: number };
      const areaMap = new Map<string, AreaSummary>();
      let mappedCount = 0;

      // ── B19: readiness aggregation per area ────────────────────────────────
      // readiness_rank: lower = more conservative (worst-case per area across records)
      const READINESS_RANK: Record<string, number> = {
        not_ready: 0, needs_evidence: 1, usable_with_caveat: 2, report_ready: 3,
      };
      type GapSummary = {
        areaCode: string; areaLabel: string;
        readiness: string; readinessRank: number;
        missingEvidence: Set<string>; recommendedActions: Set<string>;
        ownerHint: string; count: number;
      };
      const gapMap = new Map<string, GapSummary>();

      for (const row of raRows as Array<{ payload: unknown }>) {
        const pl = (row.payload ?? {}) as Record<string, unknown>;

        // B18 — reporting_alignment
        const ra = pl['reporting_alignment'] as {
          areas?: Array<{ code: string; label: string; strength?: string }>;
        } | null | undefined;
        if (ra && Array.isArray(ra.areas) && ra.areas.length > 0) {
          mappedCount++;
          for (const area of ra.areas) {
            if (!area.code) continue;
            const existing: AreaSummary = areaMap.get(area.code) ?? {
              code: area.code, label: area.label ?? area.code,
              count: 0, strong: 0, medium: 0, weak: 0,
            };
            existing.count++;
            if      (area.strength === 'strong') existing.strong++;
            else if (area.strength === 'medium') existing.medium++;
            else                                 existing.weak++;
            areaMap.set(area.code, existing);
          }
        }

        // B19 — evidence_gaps
        const gaps = pl['evidence_gaps'] as Array<{
          areaCode: string; areaLabel: string;
          readiness: string; missingEvidence?: string[];
          recommendedActions?: string[]; ownerHint?: string;
        }> | null | undefined;
        if (!Array.isArray(gaps) || gaps.length === 0) continue;

        for (const gap of gaps) {
          if (!gap.areaCode) continue;
          const incomingRank = READINESS_RANK[gap.readiness] ?? 1;
          const existing = gapMap.get(gap.areaCode);
          if (!existing) {
            gapMap.set(gap.areaCode, {
              areaCode: gap.areaCode, areaLabel: gap.areaLabel ?? gap.areaCode,
              readiness: gap.readiness, readinessRank: incomingRank,
              missingEvidence:    new Set(gap.missingEvidence ?? []),
              recommendedActions: new Set(gap.recommendedActions ?? []),
              ownerHint: gap.ownerHint ?? 'Unknown',
              count: 1,
            });
          } else {
            // Most conservative readiness wins
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

      // ── B18 output ────────────────────────────────────────────────────────
      if (areaMap.size > 0) {
        reportingAlignment = {
          totalMappedInitiatives: mappedCount,
          areas: Array.from(areaMap.values()).sort((a, b) => b.count - a.count),
          caveat: 'KORA does not certify CSRD/ESRS compliance. This section maps initiatives to possible reporting support areas only.',
        };
      }

      // ── B19 output ────────────────────────────────────────────────────────
      if (gapMap.size > 0) {
        let reportReady = 0, usableWithCaveat = 0, needsEvidence = 0, notReady = 0;
        for (const g of gapMap.values()) {
          if      (g.readiness === 'report_ready')      reportReady++;
          else if (g.readiness === 'usable_with_caveat') usableWithCaveat++;
          else if (g.readiness === 'needs_evidence')     needsEvidence++;
          else                                           notReady++;
        }

        // Top 5 areas by count, prioritising needs_evidence (most actionable)
        const sortedGaps = Array.from(gapMap.values())
          .sort((a, b) => a.readinessRank - b.readinessRank || b.count - a.count)
          .slice(0, 5);

        reportingReadiness = {
          totalAreas:       gapMap.size,
          reportReady,
          usableWithCaveat,
          needsEvidence,
          notReady,
          topEvidenceGaps: sortedGaps.map(g => ({
            areaCode:           g.areaCode,
            areaLabel:          g.areaLabel,
            readiness:          g.readiness,
            missingEvidence:    Array.from(g.missingEvidence).slice(0, 4),
            recommendedActions: Array.from(g.recommendedActions).slice(0, 3),
            ownerHint:          g.ownerHint,
          })),
          caveat: 'KORA identifica i gap di evidenza per supportare la rendicontazione. Readiness ≠ compliance CSRD/ESRS. Non costituisce assurance o certificazione.',
        };
      }
    }
  }

  // ── B62-B: IU summary — aggregate from analytics.impact_unit ───────────────────
  // Aggregate only: never surfaces raw factor traces.
  // Keyed by tenant_id + reporting_period (same batch scope as enrichment).
  let iuSummary: PdfData['iuSummary'] = null;
  {
    const { data: iuRows, error: iuErr } = await (db as any)
      .schema('analytics')
      .from('impact_unit')
      .select('computed, exclusion_reason, impact_units_total, life_iu, growth_iu, connection_iu, impact_iu, legacy_iu, cq, ev, methodology_version, calibration_status')
      .eq('tenant_id', (tenant as { id: string }).id)
      .eq('reporting_period', reportingPeriod);

    if (iuErr) {
      console.error('[fetchPdfData] impact_unit fetch failed:', iuErr.message);
    } else if (iuRows && iuRows.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = iuRows as any[];
      const computedRows  = rows.filter((r) => Boolean(r.computed));
      const blockedRows   = rows.filter((r) => !r.computed && String(r.exclusion_reason ?? '').startsWith('Blocked'));
      const limitedRows   = rows.filter((r) => !r.computed && String(r.exclusion_reason ?? '').includes('Economic Relief'));
      const reviewRows    = rows.filter((r) => !r.computed && String(r.exclusion_reason ?? '').includes('Review'));

      const totalIU = rows.reduce((s: number, r: any) => s + (Number(r.impact_units_total) || 0), 0);
      const avg = (arr: number[]) => arr.length === 0 ? 0 : +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(3);

      iuSummary = {
        totalRecords:          rows.length,
        computedRecords:       computedRows.length,
        blockedRecords:        blockedRows.length,
        limitedRecords:        limitedRows.length,
        reviewRequiredRecords: reviewRows.length,
        totalImpactUnits:      +totalIU.toFixed(4),
        impactUnitsByPillar:   {
          LIFE:       +rows.reduce((s: number, r: any) => s + (Number(r.life_iu)       || 0), 0).toFixed(4),
          GROWTH:     +rows.reduce((s: number, r: any) => s + (Number(r.growth_iu)     || 0), 0).toFixed(4),
          CONNECTION: +rows.reduce((s: number, r: any) => s + (Number(r.connection_iu) || 0), 0).toFixed(4),
          IMPACT:     +rows.reduce((s: number, r: any) => s + (Number(r.impact_iu)     || 0), 0).toFixed(4),
          LEGACY:     +rows.reduce((s: number, r: any) => s + (Number(r.legacy_iu)     || 0), 0).toFixed(4),
        },
        recordsWithoutIu:   rows.length - computedRows.length,
        averageCq:          avg(rows.map((r: any) => Number(r.cq) || 0)),
        averageEv:          avg(rows.map((r: any) => Number(r.ev) || 0)),
        methodologyVersion: rows[0].methodology_version ?? 'KORA-METHOD-v1.0',
        calibrationStatus:  rows[0].calibration_status  ?? 'pre_empirical_calibration',
      };
    }
  }

  // Normalize confidence: DB may store 0–1 or 0–100 depending on pipeline version.
  const rawConf = confRow?.confidence_score ?? 0;
  const confidence01 = rawConf > 1 ? rawConf / 100 : rawConf;

  // v1.0: extract persisted components and macroblocks from kora_index_result JSONB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawComponents = ((ki as any).components ?? []) as Array<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMacroblocks = ((ki as any).macroblocks ?? []) as Array<Record<string, unknown>>;

  const components: PdfComponent[] | null = rawComponents.length > 0
    ? rawComponents.map(c => ({
        code:       String(c['code'] ?? ''),
        label:      String(c['label'] ?? c['code'] ?? ''),
        value:      Number(c['value'] ?? 0),
        weight:     Number(c['weight'] ?? 0),
        macroblock: c['macroblock'] != null ? String(c['macroblock']) : null,
        external:   Boolean(c['external']),
      }))
    : null;

  const macroblocks: PdfMacroblock[] | null = rawMacroblocks.length > 0
    ? rawMacroblocks.map(m => ({
        code:   String(m['code'] ?? ''),
        label:  String(m['label'] ?? m['code'] ?? ''),
        weight: Number(m['weight'] ?? 0),
        score:  Number(m['score'] ?? 0),
      }))
    : null;

  return {
    meta: {
      tenantCode,
      companyName: (tenant as { id: string; company_name?: string | null }).company_name
        ?? `${tenantCode} Organization`,
      reportingPeriod,
      generatedAt: new Date().toISOString(),
      decisionPackVersionId: (dp as { version_id?: string } | null)?.version_id ?? 'N/A',
      decisionPackId: (dp as { id?: string } | null)?.id ?? 'N/A',
      decisionPackStatus: (dp as { status?: string } | null)?.status ?? 'draft',
      // isLiveData: true when built from real Supabase data (not a synthetic demo fixture).
      // tenantCode 'OP-001' is the synthetic demo operator; all others are live pilot tenants.
      isLiveData: tenantCode !== 'OP-001',
      notCertification: true,
      methodologyNote: 'KORA KORA Foundation Light — pre-empirical calibration. Output diagnostico pilota. Non certificato, non regulatory-grade.',
    },
    components,
    macroblocks,
    pillarDistribution,
    bti,
    enrichment,
    iuSummary,
    // B63-B: PIB Aggregation not persisted server-side in KORA Foundation Light.
    // Set to null — the pipeline computes it in-memory only for now.
    // Post-Gate 2: persist CompanyPIBAggregation to analytics.pib_result table.
    pibAggregation: null,
    reportingAlignment,
    reportingReadiness,
    koraIndex: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      value: (ki as any).kora_index_value ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      safeguardStatus: (ki as any).safeguard_status ?? 'UNKNOWN',
      confidenceScore: confidence01,
      activationRate: actRow?.activation_rate ?? 0,
      meaningfulActivationRate: actRow?.meaningful_activation_rate ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calibrationStatus: (ki as any).calibration_status ?? 'pre_empirical_calibration',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      methodologyVersionId: (ki as any).methodology_version_id ?? 'KORA Index v1.0',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      isCurrent: (ki as any).is_current ?? true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (ki as any).created_at ?? '',
      componentCount: rawComponents.length,
    },
    auditSummary: (auditEvents ?? []).map(e => ({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      action: (e as any).action as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resourceType: (e as any).resource_type as string | null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      createdAt: (e as any).created_at as string,
    })),
    // B77-B: Executive Intelligence Layer™ — computed from available PdfData signals.
    // Uses simplified inputs (no EquityAccess / LifeDiversity — not in PdfData scope).
    // notKoraIndexComponent: true — synthesis display only.
    // B138-B: Normative Mapping Light — static versioned mapping.
    // Pure static assignment — no DB query, always available.
    normativeMappingLight: getNormativeMappingLight(),
    // B79-B: KORA Contribution™ — not persisted in KORA Foundation Light.
    // Will be populated post-Contribution pipeline implementation.
    contributionSummary: null,
    executiveBrief: (() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kiVal    = (ki as any).kora_index_value ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sf       = ((ki as any).safeguard_status ?? 'FLAGGED') as 'CLEAR' | 'WARNING' | 'FLAGGED';
      const cs       = confidence01;
      const ar       = actRow?.activation_rate ?? 0;
      const mar      = actRow?.meaningful_activation_rate ?? 0;
      const ecrShare = bti ? (bti.economicReliefSpend / Math.max(bti.totalPeopleWelfareBudget, 1)) : null;
      const limitedSh = enrichment
        ? (enrichment.budgetClassBreakdown.economicRelief.count / Math.max(enrichment.totalUefRecords, 1))
        : null;
      const avgEv    = iuSummary?.averageEv ?? null;
      const weakShare = avgEv !== null ? Math.max(0, Math.min(1, 1 - avgEv / 0.65)) : null;
      const evidenceRisk = weakShare !== null && weakShare > 0.40 ? 'alta' as const : weakShare !== null && weakShare > 0.25 ? 'media' as const : 'bassa' as const;
      const brief = computeExecutiveIntelligence({
        koraIndexValue:           kiVal,
        safeguardStatus:          sf,
        confidenceScore:          cs,
        activationRate:           ar,
        meaningfulActivationRate: mar,
        macroblocks:              (macroblocks ?? []).map((m) => ({ code: m.code as 'REACH' | 'QUALITY' | 'EQUITY' | 'BTI', label: m.label, weight: m.weight, score: m.score, component_codes: [] })),
        equityAccess:             null,
        evidenceReliability:      avgEv !== null ? { evidenceRiskLevel: evidenceRisk, evidenceLevelDistribution: { weakShare: weakShare ?? 0, acceptableShare: 0, strongShare: 0, primaryTier: 'weak' as const }, dataReliabilityValue: cs, verificationRate: avgEv, weakEvidenceInitiativeCount: 0, upgradeOpportunities: [], strongestEvidenceAreas: [], advisorNarrative: '', recommendations: [], methodologyStatus: 'pre_empirical_calibration' as const, notKoraIndexComponent: true as const } : null,
        lifeDiversity:            null,
        limitedShare:             limitedSh,
        economicReliefShare:      ecrShare,
      });
      return {
        organizationStatus: brief.organizationStatus,
        primaryConstraint:  brief.primaryConstraint,
        wasteSignal:        brief.wasteSignal,
        primaryAction:      brief.primaryAction,
        confidenceNote:     brief.confidenceNote,
      };
    })(),
  };
}
