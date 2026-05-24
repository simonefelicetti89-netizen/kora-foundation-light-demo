import type {
  BudgetToHumanImpactRecord,
  BudgetToHumanImpactRecommendation,
  ScenarioId,
  PillarCode,
  KoraRole,
  MacroblockCode,
} from '@/lib/types';
import { BTI_DOCTRINE } from '@/lib/constants/kora';
import btiRaw from '@/data/synthetic/budget-to-human-impact.json';

// ── Role gating ────────────────────────────────────────────────────────────────
const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'COMPANY_ADMIN',
  'COMPANY_VIEWER',
]);

// ── Seed shape (superset of BudgetToHumanImpactRecord) ─────────────────────────
interface SeedBTIRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  informational_only: true;
  currency: string;
  disclaimer: string;
  total_people_welfare_budget: number;
  economic_relief_spend: number;
  deep_activation_spend: number;
  blocked_excluded_attempts: number;
  unused_budget: number;
  economic_relief_share: number;
  deep_activation_share: number;
  cost_per_activated_worker: number;
  cost_per_deep_activated_worker: number;
  cost_per_impact_unit: number;
  activation_debt_eur: number;
  activation_debt_description_it: string;
  reallocation_opportunity_eur: number;
  reallocation_opportunity_description_it: string;
  equity_of_spend: number;
  pillar_investment_balance: number;
  bti_score: number;
  spend_by_pillar: Record<string, number>;
  deep_activation_by_pillar: Record<string, number>;
  recommendations: SeedBTIRecommendation[];
  // Non-budget-mediated activation: structural policies generate IUs with no direct cost.
  // cost_per_impact_unit applies ONLY to budget_mediated IUs — excluded from denominator.
  non_budget_mediated_iu_count?: number;
  structural_policy_iu_count?: number;
  non_budget_mediated_activation_note?: string;
  synthetic_demo_data: true;
  generated_for: string;
  not_live_data: true;
}

interface SeedBTIRecommendation {
  priority: 'alta' | 'media' | 'bassa';
  action_it: string;
  expected_signal_it: string;
  budget_note?: string;
  target_macroblock?: string;
}

// ── Output interfaces ──────────────────────────────────────────────────────────

export interface BTIAccessResult {
  allowed: boolean;
  reason?: string;
  record?: BudgetToHumanImpactRecord;
}

export interface EconomicReliefSummary {
  economic_relief_spend: number;
  economic_relief_share: number;
  deep_activation_spend: number;
  deep_activation_share: number;
  total_used_budget: number;
  currency: string;
  /** Canonical BTI doctrine — never paraphrase. */
  interpretation_it: string;
}

export interface ActivationDebtSummary {
  activation_debt_eur: number;
  activation_debt_description_it: string;
  currency: string;
}

export interface ReallocationOpportunitySummary {
  reallocation_opportunity_eur: number;
  reallocation_opportunity_description_it: string;
  currency: string;
}

export interface CostEfficiencyMetrics {
  cost_per_activated_worker: number;
  cost_per_deep_activated_worker: number;
  cost_per_impact_unit: number;
  currency: string;
  /**
   * An increase in cost_per_deep_activated_worker does not imply inefficiency.
   * It may reflect expanded access to deeper, more structured programs for a
   * larger cohort. Read together with cost_per_impact_unit: if cost_per_impact_unit
   * decreases, overall activation efficiency has improved.
   */
  cost_per_deep_worker_note_it: string;
}

export interface SpendBreakdown {
  spend_by_pillar: Partial<Record<PillarCode, number>>;
  deep_activation_by_pillar: Partial<Record<PillarCode, number>>;
  equity_of_spend: number;
  pillar_investment_balance: number;
  currency: string;
}

export interface IBudgetToHumanImpactService {
  canAccess(role: KoraRole): boolean;
  getBudgetToHumanImpactByScenario(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): BTIAccessResult;
  getEconomicReliefSummary(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): EconomicReliefSummary | null;
  getActivationDebtSummary(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): ActivationDebtSummary | null;
  getReallocationOpportunity(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): ReallocationOpportunitySummary | null;
  getCostEfficiencyMetrics(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): CostEfficiencyMetrics | null;
  getSpendBreakdown(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): SpendBreakdown | null;
  getRecommendations(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
    targetMacroblock?: MacroblockCode,
  ): BudgetToHumanImpactRecommendation[];
}

// ── Service ────────────────────────────────────────────────────────────────────

export class BudgetToHumanImpactService implements IBudgetToHumanImpactService {
  private readonly records = (btiRaw as { data: SeedBTIRecord[] }).data;

