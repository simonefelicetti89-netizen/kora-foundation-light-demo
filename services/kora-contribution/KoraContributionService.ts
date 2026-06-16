import type { ScenarioId } from '@/lib/types';
import { getMethodologyVersion, getCalibrationStatus } from '@/lib/methodology-config/v0.1';
import contributionOutputsRaw from '@/data/synthetic/kora-contribution-outputs.json';
import collectiveInitiativesRaw from '@/data/synthetic/collective-initiatives.json';
import {
  isContributionEligibleEvent,
  CONTRIBUTION_ACTION_FAMILIES,
  CONTRIBUTION_PILLARS,
} from '@/lib/kora-engine/contribution-family-detector';

// KORA Contribution is a companion indicator — never a KORA Index component (CLAUDE.md §12.7)

interface SeedContributionRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  methodology_version_id: string;
  calibration_status: string;
  is_kora_index_component: false;
  companion_label: string;
  contribution_score: number;
  contribution_level: string;
  collective_initiatives_count: number;
  active_initiatives_count: number;
  planning_initiatives_count: number;
  completed_initiatives_count: number;
  verified_initiative_participations: number;
  cross_company_initiatives_count: number;
  ecosystem_partners_active: number;
  referenced_collective_initiative_ids: string[];
  contribution_explanation: string;
  limitations_text: string;
}

interface SeedInitiativeRecord {
  id: string;
  scenario_id: string;
  name: string;
  initiative_type: string;
  pillar: string;
  pillar_secondary: string | null;
  territory: string;
  companies_involved: string[];
  partner_id: string | null;
  partner_name: string | null;
  status: string;
  aggregate_participation_count: number;
  aggregate_target_participants: number;
  aggregate_completed_participants: number;
  privacy_threshold_met: boolean;
  verification_status: string;
  advisor_validation_status: string;
  kora_contribution_relevant: boolean;
  evidence_status: string;
  start_date: string;
  end_date: string;
  description: string;
  employer_privacy_notice: string;
  not_kora_index_component: true;
}

export interface CollectiveInitiative {
  id: string;
  name: string;
  initiative_type: string;
  pillar: string;
  pillar_secondary: string | null;
  territory: string;
  companies_involved: string[];
  partner_name: string | null;
  status: string;
  aggregate_participation_count: number;
  aggregate_target_participants: number;
  verification_status: string;
  advisor_validation_status: string;
  kora_contribution_relevant: boolean;
  start_date: string;
  end_date: string;
  description: string;
  employer_privacy_notice: string;
}

export interface KoraContributionSummary {
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  contribution_score: number;
  contribution_level: string;
  collective_initiatives_count: number;
  active_initiatives_count: number;
  completed_initiatives_count: number;
  verified_initiative_participations: number;
  cross_company_initiatives_count: number;
  ecosystem_partners_active: number;
  contribution_explanation: string;
  limitations_text: string;
  /** Always false — KORA Contribution is never a KORA Index component */
  is_kora_index_component: false;
  companion_label: string;
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo_data: true;
}

// Legacy output type — preserved for backwards compat with existing consumers
export interface KoraContributionOutput {
  company_id: string;
  scenario_id: ScenarioId;
  contribution_score: number;
  collective_initiatives: Array<{ id: string; name: string; participation_count: number }>;
  ecosystem_reach: number;
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo_data: true;
}

// ── Pipeline input contract ───────────────────────────────────────────────────
// Structural subset of ImpactUnitComputationResult — accepts real IU results from
// run-kora-pipeline without importing the IU service types directly.

export interface ContributionPipelineInput {
  action_family: string;
  primary_pillar: string | null;
  impact_units_total: number;
  evidence_verification_ev: number;
  computed: boolean;
  event_nature?: string;
}

// ── ContributionSummary — pipeline-computed companion indicator output ────────
// Replaces seed-only approach. Supports both pipeline and seed-derived paths.

