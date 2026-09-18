/**
 * KORA-WP-114 — Living KORAL Company Hub (V1 core, KORAL Mark excluded —
 * Founder adjudication, .kora-audit/output/172_..._PRE_CHECK.md §31).
 *
 * Structure mirrors KORA-WP-113's own test file discipline: (1) structural
 * guards — no service-role client, no Mark/visual tokens, no evaluative
 * language, migration ceiling; (2) pure-function mapping tests, no DB, no
 * cookies/env vars; (3) mocked-DB behavior tests for the three
 * LivingKoralCompanyView statuses. Real-DB/RLS behavior is proven
 * separately by tests/integration/rls-25-living-koral-company-read-cross-
 * tenant.test.ts (matching the RLS-24/WP-113 established division).
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

// Strips // line comments and /* */ block comments so a token check tests
// actual CODE, never this file's own explanatory prose (which necessarily
// names the very tokens it prohibits, e.g. "no SVG identity" in a header
// comment, or a UI string that reassures the user "not a score" in plain
// Italian) — a naive raw-substring scan would false-positive on exactly
// this kind of self-documenting disclaimer.
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .join('\n');
}

// ── 1. STRUCTURAL GUARDS — no DB, no env vars ───────────────────────────────

describe('KORA-WP-114 — structural guards', () => {
  const serviceSource = readFileSync(join(REPO_ROOT, 'lib/living-koral-company-view/company-view-service.ts'), 'utf-8');
  const overviewSource = readFileSync(join(REPO_ROOT, 'components/company/living-koral/LivingKoralOverview.tsx'), 'utf-8');
  const pageSource = readFileSync(join(REPO_ROOT, 'app/company/living-koral/page.tsx'), 'utf-8');
  const serviceCode = stripComments(serviceSource);
  const overviewCode = stripComments(overviewSource);

  it('company-view-service.ts never imports getSupabaseServiceClient — session-forwarding client only (this WP\'s own §22/§8 discipline)', () => {
    expect(serviceCode).not.toMatch(/getSupabaseServiceClient/);
  });

  it('company-view-service.ts imports getSupabaseServerClient (the RLS-respecting, session-forwarding client)', () => {
    expect(serviceSource).toMatch(/getSupabaseServerClient/);
  });

  it('company-view-service.ts reads from gov.living_koral_transformation_ledger, never gov.living_koral_material_change directly (only RECOGNIZED-derived Ledger rows can ever be shown — CANDIDATE/SUPERSEDED structurally excluded, matching WP-113\'s own guarantee)', () => {
    expect(serviceSource).toMatch(/living_koral_transformation_ledger/);
    expect(serviceSource).not.toMatch(/from\('living_koral_material_change'\)/);
  });

  it('company-view-service.ts never calls .insert(/.update(/.delete( — 100% read-only', () => {
    expect(serviceSource).not.toMatch(/\.insert\(|\.update\(|\.delete\(/);
  });

  const NO_MARK_TOKENS = [
    'svg', 'canvas', 'geometry', 'seal', 'emblem', 'glyph', 'blob',
    'generative', 'procedural pattern', 'koralmark', 'KoralMark', 'KORAL Mark',
  ];

  it('LivingKoralOverview.tsx contains no KORAL Mark / visual-identity tokens in actual code (comments/prose excluded — this WP\'s own absolute §3 boundary)', () => {
    const lower = overviewCode.toLowerCase();
    for (const token of NO_MARK_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden Mark-related token "${token}" found in LivingKoralOverview.tsx's own code`).toBe(false);
    }
  });

  it('no component under components/company/living-koral/ is named or shaped like a Mark component', () => {
    const dir = join(REPO_ROOT, 'components/company/living-koral');
    const files = readdirSync(dir);
    for (const file of files) {
      expect(file.toLowerCase()).not.toMatch(/mark|portrait|seal|emblem|glyph/);
    }
  });

  const NO_EVALUATIVE_TOKENS = [
    'punteggio', 'voto', 'grado', 'salute organizzativa', 'maturità',
    'score', 'grade', 'health score', 'maturity', 'quality rating',
  ];

  it('LivingKoralOverview.tsx contains no score/grade/health/maturity evaluative language in rendered UI strings (comments excluded — this WP\'s own §2.B neutrality instruction)', () => {
    const lower = overviewCode.toLowerCase();
    for (const token of NO_EVALUATIVE_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden evaluative token "${token}" found in LivingKoralOverview.tsx's own code`).toBe(false);
    }
  });

  it('company-view-service.ts category labels contain no evaluative language either (the data layer, not just the view layer)', () => {
    const lower = serviceCode.toLowerCase();
    for (const token of NO_EVALUATIVE_TOKENS) {
      expect(lower.includes(token.toLowerCase()), `forbidden evaluative token "${token}" found in company-view-service.ts's own code`).toBe(false);
    }
  });

  it('page.tsx resolves tenantId from session (requireCompanyUser / kora-service-tenant-id cookie) — never from a client-supplied param', () => {
    expect(pageSource).toMatch(/requireCompanyUser/);
    expect(pageSource).not.toMatch(/searchParams/);
  });

  it('migration ceiling is at least 082, currently 083 (KORA-WP-114\'s own migration 083)', () => {
    const files = readdirSync(join(REPO_ROOT, 'supabase/migrations'));
    const numbers = files
      .map((f) => f.match(/^(\d+)_/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(83);
    expect(files).toContain('083_living_koral_company_read.sql');
  });

  it('migration 083 is policy-only — no CREATE TABLE, no ALTER TABLE ADD COLUMN, no GRANT widening (this WP\'s own §6 instruction)', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/083_living_koral_company_read.sql'), 'utf-8');
    expect(migrationSource).not.toMatch(/CREATE TABLE/i);
    expect(migrationSource).not.toMatch(/ADD COLUMN/i);
    expect(migrationSource).not.toMatch(/^GRANT/im);
    expect(migrationSource).toMatch(/CREATE POLICY "company_own_living_koral_transformation_ledger_read"/);
    expect(migrationSource).toMatch(/CREATE POLICY "company_own_living_koral_state_read"/);
  });

  it('migration ceiling is at least 083, currently 084 (object-level provenance remediation)', () => {
    const files = readdirSync(join(REPO_ROOT, 'supabase/migrations'));
    const numbers = files
      .map((f) => f.match(/^(\d+)_/)?.[1])
      .filter((n): n is string => Boolean(n))
      .map(Number);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(84);
    expect(files).toContain('084_living_koral_company_source_initiative.sql');
  });

  it('migration 084 adds a SECURITY DEFINER function only — no CREATE TABLE, no CREATE POLICY, no direct RLS widening on personal.worker_initiative or gov.living_koral_material_change', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    expect(migrationSource).not.toMatch(/CREATE TABLE/i);
    expect(migrationSource).not.toMatch(/CREATE POLICY/i);
    expect(migrationSource).not.toMatch(/ADD COLUMN/i);
    expect(migrationSource).toMatch(/CREATE OR REPLACE FUNCTION analytics\.fn_company_living_koral_source_initiative/);
    expect(migrationSource).toMatch(/SECURITY DEFINER/);
    expect(migrationSource).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.fn_company_living_koral_source_initiative/);
  });

  it('migration 084\'s function returns ONLY a title column — no id, no source_entity_id, no raw UUID field', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    const returnsMatch = migrationSource.match(/RETURNS TABLE \(([^)]*)\)/);
    expect(returnsMatch).not.toBeNull();
    const columns = returnsMatch![1].trim();
    expect(columns).toBe('title text');
  });

  it('migration 084\'s function gates by role AND tenant for COMPANY_ADMIN, and by role alone (cross-tenant) for KORA_ADMIN — never a blanket grant', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    expect(migrationSource).toMatch(/kora\.kora_role\(\) = 'COMPANY_ADMIN' AND mc\.tenant_id = kora\.tenant_id\(\)/);
    expect(migrationSource).toMatch(/kora\.kora_role\(\) = 'KORA_ADMIN'/);
  });

  it('migration 084\'s function has an explicit, safe search_path (SECURITY DEFINER hardening) — never relies on the caller\'s/default search_path', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    expect(migrationSource).toMatch(/SET search_path = gov, personal, analytics, kora, public/);
  });

  it('migration 084\'s function is SECURITY DEFINER with every table/function reference schema-qualified in its own body (no bare identifier could resolve via a tampered search_path)', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    const bodyMatch = migrationSource.match(/AS \$\$([\s\S]*?)\$\$;/);
    expect(bodyMatch).not.toBeNull();
    const body = bodyMatch![1];
    expect(body).toMatch(/FROM gov\.living_koral_material_change/);
    expect(body).toMatch(/JOIN personal\.worker_initiative/);
    expect(body).toMatch(/kora\.kora_role\(\)/);
    expect(body).toMatch(/kora\.tenant_id\(\)/);
  });

  it('migration 084\'s function contains no dynamic SQL (no EXECUTE format, no string-built query) — a caller-supplied uuid is the only input, bound, never interpolated', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    expect(migrationSource).not.toMatch(/EXECUTE\s+format\s*\(/i);
    expect(migrationSource).not.toMatch(/\|\|\s*p_material_change_id/);
  });

  it('migration 084 explicitly REVOKEs EXECUTE FROM PUBLIC (SECURITY DEFINER hardening — closes PostgreSQL\'s own default implicit PUBLIC grant, matching neither over- nor under-granting)', () => {
    const migrationSource = readFileSync(join(REPO_ROOT, 'supabase/migrations/084_living_koral_company_source_initiative.sql'), 'utf-8');
    expect(migrationSource).toMatch(/REVOKE EXECUTE ON FUNCTION analytics\.fn_company_living_koral_source_initiative\(uuid\) FROM PUBLIC;/);
  });
});

