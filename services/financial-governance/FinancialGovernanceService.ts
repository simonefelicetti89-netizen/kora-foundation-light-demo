import type { KoraRole, ScenarioId } from '@/lib/types';
import financialGovernanceRaw from '@/data/synthetic/financial-governance.json';

// Financial Governance is informational only — no payment execution, no KORA Index feed
const ALLOWED_ROLES: ReadonlySet<KoraRole> = new Set<KoraRole>([
  'KORA_ADMIN',
  'KORA_ANALYST',
  'FOUNDER_INTERNAL',
  'COMPANY_ADMIN',
  'COMPANY_FINANCE',
  'COMPANY_HR',
  'COMPANY_ESG',
]);

interface SeedPillarBudget {
  allocated: number;
  used: number;
  utilization_rate: number;
  programs: string[];
  economic_relief_included?: number;
}

interface SeedBTIIndicators {
  economic_relief_spend: number;
  deep_activation_spend: number;
  blocked_excluded_attempts: number;
  economic_relief_share: number;
  deep_activation_share: number;
  activation_debt_eur: number;
  activation_debt_description_it: string;
  reallocation_opportunity_eur: number;
  reallocation_opportunity_description_it: string;
  bti_score: number;
  bti_score_note: string;
}

interface SeedKoraBilling {
  subscription: number;
  setup: number;
  advisory: number;
  total: number;
  note: string;
}

interface SeedFinancialRecord {
  id: string;
  company_id: string;
  scenario_id: string;
  reporting_period: string;
  informational_only: true;
  no_payment_execution: true;
  no_fund_custody: true;
  disclaimer: string;
  budget_allocated_total: number;
  budget_used_total: number;
  budget_committed_total: number;
  budget_residual: number;
  budget_utilization_rate: number;
  cost_per_iu_indicator: number;
  cost_per_iu_note: string;
  currency: string;
  pillar_budget: Record<string, SeedPillarBudget>;
  pillar_budget_note?: string;
  bti_indicators?: SeedBTIIndicators;
  kora_billing: SeedKoraBilling;
  narrative: string;
}

export interface PillarBudgetLine {
  pillar: string;
  allocated: number;
  used: number;
  utilization_rate: number;
  programs: string[];
  economic_relief_included?: number;
}

export interface BTIIndicators {
  economic_relief_spend: number;
  deep_activation_spend: number;
  blocked_excluded_attempts: number;
  economic_relief_share: number;
  deep_activation_share: number;
  activation_debt_eur: number;
  activation_debt_description_it: string;
  reallocation_opportunity_eur: number;
  reallocation_opportunity_description_it: string;
  bti_score: number;
  bti_score_note: string;
  currency: string;
}

export interface FinancialGovernanceRecord {
  id: string;
  company_id: string;
  scenario_id: ScenarioId;
  reporting_period: string;
  informational_only: true;
  no_payment_execution: true;
  no_fund_custody: true;
  disclaimer: string;
  budget_allocated_total: number;
  budget_used_total: number;
  budget_committed_total: number;
  budget_residual: number;
  budget_utilization_rate: number;
  cost_per_iu_indicator: number;
  cost_per_iu_note: string;
  currency: string;
  pillar_budget: PillarBudgetLine[];
  pillar_budget_note?: string;
  bti_indicators?: BTIIndicators;
  kora_billing: SeedKoraBilling;
  narrative: string;
}

export interface FinancialGovernanceResult {
  allowed: boolean;
  reason?: string;
  record?: FinancialGovernanceRecord;
}

export interface BudgetSummary {
  allocated: number;
  used: number;
  committed: number;
  residual: number;
  utilization_rate: number;
  currency: string;
  disclaimer: string;
}

export interface IFinancialGovernanceService {
  canAccessFinancialGovernance(role: KoraRole): boolean;
  getFinancialGovernance(companyId: string, scenarioId: ScenarioId, role: KoraRole): FinancialGovernanceResult;
  getPillarBudget(companyId: string, scenarioId: ScenarioId, role: KoraRole): PillarBudgetLine[] | null;
  getBudgetSummary(companyId: string, scenarioId: ScenarioId, role: KoraRole): BudgetSummary | null;
  getBTIIndicators(companyId: string, scenarioId: ScenarioId, role: KoraRole): BTIIndicators | null;
}