export interface ContributionSummary {
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  contributionScore: number;         // 0–100, provisional_companion_indicator
  contributionLevel: 'minimal' | 'emerging' | 'active' | 'advanced';
  initiativesCount: number;
  ecosystemPartners: number;
  territorialBreadth: number;        // 0.0–1.0 share of territorial events
  contributionFamilies: string[];    // which of the 3 contribution families are present
  evidenceDistribution: {
    verified: number;                // count
    partial: number;
    self_declared: number;
  };
  totalContributionIU: number;
  pillarBreakdown: Partial<Record<string, number>>;  // IMPACT/CONNECTION/LEGACY → IU total
  methodologyStatus: 'pre_empirical_calibration';
  /** Always true — KORA Contribution is never a KORA Index component */
  notKoraIndexComponent: true;
  noRanking: true;
  noRewards: true;
  noLeaderboard: true;
  dataSource: 'pipeline' | 'seed_derived';
  synthetic_demo_data: true;
  // Legacy narrative fields (from seed, optional)
  contribution_explanation?: string;
  limitations_text?: string;
  companion_label?: string;
}

// ── Provisional score formula — clearly labeled non-empirical ────────────────
// Five simple bounded components — no empirical calibration claimed.
// Component weights are directional scaffolding, not validated.

function computeProvisionalScore(inputs: ContributionPipelineInput[]): {
  score: number;
  level: ContributionSummary['contributionLevel'];
  familiesPresent: string[];
  territorialBreadth: number;
  evidenceDistribution: ContributionSummary['evidenceDistribution'];
  totalContributionIU: number;
  pillarBreakdown: Partial<Record<string, number>>;
  initiativesCount: number;
} {
  const contributions = inputs.filter((r) =>
    isContributionEligibleEvent({
      action_family: r.action_family,
      event_nature:  r.event_nature,
      pillar:        r.primary_pillar ?? undefined,
    }) && r.computed && r.impact_units_total > 0
  );

  const count    = contributions.length;
  const totalIU  = contributions.reduce((s, r) => s + r.impact_units_total, 0);
  const families = [...new Set(
    contributions
      .map((r) => r.action_family)
      .filter((f) => CONTRIBUTION_ACTION_FAMILIES.includes(f as never)),
  )];
  const pillars = [...new Set(
    contributions
      .map((r) => r.primary_pillar)
      .filter((p): p is string => p !== null && CONTRIBUTION_PILLARS.includes(p as never)),
  )];
  const territorialCount = contributions.filter(
    (r) => r.action_family === 'territorial_impact',
  ).length;

  // Evidence distribution
  const evDist = { verified: 0, partial: 0, self_declared: 0 };
  for (const r of contributions) {
    if (r.evidence_verification_ev >= 0.85)      evDist.verified++;
    else if (r.evidence_verification_ev >= 0.70) evDist.partial++;
    else                                          evDist.self_declared++;
  }

  // Pillar breakdown (IU by pillar)
  const pillarBreakdown: Partial<Record<string, number>> = {};
  for (const p of pillars) {
    pillarBreakdown[p] = contributions
      .filter((r) => r.primary_pillar === p)
      .reduce((s, r) => s + r.impact_units_total, 0);
  }

  const familyBreadth   = families.length / 3;
  const initiativesNorm = Math.min(count, 10) / 10;
  const evidenceQ       = count > 0 ? evDist.verified / count : 0;
  const territorial     = territorialCount > 0 ? 1 : 0;
  const ecosystem       = families.length >= 2 ? 1 : 0;

  const score = Math.round(
    familyBreadth * 30 +
    initiativesNorm * 20 +
    evidenceQ * 25 +
    territorial * 15 +
    ecosystem * 10,
  );

  const level: ContributionSummary['contributionLevel'] =
    score >= 66 ? 'advanced' :
    score >= 36 ? 'active'   :
    score >= 16 ? 'emerging' : 'minimal';

  return {
    score,
    level,
    familiesPresent:      families,
    territorialBreadth:   count > 0 ? territorialCount / count : 0,
    evidenceDistribution: evDist,
    totalContributionIU:  +totalIU.toFixed(3),
    pillarBreakdown,
    initiativesCount:     count,
  };
}

// ── Seed-to-pipeline mapper ──────────────────────────────────────────────────
// Converts collective initiative seed records into ContributionPipelineInput[]
// for use in getSummaryV2 (demo path). IU values are estimates for display only.

const INITIATIVE_TYPE_TO_FAMILY: Record<string, string> = {
  cross_company_volunteering:    'territorial_impact',
  partner_collective_event:      'territorial_impact',
  collective_community_event:    'inclusion_and_connection',
  internal_mentoring_collective: 'future_and_legacy',
  collective_upskilling:         'professional_growth',  // NOT contribution-eligible
};

