// tests/unit/kora-wp-012-workforce-baseline-reachability.test.ts
//
// KORA-WP-012 — Access-Path Correctness Fix: workforce-baseline Reachability.
//
// THE RULING THIS SUITE ENCODES — Founder, 2026-09-21: READING A, SURFACE.
//
// The canonical defect (`ADMIN-022`, from `39`'s UNK-06) is UNDER-reachability
// of a real Admin capability, not duplication: `46_GLOBAL_GAP_MATRIX` states
// "Real page, no inbound nav … add a nav link or confirm out-of-band", risk
// "Real capability unreachable in-app", owner "product-owner decision". The
// Founder chose "add a nav link", and ruled that Registry 219/102's summary
// wording ("one duplicate route removed") is NOT authority to delete unique
// capability: "exactly one canonical path" binds at the CAPABILITY-ownership
// level. `/admin/companies/workforce-baseline` owns aggregate/validation
// inspection; `/admin/tenants` and CompanyWorkspacePanel own the write
// workflows. One capability family, distinct legitimate entry points.
//
// Git evidence for why the link was missing at all: f00346b created the page
// AND its nav entry; acb3a73 (B9.2 sidebar restructure) deleted the whole
// "Aziende Cliente" group, taking this entry with it as a side effect. No
// decision ever retired the page. WP-012 restores exactly that one entry.
//
// The assertions below guard SEMANTIC truth, not prose formatting.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { ADMIN_NAV_GROUPS } from '@/lib/navigation/admin-nav-groups';
import { resolveRouteContext } from '@/lib/navigation/route-context';
import { navIconFor } from '@/components/layout/nav-icons';
import { groupDisplayLabel } from '@/app/admin/companies/workforce-baseline/page';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

// Executable source only: block comments, the JSX-wrapped form included, and
// line comments are documentation, not behaviour — a guard that reads them
// proves nothing about what the page actually does.
const code = (rel: string) =>
  read(rel)
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

const ADMIN_ROUTE   = '/admin/companies/workforce-baseline';
const ADMIN_PAGE    = 'app/admin/companies/workforce-baseline/page.tsx';
const COMPANY_PAGE  = 'app/company/workforce-baseline/page.tsx';
const API_ROUTE     = 'app/api/admin/workforce-baseline/route.ts';

const adminItems = () => ADMIN_NAV_GROUPS.flatMap((g) => g.items);

// ── A — the capability still exists ───────────────────────────────────────

describe('KORA-WP-012 (A) — the Admin workforce-baseline surface exists', () => {
  it('the page is present', () => {
    expect(exists(ADMIN_PAGE)).toBe(true);
  });

  it('it still renders the capability nothing else in the Product renders', () => {
    const page = read(ADMIN_PAGE);
    // Threshold validation, the N>=10 group rule and the aggregate dimension
    // view exist ONLY here — the two write surfaces render none of them.
    expect(page).toContain('minimumCompanyThresholdMet');
    expect(page).toContain('minimumGroupSize');
    expect(page).toContain('aggregateGroups');
    expect(page).toContain('share_of_workforce');
  });
});

// ── B/C — reachable from normal Admin navigation, exactly once ────────────