export class FinancialGovernanceService implements IFinancialGovernanceService {
  private readonly records = (financialGovernanceRaw as { data: SeedFinancialRecord[] }).data;

  canAccessFinancialGovernance(role: KoraRole): boolean {
    return ALLOWED_ROLES.has(role);
  }

  private findRecord(companyId: string, scenarioId: ScenarioId): SeedFinancialRecord | null {
    return (
      this.records.find(
        (r) => r.company_id === companyId && r.scenario_id === scenarioId,
      ) ?? null
    );
  }

  private mapRecord(rec: SeedFinancialRecord): FinancialGovernanceRecord {
    const pillar_budget: PillarBudgetLine[] = Object.entries(rec.pillar_budget).map(
      ([pillar, data]) => ({
        pillar,
        allocated: data.allocated,
        used: data.used,
        utilization_rate: data.utilization_rate,
        programs: data.programs,
        ...(data.economic_relief_included !== undefined && {
          economic_relief_included: data.economic_relief_included,
        }),
      }),
    );

    const bti_indicators: BTIIndicators | undefined = rec.bti_indicators
      ? { ...rec.bti_indicators, currency: rec.currency }
      : undefined;

    return {
      id: rec.id,
      company_id: rec.company_id,
      scenario_id: rec.scenario_id as ScenarioId,
      reporting_period: rec.reporting_period,
      informational_only: true,
      no_payment_execution: true,
      no_fund_custody: true,
      disclaimer: rec.disclaimer,
      budget_allocated_total: rec.budget_allocated_total,
      budget_used_total: rec.budget_used_total,
      budget_committed_total: rec.budget_committed_total,
      budget_residual: rec.budget_residual,
      budget_utilization_rate: rec.budget_utilization_rate,
      cost_per_iu_indicator: rec.cost_per_iu_indicator,
      cost_per_iu_note: rec.cost_per_iu_note,
      currency: rec.currency,
      pillar_budget,
      ...(rec.pillar_budget_note && { pillar_budget_note: rec.pillar_budget_note }),
      ...(bti_indicators && { bti_indicators }),
      kora_billing: rec.kora_billing,
      narrative: rec.narrative,
    };
  }

  getFinancialGovernance(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): FinancialGovernanceResult {
    if (!this.canAccessFinancialGovernance(role)) {
      return {
        allowed: false,
        reason: `Role ${role} does not have access to financial governance data. Requires COMPANY_FINANCE, COMPANY_HR, COMPANY_ESG, COMPANY_ADMIN, or KORA_ADMIN.`,
      };
    }
    const rec = this.findRecord(companyId, scenarioId);
    if (!rec) return { allowed: true };
    return { allowed: true, record: this.mapRecord(rec) };
  }

  getPillarBudget(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): PillarBudgetLine[] | null {
    if (!this.canAccessFinancialGovernance(role)) return null;
    const rec = this.findRecord(companyId, scenarioId);
    if (!rec) return null;
    return Object.entries(rec.pillar_budget).map(([pillar, data]) => ({
      pillar,
      allocated: data.allocated,
      used: data.used,
      utilization_rate: data.utilization_rate,
      programs: data.programs,
      ...(data.economic_relief_included !== undefined && {
        economic_relief_included: data.economic_relief_included,
      }),
    }));
  }

  getBTIIndicators(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): BTIIndicators | null {
    if (!this.canAccessFinancialGovernance(role)) return null;
    const rec = this.findRecord(companyId, scenarioId);
    if (!rec?.bti_indicators) return null;
    return { ...rec.bti_indicators, currency: rec.currency };
  }

  getBudgetSummary(
    companyId: string,
    scenarioId: ScenarioId,
    role: KoraRole,
  ): BudgetSummary | null {
    if (!this.canAccessFinancialGovernance(role)) return null;
    const rec = this.findRecord(companyId, scenarioId);
    if (!rec) return null;
    return {
      allocated: rec.budget_allocated_total,
      used: rec.budget_used_total,
      committed: rec.budget_committed_total,
      residual: rec.budget_residual,
      utilization_rate: rec.budget_utilization_rate,
      currency: rec.currency,
      disclaimer: rec.disclaimer,
    };
  }
}

export const financialGovernanceService = new FinancialGovernanceService();
