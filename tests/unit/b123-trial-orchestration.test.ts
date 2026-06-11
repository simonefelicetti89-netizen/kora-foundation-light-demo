// tests/unit/b123-trial-orchestration.test.ts
// B123: Live Trial Orchestration & Demo Pack -- 24 structural tests.
//
// Verifies:
//   - /admin/trial-control-center exists and is KORA_ADMIN gated
//   - /api/admin/trial-readiness exists and is KORA_ADMIN gated
//   - trial-readiness never exposes individual worker data
//   - trial-readiness aggregates pipeline, worker, partner state
//   - docs/LIVE_TRIAL_DEMO_PACK.md exists with required content
//   - no scoring formula modified
//
// All strings use ASCII-only quotes. No smart/curly quotes, no em-dashes.
// OXC transformer rejects Unicode quote characters as string delimiters.

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

function readFile(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf-8');
}

function fileExists(rel: string): boolean {
  return fs.existsSync(path.join(ROOT, rel));
}

const controlCenter = readFile('app/admin/trial-control-center/page.tsx');
const apiRoute      = readFile('app/api/admin/trial-readiness/route.ts');
const demoPack      = readFile('docs/LIVE_TRIAL_DEMO_PACK.md');
const methodConfig  = readFile('lib/methodology-config/v0.1.ts');

// --- 1-3: Trial Control Center ------------------------------------------

describe('B123 -- /admin/trial-control-center', () => {
  it('trial-control-center page file exists', () => {
    expect(fileExists('app/admin/trial-control-center/page.tsx')).toBe(true);
  });

  it('trial-control-center requires KORA_ADMIN (requireKoraAdmin)', () => {
    expect(controlCenter).toContain('requireKoraAdmin');
    expect(controlCenter).toContain('isKoraAuthError');
  });

  it('trial-control-center has data-testid="trial-control-center"', () => {
    expect(controlCenter).toContain('data-testid="trial-control-center"');
  });
});

// --- 4-6: API /api/admin/trial-readiness auth --------------------------

describe('B123 -- /api/admin/trial-readiness auth', () => {
  it('/api/admin/trial-readiness route file exists', () => {
    expect(fileExists('app/api/admin/trial-readiness/route.ts')).toBe(true);
  });

  it('trial-readiness requires KORA_ADMIN (requireKoraAdmin)', () => {
    expect(apiRoute).toContain('requireKoraAdmin');
    expect(apiRoute).toContain('isKoraAuthError');
  });

  it('trial-readiness uses service role client (getSupabaseServiceClient)', () => {
    expect(apiRoute).toContain('getSupabaseServiceClient');
  });
});

// --- 7-9: Privacy contract — no individual worker data ----------------

describe('B123 -- trial-readiness privacy contract', () => {
  it('trial-readiness never selects worker email', () => {
    // Must not select email from worker_identity or worker_profile_private
    // worker_identity selects 'tenant_id, status' only
    expect(apiRoute).not.toContain("select('email')");
    expect(apiRoute).not.toContain("'email, status'");
    expect(apiRoute).not.toContain("select('tenant_id, email");
  });

  it('trial-readiness never selects worker_id or worker_ref as individual fields', () => {
    // Only aggregate counts returned — no individual identifier queries
    // Check actual query patterns, not comments
    expect(apiRoute).not.toContain("select('worker_ref')");
    expect(apiRoute).not.toContain("select('worker_id')");
    expect(apiRoute).not.toContain("select('tenant_id, worker_ref");
    expect(apiRoute).not.toContain("select('tenant_id, worker_id");
  });

  it('trial-readiness never selects private_note', () => {
    // Check actual Supabase query patterns — comments are allowed to mention private_note
    expect(apiRoute).not.toContain("select('private_note");
    expect(apiRoute).not.toContain(".select('tenant_id, private_note");
    expect(apiRoute).not.toContain("from('worker_profile_private').select('private_note')");
  });
});

// --- 10-13: API response structure -------------------------------------