describe('KORA-WP-012 (B/C) — reachable from normal Admin navigation', () => {
  it('a normal Admin navigation item targets the route', () => {
    expect(adminItems().map((i) => i.href)).toContain(ADMIN_ROUTE);
  });

  it('exactly one Admin navigation item targets it — no duplicate entry', () => {
    const hits = adminItems().filter((i) => i.href === ADMIN_ROUTE);
    expect(hits).toHaveLength(1);
  });

  it('it lives in the existing companies group — no new information architecture', () => {
    const groupIds = ADMIN_NAV_GROUPS.map((g) => g.id);
    expect(groupIds).toEqual(['pilot-lifecycle', 'companies', 'governance', 'operations', 'network-content', 'platform']);
    const group = ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.href === ADMIN_ROUTE));
    expect(group?.id).toBe('companies');
  });

  it('it is normal Product navigation — not demo, preview, synthetic, inactive or coming-soon', () => {
    const item = adminItems().find((i) => i.href === ADMIN_ROUTE)!;
    expect(item.inactive).toBeUndefined();
    expect(item.comingSoon).toBeUndefined();
    expect(item.tag).toBeUndefined();
    expect(item.label).toBe('Workforce Baseline');
    const group = ADMIN_NAV_GROUPS.find((g) => g.items.some((i) => i.href === ADMIN_ROUTE))!;
    expect(group.environmentTag).toBeUndefined();
  });

  it('the route now resolves to its own chrome context instead of borrowing its parent\'s', () => {
    // Longest-match: before WP-012 this route resolved to "All Companies".
    expect(resolveRouteContext(ADMIN_ROUTE, 'KORA_ADMIN')).toEqual({
      section: 'Companies',
      page:    'Workforce Baseline',
    });
  });

  it('the collapsed rail gives it its own glyph — the Companies group stays navigable by shape', () => {
    // nav-icons.tsx's own invariant: one glyph per real destination, "so the
    // rail is navigable by shape and not a column of identical fallbacks".
    // At rail width the Companies group would otherwise show three identical
    // Building2 marks. Presentation only — no route, label or grouping moves.
    const icon = navIconFor(ADMIN_ROUTE);
    expect(icon).toBeTruthy();
    expect(icon).not.toBe(navIconFor('/admin/companies'));
    expect(icon).not.toBe(navIconFor('/admin/tenants'));
    expect(icon).not.toBe(navIconFor('/definitely-not-a-route'));
  });
});

// ── D — the Company boundary notice is preserved, unchanged ───────────────

