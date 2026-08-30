import type { ScenarioId, BudgetToHumanImpactRecord } from '@/lib/types';
import { tenantService } from '@/services/tenant/TenantService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
import { workerProvisioningService } from '@/services/worker-provisioning/WorkerProvisioningService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { companyOnboardingService } from '@/services/company-onboarding/CompanyOnboardingService';

export type CompanyRiskLevel = 'ready' | 'monitor' | 'action_required' | 'blocked';

export interface CompanyIntelligenceRecord {
  company_id: string;
  tenant_id: string;
  company_name: string;
  tenant_status: string;
  onboarding_status: string;
  data_intake_status: string;
  worker_count: number;
  my_kora_enabled_count: number;
  privacy_suppressed_clusters: number;
  kora_index_available: boolean;
  kora_index_value: number | null;
  confidence_score: number | null;
  activation_safeguard_status: string | null;
  decision_pack_status: string;
  structural_policy_count: number;
  eligible_candidate_rows: number;
  limited_candidate_rows: number;
  blocked_candidate_rows: number;
  review_required_rows: number;
  economic_relief_share: number | null;
  deep_activation_share: number | null;
  bti_score: number | null;
  risk_level: CompanyRiskLevel;
  next_action: string;
  limitations: string;
}

export interface KoraActionItem {
  company_id: string;
  company_name: string;
  issue: string;
  priority: 'alta' | 'media' | 'bassa';
  recommended_action: string;
  cta_label: string;
  cta_href: string;
}

export interface PortfolioReadinessSummary {
  total_tenants: number;
  active_tenants: number;
  draft_tenants: number;
  kora_index_available: number;
  decision_pack_ready: number;
  scoring_ready: number;
  needing_kora_action: number;
  data_intake_ready: number;
  data_validation_required: number;
  worker_roster_complete: number;
  my_kora_active_companies: number;
  privacy_suppression_present: number;
  advisor_review_required: number;
  no_data_tenants: number;
  economic_relief_companies: number;
}

const PREFERRED_SCENARIOS: ScenarioId[] = ['S1', 'S2'];

function resolveRiskLevel(
  tenantStatus: string,
  intakeStatus: string,
  workerCount: number,
  reviewRequiredRows: number,
  koraIndexAvailable: boolean,
  decisionPackStatus: string,
): CompanyRiskLevel {
  if (tenantStatus !== 'active' || intakeStatus === 'blocked_missing_required_fields') {
    return 'blocked';
  }
  if (
    workerCount === 0 ||
    intakeStatus === 'not_started' ||
    reviewRequiredRows > 0 ||
    intakeStatus === 'validation_required'
  ) {
    return 'action_required';
  }
  if (koraIndexAvailable && decisionPackStatus === 'ready') {
    return 'ready';
  }
  return 'monitor';
}

export class CompanyIntelligenceService {
  getCompanyIntelligenceRecord(companyId: string): CompanyIntelligenceRecord | null {
    const tenant = tenantService.getTenant(companyId);
    if (!tenant) return null;

    const intake = companyDataIntakeService.getDataReadinessSummary(companyId);
    const workerSummary = workerProvisioningService.getWorkerProvisioningSummary(companyId);

    // KORA Index: prefer S1, fallback S2
    let koraIndex = null;
    for (const scenario of PREFERRED_SCENARIOS) {
      koraIndex = scoringSimulatorService.getKoraIndexOutput(companyId, scenario);
      if (koraIndex) break;
    }
    const koraIndexAvailable = koraIndex !== null;

    // BTI: retired synthetic chain (B-TRUTH) — no reachable runtime source remains.
    // Real BTI lives in analytics.bti_result, read directly by the Gen 3
    // workspace API — this service (0 reachable callers) never consumed that.
    const btiRecord = undefined as BudgetToHumanImpactRecord | undefined;

    // Privacy suppressed clusters
    let privacySuppressedClusters = workerSummary.suppressed_clusters_count > 0 ? 1 : 0;
    try {
      privacySuppressedClusters = companyOnboardingService.getPrivacyThresholdWarnings(companyId).length;
    } catch {
      // fallback already set above
    }

    const riskLevel = resolveRiskLevel(
      tenant.tenant_status,
      intake.intake_status,
      workerSummary.total_workers,
      intake.review_required_rows,
      koraIndexAvailable,
      tenant.decision_pack_status,
    );

    return {
      company_id: companyId,
      tenant_id: tenant.tenant_id,
      company_name: tenant.company_name,
      tenant_status: tenant.tenant_status,
      onboarding_status: tenant.onboarding_status,
      data_intake_status: intake.intake_status,
      worker_count: workerSummary.total_workers,
      my_kora_enabled_count: workerSummary.my_kora_enabled_count,
      privacy_suppressed_clusters: privacySuppressedClusters,
      kora_index_available: koraIndexAvailable,
      kora_index_value: koraIndex?.kora_index_value ?? null,
      confidence_score: koraIndex?.confidence_score ?? null,
      activation_safeguard_status: koraIndex?.safeguard_status ?? null,
      decision_pack_status: tenant.decision_pack_status,
      structural_policy_count: intake.structural_policy_rows,
      eligible_candidate_rows: intake.eligible_candidate_rows,
      limited_candidate_rows: intake.limited_candidate_rows,
      blocked_candidate_rows: intake.blocked_candidate_rows,
      review_required_rows: intake.review_required_rows,
      economic_relief_share: btiRecord?.economic_relief_share ?? null,
      deep_activation_share: btiRecord?.deep_activation_share ?? null,
      bti_score: btiRecord?.bti_score ?? null,
      risk_level: riskLevel,
      next_action: tenantService.getNextAction(tenant),
      limitations: koraIndex?.limitations_text ?? '',
    };
  }

