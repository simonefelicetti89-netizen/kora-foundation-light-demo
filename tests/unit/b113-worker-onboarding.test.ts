// tests/unit/b113-worker-onboarding.test.ts
// B113: Worker Onboarding & Privacy Consent Flow — 22 structural tests.
// All tests are file-system / source-code checks — no live Supabase calls.

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

function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

// ─── Source files under test ──────────────────────────────────────────────────

const onboardingRoute   = readFile('app/api/worker/onboarding/route.ts');
const onboardingPage    = readFile('app/worker/onboarding/page.tsx');
const onboardingFlow    = readFile('app/worker/onboarding/_flow.tsx');
const workerWorkspace   = readFile('app/worker/workspace/page.tsx');
const workerSetup       = readFile('app/worker/setup-password/_form.tsx');
const migration009      = readFile('supabase/migrations/009_worker_onboarding.sql');

// ─── 1. Onboarding API requires WORKER role ───────────────────────────────────

describe('Onboarding API — auth', () => {
  it('GET route calls requireWorkerUser', () => {
    expect(onboardingRoute).toContain('requireWorkerUser');
    expect(onboardingRoute).toContain('isKoraAuthError');
  });

  it('POST route calls requireWorkerUser', () => {
    // Both GET and POST use requireWorkerUser — single file
    const occurrences = (onboardingRoute.match(/requireWorkerUser/g) ?? []).length;
    expect(occurrences).toBeGreaterThanOrEqual(2);
  });
});

// ─── 2. Onboarding API does not accept worker_id from body ────────────────────

describe('Onboarding API — no worker_id from client', () => {
  it('POST does not read worker_id from body', () => {
    const stripped = stripLineComments(onboardingRoute);
    // worker_id from session, not from body
    expect(stripped).not.toContain("body.worker_id");
    expect(stripped).not.toContain("body['worker_id']");
  });

  it('workerId is destructured from requireWorkerUser result (session only)', () => {
    expect(onboardingRoute).toContain('const { workerId');
  });
});

// ─── 3. Onboarding API does not accept tenant_id from body ───────────────────

describe('Onboarding API — no tenant_id from client', () => {
  it('POST does not read tenant_id from query params or body', () => {
    const stripped = stripLineComments(onboardingRoute);
    expect(stripped).not.toContain("body.tenant_id");
    expect(stripped).not.toContain("body['tenant_id']");
    expect(stripped).not.toContain("searchParams.get('tenant_id')");
  });
});

// ─── 4. POST requires acceptPrivacyBoundary = true ───────────────────────────

describe('Onboarding API — consent required', () => {
  it('POST rejects acceptPrivacyBoundary !== true', () => {
    expect(onboardingRoute).toContain('acceptPrivacyBoundary !== true');
    expect(onboardingRoute).toContain('400');
  });

  it('POST saves privacy_consent_version', () => {
    expect(onboardingRoute).toContain('privacy_consent_version');
    expect(onboardingRoute).toContain('CURRENT_PRIVACY_CONSENT_VERSION');
  });

  it('POST saves privacy_consent_accepted_at', () => {
    expect(onboardingRoute).toContain('privacy_consent_accepted_at');
  });

  it('POST saves onboarding_completed_at', () => {
    expect(onboardingRoute).toContain('onboarding_completed_at');
  });
});

// ─── 5. display_name is optional and validated ───────────────────────────────

describe('Onboarding API — display_name safe', () => {
  it('display_name is optional (null case handled)', () => {
    expect(onboardingRoute).toContain('safeDisplayName');
    expect(onboardingRoute).toContain('= null');
  });

  it('display_name is length-validated (max 80 chars)', () => {
    expect(onboardingRoute).toContain('> 80');
    expect(onboardingRoute).toContain('80 caratteri');
  });
});

// ─── 6. preferred_lang supports it/en only ───────────────────────────────────

describe('Onboarding API — preferred_lang', () => {
  it('preferred_lang validates against ALLOWED_LANGS', () => {
    expect(onboardingRoute).toContain("'it'");
    expect(onboardingRoute).toContain("'en'");
    expect(onboardingRoute).toContain('ALLOWED_LANGS');
  });

  it('unknown lang defaults to it', () => {
    expect(onboardingRoute).toContain("'it'");
    // Fallback to 'it' for unknown values
    expect(onboardingRoute).toContain(': \'it\'');
  });
});

// ─── 7. Worker workspace gate ────────────────────────────────────────────────

describe('Worker workspace — onboarding gate', () => {
  it('workspace page redirects to /worker/onboarding if not completed', () => {
    expect(workerWorkspace).toContain("redirect('/worker/onboarding')");
    expect(workerWorkspace).toContain('onboarding_completed_at');
  });

  it('workspace page reads onboarding_completed_at from profile', () => {
    const stripped = stripLineComments(workerWorkspace);
    expect(stripped).toContain('onboarding_completed_at');
    // Gate comes before rendering
    const gateIdx = stripped.indexOf("redirect('/worker/onboarding')");
    const renderIdx = stripped.indexOf('return (');
    expect(gateIdx).toBeGreaterThan(0);
    expect(gateIdx).toBeLessThan(renderIdx);
  });

  it('workspace page imports redirect from next/navigation', () => {
    expect(workerWorkspace).toContain("import { ");
    expect(workerWorkspace).toContain("redirect");
  });
});

