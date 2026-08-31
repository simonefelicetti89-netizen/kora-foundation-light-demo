import type { ScenarioId } from '@/lib/types';
import { getMethodologyVersion, getContributionConfig, getContributionConfigV2 } from '@/lib/methodology-config/v0.1';
import {
  isContributionEligibleEvent,
  CONTRIBUTION_ACTION_FAMILIES,
  CONTRIBUTION_PILLARS,
} from '@/lib/kora-engine/contribution-family-detector';
import { buildContributionPipelineInputs } from '@/lib/kora-contribution/contribution-pipeline-input';

// KORA Contribution is a companion indicator — never a KORA Index component (CLAUDE.md §12.7)

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
// Replaces seed-only approach. Supports both pipeline and DB-backed paths.

export interface ContributionSummary {
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  contributionScore: number;
  /** Always 'provisional_demo_only' — score is for Foundation Light demo only.
   *  Pilot+ live path uses ContributionPromoterView / ContributionOriginEmployerView (no score field). */
  scorePresentationMode: 'provisional_demo_only';
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
  dataSource: 'pipeline' | 'live_db';
  synthetic_demo_data?: boolean;
  // Legacy narrative fields (optional)
  contribution_explanation?: string;
  limitations_text?: string;
  companion_label?: string;
  /** Version B (v0.2) — active public presentation model */
  v2: ContributionV2Result;
}

// ── Version B (v0.2) output types ─────────────────────────────────────────────
// Public presentation: maturity band + confidence + component breakdown.
// No single 0–100 score as primary public output.
// is_kora_index_component is always false — enforced here, not at call site.

export type ContributionMaturityBand =
  | 'systemic'
  | 'active'
  | 'emerging'
  | 'nascent'
  | 'insufficient_signal';

export interface ContributionV2Components {
  activationDepth:       number;  // 0–1 normalized
  evidenceQuality:       number;  // 0–1 normalized (shrinkage-adjusted)
  ecosystemContribution: number;  // 0–1 normalized
  adoptionReach:         number;  // 0–1 normalized (concave)
  strategicBreadth:      number;  // 0–1 normalized
}

export interface ContributionV2Result {
  modelVersion:              'v0.2';
  publicPresentation:        'maturity_band_with_confidence';
  maturityBand:              ContributionMaturityBand;
  maturityBandLabel:         string;       // Italian UI label
  insufficientSignal:        boolean;
  confidence:                number;       // 0–1, non-additive, external to score
  confidenceLabel:           string;       // Bassa / Media / Alta
  components:                ContributionV2Components;
  internalScore:             number;       // 0–100 internal only — NOT primary output
  insights:                  string[];     // Italian narrative bullets
  aggregateSignals: {
    totalEligibleEvents:     number;
    ecosystemEventsCount:    number;
    totalIU:                 number;
  };
  isKoraIndexComponent:      false;
  preEmpiricalCalibration:   true;
  noWorkerRanking:           true;
  noIndividualScore:         true;
  noCompanyRanking:          true;
}

// ── Version B computation ─────────────────────────────────────────────────────
// Reads all weights/thresholds from config — none hardcoded.
// Available data from ContributionPipelineInput[]:
//   action_family, primary_pillar, impact_units_total, evidence_verification_ev, computed, event_nature
//
// PROTECTED METHODOLOGY — B-TRUTH Contribution port (2026-09-01): this function
// is byte-for-byte unchanged by the port. Only its INPUT construction changed
// (see lib/kora-contribution/contribution-pipeline-input.ts for the new
// DB-backed builder, replacing the retired synthetic-JSON builder previously
// inline in getSummaryV2()).

