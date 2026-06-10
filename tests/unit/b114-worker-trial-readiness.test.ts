// tests/unit/b114-worker-trial-readiness.test.ts
// B114: Worker Seed & End-to-End Trial — 15 structural tests.
// Verifies that the trial fixture and runbook are correct and complete.

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

// ─── Source files ─────────────────────────────────────────────────────────────

const seedRaw  = readFile('data/worker-trial/worker_trial_seed.json');
const seed     = JSON.parse(seedRaw) as Record<string, unknown>;
const runbook  = readFile('docs/WORKER_TRIAL_RUNBOOK.md');

// ─── 1. Fixture file exists ───────────────────────────────────────────────────

describe('Trial fixture — file exists', () => {
  it('data/worker-trial/worker_trial_seed.json exists', () => {
    expect(fileExists('data/worker-trial/worker_trial_seed.json')).toBe(true);
  });

  it('docs/WORKER_TRIAL_RUNBOOK.md exists', () => {
    expect(fileExists('docs/WORKER_TRIAL_RUNBOOK.md')).toBe(true);
  });
});

// ─── 2. Fixture: no PII ────────────────────────────────────────────────────────

describe('Trial fixture — no PII', () => {
  it('fixture is labeled synthetic_demo_data', () => {
    expect(seed.synthetic_demo_data).toBe(true);
    expect(seed.not_live_data).toBe(true);
  });

  it('email placeholders use kora-trial.example domain (not a real domain)', () => {
    const workers = seed.workers as Array<Record<string, unknown>>;
    workers.forEach((w) => {
      const email = w.email_placeholder as string;
      expect(email).toContain('@kora-trial.example');
      expect(email).not.toContain('@gmail');
      expect(email).not.toContain('@outlook');
      expect(email).not.toContain('@yahoo');
    });
  });

  it('fixture privacy_note mentions no PII', () => {
    expect(seedRaw).toContain('No real names');
    expect(seedRaw).toContain('kora-trial.example');
  });
});

// ─── 3. Fixture: covers 5 pillars ────────────────────────────────────────────

describe('Trial fixture — 5 pillars', () => {
  it('fixture covers all 5 KORA pillars', () => {
    const pillars = seed.pillars_covered as string[];
    expect(pillars).toContain('LIFE');
    expect(pillars).toContain('GROWTH');
    expect(pillars).toContain('CONNECTION');
    expect(pillars).toContain('IMPACT');
    expect(pillars).toContain('LEGACY');
  });

  it('initiatives span all 5 pillars', () => {
    const initiatives = seed.initiatives as Array<Record<string, unknown>>;
    const coveredPillars = new Set(initiatives.map((i) => i.pillar as string));
    expect(coveredPillars.has('LIFE')).toBe(true);
    expect(coveredPillars.has('GROWTH')).toBe(true);
    expect(coveredPillars.has('CONNECTION')).toBe(true);
    expect(coveredPillars.has('IMPACT')).toBe(true);
    expect(coveredPillars.has('LEGACY')).toBe(true);
  });
});

// ─── 4. Fixture: at least 10 workers ────────────────────────────────────────

describe('Trial fixture — workforce size', () => {
  it('fixture contains at least 10 workers', () => {
    const workers = seed.workers as Array<unknown>;
    expect(workers.length).toBeGreaterThanOrEqual(10);
  });

  it('fixture contains at least 15 workers (privacy threshold demo)', () => {
    const workers = seed.workers as Array<unknown>;
    expect(workers.length).toBeGreaterThanOrEqual(15);
  });
});

// ─── 5. Fixture: published initiatives ───────────────────────────────────────

describe('Trial fixture — initiative statuses', () => {
  it('fixture contains published initiatives', () => {
    const initiatives = seed.initiatives as Array<Record<string, unknown>>;
    const published = initiatives.filter((i) => i.status === 'published');
    expect(published.length).toBeGreaterThanOrEqual(4);
  });

  it('fixture covers all initiative statuses', () => {
    const statuses = seed.initiative_statuses_covered as string[];
    expect(statuses).toContain('published');
    expect(statuses).toContain('draft');
    expect(statuses).toContain('closed');
  });
});

// ─── 6. Fixture: valid participation statuses ────────────────────────────────

describe('Trial fixture — participation data', () => {
  it('fixture contains participation examples', () => {
    const participations = seed.participation_examples as Array<unknown>;
    expect(participations.length).toBeGreaterThan(0);
  });

  it('participation statuses are valid', () => {
    const validStatuses = new Set(['interested', 'registered', 'attended', 'cancelled']);
    const participations = seed.participation_examples as Array<Record<string, unknown>>;
    participations.forEach((p) => {
      expect(validStatuses.has(p.status as string)).toBe(true);
    });
  });

  it('fixture covers all 4 participation statuses', () => {
    const statuses = seed.participation_statuses_covered as string[];
    expect(statuses).toContain('interested');
    expect(statuses).toContain('registered');
    expect(statuses).toContain('attended');
    expect(statuses).toContain('cancelled');
  });
});

// ─── 7. Runbook cites critical routes ────────────────────────────────────────

describe('Runbook — critical routes', () => {
  it('runbook cites /worker/login', () => {
    expect(runbook).toContain('/worker/login');
  });

  it('runbook cites /worker/onboarding', () => {
    expect(runbook).toContain('/worker/onboarding');
  });

  it('runbook cites /worker/workspace', () => {
    expect(runbook).toContain('/worker/workspace');
  });

  it('runbook cites /admin/workers', () => {
    expect(runbook).toContain('/admin/workers');
  });

  it('runbook cites /admin/worker-initiatives', () => {
    expect(runbook).toContain('/admin/worker-initiatives');
  });
});

// ─── 8. Runbook cites privacy boundary ───────────────────────────────────────

describe('Runbook — privacy boundary', () => {
  it('runbook cites company aggregate suppression for N<10', () => {
    expect(runbook).toContain('< 10');
    expect(runbook).toContain('SUPPRESSED');
  });

  it('runbook cites safe_aggregation_threshold of 10', () => {
    expect(runbook).toContain('10');
    expect(runbook).toContain('soglia privacy');
  });

  it('runbook prohibits employer access to individual worker data', () => {
    const lower = runbook.toLowerCase();
    expect(lower).toContain('nessun dato individuale');
    expect(lower).toContain('employer');
  });

  it('fixture privacy_validation block is correct', () => {
    const pv = seed.privacy_validation as Record<string, unknown>;
    expect(pv.employer_can_see_individual_pib).toBe(false);
    expect(pv.employer_can_see_worker_ref).toBe(false);
    expect(pv.employer_can_see_private_note).toBe(false);
    expect(pv.employer_can_see_email).toBe(false);
    expect(pv.safe_aggregation_threshold).toBe(10);
  });
});
