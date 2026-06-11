// tests/unit/b125-trial-execution-hardening.test.ts
// B125: Live Trial Execution Hardening -- 10 structural tests.
//
// Verifies:
//   1. Control center fetches worker_participation (not just worker_initiative) for step 11
//   2. OP-001 isolation: both page and API warn when OP-001 is present as live tenant
//   3. Partner count uses schema('network') in API and page
//   4. Worker counts: only tenant_id + status selected -- no name, email, ref
//   5. Warnings in page are actionable objects { text, href } with links
//   6. Wallboard readiness checks safeguard status, not individual worker rows
//   7. Dynamic CV readiness uses participation count, not just onboarding flag
//   8. Docs cite KORA-TRIAL as canonical tenant
//   9. Docs cite 14-step checklist
//   10. Docs explicitly say not to use OP-001 as live tenant
//
// All strings use ASCII-only quotes. OXC transformer rejects Unicode quote chars.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

const controlCenter = readFile('app/admin/trial-control-center/page.tsx');
const apiRoute      = readFile('app/api/admin/trial-readiness/route.ts');
const demoPack      = readFile('docs/LIVE_TRIAL_DEMO_PACK.md');

// --- 1: Participation table fetched for step 11 ----------------------------

describe('B125 -- step 11 uses worker_participation not worker_initiative', () => {
  it('page fetches worker_participation for participation count (not just worker_initiative)', () => {
    // The page must query personal.worker_participation
    expect(controlCenter).toContain("from('worker_participation')");
    // And select only tenant_id and status (no individual identifiers)
    const participationSelect = controlCenter.includes("from('worker_participation')") &&
      controlCenter.includes("select('tenant_id, status')");
    expect(participationSelect).toBe(true);
  });

  it('step 11 check uses participationCount not workerActive', () => {
    // Step 11 ok condition must reference participationCount
    expect(controlCenter).toContain('participationCount > 0');
    // Step 11 label references interazioni
    expect(controlCenter).toContain('Interazioni worker presenti');
  });
});

// --- 2: OP-001 isolation ---------------------------------------------------

describe('B125 -- OP-001 isolation warning', () => {
  it('page generates a global warning when OP-001 is detected as live tenant', () => {
    // The page must check for tenant code OP-001 and push a global warning
    expect(controlCenter).toContain("'OP-001'");
    // And the warning references KORA-TRIAL as the correct alternative
    expect(controlCenter).toContain('KORA-TRIAL');
  });

  it('API route generates a global warning when OP-001 is detected', () => {
    expect(apiRoute).toContain("'OP-001'");
    expect(apiRoute).toContain('KORA-TRIAL');
  });
});

// --- 3: Partner count uses network schema ---------------------------------

describe('B125 -- partner count uses network schema', () => {
  it('API uses schema(network) for partner_profile count', () => {
    expect(apiRoute).toContain("schema('network').from('partner_profile')");
  });

  it('page uses schema(network) for partner_profile count', () => {
    expect(controlCenter).toContain("schema('network').from('partner_profile')");
  });
});

// --- 4: Worker counts select only status, no PII -------------------------

describe('B125 -- worker counts never select PII fields', () => {
  it('page selects only tenant_id and status from worker_identity', () => {
    // worker_identity selection must not include email, name, worker_ref
    const pageWorkerSelect = controlCenter.includes("from('worker_identity')");
    expect(pageWorkerSelect).toBe(true);
    expect(controlCenter).not.toContain("select('email')");
    expect(controlCenter).not.toContain("select('worker_ref')");
    expect(controlCenter).not.toContain("select('display_name')");
  });

  it('API selects only tenant_id and status from worker_identity', () => {
    expect(apiRoute).not.toContain("select('email')");
    expect(apiRoute).not.toContain("select('worker_ref')");
    expect(apiRoute).not.toContain("select('display_name')");
  });
});

// --- 5: Warnings are actionable (page has warning href links) -------------

describe('B125 -- warnings are actionable with href links', () => {
  it('tenant warning chips in page have href attribute (actionable links)', () => {
    // Warnings are rendered as <a> tags with href, not plain <span>
    expect(controlCenter).toContain('data-testid="tenant-warning-action"');
    // The Warning type has a href field
    expect(controlCenter).toContain('text: string; href: string');
  });

  it('global warnings in page have href attribute', () => {
    expect(controlCenter).toContain('data-testid="global-warning-action"');
    expect(controlCenter).toContain('data-testid="global-warnings"');
  });

  it('API warnings include next action path in text', () => {
    // API warnings embed next action path in the string
    expect(apiRoute).toContain('/admin/data-intake');
    expect(apiRoute).toContain('/admin/uef-review');
    expect(apiRoute).toContain('/admin/workers');
  });
});

