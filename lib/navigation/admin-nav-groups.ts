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
    ],
  },
  {
    id:    'network-content',
    label: 'Network & Content',
    items: [
      { label: 'KORA Space Moderation',  href: '/admin/commons' },
      { label: 'Worker Initiatives',     href: '/admin/worker-initiatives' },
      { label: 'Partner Map',            href: '/admin/partners' },
    ],
  },
  {
    id:             'demo-lab',
    label:          'Demo Lab',
    environmentTag: 'SYNTHETIC',
    // FASE 4: all non-redundant items from docs/sprint-B169/redundancy-analysis.md.
    // 6 /demo/company/* items EXCLUDED — RIDONDANTI (useRole + accessible via VISTA).
    items: [
      { label: 'Guided Demo (ACME-001)',   href: '/admin/demo/acme-001' },
      { label: 'KORA Commons Network',     href: '/commons' },
      { label: 'Registro KORA Index',      href: '/demo/index-registry' },
      { label: 'Portfolio Aziende',        href: '/demo/portfolio' },
      { label: 'Rete Advisor & Partner',   href: '/demo/network' },
      { label: 'Demo Scoring (Synthetic)', href: '/admin/operator' },
      { label: 'Anteprima Classificazione',href: '/demo/ai-onboarding' },
      { label: 'GTM Preview',              href: '/demo/gtm' },
      { label: 'Benchmark Preview',        href: '/demo/benchmarks' },
      { label: 'Demo Guide',               href: '/demo/guide' },
    ],
  },
  {
    id:    'platform',
    label: 'Platform',
    items: [
      { label: 'Diagnostics',    href: '/admin/platform/diagnostics' },
      { label: 'Future Vision',  href: '/admin/future-vision', inactive: true },
    ],
  },
];
