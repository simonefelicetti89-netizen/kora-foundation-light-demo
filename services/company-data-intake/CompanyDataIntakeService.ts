import type {
  CompanyBudgetFiscalPlan,
  CompanyRawDataBatch,
  CompanyRawDataRow,
  CompanyDataReadinessSummary,
  CompanyDataIntakeStatus,
} from '@/lib/types';

import fiscalPlansData   from '@/data/synthetic/company-budget-fiscal-plans.json';
import rawBatchesData    from '@/data/synthetic/company-raw-data-batches.json';
import rawRowsData       from '@/data/synthetic/company-raw-data-rows.json';

const FISCAL_PLANS  = fiscalPlansData.data    as CompanyBudgetFiscalPlan[];
const RAW_BATCHES   = rawBatchesData.data     as CompanyRawDataBatch[];
const RAW_ROWS      = rawRowsData.data        as CompanyRawDataRow[];

const COMPLIANCE_KEYWORDS = [
  'dpi', 'dvr', 'duvri', 'antincendio', 'gdpr', '231', 'anticorruzione',
  'sorveglianza sanitaria', 'patentino', 'muletto', 'sicurezza obbligator',
  'obbligator', 'd.lgs. 81', 'mansione', 'formazione obbligatoria',
];

const FRINGE_KEYWORDS = [
  'buoni pasto', 'ticket restaurant', 'buoni carburante', 'gift card',
  'voucher', 'fringe', 'buono spesa', 'rimborso generico',
];

// B-TRUTH Demo/Orphan Chain Audit (2026-08-30): reduced to the pipeline-only
// Data Intake synthetic summary. The only reachable runtime call anywhere in
// the repo is getDataReadinessSummary(), reached from
// app/admin/pipeline/page.tsx (demo caller) and, transitively, from
// ReportFactoryService (demo caller) and CompanyIntelligenceService
// (orphaned — 0 reachable callers itself, see lib/architecture/registry.ts
// svc.company-intelligence). Twelve other public methods
// (getAvailableCompanies, getFiscalPerimeterSummary, getRawDataRowsForBatch,
// getRowsReadyForIngestion, getEligibleCandidates, getLimitedCandidates,
// getBlockedCandidates, getStructuralPolicyRows, getReviewRequiredRows,
// getRowsWithMissingFields, validateRawDataBatch, getPipelineLinks) had zero
// callers anywhere — not pipeline, not ReportFactoryService, not
// CompanyIntelligenceService, not any test — verified by an exact per-method
// repo-wide search before removal. Removed rather than kept as unreachable
// surface (Master Plan §32 / this audit's own reachability discipline).
class CompanyDataIntakeService {
  getBudgetFiscalPlan(companyId: string): CompanyBudgetFiscalPlan | null {
    return FISCAL_PLANS.find((p) => p.company_id === companyId) ?? null;
  }

  getRawDataBatches(companyId: string): CompanyRawDataBatch[] {
    return RAW_BATCHES.filter((b) => b.company_id === companyId);
  }

  getRawDataRows(companyId: string): CompanyRawDataRow[] {
    return RAW_ROWS.filter((r) => r.company_id === companyId);
  }

  getNextAction(companyId: string): string {
    const plan  = this.getBudgetFiscalPlan(companyId);
    const rows  = this.getRawDataRows(companyId);

    if (!plan || plan.fiscal_perimeters.length === 0) {
      return 'Definire il perimetro fiscale e il budget people/welfare';
    }
    if (rows.length === 0) {
      return 'Caricare il primo batch di dati programmi';
    }

    const missing  = rows.filter((r) => r.missing_fields.length > 0).length;
    const review   = rows.filter((r) => this._isReviewRequired(r) && !r.ready_for_ingestion).length;
    const ready    = rows.filter((r) => r.ready_for_ingestion).length;

    if (missing > 0) return `Completare ${missing} righe con campi mancanti`;
    if (review > 0)  return `Revisionare ${review} righe prima dell'ingestion`;
    if (ready > 0)   return 'Approvare batch e avviare AI Ingestion';
    return 'Nessuna azione richiesta — pipeline pronta';
  }

