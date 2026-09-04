// CC-00 — B-TRUTH / ONE PRODUCT, ONE TRUTH — AdminPreview Cross-Company
// Canonicalization, Phase 1 (2026-09-06): getPlatformAnalyticsPreview() has
// been retired — its sole real caller (app/admin/page.tsx) now reads
// analytics.tenant/kora_index_result/confidence_result/source_batch
// directly via lib/live/admin-cross-company-view.ts. getIndexRegistryPreview()
// was NOT migrated at that time (see app/admin/page.tsx's own header for the
// security-architecture reason it was deferred).
//
// CC-00 — Index Registry canonicalization (2026-09-06, later the same day):
// the founder ratified DEMO_VIEWER's retirement, superseding the reason
// getIndexRegistryPreview() had been deferred. getIndexRegistryPreview() and
// its IndexRegistryEntry interface are now retired — app/demo/index-registry
// (its only reason to keep both a synthetic and a canonical version) is
// retired outright, and app/admin/page.tsx's own Intelligence Grid panel
// (its other real caller) now reads the same canonical
// analytics.kora_index_result rows Platform Analytics already fetches, via
// lib/live/admin-cross-company-view.ts's new buildIndexRegistryView(). The
// DEMO_VIEWER role itself is NOT removed in this change — other /demo/**
// routes still depend on it; this is one bounded step of a larger,
// already-planned retirement sequence.
//
// CC-00 — AI-Onboarding Duplicate Retirement (2026-09-06): five methods that
// simulated concepts already live and canonical elsewhere — getSourceIntakePreview
// and getMappingIntelligencePreview (duplicating app/admin/data-intake/page.tsx,
// header-labeled "CANONICAL — B154-B: entry point globale Data Intake",
// KORA_ADMIN-gated), getUefDraftQueuePreview and getHumanReviewPreview
// (duplicating app/admin/uef-review/page.tsx, KORA_ADMIN-gated, real
// interpreter-generated UEF review), and getScoringReadinessPreview
// (duplicating app/admin/pipeline/page.tsx's own real, canonical readiness
// signal, built across PRs #140-#146 of this same plan) — have been
// retired. Their sole real caller, app/demo/ai-onboarding/page.tsx (a
// DEMO_VIEWER-gated route, same security tier as Index Registry's demo
// caller), has been trimmed accordingly — no live data was introduced there,
// no synthetic replacement was added; the redundant simulation was simply
// removed, since the real capability already exists, canonically, elsewhere.
// This is capability-preserving, not capability-loss: nothing these methods
// simulated is gone from KORA — it was never uniquely implemented here.
// getAIOnboardingPreview (real admin-facing value, blocked by the same
// DEMO_VIEWER/live-data security question as Index Registry/Portfolio) and
// getPrivacyFilterPreview (static compliance/policy presentation, not a
// duplicated live feature) are both explicitly untouched, deferred.
//
// Every other method below (portfolio, benchmark, network, billing,
// founder-validation, gate status) is untouched — separate, later CC-00
// slices, no opportunistic cleanup. This service remains alive, NARROWED,
// not retired.
import companiesRaw from '@/data/synthetic/companies.json';
import koraIndexRaw from '@/data/synthetic/kora-index-outputs.json';
import sourceBatchesRaw from '@/data/synthetic/source-batches.json';

// ─── Raw seed shapes ───────────────────────────────────────────────────────────

interface SeedCompany {
  id: string; company_name?: string; sector?: string; country?: string;
  territory?: string; headcount?: number; headcount_in_scope?: number;
  program_status?: string; foundation_light_status?: string;
  data_completeness?: number; welfare_budget_eur_approx?: number;
  is_primary_demo_company?: boolean; demo_narrative?: string;
}

interface SeedKoraIndex {
  id: string; company_id: string; scenario_id: string;
  reporting_period: string; kora_index_value: number;
  safeguard_status: string; confidence_score: number;
  methodology_version_id: string; calibration_status: string;
}

interface SeedBatch {
  id: string; company_id: string; scenario_id: string;
  source_type: string; source_name?: string; batch_status: string;
  row_count: number; mapped_count: number; rejected_count?: number;
  completeness_pct: number; mapping_confidence_avg: number;
  evidence_attached_pct?: number; pending_review_count?: number;
}