function computeContributionV2(inputs: ContributionPipelineInput[]): ContributionV2Result {
  const cfg = getContributionConfigV2();
  const w   = cfg.weights;
  const mb  = cfg.maturity_bands;
  const t   = cfg.thresholds;
  const cp  = cfg.confidence;

  const eligible = inputs.filter((r) =>
    isContributionEligibleEvent({
      action_family: r.action_family,
      event_nature:  r.event_nature,
      pillar:        r.primary_pillar ?? undefined,
    }) && r.computed && r.impact_units_total > 0
  );

  const count   = eligible.length;
  const totalIU = eligible.reduce((s, r) => s + r.impact_units_total, 0);

  // 1. Activation Depth (30%)
  // Concave function: rewards aggregate IU intensity, not linear count.
  // IU_reference from config — provisional, to calibrate with pilot data.
  const activationDepth = count === 0 ? 0 : Math.min(1, 1 - Math.exp(-totalIU / t.activation_depth_iu_reference));

  // 2. Evidence Quality (25%)
  // Shrinkage toward prior (0.5) — avoids extreme rates with low N.
  const verifiedCount = eligible.filter((r) => r.evidence_verification_ev >= 0.85).length;
  const evidenceQuality = (verifiedCount + t.evidence_shrinkage_k * t.evidence_shrinkage_prior)
                        / (count         + t.evidence_shrinkage_k);

  // 3. Ecosystem Contribution (20%)
  // Fraction of events with cross-company / partner / territorial signal.
  const ecosystemEvents = eligible.filter(
    (r) => r.event_nature && ['collective_initiative', 'partner_service', 'territorial_initiative'].includes(r.event_nature),
  );
  const ecosystemContribution = count === 0 ? 0 : ecosystemEvents.length / count;

  // 4. Adoption & Reach (15%)
  // Concave function on event count — avoids pure count inflation.
  const adoptionReach = count === 0 ? 0 : Math.min(1, 1 - Math.exp(-count / t.adoption_reach_event_reference));

  // 5. Strategic Breadth (10%)
  // Average of family diversity and pillar diversity — neither alone is sufficient.
  const families = [...new Set(eligible.map((r) => r.action_family).filter(Boolean))];
  const pillars  = [...new Set(eligible.map((r) => r.primary_pillar).filter((p): p is string => p !== null))];
  const familyDiv = Math.min(families.length / 3, 1);
  const pillarDiv = Math.min(pillars.length / 3, 1);
  const strategicBreadth = (familyDiv + pillarDiv) / 2;

  // Internal score (0–100) — NOT the primary public output.
  const internalScore = Math.round(
    activationDepth       * w.activation_depth       +
    evidenceQuality       * w.evidence_quality       +
    ecosystemContribution * w.ecosystem_contribution +
    adoptionReach         * w.adoption_reach         +
    strategicBreadth      * w.strategic_breadth,
  );

  // Confidence — separate, non-additive. Reflects signal sufficiency.
  const nFactor    = Math.min(1, count / cp.n_events_reference);
  const crossFlag  = ecosystemEvents.length > 0 ? 1 : 0.5;
  const confidence = +(
    nFactor         * cp.n_events_weight        +
    evidenceQuality * cp.evidence_quality_weight +
    crossFlag       * cp.ecosystem_signal_weight
  ).toFixed(3);

  // Insufficient signal check — show placeholder instead of band.
  const insufficientSignal = count < t.insufficient_signal_min_events || confidence < t.insufficient_signal_max_confidence;

  // Maturity band — derived from internal score.
  let maturityBand: ContributionMaturityBand;
  let maturityBandLabel: string;
  if (insufficientSignal) {
    maturityBand      = 'insufficient_signal';
    maturityBandLabel = 'Segnali aggregati insufficienti';
  } else if (internalScore >= mb.systemic) {
    maturityBand      = 'systemic';
    maturityBandLabel = 'Sistemica';
  } else if (internalScore >= mb.active) {
    maturityBand      = 'active';
    maturityBandLabel = 'Attiva';
  } else if (internalScore >= mb.emerging) {
    maturityBand      = 'emerging';
    maturityBandLabel = 'Emergente';
  } else {
    maturityBand      = 'nascent';
    maturityBandLabel = 'Nascente';
  }

  // Confidence label
  const confidenceLabel = confidence >= 0.70 ? 'Alta' : confidence >= 0.40 ? 'Media' : 'Bassa';

  // Italian insight bullets
  const insights: string[] = [];
  if (insufficientSignal) {
    insights.push('Segnali aggregati insufficienti per determinare la banda di maturità.');
    insights.push(`Sono disponibili ${count} event${count === 1 ? 'o' : 'i'} di contribuzione. Attivare iniziative collettive per aumentare i segnali.`);
  } else {
    if (activationDepth >= 0.6)      insights.push('Forte intensità di attivazione: le iniziative generano impatto verificabile.');
    else if (activationDepth >= 0.3) insights.push('Intensità di attivazione moderata. Aumentare la profondità di partecipazione per consolidare il segnale.');
    else                             insights.push('Intensità di attivazione ancora debole. Prioritizzare il completamento e la verifica delle iniziative.');

    if (ecosystemContribution >= 0.5) insights.push('Buona presenza di segnali cross-company, partner o territoriali nell\'ecosistema.');
    else if (ecosystemEvents.length > 0) insights.push('Segnali ecosistema presenti. Ampliare la partecipazione cross-company o territoriale per rafforzarli.');
    else                              insights.push('Nessun segnale cross-company o territoriale rilevato. Considerare iniziative aperte all\'ecosistema esterno.');

    if (verifiedCount === count && count > 0) insights.push('Evidenza completamente verificata — qualità del dato ottimale.');
    else if (verifiedCount > 0)               insights.push('Evidenza parzialmente verificata. Completare la validazione delle iniziative restanti.');
  }

  return {
    modelVersion:            'v0.2',
    publicPresentation:      'maturity_band_with_confidence',
    maturityBand,
    maturityBandLabel,
    insufficientSignal,
    confidence,
    confidenceLabel,
    components: { activationDepth, evidenceQuality, ecosystemContribution, adoptionReach, strategicBreadth },
    internalScore,
    insights,
    aggregateSignals: {
      totalEligibleEvents:  count,
      ecosystemEventsCount: ecosystemEvents.length,
      totalIU:              +totalIU.toFixed(3),
    },
    isKoraIndexComponent:     false,
    preEmpiricalCalibration:  true,
    noWorkerRanking:          true,
    noIndividualScore:        true,
    noCompanyRanking:         true,
  };
}

