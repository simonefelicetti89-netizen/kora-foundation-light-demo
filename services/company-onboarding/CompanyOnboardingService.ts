// services/company-onboarding/CompanyOnboardingService.ts
// B-TRUTH Company Onboarding canonicalization (2026-09-01) — retires the
// synthetic data/synthetic/company-onboarding.json read in favor of
// lib/live/company-onboarding-view.ts's canonical analytics.tenant +
// personal.workforce_baseline read. See that module's header for the full
// KEEP/DERIVE/DROP field disposition.
//
// CompanySetup (services/company-setup/CompanySetupService.ts) and
// CompanyOnboarding are NOT competing implementations — distinct
// responsibilities (pre-provisioning wizard vs. post-provisioning
// readiness/status logic). See lib/architecture/registry.ts svc.company-onboarding
// / svc.company-setup for the corrected record.
//
// Zero real (non-test, non-registry) runtime callers exist for this service
// as of this port (confirmed by repo-wide grep). Canonicalized anyway per
// this task's explicit instruction — do not fabricate a caller; do
// canonicalize; preserve the derived-logic value for whenever a caller is
// wired up.

import {
  buildCompanyOnboardingView,
  PIPELINE_LINKS,
  type CompanyOnboardingView,
  type TenantOnboardingRow,
} from '@/lib/live/company-onboarding-view';
import type { WorkforceBaselineRow } from '@/lib/live/workforce-baseline-view';
import type { OnboardingReadinessCheck, PipelineStageLink } from '@/lib/types';

export interface ICompanyOnboardingService {
  getOnboardingState(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView | null>;
  isFoundationLightEligible(params: { db: unknown; tenantCode: string }): Promise<boolean | null>;
  getPrivacyThresholdWarnings(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView['privacyThresholdWarnings'] | null>;
  getReadinessChecks(params: { db: unknown; tenantCode: string }): Promise<OnboardingReadinessCheck[] | null>;
  getPipelineReadiness(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView['pipelineReadiness'] | null>;
  getNextBestAction(params: { db: unknown; tenantCode: string }): Promise<{ action: string; detail: string }>;
  getPipelineLinks(): PipelineStageLink[];
}

export class CompanyOnboardingService implements ICompanyOnboardingService {
  /**
   * Primary canonical entry point. Reads analytics.tenant by tenant_code
   * (no tenant_kind branch — LIVE and DEMO-kind tenants read the exact same
   * columns through the exact same query) and the most recent
   * personal.workforce_baseline row for that tenant, then derives the full
   * onboarding view via the pure builder in lib/live/company-onboarding-view.ts.
   * Returns null for a nonexistent/soft-deleted tenant — honest not-found,
   * never a synthetic fallback.
   */
  async getOnboardingState(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView | null> {
    const { db, tenantCode } = params;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = db as any;

    const { data: tenantRow, error: tenantErr } = await client
      .schema('analytics').from('tenant')
      .select('id, tenant_code, company_name, onboarding_status, data_readiness_status, decision_pack_status')
      .eq('tenant_code', tenantCode)
      .is('deleted_at', null)
      .maybeSingle();

    if (tenantErr) {
      console.error('[CompanyOnboardingService.getOnboardingState] tenant fetch error:', tenantErr.message);
      return null;
    }
    if (!tenantRow) return null;

    const { data: baselineRow, error: baselineErr } = await client
      .schema('personal').from('workforce_baseline')
      .select('tenant_id, reporting_period, total_workers, segment_breakdown, minimum_group_size, created_at, created_by')
      .eq('tenant_id', (tenantRow as { id: string }).id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (baselineErr) {
      console.error('[CompanyOnboardingService.getOnboardingState] baseline fetch error:', baselineErr.message);
    }

    return buildCompanyOnboardingView(
      tenantRow as TenantOnboardingRow,
      (baselineRow as WorkforceBaselineRow | undefined) ?? null,
    );
  }

  async isFoundationLightEligible(params: { db: unknown; tenantCode: string }): Promise<boolean | null> {
    const view = await this.getOnboardingState(params);
    return view ? view.isFoundationLightEligible : null;
  }

  async getPrivacyThresholdWarnings(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView['privacyThresholdWarnings'] | null> {
    const view = await this.getOnboardingState(params);
    return view ? view.privacyThresholdWarnings : null;
  }

  async getReadinessChecks(params: { db: unknown; tenantCode: string }): Promise<OnboardingReadinessCheck[] | null> {
    const view = await this.getOnboardingState(params);
    return view ? view.readinessChecks : null;
  }

  async getPipelineReadiness(params: { db: unknown; tenantCode: string }): Promise<CompanyOnboardingView['pipelineReadiness'] | null> {
    const view = await this.getOnboardingState(params);
    return view ? view.pipelineReadiness : null;
  }

  async getNextBestAction(params: { db: unknown; tenantCode: string }): Promise<{ action: string; detail: string }> {
    const view = await this.getOnboardingState(params);
    if (!view) return { action: 'Azienda non trovata', detail: '' };
    return view.nextBestAction;
  }

  /** Static navigation metadata — no DB read, identical for every tenant. */
  getPipelineLinks(): PipelineStageLink[] {
    return PIPELINE_LINKS;
  }
}

export const companyOnboardingService = new CompanyOnboardingService();