const companies   = (companiesRaw as { data: SeedCompany[] }).data;
const koraOutputs = (koraIndexRaw as { data: SeedKoraIndex[] }).data;
const batches     = (sourceBatchesRaw as { data: SeedBatch[] }).data;

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface CompanyPortfolioEntry {
  id: string;
  company_name: string;
  sector: string;
  territory: string;
  headcount: number;
  data_completeness: number;
  status: string;
  kora_index_value: number | null;
  confidence_score: number | null;
  safeguard_status: string | null;
  is_primary_demo: boolean;
  demo_note: string;
}

export interface BenchmarkPreview {
  dimension: string;
  cluster_label: string;
  meridiana_index: number;
  cluster_avg: number;
  cluster_top_quartile: number;
  percentile: string;
}

export interface AdvisorEntry {
  id: string;
  name: string;
  specialization: string;
  assigned_companies: string[];
  pending_reviews: number;
  status: string;
}

export interface PartnerEntry {
  id: string;
  name: string;
  pillars: string[];
  territory: string;
  evidence_protocol_status: string;
  active_programs: number;
}

export interface BillingEntry {
  company_name: string;
  plan: string;
  setup_fee_eur: number;
  monthly_fee_eur: number;
  advisory_fee_eur: number;
  status: string;
}

export interface FounderValidationEntry {
  company_name: string;
  stage: 'prospect' | 'contacted' | 'demo_shown' | 'pilot_proposed' | 'pilot_active';
  potential_arr_eur: number;
  signal: string;
  next_action: string;
}

export interface GateStatusEntry {
  id: string;
  label: string;
  status: 'CLOSED' | 'OPEN';
  blocks: string;
}

export interface GateStatusPreview {
  gates: GateStatusEntry[];
  methodology_version_id: string;
  calibration_status: string;
  synthetic_demo: true;
}

// ─── Synthetic supplement for companies without scoring outputs ───────────────
// These values are consistent with the demo narratives in companies.json.
const SYNTHETIC_INDEX: Record<string, { kora_index_value: number; confidence_score: number; safeguard_status: string }> = {
  'nexo-digital':        { kora_index_value: 72, confidence_score: 0.82, safeguard_status: 'CLEAR' },
  'fortis-industrial':   { kora_index_value: 28, confidence_score: 0.45, safeguard_status: 'FLAGGED' },
  'communitas-cooperativa': { kora_index_value: 58, confidence_score: 0.61, safeguard_status: 'WARNING' },
};

const COMPANY_NAME_MAP: Record<string, string> = {
  'meridiana-group':       'Meridiana Group S.r.l.',
  'nexo-digital':          'Nexo Digital S.p.A.',
  'fortis-industrial':     'Fortis Industrial S.p.A.',
  'communitas-cooperativa': 'Communitas Cooperativa',
};

// ─── Service ──────────────────────────────────────────────────────────────────

class AdminPreviewService {
  // 1. Company Portfolio
  getCompanyPortfolioPreview(): CompanyPortfolioEntry[] {
    return companies.map((c): CompanyPortfolioEntry => {
      const realOutput = koraOutputs.find(
        (o) => o.company_id === c.id && o.scenario_id === 'S2',
      );
      const synthetic = SYNTHETIC_INDEX[c.id];
      const indexVal = realOutput?.kora_index_value ?? synthetic?.kora_index_value ?? null;
      const cs       = realOutput?.confidence_score ?? synthetic?.confidence_score ?? null;
      const safeguard = realOutput?.safeguard_status ?? synthetic?.safeguard_status ?? null;

      return {
        id: c.id,
        company_name: c.company_name ?? COMPANY_NAME_MAP[c.id] ?? c.id,
        sector: c.sector ?? '—',
        territory: c.territory ?? '—',
        headcount: c.headcount_in_scope ?? c.headcount ?? 0,
        data_completeness: c.data_completeness ?? 0,
        status: c.foundation_light_status ?? c.program_status ?? 'active',
        kora_index_value: indexVal,
        confidence_score: cs,
        safeguard_status: safeguard,
        is_primary_demo: c.is_primary_demo_company ?? false,
        demo_note: c.demo_narrative ?? '',
      };
    });
  }

  // 3. Benchmarks
  getBenchmarkPreview(): BenchmarkPreview[] {
    return [
      { dimension: 'Sector', cluster_label: 'Manufacturing & Logistics — Italy', meridiana_index: 54, cluster_avg: 51, cluster_top_quartile: 68, percentile: '75th' },
      { dimension: 'Territory', cluster_label: 'Northern Italy — Lombardy', meridiana_index: 54, cluster_avg: 58, cluster_top_quartile: 72, percentile: '65th' },
      { dimension: 'Company size', cluster_label: '200–300 employees', meridiana_index: 54, cluster_avg: 55, cluster_top_quartile: 70, percentile: '70th' },
    ];
  }