// ── Version A provisional score formula — LEGACY / FL internal fallback ───────
// Replaced by Version B (computeContributionV2) as the public model.
// Retained for backward compatibility with existing tests and consumers.
// Weights are read from methodology-config via getContributionConfig() — never hardcoded here.
// PROTECTED METHODOLOGY — unchanged by the B-TRUTH Contribution port.

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

  const cfg = getContributionConfig();
  const w   = cfg.weights;
  const lv  = cfg.levels;

  const familyBreadth   = families.length / 3;
  const initiativesNorm = Math.min(count, 10) / 10;
  const evidenceQ       = count > 0 ? evDist.verified / count : 0;
  const territorial     = territorialCount > 0 ? 1 : 0;
  const ecosystem       = families.length >= 2 ? 1 : 0;

  const score = Math.round(
    familyBreadth   * w.family_breadth   +
    initiativesNorm * w.initiatives_norm +
    evidenceQ       * w.evidence_quality +
    territorial     * w.territorial      +
    ecosystem       * w.ecosystem,
  );

  const level: ContributionSummary['contributionLevel'] =
    score >= lv.advanced ? 'advanced' :
    score >= lv.active   ? 'active'   :
    score >= lv.emerging ? 'emerging' : 'minimal';

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

export interface IKoraContributionService {
  /** Pipeline-computed path: accepts IU results from run-kora-pipeline, returns ContributionSummary */
  computeFromPipelineResult(
    companyId: string,
    scenarioId: ScenarioId,
    iuResults: ContributionPipelineInput[],
  ): ContributionSummary;
}