// ─── 8. Setup password redirects to onboarding ────────────────────────────────

describe('Setup password — onboarding redirect', () => {
  it('setup password redirects to /worker/onboarding after success', () => {
    expect(workerSetup).toContain("'/worker/onboarding'");
  });

  it('setup password does NOT redirect directly to /worker/workspace', () => {
    const stripped = stripLineComments(workerSetup);
    // Must not push directly to workspace (skipping onboarding)
    expect(stripped).not.toContain("router.push('/worker/workspace')");
  });
});

// ─── 9. Worker workspace shows privacy badge ─────────────────────────────────

describe('Worker workspace — privacy badge', () => {
  it('workspace shows "Spazio privato attivo" badge', () => {
    expect(workerWorkspace).toContain('Spazio privato attivo');
    expect(workerWorkspace).toContain('privacy-active-badge');
  });

  it('workspace contains "Rivedi privacy boundary" link', () => {
    expect(workerWorkspace).toContain('Rivedi privacy boundary');
    expect(workerWorkspace).toContain('/worker/onboarding?mode=review');
  });
});

// ─── 10. Onboarding page requires WORKER session ─────────────────────────────

describe('Onboarding page — auth', () => {
  it('onboarding page calls getCurrentWorkerUser', () => {
    expect(onboardingPage).toContain('getCurrentWorkerUser');
  });

  it('onboarding page redirects non-authenticated to /login (B117-B — unified entry)', () => {
    // B117-B: worker pages redirect to /login (not /worker/login) to break layout loop
    expect(onboardingPage).toContain("redirect('/login')");
    expect(onboardingPage).not.toContain("redirect('/worker/login')");
  });
});

// ─── 11. Privacy copy is correct ─────────────────────────────────────────────

describe('Onboarding flow — privacy copy', () => {
  it('privacy copy says azienda vede solo aggregati anonimi', () => {
    expect(onboardingFlow).toContain('aggregati anonimi');
  });

  it('privacy copy says profilo individuale resta privato', () => {
    expect(onboardingFlow).toContain('profilo individuale');
  });

  it('privacy copy says KORA misura organizzazione non individuo', () => {
    expect(onboardingFlow).toContain('misura');
    expect(onboardingFlow).toContain('organizzazione');
    expect(onboardingFlow).toContain('individuo');
  });

  it('privacy copy mentions soglia privacy (threshold)', () => {
    expect(onboardingFlow).toContain('10 lavoratori');
  });

  it('privacy copy says no ranking', () => {
    expect(onboardingFlow).toContain('ranking');
  });

  it('privacy copy says note private non visibili', () => {
    expect(onboardingFlow).toContain('note private');
  });
});

// ─── 12. Review mode works without new consent ───────────────────────────────

describe('Onboarding — review mode', () => {
  it('onboarding page handles mode=review', () => {
    expect(onboardingPage).toContain("'review'");
    expect(onboardingPage).toContain('isReview');
  });

  it('review mode shows ReviewMode component without re-consent', () => {
    expect(onboardingFlow).toContain('ReviewMode');
    expect(onboardingFlow).toContain('reviewMode');
  });
});

// ─── 13. No ranking or peer comparison in onboarding ─────────────────────────

describe('Onboarding — no ranking introduced', () => {
  it('onboarding flow does not display ranking positions', () => {
    const stripped = stripLineComments(onboardingFlow);
    expect(stripped.toLowerCase()).not.toContain('sei al');
    expect(stripped.toLowerCase()).not.toContain('classifica');
    expect(stripped.toLowerCase()).not.toContain('percentile');
    expect(stripped.toLowerCase()).not.toContain('media aziendale');
  });

  it('onboarding flow does not compare with other workers', () => {
    const stripped = stripLineComments(onboardingFlow);
    expect(stripped.toLowerCase()).not.toContain('altri worker');
    expect(stripped.toLowerCase()).not.toContain('colleghi');
  });
});

// ─── 14. Migration 009 adds correct fields ───────────────────────────────────

describe('Migration 009 — schema', () => {
  it('migration 009 file exists', () => {
    expect(fileExists('supabase/migrations/009_worker_onboarding.sql')).toBe(true);
  });

  it('migration adds onboarding_status field', () => {
    expect(migration009).toContain('onboarding_status');
  });

  it('migration adds onboarding_completed_at field', () => {
    expect(migration009).toContain('onboarding_completed_at');
  });

  it('migration adds privacy_consent_version field', () => {
    expect(migration009).toContain('privacy_consent_version');
  });

  it('migration adds privacy_consent_accepted_at field', () => {
    expect(migration009).toContain('privacy_consent_accepted_at');
  });
});

// ─── 15. No synthetic data in onboarding ─────────────────────────────────────

describe('Onboarding — no fake data', () => {
  it('onboarding route does not import synthetic data', () => {
    expect(onboardingRoute).not.toContain('/data/synthetic/');
    expect(onboardingRoute).not.toContain("from '@/data/");
  });

  it('onboarding page does not import synthetic data', () => {
    expect(onboardingPage).not.toContain('/data/synthetic/');
    expect(onboardingPage).not.toContain("from '@/data/");
  });
});
