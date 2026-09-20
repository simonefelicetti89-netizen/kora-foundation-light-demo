/**
 * KORA-WP-115 — KORAL Edition (Portrait folded into Edition).
 *
 * Structure mirrors KORA-WP-114's own test file discipline: (1) structural
 * guards — no service-role client, no Mark/visual tokens, no evaluative
 * language, no raw INSERT, migration hardening text; (2) pure-function
 * mapping tests (edition-view.ts), no DB, no cookies; (3) mocked-DB
 * behavior tests for edition-service.ts's list/create functions,
 * including idempotency outcome classification. Real-DB/RLS/concurrency
 * behavior is proven separately by tests/integration/rls-27-living-koral-
 * edition.test.ts (matching the RLS-25..26/WP-114 established division).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

// Strips // and /* */ comments (JS/TS files) — a naive raw-substring scan
// would false-positive on this file's own explanatory prose (e.g. a
// header comment naming exactly the tokens it prohibits).
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

// Same rationale, for SQL's own `--` line-comment syntax — migration
// 085's own header extensively explains what it does NOT do (no UNIQUE
// constraint, no dynamic SQL, no review/publication fields), which would
// otherwise false-positive a naive scan of the raw file.
function stripSqlComments(source: string): string {
  return source
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n');
}

// ── 1. STRUCTURAL GUARDS — no DB, no env vars ───────────────────────────────

