/**
 * My KORA Dynamic CV Live Alignment Tests
 *
 * PRIOR HISTORY (accurate as of the original four-state build, preserved as
 * the file's original framing): "Verifies /my-kora/dynamic-cv/page.tsx
 * applies four-state auth detection (checking / live / empty / demo) instead
 * of blindly serving synthetic content."
 *
 * B-WORKER-2 (2026-09-06): the 'live'/'empty' states rendered a lighter
 * subset of the same real data /worker/dynamic-cv (DynamicCVClient) already
 * showed, plus real sharing/print that only DynamicCVClient implemented —
 * a proven CANONICAL_SUPERSET. Those two states and their rendering were
 * removed; a confirmed real session (the same /api/worker/dynamic-cv
 * response the four states used to branch on) now redirects straight to
 * /worker/dynamic-cv via router.replace(). The remaining two states are
 * 'checking' (resolving) and 'demo' (401/unauthenticated — unchanged,
 * Foundation Light's legitimate pre-login preview). Several describe blocks
 * below are updated to test this narrower, redirect-based contract; blocks
 * about the unchanged demo content are untouched.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT     = resolve(process.cwd());
const PAGE_SRC = readFileSync(resolve(ROOT, 'app/my-kora/dynamic-cv/page.tsx'), 'utf-8');

const POLICY_TEST     = resolve(ROOT, 'tests/unit/dynamic-impact-cv-policy.test.ts');
const WORKER_EXP_TEST = resolve(ROOT, 'tests/unit/worker-experience-consolidation.test.ts');
const ROUTE_PRIVACY_CANDIDATES = [
  resolve(ROOT, 'tests/unit/route-privacy.test.ts'),
  resolve(ROOT, 'tests/unit/route-privacy-guard.test.ts'),
  resolve(ROOT, 'tests/unit/b81-route-privacy.test.ts'),
  resolve(ROOT, 'tests/unit/b81b-route-privacy-guard.test.ts'),
];

// ── 1. No blind demo-only getCVData for authenticated workers ─────────────────
describe('1. Page does not blindly use demo-only getCVData for authenticated workers', () => {
  it('page has mode detection logic', () => {
    expect(PAGE_SRC).toMatch(/setCVMode/);
    expect(PAGE_SRC).toMatch(/DynamicCVMode/);
  });

  it('the real-session redirect precedes getCVData call in source (a real session never reaches it)', () => {
    const redirectIdx  = PAGE_SRC.indexOf("router.replace('/worker/dynamic-cv')");
    const getCVDataIdx = PAGE_SRC.indexOf("getCVData(personaId)");
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(getCVDataIdx).toBeGreaterThan(-1);
    expect(redirectIdx).toBeLessThan(getCVDataIdx);
  });
});

// ── 2. Page fetches /api/worker/dynamic-cv ────────────────────────────────────
describe('2. Page fetches or references /api/worker/dynamic-cv', () => {
  it('page contains reference to /api/worker/dynamic-cv endpoint', () => {
    expect(PAGE_SRC).toContain('/api/worker/dynamic-cv');
  });

  it('fetch call drives setCVMode transitions', () => {
    expect(PAGE_SRC).toMatch(/fetch\(['"]\/api\/worker\/dynamic-cv['"]\)/);
  });
});

// PRIOR HISTORY (accurate as of the original four-state build, preserved
// verbatim): "3. Page supports checking / live / empty / demo states" —
// asserted all four state literals existed. B-WORKER-2 (2026-09-06) narrowed
// the page to 'checking' | 'redirecting' | 'demo' — 'live'/'empty' no longer
// exist as distinct render states, a confirmed real session redirects
// instead of choosing between them.
describe('3. Page supports checking / redirecting / demo states', () => {
  it("has 'checking' state value", () => { expect(PAGE_SRC).toContain("'checking'"); });
  it("has 'redirecting' state value", () => { expect(PAGE_SRC).toContain("'redirecting'"); });
  it("has 'demo' state value",     () => { expect(PAGE_SRC).toContain("'demo'"); });
});

// ── 4. Checking state prevents flash of demo content ─────────────────────────
describe('4. Checking state prevents flash of demo content', () => {
  it('returns null when cvMode is checking or redirecting', () => {
    expect(PAGE_SRC).toMatch(/cvMode === ['"]checking['"] \|\| cvMode === ['"]redirecting['"]\) return null/);
  });

  it('checking/redirecting guard appears before the main access-denied and content returns', () => {
    const funcStart        = PAGE_SRC.indexOf('export default function DynamicCV');
    const checkingGuardIdx = PAGE_SRC.indexOf("cvMode === 'checking'", funcStart);
    const accessDeniedIdx  = PAGE_SRC.indexOf('Accesso Limitato');
    expect(checkingGuardIdx).toBeGreaterThan(-1);
    expect(accessDeniedIdx).toBeGreaterThan(-1);
    expect(checkingGuardIdx).toBeLessThan(accessDeniedIdx);
  });
});

// PRIOR HISTORY (accurate as of the original four-state build, preserved
// verbatim): "5. Authenticated no-data mode shows honest Italian empty
// state" — the 'empty' render block (testid dynamic-cv-empty, "ciclo di
// scoring" copy) no longer exists on this page; a confirmed real session
// (empty or not) redirects to /worker/dynamic-cv, which owns that empty-state
// UX now. See tests/unit/bworker-1-canonical-pib-page.test.ts and the
// DynamicCVClient's own tests for the canonical real-session UX.
describe('5. Authenticated sessions (empty or not) are redirected, not shown a local empty state', () => {
  it('this page no longer renders its own dynamic-cv-empty block', () => {
    expect(PAGE_SRC).not.toContain('data-testid="dynamic-cv-empty"');
  });

  it('every real session redirects, regardless of whether the worker has data yet', () => {
    expect(PAGE_SRC).toContain("if (res.ok) {");
    expect(PAGE_SRC).toContain("router.replace('/worker/dynamic-cv')");
  });
});

// ── 6. Demo mode available for unauthenticated/demo users ────────────────────
describe('6. Demo mode available for unauthenticated/demo users', () => {
  it('page has demo render block', () => {
    expect(PAGE_SRC).toContain('data-testid="dynamic-cv-demo"');
  });

  // PRIOR HISTORY (accurate as of the original four-state build, preserved
  // verbatim): "401 response routes to demo mode" — asserted `!res.ok` was
  // the literal guard. B-WORKER-2 inverted the branch to `if (res.ok) {
  // redirect } else { demo }` — same behavior (non-ok → demo), different
  // literal form.
  it('a non-ok response (401/unauthenticated) routes to demo mode', () => {
    expect(PAGE_SRC).toContain("if (res.ok) {");
    expect(PAGE_SRC).toContain("setCVMode('demo')");
  });
});

// ── 7. Demo content clearly labelled synthetic ───────────────────────────────
describe('7. Demo content is clearly labelled synthetic/demo', () => {
  it('has data-testid="dynamic-cv-demo-label"', () => {
    expect(PAGE_SRC).toContain('data-testid="dynamic-cv-demo-label"');
  });

  it('demo label contains Dati dimostrativi', () => {
    expect(PAGE_SRC).toContain('Dati dimostrativi');
  });

  it('demo label contains Non rappresenta dati reali', () => {
    expect(PAGE_SRC).toContain('Non rappresenta dati reali');
  });
});

// PRIOR HISTORY (accurate as of the original four-state build, preserved
// verbatim): "8. Live mode uses data filtered by Dynamic Impact CV policy" —
// asserted this page's own removed live-render block referenced
// liveCV.experiences/cvEligibleCount. B-WORKER-2 removed that render block —
// classifyForDynamicCV() is still imported and used for the (unchanged) demo
// content below; live-session filtering now happens exclusively on
// /worker/dynamic-cv, out of this file's scope.
describe('8. Demo content still uses the Dynamic Impact CV policy filter (unchanged)', () => {
  it('page imports and calls classifyForDynamicCV for demo items', () => {
    expect(PAGE_SRC).toContain('classifyForDynamicCV');
    expect(PAGE_SRC).toContain('dynamic-impact-cv-policy');
  });
});

// ── 9. No active LinkedIn claim ───────────────────────────────────────────────
describe('9. Page does not claim LinkedIn integration is active', () => {
  it('page has no enabled/active LinkedIn button or link', () => {
    // Any LinkedIn button must be disabled; any LinkedIn href must not be a real OAuth/share URL
    const linkedInButtonMatch = PAGE_SRC.match(/<button[^>]*LinkedIn[^>]*>/g);
    if (linkedInButtonMatch) {
      linkedInButtonMatch.forEach(btn => {
        expect(btn).toMatch(/disabled/);
      });
    }
    // No active href pointing to linkedin.com
    expect(PAGE_SRC).not.toMatch(/href=["']https?:\/\/www\.linkedin\.com\/shareArticle/);
    expect(PAGE_SRC).not.toMatch(/href=["']https?:\/\/linkedin\.com/);
  });

  it('page includes "LinkedIn — Non attivo" or "In arrivo" copy', () => {
    const hasInArrivo   = PAGE_SRC.includes('LinkedIn — In arrivo') || PAGE_SRC.includes('LinkedIn — Non attivo');
    const hasFutureVision = PAGE_SRC.includes('condivisione LinkedIn') && PAGE_SRC.includes('Non attivo');
    expect(hasInArrivo || hasFutureVision).toBe(true);
  });
});

// ── 10. No active blockchain claim ────────────────────────────────────────────
describe('10. Page does not claim blockchain is active', () => {
  it('blockchain only appears in future/planned context', () => {
    if (!PAGE_SRC.includes('blockchain')) return; // not mentioned at all is fine
    const lines = PAGE_SRC.split('\n').filter(l => l.toLowerCase().includes('blockchain'));
    lines.forEach(line => {
      const isGuarded = line.includes('In arrivo') || line.includes('Non attivo') ||
        line.includes('Future Vision') || line.includes('previsti') || line.includes('post-pilota');
      expect(isGuarded).toBe(true);
    });
  });
});

// ── 11. No active public badge pages claim ────────────────────────────────────
describe('11. Page does not claim public badge pages are active', () => {
  it('no href to /badges/ or /public/badge routes', () => {
    expect(PAGE_SRC).not.toContain('href="/badges/');
    expect(PAGE_SRC).not.toContain('href="/public/badge');
  });
});

// PRIOR HISTORY (accurate as of the original four-state build, preserved
// verbatim): "has data-testid=\"dynamic-cv-privacy-notice\"" — that testid
// lived in the removed empty/live blocks. The remaining (demo + access-denied)
// content still carries privacy reassurance copy, just without that specific
// testid — /worker/dynamic-cv's own privacy copy is covered by its own tests.
describe('12. Page includes privacy reassurance', () => {
  it('privacy copy mentions employer cannot see individual data', () => {
    expect(PAGE_SRC).toContain('datore di lavoro');
  });
});

// ── 13. Link to /worker/workspace ─────────────────────────────────────────────
describe('13. Page links to /worker/workspace', () => {
  it('contains href to /worker/workspace', () => {
    expect(PAGE_SRC).toContain('href="/worker/workspace"');
  });
});

// ── 14. Link to /my-kora/personal-impact-balance ─────────────────────────────
describe('14. Page links to /my-kora/personal-impact-balance', () => {
  it('contains href to /my-kora/personal-impact-balance', () => {
    expect(PAGE_SRC).toContain('href="/my-kora/personal-impact-balance"');
  });
});

// ── 15. No internal sensitive fields exposed ──────────────────────────────────
describe('15. No worker-level sensitive/internal fields exposed', () => {
  it('page does not reference worker_identity_id', () => {
    expect(PAGE_SRC).not.toContain('worker_identity_id');
  });

  it('page does not reference pseudonym_id', () => {
    expect(PAGE_SRC).not.toContain('pseudonym_id');
  });

  it('page does not reference worker_pseudonym_map', () => {
    expect(PAGE_SRC).not.toContain('worker_pseudonym_map');
  });

  // PRIOR HISTORY (accurate as of the original four-state build, preserved
  // verbatim): "live render uses safe display fields only (title, pillar,
  // date)" — checked exp.title/exp.pillar in this page's own removed live
  // block. That safety property is now DynamicCVClient's responsibility on
  // /worker/dynamic-cv (a real session never renders this page's content).
});

// ── 16. Regression: dynamic-impact-cv-policy test exists ─────────────────────
describe('16. Regression: dynamic-impact-cv-policy tests', () => {
  it('dynamic-impact-cv-policy.test.ts is present', () => {
    expect(existsSync(POLICY_TEST)).toBe(true);
  });
});

// ── 17. Regression: worker-experience-consolidation test exists ───────────────
describe('17. Regression: worker-experience-consolidation tests', () => {
  it('worker-experience-consolidation.test.ts is present', () => {
    expect(existsSync(WORKER_EXP_TEST)).toBe(true);
  });
});

// ── 18. Regression: route privacy test exists ─────────────────────────────────
describe('18. Regression: route privacy test files exist', () => {
  it('at least one route-privacy test file is present', () => {
    const anyExists = ROUTE_PRIVACY_CANDIDATES.some(p => existsSync(p));
    expect(anyExists).toBe(true);
  });
});