  canAccess(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  private findSeed(companyId: string, scenarioId: ScenarioId): SeedBTIRecord | null {
    return (
      this.records.find(
        (r) => r.company_id === companyId && r.scenario_id === scenarioId,
      ) ?? null
    );
  }

  private mapRecord(seed: SeedBTIRecord): BudgetToHumanImpactRecord {
    const recommendations: BudgetToHumanImpactRecommendation[] = seed.recommendations.map((r) => ({
      priority: r.priority,
      action_it: r.action_it,
      expected_signal_it: r.expected_signal_it,
      budget_note: r.budget_note,
      target_macroblock: r.target_macroblock as MacroblockCode | undefined,
    }));

    return {
      id: seed.id,
      company_id: seed.company_id,
      scenario_id: seed.scenario_id as ScenarioId,
      reporting_period: seed.reporting_period,
      informational_only: true,
      currency: seed.currency,
      disclaimer: seed.disclaimer,
      total_people_welfare_budget: seed.total_people_welfare_budget,
      economic_relief_spend: seed.economic_relief_spend,
      deep_activation_spend: seed.deep_activation_spend,
      blocked_excluded_attempts: seed.blocked_excluded_attempts,
      unused_budget: seed.unused_budget,
      economic_relief_share: seed.economic_relief_share,
      deep_activation_share: seed.deep_activation_share,
      cost_per_activated_worker: seed.cost_per_activated_worker,
      cost_per_deep_activated_worker: seed.cost_per_deep_activated_worker,
      cost_per_impact_unit: seed.cost_per_impact_unit,
      activation_debt_eur: seed.activation_debt_eur,
      activation_debt_description_it: seed.activation_debt_description_it,
      reallocation_opportunity_eur: seed.reallocation_opportunity_eur,
      reallocation_opportunity_description_it: seed.reallocation_opportunity_description_it,
      equity_of_spend: seed.equity_of_spend,
      pillar_investment_balance: seed.pillar_investment_balance,
      bti_score: seed.bti_score,
      spend_by_pillar: seed.spend_by_pillar as Partial<Record<PillarCode, number>>,
      deep_activation_by_pillar: seed.deep_activation_by_pillar as Partial<Record<PillarCode, number>>,
      recommendations,
      non_budget_mediated_iu_count: seed.non_budget_mediated_iu_count,
      structural_policy_iu_count: seed.structural_policy_iu_count,
      non_budget_mediated_activation_note: seed.non_budget_mediated_activation_note,
      synthetic_demo_data: true,
    };
  }

  getBudgetToHumanImpactByScenario(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): BTIAccessResult {
    if (!this.canAccess(role)) {
      return {
        allowed: false,
        reason: `Role ${role} non ha accesso ai dati Budget-to-Human-Impact. Richiede COMPANY_ADMIN, COMPANY_VIEWER, o KORA_ADMIN.`,
      };
    }
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return { allowed: true };
    return { allowed: true, record: this.mapRecord(seed) };
  }

  getEconomicReliefSummary(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): EconomicReliefSummary | null {
    if (!this.canAccess(role)) return null;
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return null;
    return {
      economic_relief_spend: seed.economic_relief_spend,
      economic_relief_share: seed.economic_relief_share,
      deep_activation_spend: seed.deep_activation_spend,
      deep_activation_share: seed.deep_activation_share,
      total_used_budget: seed.economic_relief_spend + seed.deep_activation_spend,
      currency: seed.currency,
      interpretation_it: BTI_DOCTRINE.limited_reframe,
    };
  }

  getActivationDebtSummary(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): ActivationDebtSummary | null {
    if (!this.canAccess(role)) return null;
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return null;
    return {
      activation_debt_eur: seed.activation_debt_eur,
      activation_debt_description_it: seed.activation_debt_description_it,
      currency: seed.currency,
    };
  }

  getReallocationOpportunity(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): ReallocationOpportunitySummary | null {
    if (!this.canAccess(role)) return null;
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return null;
    return {
      reallocation_opportunity_eur: seed.reallocation_opportunity_eur,
      reallocation_opportunity_description_it: seed.reallocation_opportunity_description_it,
      currency: seed.currency,
    };
  }

  getCostEfficiencyMetrics(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): CostEfficiencyMetrics | null {
    if (!this.canAccess(role)) return null;
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return null;
    return {
      cost_per_activated_worker: seed.cost_per_activated_worker,
      cost_per_deep_activated_worker: seed.cost_per_deep_activated_worker,
      cost_per_impact_unit: seed.cost_per_impact_unit,
      currency: seed.currency,
      cost_per_deep_worker_note_it:
        'Un aumento del costo per lavoratore profondamente attivato non implica necessariamente inefficienza — può riflettere un\'espansione dell\'accesso a programmi più profondi e strutturati per un numero maggiore di lavoratori. Leggere sempre insieme al cost_per_impact_unit: se quest\'ultimo diminuisce, l\'efficienza complessiva dell\'attivazione verificata è migliorata.',
    };
  }

  getSpendBreakdown(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): SpendBreakdown | null {
    if (!this.canAccess(role)) return null;
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return null;
    return {
      spend_by_pillar: seed.spend_by_pillar as Partial<Record<PillarCode, number>>,
      deep_activation_by_pillar: seed.deep_activation_by_pillar as Partial<Record<PillarCode, number>>,
      equity_of_spend: seed.equity_of_spend,
      pillar_investment_balance: seed.pillar_investment_balance,
      currency: seed.currency,
    };
  }

  getRecommendations(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
    targetMacroblock?: MacroblockCode,
  ): BudgetToHumanImpactRecommendation[] {
    if (!this.canAccess(role)) return [];
    const seed = this.findSeed(companyId, scenarioId);
    if (!seed) return [];
    const recs: BudgetToHumanImpactRecommendation[] = seed.recommendations.map((r) => ({
      priority: r.priority,
      action_it: r.action_it,
      expected_signal_it: r.expected_signal_it,
      budget_note: r.budget_note,
      target_macroblock: r.target_macroblock as MacroblockCode | undefined,
    }));
    if (!targetMacroblock) return recs;
    return recs.filter((r) => r.target_macroblock === targetMacroblock);
  }
}

export const budgetToHumanImpactService = new BudgetToHumanImpactService();