const VERIFICATION_TO_EV: Record<string, number> = {
  verified:    0.90,
  partial:     0.75,
  pending:     0.60,
  not_started: 0.50,
};

const PILLAR_TO_BC: Record<string, number> = {
  IMPACT:     1.00,
  CONNECTION: 1.00,
  LEGACY:     1.10,
  GROWTH:     1.10,
  LIFE:       1.20,
};

export interface IKoraContributionService {
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput;
  getContributionSummary(companyId: string, scenarioId: ScenarioId): KoraContributionSummary | null;
  getContributionScore(companyId: string, scenarioId: ScenarioId): number;
  getCollectiveInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[];
  getContributionInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[];
  /** Pipeline-computed path: accepts IU results from run-kora-pipeline, returns ContributionSummary */
  computeFromPipelineResult(
    companyId: string,
    scenarioId: ScenarioId,
    iuResults: ContributionPipelineInput[],
  ): ContributionSummary;
  /** Demo/seed path: synthesizes ContributionSummary from collective-initiatives seed data */
  getSummaryV2(companyId: string, scenarioId: ScenarioId): ContributionSummary;
}

export class KoraContributionService implements IKoraContributionService {
  private readonly contributions = (
    contributionOutputsRaw as { data: SeedContributionRecord[] }
  ).data;
  private readonly initiatives = (
    collectiveInitiativesRaw as { data: SeedInitiativeRecord[] }
  ).data;

  private findContribution(
    companyId: string,
    scenarioId: ScenarioId,
  ): SeedContributionRecord | null {
    return (
      this.contributions.find(
        (r) => r.company_id === companyId && r.scenario_id === scenarioId,
      ) ?? null
    );
  }

  /** Returns initiatives visible for the given scenario (scenario match or "all") */
  private filterInitiativesByScenario(scenarioId: ScenarioId): SeedInitiativeRecord[] {
    return this.initiatives.filter(
      (r) => r.scenario_id === scenarioId || r.scenario_id === 'all',
    );
  }

  private mapInitiative(r: SeedInitiativeRecord): CollectiveInitiative {
    return {
      id: r.id,
      name: r.name,
      initiative_type: r.initiative_type,
      pillar: r.pillar,
      pillar_secondary: r.pillar_secondary,
      territory: r.territory,
      companies_involved: r.companies_involved,
      partner_name: r.partner_name,
      status: r.status,
      aggregate_participation_count: r.aggregate_participation_count,
      aggregate_target_participants: r.aggregate_target_participants,
      verification_status: r.verification_status,
      advisor_validation_status: r.advisor_validation_status,
      kora_contribution_relevant: r.kora_contribution_relevant,
      start_date: r.start_date,
      end_date: r.end_date,
      description: r.description,
      employer_privacy_notice: r.employer_privacy_notice,
    };
  }

  /** Legacy method — preserved for backwards compatibility */
  getContribution(companyId: string, scenarioId: ScenarioId): KoraContributionOutput {
    const rec = this.findContribution(companyId, scenarioId);
    const initiatives = this.filterInitiativesByScenario(scenarioId)
      .filter((r) => r.kora_contribution_relevant)
      .map((r) => ({ id: r.id, name: r.name, participation_count: r.aggregate_participation_count }));

    return {
      company_id: companyId,
      scenario_id: scenarioId,
      contribution_score: rec?.contribution_score ?? 0,
      collective_initiatives: initiatives,
      ecosystem_reach: rec?.ecosystem_partners_active ?? 0,
      methodology_version_id: getMethodologyVersion(),
      calibration_status: getCalibrationStatus(),
      synthetic_demo_data: true,
    };
  }

