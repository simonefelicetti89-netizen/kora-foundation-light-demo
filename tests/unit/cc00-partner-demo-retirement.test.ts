// tests/unit/cc00-partner-demo-retirement.test.ts
// CC-00 — Partner demo capability salvage + controlled retirement (2026-09-12).
//
// Goal (per the founder-ratified DEMO_VIEWER retirement sequence): retire the
// synthetic app/demo/partner/ product duplicate only after proving every
// useful capability it showed is already represented on — or already named
// as a deferred future capability of — the real, authenticated Partner
// Workspace surface (app/partner/**). "KILL is controlled": salvage real
// value first, delete the fake duplicate only after the real surface is
// proven sufficient.
//
// Full capability inventory (demo → real equivalent) is recorded in
// lib/architecture/registry.ts's app-surface.demo entry. This test proves:
//   1. app/demo/partner/ is gone (route, layout, zero orphaned links).
//   2. The real app/partner/** surface (8 sub-surfaces) is untouched.
//   3. DEMO_VIEWER role and every other /demo/** route are untouched.
//   4. Gated /demo/** layout count dropped from 5 to 4.
//   5. No forbidden financial/billing content survived anywhere in
//      app/partner/** (the one demo section that was scope-forbidden, not
//      merely duplicated, per CLAUDE.md Red Line — no marketplace, no
//      payments, no wallet, no checkout, no voucher logic).

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

// ── 1. app/demo/partner/ is gone ─────────────────────────────────────────────

describe('CC-00 Partner demo retirement — route removed', () => {
  it('app/demo/partner/page.tsx no longer exists', () => {
    expect(exists('app/demo/partner/page.tsx')).toBe(false);
  });

  it('app/demo/partner/layout.tsx no longer exists', () => {
    expect(exists('app/demo/partner/layout.tsx')).toBe(false);
  });

  it('app/demo/partner/ directory no longer exists', () => {
    expect(exists('app/demo/partner')).toBe(false);
  });
});

// ── 2. No orphaned references to the retired route ───────────────────────────

