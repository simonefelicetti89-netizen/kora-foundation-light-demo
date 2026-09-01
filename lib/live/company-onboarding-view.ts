// lib/live/company-onboarding-view.ts
// B-TRUTH Company Onboarding canonicalization (2026-09-01) — canonical live
// view over analytics.tenant (+ personal.workforce_baseline via the
// already-canonical lib/live/workforce-baseline-view.ts), replacing
// services/company-onboarding/CompanyOnboardingService.ts's synthetic
// data/synthetic/company-onboarding.json read.
//
// PROTECTED DERIVED LOGIC — this module preserves the VALUE of
// isFoundationLightEligible / getPipelineReadiness / getNextBestAction
// (progressive onboarding guidance, privacy-threshold warnings, Foundation
// Light eligibility) while changing WHAT FEEDS them. It does not invent a
// second workforce-baseline authority: FOUNDATION_LIGHT_MINIMUM_WORKERS,
// WorkforceBaselineRow, buildWorkforceBaselineView are reused unchanged from
// lib/live/workforce-baseline-view.ts, not redefined here.
//
// Field disposition (KEEP/DERIVE/DROP methodology, same as the CC-052 Commons
// and B-TRUTH Contribution ports — no new schema invented):
//
//   KEEP (already real, already queried live elsewhere):
//     - analytics.tenant.onboarding_status / data_readiness_status /
//       decision_pack_status — already read live by
//       app/api/admin/company-console/route.ts and app/admin/pipeline/page.tsx.
//     - personal.workforce_baseline.total_workers / segment_breakdown /
//       minimum_group_size — via the existing canonical
//       buildWorkforceBaselineView(), not re-derived here.
//
//   DERIVE (computed from the above, not fabricated):
//     - isFoundationLightEligible: minimumCompanyThresholdMet from
//       buildWorkforceBaselineView() — reuses the SAME 30-worker constant
//       the synthetic service used, per that module's own header comment.
//     - privacyThresholdWarnings: aggregateGroups filtered to
//       employee_count < minimumGroupSize — the live analogue of the
//       synthetic WorkforceCluster.privacy_threshold_met flag.
//     - pipelineReadiness / readinessChecks: 3 checks with a genuine live
//       signal (workforce baseline exists, workforce threshold met, privacy
//       clusters clear, data readiness reached) replace the synthetic
//       record's 6 checks. The 3 DROPPED checks (data-quality CQ score,
//       consent-framework, structural-policy-docs) had editorial-only
//       detail text with no live source anywhere in the schema — dropped,
//       not fabricated, matching the WorkforceBaseline port's own DROP
//       precedent for baseline_completeness_score / warnings / limitations.
//     - nextBestAction: reuses the EXACT SAME static Italian message
//       catalogue (byte-identical text) the synthetic service used, keyed
//       by CompanyOnboardingStatus. The SELECTOR is redefined onto real
//       signals only — see deriveOnboardingFunnelPosition() below. 4 of the
//       9 original funnel positions (profile_complete's sibling
//       not_started, program_data_loaded, hr_kpi_added, pipeline_active)
//       are not reachable without either inventing schema (HR KPI context,
//       program budgets have no live table anywhere) or reading
//       analytics.uef_record / scoring-run state (Ingestion/UEF territory,
//       out of this task's explicit scope) — their messages remain defined
//       in the catalogue (not deleted) but are currently unreachable via
//       real signals. This is an honest simplification, not a fabrication.
//
//   DROP (no canonical equivalent anywhere in the schema, zero live
//   callers depended on them, retired along with the synthetic import):
//     - CompanyProfile's legal_form / foundation_year / contact_role /
//       employee_count-as-profile-field (analytics.tenant only has
//       company_name / industry_code / country_code).
//     - RawProgramDataSummary in full (program counts, budgets, data
//       sources, upload_status) — no live ingestion-summary table exists.
//     - HRKPIContextSummary in full — no live HR KPI table exists; CLAUDE.md
//       §12.16 confirms HR KPI is an interpretation layer, not yet a stored
//       Foundation Light entity.
//
//   KEEP AS STATIC CODE (not DB data, never varied per company in the seed
//   either — 5 fixed stage/label/href/description entries):
//     - pipelineLinks.

import type { OnboardingReadinessCheck, PipelineStageLink, CompanyOnboardingStatus } from '@/lib/types';
import {
  buildWorkforceBaselineView,
  FOUNDATION_LIGHT_MINIMUM_WORKERS,
  type WorkforceBaselineRow,
  type WorkforceBaselineGroupView,
  type TenantIdentity,
} from './workforce-baseline-view';

export interface TenantOnboardingRow extends TenantIdentity {
  id: string;
  onboarding_status: string;
  data_readiness_status: string;
  decision_pack_status: string;
}

