import type { KoraRole, ScenarioId } from '@/lib/types';
import { rolePermissionService } from '@/services/role-permission/RolePermissionService';
import companiesRaw from '@/data/synthetic/companies.json';
import deptsSitesRaw from '@/data/synthetic/departments-sites.json';
import programsRaw from '@/data/synthetic/programs.json';
import companyAggregatesRaw from '@/data/synthetic/company-aggregates.json';

export type SeedResourceType =
  | 'companies' | 'workers' | 'departments-sites' | 'programs'
  | 'source-batches' | 'uef-records' | 'impact-units' | 'pib-records'
  | 'company-aggregates' | 'kora-index-outputs' | 'kora-contribution-outputs'
  | 'activation-safeguard-results' | 'explainability-records' | 'confidence-records'
  | 'partner-catalog' | 'opportunities' | 'collective-initiatives' | 'booking-requests'
  | 'dynamic-cv-items' | 'milestones' | 'consent-records' | 'advisor-reviews'
  | 'reports' | 'founder-validation-contacts';

const WORKER_PRIVATE_RESOURCES = new Set<SeedResourceType>([
  'workers', 'pib-records', 'impact-units', 'dynamic-cv-items',
  'booking-requests', 'consent-records', 'milestones',
]);

// ── Seed record shapes (raw JSON) ──────────────────────────────────────────
interface CompanyRecord {
  id: string; company_name: string; sector: string; country: string;
  territory: string; headcount: number; program_status: string;
  foundation_light_status: string; data_completeness: number;
  welfare_budget_eur_approx: number; fiscal_year: string;
  is_primary_demo_company: boolean;
  sites: string[]; departments: string[];
  synthetic_demo_data: true; scenario_id: string;
  generated_for: string; not_live_data: true;
}

interface DeptSiteRecord {
  id: string; type: 'department' | 'site'; company_id: string;
  name: string; headcount: number; primary_site_id?: string;
  participation_profile?: string; activation_profile_s1?: string;
  activation_profile_s2?: string; privacy_threshold_met: boolean;
  synthetic_demo_data: true; scenario_id: string;
  generated_for: string; not_live_data: true;
}

interface ProgramRecord {
  id: string; company_id: string; name: string; description: string;
  pillars_primary: string[]; pillars_secondary: string[];
  kora_eligibility?: 'eligible' | 'blocked' | 'limited' | 'mixed';
  has_blocked_items?: boolean;
  eligibility_note?: string;
  source_type: string; status: string;
  fiscal_category_label: string;
  fiscal_classification_informational_only: boolean;
  not_tax_advice: boolean;
  budget_eur_approx: number; partner_ids: string[];
  eligibility_scope: string;
  expected_participation_rate_s1: number;
  expected_participation_rate_s2: number;
  synthetic_demo_data: true; scenario_id: string;
  generated_for: string; not_live_data: true;
}

interface AggregateRecord {
  id: string; company_id: string; scenario_id: string;
  reporting_period: string; total_workers: number;
  eligible_worker_count: number; active_worker_count: number;
  meaningful_active_worker_count: number;
  activation_rate: number; meaningful_activation_rate: number;
  continuity_rate: number; verification_rate: number;
  pillar_distribution: Record<string, number>;
  department_activation: Record<string, number>;
  privacy_threshold_met: boolean;
  methodology_version_id: string; calibration_status: string;
  synthetic_demo_data: true; generated_for: string; not_live_data: true;
}

export interface WorkerPopulationSummary {
  company_id: string;
  total_workers: number;
  cluster_counts: Record<string, number>;
  department_counts: Record<string, number>;
  site_counts: Record<string, number>;
}

export interface IDemoDataService {
  getResource<T>(role: KoraRole, scenarioId: ScenarioId, resource: SeedResourceType): T[];
  getCompanies(): CompanyRecord[];
  getPrimaryCompany(): CompanyRecord | null;
  getDepartments(companyId?: string): DeptSiteRecord[];
  getSites(companyId?: string): DeptSiteRecord[];
  getPrograms(companyId?: string): ProgramRecord[];
  getCompanyAggregate(companyId: string, scenarioId: ScenarioId): AggregateRecord | null;
  getWorkerPopulationSummary(companyId: string): WorkerPopulationSummary | null;
}

export class DemoDataService implements IDemoDataService {
  private readonly companies = (companiesRaw as { data: CompanyRecord[] }).data;
  private readonly deptsAndSites = (deptsSitesRaw as { data: DeptSiteRecord[] }).data;
  private readonly programs = (programsRaw as { data: ProgramRecord[] }).data;
  private readonly aggregates = (companyAggregatesRaw as { data: AggregateRecord[] }).data;

  getResource<T>(role: KoraRole, scenarioId: ScenarioId, resource: SeedResourceType): T[] {
    if (WORKER_PRIVATE_RESOURCES.has(resource)) {
      const permission = rolePermissionService.canAccess(role, resource as string);
      if (!permission.allowed) return [];
    }
    void scenarioId;
    return [];
  }

  getCompanies(): CompanyRecord[] {
    return this.companies;
  }

  getPrimaryCompany(): CompanyRecord | null {
    return this.companies.find((c) => c.is_primary_demo_company) ?? null;
  }

  getDepartments(companyId?: string): DeptSiteRecord[] {
    return this.deptsAndSites.filter(
      (r) => r.type === 'department' && (!companyId || r.company_id === companyId),
    );
  }

  getSites(companyId?: string): DeptSiteRecord[] {
    return this.deptsAndSites.filter(
      (r) => r.type === 'site' && (!companyId || r.company_id === companyId),
    );
  }

  getPrograms(companyId?: string): ProgramRecord[] {
    return this.programs.filter((p) => !companyId || p.company_id === companyId);
  }

  getCompanyAggregate(companyId: string, scenarioId: ScenarioId): AggregateRecord | null {
    return (
      this.aggregates.find(
        (a) => a.company_id === companyId && a.scenario_id === scenarioId,
      ) ?? null
    );
  }

  // Aggregate-safe worker summary — never returns individual worker records
  getWorkerPopulationSummary(companyId: string): WorkerPopulationSummary | null {
    const company = this.companies.find((c) => c.id === companyId);
    if (!company) return null;
    // Derive counts from departments/sites — no individual worker data needed
    const depts = this.getDepartments(companyId);
    const sites = this.getSites(companyId);
    return {
      company_id: companyId,
      total_workers: company.headcount,
      cluster_counts: {},
      department_counts: Object.fromEntries(depts.map((d) => [d.id, d.headcount])),
      site_counts: Object.fromEntries(sites.map((s) => [s.id, s.headcount])),
    };
  }
}

export const demoDataService = new DemoDataService();