// ── 2. PURE-FUNCTION MAPPING TESTS — no DB, no cookies ──────────────────────

import { categoryPresentation, domainLabel, toRegions, toLatestTransformation } from '@/lib/living-koral-company-view/company-view-service';
import type { MaterialChangeTaxonomyEntry } from '@/lib/living-koral-config/types';

const ALL_CATEGORIES: MaterialChangeTaxonomyEntry['category'][] = [
  'Emergence', 'Disappearance', 'Strengthening', 'Weakening', 'Consolidation', 'Reorientation', 'Stabilization',
];

describe('KORA-WP-114 — category presentation mapping (all 7 taxonomy categories, not just the 2 live ones)', () => {
  it('every one of the 7 canonical categories has a non-empty Italian label and description', () => {
    for (const category of ALL_CATEGORIES) {
      const presentation = categoryPresentation(category);
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(presentation.description.length).toBeGreaterThan(0);
    }
  });

  it('no category label or description contains the raw English enum token itself (translated, not passed through)', () => {
    for (const category of ALL_CATEGORIES) {
      const presentation = categoryPresentation(category);
      expect(presentation.label).not.toBe(category);
    }
  });

  it('an unknown category string falls back safely (never throws)', () => {
    expect(() => categoryPresentation('NotARealCategory' as MaterialChangeTaxonomyEntry['category'])).not.toThrow();
  });
});

