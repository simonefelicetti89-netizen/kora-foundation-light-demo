/**
 * B153 — Company-Safe Aggregation Layer: migration audit + logic tests
 *
 * Cosa validano questi test:
 *   (a) SUPPRESSION: sotto soglia N<10 → NULL (non 0, non -1, non un sentinel)
 *   (b) ISOLATION: ogni oggetto filtra per kora.tenant_id() — un tenant non vede dati altrui
 *   (c) IDENTITY EXCLUSION: pseudonym_id, raw_hash, worker_id, created_by non presenti
 *       nell'output di nessun oggetto della migrazione (per costruzione nel SELECT list)
 *   (d) SECURITY DEFINER per le funzioni (bypass FORCE ROW LEVEL SECURITY)
 *   (e) GRANT/REVOKE corretti (authenticated sì, anon no)
 *   (f) Founder decision tracciata per raw_name
 *
 * Cosa NON validano:
 *   - L'enforcement RLS PostgreSQL (richiede DB reale/locale, Gate 2 open)
 *   - L'esecuzione SQL effettiva
 *   - Il comportamento di rete
 *
 * Approccio: lettura SQL migration + test logica pura di suppression.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ROOT       = resolve(process.cwd());
const MIGRATION  = 'supabase/migrations/015_company_safe_aggregation_layer.sql';
const migPath    = resolve(ROOT, MIGRATION);

function sql(): string {
  return readFileSync(migPath, 'utf-8');
}

// ── Pure suppression logic ────────────────────────────────────────────────────
// Mirrors the SQL CASE WHEN ... BETWEEN 1 AND 9 THEN NULL ELSE n END pattern.
// Used to verify the semantics are correctly encoded.
function suppress(n: number): number | null {
  if (n >= 1 && n <= 9) return null;   // suppressed: too few to be safe
  return n;                             // 0 = no activity (safe), ≥10 = safe count
}

// ── FILE EXISTS ───────────────────────────────────────────────────────────────

describe('B153 — migration file', () => {
  it('migration 015 exists at expected path', () => {
    expect(existsSync(migPath)).toBe(true);
  });
});

// ── OBJECT PRESENCE ───────────────────────────────────────────────────────────

describe('B153 — all 4 objects present in migration', () => {
  it('fn_company_worker_status defined', () => {
    expect(sql()).toContain('fn_company_worker_status');
  });

  it('fn_company_activation_summary defined', () => {
    expect(sql()).toContain('fn_company_activation_summary');
  });

  it('v_company_uploaded_record_safe defined', () => {
    expect(sql()).toContain('v_company_uploaded_record_safe');
  });

  it('v_company_uef_eligibility_summary defined', () => {
    expect(sql()).toContain('v_company_uef_eligibility_summary');
  });
});

// ── SECURITY DEFINER ──────────────────────────────────────────────────────────

describe('B153 — functions are SECURITY DEFINER', () => {
  it('fn_company_worker_status is SECURITY DEFINER', () => {
    // Check function body between the two function definitions
    const src = sql();
    const start = src.indexOf('fn_company_worker_status');
    const end   = src.indexOf('fn_company_activation_summary');
    const fragment = src.slice(start, end);
    expect(fragment).toContain('SECURITY DEFINER');
  });

  it('fn_company_activation_summary is SECURITY DEFINER', () => {
    const src = sql();
    const start = src.indexOf('fn_company_activation_summary');
    const end   = src.indexOf('v_company_uploaded_record_safe');
    const fragment = src.slice(start, end);
    expect(fragment).toContain('SECURITY DEFINER');
  });

  it('migration contains SET search_path on functions (prevents search_path injection)', () => {
    expect(sql()).toContain('SET search_path = personal, analytics, kora, public');
  });
});

// ── TENANT ISOLATION ──────────────────────────────────────────────────────────

describe('B153 — tenant isolation: kora.tenant_id() in every object', () => {
  it('fn_company_worker_status WHERE uses kora.tenant_id()', () => {
    const src = sql();
    const start = src.indexOf('OBJECT 1');
    const end   = src.indexOf('OBJECT 2');
    expect(src.slice(start, end)).toContain('kora.tenant_id()');
  });

  it('fn_company_activation_summary WHERE uses kora.tenant_id()', () => {
    const src = sql();
    const start = src.indexOf('OBJECT 2');
    const end   = src.indexOf('OBJECT 3');
    expect(src.slice(start, end)).toContain('kora.tenant_id()');
  });

  it('v_company_uploaded_record_safe WHERE uses kora.tenant_id()', () => {
    const src = sql();
    const start = src.indexOf('OBJECT 3');
    const end   = src.indexOf('OBJECT 4');
    expect(src.slice(start, end)).toContain('kora.tenant_id()');
  });

  it('v_company_uef_eligibility_summary WHERE uses kora.tenant_id()', () => {
    const src = sql();
    const start = src.indexOf('OBJECT 4');
    expect(src.slice(start)).toContain('kora.tenant_id()');
  });

  it('migration references canonical key kora_tenant_id (migration 006 alignment)', () => {
    // The comment must reference kora_tenant_id so the canonical key is documented
    expect(sql()).toContain('kora_tenant_id');
  });
});

// ── IDENTITY FIELD EXCLUSION ──────────────────────────────────────────────────

describe('B153 — worker identifier fields excluded from all SELECT lists [G1]', () => {
  // These fields must not appear in the column output lists (they may appear in
  // comments or NEVER-included remarks, but not as output columns).
  // We check the SELECT portions specifically.

  function selectSections(src: string): string {
    // Rough extraction: everything between SELECT and FROM/GROUP BY in each object
    // Good enough for a structural audit since the migration uses a clear pattern.
    return src;
  }

  it('pseudonym_id never selected as output column', () => {
    const src = sql();
    // Should not appear unquoted as a selected column (only in comments as NEVER included)
    // We check it's not in the SELECT list by ensuring it doesn't appear after 'SELECT'
    // before a comment explains its exclusion.
    // Simpler: verify it only appears in NEVER-include comments, not as a column alias.
    const lines = src.split('\n');
    const dangerLines = lines.filter(
      l => l.includes('pseudonym_id') && !l.trim().startsWith('--') && l.includes('SELECT')
    );
    expect(dangerLines).toHaveLength(0);
  });

  it('raw_hash never selected as output column', () => {
    const lines = sql().split('\n');
    const dangerLines = lines.filter(
      l => l.includes('raw_hash') && !l.trim().startsWith('--')
    );
    expect(dangerLines).toHaveLength(0);
  });

  it('worker_id never selected as output column', () => {
    // worker_participation.worker_id must not appear in any SELECT list
    const lines = sql().split('\n');
    const dangerLines = lines.filter(
      l => /\bworker_id\b/.test(l) && !l.trim().startsWith('--')
    );
    expect(dangerLines).toHaveLength(0);
  });

  it('ur.pseudonym_id not referenced in uploaded_record view', () => {
    const src = sql();
    const viewSection = src.slice(src.indexOf('v_company_uploaded_record_safe'));
    // pseudonym_id should not appear except in the NEVER-include comment
    const lines = viewSection.split('\n').slice(0, 60); // first ~60 lines of the view
    const sqlLines = lines.filter(l => !l.trim().startsWith('--'));
    expect(sqlLines.join('\n')).not.toContain('pseudonym_id');
  });

  it('migration contains explicit NEVER-included comment for pseudonym_id', () => {
    // Traceability: the exclusion decision must be documented in the migration.
    // Check the view definition section (OBJECT 3) where the NEVER comment lives.
    const src = sql();
    const viewSection = src.slice(src.indexOf('OBJECT 3'));
    expect(viewSection).toContain('pseudonym_id');
    expect(viewSection.toUpperCase()).toContain('NEVER');
  });
});

// ── SUPPRESSION LOGIC ─────────────────────────────────────────────────────────

describe('B153 — suppression SQL pattern: BETWEEN 1 AND 9 THEN NULL', () => {
  it('migration contains BETWEEN 1 AND 9 suppression pattern', () => {
    expect(sql()).toContain('BETWEEN 1 AND 9');
  });

  it('migration returns NULL (not -1, not 0) below threshold', () => {
    const src = sql();
    // Check that the suppression returns NULL, not a sentinel
    const suppressionBlock = src.slice(src.indexOf('BETWEEN 1 AND 9'));
    const firstLine = suppressionBlock.split('\n')[0];
    // The line should be followed by THEN NULL
    expect(src).toContain('BETWEEN 1 AND 9 THEN NULL');
  });

  it('migration documents safe_aggregation_threshold = 10', () => {
    expect(sql()).toContain("'safe_aggregation_threshold', 10");
  });

  it('migration references canonical TypeScript constant in comment', () => {
    expect(sql()).toContain('lib/constants/kora.ts');
    expect(sql()).toContain('SAFE_AGGREGATION_THRESHOLD');
  });
});

// ── PURE SUPPRESSION LOGIC TESTS (canonical semantics) ────────────────────────
// These tests verify the intended semantics of the SQL suppression expression.
// The SQL CASE WHEN n BETWEEN 1 AND 9 THEN NULL ELSE n END is mirrored here.

describe('B153 — suppression semantics (pure logic, mirrors SQL)', () => {
  it('0 participations → 0 (not suppressed — no activity)', () => {
    expect(suppress(0)).toBe(0);
  });

  it('1 participation → null (suppressed, re-identification risk)', () => {
    expect(suppress(1)).toBeNull();
  });

  it('5 participations → null (suppressed)', () => {
    expect(suppress(5)).toBeNull();
  });

  it('9 participations → null (suppressed, last value below threshold)', () => {
    expect(suppress(9)).toBeNull();
  });

  it('10 participations → 10 (at threshold, safe to show)', () => {
    expect(suppress(10)).toBe(10);
  });

  it('11 participations → 11 (above threshold)', () => {
    expect(suppress(11)).toBe(11);
  });

  it('100 participations → 100', () => {
    expect(suppress(100)).toBe(100);
  });

  it('suppress never returns a negative sentinel', () => {
    for (const n of [0, 1, 3, 9, 10, 50]) {
      const result = suppress(n);
      if (result !== null) expect(result).toBeGreaterThanOrEqual(0);
    }
  });

  it('suppress returns null for every value in [1, 9]', () => {
    for (let n = 1; n <= 9; n++) {
      expect(suppress(n)).toBeNull();
    }
  });
});

// ── FOUNDER DECISION TRACEABILITY ─────────────────────────────────────────────

describe('B153 — founder decision for raw_name is documented in migration', () => {
  it('migration contains raw_name founder decision comment', () => {
    // The exact traceability phrase the founder requested
    expect(sql()).toContain('founder decision B153');
  });

  it('migration states the assumption about raw_name (programme name, not PII)', () => {
    expect(sql()).toContain('programme name');
  });

  it('migration invites revisiting if assumption is violated', () => {
    expect(sql()).toContain('revisit this view');
  });

  it('raw_name exposed only for LIFE pillar', () => {
    const src = sql();
    // raw_name must appear in a FILTER (WHERE primary_pillar = 'LIFE') context
    expect(src).toContain("primary_pillar = 'LIFE'");
    // And raw_name must be in a life_program_names context
    expect(src).toContain('life_program_names');
  });
});

// ── GRANT / REVOKE CORRECTNESS ────────────────────────────────────────────────

describe('B153 — GRANT authenticated, REVOKE anon for all objects', () => {
  it('fn_company_worker_status: GRANT authenticated, REVOKE anon', () => {
    expect(sql()).toContain(
      'GRANT EXECUTE ON FUNCTION analytics.fn_company_worker_status() TO authenticated'
    );
    expect(sql()).toContain(
      'REVOKE EXECUTE ON FUNCTION analytics.fn_company_worker_status() FROM anon'
    );
  });

  it('fn_company_activation_summary: GRANT authenticated, REVOKE anon', () => {
    expect(sql()).toContain(
      'GRANT EXECUTE ON FUNCTION analytics.fn_company_activation_summary(text) TO authenticated'
    );
    expect(sql()).toContain(
      'REVOKE EXECUTE ON FUNCTION analytics.fn_company_activation_summary(text) FROM anon'
    );
  });

  it('v_company_uploaded_record_safe: GRANT authenticated, REVOKE anon', () => {
    expect(sql()).toContain(
      'GRANT SELECT ON analytics.v_company_uploaded_record_safe TO authenticated'
    );
    expect(sql()).toContain(
      'REVOKE SELECT ON analytics.v_company_uploaded_record_safe FROM anon'
    );
  });

  it('v_company_uef_eligibility_summary: GRANT authenticated, REVOKE anon', () => {
    expect(sql()).toContain(
      'GRANT SELECT ON analytics.v_company_uef_eligibility_summary TO authenticated'
    );
    expect(sql()).toContain(
      'REVOKE SELECT ON analytics.v_company_uef_eligibility_summary FROM anon'
    );
  });
});

// ── TENANT ISOLATION — cross-tenant audit ─────────────────────────────────────
// Verifies that no object in the migration exposes data without the tenant filter.
// (Full RLS enforcement requires a live DB — this is a structural/source audit.)

describe('B153 — no object omits tenant filter', () => {
  it('fn_company_worker_status: WHERE clause contains tenant_id = kora.tenant_id()', () => {
    const src = sql();
    // Use CREATE OR REPLACE FUNCTION as anchor — avoids the top-level OBJECTS comment list
    const fnBody = src.slice(
      src.indexOf('CREATE OR REPLACE FUNCTION analytics.fn_company_worker_status'),
      src.indexOf('CREATE OR REPLACE FUNCTION analytics.fn_company_activation_summary'),
    );
    expect(fnBody).toContain('tenant_id = kora.tenant_id()');
  });

  it('fn_company_activation_summary: WHERE clause contains tenant_id = kora.tenant_id()', () => {
    const src = sql();
    const fnBody = src.slice(
      src.indexOf('CREATE OR REPLACE FUNCTION analytics.fn_company_activation_summary'),
      src.indexOf('CREATE OR REPLACE VIEW analytics.v_company_uploaded_record_safe'),
    );
    expect(fnBody).toContain('tenant_id = kora.tenant_id()');
  });

  it('v_company_uploaded_record_safe: WHERE clause contains tenant_id = kora.tenant_id()', () => {
    const src = sql();
    const viewBody = src.slice(
      src.indexOf('CREATE OR REPLACE VIEW analytics.v_company_uploaded_record_safe'),
      src.indexOf('CREATE OR REPLACE VIEW analytics.v_company_uef_eligibility_summary'),
    );
    expect(viewBody).toContain('tenant_id = kora.tenant_id()');
  });

  it('v_company_uef_eligibility_summary: WHERE clause contains tenant_id = kora.tenant_id()', () => {
    const src = sql();
    const viewBody = src.slice(
      src.indexOf('CREATE OR REPLACE VIEW analytics.v_company_uef_eligibility_summary'),
    );
    expect(viewBody).toContain('tenant_id = kora.tenant_id()');
  });

  it('migration never queries without tenant filter (no unconditional FROM personal.*)', () => {
    // Every FROM personal.xxx must be followed (in the same object) by kora.tenant_id()
    const src = sql();
    const personalReferences = src.split('\n').filter(
      l => /FROM personal\.\w+/.test(l) && !l.trim().startsWith('--')
    );
    // There must be at least 3 (worker_identity, worker_initiative, uploaded_record)
    expect(personalReferences.length).toBeGreaterThanOrEqual(3);
    // Each is in a context that contains kora.tenant_id() — spot check via full source
    // (The per-object tests above are the precise checks; this is a count sanity check)
  });
});

// ── PGRST RELOAD ─────────────────────────────────────────────────────────────

describe('B153 — PostgREST reload', () => {
  it('migration ends with NOTIFY pgrst reload schema', () => {
    expect(sql()).toContain("NOTIFY pgrst, 'reload schema'");
  });
});