describe('KORA-WP-012 (D) — the Company boundary notice is preserved', () => {
  it('the page still exists — WP-012 deletes nothing', () => {
    expect(exists(COMPANY_PAGE)).toBe(true);
  });

  it('it still exposes zero baseline capability: no API call, no service, no write', () => {
    const page = read(COMPANY_PAGE);
    expect(page).not.toContain('/api/admin/workforce-baseline');
    expect(page).not.toContain('persistWorkforceBaseline');
    expect(page).not.toMatch(/fetch\(/);
    expect(page).not.toMatch(/method:\s*'POST'/);
    expect(page).not.toContain('ingestionSimulatorService');
    expect(page).not.toContain('scoringSimulatorService');
  });

  it('workforce-baseline administration stays KORA-Admin-owned — the notice is not a Company nav destination', () => {
    const companyHrefs = read('components/layout/Sidebar.tsx');
    expect(companyHrefs).not.toContain("'/company/workforce-baseline'");
  });
});

// ── E/F — the write workflows are untouched ───────────────────────────────

describe('KORA-WP-012 (E/F) — the onboarding and per-company write paths are untouched', () => {
  it('/admin/tenants remains a legitimate onboarding path with its baseline write', () => {
    const panel = read('app/admin/tenants/_components/TenantOnboardingPanel.tsx');
    expect(panel).toContain("fetch('/api/admin/workforce-baseline'");
    expect(panel).toContain('handleUpdateBaseline');
    expect(adminItems().map((i) => i.href)).toContain('/admin/tenants');
  });

  it('the pilot onboarding checklist still routes its baseline step to /admin/tenants', () => {
    const checklist = read('components/admin/PilotOnboardingChecklist.tsx');
    expect(checklist).toContain('Baseline workforce');
    expect(checklist).toContain("route: '/admin/tenants'");
  });

  it('CompanyWorkspacePanel remains a legitimate per-company write workflow', () => {
    const panel = read('components/admin/CompanyWorkspacePanel.tsx');
    expect(panel).toContain("fetch('/api/admin/workforce-baseline'");
    expect(panel).toMatch(/method:\s*'POST'/);
    expect(exists('app/admin/companies/[companyId]/workspace/page.tsx')).toBe(true);
  });
});

// ── G/J — API, data and auth semantics unchanged ──────────────────────────

describe('KORA-WP-012 (G/J) — API, data and auth semantics unchanged', () => {
  it('the API keeps both GET forms, POST, the admin guard and the N>=10 delegation', () => {
    const api = read(API_ROUTE);
    expect(api).toContain('export async function GET');
    expect(api).toContain('export async function POST');
    expect(api).toContain('requireKoraAdmin');
    expect(api).toContain('persistWorkforceBaseline');
    expect(api).toContain("schema('personal').from('workforce_baseline')");
  });

  it('the canonical live view and writer still exist', () => {
    expect(exists('lib/live/workforce-baseline-view.ts')).toBe(true);
    expect(exists('lib/live/workforce-baseline.ts')).toBe(true);
  });

  it('the newly-reachable page is KORA_ADMIN-only by the existing layout contract', () => {
    const layout = read('app/admin/layout.tsx');
    expect(layout).toContain('requireKoraAdmin');
    expect(layout).toContain("redirect('/login?role_hint=admin')");
    // The page itself introduces no auth of its own and no write path.
    const page = read(ADMIN_PAGE);
    expect(page).not.toMatch(/method:\s*'POST'/);
  });
});

// ── H/I — nothing deleted, no schema movement ─────────────────────────────

describe('KORA-WP-012 (H/I) — nothing deleted, no schema change', () => {
  it('every pre-existing workforce-baseline surface still exists', () => {
    for (const p of [
      ADMIN_PAGE, COMPANY_PAGE, API_ROUTE,
      'app/admin/tenants/_components/TenantOnboardingPanel.tsx',
      'components/admin/CompanyWorkspacePanel.tsx',
      'components/admin/PilotOnboardingChecklist.tsx',
      'lib/live/workforce-baseline.ts',
      'lib/live/workforce-baseline-view.ts',
    ]) {
      expect(exists(p), `${p} was deleted — WP-012 deletes nothing`).toBe(true);
    }
  });

  it('no migration was added and no baseline schema was touched: 089 is still the highest', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    const highest = Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite));
    // INTEGRATION SUPERSESSION (canonical Product integration, 2026-09-22):
    // converted from equality to >=. This guard's intent is "THIS WP added no
    // migration of its own" — asserted independently by the filename-ownership
    // check, which still passes. 089 was the ceiling at this WP's own completion;
    // KORA-WP-066 legitimately raised it to 090 on the integrated line. Equality
    // is the brittle form the repository already documented a remedy for (see
    // tests/unit/kora-wp-029-manual-remap-governance.test.ts: "never equality,
    // same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046").
    expect(highest).toBeGreaterThanOrEqual(89);
    expect(files.some((f) => /wp[-_]?012|reachab/i.test(f))).toBe(false);
  });
});

// ── K — no Partner-equivalent scope invented ──────────────────────────────

describe('KORA-WP-012 (K) — no Partner equivalent, no WP-051 scope', () => {
  it('PARTNER-011\'s equivalent fix was not performed here', () => {
    // WP-012's own Out of Scope. No Partner navigation destination gained a
    // baseline surface, and no partner baseline route was created.
    const partnerBaselineItems = adminItems().filter(
      (i) => /partner/i.test(i.href) && /workforce|baseline/i.test(i.href),
    );
    expect(partnerBaselineItems).toEqual([]);
    expect(exists('app/admin/partners/workforce-baseline')).toBe(false);
    expect(exists('app/partner/workforce-baseline')).toBe(false);
  });
});


// ── L — visual remediation: WP-125 foundation, no page-local design system ─

