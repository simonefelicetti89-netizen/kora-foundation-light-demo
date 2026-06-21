/**
 * Gate 2 — External Review Pack document validation
 *
 * Verifies that docs/gate-2-external-review-pack.md reflects the current
 * post-hardening state of the repository and is suitable for external CTO review.
 *
 * These tests do NOT run SQL, touch any database, or apply migrations.
 * They read the document as text and assert on its content.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

const docPath = 'docs/gate-2-external-review-pack.md';

// ── 1. Document existence and structure ───────────────────────────────────────

describe('gate-2-external-review-pack.md — existence and structure', () => {
  it('document exists', () => {
    expect(existsSync(resolve(root, docPath))).toBe(true);
  });

  it('document is not empty', () => {
    const content = read(docPath);
    expect(content.trim().length).toBeGreaterThan(500);
  });

  it('document is English-language (not the stale Italian version)', () => {
    const content = read(docPath);
    // The Italian version started with "# KORA Gate 2 — Revisione Architetturale Esterna"
    expect(content).not.toMatch(/Revisione Architetturale Esterna/i);
    // Should have English section headers
    expect(content).toMatch(/## \d+\. Review Purpose/);
    expect(content).toMatch(/## \d+\. Current Repository State/);
  });

  it('document contains all 13 required sections', () => {
    const content = read(docPath);
    expect(content).toMatch(/## \d+\. Review Purpose/);
    expect(content).toMatch(/## \d+\. Current Repository State/);
    expect(content).toMatch(/## \d+\. What KORA Is Technically/);
    expect(content).toMatch(/## \d+\. Architecture Boundaries/);
    expect(content).toMatch(/## \d+\. What Has Been Hardened/);
    expect(content).toMatch(/## \d+\. SQL \/ Migration Review Scope/);
    expect(content).toMatch(/## \d+\. Known Resolved Issues/);
    expect(content).toMatch(/## \d+\. Known Open Questions for CTO/);
    expect(content).toMatch(/## \d+\. Explicit Non-Goals/);
    expect(content).toMatch(/## \d+\. What Gate 2 Passed Means/);
    expect(content).toMatch(/## \d+\. What Gate 2 Failed Means/);
    expect(content).toMatch(/## \d+\. Recommended Review Order/);
    expect(content).toMatch(/## \d+\. Handoff Message Draft/);
  });
});

// ── 2. Repository state accuracy ──────────────────────────────────────────────

describe('gate-2-external-review-pack.md — repository state', () => {
  it('references HEAD commit 088f3c4', () => {
    const content = read(docPath);
    expect(content).toContain('088f3c4');
  });

  it('states 28 migrations written and 0 applied', () => {
    const content = read(docPath);
    expect(content).toMatch(/28 migrations? written/i);
    expect(content).toMatch(/0 applied/i);
  });

  it('states tests are passing', () => {
    const content = read(docPath);
    // Should mention 5943/5943 or similar high test count
    expect(content).toMatch(/5943\s*\/\s*5943|5943.*passed/i);
  });

  it('states TypeScript is clean', () => {
    const content = read(docPath);
    expect(content).toMatch(/TypeScript.*clean|tsc.*noEmit.*0|TypeScript.*0/i);
  });

  it('confirms /api/test/* routes are absent', () => {
    const content = read(docPath);
    expect(content).toMatch(/\/api\/test\/\*.*absent|\/api\/test.*removed|absent.*\/api\/test/i);
  });
});

// ── 3. Migration status classification ────────────────────────────────────────

describe('gate-2-external-review-pack.md — migration status', () => {
  it('lists SAFE_TO_REVIEW status', () => {
    expect(read(docPath)).toContain('SAFE_TO_REVIEW');
  });

  it('lists NEEDS_CTO_REVIEW status', () => {
    expect(read(docPath)).toContain('NEEDS_CTO_REVIEW');
  });

  it('lists NEEDS_LEGAL_PRIVACY_REVIEW status', () => {
    expect(read(docPath)).toContain('NEEDS_LEGAL_PRIVACY_REVIEW');
  });

  it('lists DO_NOT_APPLY_YET status', () => {
    expect(read(docPath)).toContain('DO_NOT_APPLY_YET');
  });

  it('identifies migration 014 as SAFE_TO_REVIEW', () => {
    const content = read(docPath);
    const lines = content.split('\n');
    const relevant = lines.some(l => l.includes('014') && l.includes('SAFE_TO_REVIEW'));
    expect(relevant).toBe(true);
  });

  it('lists DO_NOT_APPLY_YET migrations including 017, 018, 023, 025, 027', () => {
    const content = read(docPath);
    const doNotSection = content.slice(content.indexOf('DO_NOT_APPLY_YET'));
    expect(doNotSection).toContain('017');
    expect(doNotSection).toContain('018');
    expect(doNotSection).toContain('023');
    expect(doNotSection).toContain('025');
    expect(doNotSection).toContain('027');
  });
});

// ── 4. Known resolved issues ──────────────────────────────────────────────────

describe('gate-2-external-review-pack.md — resolved issues', () => {
  it('documents P0 fixes in migrations 005, 025, 027', () => {
    const content = read(docPath);
    const resolvedSection = content.slice(content.indexOf('Known Resolved Issues'));
    expect(resolvedSection).toMatch(/005|Mig 005|migration 005/i);
    expect(resolvedSection).toMatch(/025|Mig 025|migration 025/i);
    expect(resolvedSection).toMatch(/027|Mig 027|migration 027/i);
  });

  it('documents tenant-claim consistency fix for migrations 013/025/026', () => {
    const content = read(docPath);
    const resolvedSection = content.slice(content.indexOf('Known Resolved Issues'));
    expect(resolvedSection).toContain('013');
    expect(resolvedSection).toMatch(/tenant.*claim|canonical helper|kora\.kora_role|kora\.tenant_id/i);
  });

  it('documents migration 011 role reads fix', () => {
    const content = read(docPath);
    const resolvedSection = content.slice(content.indexOf('Known Resolved Issues'));
    expect(resolvedSection).toContain('011');
    expect(resolvedSection).toMatch(/kora\.kora_role\(\)|role reads/i);
  });

  it('documents intentional kora_worker_id raw read retention as documented exception', () => {
    const content = read(docPath);
    expect(content).toMatch(/kora_worker_id.*intentionally retained|intentionally retained.*kora_worker_id/i);
  });
});

// ── 5. Open questions for CTO ─────────────────────────────────────────────────

describe('gate-2-external-review-pack.md — CTO open questions', () => {
  it('contains the kora.worker_id() design question (Q3)', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    expect(qSection).toMatch(/kora\.worker_id\(\)/);
    expect(qSection).toMatch(/design decision|CTO.*decide/i);
  });

  it('presents two options for the kora.worker_id() decision', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    // Option (a) and option (b)
    expect(qSection).toMatch(/\(a\).*kora\.worker_id\(\)|introduce.*kora\.worker_id/i);
    expect(qSection).toMatch(/\(b\).*raw read|accept.*raw read/i);
  });

  it('contains question about RLS architecture (Q1)', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    expect(qSection).toMatch(/RLS.*architecture|multi-tenant RLS/i);
  });

  it('contains question about canonical helper sufficiency (Q2)', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    expect(qSection).toMatch(/canonical helper|kora\.kora_role.*kora\.tenant_id/i);
  });

  it('contains question about SECURITY DEFINER functions', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    expect(qSection).toMatch(/SECURITY DEFINER/i);
  });

  it('contains question about migration 027 staging readiness', () => {
    const content = read(docPath);
    const qSection = content.slice(content.indexOf('Known Open Questions for CTO'));
    expect(qSection).toContain('027');
    expect(qSection).toMatch(/staging/i);
  });
});

// ── 6. Non-goals and restrictions ────────────────────────────────────────────

describe('gate-2-external-review-pack.md — explicit non-goals', () => {
  it('explicitly states do not apply any migration', () => {
    const content = read(docPath);
    const nonGoalSection = content.slice(content.indexOf('Explicit Non-Goals'));
    expect(nonGoalSection).toMatch(/do not apply any migration|not apply.*migration/i);
  });

  it('explicitly states do not run supabase db push', () => {
    const content = read(docPath);
    const nonGoalSection = content.slice(content.indexOf('Explicit Non-Goals'));
    expect(nonGoalSection).toMatch(/supabase db push/i);
  });

  it('explicitly states do not provision a Supabase project', () => {
    const content = read(docPath);
    const nonGoalSection = content.slice(content.indexOf('Explicit Non-Goals'));
    expect(nonGoalSection).toMatch(/provision.*Supabase|Supabase.*provision/i);
  });
});

// ── 7. Gate 2 pass / fail criteria ───────────────────────────────────────────

describe('gate-2-external-review-pack.md — gate pass/fail criteria', () => {
  it('defines what Gate 2 passed means', () => {
    const content = read(docPath);
    const passSection = content.slice(content.indexOf('What Gate 2 Passed Means'));
    expect(passSection.trim().length).toBeGreaterThan(100);
    expect(passSection).toMatch(/written.*sign-off|sign.off|go\/no-go/i);
  });

  it('defines what Gate 2 failed means', () => {
    const content = read(docPath);
    const failSection = content.slice(content.indexOf('What Gate 2 Failed Means'));
    expect(failSection.trim().length).toBeGreaterThan(100);
    expect(failSection).toMatch(/cross-tenant|RLS.*unsafe|required rewrites/i);
  });
});

// ── 8. Review order ───────────────────────────────────────────────────────────

describe('gate-2-external-review-pack.md — recommended review order', () => {
  it('review order references GATE2_SQL_REVIEW_PACK.md', () => {
    const content = read(docPath);
    const reviewSection = content.slice(content.indexOf('Recommended Review Order'));
    expect(reviewSection).toContain('GATE2_SQL_REVIEW_PACK.md');
  });

  it('review order starts with canonical helpers (migrations 001-006)', () => {
    const content = read(docPath);
    const reviewSection = content.slice(content.indexOf('Recommended Review Order'));
    expect(reviewSection).toMatch(/001.{0,10}006|claim.*auth foundation/i);
  });

  it('review order explicitly calls out SECURITY DEFINER review step', () => {
    const content = read(docPath);
    const reviewSection = content.slice(content.indexOf('Recommended Review Order'));
    expect(reviewSection).toMatch(/SECURITY DEFINER/i);
  });

  it('review order addresses migration 027 KORA_ADMIN policy removal', () => {
    const content = read(docPath);
    const reviewSection = content.slice(content.indexOf('Recommended Review Order'));
    expect(reviewSection).toContain('027');
  });
});

// ── 9. Handoff message ────────────────────────────────────────────────────────

describe('gate-2-external-review-pack.md — handoff message', () => {
  it('contains a handoff message draft', () => {
    const content = read(docPath);
    expect(content).toMatch(/Handoff Message Draft/i);
    const handoffSection = content.slice(content.indexOf('Handoff Message Draft'));
    expect(handoffSection.trim().length).toBeGreaterThan(200);
  });

  it('handoff message specifies what reviewer must NOT do', () => {
    const content = read(docPath);
    const handoffSection = content.slice(content.indexOf('Handoff Message Draft'));
    expect(handoffSection).toMatch(/do not apply|Please do not/i);
  });

  it('handoff message tells reviewer where to start', () => {
    const content = read(docPath);
    const handoffSection = content.slice(content.indexOf('Handoff Message Draft'));
    expect(handoffSection).toMatch(/GATE2_SQL_REVIEW_PACK|Where to start/i);
  });

  it('handoff message specifies Gate 2 output needed (written sign-off)', () => {
    const content = read(docPath);
    const handoffSection = content.slice(content.indexOf('Handoff Message Draft'));
    expect(handoffSection).toMatch(/sign.off|checklist.*§4|Gate 2 Checklist/i);
  });
});

// ── 10. Cross-document consistency ────────────────────────────────────────────

describe('gate-2-external-review-pack.md — consistent with GATE2_SQL_REVIEW_PACK.md', () => {
  it('migration count matches: both documents state 28 migrations', () => {
    const extDoc = read(docPath);
    const sqlDoc = read('docs/GATE2_SQL_REVIEW_PACK.md');
    expect(extDoc).toMatch(/28 migration/i);
    expect(sqlDoc).toMatch(/28 file/i);
  });

  it('DO_NOT_APPLY_YET count: document states 7 migrations in that status', () => {
    const content = read(docPath);
    // Should reference the 7 DO_NOT_APPLY_YET migrations in status table
    const doNotSection = content.slice(content.indexOf('DO_NOT_APPLY_YET'));
    // At minimum 017, 018, 019, 020, 023, 025, 027 — 7 migrations
    const migrationsListed = ['017', '018', '019', '020', '023', '025', '027']
      .filter(m => doNotSection.includes(m));
    expect(migrationsListed.length).toBeGreaterThanOrEqual(6);
  });

  it('canonical helpers mentioned consistently: kora.kora_role() and kora.tenant_id()', () => {
    const content = read(docPath);
    expect(content).toContain('kora.kora_role()');
    expect(content).toContain('kora.tenant_id()');
  });

  it('Gate 2 open question about kora.worker_id() matches GATE2_SQL_REVIEW_PACK.md §7', () => {
    const extDoc = read(docPath);
    const sqlDoc = read('docs/GATE2_SQL_REVIEW_PACK.md');
    // Both documents must reference the same design question
    expect(extDoc).toMatch(/kora\.worker_id\(\)/);
    expect(sqlDoc).toMatch(/kora\.worker_id\(\)/);
  });
});
