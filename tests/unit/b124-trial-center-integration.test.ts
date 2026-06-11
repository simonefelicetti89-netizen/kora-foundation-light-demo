// tests/unit/b124-trial-center-integration.test.ts
// B124: Trial Control Center Integration & Live Trial Validation -- 20 structural tests.
//
// Verifies:
//   - Trial Control Center is in admin sidebar, not in company/worker sidebar
//   - Admin home has Trial Control Center card
//   - All quick links are admin-safe (no /worker/login, no /company/login)
//   - Checklist has 14 steps including privacy boundary
//   - Worker preview links use /admin/preview/worker/* paths
//   - Readiness API never exposes individual worker data
//   - Docs reference /admin/trial-control-center as starting point
//
// All strings use ASCII-only quotes. OXC transformer rejects Unicode quote chars.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { buildNavGroups } from '../../components/layout/Sidebar';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

const controlCenter = readFile('app/admin/trial-control-center/page.tsx');
const apiRoute      = readFile('app/api/admin/trial-readiness/route.ts');
const adminHome     = readFile('app/admin/page.tsx');
const demoPack      = readFile('docs/LIVE_TRIAL_DEMO_PACK.md');
const methodConfig  = readFile('lib/methodology-config/v0.1.ts');

// --- 1-3: Sidebar integration ------------------------------------------

describe('B124 -- Sidebar integration', () => {
  it('Admin sidebar contains Trial Control Center link', () => {
    const groups = buildNavGroups('KORA_ADMIN');
    const allItems = groups.flatMap(g => g.items);
    const tccItem = allItems.find(i => i.label === 'Trial Control Center');
    expect(tccItem).toBeDefined();
    expect(tccItem?.href).toBe('/admin/trial-control-center');
  });

  it('Company Admin sidebar does NOT contain Trial Control Center', () => {
    const groups = buildNavGroups('COMPANY_ADMIN');
    const allItems = groups.flatMap(g => g.items);
    const tccItem = allItems.find(i => i.href === '/admin/trial-control-center');
    expect(tccItem).toBeUndefined();
  });

  it('Worker sidebar does NOT contain Trial Control Center', () => {
    const groups = buildNavGroups('WORKER');
    const allItems = groups.flatMap(g => g.items);
    const tccItem = allItems.find(i => i.href === '/admin/trial-control-center');
    expect(tccItem).toBeUndefined();
  });
});

// --- 4: Admin home card -----------------------------------------------

describe('B124 -- Admin home card', () => {
  it('Admin home has Trial Control Center featured card with data-testid', () => {
    expect(adminHome).toContain('data-testid="admin-home-trial-control-center-card"');
    expect(adminHome).toContain('Trial Control Center');
    expect(adminHome).toContain('Apri Control Center');
  });
});

// --- 5-10: Quick links ------------------------------------------------

describe('B124 -- Quick links are admin-safe', () => {
  it('Quick link Data Intake exists', () => {
    expect(controlCenter).toContain('/admin/data-intake');
  });

  it('Quick link Wallboard exists', () => {
    expect(controlCenter).toContain('/company/wallboard');
  });

  it('Worker Preview uses /admin/preview/worker path', () => {
    expect(controlCenter).toContain('/admin/preview/worker/dynamic-cv');
  });

  it('Dynamic CV Preview uses /admin/preview/worker/dynamic-cv', () => {
    const previewCvCount = (controlCenter.match(/\/admin\/preview\/worker\/dynamic-cv/g) ?? []).length;
    expect(previewCvCount).toBeGreaterThanOrEqual(1);
  });

  it('Privacy Preview uses /admin/preview/worker/privacy', () => {
    expect(controlCenter).toContain('/admin/preview/worker/privacy');
  });

  it('Partner Catalog quick link uses /admin/partners', () => {
    expect(controlCenter).toContain('/admin/partners');
  });
});

// --- 11-12: No role-confused links ------------------------------------

describe('B124 -- No worker/company login links in Control Center', () => {
  it('No quick link sends KORA_ADMIN to /worker/login', () => {
    expect(controlCenter).not.toContain('/worker/login');
  });

  it('No quick link sends KORA_ADMIN to /company/login', () => {
    expect(controlCenter).not.toContain('/company/login');
  });
});

// --- 13-14: Checklist 14 steps ----------------------------------------

describe('B124 -- Checklist has 14 steps including privacy boundary', () => {
  it('Checklist uses dynamic step data-testid template and has step objects 1-14', () => {
    // step numbers 1-14 are in the checklist items array
    expect(controlCenter).toContain('step: 1,');
    expect(controlCenter).toContain('step: 14,');
    // dynamic data-testid rendered via template expression
    expect(controlCenter).toContain('checklist-step-${item.step}');
  });

  it('Checklist step 14 covers privacy boundary', () => {
    // step 14 has the privacy boundary label
    expect(controlCenter).toContain("step: 14,");
    expect(controlCenter).toContain('Privacy boundary verificato');
  });
});

// --- 15-16: Readiness API privacy -------------------------------------

describe('B124 -- Readiness API privacy', () => {
  it('Readiness API does not expose worker email', () => {
    expect(apiRoute).not.toContain("select('email')");
    expect(apiRoute).not.toContain("'tenant_id, email");
  });

  it('Readiness API does not expose worker_id as individual field', () => {
    expect(apiRoute).not.toContain("select('worker_id')");
    expect(apiRoute).not.toContain("select('tenant_id, worker_id");
  });
});

// --- 17-19: Docs reference control center ----------------------------

describe('B124 -- Docs reference Trial Control Center', () => {
  it('LIVE_TRIAL_DEMO_PACK cites /admin/trial-control-center as starting point', () => {
    expect(demoPack).toContain('/admin/trial-control-center');
  });

  it('LIVE_TRIAL_DEMO_PACK has pre-demo checklist with 14 steps', () => {
    expect(demoPack).toContain('Step 14:');
    expect(demoPack).toContain('Privacy boundary verificato');
  });

  it('LIVE_TRIAL_DEMO_PACK has missing/troubleshooting section', () => {
    expect(demoPack).toContain('Se qualcosa è missing nel Control Center');
  });
});

// --- 20: No scoring formula changed -----------------------------------

describe('B124 -- No scoring formula modified', () => {
  it('Methodology config unchanged (weights still in config)', () => {
    expect(methodConfig).toContain('REACH');
    expect(methodConfig).toContain('QUALITY');
    expect(methodConfig).toContain('EQUITY');
    expect(methodConfig).not.toContain('// B124');
  });
});
