// tests/unit/b95b-admin-lifecycle.test.ts
// B95-B — Admin Company Lifecycle Orchestrator
// Tests: 8-step lifecycle definition, status derivation, owner roles, routes,
//        privacy invariants, no-auth/no-email guarantees.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  LIFECYCLE_STEPS,
  deriveStepStatus,
  deriveAllStepStatuses,
  STATUS_META,
  OWNER_META,
  type LifecycleStatusInputs,
  type LifecycleStepStatus,
} from '../../lib/admin-lifecycle/lifecycle-rules';

// ── Fixture inputs ────────────────────────────────────────────────────────────

const EMPTY_INPUTS: LifecycleStatusInputs = {
  tenantExists:       false,
  hasCompanyUser:     false,
  totalWorkers:       0,
  hasSubmission:      false,
  submissionPending:  false,
  hasReviewedData:    false,
  hasScoring:         false,
  hasDecisionPack:    false,
  workerSpaceEnabled: false,
};

const FULL_INPUTS: LifecycleStatusInputs = {
  tenantExists:       true,
  hasCompanyUser:     true,
  totalWorkers:       250,
  hasSubmission:      true,
  submissionPending:  false,
  hasReviewedData:    true,
  hasScoring:         true,
  hasDecisionPack:    true,
  workerSpaceEnabled: true,
};

// ── LIFECYCLE_STEPS structure ─────────────────────────────────────────────────

describe('LIFECYCLE_STEPS — structure', () => {
  it('has exactly 8 steps', () => {
    expect(LIFECYCLE_STEPS).toHaveLength(8);
  });

  it('step numbers are 1 through 8, sequential', () => {
    const numbers = LIFECYCLE_STEPS.map((s) => s.stepNumber);
    expect(numbers).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('each step has a non-empty id', () => {
    LIFECYCLE_STEPS.forEach((s) => expect(s.id.length).toBeGreaterThan(0));
  });

  it('each step id is unique', () => {
    const ids = LIFECYCLE_STEPS.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each step has a non-empty title', () => {
    LIFECYCLE_STEPS.forEach((s) => expect(s.title.length).toBeGreaterThan(0));
  });

  it('each step has an ownerRole', () => {
    LIFECYCLE_STEPS.forEach((s) => {
      expect(['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER']).toContain(s.ownerRole);
    });
  });

  it('each step has an ownerLabel', () => {
    LIFECYCLE_STEPS.forEach((s) => expect(s.ownerLabel.length).toBeGreaterThan(0));
  });

  it('each step has a non-empty route starting with /', () => {
    LIFECYCLE_STEPS.forEach((s) => {
      expect(s.route).toMatch(/^\//);
    });
  });

  it('each step has a description of at least 30 chars', () => {
    LIFECYCLE_STEPS.forEach((s) => {
      expect(s.description.length).toBeGreaterThanOrEqual(30);
    });
  });

  it('each step has a nextAction of at least 20 chars', () => {
    LIFECYCLE_STEPS.forEach((s) => {
      expect(s.nextAction.length).toBeGreaterThanOrEqual(20);
    });
  });

  it('step 1 is create_company owned by KORA_ADMIN', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.stepNumber === 1)!;
    expect(s.id).toBe('create_company');
    expect(s.ownerRole).toBe('KORA_ADMIN');
  });

  it('step 4 is company_submission owned by COMPANY_ADMIN', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.stepNumber === 4)!;
    expect(s.id).toBe('company_submission');
    expect(s.ownerRole).toBe('COMPANY_ADMIN');
  });

  it('step 8 is worker_space_preview owned by WORKER', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.stepNumber === 8)!;
    expect(s.id).toBe('worker_space_preview');
    expect(s.ownerRole).toBe('WORKER');
  });

  it('create_company route leads to /admin', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.id === 'create_company')!;
    expect(s.route).toMatch(/\/admin/);
  });

  it('company_submission route includes /company or /workspace', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.id === 'company_submission')!;
    expect(s.route).toMatch(/\/company/);
  });

  it('worker_space_preview route is /my-kora', () => {
    const s = LIFECYCLE_STEPS.find((x) => x.id === 'worker_space_preview')!;
    expect(s.route).toBe('/my-kora');
  });
});

// ── STATUS_META ───────────────────────────────────────────────────────────────