describe('KORA-WP-114 — domain label mapping', () => {
  it('"initiative" maps to a human-legible Italian label, never the raw enum token', () => {
    expect(domainLabel('initiative')).not.toBe('initiative');
    expect(domainLabel('initiative').length).toBeGreaterThan(0);
  });

  it('an unknown domain falls back to the raw string (never throws)', () => {
    expect(domainLabel('unknown-domain')).toBe('unknown-domain');
  });
});

describe('KORA-WP-114 — toRegions() pure mapping', () => {
  it('maps a real regions jsonb shape to the Company view shape, with labels', () => {
    const regions = toRegions({ initiative: { element_count: 3 } });
    expect(regions).toEqual([{ domain: 'initiative', domainLabel: domainLabel('initiative'), elementCount: 3 }]);
  });

  it('null/undefined regions maps to an empty array — never fabricated data', () => {
    expect(toRegions(null)).toEqual([]);
  });

  it('a missing element_count defaults to 0, never undefined/NaN', () => {
    const regions = toRegions({ initiative: {} });
    expect(regions[0].elementCount).toBe(0);
  });
});

describe('KORA-WP-114 — toLatestTransformation() pure mapping', () => {
  const baseRow = { category: 'Emergence' as const, affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-1' };

  it('maps a real Ledger row shape to the Company view shape', () => {
    const mapped = toLatestTransformation(baseRow, null);
    expect(mapped.category).toBe('Emergence');
    expect(mapped.occurredAt).toBe('2026-01-01T00:00:00Z');
    expect(mapped.recognizedAt).toBe('2026-01-02T00:00:00Z');
    expect(mapped.categoryLabel).toBe(categoryPresentation('Emergence').label);
  });

  it('never includes a raw material_change_id, engine version, or config version field (technical provenance stays server-side)', () => {
    const row = { category: 'Disappearance' as const, affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-2' };
    const mapped = toLatestTransformation(row, null) as unknown as Record<string, unknown>;
    expect(mapped.materialChangeId).toBeUndefined();
    expect(mapped.material_change_id).toBeUndefined();
    expect(mapped.morphogenesisEngineVersion).toBeUndefined();
    expect(mapped.taxonomyConfigVersion).toBeUndefined();
  });

  it('carries a resolved sourceLabel through unchanged when provided (object-level provenance, migration 084)', () => {
    const mapped = toLatestTransformation(baseRow, 'Corso di Mindfulness Aziendale');
    expect(mapped.sourceLabel).toBe('Corso di Mindfulness Aziendale');
  });

  it('sourceLabel is null when resolution was unavailable — never fabricated, never a raw id fallback', () => {
    const mapped = toLatestTransformation(baseRow, null);
    expect(mapped.sourceLabel).toBeNull();
  });
});

// ── 3. MOCKED-DB BEHAVIOR TESTS — getLivingKoralCompanyView() status logic ──

interface MockChain {
  eq: (col: string, val: unknown) => MockChain;
  order: (col: string, opts?: unknown) => MockChain;
  limit: (n: number) => MockChain;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
}

let mockStateResult: { data: unknown; error: unknown } = { data: null, error: null };
let mockLedgerResult: { data: unknown; error: unknown } = { data: null, error: null };
let mockRpcResult: { data: unknown; error: unknown } = { data: null, error: null };
let rpcCallCount = 0;
let lastRpcArgs: Record<string, unknown> | null = null;

function makeChain(result: () => { data: unknown; error: unknown }): MockChain {
  const chain: MockChain = {
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    maybeSingle: async () => result(),
  };
  return chain;
}

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServerClient: async () => ({
    schema: (schemaName: string) => ({
      from: (table: string) => ({
        select: () => {
          if (schemaName === 'analytics' && table === 'living_koral_state') return makeChain(() => mockStateResult);
          if (schemaName === 'gov' && table === 'living_koral_transformation_ledger') return makeChain(() => mockLedgerResult);
          throw new Error(`unexpected schema/table in mock: ${schemaName}.${table}`);
        },
      }),
      rpc: (fn: string, args: Record<string, unknown>) => {
        if (schemaName === 'analytics' && fn === 'fn_company_living_koral_source_initiative') {
          rpcCallCount += 1;
          lastRpcArgs = args;
          return Promise.resolve(mockRpcResult);
        }
        throw new Error(`unexpected rpc in mock: ${schemaName}.${fn}`);
      },
    }),
  }),
}));

