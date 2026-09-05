// tests/unit/partner-01-pilot-surface.test.ts
// PARTNER-01 — Resolve Partner Home and Pilot Surface.
//
// Context: PILOT-SAAS-01 / docs/FUTURE_ROLES_AND_SURFACES.md flagged an open
// ambiguity — app/partner/page.tsx (root) rendered a 100% synthetic demo
// dashboard directly behind the real PARTNER auth gate (app/partner/layout.tsx
// -> requirePartnerUser()), while app/partner/workspace/page.tsx was the real,
// DB-backed live surface. A real, authenticated pilot partner navigating to
// /partner root would see fabricated company names and requests labeled
// "DEMO" instead of their own workspace.
//
// This sprint's fix: /partner/workspace is home. /partner root is now a thin
// server-side redirect to /partner/workspace (still behind the same real
// requirePartnerUser() gate — no enforcement change). The synthetic dashboard
// moved to app/demo/partner/page.tsx, gated like every other /demo/* route
// (requireDemoGate() — DEMO_VIEWER/KORA_ADMIN only, never a real PARTNER
// session), so it can no longer be mistaken for the live workspace.
//
// Static/source-level tests — consistent with this codebase's existing
// convention for auth-layout guards (see b137-auth-layout-guard.test.ts,
// b127-partner-workspace.test.ts).

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

function read(rel: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../..', rel), 'utf-8');
}

function exists(rel: string): boolean {
  try {
    fs.accessSync(path.resolve(__dirname, '../..', rel));
    return true;
  } catch {
    return false;
  }
}

const constantsSrc      = read('lib/constants/kora.ts');
const sessionSrc        = read('lib/auth/kora-session.ts');
const partnerLayoutSrc  = read('app/partner/layout.tsx');
const partnerRootSrc    = read('app/partner/page.tsx');
const partnerWorkspaceSrc = read('app/partner/workspace/page.tsx');
const partnerKoraLinkSrc  = read('app/partner/kora-link/page.tsx');
const demoGuardSrc         = read('lib/auth/demo-guard.tsx');

// ── 1. PARTNER remains an active role ────────────────────────────────────────

describe('PARTNER-01 — PARTNER remains an active role', () => {
  it('PARTNER is listed in ACTIVE_KORA_ROLES (lib/constants/kora.ts)', () => {
    expect(constantsSrc).toMatch(/ACTIVE_KORA_ROLES\s*=\s*\[[^\]]*'PARTNER'[^\]]*\]/);
  });

  it('requirePartnerUser() still exists and enforces koraRole === PARTNER', () => {
    expect(sessionSrc).toContain('export async function requirePartnerUser');
    expect(sessionSrc).toContain("koraRole !== 'PARTNER'");
  });
});

// ── 2. /partner live surface is server-side guarded / redirects to workspace ─

describe('PARTNER-01 — /partner root redirects to the guarded live workspace', () => {
  it('app/partner/layout.tsx still requires requirePartnerUser() (unchanged enforcement)', () => {
    expect(partnerLayoutSrc).toContain('requirePartnerUser');
    expect(partnerLayoutSrc.trimStart().startsWith("'use client'")).toBe(false);
  });

  it('app/partner/page.tsx is a Server Component that redirects to /partner/workspace', () => {
    expect(partnerRootSrc.trimStart().startsWith("'use client'")).toBe(false);
    expect(partnerRootSrc).toContain("redirect('/partner/workspace')");
  });

  it('app/partner/page.tsx no longer renders the synthetic dashboard content (no PARTNER_COMPANY_SCOPE, no fake company names)', () => {
    expect(partnerRootSrc).not.toContain('PARTNER_COMPANY_SCOPE');
    expect(partnerRootSrc).not.toContain('Meridiana Group');
    expect(partnerRootSrc).not.toContain('BoundaryBadge');
  });

  it('app/partner/workspace/page.tsx remains the real, DB-backed surface (unchanged)', () => {
    expect(partnerWorkspaceSrc).toContain('requirePartnerUser');
    expect(partnerWorkspaceSrc).toContain('partner_profile');
    expect(partnerWorkspaceSrc).toContain("redirect('/login");
  });
});

// ── 3. Demo partner content is not confused with the live workspace ─────────
//
// This describe block originally asserted app/demo/partner/{layout,page}.tsx
// existed and were clearly separated from the live workspace (PARTNER-01,
// this file's original purpose). CC-00 partner demo capability salvage +
// controlled retirement (2026-09-12) later, separately, retired the entire
// /demo/partner route: every capability it showed was already duplicated
// (usually better, with live data) on the real app/partner/** surface — see
// tests/unit/cc00-partner-demo-retirement.test.ts for the retirement proof.
// The "is not confused with the live workspace" question this block asked
// is now moot: there is no synthetic dashboard left to confuse it with.

