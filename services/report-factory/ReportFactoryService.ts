import type {
  DecisionPackVersion,
  DecisionPackFactoryStatus,
  DecisionPackStatus,
  CalibrationStatus,
  ScenarioId,
} from '@/lib/types';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import type { CanonicalDataIntakeStatus } from '@/lib/live/data-intake-status-view';
import { getMethodologyVersion } from '@/lib/methodology-config/v0.1';
import versionsRaw from '@/data/synthetic/decision-pack-versions.json';

interface SeedVersion {
  version_id: string;
  company_id: string;
  tenant_id: string;
  company_name: string;
  title?: string;
  period: string;
  created_at: string;
  generated_by_role?: string;
  generation_mode?: string;
  status: string;
  methodology_version_id?: string;
  methodology_version?: string;
  calibration_status: string;
  kora_index_value?: number | null;
  confidence_score?: number | null;
  activation_safeguard_status?: string | null;
  data_readiness_status?: string;
  data_readiness?: string;
  decision_pack_status?: string;
  advisor_review_status?: string;
  export_status?: string;
  source_snapshot_ids?: string[];
  sections_included?: string[];
  blocking_reasons?: string[];
  limitations?: string[];
  change_summary?: string;
  production_ready?: false;
  synthetic_demo_data?: true;
}

const seedVersions = (versionsRaw as { data: SeedVersion[] }).data;

function mapSeedToVersion(s: SeedVersion): DecisionPackVersion {
  return {
    version_id:             s.version_id,
    company_id:             s.company_id,
    company_name:           s.company_name,
    period:                 s.period,
    created_at:             s.created_at,
    status:                 s.status as DecisionPackStatus,
    methodology_version:    s.methodology_version ?? s.methodology_version_id ?? getMethodologyVersion(),
    calibration_status:     s.calibration_status as CalibrationStatus,
    confidence_score:       s.confidence_score ?? 0,
    advisor_review_status:  s.advisor_review_status ?? 'not_required',
    data_readiness:         s.data_readiness ?? s.data_readiness_status ?? 'medium',
    export_status:          s.export_status ?? 'demo_only',
    // V2 factory fields
    tenant_id:              s.tenant_id,
    title:                  s.title,
    generated_by_role:      s.generated_by_role,
    generation_mode:        s.generation_mode as DecisionPackVersion['generation_mode'],
    kora_index_value:       s.kora_index_value ?? null,
    activation_safeguard_status: s.activation_safeguard_status ?? null,
    decision_pack_status:   s.decision_pack_status,
    source_snapshot_ids:    s.source_snapshot_ids ?? [],
    sections_included:      s.sections_included ?? [],
    limitations:            s.limitations ?? [],
    blocking_reasons:       s.blocking_reasons ?? [],
    change_summary:         s.change_summary,
    production_ready:       false,
    synthetic_demo_data:    true,
  };
}

// B-TRUTH Demo/Orphan Chain Audit (2026-08-30): reduced to the obsolete
// ReportFactory metadata chain's one reachable method. This service's only
// runtime caller anywhere in the repo is app/admin/pipeline/page.tsx (a
// demo caller — hardcoded DEMO_COMPANY_ID), which calls exactly
// getDecisionPackFactoryStatus(). Ten other public methods (version history,
// generation, readiness, sections, export actions, change summary, period
// comparison, metric deltas, limitations, previous-comparable-version) plus
// one dead private method (isTenantActive) had zero callers anywhere —
// verified per-method, repo-wide, before removal; none was reached
// internally by getDecisionPackFactoryStatus's own call chain, none had test
// coverage beyond guard-style "does not import" assertions, and none is used
// by ReportGeneratorService (a same-named-method coincidence, not a real
// caller — ReportGeneratorService implements its own independent
// getDecisionPackVersionHistory/getDecisionPackLimitations/
// getDecisionPackExportActions and does not import this class at all).
// The canonical Decision Pack path remains lib/decision-pack/* — this
// service never becomes a second authority; it only powers one boolean-ish
// demo status check for a synthetic tenant with no live analytics.tenant row
// (getDecisionPackFactoryStatus.latest_status, feeding pipeline's own
// "hasDecisionPack" lifecycle-step flag).
// B-TRUTH TenantService Canonical Migration (2026-09-04): CanonicalTenantStatus
// replaces the internal tenantService.getTenant() lookup this service used to
// perform itself. The caller now supplies the already-fetched canonical
// analytics.tenant status (id, is_active) — the same canonical read
// mechanism app/admin/pipeline/page.tsx already performs for its own tenant
// header, reused here rather than duplicated. null means no canonical
// tenant was found for the identity this call represents. This eliminates
// ReportFactoryService's TenantService dependency without changing
// companyId's role for the still-synthetic hasKoraIndex/getIntakeStatus/
// getLatestDecisionPackVersion checks below (unrelated, unmigrated in this PR).
export interface CanonicalTenantStatus {
  id: string;
  isActive: boolean;
}

