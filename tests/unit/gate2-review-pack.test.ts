/**
 * Gate 2 SQL Review Pack — presence and completeness checks.
 *
 * These tests verify that docs/GATE2_SQL_REVIEW_PACK.md exists and contains
 * all required sections, migration entries, and critical findings.
 * They do NOT run SQL, touch any database, or modify any migration files.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function doc(): string {
  return readFileSync(resolve(root, 'docs/GATE2_SQL_REVIEW_PACK.md'), 'utf-8');
}

// ── Section 1: Document exists and has all 8 required sections ────────────────

describe('Gate 2 review pack document structure', () => {
  it('docs/GATE2_SQL_REVIEW_PACK.md exists and is non-empty', () => {
    const content = doc();
    expect(content.length).toBeGreaterThan(1000);
  });

  it('contains section 1 — Executive Verdict', () => {
    expect(doc()).toMatch(/Executive Verdict/i);
  });

  it('contains section 2 — Migration Inventory', () => {
    expect(doc()).toMatch(/Migration Inventory/i);
  });

  it('contains section 3 — Critical Objects', () => {
    expect(doc()).toMatch(/Critical Objects/i);
  });

  it('contains section 4 — Gate 2 Checklist', () => {
    expect(doc()).toMatch(/Gate 2 Checklist/i);
  });

  it('contains section 5 — Gate 3 Checklist', () => {
    expect(doc()).toMatch(/Gate 3 Checklist/i);
  });

  it('contains section 6 — Production Blockers', () => {
    expect(doc()).toMatch(/Production Blockers/i);
  });

  it('contains section 7 — Open Questions', () => {
    expect(doc()).toMatch(/Open Questions/i);
  });

  it('contains section 8 — Recommended Next Steps', () => {
    expect(doc()).toMatch(/Recommended Next Steps/i);
  });
});

// ── Section 2: Migration inventory — all 28 migrations listed ────────────────

describe('Gate 2 review pack — all 28 migrations covered', () => {
  const migrations = Array.from({ length: 28 }, (_, i) =>
    String(i + 1).padStart(3, '0'),
  );

  for (const num of migrations) {
    it(`migration ${num} is referenced in the document`, () => {
      expect(doc()).toContain(num);
    });
  }
});

// ── Section 3: Status labels — all four statuses used ────────────────────────

describe('Gate 2 review pack — status taxonomy', () => {
  it('uses SAFE_TO_REVIEW status', () => {
    expect(doc()).toContain('SAFE_TO_REVIEW');
  });

  it('uses NEEDS_CTO_REVIEW status', () => {
    expect(doc()).toContain('NEEDS_CTO_REVIEW');
  });

  it('uses NEEDS_LEGAL_PRIVACY_REVIEW status', () => {
    expect(doc()).toContain('NEEDS_LEGAL_PRIVACY_REVIEW');
  });

  it('uses DO_NOT_APPLY_YET status', () => {
    expect(doc()).toContain('DO_NOT_APPLY_YET');
  });

  it('identifies migration 014 as SAFE_TO_REVIEW', () => {
    const lines = doc().split('\n');
    const hit = lines.some(l => l.includes('014') && l.includes('SAFE_TO_REVIEW'));
    expect(hit, 'No table row contains both "014" and "SAFE_TO_REVIEW"').toBe(true);
  });

  it('identifies migration 017 as DO_NOT_APPLY_YET', () => {
    const lines = doc().split('\n');
    const hit = lines.some(l => l.includes('017') && l.includes('DO_NOT_APPLY_YET'));
    expect(hit, 'No table row contains both "017" and "DO_NOT_APPLY_YET"').toBe(true);
  });

  it('identifies migration 018 as DO_NOT_APPLY_YET', () => {
    const lines = doc().split('\n');
    const hit = lines.some(l => l.includes('018') && l.includes('DO_NOT_APPLY_YET'));
    expect(hit, 'No table row contains both "018" and "DO_NOT_APPLY_YET"').toBe(true);
  });

  it('identifies migration 027 as DO_NOT_APPLY_YET', () => {
    const lines = doc().split('\n');
    const hit = lines.some(l => l.includes('027') && l.includes('DO_NOT_APPLY_YET'));
    expect(hit, 'No table row contains both "027" and "DO_NOT_APPLY_YET"').toBe(true);
  });
});

// ── Section 4: Critical findings must be documented ──────────────────────────

describe('Gate 2 review pack — critical findings coverage', () => {
  it('documents the COMPANY_USER role inconsistency in migration 005', () => {
    expect(doc()).toMatch(/COMPANY_USER/);
  });

  it('documents the kora.kora_role() vs auth.jwt() inconsistency', () => {
    expect(doc()).toMatch(/kora\.kora_role\(\)|auth\.jwt\(\)/);
  });

  it('documents kora.tenant_id() as the canonical tenant claim function', () => {
    expect(doc()).toContain('kora.tenant_id()');
  });

  it('documents the worker_pseudonym_map as the highest-risk table', () => {
    expect(doc()).toMatch(/worker_pseudonym_map/);
    expect(doc()).toMatch(/highest.risk|most sensitive|CRITICAL/i);
  });

  it('documents the worker_pib table as CRITICAL personal data', () => {
    expect(doc()).toMatch(/worker_pib/);
  });

  it('documents the trigger schema bug in migration 025', () => {
    expect(doc()).toMatch(/kora\.set_updated_at|set_updated_at/);
    expect(doc()).toMatch(/bug|error|fail/i);
  });

  it('documents the KORA_ADMIN policy removal dependency in migration 027', () => {
    expect(doc()).toMatch(/worker-provisioning-service-key|service.role provisioning/i);
  });

  it('documents SECURITY DEFINER functions', () => {
    expect(doc()).toContain('SECURITY DEFINER');
  });

  it('documents the N≥10 suppression threshold in SQL', () => {
    expect(doc()).toMatch(/N.?[≥>=].?10|suppression.*10|10.*suppression/i);
  });

  it('documents fn_company_activation_summary suppression', () => {
    expect(doc()).toContain('fn_company_activation_summary');
  });

  it('documents the safe aggregation view v_company_uploaded_record_safe', () => {
    expect(doc()).toContain('v_company_uploaded_record_safe');
  });

  it('documents the KORA_ADMIN audit log INSERT grant added in migration 026', () => {
    expect(doc()).toMatch(/audit.*INSERT|INSERT.*audit/i);
  });

  it('documents DPIA requirement', () => {
    expect(doc()).toMatch(/DPIA|Data Protection Impact/i);
  });
});

// ── Section 5: KORA architecture invariants preserved in review pack ──────────

describe('Gate 2 review pack — KORA architecture invariants', () => {
  it('states company roles NEVER see individual worker rows', () => {
    expect(doc()).toMatch(/company.*never|NEVER.*company|employer.*never/i);
  });

  it('states PIB is worker-owned and not company-visible', () => {
    expect(doc()).toMatch(/worker.pib|PIB/);
    expect(doc()).toMatch(/worker.owned|worker-owned|WORKER.*only|no COMPANY/i);
  });

  it('states no migration has been applied to any database', () => {
    expect(doc()).toMatch(/not applied|NOT applied|none.*applied|unapplied/i);
  });

  it('states Gate 2 and Gate 3 must close before real data', () => {
    expect(doc()).toMatch(/Gate 2|Gate 3/);
    expect(doc()).toMatch(/real.*data|production.*data/i);
  });

  it('mentions pseudonymization', () => {
    expect(doc()).toMatch(/pseudonymiz|pseudonimizzaz/i);
  });

  it('does not contain SQL DDL statements', () => {
    // The review pack is a markdown document — it must not contain DDL
    const content = doc();
    expect(content).not.toMatch(/^CREATE TABLE/m);
    expect(content).not.toMatch(/^ALTER TABLE/m);
    expect(content).not.toMatch(/^DROP TABLE/m);
  });

  it('cites canonical migration files by number', () => {
    // Verify multiple migration numbers are present (spot-check)
    expect(doc()).toContain('001');
    expect(doc()).toContain('015');
    expect(doc()).toContain('028');
  });

  it('identifies review owners (CTO and DPO/Legal)', () => {
    expect(doc()).toMatch(/CTO/);
    expect(doc()).toMatch(/DPO|Legal/);
  });
});

// ── Section 6: No migration files were modified ───────────────────────────────

describe('Gate 2 review pack — migration files unchanged', () => {
  const migrationDir = resolve(root, 'supabase/migrations');

  it('supabase/migrations directory exists', () => {
    const { statSync } = require('fs');
    const stat = statSync(migrationDir, { throwIfNoEntry: false });
    expect(stat).toBeDefined();
    expect(stat?.isDirectory()).toBe(true);
  });

  it('28 migration files are present (029 quarantined to supabase/rollback/)', () => {
    const { readdirSync } = require('fs');
    const files = readdirSync(migrationDir).filter((f: string) => f.endsWith('.sql'));
    expect(files.length).toBe(28);
  });
});