  getContributionSummary(
    companyId: string,
    scenarioId: ScenarioId,
  ): KoraContributionSummary | null {
    const rec = this.findContribution(companyId, scenarioId);
    if (!rec) return null;
    return {
      company_id: rec.company_id,
      scenario_id: scenarioId,
      reporting_period: rec.reporting_period,
      contribution_score: rec.contribution_score,
      contribution_level: rec.contribution_level,
      collective_initiatives_count: rec.collective_initiatives_count,
      active_initiatives_count: rec.active_initiatives_count,
      completed_initiatives_count: rec.completed_initiatives_count,
      verified_initiative_participations: rec.verified_initiative_participations,
      cross_company_initiatives_count: rec.cross_company_initiatives_count,
      ecosystem_partners_active: rec.ecosystem_partners_active,
      contribution_explanation: rec.contribution_explanation,
      limitations_text: rec.limitations_text,
      is_kora_index_component: false,
      companion_label: rec.companion_label,
      methodology_version_id: rec.methodology_version_id,
      calibration_status: rec.calibration_status,
      synthetic_demo_data: true,
    };
  }

  getContributionScore(companyId: string, scenarioId: ScenarioId): number {
    return this.findContribution(companyId, scenarioId)?.contribution_score ?? 0;
  }

  /** All collective initiatives visible for this scenario (used by C-03, C-05) */
  getCollectiveInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[] {
    void companyId; // initiatives are not yet company-scoped in the seed
    return this.filterInitiativesByScenario(scenarioId).map(this.mapInitiative);
  }

  /** Only initiatives that are contribution-relevant (active in KORA Contribution) */
  getContributionInitiatives(companyId: string, scenarioId: ScenarioId): CollectiveInitiative[] {
    void companyId;
    return this.filterInitiativesByScenario(scenarioId)
      .filter((r) => r.kora_contribution_relevant)
      .map(this.mapInitiative);
  }

  /**
   * Pipeline-computed path: accepts IU results from run-kora-pipeline.
   * Merges pipeline data with seed narrative fields (explanation, limitations).
   * is_kora_index_component is always false — enforced here, not at call site.
   */
  computeFromPipelineResult(
    companyId: string,
    scenarioId: ScenarioId,
    iuResults: ContributionPipelineInput[],
  ): ContributionSummary {
    const seedRec  = this.findContribution(companyId, scenarioId);
    const computed = computeProvisionalScore(iuResults);

    return {
      company_id:             companyId,
      scenario_id:            scenarioId,
      reporting_period:       seedRec?.reporting_period ?? scenarioId,
      contributionScore:      computed.score,
      contributionLevel:      computed.level,
      initiativesCount:       computed.initiativesCount,
      ecosystemPartners:      seedRec?.ecosystem_partners_active ?? 0,
      territorialBreadth:     computed.territorialBreadth,
      contributionFamilies:   computed.familiesPresent,
      evidenceDistribution:   computed.evidenceDistribution,
      totalContributionIU:    computed.totalContributionIU,
      pillarBreakdown:        computed.pillarBreakdown,
      methodologyStatus:      'pre_empirical_calibration',
      notKoraIndexComponent:  true,
      noRanking:              true,
      noRewards:              true,
      noLeaderboard:          true,
      dataSource:             'pipeline',
      synthetic_demo_data:    true,
      contribution_explanation: seedRec?.contribution_explanation,
      limitations_text:         seedRec?.limitations_text,
      companion_label:          seedRec?.companion_label,
    };
  }

  /**
   * Demo/seed path: synthesizes ContributionSummary from collective-initiatives seed data.
   * Builds ContributionPipelineInput[] from initiative participation counts and evidence quality,
   * then runs them through computeProvisionalScore — same computation path as pipeline mode.
   */
  getSummaryV2(companyId: string, scenarioId: ScenarioId): ContributionSummary {
    const seedRec   = this.findContribution(companyId, scenarioId);
    const contribIs = this.filterInitiativesByScenario(scenarioId)
      .filter((r) => r.kora_contribution_relevant);

    // Synthesize one ContributionPipelineInput per initiative.
    // IU estimate: participation_count × NM(0.8) × BC(pillar) × EV(evidence) — demo approximation.
    // 'computed' = true only if evidence_status allows (not 'not_started' or 'na').
    const pipelineInputs: ContributionPipelineInput[] = contribIs.map((init) => {
      const actionFamily = INITIATIVE_TYPE_TO_FAMILY[init.initiative_type] ?? 'territorial_impact';
      const pillar       = init.pillar;
      const ev           = VERIFICATION_TO_EV[init.verification_status] ?? 0.60;
      const bc           = PILLAR_TO_BC[pillar] ?? 1.00;
      const nm           = 0.80;
      // IU total = participation_count × NM × BC × EV (simplified; CQ/CF/AGF omitted for demo)
      const iuEstimate   = +(init.aggregate_participation_count * nm * bc * ev * 0.10).toFixed(3);
      const isComputed   = init.status !== 'archived' && iuEstimate > 0;
      return {
        action_family:            actionFamily,
        primary_pillar:           pillar,
        impact_units_total:       isComputed ? iuEstimate : 0,
        evidence_verification_ev: ev,
        computed:                 isComputed,
        event_nature:             init.initiative_type === 'cross_company_volunteering'
                                    ? 'collective_initiative'
                                    : init.initiative_type === 'partner_collective_event'
                                      ? 'partner_service'
                                      : 'collective_initiative',
      };
    });

    const summary = this.computeFromPipelineResult(companyId, scenarioId, pipelineInputs);
    // Override ecosystemPartners from seed (richer source for demo)
    return {
      ...summary,
      ecosystemPartners: seedRec?.ecosystem_partners_active ?? summary.ecosystemPartners,
      dataSource:        'seed_derived',
    };
  }
}

