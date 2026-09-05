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
// CC-00 — Company Portfolio capability salvage + canonicalization
// (2026-09-12): getCompanyPortfolioPreview() is RETIRED, not migrated —
// re-verification found the real capability it simulated already exists,
// canonically, at app/admin/companies/page.tsx ("Company Console" — real,
// KORA_ADMIN-gated, DB-backed live tenant registry with lifecycle status,
// users, workforce headcount via personal.workforce_baseline, current KORA
// Index + Confidence Score + Safeguard, submissions, and Decision Pack
// status — every dimension this method simulated, and several more).
// app/admin/page.tsx's own "Company Readiness Matrix" panel (its other real
// caller) now reads the SAME already-fetched, already-canonical `registry`
// array (analytics.tenant + analytics.kora_index_result, via
// lib/live/admin-cross-company-view.ts's buildIndexRegistryView() — already
// proven by tests/integration/rls-20-admin-cross-company-analytics.test.ts)
// it already fetches for the Intelligence Grid's KORA Index™ Registry panel
// — no second query, no new method. Fields that had no canonical home
// (sector, territory, is_primary_demo, demo_note) were not migrated — see
// this slice's own regression test and lib/architecture/registry.ts's
// svc.admin-preview entry for the full field-by-field disposition.
//
// CC-00 — Admin Console panel-by-panel canonicalization (2026-09-19):
// "No panel survives merely because it exists today." Re-verified every
// remaining method against its actual Admin/demo callers and any canonical
// data support:
//   - getPartnerNetworkPreview() RETIRED — its sole caller was Admin Home's
//     "Partner Network" panel (fake evidence_protocol_status/active_programs
//     for 6 fictional partners). A real canonical network.partner_profile
//     table exists (used by app/partner/workspace), but has no equivalent
//     for evidence_protocol_status or active_programs — canonicalizing
//     would mean inventing those fields, forbidden by this slice's own
//     scope. Zero callers remained once removed from Admin Home — deleted
//     outright, not deferred-in-place. Deferred as a real NETWORK-track
//     capability (see lib/architecture/registry.ts).
//   - getBillingRevenuePreview() RETIRED — Foundation Light has zero billing
//     authority (CLAUDE.md Red Line: no payments/wallet/checkout), it had
//     zero demo caller, and Admin Home's own panel title already called it
//     "(mock)". Deleted outright.
//   - getPrivacyFilterPreview() MOVED — its content is real, accurate,
//     always-true KORA privacy policy, not a synthetic "preview" of
//     variable state; it never belonged in a Preview-simulation service.
//     Inlined directly into its sole caller, app/demo/ai-onboarding/page.tsx.
//   - getBenchmarkPreview(), getAdvisorNetworkPreview(),
//     getFounderValidationPreview(), getGateStatusPreview(), and
//     getAIOnboardingPreview() are UNTOUCHED as methods — each still has a
//     legitimate demo caller (per PART 17 of this slice's own task: "do not
//     force retirement of methods with legitimate residual callers"). What
//     changed is Admin Home's consumption of them — see app/admin/page.tsx's
//     own header comment for the panel-by-panel disposition (advisor/partner
//     network panels removed as unfounded synthetic product truth; billing
//     panel removed; GTM Founder Cockpit panel removed in favor of the
//     already-existing real internal tool at app/admin/founder-validation;
//     gate status kept as accurate static governance config; AI onboarding's
//     two priority-queue signals replaced by already-fetched canonical
//     aggregate fields, one signal dropped outright rather than invented).
import sourceBatchesRaw from '@/data/synthetic/source-batches.json';

// ─── Raw seed shapes ───────────────────────────────────────────────────────────

interface SeedBatch {
  id: string; company_id: string; scenario_id: string;
  source_type: string; source_name?: string; batch_status: string;
  row_count: number; mapped_count: number; rejected_count?: number;
  completeness_pct: number; mapping_confidence_avg: number;
  evidence_attached_pct?: number; pending_review_count?: number;
}

const batches     = (sourceBatchesRaw as { data: SeedBatch[] }).data;

// ─── Public interfaces ────────────────────────────────────────────────────────

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

// ─── Service ──────────────────────────────────────────────────────────────────

class AdminPreviewService {
  // 1. Company Portfolio — RETIRED (2026-09-12, CC-00 Company Portfolio
  // capability salvage + canonicalization). See the header comment above
  // and lib/architecture/registry.ts's svc.admin-preview entry for the
  // full rationale and field-by-field disposition.

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

  // 5. Partner Network — RETIRED (2026-09-19, CC-00 Admin Console
  // canonicalization). Its sole caller, Admin Home's "Partner Network"
  // panel, is removed — a real canonical network.partner_profile table
  // exists but has no evidence_protocol_status/active_programs equivalent;
  // canonicalizing here would mean inventing those fields. See this slice's
  // own regression test and lib/architecture/registry.ts's svc.admin-preview
  // entry for the full disposition and the deferred NETWORK-track capability.

  // 6. Platform Analytics — RETIRED (2026-09-06, CC-00 Phase 1). Migrated to
  // canonical analytics.tenant/kora_index_result/confidence_result/source_batch
  // via lib/live/admin-cross-company-view.ts's buildAdminPlatformAnalyticsView(),
  // fetched server-side by app/admin/page.tsx (its sole real caller). Zero
  // remaining real/type-only callers of this method confirmed by repo-wide
  // grep before removal.

  // 7. Billing & Revenue — RETIRED (2026-09-19, CC-00 Admin Console
  // canonicalization). Foundation Light has zero billing/payment product
  // authority (CLAUDE.md Red Line: no payments, no wallet, no checkout).
  // Zero demo caller ever existed for this method — Admin Home was its
  // only caller, and its own panel title already called it "(mock)".
  // Deleted outright, not deferred — there is no future KORA billing
  // product capability implied here to defer.

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

// PrivacyFilterPreview / getPrivacyFilterPreview() MOVED (2026-09-19, CC-00
// Admin Console canonicalization) — its content is real, accurate, always-
// true KORA privacy policy, not a synthetic "preview" of variable state; it
// never belonged in a Preview-simulation service. Inlined as a local
// constant directly in its sole caller, app/demo/ai-onboarding/page.tsx.

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

})();