describe('KORA-WP-012 (L) — the page consumes the WP-125 Product Experience', () => {
  const page = () => read(ADMIN_PAGE);

  it('it imports the shared primitives instead of re-declaring a visual system', () => {
    const src = page();
    expect(src).toContain("from '@/components/ui/px'");
    for (const primitive of ['PageHead', 'Workspace', 'Col', 'Region', 'Metric', 'MetricStrip', 'Facts', 'Status', 'Chip', 'Notice', 'StateBlock', 'SkeletonRows']) {
      expect(src, `${primitive} not consumed`).toContain(primitive);
    }
    expect(src).toContain("from '@/lib/design/kora-design-tokens'");
  });

  it('it composes the canonical working column + rail, not a stack of equal cards', () => {
    const src = page();
    expect(src).toContain('<Col span="main">');
    expect(src).toContain('<Col span="rail">');
  });

  it('no page-local design system, token file or breakpoint architecture was created', () => {
    expect(exists('app/admin/companies/workforce-baseline/workforce-baseline-tokens.css')).toBe(false);
    expect(exists('app/admin/companies/workforce-baseline/tokens.ts')).toBe(false);
    const src = page();
    expect(src).not.toMatch(/@media/);
    expect(src).not.toMatch(/\.css['"]/);
    // No legacy warm-paper / terracotta Product styling left on this route.
    expect(src).not.toContain('kora-paper');
    expect(src).not.toContain('199,111,61');
    expect(src).not.toContain('bg-kora-accent');
  });

  it('it carries no Foundation Light current-Product label', () => {
    expect(page()).not.toMatch(/Foundation Light/i);
  });
});

// ── M — the department/departments correctness fix ────────────────────────

describe('KORA-WP-012 (M) — the canonical dimension is selected from real data', () => {
  const page = () => read(ADMIN_PAGE);

  it('no hard-coded starting dimension survives', () => {
    const src = page();
    // The defect: useState<string>('department') never matched the canonical
    // plural key the writer emits, so the first render claimed there were no
    // groups while the data held one.
    expect(src).not.toContain("useState<string>('department')");
    expect(src).not.toMatch(/activeDimension.*=.*useState[^)]*'department'/);
  });

  it('the visible dimension is derived from the dimensions the API returned', () => {
    const src = page();
    expect(src).toContain('effectiveDimension');
    expect(src).toContain('dimensionKeys.includes(activeDimension)');
    expect(src).toContain('dimensionKeys[0]');
  });

  it('the label map resolves the canonical plural key as well as the legacy singular', () => {
    const src = page();
    expect(src).toContain('function dimensionLabel');
    expect(src).toContain("replace(/s$/, '')");
  });

  it('the canonical writer still emits the plural key this fix adapts to — the UI moved, not the data', () => {
    const api = read(API_ROUTE);
    expect(api).toContain('rawSegmentBreakdown: { departments:');
    expect(read('lib/live/workforce-baseline-view.ts')).toContain('Object.entries(row.segment_breakdown ?? {})');
  });
});

// ── N — privacy and read-only semantics survive the recomposition ─────────

describe('KORA-WP-012 (N) — privacy and read-only semantics preserved', () => {
  const page = () => read(ADMIN_PAGE);

  it('the N>=10 suppression rule is still stated on the surface', () => {
    const src = page();
    expect(src).toContain('minimumGroupSize');
    expect(src).toMatch(/soppress/i);
    expect(src).toMatch(/KORA misura\s*\n?\s*l&apos;organizzazione, non gli individui|organizzazione, non gli individui/);
  });

  it('both thresholds and the verdict come from the view, never recomputed locally', () => {
    const src = page();
    expect(src).toContain('baseline.minimumCompanyThreshold');
    expect(src).toContain('minimumCompanyThresholdMet');
    expect(src).toContain('baseline.minimumGroupSize');
    // No local threshold arithmetic: the page never decides validation itself.
    expect(src).not.toMatch(/totalWorkers\s*[><]=?\s*\d/);
    expect(src).not.toContain('FOUNDATION_LIGHT_MINIMUM_WORKERS');
  });

  it('it remains read-only: no write, no mutation, no new endpoint', () => {
    const src = code(ADMIN_PAGE);
    expect(src).not.toMatch(/method:\s*'POST'/);
    expect(src).not.toContain('persistWorkforceBaseline');
    // Exactly the two pre-existing GET reads, unchanged.
    expect(src).toContain("fetch('/api/admin/tenants')");
    expect(src).toContain("fetch('/api/admin/workforce-baseline')");
    expect(src).toContain('/api/admin/workforce-baseline?tenantId=');
  });

  it('no individual-level field is rendered — aggregate groups only', () => {
    const src = page();
    for (const forbidden of ['worker_id', 'workerId', 'pseudonym', 'email', 'pib', 'PIB']) {
      expect(src, `${forbidden} must never reach an employer-or-admin workforce surface`).not.toContain(forbidden);
    }
  });
});


// ── O — Founder micro-fix pass: the two held Product-quality defects ──────

describe('KORA-WP-012 (O-A) — the misspelled stored label is corrected for display only', () => {
  it('the malformed stored value renders as correct Italian', () => {
    expect(groupDisplayLabel('organisazione')).toBe('organizzazione');
  });

  it('every other label renders verbatim — a fixed correction list, not a spelling engine', () => {
    for (const raw of ['organizzazione', 'marketing', 'Operations', 'R&D', 'sede-milano', '_suppressed', '']) {
      expect(groupDisplayLabel(raw)).toBe(raw);
    }
  });

  it('the correction is applied where the group is rendered, including its accessible name', () => {
    const src = code(ADMIN_PAGE);
    expect(src).toContain('{groupDisplayLabel(g.group_label)}');
    expect(src).toContain('aria-label={`${groupDisplayLabel(g.group_label)}');
    // The raw value is never rendered directly any more.
    expect(src).not.toMatch(/\{g\.group_label\}/);
  });

  it('the source of truth was NOT rewritten: writer, API payload and stored value stand', () => {
    // The canonical POST still writes the malformed key/label verbatim — this
    // pass corrects presentation, never data (Founder: do not modify DB,
    // schema, migration, POST semantics, API payload, writer or fixture).
    expect(read(API_ROUTE)).toContain('organisazione');
    expect(code(ADMIN_PAGE)).not.toContain('persistWorkforceBaseline');
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    // INTEGRATION SUPERSESSION (canonical Product integration, 2026-09-22):
    // converted from equality to >=. This guard's intent is "THIS WP added no
    // migration of its own" — asserted independently by the filename-ownership
    // check, which still passes. 089 was the ceiling at this WP's own completion;
    // KORA-WP-066 legitimately raised it to 090 on the integrated line. Equality
    // is the brittle form the repository already documented a remedy for (see
    // tests/unit/kora-wp-029-manual-remap-governance.test.ts: "never equality,
    // same disclosed pattern already fixed for WP-011/WP-120/WP-013/WP-046").
    expect(Math.max(...files.map((f) => Number.parseInt(f.slice(0, 3), 10)).filter(Number.isFinite))).toBeGreaterThanOrEqual(89);
  });
});

describe('KORA-WP-012 (O-B) — the related intake path is the Admin destination', () => {
  const page = () => code(ADMIN_PAGE);

  it('the surface no longer links a KORA Admin operator into the Company portal', () => {
    expect(page()).not.toContain("href: '/company/ingestion'");
    expect(page()).not.toContain('/company/ingestion');
    expect(page()).not.toContain('KORA Intake Engine');
  });

  it('it resolves the intake destination from canonical Admin navigation, not a duplicated string', () => {
    const src = page();
    expect(src).toContain("from '@/lib/navigation/admin-nav-groups'");
    expect(src).toContain("i.href === '/admin/data-intake'");
    expect(src).toContain('adminIntake.label');
  });

  it('that destination and label are the Product\'s current Admin terminology', () => {
    const item = ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === '/admin/data-intake');
    expect(item, '/admin/data-intake must remain a canonical Admin destination').toBeTruthy();
    expect(item!.label).toBe('Submission Queue');
    expect(exists('app/admin/data-intake/page.tsx')).toBe(true);
  });

  it('the legitimate Company Registry link is untouched', () => {
    const src = page();
    expect(src).toContain("{ href: '/admin/companies', label: 'Company Registry'");
  });

  it('no Foundation Light cleanup was pulled into this pass', () => {
    // WP-012 owns this route only. The route itself carries no Foundation
    // Light label; the separate /admin/companies occurrence is another
    // package's scope and is deliberately NOT asserted here — a guard that
    // pinned a defect on a surface this WP does not own would be wrong in
    // both directions, failing when that surface is legitimately fixed.
    expect(read(ADMIN_PAGE)).not.toMatch(/Foundation Light/i);
  });
});