export interface CompanyOnboardingView {
  tenantId: string;
  tenantCode: string;
  companyName: string;
  hasWorkforceBaseline: boolean;
  isFoundationLightEligible: boolean;
  minimumCompanyThreshold: number;
  privacyThresholdWarnings: WorkforceBaselineGroupView[];
  readinessChecks: OnboardingReadinessCheck[];
  pipelineReadiness: { status: 'ok' | 'warning' | 'blocked'; blocking_checks: OnboardingReadinessCheck[] };
  nextBestAction: { action: string; detail: string };
  pipelineLinks: PipelineStageLink[];
}

// Static navigation metadata — identical across every company, exactly as
// the synthetic seed's own pipeline_links already were (all 5 stages fixed
// hrefs/labels/descriptions; only a per-company `status` ever varied in
// principle, and the seed itself never actually varied it either).
export const PIPELINE_LINKS: PipelineStageLink[] = [
  { stage: '1-ingestion',    label: 'AI Ingestion Studio', href: '/company/ingestion',  status: 'active', description: 'Parsing file, rilevazione colonne, classificazione BCM taxonomy' },
  { stage: '2-uef-review',   label: 'UEF Review',          href: '/company/uef-review', status: 'active', description: 'Revisione UEF, approvazione / rifiuto record, supervisione quality gate' },
  { stage: '3-scoring',      label: 'Scoring Run',         href: '/company/scoring',    status: 'active', description: 'IU Engine, PIB, Company Aggregation, KORA Index Engine' },
  { stage: '4-decision-pack', label: 'Decision Pack',      href: '/company/reports',    status: 'active', description: 'Company Decision Pack con 8 sezioni executive, scenario S1/S2, raccomandazioni' },
  { stage: '5-kora-index',   label: 'KORA Index',          href: '/company/kora-index', status: 'active', description: 'Visualizza il KORA Index aggregato con Confidence Score e Activation Safeguard' },
];

// analytics.tenant.data_readiness_status is a free-text column (no CHECK
// constraint) — observed real values in provisioning code: 'intake_ready',
// 'complete' (ready-ish); 'incomplete' (schema default), 'not_started'
// (TenantService's own synthetic-only fallback, never written to the real
// table). Treated conservatively: ready unless explicitly one of the two
// known not-ready values.
const DATA_READINESS_NOT_READY_VALUES = new Set(['incomplete', 'not_started']);
function isDataReadinessReady(status: string): boolean {
  return !DATA_READINESS_NOT_READY_VALUES.has(status);
}

function isDecisionPackReady(status: string): boolean {
  return status === 'ready';
}

// ── Static Italian message catalogue — byte-identical to the retired
// synthetic service's own `actions` dictionary. Not fabricated; not
// re-authored. Preserved verbatim so no product copy is lost, even for the
// 4 keys the real-signal selector below cannot currently reach.
const NEXT_BEST_ACTION_CATALOGUE: Record<CompanyOnboardingStatus, { action: string; detail: string }> = {
  not_started:                    { action: 'Completa il profilo aziendale', detail: 'Inserisci settore, sede e dati di contatto.' },
  profile_complete:               { action: 'Carica la baseline workforce', detail: 'Definisci organico, siti e cluster per abilitare il breakdown.' },
  workforce_baseline_complete:    { action: 'Carica i dati programmi', detail: 'Uploada welfare, formazione e attività collettive tramite AI Ingestion.' },
  program_data_loaded:            { action: 'Aggiungi KPI HR di contesto', detail: 'I KPI HR arricchiscono l\'interpretazione senza entrare nel KORA Index.' },
  hr_kpi_added:                   { action: 'Avvia i controlli di prontezza', detail: 'Verifica che tutti i check bloccanti siano superati prima della pipeline.' },
  readiness_check_passed:         { action: 'Avvia la pipeline KORA', detail: 'Procedi con AI Ingestion Studio → UEF Review → Scoring → Decision Pack.' },
  pipeline_active:                { action: 'Attendi il completamento della pipeline', detail: 'La pipeline è in esecuzione. Monitora UEF Review e Scoring.' },
  decision_pack_ready:            { action: 'Consulta il Decision Pack', detail: 'Il KORA Company Decision Pack è pronto per la revisione.' },
  blocked_insufficient_workforce: { action: 'Aumenta l\'organico', detail: 'Foundation Light richiede almeno 30 lavoratori.' },
};

/**
 * Derives a funnel position from real, canonical signals only — analytics.tenant's
 * 3 status columns plus workforce_baseline existence/threshold. Never reads
 * profile richness, program data, or HR KPI (no live source); never reads
 * analytics.uef_record / scoring-run state (Ingestion/UEF, out of scope for
 * this task) to distinguish 'pipeline_active' from 'readiness_check_passed'.
 * Reachable positions: profile_complete (baseline not yet uploaded — company
 * profile itself is always already set by provisioning, so this is the real
 * first gap), blocked_insufficient_workforce, workforce_baseline_complete
 * (baseline present, data not yet loaded), readiness_check_passed (data
 * ready, decision pack not yet ready), decision_pack_ready.
 */