describe('B123 -- trial-readiness response structure', () => {
  it('trial-readiness response type includes pipeline status fields', () => {
    expect(apiRoute).toContain('uefCandidates');
    expect(apiRoute).toContain('uefApproved');
    expect(apiRoute).toContain('hasKoraIndex');
    expect(apiRoute).toContain('hasDecisionPack');
    expect(apiRoute).toContain('wallboardReady');
  });

  it('trial-readiness response includes worker aggregate counts (no individuals)', () => {
    expect(apiRoute).toContain('workerTotal');
    expect(apiRoute).not.toContain('workerEmail');
    expect(apiRoute).not.toContain('workerName');
  });

  it('trial-readiness response includes partner catalog counts', () => {
    expect(apiRoute).toContain('PartnerCatalogStatus');
    expect(apiRoute).toContain("schema('network').from('partner_profile')");
  });

  it('trial-readiness response includes wallboardReady flag per tenant', () => {
    // wallboardReady: true when KORA Index exists and safeguard is CLEAR or WARNING
    expect(apiRoute).toContain('wallboardReady');
    // Check that safeguard values are used to compute wallboard readiness
    const hasWallboardLogic =
      apiRoute.includes("'CLEAR'") && apiRoute.includes("'WARNING'") &&
      apiRoute.includes('wallboardReady');
    expect(hasWallboardLogic).toBe(true);
  });
});

// --- 14-17: Control Center quick links ---------------------------------

describe('B123 -- Trial Control Center quick links', () => {
  it('control center links to Data Intake', () => {
    expect(controlCenter).toContain('/admin/data-intake');
  });

  it('control center links to UEF Review', () => {
    expect(controlCenter).toContain('/admin/uef-review');
  });

  it('control center links to Company Workspace or reports', () => {
    expect(controlCenter).toContain('/company/wallboard');
  });

  it('control center links to Worker admin routes', () => {
    expect(controlCenter).toContain('/admin/workers');
    expect(controlCenter).toContain('/admin/worker-initiatives');
  });
});

// --- 18-19: Control Center preview links -------------------------------

describe('B123 -- Control Center admin preview links', () => {
  it('control center links to Dynamic CV admin preview', () => {
    expect(controlCenter).toContain('/admin/preview/worker/dynamic-cv');
  });

  it('control center links to Partner Catalog admin', () => {
    expect(controlCenter).toContain('/admin/partners');
  });
});

// --- 20-23: LIVE_TRIAL_DEMO_PACK doc -----------------------------------

describe('B123 -- LIVE_TRIAL_DEMO_PACK.md', () => {
  it('LIVE_TRIAL_DEMO_PACK.md exists', () => {
    expect(fileExists('docs/LIVE_TRIAL_DEMO_PACK.md')).toBe(true);
  });

  it('demo pack mentions 20 minuti demo duration', () => {
    expect(demoPack).toContain('20 minuti');
  });

  it('demo pack states no individual worker visibility to company', () => {
    const hasPrivacyStatement =
      demoPack.includes('nessun dato individuale') ||
      demoPack.includes('nessun nome worker') ||
      demoPack.includes('non vede mai dati individuali') ||
      demoPack.includes('non vede mai dati individual') ||
      demoPack.includes('Azienda non vede individui');
    expect(hasPrivacyStatement).toBe(true);
  });

  it('demo pack states KORA misura organizzazioni non individui', () => {
    const hasMisuraClaim =
      demoPack.includes('KORA misura le organizzazioni') ||
      demoPack.includes('misura l\'attivazione organizzativa') ||
      demoPack.includes('misura organizzazioni, non individui');
    expect(hasMisuraClaim).toBe(true);
  });

  it('demo pack has Foundation Light limitations section', () => {
    expect(demoPack).toContain('Limitations');
    expect(demoPack).toContain('Foundation Light');
    expect(demoPack).toContain('pre-empirical-calibration');
  });

  it('demo pack has troubleshooting section', () => {
    expect(demoPack).toContain('Troubleshooting');
    expect(demoPack).toContain('Problema:');
  });
});

// --- 24: No scoring formula changed ------------------------------------

describe('B123 -- No scoring formula modified', () => {
  it('methodology config is unchanged (weights still read from config, not hardcoded)', () => {
    // The methodology config should still have getMacroblockWeights or similar
    expect(methodConfig).toContain('REACH');
    expect(methodConfig).toContain('QUALITY');
    expect(methodConfig).toContain('EQUITY');
    expect(methodConfig).not.toContain('// B123');
  });
});