export class KoraContributionService implements IKoraContributionService {
  /**
   * Pipeline-computed path: accepts IU results from run-kora-pipeline (or,
   * as of the B-TRUTH Contribution port, from
   * lib/kora-contribution/contribution-pipeline-input.ts's DB-backed
   * builder). is_kora_index_component is always false — enforced here, not
   * at call site. seedRec (narrative fields) is always null now that the
   * synthetic seed lookup is retired — contribution_explanation/
   * limitations_text/companion_label are simply absent for a real tenant,
   * not fabricated.
   */
  computeFromPipelineResult(
    companyId: string,
    scenarioId: ScenarioId,
    iuResults: ContributionPipelineInput[],
  ): ContributionSummary {
    const computed = computeProvisionalScore(iuResults);
    const v2       = computeContributionV2(iuResults);

    return {
      company_id:             companyId,
      scenario_id:            scenarioId,
      reporting_period:       scenarioId,
      contributionScore:      computed.score,
      scorePresentationMode:  'provisional_demo_only',
      contributionLevel:      computed.level,
      initiativesCount:       computed.initiativesCount,
      ecosystemPartners:      0,
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
      // No synthetic_demo_data stamp here (B-TRUTH Contribution port,
      // 2026-09-01): computeFromPipelineResult's only real caller used to be
      // the retired synthetic getSummaryV2(); its only real caller now is
      // getContributionV2Live(), which is DB-backed. Provenance is honestly
      // caller-agnostic — this orchestrator no longer assumes synthetic input.
      v2,
    };
  }
}

export const koraContributionService = new KoraContributionService();

// ── B166/B167: funzioni live da DB per tenant production_ready ────────────────
//
// Tutte le funzioni sono gated su analytics.tenant.production_ready.
// Tenant Foundation Light → restituisce null (il chiamante mostra la shell sintetica).
// Pattern B163: usano getSupabaseServerClient, mai service-client.
// KORA Contribution è companion indicator — NON componente KORA Index (CLAUDE.md §12.7).
//
// ABILITAZIONE LIVE CONTRIBUTION PER TENANT PILOT:
//   Per attivare il path live (getContributionLive / getContributionPromoterView /
//   getContributionOriginEmployerView) per un tenant specifico, impostare:
//     UPDATE analytics.tenant SET production_ready = true WHERE id = '<tenant_id>';
//   Questa è una modifica DB — non è controllata da config o feature flag in codice.
//   Non abilitare globalmente per tutti i tenant Foundation Light.
//   contribution_event records sono già scritti correttamente da BookingService.markAttended().
//
// STATUS (2026-06-21): deferred — nessun tenant ha production_ready=true in DB.
//   Il dashboard aziendale mostra la shell sintetica PRE-PILOT PREVIEW per tutti i tenant FL.
//
// getContributionV2Live() below is the ONE exception to "gated on
// production_ready" in this section — see its own header comment.

import type { LiveContributionSummary } from '@/lib/commons/booking-types';
import type { ContributionPromoterView, ContributionOriginEmployerView } from '@/lib/commons/contribution-views';
import { buildPromoterNarrative, buildOriginEmployerNarrative } from '@/lib/commons/contribution-narrative';

// ── B-TRUTH Contribution protected port (2026-09-01) — DB-backed V2 preview ──
//
// Replaces KoraContributionService.getSummaryV2() (retired — synthesized
// ContributionPipelineInput[] from data/synthetic/collective-initiatives.json).
// Builds the same input contract from real commons.contribution_event +
// commons.post rows via lib/kora-contribution/contribution-pipeline-input.ts,
// then calls computeFromPipelineResult() — the exact same, unmodified
// methodology authority every other path already uses. No second
// implementation of computeContributionV2 exists.
//
// Deliberately NOT gated on production_ready (matches the retired
// getSummaryV2's own behavior, per tests/unit/worker-experience-consolidation
// .test.ts: "preview path does not gate on production_ready — always
// available for FL tenants"). This is a product-state distinction
// (pre-pilot preview vs. Pilot+ dashboard), not a tenant_kind distinction —
// app/company/contribution/page.tsx alone decides which view to render,
// based on the SAME production_ready flag for a LIVE or a DEMO-kind tenant.
// A tenant with zero real contribution_event rows correctly yields
// insufficientSignal=true — an honest empty state, not a synthetic fallback.