  getAllCompanyIntelligenceRecords(): CompanyIntelligenceRecord[] {
    return tenantService
      .getTenants()
      .map((t) => this.getCompanyIntelligenceRecord(t.company_id))
      .filter((r): r is CompanyIntelligenceRecord => r !== null);
  }

  getPortfolioReadinessSummary(): PortfolioReadinessSummary {
    const records = this.getAllCompanyIntelligenceRecords();
    const tenants = tenantService.getTenants();
    return {
      total_tenants: tenants.length,
      active_tenants: tenants.filter((t) => t.tenant_status === 'active').length,
      draft_tenants: tenants.filter((t) => t.tenant_status === 'draft').length,
      kora_index_available: records.filter((r) => r.kora_index_available).length,
      decision_pack_ready: records.filter((r) => r.decision_pack_status === 'ready').length,
      scoring_ready: records.filter(
        (r) => r.tenant_status === 'active' && !r.kora_index_available && r.data_intake_status !== 'not_started',
      ).length,
      needing_kora_action: records.filter(
        (r) => r.risk_level === 'action_required' || r.risk_level === 'blocked',
      ).length,
      data_intake_ready: records.filter((r) => r.data_intake_status === 'ready_for_ingestion').length,
      data_validation_required: records.filter((r) => r.data_intake_status === 'validation_required').length,
      worker_roster_complete: records.filter((r) => r.worker_count >= 30).length,
      my_kora_active_companies: records.filter((r) => r.my_kora_enabled_count > 0).length,
      privacy_suppression_present: records.filter((r) => r.privacy_suppressed_clusters > 0).length,
      advisor_review_required: records.filter((r) => r.review_required_rows > 0).length,
      no_data_tenants: records.filter((r) => r.data_intake_status === 'not_started').length,
      economic_relief_companies: records.filter(
        (r) => r.economic_relief_share !== null && r.economic_relief_share > 0,
      ).length,
    };
  }

  getKoraActionQueue(): KoraActionItem[] {
    const records = this.getAllCompanyIntelligenceRecords();
    const actions: KoraActionItem[] = [];

    for (const rec of records) {
      if (rec.risk_level === 'blocked') {
        const isInactiveTenant = rec.tenant_status !== 'active';
        actions.push({
          company_id: rec.company_id,
          company_name: rec.company_name,
          issue: isInactiveTenant
            ? 'Tenant non attivo — portale aziendale bloccato'
            : 'Data intake bloccato — campi obbligatori mancanti',
          priority: 'alta',
          recommended_action: isInactiveTenant
            ? 'Attiva il tenant per sbloccare il portale aziendale'
            : 'Completa i campi obbligatori nel Data Intake',
          cta_label: isInactiveTenant ? 'Dettaglio Tenant →' : 'Data Intake →',
          cta_href: isInactiveTenant
            ? `/admin/companies/${rec.company_id}`
            : `/admin/companies/${rec.company_id}/data-intake`,
        });
        continue;
      }

      if (rec.risk_level === 'action_required') {
        if (rec.worker_count === 0) {
          actions.push({
            company_id: rec.company_id,
            company_name: rec.company_name,
            issue: 'Roster lavoratori assente — baseline workforce mancante',
            priority: 'alta',
            recommended_action: 'Carica il roster lavoratori per abilitare il calcolo KORA Index',
            cta_label: 'Workforce Baseline →',
            cta_href: '/admin/companies/workforce-baseline',
          });
        }
        if (rec.data_intake_status === 'not_started') {
          actions.push({
            company_id: rec.company_id,
            company_name: rec.company_name,
            issue: 'Data intake non avviato — nessun programma caricato',
            priority: 'alta',
            recommended_action: 'Avvia il data intake con almeno un batch di dati programma',
            cta_label: 'Data Intake →',
            cta_href: `/admin/companies/${rec.company_id}/data-intake`,
          });
        }
        if (rec.review_required_rows > 0) {
          actions.push({
            company_id: rec.company_id,
            company_name: rec.company_name,
            issue: `${rec.review_required_rows} righe richiedono review advisor`,
            priority: 'media',
            recommended_action: 'Assegna un advisor e completa la review delle righe segnalate',
            cta_label: 'Data Intake →',
            cta_href: `/admin/companies/${rec.company_id}/data-intake`,
          });
        }
        if (rec.data_intake_status === 'validation_required' && rec.review_required_rows === 0) {
          actions.push({
            company_id: rec.company_id,
            company_name: rec.company_name,
            issue: 'Dati in attesa di validazione prima dell\'ingestion',
            priority: 'media',
            recommended_action: 'Valida i dati nel Data Intake per avanzare nel pipeline',
            cta_label: 'Data Intake →',
            cta_href: `/admin/companies/${rec.company_id}/data-intake`,
          });
        }
      }
    }

    return actions.sort((a, b) => {
      const rank: Record<string, number> = { alta: 0, media: 1, bassa: 2 };
      return (rank[a.priority] ?? 2) - (rank[b.priority] ?? 2);
    });
  }
}

export const companyIntelligenceService = new CompanyIntelligenceService();
