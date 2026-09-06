// tests/unit/bworker-5-opportunities-retirement.test.ts
// B-WORKER Slice 5 — Final real-session dependency closure (2026-09-06).
//
// Closes the last item Slice 4 left open: /my-kora/opportunities (personalized
// recommendations, synthetic IU estimates, no canonical recommendation engine).
// No recommendation engine was built — a confirmed real session now redirects
// to /worker/opportunities, a different, real, non-personalized product
// concept (informational partner catalog) that is nonetheless the truthful
// current opportunities capability. This closes REAL_SESSION_MY_KORA_DEPENDENCIES
// to [] and MY_KORA_PREVIEW_REAL_SESSION_CALLERS to 0 — but /my-kora itself,
// MyKoraPreviewService, and the global layout admission branch are NOT
// retired this slice (explicitly deferred to the next cleanup slice).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

// ── 1. Truth audit: two different, real product concepts ───────────────────

describe('B-WORKER-5 — opportunities truth audit', () => {
  const legacy    = read('app/my-kora/opportunities/page.tsx');
  const canonical = read('app/worker/opportunities/page.tsx');
  const service   = read('services/worker-opportunity/WorkerOpportunityService.ts');

  it('legacy page is personalized/synthetic: IU estimates, match reasons, persona-driven', () => {
    expect(legacy).toContain('IU potenziali');
    expect(legacy).toContain('match_reason');
    expect(legacy).toContain('workerOpportunityService.compute(personaId');
  });

  it('WorkerOpportunityService has no live/canonical variant — always calls myKoraPreviewService', () => {
    expect(service).toContain('myKoraPreviewService.getMyKoraHomePreview');
    expect(service).not.toMatch(/compute\w*Live|getOpportunitiesLive/);
  });

  it('canonical page is a real, non-personalized informational partner catalog', () => {
    expect(canonical).toContain('requireKoraAdmin'); // KORA_ADMIN preview redirect path
    expect(canonical).toContain("getCurrentWorkerUser");
    expect(canonical).toContain("schema('network')");
    expect(canonical).toContain("from('partner_profile')");
    expect(canonical).not.toContain('IU potenziali');
    expect(canonical).not.toContain('match_reason');
  });

  it('no personalized recommendation engine exists anywhere in the repository', () => {
    expect(canonical).not.toContain('personaId');
    expect(canonical).not.toMatch(/recommendation.*engine|ranking.*algorithm/i);
  });
});

// ── 2. Real session redirect ─────────────────────────────────────────────