export async function getContributionV2Live(params: {
  db:       any;   // Supabase server client con JWT tenant
  tenantId: string;
  period?:  string;
}): Promise<ContributionSummary> {
  const { db, tenantId, period } = params;

  let query = (db as any)
    .schema('commons')
    .from('contribution_event')
    .select('source_post_id, contribution_kind, impact_weight, evidence_status, is_cross_company, is_kora_originated, is_kora_enabled, reporting_period')
    .eq('tenant_id', tenantId);

  if (period) query = query.eq('reporting_period', period);

  const { data: events, error } = await query.limit(500);

  if (error) {
    console.error('[getContributionV2Live] fetch error:', error.message);
    return koraContributionService.computeFromPipelineResult(tenantId, 'S1', buildContributionPipelineInputs([], new Map()));
  }

  const rows = (events as Array<{
    source_post_id:     string;
    contribution_kind:  string;
    impact_weight:      number;
    evidence_status:    string;
    is_cross_company:   boolean;
    is_kora_originated: boolean;
    is_kora_enabled:    boolean;
    reporting_period:   string;
  }> | null) ?? [];

  const distinctPostIds = [...new Set(rows.map((r) => r.source_post_id))];
  const pillarByPostId = new Map<string, string | null>();
  if (distinctPostIds.length > 0) {
    const { data: posts } = await (db as any)
      .schema('commons')
      .from('post')
      .select('id, pillar')
      .in('id', distinctPostIds);
    for (const p of (posts as Array<{ id: string; pillar: string | null }> | null) ?? []) {
      pillarByPostId.set(p.id, p.pillar);
    }
  }

  const pipelineInputs = buildContributionPipelineInputs(rows, pillarByPostId);

  const reportingPeriod = period ?? (rows[0]?.reporting_period ?? '');
  const summary = koraContributionService.computeFromPipelineResult(tenantId, 'S1', pipelineInputs);

  return { ...summary, reporting_period: reportingPeriod, dataSource: 'live_db' };
}

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

// ── B167: getContributionPromoterView ─────────────────────────────────────────
// Sezione "Le tue iniziative aperte all'ecosistema" — role='promoter'.
// Aggrega contribution_event del tenant in role=promoter.
// Join a commons.post per il pillar (necessario per pillar_breakdown).
// Anonimato: nessun legame worker↔iniziativa — solo aggregati per pillar/tipo.