export interface IReportFactoryService {
  getDecisionPackFactoryStatus(companyId: string, canonicalTenant: CanonicalTenantStatus | null, dataIntake: CanonicalDataIntakeStatus): DecisionPackFactoryStatus;
  getLatestDecisionPackVersion(companyId: string): DecisionPackVersion | null;
}

export class ReportFactoryService implements IReportFactoryService {

  // ── Readiness checks ───────────────────────────────────────────────────────

  private hasKoraIndex(companyId: string): boolean {
    for (const scenario of ['S1', 'S2'] as ScenarioId[]) {
      if (scoringSimulatorService.getKoraIndexOutput(companyId, scenario) !== null) return true;
    }
    return false;
  }

  // B-TRUTH CompanyDataIntakeService Canonical Migration (2026-09-05):
  // dataIntake now supplied by the caller (already-fetched canonical
  // analytics.source_batch/uef_record view — see
  // lib/live/data-intake-status-view.ts) instead of this service reading
  // companyDataIntakeService itself. The legacy 'blocked_missing_required_fields'
  // branch is not reproduced — see that file's own header for why (the
  // concern it existed for is now handled structurally at the canonical
  // upload boundary, before a source_batch row is ever created).
  private computeBlockingReasons(
    companyId: string,
    canonicalTenant: CanonicalTenantStatus | null,
    dataIntake: CanonicalDataIntakeStatus,
  ): string[] {
    const reasons: string[] = [];

    if (!canonicalTenant) {
      reasons.push('Tenant non trovato nel portfolio KORA.');
      return reasons;
    }
    if (!canonicalTenant.isActive) {
      reasons.push('Tenant non attivo — attivare il tenant per sbloccare il Decision Pack.');
    }
    if (!this.hasKoraIndex(companyId)) {
      reasons.push('KORA Index non disponibile — completare il pipeline di scoring prima di generare il Decision Pack.');
    }
    if (dataIntake.intakeStatus === 'not_started') {
      reasons.push('Data intake non avviato — caricare almeno un batch di dati programma.');
    } else if (dataIntake.intakeStatus === 'validation_required') {
      reasons.push('Dati in attesa di validazione — risolvere le righe segnalate prima di procedere.');
    }
    if (dataIntake.pendingReviewCount > 0) {
      reasons.push(`${dataIntake.pendingReviewCount} righe richiedono review advisor prima dell'ingestion.`);
    }

    return reasons;
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  getDecisionPackFactoryStatus(
    companyId: string,
    canonicalTenant: CanonicalTenantStatus | null,
    dataIntake: CanonicalDataIntakeStatus,
  ): DecisionPackFactoryStatus {
    const tenantId = canonicalTenant?.id ?? '';
    const blockingReasons = this.computeBlockingReasons(companyId, canonicalTenant, dataIntake);
    const canGenerate = blockingReasons.length === 0;

    const latestVersion = this.getLatestDecisionPackVersion(companyId);
    const latestStatus = latestVersion?.status ?? 'blocked';

    const warnings: string[] = [];
    if (latestVersion?.confidence_score && latestVersion.confidence_score < 0.65) {
      warnings.push('Confidence Score < 65% — revisione advisor consigliata prima dell\'uso direzionale.');
    }
    if (latestVersion?.activation_safeguard_status === 'WARNING') {
      warnings.push('Activation Safeguard WARNING — base di partecipazione parziale.');
    }
    if (latestVersion?.activation_safeguard_status === 'FLAGGED') {
      warnings.push('Activation Safeguard FLAGGED — interpretazione KORA Index non affidabile.');
    }

    const nextAction = canGenerate
      ? (latestVersion ? 'Decision Pack disponibile. Revisionare le sezioni e preparare per advisor.' : 'Avvia la generazione del Decision Pack.')
      : (blockingReasons[0] ?? 'Risolvere i problemi bloccanti per procedere.');

    return {
      company_id:       companyId,
      tenant_id:        tenantId,
      latest_version_id: latestVersion?.version_id,
      latest_status:    latestStatus as DecisionPackStatus,
      can_generate:     canGenerate,
      can_export_pdf:   false,
      can_share:        false,
      blocking_reasons: blockingReasons,
      warnings,
      next_action:      nextAction,
    };
  }

  getLatestDecisionPackVersion(companyId: string): DecisionPackVersion | null {
    const companyVersions = seedVersions
      .filter((v) => v.company_id === companyId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (!companyVersions.length) return null;
    return mapSeedToVersion(companyVersions[0]);
  }
}

export const reportFactoryService = new ReportFactoryService();