describe('CC-00 Partner demo retirement — no dangling references', () => {
  it('app/demo/page.tsx does not link to /demo/partner (it never did — already an orphaned route)', () => {
    const src = read('app/demo/page.tsx');
    expect(src).not.toContain("'/demo/partner'");
    expect(src).not.toContain('"/demo/partner"');
  });

  it('no file under app/, lib/, services/, components/ imports from app/demo/partner', () => {
    // Code-shaped adjacency only (import/require/href), not prose — several
    // real pages (e.g. app/partner/page.tsx) legitimately mention the old
    // path in a historical explanatory comment.
    const codePattern = /(?:from\s*['"]|require\(['"]|href=['"])[^'"]*demo\/partner\/(?:page|layout)/;
    const scanDirs = ['app', 'lib', 'services', 'components'];
    const files = scanDirs.flatMap((d) => walk(resolve(root, d)));
    for (const file of files) {
      if (!/\.(ts|tsx)$/.test(file)) continue;
      const content = readFileSync(file, 'utf-8');
      expect(codePattern.test(content), `${file} must not reference demo/partner as code`).toBe(false);
    }
  });

  it('lib/navigation/admin-nav-groups.ts has no /demo/partner entry', () => {
    const src = read('lib/navigation/admin-nav-groups.ts');
    expect(src).not.toContain('/demo/partner');
  });
});

// ── 3. Real app/partner/** surface is untouched — the salvage target ────────

describe('CC-00 Partner demo retirement — real Partner Workspace surface untouched', () => {
  const REAL_PARTNER_PAGES = [
    'app/partner/layout.tsx',
    'app/partner/page.tsx',
    'app/partner/workspace/page.tsx',
    'app/partner/activity-bookings/page.tsx',
    'app/partner/activity-bookings/detail/page.tsx',
    'app/partner/activity-catalog/page.tsx',
    'app/partner/activity-catalog/[activityId]/page.tsx',
    'app/partner/aggregate-signals/page.tsx',
    'app/partner/initiatives/page.tsx',
    'app/partner/kora-link/page.tsx',
    'app/partner/kora-link/initiatives/page.tsx',
    'app/partner/privacy-boundary/page.tsx',
    'app/partner/relationships/page.tsx',
  ];

  for (const page of REAL_PARTNER_PAGES) {
    it(`${page} still exists`, () => {
      expect(exists(page)).toBe(true);
    });
  }

  it('app/partner/layout.tsx still gates via requirePartnerUser (unchanged enforcement)', () => {
    const src = read('app/partner/layout.tsx');
    expect(src).toContain('requirePartnerUser');
  });

  it('app/partner/workspace/page.tsx still reads real network.partner_profile (unchanged, DB-backed)', () => {
    const src = read('app/partner/workspace/page.tsx');
    expect(src).toContain('partner_profile');
    expect(src).toContain('requirePartnerUser');
  });

  it('app/partner/workspace/page.tsx already named the deferred capabilities the demo page faked, before this slice touched anything', () => {
    const src = read('app/partner/workspace/page.tsx');
    expect(src).toContain('Funzionalità future');
    expect(src).toContain('prossimamente');
  });
});

// ── 4. No scope-forbidden financial/billing content survived anywhere ───────

describe('CC-00 Partner demo retirement — no forbidden payment/wallet/invoicing content', () => {
  const REAL_PARTNER_PAGES = [
    'app/partner/workspace/page.tsx',
    'app/partner/activity-bookings/page.tsx',
    'app/partner/activity-catalog/page.tsx',
    'app/partner/aggregate-signals/page.tsx',
    'app/partner/initiatives/page.tsx',
    'app/partner/relationships/page.tsx',
    'app/partner/privacy-boundary/page.tsx',
  ];

  for (const page of REAL_PARTNER_PAGES) {
    it(`${page} contains no invoice/payout/fatturazione content`, () => {
      const src = read(page).toLowerCase();
      expect(src).not.toContain('fatturazione');
      expect(src).not.toContain('payout');
      expect(src).not.toContain('importo stimato');
    });
  }
});

// ── 5. DEMO_VIEWER role and every other /demo/** route are untouched ────────

// DEMO_VIEWER was accurately untouched at the time this test was written.
// CC-00 DEMO_VIEWER role retirement (2026-09-26, a later, separate slice)
// retired the role entirely from the runtime role model — not replaced by
// another role with a different name.
describe('CC-00 Partner demo retirement — DEMO_VIEWER role has since been separately retired (historical note, not a live assertion)', () => {
  it('DEMO_VIEWER no longer exists in lib/constants/kora.ts, requireDemoAccess no longer exists', () => {
    const constants = read('lib/constants/kora.ts');
    expect(constants).not.toContain('DEMO_KORA_ROLES');
    const koraRolesStart = constants.indexOf('export const KORA_ROLES');
    const koraRolesBlock = constants.slice(koraRolesStart, constants.indexOf('as const;', koraRolesStart));
    expect(koraRolesBlock).not.toContain('DEMO_VIEWER');
    const session = read('lib/auth/kora-session.ts');
    const sessionCodeOnly = session.split('\n').filter((line) => !line.trim().startsWith('//')).join('\n');
    expect(sessionCodeOnly).not.toContain('requireDemoAccess');
  });

  // app/demo/portfolio/page.tsx was accurately untouched at the time this
  // test was written. CC-00 Company Portfolio capability salvage +
  // canonicalization (2026-09-12, later the same day) separately retired
  // it too — its real capability already existed, canonically, at
  // app/admin/companies/page.tsx. See
  // tests/unit/cc00-portfolio-canonicalization.test.ts.
  // advisor, ai-onboarding, benchmarks, gtm, and guide were accurately
  // untouched at the time this test was written. CC-00 Residual /demo/**
  // controlled retirement (2026-09-26, a later, separate slice) retired
  // all 6 of them.
  it('other /demo/** routes untouched at the time this test was written (historical note: a later slice retired 6 of them); portfolio has since been separately retired', () => {
    const stillExist = ['app/demo/future-vision/page.tsx', 'app/demo/page.tsx'];
    for (const route of stillExist) {
      expect(exists(route)).toBe(true);
    }
    const sinceRetired = [
      'app/demo/advisor/page.tsx',
      'app/demo/ai-onboarding/page.tsx',
      'app/demo/benchmarks/page.tsx',
      'app/demo/gtm/page.tsx',
      'app/demo/guide/page.tsx',
      'app/demo/network/page.tsx',
      'app/demo/portfolio/page.tsx',
    ];
    for (const route of sinceRetired) {
      expect(exists(route)).toBe(false);
    }
  });
});

// ── 6. Gated /demo/** layout count: originally 5, now 3 (portfolio ─────────
//    separately retired by CC-00 Company Portfolio canonicalization) ───────

describe('CC-00 Partner demo retirement — gated /demo/** layout count drops from 5 to 4 (historical: now 0)', () => {
  // app/demo/portfolio/layout.tsx was accurately one of the 4 remaining
  // gated layouts at the time this test was written. CC-00 Company
  // Portfolio capability salvage + canonicalization (2026-09-12) later,
  // separately, retired it too. advisor, ai-onboarding, and network were
  // the 3 gated layouts remaining after that — CC-00 Residual /demo/**
  // controlled retirement (2026-09-26, a later, separate slice) retired
  // all 3, leaving zero gated /demo/** layouts. See
  // tests/unit/cc00-residual-demo-retirement.test.ts.
  it('the 3 layouts gated at the time this test was written have since been separately retired; portfolio too', () => {
    for (const layout of [
      'app/demo/advisor/layout.tsx',
      'app/demo/ai-onboarding/layout.tsx',
      'app/demo/network/layout.tsx',
      'app/demo/portfolio/layout.tsx',
    ]) {
      expect(exists(layout)).toBe(false);
    }
  });

  it('app/demo/partner/layout.tsx and app/demo/index-registry/layout.tsx are both gone (2 of the original 6 gated layouts retired)', () => {
    expect(exists('app/demo/partner/layout.tsx')).toBe(false);
    expect(exists('app/demo/index-registry/layout.tsx')).toBe(false);
  });
});

// ── 7. Registry records the retirement, preserving prior history ────────────

describe('CC-00 Partner demo retirement — architecture registry updated', () => {
  it('lib/architecture/registry.ts records the PARTNER DEMO CAPABILITY SALVAGE supersession note', () => {
    const src = read('lib/architecture/registry.ts');
    expect(src).toContain('PARTNER DEMO CAPABILITY SALVAGE');
  });

  // CC-00 Company Portfolio capability salvage + canonicalization
  // (2026-09-12) later, separately, retired portfolio too, and rephrased
  // this purpose string to "(7 subdirectories: ... — index-registry,
  // partner, and portfolio all retired ...)" — 'partner' legitimately
  // appeared once, inside that "retired" clause, not a live list. CC-00
  // Residual /demo/** controlled retirement (2026-09-26, a later, separate
  // slice) retired every remaining live subdirectory except future-vision
  // and rephrased the purpose string again — there is no "subdirectories:"
  // parenthetical left to anchor on; the purpose string now names only 2
  // surviving routes explicitly and lists every retired name in a single
  // "have all been retired" clause, so 'partner' can only ever appear
  // there, never as a live route.
  it('registry purpose no longer lists partner as a LIVE /demo subdirectory (historical note: format changed, partner still only appears retired)', () => {
    const src = read('lib/architecture/registry.ts');
    const start = src.indexOf("id: 'app-surface.demo'");
    const entry = src.slice(start, start + 700);
    expect(entry).toContain('reduced to 2 routes');
    expect(entry).toContain('app/demo/future-vision/');
    expect(entry).toMatch(/partner.*have all been retired/);
  });
});