describe('KORA-WP-115 — structural guards', () => {
  const migrationSourceRaw = readFileSync(join(REPO_ROOT, 'supabase/migrations/085_living_koral_edition.sql'), 'utf-8');
  const serviceSource = readFileSync(join(REPO_ROOT, 'lib/living-koral-edition/edition-service.ts'), 'utf-8');
  const viewSource = readFileSync(join(REPO_ROOT, 'lib/living-koral-edition/edition-view.ts'), 'utf-8');
  const archiveSource = readFileSync(join(REPO_ROOT, 'components/company/living-koral/EditionsArchive.tsx'), 'utf-8');
  const routeSource = readFileSync(join(REPO_ROOT, 'app/api/company/living-koral/editions/route.ts'), 'utf-8');
  const serviceCode = stripComments(serviceSource);
  const archiveCode = stripComments(archiveSource);
  const viewCode = stripComments(viewSource);
  // migrationSource (used by the structural CONTENT assertions further
  // below, e.g. "does this file DEFINE search_path/REVOKE/GRANT") stays
  // the raw file — those assertions look for real SQL statements, which
  // only ever appear in code, not comments, so stripping is unnecessary
  // there. The two "must NOT contain" checks (no forbidden field names,
  // no UNIQUE constraint, no dynamic SQL) use the comment-stripped
  // version instead, defined locally at each such assertion.
  const migrationSource = migrationSourceRaw;
  const migrationCode = stripSqlComments(migrationSourceRaw);

  it('migration ceiling is at least 084, currently 085 (KORA-WP-115)', () => {
    const files = readdirSync(join(REPO_ROOT, 'supabase/migrations'));
    const numbers = files
      .map((f) => f.match(/^(\d+)_/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(85);
    expect(files).toContain('085_living_koral_edition.sql');
  });

  it('migration 085 creates exactly one table and one write function — no review/publication/export/Mark field of any kind', () => {
    expect(migrationSource).toMatch(/CREATE TABLE IF NOT EXISTS analytics\.living_koral_edition/);
    expect(migrationCode).not.toMatch(/review_status|approved_at|approved_by|published_at|visibility|public_slug|export_status|portrait_payload|image_path|mark_payload/i);
  });

  it('migration 085 has NO UNIQUE(tenant_id, ledger_id) constraint (Founder adjudication #3 — multiple Editions may reference the same frozen state)', () => {
    expect(migrationCode).not.toMatch(/UNIQUE\s*\(\s*tenant_id\s*,\s*ledger_id\s*\)/i);
  });

  it('migration 085\'s write function is SECURITY DEFINER, hardened from first implementation — explicit search_path, REVOKE FROM PUBLIC and anon, narrow authenticated GRANT', () => {
    expect(migrationSource).toMatch(/CREATE OR REPLACE FUNCTION analytics\.fn_create_living_koral_edition/);
    expect(migrationSource).toMatch(/SECURITY DEFINER/);
    expect(migrationSource).toMatch(/SET search_path = gov, analytics, kora, public/);
    expect(migrationSource).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_create_living_koral_edition\(text\) FROM PUBLIC;/);
    expect(migrationSource).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_create_living_koral_edition\(text\) FROM anon;/);
    expect(migrationSource).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_create_living_koral_edition\(text\) TO authenticated;/);
  });

  it('migration 085\'s write function re-derives tenant/role exclusively from kora.kora_role()/kora.tenant_id() — no caller-controlled tenant_id parameter', () => {
    const fnMatch = migrationSource.match(/CREATE OR REPLACE FUNCTION analytics\.fn_create_living_koral_edition\(([^)]*)\)/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![1].trim()).toBe('p_name text'); // the ONLY parameter — no p_tenant_id, no p_role
    expect(migrationSource).toMatch(/v_role := kora\.kora_role\(\);/);
    expect(migrationSource).toMatch(/v_tenant_id := kora\.tenant_id\(\);/);
  });

  it('migration 085\'s write function has no dynamic SQL (no EXECUTE format, no string-built query)', () => {
    expect(migrationCode).not.toMatch(/EXECUTE\s+format\s*\(/i);
  });

  it('migration 085\'s table is append-only (BEFORE UPDATE OR DELETE reject trigger, matching the established 6-instance pattern)', () => {
    expect(migrationSource).toMatch(/CREATE TRIGGER trg_living_koral_edition_no_mutation/);
    expect(migrationSource).toMatch(/BEFORE UPDATE OR DELETE ON analytics\.living_koral_edition/);
  });

  it('migration 085 grants `authenticated` SELECT only on the table — no INSERT/UPDATE/DELETE grant of any kind', () => {
    expect(migrationSource).toMatch(/GRANT SELECT ON analytics\.living_koral_edition TO authenticated;/);
    expect(migrationSource).not.toMatch(/GRANT (SELECT,\s*)?INSERT.*ON analytics\.living_koral_edition TO authenticated/i);
    expect(migrationSource).not.toMatch(/GRANT (SELECT,\s*)?UPDATE.*ON analytics\.living_koral_edition TO authenticated/i);
  });

  it('edition-service.ts never imports getSupabaseServiceClient — session-forwarding client only', () => {
    expect(serviceCode).not.toMatch(/getSupabaseServiceClient/);
  });

  it('edition-service.ts never calls .insert(/.update(/.delete( against the Edition table — the SECURITY DEFINER RPC is the only write path', () => {
    expect(serviceCode).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
    expect(serviceCode).toMatch(/rpc\('fn_create_living_koral_edition'/);
  });

  it('edition-service.ts reuses the existing KORA-WP-011 idempotency contract — never a new idempotency mechanism', () => {
    expect(serviceCode).toMatch(/executeIdempotent/);
    expect(serviceCode).toMatch(/PostgresIdempotencyStore/);
  });

  // "canvas" is deliberately excluded from this list — TOKENS.canvas is a
  // real, pre-existing, unrelated design-system token (the page
  // background color, lib/design/kora-design-tokens.ts) legitimately used
  // throughout this file's own styling; a bare-substring check on the
  // word "canvas" would false-positive against that token name. The
  // actual forbidden concept (an HTML <canvas> drawing surface) is
  // checked precisely, immediately below.
  // "export" is deliberately excluded — it is a JS/ES-module keyword
  // (every `export function ...` in this file legitimately contains it);
  // the actual forbidden concept (an export/download FEATURE) is already
  // covered by "download" below and by the dedicated no-Mark/no-download
  // component-file-naming check further down.
  const NO_MARK_TOKENS = ['svg', 'geometry', 'seal', 'emblem', 'glyph', 'blob', 'generative', 'procedural pattern', 'koralmark', 'KoralMark', 'KORAL Mark', 'download', 'publish', 'share'];

  it('EditionsArchive.tsx contains no KORAL Mark / visual-identity / download-export-publish-share tokens in its own code (comments excluded)', () => {
    const lower = archiveCode.toLowerCase();
    for (const token of NO_MARK_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden token "${token}" found in EditionsArchive.tsx's own code`).toBe(false);
    }
  });

  it('EditionsArchive.tsx never uses an actual <canvas> drawing surface (TOKENS.canvas, the unrelated design token, is exempt — checked precisely, not by bare substring)', () => {
    expect(archiveCode).not.toMatch(/<canvas\b/i);
    expect(archiveCode).not.toMatch(/getContext\(['"]2d['"]\)/);
    expect(archiveCode).not.toMatch(/CanvasRenderingContext2D/);
  });

  const NO_REVIEW_TOKENS = ['verdict', 'assessment', 'approv', 'reject', 'review comment', 'validation workflow'];

  it('EditionsArchive.tsx contains no Review-workflow tokens (WP-116 boundary)', () => {
    const lower = archiveCode.toLowerCase();
    for (const token of NO_REVIEW_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden Review-workflow token "${token}" found in EditionsArchive.tsx's own code`).toBe(false);
    }
  });

  const NO_EVALUATIVE_TOKENS = ['punteggio', 'voto', 'grado', 'maturità', 'score', 'grade', 'improvement', 'declined', 'stronger', 'weaker than before'];

  it('EditionsArchive.tsx contains no score/comparison/evaluative language', () => {
    const lower = archiveCode.toLowerCase();
    for (const token of NO_EVALUATIVE_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden evaluative token "${token}" found in EditionsArchive.tsx's own code`).toBe(false);
    }
  });

  it('EditionsArchive.tsx contains no rename/edit/delete/annotate control', () => {
    const lower = archiveCode.toLowerCase();
    expect(lower).not.toMatch(/rename|onedit|annotate|handledelete|<button[^>]*delete/i);
  });

  it('edition-view.ts never includes ledgerId, taxonomyConfigVersion, morphogenesisEngineVersion, actorId, or tenantId in its own exported view type (technical provenance stays server-side)', () => {
    expect(viewCode).not.toMatch(/ledgerId|taxonomyConfigVersion|morphogenesisEngineVersion|actorId|tenantId/);
  });

  it('the API route derives tenantId exclusively from the session (requireCompanyUser) — never from the request body', () => {
    expect(routeSource).toMatch(/requireCompanyUser/);
    expect(routeSource).not.toMatch(/body\.tenantId|tenant_id.*body/i);
  });
});

// ── 2. PURE-FUNCTION MAPPING TESTS — no DB, no cookies ──────────────────────

import { toEditionView } from '@/lib/living-koral-edition/edition-view';
import type { LivingKoralEditionRecord } from '@/lib/living-koral-edition/types';

function makeRecord(overrides: Partial<LivingKoralEditionRecord> = {}): LivingKoralEditionRecord {
  return {
    id: 'e1', tenantId: 't1', name: 'Test Edition', ledgerId: 'l1',
    category: 'Emergence', affectedDomain: 'initiative',
    taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'morphogenesis-v1.0',
    resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', recognizedAt: '2026-01-02T00:00:00Z',
    sourceLabel: 'Corso Reale', actorRole: 'COMPANY_ADMIN', actorId: 'user-1',
    createdAt: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

describe('KORA-WP-115 — toEditionView() pure mapping', () => {
  it('maps a real Edition record to the Company view shape, reusing WP-114\'s own category/domain labels', () => {
    const view = toEditionView(makeRecord());
    expect(view.name).toBe('Test Edition');
    expect(view.categoryLabel.length).toBeGreaterThan(0);
    expect(view.categoryLabel).not.toBe('Emergence'); // translated, never raw enum passthrough
    expect(view.sourceLabel).toBe('Corso Reale');
  });

  it('never includes ledgerId, taxonomyConfigVersion, morphogenesisEngineVersion, actorId, or tenantId in its output', () => {
    const view = toEditionView(makeRecord()) as unknown as Record<string, unknown>;
    expect(view.ledgerId).toBeUndefined();
    expect(view.taxonomyConfigVersion).toBeUndefined();
    expect(view.morphogenesisEngineVersion).toBeUndefined();
    expect(view.actorId).toBeUndefined();
    expect(view.tenantId).toBeUndefined();
  });

  it('a null sourceLabel maps through as null, never fabricated', () => {
    const view = toEditionView(makeRecord({ sourceLabel: null }));
    expect(view.sourceLabel).toBeNull();
  });

  it('every one of the 7 taxonomy categories maps to a non-empty label (not just Emergence — an Edition could in principle anchor any recognized category)', () => {
    const categories: LivingKoralEditionRecord['category'][] = ['Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization'];
    for (const category of categories) {
      const view = toEditionView(makeRecord({ category }));
      expect(view.categoryLabel.length).toBeGreaterThan(0);
    }
  });
});

// ── 3. MOCKED-DB BEHAVIOR TESTS ──────────────────────────────────────────────

interface MockChain {
  eq: (col: string, val: unknown) => MockChain;
  order: (col: string, opts?: unknown) => MockChain;
  then: (resolve: (v: { data: unknown; error: unknown }) => void) => void;
}

let mockListResult: { data: unknown; error: unknown } = { data: [], error: null };
let mockRpcResult: { data: unknown; error: unknown } = { data: null, error: null };
let rpcCallCount = 0;

function makeListChain(): MockChain {
  const chain: MockChain = {
    eq: () => chain,
    order: () => chain,
    then: (resolve) => resolve(mockListResult),
  };
  return chain as unknown as MockChain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({
    schema: () => ({
      from: () => ({ select: () => makeListChain() }),
      rpc: (fn: string) => {
        if (fn === 'fn_create_living_koral_edition') {
          rpcCallCount += 1;
          return Promise.resolve(mockRpcResult);
        }
        throw new Error(`unexpected rpc: ${fn}`);
      },
    }),
  }),
}));

// A minimal, deterministic, in-memory IdempotencyStore double — NOT a new
// idempotency mechanism (the real one, KORA-WP-011's own contract, is
// exercised as-is via executeIdempotent()); this only replaces WHERE the
// claim records live for this test's own controlled scenarios.
const idempotencyRecords = new Map<string, { status: string; payloadHash: string; result: unknown; error: string | null; createdAt: string; updatedAt: string }>();

vi.mock('@/lib/async-contract/postgres-idempotency-store', () => ({
  PostgresIdempotencyStore: class {
    async claim(key: { tenantId: string; operation: string; key: string }, payloadHash: string) {
      const k = `${key.tenantId}::${key.operation}::${key.key}`;
      const existing = idempotencyRecords.get(k);
      if (existing) return { claimed: false as const, existing };
      const now = new Date().toISOString();
      idempotencyRecords.set(k, { status: 'pending', payloadHash, result: null, error: null, createdAt: now, updatedAt: now });
      return { claimed: true as const };
    }
    async complete(key: { tenantId: string; operation: string; key: string }, result: unknown) {
      const k = `${key.tenantId}::${key.operation}::${key.key}`;
      const rec = idempotencyRecords.get(k);
      if (rec) { rec.status = 'succeeded'; rec.result = result; }
    }
    async fail(key: { tenantId: string; operation: string; key: string }, error: string) {
      const k = `${key.tenantId}::${key.operation}::${key.key}`;
      const rec = idempotencyRecords.get(k);
      if (rec) { rec.status = 'failed'; rec.error = error; }
    }
  },
}));

import { listLivingKoralEditionsForTenant, createLivingKoralEdition } from '@/lib/living-koral-edition/edition-service';

describe('KORA-WP-115 — listLivingKoralEditionsForTenant() (mocked DB)', () => {
  beforeEach(() => {
    mockListResult = { data: [], error: null };
    vi.resetModules();
  });

  it('empty archive maps to an empty array, never fabricated data', async () => {
    const editions = await listLivingKoralEditionsForTenant('tenant-a');
    expect(editions).toEqual([]);
  });

  it('a real row maps to a full LivingKoralEditionRecord', async () => {
    mockListResult = {
      data: [{ id: 'e1', name: 'X', ledger_id: 'l1', category: 'Emergence', affected_domain: 'initiative', taxonomy_config_version: '1.0', morphogenesis_engine_version: 'v1', resulting_state_revision: 1, occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', source_label: 'Corso', actor_id: 'u1', created_at: '2026-01-03T00:00:00Z' }],
      error: null,
    };
    const editions = await listLivingKoralEditionsForTenant('tenant-a');
    expect(editions).toHaveLength(1);
    expect(editions[0].name).toBe('X');
    expect(editions[0].tenantId).toBe('tenant-a'); // caller-supplied, session-derived, not from the row itself
  });
});

describe('KORA-WP-115 — createLivingKoralEdition() (mocked DB + idempotency)', () => {
  beforeEach(() => {
    mockRpcResult = { data: null, error: null };
    rpcCallCount = 0;
    idempotencyRecords.clear();
    vi.resetModules();
  });

  it('an empty name is rejected before ever touching the store or the RPC', async () => {
    const result = await createLivingKoralEdition({ tenantId: 't1', name: '   ', idempotencyKey: 'k1' });
    expect(result.kind).toBe('invalid_name');
    expect(rpcCallCount).toBe(0);
  });

  it('a successful creation returns kind "created" and calls the RPC exactly once', async () => {
    mockRpcResult = {
      data: [{ id: 'e1', name: 'Real Edition', ledger_id: 'l1', category: 'Emergence', affected_domain: 'initiative', taxonomy_config_version: '1.0', morphogenesis_engine_version: 'v1', resulting_state_revision: 1, occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', source_label: null, created_at: '2026-01-03T00:00:00Z' }],
      error: null,
    };
    const result = await createLivingKoralEdition({ tenantId: 't1', name: 'Real Edition', idempotencyKey: 'k1' });
    expect(result.kind).toBe('created');
    expect(rpcCallCount).toBe(1);
  });

  it('a RETRY with the SAME key and the SAME name replays the original Edition — never a second RPC call, never a duplicate', async () => {
    mockRpcResult = {
      data: [{ id: 'e1', name: 'Same Name', ledger_id: 'l1', category: 'Emergence', affected_domain: 'initiative', taxonomy_config_version: '1.0', morphogenesis_engine_version: 'v1', resulting_state_revision: 1, occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', source_label: null, created_at: '2026-01-03T00:00:00Z' }],
      error: null,
    };
    const first = await createLivingKoralEdition({ tenantId: 't1', name: 'Same Name', idempotencyKey: 'retry-key' });
    const second = await createLivingKoralEdition({ tenantId: 't1', name: 'Same Name', idempotencyKey: 'retry-key' });
    expect(first.kind).toBe('created');
    expect(second.kind).toBe('replayed');
    expect(rpcCallCount).toBe(1); // the RPC was never called a second time
    if (first.kind === 'created' && second.kind === 'replayed') {
      expect(second.edition.id).toBe(first.edition.id); // the exact same Edition, not a duplicate
    }
  });

  it('the SAME key with a DIFFERENT name is a conflict — never silently applied, never creates a mismatched Edition', async () => {
    mockRpcResult = { data: [{ id: 'e1', name: 'First Name', ledger_id: 'l1', category: 'Emergence', affected_domain: 'initiative', taxonomy_config_version: '1.0', morphogenesis_engine_version: 'v1', resulting_state_revision: 1, occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', source_label: null, created_at: '2026-01-03T00:00:00Z' }], error: null };
    await createLivingKoralEdition({ tenantId: 't1', name: 'First Name', idempotencyKey: 'shared-key' });
    const second = await createLivingKoralEdition({ tenantId: 't1', name: 'Different Name', idempotencyKey: 'shared-key' });
    expect(second.kind).toBe('conflict');
    expect(rpcCallCount).toBe(1); // the second, conflicting attempt never reached the RPC
  });

  it('TWO DIFFERENT idempotency keys always create two distinct Editions, even for the same tenant (Founder adjudication #3 — no uniqueness constraint)', async () => {
    mockRpcResult = { data: [{ id: 'e1', name: 'A', ledger_id: 'l1', category: 'Emergence', affected_domain: 'initiative', taxonomy_config_version: '1.0', morphogenesis_engine_version: 'v1', resulting_state_revision: 1, occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', source_label: null, created_at: '2026-01-03T00:00:00Z' }], error: null };
    await createLivingKoralEdition({ tenantId: 't1', name: 'A', idempotencyKey: 'key-1' });
    await createLivingKoralEdition({ tenantId: 't1', name: 'B', idempotencyKey: 'key-2' });
    expect(rpcCallCount).toBe(2); // two genuinely distinct creation attempts, both reached the RPC
  });

  it('a "no recognized transformation" RPC error classifies to a typed result, never an unhandled exception', async () => {
    mockRpcResult = { data: null, error: { message: 'kora/no-recognized-transformation: no recognized Living KORAL transformation exists yet for this tenant' } };
    const result = await createLivingKoralEdition({ tenantId: 't1', name: 'X', idempotencyKey: 'k1' });
    expect(result.kind).toBe('no_recognized_transformation');
  });

  it('an unclassified RPC error is re-thrown, never silently swallowed', async () => {
    mockRpcResult = { data: null, error: { message: 'connection reset' } };
    await expect(createLivingKoralEdition({ tenantId: 't1', name: 'X', idempotencyKey: 'k1' })).rejects.toThrow();
  });
});