describe('STATUS_META — all 5 statuses defined', () => {
  const STATUSES: LifecycleStepStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'READY', 'BLOCKED', 'DONE'];

  it('has entries for all 5 statuses', () => {
    STATUSES.forEach((s) => expect(STATUS_META[s]).toBeDefined());
  });

  it('each entry has a non-empty label', () => {
    STATUSES.forEach((s) => expect(STATUS_META[s].label.length).toBeGreaterThan(0));
  });

  it('each entry has dot color, text color, bg, border', () => {
    STATUSES.forEach((s) => {
      expect(STATUS_META[s].dotColor.length).toBeGreaterThan(0);
      expect(STATUS_META[s].textColor.length).toBeGreaterThan(0);
      expect(STATUS_META[s].bgColor.length).toBeGreaterThan(0);
      expect(STATUS_META[s].borderColor.length).toBeGreaterThan(0);
    });
  });
});

// ── OWNER_META ────────────────────────────────────────────────────────────────

describe('OWNER_META', () => {
  it('has KORA_ADMIN entry', () => {
    expect(OWNER_META['KORA_ADMIN']).toBeDefined();
  });

  it('has COMPANY_ADMIN entry', () => {
    expect(OWNER_META['COMPANY_ADMIN']).toBeDefined();
  });

  it('has WORKER entry', () => {
    expect(OWNER_META['WORKER']).toBeDefined();
  });
});

// ── deriveStepStatus — empty inputs ──────────────────────────────────────────

describe('deriveStepStatus — empty inputs (nothing configured)', () => {
  it('create_company → NOT_STARTED when tenant missing', () => {
    expect(deriveStepStatus('create_company', EMPTY_INPUTS)).toBe('NOT_STARTED');
  });

  it('create_company_user → BLOCKED when tenant missing', () => {
    expect(deriveStepStatus('create_company_user', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('import_workforce → BLOCKED when tenant missing', () => {
    expect(deriveStepStatus('import_workforce', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('company_submission → BLOCKED when no workers', () => {
    expect(deriveStepStatus('company_submission', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('kora_review → BLOCKED when no submission', () => {
    expect(deriveStepStatus('kora_review', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('scoring → BLOCKED when no reviewed data', () => {
    expect(deriveStepStatus('scoring', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('decision_pack → BLOCKED when no scoring', () => {
    expect(deriveStepStatus('decision_pack', EMPTY_INPUTS)).toBe('BLOCKED');
  });

  it('worker_space_preview → NOT_STARTED when no decision pack', () => {
    expect(deriveStepStatus('worker_space_preview', EMPTY_INPUTS)).toBe('NOT_STARTED');
  });
});

// ── deriveStepStatus — full inputs (all complete) ─────────────────────────────

describe('deriveStepStatus — full inputs (everything done)', () => {
  it('create_company → DONE', () => {
    expect(deriveStepStatus('create_company', FULL_INPUTS)).toBe('DONE');
  });

  it('create_company_user → DONE', () => {
    expect(deriveStepStatus('create_company_user', FULL_INPUTS)).toBe('DONE');
  });

  it('import_workforce → DONE when ≥30 workers', () => {
    expect(deriveStepStatus('import_workforce', FULL_INPUTS)).toBe('DONE');
  });

  it('company_submission → DONE when review complete', () => {
    expect(deriveStepStatus('company_submission', FULL_INPUTS)).toBe('DONE');
  });

  it('kora_review → DONE when scoring exists', () => {
    expect(deriveStepStatus('kora_review', FULL_INPUTS)).toBe('DONE');
  });

  it('scoring → DONE when decision pack exists', () => {
    expect(deriveStepStatus('scoring', FULL_INPUTS)).toBe('DONE');
  });

  it('decision_pack → DONE when decision pack ready', () => {
    expect(deriveStepStatus('decision_pack', FULL_INPUTS)).toBe('DONE');
  });

  it('worker_space_preview → DONE when worker space enabled', () => {
    expect(deriveStepStatus('worker_space_preview', FULL_INPUTS)).toBe('DONE');
  });
});

// ── deriveStepStatus — partial scenarios ──────────────────────────────────────

describe('deriveStepStatus — partial scenarios', () => {
  it('create_company_user → READY when tenant exists but no user', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true };
    expect(deriveStepStatus('create_company_user', inputs)).toBe('READY');
  });

  it('import_workforce → READY when tenant exists, 0 workers', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true };
    expect(deriveStepStatus('import_workforce', inputs)).toBe('READY');
  });

  it('import_workforce → IN_PROGRESS when 10 workers (below threshold)', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 10 };
    expect(deriveStepStatus('import_workforce', inputs)).toBe('IN_PROGRESS');
  });

  it('import_workforce → DONE when 30+ workers', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 30 };
    expect(deriveStepStatus('import_workforce', inputs)).toBe('DONE');
  });

  it('company_submission → NOT_STARTED when workers exist but no submission', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 50 };
    expect(deriveStepStatus('company_submission', inputs)).toBe('NOT_STARTED');
  });

  it('company_submission → IN_PROGRESS when submission exists', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 50, hasSubmission: true };
    expect(deriveStepStatus('company_submission', inputs)).toBe('IN_PROGRESS');
  });

  it('kora_review → IN_PROGRESS when submission pending review', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 50, hasSubmission: true, submissionPending: true };
    expect(deriveStepStatus('kora_review', inputs)).toBe('IN_PROGRESS');
  });

  it('kora_review → READY when submission exists but not pending', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, totalWorkers: 50, hasSubmission: true };
    expect(deriveStepStatus('kora_review', inputs)).toBe('READY');
  });

  it('scoring → READY when reviewed data exists but no scoring yet', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, hasSubmission: true, hasReviewedData: true };
    expect(deriveStepStatus('scoring', inputs)).toBe('READY');
  });

  it('decision_pack → IN_PROGRESS when scoring done but no decision pack', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, tenantExists: true, hasScoring: true };
    expect(deriveStepStatus('decision_pack', inputs)).toBe('IN_PROGRESS');
  });

  it('worker_space_preview → READY when decision pack ready but worker space not enabled', () => {
    const inputs: LifecycleStatusInputs = { ...EMPTY_INPUTS, hasDecisionPack: true };
    expect(deriveStepStatus('worker_space_preview', inputs)).toBe('READY');
  });
});

