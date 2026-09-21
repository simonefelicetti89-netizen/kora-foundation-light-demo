// tests/unit/p0-hotfix-navigation-contrast.test.ts
// P0 Hotfix — smoke tests for critical UI/navigation breakages.
// Verifies: contrast fix, workforce resolution, Commons sidebar, nav style rules.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const ROOT = join(process.cwd());

function readFile(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf-8');
}

// ── Task 1+2: /company/status contrast ───────────────────────────────────────

describe('/company/status — contrast fix', () => {
  const statusPage = readFile('app/company/status/page.tsx');
  const pipelineStatus = readFile('components/company/status/CompanyPipelineStatus.tsx');
  const templateLibrary = readFile('components/company/submissions/TemplateLibrary.tsx');
  const feedbackPanel = readFile('components/company/transparency/SubmissionFeedbackPanel.tsx');

  it('status page has no white rgba text colors', () => {
    // Only rgba(6,3,43,...) dark colors should appear now
    const whiteTextMatches = statusPage.match(/rgba\(255,255,255,(?:0\.[3-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('status page uses dark text pattern rgba(6,3,43,...)', () => {
    expect(statusPage).toContain('rgba(6,3,43,');
  });

  it('CompanyPipelineStatus has no white rgba text on high alpha', () => {
    const whiteTextMatches = pipelineStatus.match(/rgba\(255,255,255,(?:0\.[5-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('TemplateLibrary has no white rgba text', () => {
    const whiteTextMatches = templateLibrary.match(/rgba\(255,255,255,(?:0\.[3-9]|1)/g);
    expect(whiteTextMatches).toBeNull();
  });

  it('SubmissionFeedbackPanel COL.heading uses dark color', () => {
    expect(feedbackPanel).toContain("heading:   'rgba(6,3,43,");
  });

  it('SubmissionFeedbackPanel COL.body uses dark color', () => {
    expect(feedbackPanel).toContain("body:      'rgba(6,3,43,");
  });

  it('SubmissionFeedbackPanel COL.muted uses dark color', () => {
    expect(feedbackPanel).toContain("muted:     'rgba(6,3,43,");
  });

  it('functional green and blue colors are preserved in live status page', () => {
    // KORA-WP-088: the functional green is preserved but now routes through the
    // canonical token instead of the raw '#22c55e' literal. This is a
    // STRENGTHENING of the original assertion, not a relaxation: the literal
    // check would still have passed for a hardcoded design-system violation,
    // whereas the token check also enforces the token rule. The blue is
    // unchanged — it is an rgba() tint, which this WP did not touch.
    expect(statusPage).toContain('BADGE_TOKENS.eligible.text');
    expect(statusPage).toContain('rgba(74,127,224,');
  });

  it('B171 — app/demo/company/status/page.tsx rimossa (RIDONDANTE, #C76F3D con essa)', () => {
    expect(existsSync(join(process.cwd(), 'app/demo/company/status/page.tsx'))).toBe(false);
  });
});

// ── Task 3+4: Workforce resolution (retired — B-TRUTH Gen 0/1 Retirement Wave 1) ──
// The synthetic per-company workforce page this block tested (including its
// hardcoded 'meridiana-group' fallback — a known hidden-fallback bug flagged
// by the earlier Tenant Identity audit) was retired 2026-08-30. TenantService
// itself was untouched at that time and still resolved the same synthetic
// fixture — only the page that consumed it for a live-looking "Gestisci
// workforce" flow was gone. B-TRUTH TenantService Canonical Migration
// (2026-09-04) later, separately, retired TenantService.ts itself (and its
// fixture) entirely — the 3 tests that used to live here asserting
// tenantService's synthetic resolution behavior are retired along with it.
// See tests/unit/b-truth-tenantservice-canonical-migration.test.ts. Real
// worker provisioning is /admin/workers (B104, live).

describe('Workforce resolution — retired page stays retired (historical note, TenantService assertions removed)', () => {
  it('the retired workforce page no longer exists (hidden meridiana-group fallback gone with it)', () => {
    expect(existsSync(join(ROOT, 'app/admin/companies/[companyId]/workforce/page.tsx'))).toBe(false);
  });

  it('services/tenant/TenantService.ts no longer exists', () => {
    expect(existsSync(join(ROOT, 'services/tenant/TenantService.ts'))).toBe(false);
  });
});

// ── Task 5+6: Commons sidebar — clickable, not disabled ──────────────────────

describe('Sidebar — KORA Commons nav item', () => {
  it('COMPANY_ADMIN nav has KORA Commons as real route /company/commons (B128 — no preview flag)', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/company/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
    expect(commons?.inactive).toBeUndefined();
  });

  it('WORKER nav has KORA Commons as real route /worker/commons (B128 — no preview flag)', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/worker/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
  });

  it('KORA_ADMIN nav still reaches KORA Commons — now in Network & Content, not a demo group', () => {
    // KORA-WP-125 (2026-09-20): the 'Demo Lab' group was retired under
    // "One Product / No Demo Runtime" (Governance Patch 03, 2026-08-31).
    // INVARIANT PRESERVED — and it is the one that mattered here: KORA Commons
    // remains reachable from the Admin navigation and is not disabled. It is a
    // real capability (CC-052, 2026-08-31, retired its synthetic-preview path;
    // it now reads live commons.post), so it belongs in the group that already
    // owns Commons/Partner/Network, never behind a SYNTHETIC badge.
    const groups = buildNavGroups('KORA_ADMIN');
    const netGroup = groups.find((g) => g.heading === 'Network & Content');
    expect(netGroup).toBeDefined();
    const commons = netGroup?.items.find((i) => i.href === '/commons');
    expect(commons).toBeDefined();
    expect(commons?.comingSoon).toBeUndefined();
    expect(groups.find((g) => g.heading === 'Demo Lab')).toBeUndefined();
    expect(netGroup?.groupBadge).toBeUndefined();
  });

  it('WORKER Collettivo remains comingSoon (correctly disabled); Prenotazioni is a real live feature (not disabled)', () => {
    // UX-DESIGN-SYSTEM-CONSISTENCY-01: /my-kora/bookings has a real live mode
    // (app/api/worker/commons/bookings, BookingService.listMyBookings) — it was
    // incorrectly marked comingSoon in a prior sprint. Collective has no live
    // mode (CollectiveMode = 'checking' | 'empty' | 'demo', no 'live' state)
    // and correctly remains comingSoon.
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap((g) => g.items);
    const bookings = allItems.find((i) => i.href === '/my-kora/bookings');
    const collective = allItems.find((i) => i.href === '/my-kora/collective');
    expect(bookings?.comingSoon).toBeUndefined();
    expect(collective?.comingSoon).toBe(true);
  });
});

// ── Task 6: Nav style rule — Future Vision stays inactive, PREVIEW clickable ──

describe('Nav style rule — FUTURE_VISION vs PREVIEW', () => {
  it('Future Vision item uses inactive flag (not comingSoon, not preview)', () => {
    for (const role of ['COMPANY_ADMIN', 'WORKER', 'PARTNER', 'ADVISOR']) {
      const groups = buildNavGroups(role);
      const allItems = groups.flatMap((g) => g.items);
      const fv = allItems.find((i) => i.href === '/future-vision');
      if (fv) {
        expect(fv.inactive).toBe(true);
        expect(fv.preview).toBeUndefined();
        expect(fv.comingSoon).toBeUndefined();
      }
    }
  });

  it('KORA Commons preview flag does not appear in isDisabled set', () => {
    // preview items should NOT have inactive or comingSoon set
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allItems = groups.flatMap((g) => g.items);
    const commons = allItems.find((i) => i.href === '/commons');
    expect(commons?.inactive).toBeUndefined();
    expect(commons?.comingSoon).toBeUndefined();
  });

  it('Sidebar renders preview badge for /commons, not comingSoon badge', () => {
    const sidebarSource = readFile('components/layout/Sidebar.tsx');
    // preview badge uses KORA orange (rgba(199,111,61,...))
    expect(sidebarSource).toContain("item.preview && (");
    // preview items should NOT be in isDisabled
    expect(sidebarSource).toContain('isDisabled = item.comingSoon || item.inactive');
    // preview flag in NavItem interface
    expect(sidebarSource).toContain('preview?:     boolean');
  });
});

// ── /commons live discovery smoke tests (CC-052, 2026-08-31) ──────────────────
// commonsService (the synthetic class) was retired. /commons is now a server
// component reading live commons.post via getPublishedInitiativesAdmin.

describe('/commons route — live discovery, no synthetic remnant', () => {
  it('/commons page exists and reads canonical live discovery', () => {
    const commonsPage = readFile('app/commons/page.tsx');
    expect(commonsPage).toContain('getPublishedInitiativesAdmin');
    expect(commonsPage).not.toContain('commonsService');
    expect(commonsPage).not.toContain('data/synthetic/commons-initiatives');
  });

  it('CommonsService.ts no longer exports the synthetic commonsService singleton', () => {
    const service = readFile('services/commons/CommonsService.ts');
    // The retired filename may still appear in a historical header comment
    // documenting what was removed — only a live import statement matters.
    expect(service).not.toContain("from '@/data/synthetic/commons-initiatives.json'");
    expect(service).not.toContain('export const commonsService');
  });
});
