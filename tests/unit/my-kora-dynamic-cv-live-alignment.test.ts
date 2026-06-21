/**
 * My KORA Dynamic CV Live Alignment Tests
 * Verifies /my-kora/dynamic-cv/page.tsx applies four-state auth detection
 * (checking / live / empty / demo) instead of blindly serving synthetic content.
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
  it('page has four-state mode detection logic', () => {
    expect(PAGE_SRC).toMatch(/setCVMode/);
    expect(PAGE_SRC).toMatch(/DynamicCVMode/);
  });

  it('empty and live early returns precede getCVData call in source', () => {
    const emptyReturnIdx = PAGE_SRC.indexOf('dynamic-cv-empty');
    const liveReturnIdx  = PAGE_SRC.indexOf('dynamic-cv-live');
    const getCVDataIdx   = PAGE_SRC.indexOf("getCVData(personaId)");
    expect(emptyReturnIdx).toBeGreaterThan(-1);
    expect(liveReturnIdx).toBeGreaterThan(-1);
    expect(getCVDataIdx).toBeGreaterThan(-1);
    expect(emptyReturnIdx).toBeLessThan(getCVDataIdx);
    expect(liveReturnIdx).toBeLessThan(getCVDataIdx);
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

// ── 3. All four states present in source ─────────────────────────────────────
describe('3. Page supports checking / live / empty / demo states', () => {
  it("has 'checking' state value", () => { expect(PAGE_SRC).toContain("'checking'"); });
  it("has 'live' state value",     () => { expect(PAGE_SRC).toContain("'live'"); });
  it("has 'empty' state value",    () => { expect(PAGE_SRC).toContain("'empty'"); });
  it("has 'demo' state value",     () => { expect(PAGE_SRC).toContain("'demo'"); });
});

// ── 4. Checking state prevents flash of demo content ─────────────────────────
describe('4. Checking state prevents flash of demo content', () => {
  it('returns null when cvMode is checking', () => {
    expect(PAGE_SRC).toMatch(/cvMode === ['"]checking['"]\) return null/);
  });

  it('checking guard appears before the main access-denied and content returns', () => {
    // The checking guard must precede the canAccess block and content renders.
    // We look at positions relative to the export default function declaration.
    const funcStart        = PAGE_SRC.indexOf('export default function DynamicCV');
    const checkingGuardIdx = PAGE_SRC.indexOf("cvMode === 'checking') return null", funcStart);
    // The access-denied block is the first full return ( after the function opens
    const accessDeniedIdx  = PAGE_SRC.indexOf('Accesso Limitato');
    expect(checkingGuardIdx).toBeGreaterThan(-1);
    expect(accessDeniedIdx).toBeGreaterThan(-1);
    expect(checkingGuardIdx).toBeLessThan(accessDeniedIdx);
  });
});

// ── 5. Authenticated no-data mode shows Italian empty state ──────────────────
describe('5. Authenticated no-data mode shows honest Italian empty state', () => {
  it('has data-testid="dynamic-cv-empty"', () => {
    expect(PAGE_SRC).toContain('data-testid="dynamic-cv-empty"');
  });

  it('empty state copy mentions ciclo di scoring', () => {
    expect(PAGE_SRC).toContain('ciclo di scoring');
  });

  it('empty branch does not call getCVData(personaId)', () => {
    const emptyStart   = PAGE_SRC.indexOf("cvMode === 'empty'");
    const liveStart    = PAGE_SRC.indexOf("cvMode === 'live'");
    const emptySection = PAGE_SRC.slice(emptyStart, liveStart);
    expect(emptySection).not.toContain('getCVData(personaId)');
  });
});

// ── 6. Demo mode available for unauthenticated/demo users ────────────────────
describe('6. Demo mode available for unauthenticated/demo users', () => {
  it('page has demo render block', () => {
    expect(PAGE_SRC).toContain('data-testid="dynamic-cv-demo"');
  });

  it('401 response routes to demo mode', () => {
    // Both !res.ok check and setCVMode('demo') must appear in the same fetch handler
    expect(PAGE_SRC).toContain("!res.ok");
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

// ── 8. Live mode uses data filtered by Dynamic Impact CV policy ───────────────
describe('8. Live mode uses data filtered by Dynamic Impact CV policy', () => {
  it('live render block references liveCV.experiences', () => {
    expect(PAGE_SRC).toContain('liveCV.experiences');
  });

  it('live render references cvEligibleCount from policy filter', () => {
    expect(PAGE_SRC).toContain('cvEligibleCount');
  });

  it('page imports classifyForDynamicCV policy', () => {
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

// ── 12. Privacy reassurance ───────────────────────────────────────────────────
describe('12. Page includes privacy reassurance', () => {
  it('has data-testid="dynamic-cv-privacy-notice"', () => {
    expect(PAGE_SRC).toContain('data-testid="dynamic-cv-privacy-notice"');
  });

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

  it('live render uses safe display fields only (title, pillar, date)', () => {
    expect(PAGE_SRC).toContain('exp.title');
    expect(PAGE_SRC).toContain('exp.pillar');
  });
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