  getDataReadinessSummary(companyId: string): CompanyDataReadinessSummary {
    const plan    = this.getBudgetFiscalPlan(companyId);
    const batches = this.getRawDataBatches(companyId);
    const rows    = this.getRawDataRows(companyId);

    const ready       = rows.filter((r) => r.ready_for_ingestion).length;
    const eligible    = rows.filter((r) => this._isEligible(r)).length;
    const limited     = rows.filter((r) => this._isLimited(r)).length;
    const blocked     = rows.filter((r) => this._isBlocked(r)).length;
    const structural  = rows.filter((r) => this._isStructuralPolicy(r)).length;
    const review      = rows.filter((r) => this._isReviewRequired(r)).length;
    const missing     = rows.reduce((acc, r) => acc + r.missing_fields.length, 0);

    const intakeStatus = this._deriveIntakeStatus(companyId, plan, rows, review, missing);
    const qualityScore = rows.length > 0 ? ready / rows.length : 0;
    const ingestionReady = ready > 0 && review === 0 && missing === 0;

    const tenantId = plan?.tenant_id ?? `tenant-${companyId}`;
    const fiscalPlanStatus = !plan
      ? 'not_started'
      : plan.fiscal_perimeters.length === 0
        ? 'not_started'
        : plan.status === 'ready_for_ingestion'
          ? 'complete'
          : plan.status === 'partial'
            ? 'partial'
            : 'draft';

    return {
      tenant_id:               tenantId,
      company_id:              companyId,
      intake_status:           intakeStatus,
      fiscal_plan_status:      fiscalPlanStatus as 'not_started' | 'draft' | 'partial' | 'complete',
      batch_count:             batches.length,
      total_rows:              rows.length,
      ready_for_ingestion_rows: ready,
      eligible_candidate_rows: eligible,
      limited_candidate_rows:  limited,
      blocked_candidate_rows:  blocked,
      structural_policy_rows:  structural,
      review_required_rows:    review,
      missing_fields_count:    missing,
      data_quality_score:      qualityScore,
      ingestion_ready:         ingestionReady,
      kora_index_available:    rows.length > 0 && eligible >= 5,
      decision_pack_available: rows.length > 0 && eligible >= 5 && review === 0,
      next_action:             this.getNextAction(companyId),
      limitations: [
        'Hint pre-ingestion — non classificazione finale.',
        'La classificazione ufficiale avviene nell\'Eligibility Gate.',
        'pre_empirical_calibration · synthetic_demo_data: true',
      ],
    };
  }

  // ── Private classification helpers ──────────────────────────────────────────

  private _isBlocked(row: CompanyRawDataRow): boolean {
    if (row.expected_eligibility_hint === 'blocked') return true;
    if (row.row_category === 'hse_compliance' || row.row_category === 'legal_compliance') return true;
    if (row.fiscal_perimeter === 'compliance_excluded') return true;
    if (row.mandatory_status === 'mandatory_legal' || row.mandatory_status === 'mandatory_role') {
      const nameLC = row.raw_name.toLowerCase();
      return COMPLIANCE_KEYWORDS.some((kw) => nameLC.includes(kw));
    }
    return false;
  }

  private _isLimited(row: CompanyRawDataRow): boolean {
    if (row.expected_eligibility_hint === 'limited') return true;
    if (row.row_category === 'economic_relief') return true;
    if (row.fiscal_perimeter === 'fringe_benefit') return true;
    const nameLC = row.raw_name.toLowerCase();
    return FRINGE_KEYWORDS.some((kw) => nameLC.includes(kw));
  }

  private _isStructuralPolicy(row: CompanyRawDataRow): boolean {
    return (
      row.row_category === 'structural_policy' ||
      row.event_nature_hint === 'structural_policy' ||
      row.action_family_hint === 'trust_and_flexibility_policy' ||
      (row.budget_mediated === false && row.individual_usage_visible === false && row.row_category !== 'hse_compliance' && row.row_category !== 'legal_compliance')
    );
  }

  private _isReviewRequired(row: CompanyRawDataRow): boolean {
    if (row.expected_eligibility_hint === 'review_required') return true;
    if (row.fiscal_perimeter === 'unknown') return true;
    if (row.mandatory_status === 'unknown') return true;
    if (row.missing_fields.length > 0) return true;
    if (row.evidence_status === 'missing' || row.evidence_status === 'unknown') return true;
    if (row.row_category === 'unknown') return true;
    return false;
  }

  private _isEligible(row: CompanyRawDataRow): boolean {
    if (this._isBlocked(row) || this._isLimited(row) || this._isReviewRequired(row)) return false;
    const eligibleCategories: CompanyRawDataRow['row_category'][] = [
      'welfare_program', 'training_program', 'people_program',
      'esg_community', 'structural_policy', 'organizational_policy',
    ];
    return eligibleCategories.includes(row.row_category) && row.mandatory_status === 'voluntary';
  }

  private _deriveIntakeStatus(
    _companyId: string,
    plan: CompanyBudgetFiscalPlan | null,
    rows: CompanyRawDataRow[],
    reviewCount: number,
    missingCount: number,
  ): CompanyDataIntakeStatus {
    if (!plan || plan.fiscal_perimeters.length === 0) return 'not_started';
    if (rows.length === 0) return 'draft';
    if (missingCount > 0) return 'blocked_missing_required_fields';
    if (reviewCount > 0) return 'validation_required';
    const readyCount = rows.filter((r) => r.ready_for_ingestion).length;
    if (readyCount === rows.length) return 'ready_for_ingestion';
    return 'partial';
  }
}

export const companyDataIntakeService = new CompanyDataIntakeService();