  // 4. Advisor Network
  getAdvisorNetworkPreview(): AdvisorEntry[] {
    return [
      { id: 'adv-001', name: 'Dr. Francesca Lombardi', specialization: 'LIFE / Preventive health', assigned_companies: ['Meridiana Group S.r.l.'], pending_reviews: 3, status: 'active' },
      { id: 'adv-002', name: 'Marco Russo', specialization: 'IMPACT / ESG certification', assigned_companies: ['Nexo Digital S.p.A.', 'Communitas Cooperativa'], pending_reviews: 7, status: 'active' },
      { id: 'adv-003', name: 'Ing. Carla Bianchi', specialization: 'GROWTH / Skills & upskilling', assigned_companies: ['Fortis Industrial S.p.A.'], pending_reviews: 1, status: 'active' },
      { id: 'adv-004', name: 'Prof. Alessandro Ferri', specialization: 'LEGACY / Knowledge transfer', assigned_companies: [], pending_reviews: 0, status: 'available' },
    ];
  }

  // 5. Partner Network
  getPartnerNetworkPreview(): PartnerEntry[] {
    return [
      { id: 'partner-mindspace',   name: 'MindSpace Wellness',   pillars: ['LIFE'],             territory: 'Milan',           evidence_protocol_status: 'audit_completato',  active_programs: 3 },
      { id: 'partner-nutriwell',   name: 'NutriWell Italia',     pillars: ['LIFE'],             territory: 'Italy (remote)',  evidence_protocol_status: 'audit_completato',  active_programs: 2 },
      { id: 'partner-mediflex',    name: 'MediFlex Health',      pillars: ['LIFE'],             territory: 'Lombardy',        evidence_protocol_status: 'audit_completato',  active_programs: 4 },
      { id: 'partner-learningpro', name: 'LearningPro Academy',  pillars: ['GROWTH'],           territory: 'Italy',           evidence_protocol_status: 'audit_parziale',    active_programs: 5 },
      { id: 'partner-growthlab',   name: 'GrowthLab Skills',     pillars: ['GROWTH', 'LEGACY'], territory: 'Milan',           evidence_protocol_status: 'audit_parziale',    active_programs: 2 },
      { id: 'partner-communit8',   name: 'Communit8 Social',     pillars: ['CONNECTION', 'IMPACT'], territory: 'Northern Italy', evidence_protocol_status: 'audit_in_corso', active_programs: 1 },
    ];
  }

  // 6. Platform Analytics — RETIRED (2026-09-06, CC-00 Phase 1). Migrated to
  // canonical analytics.tenant/kora_index_result/confidence_result/source_batch
  // via lib/live/admin-cross-company-view.ts's buildAdminPlatformAnalyticsView(),
  // fetched server-side by app/admin/page.tsx (its sole real caller). Zero
  // remaining real/type-only callers of this method confirmed by repo-wide
  // grep before removal.

  // 7. Billing & Revenue (mock — no real payments)
  getBillingRevenuePreview(): BillingEntry[] {
    return [
      { company_name: 'Meridiana Group S.r.l.',  plan: 'Foundation Pilot',     setup_fee_eur: 4500, monthly_fee_eur: 1200, advisory_fee_eur: 2400, status: 'demo' },
      { company_name: 'Nexo Digital S.p.A.',      plan: 'Foundation Pilot',     setup_fee_eur: 4500, monthly_fee_eur: 1200, advisory_fee_eur: 1800, status: 'demo' },
      { company_name: 'Fortis Industrial S.p.A.', plan: 'Enterprise Pilot',     setup_fee_eur: 8000, monthly_fee_eur: 2400, advisory_fee_eur: 4800, status: 'demo' },
      { company_name: 'Communitas Cooperativa',   plan: 'Social Enterprise',    setup_fee_eur: 2200, monthly_fee_eur:  750, advisory_fee_eur: 1200, status: 'demo' },
    ];
  }