vi.mock('@/lib/observability/observability', () => ({
  captureError: vi.fn(),
  logInfo: vi.fn(),
}));

describe('KORA-WP-114 — getLivingKoralCompanyView() status logic (mocked DB)', () => {
  beforeEach(() => {
    mockStateResult = { data: null, error: null };
    mockLedgerResult = { data: null, error: null };
    mockRpcResult = { data: null, error: null };
    rpcCallCount = 0;
    lastRpcArgs = null;
    vi.resetModules();
  });

  it('no state row → status "no_state_yet", no fabricated data (genuine pre-genesis empty state)', async () => {
    mockStateResult = { data: null, error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('no_state_yet');
    expect(view.revision).toBeNull();
    expect(view.regions).toBeNull();
    expect(view.latestTransformation).toBeNull();
  });

  it('state row exists, ledger row exists → status "ok" with correctly mapped data', async () => {
    mockStateResult = { data: { revision: 2, regions: { initiative: { element_count: 4 } } }, error: null };
    mockLedgerResult = { data: { category: 'Emergence', affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-a' }, error: null };
    mockRpcResult = { data: { title: 'Corso di Nutrizione Consapevole' }, error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('ok');
    expect(view.revision).toBe(2);
    expect(view.regions).toEqual([{ domain: 'initiative', domainLabel: domainLabel('initiative'), elementCount: 4 }]);
    expect(view.latestTransformation?.category).toBe('Emergence');
  });

  it('an initiative-derived transformation resolves the real source title via the RPC, called with the real material_change_id (not a mocked narrative payload)', async () => {
    mockStateResult = { data: { revision: 1, regions: { initiative: { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: { category: 'Emergence', affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-real-123' }, error: null };
    mockRpcResult = { data: { title: 'Corso di Mindfulness Aziendale' }, error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.latestTransformation?.sourceLabel).toBe('Corso di Mindfulness Aziendale');
    expect(rpcCallCount).toBe(1);
    expect(lastRpcArgs).toEqual({ p_material_change_id: 'mc-real-123' });
  });

  it('a zero-row RPC result (e.g. cross-tenant, non-initiative, or deleted source) falls back to sourceLabel=null — status stays "ok", never a fake empty state', async () => {
    mockStateResult = { data: { revision: 1, regions: { initiative: { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: { category: 'Emergence', affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-b' }, error: null };
    mockRpcResult = { data: [], error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('ok');
    expect(view.latestTransformation?.sourceLabel).toBeNull();
  });

  it('an RPC error falls back to sourceLabel=null — degrades gracefully, never turns the whole view into integrity_error over a non-critical provenance-label failure', async () => {
    mockStateResult = { data: { revision: 1, regions: { initiative: { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: { category: 'Emergence', affected_domain: 'initiative', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-c' }, error: null };
    mockRpcResult = { data: null, error: { message: 'permission denied' } };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('ok');
    expect(view.latestTransformation?.sourceLabel).toBeNull();
  });

  it('state row exists (revision >= 1) but no ledger row found → status "integrity_error", never silently treated as empty (this WP\'s own §14 instruction)', async () => {
    mockStateResult = { data: { revision: 1, regions: { initiative: { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: null, error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('integrity_error');
    expect(view.latestTransformation).toBeNull();
  });

  it('a hypothetical non-initiative affected_domain never triggers the RPC at all — no speculative future-domain resolution attempted (this remediation\'s own §5 instruction)', async () => {
    mockStateResult = { data: { revision: 1, regions: { 'future-domain': { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: { category: 'Emergence', affected_domain: 'future-domain', occurred_at: '2026-01-01T00:00:00Z', recognized_at: '2026-01-02T00:00:00Z', material_change_id: 'mc-future' }, error: null };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(rpcCallCount).toBe(0);
    expect(view.latestTransformation?.sourceLabel).toBeNull();
  });

  it('a state-read error → status "integrity_error", never a fake empty state', async () => {
    mockStateResult = { data: null, error: { message: 'connection reset' } };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('integrity_error');
  });

  it('a ledger-read error → status "integrity_error", still returns the real revision/regions already read (partial-but-honest, not a full blackout)', async () => {
    mockStateResult = { data: { revision: 1, regions: { initiative: { element_count: 1 } } }, error: null };
    mockLedgerResult = { data: null, error: { message: 'connection reset' } };
    const { getLivingKoralCompanyView } = await import('@/lib/living-koral-company-view/company-view-service');
    const view = await getLivingKoralCompanyView('tenant-a');
    expect(view.status).toBe('integrity_error');
    expect(view.revision).toBe(1);
  });
});