export async function getContributionPromoterView(params: {
  db:       any;
  tenantId: string;
  period?:  string;
}): Promise<ContributionPromoterView | null> {
  const { db, tenantId, period } = params;

  // Feature gate (riusa stesso check di getContributionLive)
  const { data: tenant } = await (db as any)
    .schema('analytics')
    .from('tenant')
    .select('id, production_ready')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant || !(tenant as any).production_ready) return null;

  // Legge contribution_event per role=promoter di questo tenant
  let evQuery = (db as any)
    .schema('commons')
    .from('contribution_event')
    .select('source_post_id, contribution_kind, impact_weight, evidence_status, reporting_period')
    .eq('tenant_id', tenantId)
    .eq('role', 'promoter');

  if (period) evQuery = evQuery.eq('reporting_period', period);

  const { data: events, error: evErr } = await evQuery.limit(500);
  if (evErr) {
    console.error('[getContributionPromoterView] events fetch error:', evErr.message);
    return null;
  }

  const rows = (events as Array<{
    source_post_id: string;
    contribution_kind: string;
    impact_weight: number;
    evidence_status: string;
    reporting_period: string;
  }> | null) ?? [];

  if (rows.length === 0) {
    const empty: ContributionPromoterView = {
      tenant_id:               tenantId,
      reporting_period:        period ?? '',
      distinct_initiatives:    0,
      participations_received: 0,
      external_outreach_events: 0,
      verified_weight:         0,
      self_declared_weight:    0,
      pillar_breakdown:        [],
      narrative:               buildPromoterNarrative({ distinct_initiatives: 0, participations_received: 0, external_outreach_events: 0, pillar_breakdown: [] }),
      data_source:             'live_db',
      methodology_version_id:  getMethodologyVersion(),
      calibration_status:      'pre_empirical_calibration',
    };
    return empty;
  }

  const reportingPeriod = period ?? (rows[0]?.reporting_period ?? '');
  const crossRows        = rows.filter((r) => r.contribution_kind === 'cross_company_participation');
  const externalRows     = rows.filter((r) => r.contribution_kind === 'external_participants_event');
  const verifiedRows     = rows.filter((r) => r.evidence_status === 'verified');
  const selfDeclRows     = rows.filter((r) => r.evidence_status === 'self_declared');

  const distinctPostIds = [...new Set(rows.map((r) => r.source_post_id))];

  // Fetch pillar per le post distinte (per pillar_breakdown)
  const { data: posts } = await (db as any)
    .schema('commons')
    .from('post')
    .select('id, pillar')
    .in('id', distinctPostIds);

  const postPillarMap: Record<string, string | null> = {};
  for (const p of (posts as Array<{ id: string; pillar: string | null }> | null) ?? []) {
    postPillarMap[p.id] = p.pillar;
  }

  // Pillar breakdown: aggregate weight per pillar
  const pillarWeights: Record<string, { count: number; weight: number }> = {};
  for (const row of rows) {
    const pillar = postPillarMap[row.source_post_id] ?? 'UNKNOWN';
    if (!pillarWeights[pillar]) pillarWeights[pillar] = { count: 0, weight: 0 };
    pillarWeights[pillar].count  += 1;
    pillarWeights[pillar].weight += row.impact_weight ?? 0;
  }
  const totalWeight = rows.reduce((s, r) => s + (r.impact_weight ?? 0), 0);
  const pillar_breakdown = Object.entries(pillarWeights).map(([pillar, { count, weight }]) => ({
    pillar,
    count,
    weight: +weight.toFixed(4),
    share_pct: totalWeight > 0 ? +((weight / totalWeight) * 100).toFixed(1) : 0,
  })).sort((a, b) => b.weight - a.weight);

  const view: ContributionPromoterView = {
    tenant_id:               tenantId,
    reporting_period:        reportingPeriod,
    distinct_initiatives:    distinctPostIds.length,
    participations_received: crossRows.length,
    external_outreach_events: externalRows.length,
    verified_weight:         +verifiedRows.reduce((s, r) => s + (r.impact_weight ?? 0), 0).toFixed(4),
    self_declared_weight:    +selfDeclRows.reduce((s, r) => s + (r.impact_weight ?? 0), 0).toFixed(4),
    pillar_breakdown,
    narrative:               [],
    data_source:             'live_db',
    methodology_version_id:  getMethodologyVersion(),
    calibration_status:      'pre_empirical_calibration',
  };
  view.narrative = buildPromoterNarrative(view);
  return view;
}

// ── B167: getContributionOriginEmployerView ───────────────────────────────────
// Sezione "I tuoi lavoratori nell'ecosistema" — role='origin_employer'.
// Aggrega contribution_event del tenant in role=origin_employer.
// Anonimato totale: nessun source_booking_id esposto, nessun legame worker↔iniziativa.
// Solo: count partecipazioni, count post distinte, count tenant promotori distinti.