export const koraContributionService = new KoraContributionService();

// ── B166: getContributionLive — lettura da DB per tenant production_ready ─────
//
// Distinto dal path sintetico (seed JSON). Legge da commons.contribution_event.
// Feature gate: production_ready check su analytics.tenant.
// Tenant Foundation Light (production_ready=false) → restituisce null.
// Chiamato da /api/company/contribution/live — usa getSupabaseServerClient (B163).
// KORA Contribution è companion indicator — NON componente KORA Index (CLAUDE.md §12.7).

import type { LiveContributionSummary } from '@/lib/commons/booking-types';

export async function getContributionLive(params: {
  db:             any;   // Supabase server client con JWT tenant
  tenantId:       string;
  period?:        string;
}): Promise<LiveContributionSummary | null> {
  const { db, tenantId, period } = params;

  // Feature gate: solo tenant production_ready
  const { data: tenant } = await (db as any)
    .schema('analytics')
    .from('tenant')
    .select('id, production_ready')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant || !(tenant as any).production_ready) {
    return null; // tenant non Pilot+ — il chiamante mostra la shell sintetica
  }

  // Fetch contribution_events per questo tenant nel periodo
  let query = (db as any)
    .schema('commons')
    .from('contribution_event')
    .select('role, contribution_kind, impact_weight, evidence_status, reporting_period')
    .eq('tenant_id', tenantId);

  if (period) query = query.eq('reporting_period', period);

  const { data: events, error } = await query.limit(500);

  if (error) {
    console.error('[getContributionLive] fetch error:', error.message);
    return null;
  }

  const rows = (events as Array<{
    role: string;
    contribution_kind: string;
    impact_weight: number;
    evidence_status: string;
    reporting_period: string;
  }> | null) ?? [];

  const reportingPeriod = period ?? (rows[0]?.reporting_period ?? '');

  const crossRows   = rows.filter((r) => r.contribution_kind === 'cross_company_participation');
  const externalRows = rows.filter((r) => r.contribution_kind === 'external_participants_event');
  const promoterRows = rows.filter((r) => r.role === 'promoter');
  const originRows   = rows.filter((r) => r.role === 'origin_employer');
  const verifiedRows = rows.filter((r) => r.evidence_status === 'verified');
  const selfDeclRows = rows.filter((r) => r.evidence_status === 'self_declared');

  const sum = (arr: typeof rows) => arr.reduce((s, r) => s + (r.impact_weight ?? 0), 0);

  return {
    tenant_id:                    tenantId,
    reporting_period:             reportingPeriod,
    is_kora_index_component:      false,
    total_events:                 rows.length,
    cross_company_participations: crossRows.length,
    external_participant_events:  externalRows.length,
    promoter_events:              promoterRows.length,
    origin_employer_events:       originRows.length,
    total_impact_weight:          +sum(rows).toFixed(4),
    verified_weight:              +sum(verifiedRows).toFixed(4),
    self_declared_weight:         +sum(selfDeclRows).toFixed(4),
    weight_cross_company:         +sum(crossRows).toFixed(4),
    weight_external_participants: +sum(externalRows).toFixed(4),
    data_source:                  'live_db',
    methodology_version_id:       getMethodologyVersion(),
    calibration_status:           'pre_empirical_calibration',
  };
}