  // 8. Founder Validation / GTM
  getFounderValidationPreview(): FounderValidationEntry[] {
    return [
      { company_name: 'Meridiana Group S.r.l.',  stage: 'pilot_active',    potential_arr_eur: 28800, signal: 'Pilot running — Q1–Q4 2025', next_action: 'Score review call — Jan 2026' },
      { company_name: 'Nexo Digital S.p.A.',      stage: 'demo_shown',      potential_arr_eur: 19200, signal: 'HR Director interested', next_action: 'Pilot proposal — Feb 2026' },
      { company_name: 'Fortis Industrial S.p.A.', stage: 'pilot_proposed',  potential_arr_eur: 43200, signal: 'CFO concern about ROI', next_action: 'Evidence review + FLAGGED scenario walkthrough' },
      { company_name: 'Communitas Cooperativa',   stage: 'contacted',       potential_arr_eur: 11000, signal: 'KORA Contribution fit strong', next_action: 'Intro call — Feb 2026' },
      { company_name: 'TerraFlex Agri S.r.l.',    stage: 'prospect',        potential_arr_eur: 16800, signal: 'Inbound — ESG team', next_action: 'Qualify sector fit' },
      { company_name: 'Gruppo Solidale S.c.',      stage: 'prospect',        potential_arr_eur: 9600,  signal: 'Cooperative network referral', next_action: 'Qualify — social enterprise plan' },
    ];
  }

  // 9. Gate & Methodology Status
  getGateStatusPreview(): GateStatusPreview {
    return {
      methodology_version_id: 'KORA Index v1.0',
      calibration_status: 'pre_empirical_calibration',
      synthetic_demo: true,
      gates: [
        { id: 'G1', label: 'Gate 1 — Product Scope',          status: 'CLOSED', blocks: 'None — Foundation Light scope confirmed' },
        { id: 'G2', label: 'Gate 2 — CTO Architecture Review', status: 'OPEN',   blocks: 'SQL DDL · Prisma · Supabase · Production DB · Production auth' },
        { id: 'G3', label: 'Gate 3 — Legal / Privacy',         status: 'OPEN',   blocks: 'Live company data · Real worker accounts · HRIS/LMS integrations' },
        { id: 'G5', label: 'Gate 5 — Tax / Fiscal Advisor',    status: 'OPEN',   blocks: 'Live fiscal outputs · Automated guardrail enforcement · Tax advice' },
      ],
    };
  }
}

// ─── AI Onboarding Engine interfaces ─────────────────────────────────────────

export interface CompanyOnboardingStatus {
  company_id: string;
  company_name: string;
  onboarding_status: string;
  current_phase: string;
  scoring_readiness: 'ready' | 'partial' | 'blocked';
  source_batch_count: number;
  approved_batches: number;
  pending_review_batches: number;
  synthetic_demo: true;
}

export interface PrivacyFilterPreview {
  sensitive_fields_detected: number;
  sensitive_fields_excluded: number;
  excluded_categories: string[];
  no_external_llm_on_hr_data: true;
  no_employer_access_individual: true;
  pseudonymization_applied: true;
}

// ─── Extended AdminPreviewService ─────────────────────────────────────────────

export const adminPreviewService = new (class extends AdminPreviewService {

  // A. Company onboarding status (Meridiana — primary demo company)
  getAIOnboardingPreview(): CompanyOnboardingStatus {
    const meridianaS1 = batches.filter(
      (b) => b.company_id === 'meridiana-group' && b.scenario_id === 'S1',
    );
    const approved = meridianaS1.filter((b) => b.batch_status === 'approved').length;
    const pending  = meridianaS1.filter((b) => b.batch_status !== 'approved').length;

    return {
      company_id: 'meridiana-group',
      company_name: 'Meridiana Group S.r.l.',
      onboarding_status: 'Foundation Light demo ready — partial review required',
      current_phase: 'Source mapping complete · UEF review preparation',
      scoring_readiness: approved >= 2 ? 'partial' : 'blocked',
      source_batch_count: meridianaS1.length,
      approved_batches: approved,
      pending_review_batches: pending,
      synthetic_demo: true,
    };
  }

  // D. Privacy filter — inline synthetic preview
  getPrivacyFilterPreview(): PrivacyFilterPreview {
    return {
      sensitive_fields_detected: 14,
      sensitive_fields_excluded: 14,
      excluded_categories: [
        'Email addresses',
        'Phone numbers',
        'Postal addresses',
        'Tax identifiers (codice fiscale)',
        'Health and clinical details',
        'Free-text personal notes',
        'Diagnostic or therapist references',
      ],
      no_external_llm_on_hr_data: true,
      no_employer_access_individual: true,
      pseudonymization_applied: true,
    };
  }

})();