export async function getContributionOriginEmployerView(params: {
  db:       any;
  tenantId: string;
  period?:  string;
}): Promise<ContributionOriginEmployerView | null> {
  const { db, tenantId, period } = params;

  const { data: tenant } = await (db as any)
    .schema('analytics')
    .from('tenant')
    .select('id, production_ready')
    .eq('id', tenantId)
    .maybeSingle();

  if (!tenant || !(tenant as any).production_ready) return null;

  // Legge contribution_event per role=origin_employer — NO source_booking_id nella select
  let evQuery = (db as any)
    .schema('commons')
    .from('contribution_event')
    .select('source_post_id, impact_weight, evidence_status, reporting_period')
    .eq('tenant_id', tenantId)
    .eq('role', 'origin_employer');

  if (period) evQuery = evQuery.eq('reporting_period', period);

  const { data: events, error: evErr } = await evQuery.limit(500);
  if (evErr) {
    console.error('[getContributionOriginEmployerView] events fetch error:', evErr.message);
    return null;
  }

  const rows = (events as Array<{
    source_post_id: string;
    impact_weight: number;
    evidence_status: string;
    reporting_period: string;
  }> | null) ?? [];

  if (rows.length === 0) {
    const empty: ContributionOriginEmployerView = {
      tenant_id:            tenantId,
      reporting_period:     period ?? '',
      participations_sent:  0,
      distinct_initiatives: 0,
      distinct_promoters:   0,
      total_weight:         0,
      pillar_breakdown:     [],
      narrative:            buildOriginEmployerNarrative({ participations_sent: 0, distinct_initiatives: 0, distinct_promoters: 0, pillar_breakdown: [] }),
      data_source:          'live_db',
      methodology_version_id: getMethodologyVersion(),
      calibration_status:   'pre_empirical_calibration',
    };
    return empty;
  }

  const reportingPeriod  = period ?? (rows[0]?.reporting_period ?? '');
  const distinctPostIds  = [...new Set(rows.map((r) => r.source_post_id))];

  // Fetch post distinte per pillar e tenant_id (promotore)
  const { data: posts } = await (db as any)
    .schema('commons')
    .from('post')
    .select('id, pillar, tenant_id')
    .in('id', distinctPostIds);

  const postMap: Record<string, { pillar: string | null; tenant_id: string }> = {};
  for (const p of (posts as Array<{ id: string; pillar: string | null; tenant_id: string }> | null) ?? []) {
    postMap[p.id] = { pillar: p.pillar, tenant_id: p.tenant_id };
  }

  const distinctPromoters = new Set(Object.values(postMap).map((p) => p.tenant_id));

  // Pillar breakdown aggregato per le post frequentate
  const pillarWeights: Record<string, { count: number; weight: number }> = {};
  for (const row of rows) {
    const pillar = postMap[row.source_post_id]?.pillar ?? 'UNKNOWN';
    if (!pillarWeights[pillar]) pillarWeights[pillar] = { count: 0, weight: 0 };
    pillarWeights[pillar].count  += 1;
    pillarWeights[pillar].weight += row.impact_weight ?? 0;
  }
  const totalWeight = rows.reduce((s, r) => s + (r.impact_weight ?? 0), 0);
  const pillar_breakdown = Object.entries(pillarWeights).map(([pillar, { count, weight }]) => ({
    pillar,
    count,
    weight: +weight.toFixed(4),
    share_pct: totalWeight > 0 ? +((weight / totalWeight) * 100).toFixed(1) : 0,
  })).sort((a, b) => b.weight - a.weight);

  const view: ContributionOriginEmployerView = {
    tenant_id:            tenantId,
    reporting_period:     reportingPeriod,
    participations_sent:  rows.length,
    distinct_initiatives: distinctPostIds.length,
    distinct_promoters:   distinctPromoters.size,
    total_weight:         +totalWeight.toFixed(4),
    pillar_breakdown,
    narrative:            [],
    data_source:          'live_db',
    methodology_version_id: getMethodologyVersion(),
    calibration_status:   'pre_empirical_calibration',
  };
  view.narrative = buildOriginEmployerNarrative(view);
  return view;
}
