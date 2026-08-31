import type {
  CompanyOnboardingRecord,
  CompanyProfile,
  WorkforceBaseline,
  HRKPIContextSummary,
  RawProgramDataSummary,
  OnboardingReadinessCheck,
  OnboardingReadinessStatus,
  PipelineStageLink,
  WorkforceCluster,
  CompanyOnboardingStatus,
} from '@/lib/types';
import onboardingData from '@/data/synthetic/company-onboarding.json';

const records = onboardingData as CompanyOnboardingRecord[];

export interface ICompanyOnboardingService {
  getOnboardingCompanies(): CompanyOnboardingRecord[];
  getCompanyOnboardingRecord(companyId: string): CompanyOnboardingRecord | null;
  getCurrentCompanyOnboardingRecord(): CompanyOnboardingRecord;
  getCompanyProfile(companyId: string): CompanyProfile | null;
  getWorkforceBaseline(companyId: string): WorkforceBaseline | null;
  getHRKPIContext(companyId: string): HRKPIContextSummary | null;
  getRawProgramDataSummary(companyId: string): RawProgramDataSummary | null;
  getReadinessChecks(companyId: string): OnboardingReadinessCheck[];
  getPipelineReadiness(companyId: string): { status: OnboardingReadinessStatus; blocking_checks: OnboardingReadinessCheck[] };
  getNextBestAction(companyId: string): { action: string; detail: string };
  isFoundationLightEligible(companyId: string): boolean;
  getPrivacyThresholdWarnings(companyId: string): WorkforceCluster[];
  getPipelineLinks(companyId: string): PipelineStageLink[];
}

export class CompanyOnboardingService implements ICompanyOnboardingService {
  getOnboardingCompanies(): CompanyOnboardingRecord[] {
    return records;
  }

  getCompanyOnboardingRecord(companyId: string): CompanyOnboardingRecord | null {
    return records.find((r) => r.company_id === companyId) ?? null;
  }

  getCurrentCompanyOnboardingRecord(): CompanyOnboardingRecord {
    return records[0];
  }

  getCompanyProfile(companyId: string): CompanyProfile | null {
    return this.getCompanyOnboardingRecord(companyId)?.profile ?? null;
  }

  getWorkforceBaseline(companyId: string): WorkforceBaseline | null {
    return this.getCompanyOnboardingRecord(companyId)?.workforce_baseline ?? null;
  }

  getHRKPIContext(companyId: string): HRKPIContextSummary | null {
    return this.getCompanyOnboardingRecord(companyId)?.hr_kpi_context ?? null;
  }

  getRawProgramDataSummary(companyId: string): RawProgramDataSummary | null {
    return this.getCompanyOnboardingRecord(companyId)?.program_data_summary ?? null;
  }

  getReadinessChecks(companyId: string): OnboardingReadinessCheck[] {
    return this.getCompanyOnboardingRecord(companyId)?.readiness_checks ?? [];
  }

  getPipelineReadiness(companyId: string): { status: OnboardingReadinessStatus; blocking_checks: OnboardingReadinessCheck[] } {
    const checks = this.getReadinessChecks(companyId);
    const blockingFailed = checks.filter((c) => c.blocking && c.status !== 'ok');
    if (blockingFailed.length > 0) return { status: 'blocked', blocking_checks: blockingFailed };
    const hasWarnings = checks.some((c) => c.status === 'warning');
    return { status: hasWarnings ? 'warning' : 'ok', blocking_checks: [] };
  }

  getNextBestAction(companyId: string): { action: string; detail: string } {
    const record = this.getCompanyOnboardingRecord(companyId);
    if (!record) return { action: 'Azienda non trovata', detail: '' };

    if (!this.isFoundationLightEligible(companyId)) {
      return {
        action: 'Aumenta l\'organico prima di procedere',
        detail: 'Foundation Light richiede almeno 30 lavoratori per garantire la soglia privacy N≥10 nei cluster.',
      };
    }

    const status = record.onboarding_status as CompanyOnboardingStatus;
    const actions: Record<CompanyOnboardingStatus, { action: string; detail: string }> = {
      not_started:                   { action: 'Completa il profilo aziendale', detail: 'Inserisci settore, sede e dati di contatto.' },
      profile_complete:              { action: 'Carica la baseline workforce', detail: 'Definisci organico, siti e cluster per abilitare il breakdown.' },
      workforce_baseline_complete:   { action: 'Carica i dati programmi', detail: 'Uploada welfare, formazione e attività collettive tramite AI Ingestion.' },
      program_data_loaded:           { action: 'Aggiungi KPI HR di contesto', detail: 'I KPI HR arricchiscono l\'interpretazione senza entrare nel KORA Index.' },
      hr_kpi_added:                  { action: 'Avvia i controlli di prontezza', detail: 'Verifica che tutti i check bloccanti siano superati prima della pipeline.' },
      readiness_check_passed:        { action: 'Avvia la pipeline KORA', detail: 'Procedi con AI Ingestion Studio → UEF Review → Scoring → Decision Pack.' },
      pipeline_active:               { action: 'Attendi il completamento della pipeline', detail: 'La pipeline è in esecuzione. Monitora UEF Review e Scoring.' },
      decision_pack_ready:           { action: 'Consulta il Decision Pack', detail: 'Il KORA Company Decision Pack è pronto per la revisione.' },
      blocked_insufficient_workforce:{ action: 'Aumenta l\'organico', detail: 'Foundation Light richiede almeno 30 lavoratori.' },
    };

    return actions[status] ?? { action: 'Procedi con l\'onboarding', detail: '' };
  }

  isFoundationLightEligible(companyId: string): boolean {
    const baseline = this.getWorkforceBaseline(companyId);
    return (baseline?.total_employees ?? 0) >= 30;
  }

  getPrivacyThresholdWarnings(companyId: string): WorkforceCluster[] {
    const baseline = this.getWorkforceBaseline(companyId);
    return (baseline?.clusters ?? []).filter((c) => !c.privacy_threshold_met);
  }

  getPipelineLinks(companyId: string): PipelineStageLink[] {
    return this.getCompanyOnboardingRecord(companyId)?.pipeline_links ?? [];
  }
}

export const companyOnboardingService = new CompanyOnboardingService();