describe('PARTNER-01 — demo partner preview has since been separately retired (historical note, not a live assertion)', () => {
  it('app/demo/partner/ no longer exists', () => {
    expect(exists('app/demo/partner/layout.tsx')).toBe(false);
    expect(exists('app/demo/partner/page.tsx')).toBe(false);
  });

  it('requireDemoGate() (still shared by /demo/network, /demo/advisor, /demo/ai-onboarding) only admits DEMO_VIEWER/KORA_ADMIN via requireDemoAccess', () => {
    expect(demoGuardSrc).toContain('requireDemoAccess');
    // requireDemoAccess itself (kora-session.ts) explicitly enumerates DEMO_VIEWER and KORA_ADMIN as the only admitted roles.
    const start = sessionSrc.indexOf('export async function requireDemoAccess');
    const body = sessionSrc.slice(start, start + 1200);
    expect(body).toContain("koraRole === 'DEMO_VIEWER'");
    expect(body).toContain("koraRole === 'KORA_ADMIN'");
  });
});

// ── 4. No worker-level identifiers on any partner-facing page ───────────────

describe('PARTNER-01 — partner-facing pages never render worker-level identifiers', () => {
  const forbidden = ['worker_id', 'kora_worker_id', 'token_digest', 'link_id'];
  // app/demo/partner/page.tsx was accurately checked here as of this test's
  // writing. CC-00 partner demo capability salvage + controlled retirement
  // (2026-09-12) later, separately, retired that route entirely — removed
  // from this list, not replaced (there is no page left to check).
  const pages: Array<[string, string]> = [
    ['app/partner/workspace/page.tsx', partnerWorkspaceSrc],
    ['app/partner/page.tsx', partnerRootSrc],
    ['app/partner/kora-link/page.tsx', partnerKoraLinkSrc],
  ];

  for (const [name, src] of pages) {
    it(`${name} contains no forbidden individual identifier as code`, () => {
      for (const term of forbidden) {
        // Require code-shaped adjacency (assignment/property access), not
        // prose explaining the boundary (e.g. "no worker_id" in a comment).
        const codePattern = new RegExp(`[.]${term}\\b|\\b${term}\\s*[:=]`);
        expect(codePattern.test(src), `${name} must not reference ${term} as code`).toBe(false);
      }
    });

    it(`${name} contains no raw UEF payload or individual scan-history reference`, () => {
      expect(src).not.toContain('uef_record');
      expect(src).not.toContain('scan_history');
      expect(src).not.toContain('individual_scan');
    });
  }
});

// ── 5. Non-partner roles are not treated as partners ─────────────────────────

describe('PARTNER-01 — COMPANY_ADMIN/WORKER/ADVISOR/DEMO_VIEWER are not treated as partners', () => {
  it('requirePartnerUser() has no bypass for COMPANY_ADMIN, WORKER, ADVISOR, or DEMO_VIEWER', () => {
    const start = sessionSrc.indexOf('export async function requirePartnerUser');
    const end   = sessionSrc.indexOf('export async function getCurrentPartnerUser');
    const fn    = sessionSrc.slice(start, end);
    for (const role of ['COMPANY_ADMIN', 'WORKER', 'ADVISOR', 'DEMO_VIEWER']) {
      expect(fn).not.toContain(`'${role}'`);
    }
    // The only strict-equality role check inside is the PARTNER requirement itself.
    expect(fn).toContain("koraRole !== 'PARTNER'");
  });

  it('middleware PARTNER_ALLOWED_PREFIXES does not grant partner routes to other roles', () => {
    const middleware = read('middleware.ts');
    const start = middleware.indexOf('PARTNER_ALLOWED_PREFIXES = [');
    const end   = middleware.indexOf('];', start);
    const arr   = middleware.slice(start, end + 2);
    expect(arr).not.toContain("'/admin'");
    expect(arr).not.toContain("'/company'");
    expect(arr).not.toContain("'/worker'");
    expect(arr).not.toContain("'/demo'");
  });

  it('isPartnerUser() type guard strictly checks koraRole === PARTNER', () => {
    expect(sessionSrc).toContain('isPartnerUser');
    expect(sessionSrc).toContain("value.koraRole === 'PARTNER'");
  });
});

// ── 6. Sidebar navigation points at the live workspace, not the retired root ─

describe('PARTNER-01 — navigation no longer points at the retired demo-behind-auth root', () => {
  it('Sidebar "Workspace Partner" link points to /partner/workspace', () => {
    const sidebarSrc = read('components/layout/Sidebar.tsx');
    const partnerSectionStart = sidebarSrc.indexOf("role === 'PARTNER'");
    const partnerSection = sidebarSrc.slice(partnerSectionStart, partnerSectionStart + 600);
    expect(partnerSection).toContain("'/partner/workspace'");
    expect(partnerSection).toContain('Workspace Partner');
  });
});
