import type {
  DecisionPackVersion,
  DecisionPackFactoryStatus,
  DecisionPackStatus,
  CalibrationStatus,
  ScenarioId,
} from '@/lib/types';
import { tenantService } from '@/services/tenant/TenantService';
import { scoringSimulatorService } from '@/services/scoring-simulator/ScoringSimulatorService';
import { companyDataIntakeService } from '@/services/company-data-intake/CompanyDataIntakeService';
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
export interface IReportFactoryService {
  getDecisionPackFactoryStatus(companyId: string): DecisionPackFactoryStatus;
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

  private getIntakeStatus(companyId: string): string {
    return companyDataIntakeService.getDataReadinessSummary(companyId).intake_status;
  }

  private computeBlockingReasons(companyId: string): string[] {
    const reasons: string[] = [];
    const tenant = tenantService.getTenant(companyId);

    if (!tenant) {
      reasons.push('Tenant non trovato nel portfolio KORA.');
      return reasons;
    }
    if (tenant.tenant_status !== 'active') {
      reasons.push(`Tenant non attivo (stato: ${tenant.tenant_status}) — attivare il tenant per sbloccare il Decision Pack.`);
    }
    if (!this.hasKoraIndex(companyId)) {
      reasons.push('KORA Index non disponibile — completare il pipeline di scoring prima di generare il Decision Pack.');
    }
    const intakeStatus = this.getIntakeStatus(companyId);
    if (intakeStatus === 'not_started') {
      reasons.push('Data intake non avviato — caricare almeno un batch di dati programma.');
    } else if (intakeStatus === 'blocked_missing_required_fields') {
      reasons.push('Data intake bloccato — completare i campi obbligatori del piano fiscale.');
    } else if (intakeStatus === 'validation_required') {
      reasons.push('Dati in attesa di validazione — risolvere le righe segnalate prima di procedere.');
    }
    const intake = companyDataIntakeService.getDataReadinessSummary(companyId);
    if (intake.review_required_rows > 0) {
      reasons.push(`${intake.review_required_rows} righe richiedono review advisor prima dell'ingestion.`);
    }

    return reasons;
  }

  // ── Public methods ─────────────────────────────────────────────────────────

  getDecisionPackFactoryStatus(companyId: string): DecisionPackFactoryStatus {
    const tenant = tenantService.getTenant(companyId);
    const tenantId = tenant?.tenant_id ?? '';
    const blockingReasons = this.computeBlockingReasons(companyId);
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
