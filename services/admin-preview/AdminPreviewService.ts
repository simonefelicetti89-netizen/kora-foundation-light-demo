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
// retired.
//
// CC-00 — Company Portfolio capability salvage + canonicalization
// (2026-09-12): getCompanyPortfolioPreview() is RETIRED, not migrated —
// re-verification found the real capability it simulated already exists,
// canonically, at app/admin/companies/page.tsx ("Company Console").
//
// CC-00 — Admin Console panel-by-panel canonicalization (2026-09-19):
// getPartnerNetworkPreview() and getBillingRevenuePreview() RETIRED
// outright (zero remaining callers / zero product authority).
// getPrivacyFilterPreview() MOVED — inlined at its sole caller,
// app/demo/ai-onboarding/page.tsx (real, accurate, always-true privacy
// policy, never actually a synthetic "preview"). getBenchmarkPreview(),
// getAdvisorNetworkPreview(), getFounderValidationPreview(),
// getGateStatusPreview(), and getAIOnboardingPreview() were kept — each
// still had a legitimate demo caller at that time.
//
// CC-00 — Residual /demo/** controlled retirement (2026-09-26): every one
// of those legitimate demo callers is now itself retired — "no demo route
// survives merely because it still has a caller." Four more methods are
// retired outright, each confirmed zero-caller before deletion:
//   - getBenchmarkPreview() — its sole caller, app/demo/benchmarks/page.tsx,
//     is retired. The page's own header comment already stated the deferred
//     rationale ("nessun benchmark empirico disponibile prima della
//     calibrazione Delphi post-pilot") — matching CLAUDE.md §6 exactly, so
//     nothing new needed recording; the requirement was already preserved.
//   - getAdvisorNetworkPreview() — its sole caller, app/demo/network/page.tsx,
//     is retired. A real, future-valid Advisor/Partner Network capability
//     is deferred (NETWORK track) — see lib/architecture/registry.ts.
//   - getFounderValidationPreview() — its sole caller, app/demo/gtm/page.tsx,
//     is retired. The real internal tool for this already exists at
//     app/admin/founder-validation (established CC-00 Admin Console
//     canonicalization, 2026-09-19).
//   - getAIOnboardingPreview() — its sole caller, app/demo/ai-onboarding/page.tsx,
//     is retired. Admin already absorbed the real onboarding signal in the
//     Admin Console canonicalization slice; the demo route's remaining
//     content was either 100% synthetic (company onboarding status,
//     hardcoded to 'meridiana-group') or real static privacy policy with no
//     further need for a live page (its facts are recorded in
//     lib/architecture/registry.ts's app-surface.demo entry).
// This also retires that method's sole synthetic import,
// data/synthetic/source-batches.json (deleted — zero-consumer repo-wide,
// verified before deletion) and its SeedBatch/batches supporting code.
//
// getGateStatusPreview() is the ONLY method that survives: it has a real,
// non-demo caller (app/admin/page.tsx's "Gate & Methodology" panel,
// established CC-00 Admin Console canonicalization) and is real, accurate,
// static project-governance configuration — not synthetic. This file now
// has ZERO data/synthetic/** imports and is removed from the I9 allowlist
// entirely (was 1 of 11 files; now 0). See
// tests/unit/cc00-residual-demo-retirement.test.ts.

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

class AdminPreviewService {
  // Gate & Methodology Status — real, accurate, static project-governance
  // configuration (matches CLAUDE.md's own gate-status footer). Not
  // synthetic, not tenant-specific — true for every viewer, every render.
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

export const adminPreviewService = new AdminPreviewService();