// ── deriveAllStepStatuses ─────────────────────────────────────────────────────

describe('deriveAllStepStatuses', () => {
  it('returns an object with 8 keys (one per step)', () => {
    const result = deriveAllStepStatuses(FULL_INPUTS);
    expect(Object.keys(result)).toHaveLength(8);
  });

  it('all keys match LIFECYCLE_STEPS ids', () => {
    const result = deriveAllStepStatuses(FULL_INPUTS);
    LIFECYCLE_STEPS.forEach((s) => {
      expect(Object.keys(result)).toContain(s.id);
    });
  });

  it('full inputs → all DONE', () => {
    const result = deriveAllStepStatuses(FULL_INPUTS);
    Object.values(result).forEach((v) => expect(v).toBe('DONE'));
  });

  it('empty inputs → all BLOCKED or NOT_STARTED (no DONE)', () => {
    const result = deriveAllStepStatuses(EMPTY_INPUTS);
    Object.values(result).forEach((v) => {
      expect(['BLOCKED', 'NOT_STARTED']).toContain(v);
    });
  });

  it('all status values are valid LifecycleStepStatus values', () => {
    const valid: LifecycleStepStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'READY', 'BLOCKED', 'DONE'];
    const result = deriveAllStepStatuses(FULL_INPUTS);
    Object.values(result).forEach((v) => {
      expect(valid).toContain(v);
    });
  });
});

// ── Sidebar link ──────────────────────────────────────────────────────────────
// B169 FASE 3: admin nav data moved from Sidebar.tsx to lib/navigation/admin-nav-groups.ts.

describe('sidebar — Pilot Lifecycle link', () => {
  it('admin-nav-groups contains /admin/pipeline route', () => {
    const navPath = join(process.cwd(), 'lib', 'navigation', 'admin-nav-groups.ts');
    const content = readFileSync(navPath, 'utf-8');
    expect(content).toContain('/admin/pipeline');
  });

  it('admin-nav-groups labels it Pilot Lifecycle', () => {
    const navPath = join(process.cwd(), 'lib', 'navigation', 'admin-nav-groups.ts');
    const content = readFileSync(navPath, 'utf-8');
    expect(content).toContain('Pilot Lifecycle');
  });

  it('pipeline link is in Pilot Lifecycle group, before Demo Lab (B169 FASE 3)', () => {
    const navPath = join(process.cwd(), 'lib', 'navigation', 'admin-nav-groups.ts');
    const content = readFileSync(navPath, 'utf-8');
    // /admin/pipeline must appear before the 'Demo Lab' group
    const pipelineIdx = content.indexOf('/admin/pipeline');
    const demoIdx     = content.indexOf("'Demo Lab'");
    expect(pipelineIdx).toBeGreaterThan(0);
    expect(demoIdx).toBeGreaterThan(0);
    expect(pipelineIdx).toBeLessThan(demoIdx);
  });
});