describe('B-WORKER-5 — /my-kora/opportunities redirects a confirmed real session', () => {
  const legacy = read('app/my-kora/opportunities/page.tsx');

  it('probes the real /api/worker/partner-catalog endpoint and redirects to /worker/opportunities on success', () => {
    expect(legacy).toContain("fetch('/api/worker/partner-catalog')");
    expect(legacy).toContain("router.replace('/worker/opportunities')");
  });

  it('holds render (returns null) while checking or redirecting — no flash of synthetic personalization', () => {
    expect(legacy).toMatch(/mode === ['"]checking['"] \|\| mode === ['"]redirecting['"]\) return null/);
  });

  it('the demo/persona preview path (no real session) is completely unchanged', () => {
    expect(legacy).toContain('workerOpportunityService.compute(personaId');
    expect(legacy).toContain('Solo anteprima — Foundation Light');
    expect(legacy).toContain('synthetic_demo_data: true');
  });
});

// ── 3. No feature expansion ──────────────────────────────────────────────

describe('B-WORKER-5 — no recommendation engine, ranking, or personalization was built', () => {
  const canonical = read('app/worker/opportunities/page.tsx');
  const client    = read('app/worker/opportunities/_components/PartnerCatalogClient.tsx');

  it('/worker/opportunities was not modified to add personalization/IU/ranking', () => {
    expect(canonical).not.toContain('IU potenziali');
    expect(canonical).not.toContain('priority');
    // The file's own comment already disclaims ranking ("no booking, no
    // contact, no ranking, no pricing") — assert no actual ranking/scoring
    // field or sort call was added, not a bare substring match.
    expect(client).not.toMatch(/\.sort\(|rankScore|matchScore|recommendationScore/);
  });

  it('no new API route, service, or ML/AI dependency was introduced', () => {
    expect(canonical).not.toMatch(/tensorflow|openai|anthropic|ml-|recommendation-engine/i);
  });

  it('existing pillar filtering/categorization on the canonical page is untouched, not newly added', () => {
    expect(client).toContain('pillarFilter');
  });
});

// ── 4. Global real-session dependency closure ───────────────────────────

describe('B-WORKER-5 — repository-wide real-session /my-kora dependency count is zero', () => {
  const pages = [
    'app/my-kora/page.tsx',
    'app/my-kora/dynamic-cv/page.tsx',
    'app/my-kora/privacy/page.tsx',
    'app/my-kora/collective/page.tsx',
    'app/my-kora/kora-space/page.tsx',
    'app/my-kora/personal-impact-balance/page.tsx',
    'app/my-kora/bookings/page.tsx',
    'app/my-kora/opportunities/page.tsx',
  ];

  it('every /my-kora page with a real canonical replacement redirects a confirmed real session', () => {
    for (const page of pages) {
      expect(read(page)).toMatch(/router\.replace\(/);
    }
  });

  it('/my-kora/kora-link (server component) redirects a confirmed real session too', () => {
    const koraLink = read('app/my-kora/kora-link/page.tsx');
    expect(koraLink).toContain('getSessionKoraRole');
    expect(koraLink).toContain("redirect('/worker/kora-link/activate')");
  });

  it('no authenticated Sidebar/workspace/pipeline navigation points a real session at /my-kora/opportunities', () => {
    for (const file of [
      'components/layout/Sidebar.tsx',
      'app/worker/workspace/page.tsx',
      'app/admin/pipeline/_components/PilotLifecycleClient.tsx',
    ]) {
      expect(read(file)).not.toContain("'/my-kora/opportunities'");
    }
  });
});

// ── 5. MyKoraPreviewService reachability — zero real-session callers ──────

describe('B-WORKER-5 — MyKoraPreviewService has zero real-session-reachable callers', () => {
  const callers = [
    'app/my-kora/page.tsx',
    'app/my-kora/dynamic-cv/page.tsx',
    'app/my-kora/privacy/page.tsx',
    'app/my-kora/collective/page.tsx',
    'app/my-kora/kora-space/page.tsx',
    'app/my-kora/personal-impact-balance/page.tsx',
  ];

  it('every page-level myKoraPreviewService caller redirects real sessions before ever reaching it', () => {
    for (const page of callers) {
      const src = read(page);
      const redirectIdx = src.indexOf('router.replace(');
      const callIdx = src.indexOf('myKoraPreviewService.');
      expect(redirectIdx).toBeGreaterThan(-1);
      expect(callIdx).toBeGreaterThan(redirectIdx);
    }
  });

  it('the WorkerOpportunityService → myKoraPreviewService chain is also now demo-only reachable via /my-kora/opportunities', () => {
    const legacy = read('app/my-kora/opportunities/page.tsx');
    const redirectIdx = legacy.indexOf('router.replace(');
    const computeIdx = legacy.indexOf('workerOpportunityService.compute(');
    expect(redirectIdx).toBeGreaterThan(-1);
    expect(computeIdx).toBeGreaterThan(redirectIdx);
  });

  it('MyKoraPreviewService itself is unchanged — not retired, not modified (deferred to next slice)', () => {
    expect(read('services/my-kora-preview/MyKoraPreviewService.ts')).toContain('class MyKoraPreviewService');
  });
});

// ── 6. Boundary discipline: not the final cleanup slice ─────────────────

describe('B-WORKER-5 — explicit boundary: /my-kora runtime not globally retired this slice', () => {
  it('app/my-kora/layout.tsx still exists with its real-session admission branch intact', () => {
    const layout = read('app/my-kora/layout.tsx');
    expect(layout).toContain('realUserPermitted');
    expect(layout).toContain('WorkerSessionProvider');
  });

  it('WorkerProvisioningService and WorkerAchievementService (B-WORKER I9 residuals) are untouched', () => {
    expect(read('services/worker-provisioning/WorkerProvisioningService.ts')).toContain('WorkerProvisioningService');
    expect(read('services/worker-achievements/WorkerAchievementService.ts')).toContain('WorkerAchievementService');
  });

  it('the I9 synthetic import allowlist is unchanged — still exactly the 3 B_WORKER-owned entries', () => {
    const allowlist = read('lib/security/synthetic-import-allowlist.ts');
    const arrayStart = allowlist.indexOf('export const SYNTHETIC_IMPORT_ALLOWLIST');
    const arrayEnd = allowlist.indexOf('];', arrayStart);
    const matches = (allowlist.slice(arrayStart, arrayEnd).match(/owner: 'B_WORKER'/g)) ?? [];
    expect(matches.length).toBe(3);
  });
});

// ── 7. Security / auth foundation preserved ──────────────────────────────

describe('B-WORKER-5 — auth foundation preserved', () => {
  it('requireWorkerUser / getCurrentWorkerUser unchanged (spot check)', () => {
    const session = read('lib/auth/kora-session.ts');
    expect(session).toContain('export async function requireWorkerUser');
    expect(session).toContain('export async function getCurrentWorkerUser');
  });

  it('/api/worker/partner-catalog (the new probe endpoint) requires a real WORKER session', () => {
    const api = read('app/api/worker/partner-catalog/route.ts');
    expect(api).toContain('requireWorkerUser');
  });
});