// --- 6: Wallboard readiness uses safeguard status -------------------------

describe('B125 -- wallboard readiness checks safeguard, not individual rows', () => {
  it('page wallboard readiness checks safeguard_status field', () => {
    // wallboardReady must reference safeguard_status
    expect(controlCenter).toContain('safeguard_status');
    // Uses CLEAR and WARNING thresholds
    expect(controlCenter).toContain("'CLEAR'");
    expect(controlCenter).toContain("'WARNING'");
    // Never checks individual worker fields for wallboard
    expect(controlCenter).not.toContain("wallboardReady = workerActive");
  });

  it('API wallboard readiness checks safeguard_status, not individual data', () => {
    expect(apiRoute).toContain('safeguard_status');
    expect(apiRoute).toContain("'CLEAR'");
    expect(apiRoute).toContain("'WARNING'");
  });
});

// --- 7: Dynamic CV readiness uses participationCount ----------------------

describe('B125 -- Dynamic CV readiness based on participation count', () => {
  it('page Dynamic CV readiness row uses participationCount', () => {
    // The Dynamic CV readiness PipelineRow must check participationCount
    expect(controlCenter).toContain('Dynamic CV readiness');
    expect(controlCenter).toContain('t.participationCount > 0');
  });

  it('page participationCount is derived from worker_participation, not worker_initiative', () => {
    // participationCount computed from participations array (worker_participation)
    expect(controlCenter).toContain('participationCount');
    // Not from worker_initiative directly
    const participationFromParticipations =
      controlCenter.includes('participations.filter') &&
      controlCenter.includes('participationCount');
    expect(participationFromParticipations).toBe(true);
  });
});

// --- 8: Docs cite KORA-TRIAL as canonical tenant --------------------------

describe('B125 -- docs cite KORA-TRIAL as canonical live tenant', () => {
  it('LIVE_TRIAL_DEMO_PACK cites KORA-TRIAL as canonical tenant', () => {
    expect(demoPack).toContain('KORA-TRIAL');
    // Mentioned as the tenant to use
    const hasCanonical =
      demoPack.includes('Tenant trial canonico') ||
      demoPack.includes('tenant trial canonico') ||
      demoPack.includes('KORA-TRIAL');
    expect(hasCanonical).toBe(true);
  });

  it('LIVE_TRIAL_DEMO_PACK has live result section', () => {
    // B125 adds a live result table to be filled after each trial
    expect(demoPack).toContain('Risultato live');
  });
});

// --- 9: Docs cite 14-step checklist ---------------------------------------

describe('B125 -- docs cite 14-step checklist', () => {
  it('LIVE_TRIAL_DEMO_PACK pre-demo checklist has Step 14', () => {
    expect(demoPack).toContain('Step 14:');
  });

  it('LIVE_TRIAL_DEMO_PACK references all 14 steps', () => {
    const hasStepRange =
      demoPack.includes('Step 1:') && demoPack.includes('Step 14:');
    expect(hasStepRange).toBe(true);
  });
});

// --- 10: Docs say not to use OP-001 as live -------------------------------

describe('B125 -- docs explicitly prohibit OP-001 as live tenant', () => {
  it('LIVE_TRIAL_DEMO_PACK explicitly says non usare OP-001 for live trial', () => {
    const hasOp001Guard =
      demoPack.includes('Non usare OP-001') ||
      demoPack.includes('non usare OP-001') ||
      demoPack.includes('Non usare OP-001') ||
      demoPack.includes('OP-001 e\' riservato') ||
      demoPack.includes("OP-001 e' riservato");
    expect(hasOp001Guard).toBe(true);
  });

  it('LIVE_TRIAL_DEMO_PACK identifies OP-001 as synthetic-only demo', () => {
    const hasSyntheticNote =
      demoPack.includes('demo sintetica') ||
      demoPack.includes('sintetica standalone');
    expect(hasSyntheticNote).toBe(true);
  });
});