// ── Privacy invariants ────────────────────────────────────────────────────────

describe('privacy invariants — no auth/email/PIB behavior', () => {
  it('lifecycle-rules.ts does not import any auth modules', () => {
    const path = join(process.cwd(), 'lib', 'admin-lifecycle', 'lifecycle-rules.ts');
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain('supabase');
    expect(content).not.toContain('requireKoraAdmin');
    expect(content).not.toContain('sendEmail');
    expect(content).not.toContain('nodemailer');
  });

  it('lifecycle-rules.ts does not import service modules (pure engine)', () => {
    const path = join(process.cwd(), 'lib', 'admin-lifecycle', 'lifecycle-rules.ts');
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain("from '@/services");
    expect(content).not.toContain("import React");
  });

  it('LifecycleStatusInputs does not contain individual PIB field', () => {
    const inputs: LifecycleStatusInputs = FULL_INPUTS;
    expect(Object.keys(inputs)).not.toContain('pib');
    expect(Object.keys(inputs)).not.toContain('worker_pib');
    expect(Object.keys(inputs)).not.toContain('individual_iu');
  });

  it('deriveStepStatus is pure — same input always produces same output', () => {
    const result1 = deriveStepStatus('scoring', FULL_INPUTS);
    const result2 = deriveStepStatus('scoring', FULL_INPUTS);
    expect(result1).toBe(result2);
  });

  it('deriveStepStatus has no side effects (no mutations of inputs)', () => {
    const inputs: LifecycleStatusInputs = { ...FULL_INPUTS };
    const inputsBefore = JSON.stringify(inputs);
    deriveStepStatus('create_company', inputs);
    const inputsAfter = JSON.stringify(inputs);
    expect(inputsBefore).toBe(inputsAfter);
  });

  it('pipeline page does not contain SQL or database migration code', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).not.toContain('CREATE TABLE');
    expect(content).not.toContain('prisma.db');
    expect(content).not.toContain('supabase.from(');
  });

});

// ── Company users page — retired (CC-019A, 2026-08-31) ────────────────────────
//
// The synthetic per-company users page (this describe block previously
// characterized its no-email/Foundation-Light-note/accountProvisioningService
// content) was retired outright: a real, more capable, already-live
// replacement exists at app/admin/company-users-live (Supabase-backed
// /api/admin/company-users — real read + real invite/status mutation the
// legacy page never had). See tests/unit/cc019a-retire-legacy-company-users.test.ts
// for the full retirement guard.

describe('company users page — file structure', () => {
  it('the legacy per-company page no longer exists (retired, CC-019A)', () => {
    const path = join(process.cwd(), 'app', 'admin', 'companies', '[companyId]', 'users', 'page.tsx');
    expect(existsSync(path)).toBe(false);
  });

  it('the canonical live replacement exists', () => {
    const path = join(process.cwd(), 'app', 'admin', 'company-users-live', 'page.tsx');
    expect(existsSync(path)).toBe(true);
  });
});

// ── Pipeline orchestrator structure ──────────────────────────────────────────

describe('pipeline orchestrator page — file structure', () => {
  it('file exists', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content.length).toBeGreaterThan(100);
  });

  it('uses LIFECYCLE_STEPS from lifecycle-rules', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('LIFECYCLE_STEPS');
  });

  it('uses deriveAllStepStatuses from lifecycle-rules', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('deriveAllStepStatuses');
  });

  it('includes DemoFlowBanner', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('DemoFlowBanner');
  });

  it('includes role transition links (Company Workspace and My KORA)', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('/company');
    expect(content).toContain('/my-kora');
  });

  it('includes privacy invariant footer comment', () => {
    const path = join(process.cwd(), 'app', 'admin', 'pipeline', 'page.tsx');
    const content = readFileSync(path, 'utf-8');
    expect(content).toContain('no_worker_pib');
    expect(content).toContain('no_auth_changes');
    expect(content).toContain('no_email_sending');
  });
});
