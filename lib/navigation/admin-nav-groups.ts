// lib/navigation/admin-nav-groups.ts — B169 FASE 3+4
// KORA_ADMIN sidebar navigation — data-driven, testable, separated from component.
// FASE 4 items: non-redundant Demo Lab items from docs/sprint-B169/redundancy-analysis.md.

export interface AdminNavItem {
  label:        string;
  href:         string;
  tag?:         string;   // badge key for item-level rendering
  comingSoon?:  boolean;
  inactive?:    boolean;
}

export interface AdminNavGroup {
  id:              string;
  label:           string;
  environmentTag?: string;  // group-level badge (LIVE, SYNTHETIC, ROADMAP, FOUNDER)
  items:           AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id:    'pilot-lifecycle',
    label: 'Pilot Lifecycle',
    items: [
      { label: 'Pipeline & Trials',   href: '/admin/pipeline' },
      { label: 'Founder Validation',  href: '/admin/founder-validation' },
    ],
  },
  {
    id:    'companies',
    label: 'Companies',
    items: [
      { label: 'All Companies',    href: '/admin/companies' },
      { label: 'Tenant Registry',  href: '/admin/tenants' },
      // KORA-WP-012 (Founder ruling READING A — SURFACE, 2026-09-21): restores
      // the one inbound link this real capability lost as a side effect of
      // B9.2's sidebar restructure (acb3a73), not by any decision to retire it.
      // It is the only surface rendering baseline threshold validation and the
      // N>=10 aggregate groups; the write paths (/admin/tenants,
      // CompanyWorkspacePanel) render neither and are unaffected.
      { label: 'Workforce Baseline', href: '/admin/companies/workforce-baseline' },
    ],
  },
  {
    id:    'governance',
    label: 'Privacy & Governance',
    items: [
      { label: 'Governance & Privacy',   href: '/admin/governance' },
    ],
  },
  {
    id:    'operations',
    label: 'Operations',
    items: [
      { label: 'Submission Queue',       href: '/admin/data-intake' },
      { label: 'UEF Review & Scoring',   href: '/admin/uef-review' },
      { label: 'Impact Units',           href: '/admin/impact-units' },
      { label: 'Data Lifecycle',         href: '/admin/data-lifecycle' },
      { label: 'Worker Provisioning',    href: '/admin/workers' },
      { label: 'Trial Control Center',   href: '/admin/trial-control-center' },
      { label: 'KORA Link',              href: '/admin/kora-link' },
      { label: 'KORA Link — Governance (Anteprima)', href: '/admin/kora-link/governance' },
      { label: 'KORA Link — Pilot Readiness Checklist', href: '/admin/kora-link/pilot-readiness' },
      { label: 'Case',                   href: '/admin/cases' },
      // Restored to normal Admin navigation by KORA-WP-125 (§5 targeted
      // classification, 2026-09-20). VERDICT A — legitimate real Product
      // capability whose navigation label had remained demo-era.
      // Evidence: app/api/admin/operator-flow/route.ts drives the CANONICAL
      // engine — getSupabaseServiceClient() + classifyEligibilityBatch +
      // runKoraPipeline + persistKoraComputationResult /
      // persistWorkforceBaseline / persistDecisionPack — not a simulator;
      // svc.scoring-simulator has been DEAD/DELETED since CC-00 Final Scoring
      // Canonicalization (2026-09-05), so no demo scoring runtime exists for
      // it to belong to; the page is requireKoraAdmin-guarded and performs
      // irreversible governed actions. It operates on tenant OP-001, which
      // Governance Patch 03 itself describes as a synthetic TENANT processed
      // through canonical services — precisely what One Product permits
      // ("a synthetic example company is an ordinary tenant, not a parallel
      // mode"). The old label "Demo Scoring (Synthetic)" described the data,
      // not the runtime, and is replaced by the page's own canonical identity
      // ("A-OP: Operator Console"). Placed in the existing Operations group
      // beside the other scoring-pipeline destinations — no new IA.
      { label: 'Operator Console', href: '/admin/operator' },
    ],
  },
  {
    id:    'network-content',
    label: 'Network & Content',
    items: [
      { label: 'KORA Space Moderation',  href: '/admin/commons' },
      { label: 'Worker Initiatives',     href: '/admin/worker-initiatives' },
      { label: 'Partner Map',            href: '/admin/partners' },
      { label: 'Partner Ecosystem Model', href: '/admin/partner-ecosystem-model' },
      { label: 'KORA Activation Layer',  href: '/admin/kora-activation-layer' },
      { label: 'Activation Signal Pipeline', href: '/admin/activation-signal-pipeline' },
      // Relocated from the retired 'Demo Lab' group (KORA-WP-125, One Product /
      // No Demo Runtime). /commons is a real Product capability, not demo:
      // CC-052 (2026-08-31) retired its synthetic-preview path and it now reads
      // live commons.post. Only its GROUP placement changed — same route, same
      // label, same role visibility.
      { label: 'KORA Commons Network', href: '/commons' },
    ],
  },
  // ── 'Demo Lab' group RETIRED — KORA-WP-125, 2026-09-20 ────────────────────
  // Canonical authority: docs/KORA_OFFICIAL_IMPLEMENTATION_MASTER_PLAN_v2.1_PATCH_03.md
  // ("One Product / No Demo Runtime", Founder ruling 2026-08-31) and Master
  // Plan v2.1 §13 — demo and live share the UI; the only difference is where
  // the data came from. A navigation group whose purpose is demo orchestration,
  // carrying a SYNTHETIC badge, is an architecture-driven demo indication and is
  // not permitted in the authenticated Product.
  //
  // Disposition of its three destinations, classified before removal:
  //   /commons              REAL capability -> relocated to 'network-content'.
  //   /admin/demo/acme-001  DEMO-ONLY -> removed from Product navigation. The
  //                         route is NOT deleted; it stays part of the
  //                         separately-governed showcase island (D-C), which no
  //                         authenticated Product surface may depend on.
  //   /admin/operator       UNKNOWN - ESCALATED, not silently decided. Its page
  //                         header describes a real Operator scoring console
  //                         ("scoring run wizard per KORA_ADMIN ... azioni
  //                         irreversibili"); its nav label said "Demo Scoring
  //                         (Synthetic)". Those contradict. The route is
  //                         untouched and still reachable; it is absent from
  //                         navigation only until the Founder rules which it is,
  //                         because surfacing a "(Synthetic)" label would itself
  //                         breach the ruling above.
  {
    id:    'platform',
    label: 'Platform',
    items: [
      { label: 'Diagnostics',    href: '/admin/platform/diagnostics' },
      { label: 'Future Vision',  href: '/admin/future-vision', inactive: true },
    ],
  },
];