export function deriveOnboardingFunnelPosition(input: {
  hasWorkforceBaseline: boolean;
  isFoundationLightEligible: boolean;
  dataReadinessStatus: string;
  decisionPackStatus: string;
}): CompanyOnboardingStatus {
  if (!input.hasWorkforceBaseline) return 'profile_complete';
  if (!input.isFoundationLightEligible) return 'blocked_insufficient_workforce';
  if (isDecisionPackReady(input.decisionPackStatus)) return 'decision_pack_ready';
  if (!isDataReadinessReady(input.dataReadinessStatus)) return 'workforce_baseline_complete';
  return 'readiness_check_passed';
}

/**
 * Derives readiness checks from real signals only. 3 checks, all backed by
 * a genuine canonical source — see module header for the 3 DROPPED
 * synthetic-only checks (no live source, not fabricated here).
 */
function deriveReadinessChecks(input: {
  hasWorkforceBaseline: boolean;
  totalWorkers: number;
  suppressedGroupCount: number;
  totalGroupCount: number;
  dataReadinessStatus: string;
}): OnboardingReadinessCheck[] {
  const checks: OnboardingReadinessCheck[] = [];

  checks.push({
    check_id: 'workforce-threshold',
    label:    `Organico minimo (≥${FOUNDATION_LIGHT_MINIMUM_WORKERS} lavoratori)`,
    status:   !input.hasWorkforceBaseline ? 'blocked'
            : input.totalWorkers >= FOUNDATION_LIGHT_MINIMUM_WORKERS ? 'ok' : 'blocked',
    detail:   !input.hasWorkforceBaseline
              ? 'Nessuna baseline workforce caricata.'
              : `${input.totalWorkers} lavoratori — soglia ${input.totalWorkers >= FOUNDATION_LIGHT_MINIMUM_WORKERS ? 'soddisfatta' : 'non soddisfatta'}.`,
    blocking: true,
  });

  if (input.hasWorkforceBaseline) {
    checks.push({
      check_id: 'privacy-clusters',
      label:    'Cluster privacy N≥10',
      status:   input.suppressedGroupCount === 0 ? 'ok' : 'warning',
      detail:   input.suppressedGroupCount === 0
                ? `Tutti i ${input.totalGroupCount} cluster superano la soglia di privacy.`
                : `${input.suppressedGroupCount} di ${input.totalGroupCount} cluster sotto la soglia di privacy — esclusi dal breakdown.`,
      blocking: true,
    });
  }

  checks.push({
    check_id: 'data-readiness',
    label:    'Dati aziendali pronti per la pipeline',
    status:   isDataReadinessReady(input.dataReadinessStatus) ? 'ok' : 'warning',
    detail:   isDataReadinessReady(input.dataReadinessStatus)
              ? 'Dati pronti per l\'ingestion.'
              : 'Dati aziendali non ancora completi.',
    blocking: true,
  });

  return checks;
}

export function buildCompanyOnboardingView(
  tenant: TenantOnboardingRow,
  baseline: WorkforceBaselineRow | null,
): CompanyOnboardingView {
  const hasWorkforceBaseline = baseline !== null;
  const baselineView = baseline ? buildWorkforceBaselineView(baseline, tenant) : null;

  const isFoundationLightEligible = baselineView?.minimumCompanyThresholdMet ?? false;
  const privacyThresholdWarnings = (baselineView?.aggregateGroups ?? [])
    .filter((g) => g.employee_count < (baselineView?.minimumGroupSize ?? Infinity));

  const readinessChecks = deriveReadinessChecks({
    hasWorkforceBaseline,
    totalWorkers:         baselineView?.totalWorkers ?? 0,
    suppressedGroupCount: privacyThresholdWarnings.length,
    totalGroupCount:      baselineView?.aggregateGroups.length ?? 0,
    dataReadinessStatus:  tenant.data_readiness_status,
  });

  const blockingFailed = readinessChecks.filter((c) => c.blocking && c.status !== 'ok');
  const pipelineReadiness = blockingFailed.length > 0
    ? { status: 'blocked' as const, blocking_checks: blockingFailed }
    : { status: (readinessChecks.some((c) => c.status === 'warning') ? 'warning' : 'ok') as 'ok' | 'warning', blocking_checks: [] };

  const funnelPosition = deriveOnboardingFunnelPosition({
    hasWorkforceBaseline,
    isFoundationLightEligible,
    dataReadinessStatus: tenant.data_readiness_status,
    decisionPackStatus:  tenant.decision_pack_status,
  });

  const nextBestAction = NEXT_BEST_ACTION_CATALOGUE[funnelPosition];

  return {
    tenantId:                  tenant.id,
    tenantCode:                tenant.tenant_code,
    companyName:                tenant.company_name,
    hasWorkforceBaseline,
    isFoundationLightEligible,
    minimumCompanyThreshold:   FOUNDATION_LIGHT_MINIMUM_WORKERS,
    privacyThresholdWarnings,
    readinessChecks,
    pipelineReadiness,
    nextBestAction,
    pipelineLinks: PIPELINE_LINKS,
  };
}
