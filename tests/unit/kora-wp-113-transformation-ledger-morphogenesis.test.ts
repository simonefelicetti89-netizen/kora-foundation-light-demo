// tests/unit/kora-wp-113-transformation-ledger-morphogenesis.test.ts
// KORA-WP-113 — Transformation Ledger + Morphogenesis Engine v1 +
// Continuity Contract v1.
//
// Three parts: (1) always-on structural guards (config consumption,
// WP-114+ boundary, Decision Spine/Intelligence absence, no-direct-write
// discipline, migration ceiling — no DB needed); (2) always-on pure-
// function tests for replayLivingKoralStateFromLedger() (determinism/
// locality/reversal — no DB needed, synthetic fixtures only); (3) an
// env-var-gated real-DB section proving the actual atomic RPC behavior —
// exactly-once, concurrency, transaction atomicity, provenance — through
// the real TypeScript service functions, matching KORA-WP-112/WP-045's
// own established real-service-layer testing convention.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const WP113_FILES = [
  'lib/living-koral-morphogenesis-config/types.ts',
  'lib/living-koral-morphogenesis-config/v1.ts',
  'lib/living-koral-transformation-ledger/types.ts',
  'lib/living-koral-transformation-ledger/transformation-ledger-service.ts',
];

function readWp113File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

function codeOnly(rel: string): string {
  return readWp113File(rel).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
}

function importLines(rel: string): string {
  return readWp113File(rel).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
}

describe('KORA-WP-113 — consumes KORA-WP-111\'s own config, never redefines the taxonomy', () => {
  for (const file of WP113_FILES) {
    it(`${file}: no hardcoded 7-way taxonomy category union (must import from lib/living-koral-config, never redeclare)`, () => {
      const TAXONOMY_UNION_LITERAL = "'Emergence' | 'Disappearance' | 'Strengthening' | 'Weakening' | 'Consolidation' | 'Reorientation' | 'Stabilization'";
      expect(codeOnly(file)).not.toContain(TAXONOMY_UNION_LITERAL);
    });
  }

  it('transformation-ledger-service.ts consumes lib/living-koral-morphogenesis-config/v1 (never hardcodes the operation mapping inline)', () => {
    expect(importLines('lib/living-koral-transformation-ledger/transformation-ledger-service.ts')).toMatch(/living-koral-morphogenesis-config\/v1/);
  });
});

describe('KORA-WP-113 — Morphogenesis Engine v1 config: KORAL Morphology Package A (2026-09-19) widened live operations from 2 to 6 — Consolidation remains the sole dormant category', () => {
  it('getMorphogenesisOperationForCategory returns the correct live mapping for Emergence/Disappearance', async () => {
    const { getMorphogenesisOperationForCategory } = await import('@/lib/living-koral-morphogenesis-config/v1');
    expect(getMorphogenesisOperationForCategory('Emergence')).toBe('add_element');
    expect(getMorphogenesisOperationForCategory('Disappearance')).toBe('remove_element');
  });

  it('getMorphogenesisOperationForCategory returns the correct live Package-A mapping for Strengthening/Weakening/Reorientation/Stabilization (report 182 §3/§4/§5, report 183)', async () => {
    const { getMorphogenesisOperationForCategory } = await import('@/lib/living-koral-morphogenesis-config/v1');
    expect(getMorphogenesisOperationForCategory('Strengthening')).toBe('increase_extent');
    expect(getMorphogenesisOperationForCategory('Weakening')).toBe('decrease_extent');
    expect(getMorphogenesisOperationForCategory('Reorientation')).toBe('reorient');
    expect(getMorphogenesisOperationForCategory('Stabilization')).toBe('stabilize');
  });

  it('getMorphogenesisOperationForCategory throws for the one remaining dormant category, Consolidation (Package B, later, still no live producer or mapping)', async () => {
    const { getMorphogenesisOperationForCategory } = await import('@/lib/living-koral-morphogenesis-config/v1');
    expect(() => getMorphogenesisOperationForCategory('Consolidation')).toThrow(/no live Morphogenesis Engine v1 operation mapping/);
  });

  it('engineVersion was bumped to morphogenesis-v1.1 — a real capability change (four categories dormant->live), not a fake pre-commit version bump', async () => {
    const { getMorphogenesisEngineVersion } = await import('@/lib/living-koral-morphogenesis-config/v1');
    expect(getMorphogenesisEngineVersion()).toBe('morphogenesis-v1.1');
  });

  it('the config carries all seven taxonomy categories (legal semantic input) — none silently dropped', async () => {
    const { getMorphogenesisOperationMappings } = await import('@/lib/living-koral-morphogenesis-config/v1');
    const categories = getMorphogenesisOperationMappings().map((m) => m.category).sort();
    expect(categories).toEqual(['Consolidation', 'Disappearance', 'Emergence', 'Reorientation', 'Stabilization', 'Strengthening', 'Weakening'].sort());
  });

  it('the config is deeply frozen — a mutation attempt throws, never silently succeeds', async () => {
    const { getMorphogenesisConfig } = await import('@/lib/living-koral-morphogenesis-config/v1');
    const config = getMorphogenesisConfig();
    expect(() => {
      // @ts-expect-error — deliberately attempting a forbidden mutation
      config.operationMappings.push({ category: 'Emergence', operation: 'add_element', notes: 'tampered' });
    }).toThrow();
    expect(() => {
      // @ts-expect-error — deliberately attempting a forbidden mutation
      config.engineVersion = 'tampered';
    }).toThrow();
  });
});

describe('KORA-WP-113 — exactly-once discipline: no direct write to either table outside the atomic RPC', () => {
  it('transformation-ledger-service.ts never calls .insert()/.update() against gov.living_koral_transformation_ledger or analytics.living_koral_state directly — only .rpc(\'record_living_koral_transformation\', ...)', () => {
    const code = codeOnly('lib/living-koral-transformation-ledger/transformation-ledger-service.ts');
    expect(code).not.toMatch(/from\('living_koral_transformation_ledger'\)\s*\.\s*insert/);
    expect(code).not.toMatch(/from\('living_koral_transformation_ledger'\)\s*\.\s*update/);
    expect(code).not.toMatch(/from\('living_koral_state'\)\s*\.\s*insert/);
    expect(code).not.toMatch(/from\('living_koral_state'\)\s*\.\s*update/);
    expect(code).toContain(`rpc('record_living_koral_transformation'`);
  });
});

describe('KORA-WP-113 — WP-114+ boundary (scoped to this WP\'s own files, not the whole repository)', () => {
  const OWNED_BY_LATER_WPS = [
    'living-koral-company-hub', // KORA-WP-114
    'analytics.living_koral_edition', // KORA-WP-115
    'KORAL Mark', // KORA-WP-115/117
    'Expression Mode', // KORA-WP-117
    'commons.post', // KORA-WP-118
    'Public KORAL', // KORA-WP-119
  ];

  for (const file of WP113_FILES) {
    it(`${file}: does not implement any KORA-WP-114+-owned persistence/service/UI concept`, () => {
      const code = codeOnly(file);
      for (const owned of OWNED_BY_LATER_WPS) {
        expect(code).not.toContain(owned);
      }
    });
  }

  it('no route, page, or component file is among THIS WP\'s own files (DB/domain-service only, no UI — this task\'s own §9/§10) — WP113_FILES itself never includes an app/ or components/ path', () => {
    for (const file of WP113_FILES) {
      expect(file.startsWith('app/')).toBe(false);
      expect(file.startsWith('components/')).toBe(false);
    }
  });

  // KORA-WP-114 (a later, separate, Founder-authorized WP) has since
  // legitimately created app/company/living-koral/page.tsx and
  // components/company/living-koral/ — this is expected and correct, not
  // a regression of this boundary. The original form of this test
  // asserted these paths did not exist AT ALL, which was a (correct, at
  // the time) proxy for "WP-113 itself built no UI" — updated here (not
  // left stale) the same way this file's own migration-ceiling guard
  // above was updated for KORA-WP-114's migration 083, and the same way
  // KORA-WP-112's own guard was previously updated by this WP for
  // migration 082. WP-113's own real boundary (no UI in WP113_FILES
  // itself) is unaffected and re-asserted above.
  it('app/api/admin/living-koral still does not exist — no admin route was ever assigned to WP-113/114 (still unassigned, pre-check 172 §15)', async () => {
    const { existsSync } = await import('node:fs');
    expect(existsSync('app/api/admin/living-koral')).toBe(false);
  });
});

describe('KORA-WP-113 — no visual/geometric field anywhere (structural state only, doc 132 Part 10)', () => {
  for (const file of WP113_FILES) {
    it(`${file}: no shape/color/geometry/SVG field or import`, () => {
      const code = codeOnly(file);
      expect(code).not.toMatch(/\bsvg\b|\bcanvas\b|\bcolor\b|\bgeometry\b|\bshape\b/i);
    });
  }
});

describe('KORA-WP-113 — Decision Spine boundary', () => {
  for (const file of WP113_FILES) {
    it(`${file}: imports nothing from the Decision Spine modules`, () => {
      expect(importLines(file)).not.toMatch(/lib\/commitment|lib\/evidence-plan|lib\/review\/|lib\/decision-pack/i);
    });
  }
});

describe('KORA-WP-113 — no duplicate Intelligence engine, no Prime-specific KORAL', () => {
  for (const file of WP113_FILES) {
    it(`${file}: imports nothing from methodology-config or any Prime-scoped module`, () => {
      const imports = importLines(file);
      expect(imports).not.toMatch(/methodology-config/i);
      expect(imports).not.toMatch(/flow-a-billing|program-funds|partner-payable|prime-settlement|prime-fee|\bcommission\b/i);
    });
  }
});

describe('KORA-WP-113 — no migration beyond 082 was introduced BY THIS WP (a later WP may legitimately raise the ceiling further)', () => {
  it('supabase/migrations/ ceiling is at least 082 (WP-113\'s own migration exists) — bumped to 083/084 by KORA-WP-114, to 085 by KORA-WP-115, to 086 by KORA-WP-116, to 087 by KORAL Morphology Package A (2026-09-19, narrow additive widening of THIS WP\'s own operation CHECK/RPC — not a new table), to 088 by the same Package A\'s own cardinality remediation (gov.living_koral_material_change, WP-112\'s own table, not this WP\'s own), later, unrelated migrations; this assertion\'s own intent is unaffected', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(88);
    expect(numbers).toContain(82);
  });
});

// ── Pure-function determinism/locality/reversal tests — no DB needed ──────

describe('KORA-WP-113 — replayLivingKoralStateFromLedger(): determinism, locality, order-independence', () => {
  it('is a pure function of its own input — same ledger array produces the same result every time', async () => {
    const { replayLivingKoralStateFromLedger } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const entry = { id: 'a', tenantId: 't1', materialChangeId: 'mc1', category: 'Emergence' as const, affectedDomain: 'initiative' as const, taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'v1', operation: 'add_element' as const, resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', recognizedAt: '2026-01-01T00:00:00Z', actorRole: 'SYSTEM' as const, actorId: 'x', createdAt: '2026-01-01T00:00:00Z' };
    const r1 = replayLivingKoralStateFromLedger([entry]);
    const r2 = replayLivingKoralStateFromLedger([entry]);
    expect(r1).toEqual(r2);
    expect(r1.regions.initiative.elementCount).toBe(1);
  });

  it('LOCALITY — a transformation updates only its own affected_domain\'s region, never the whole state', async () => {
    const { replayLivingKoralStateFromLedger } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const base = { id: 'a', tenantId: 't1', materialChangeId: 'mc1', category: 'Emergence' as const, taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'v1', operation: 'add_element' as const, resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', recognizedAt: '2026-01-01T00:00:00Z', actorRole: 'SYSTEM' as const, actorId: 'x', createdAt: '2026-01-01T00:00:00Z' };
    // affectedDomain is pinned to 'initiative' in the live schema, but this
    // pure function itself is domain-general — proven here with a second,
    // synthetic domain key to confirm it never conflates two regions.
    const result = replayLivingKoralStateFromLedger([
      { ...base, id: 'a', affectedDomain: 'initiative' },
      { ...base, id: 'b', affectedDomain: 'need_hypothesis' as unknown as 'initiative' },
    ]);
    expect(result.regions.initiative.elementCount).toBe(1);
    expect((result.regions as Record<string, { elementCount: number }>).need_hypothesis.elementCount).toBe(1);
  });

  it('REVERSAL — an add followed by a remove nets to zero, never negative, and both events remain represented in the fold', async () => {
    const { replayLivingKoralStateFromLedger } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const base = { tenantId: 't1', category: 'Emergence' as const, affectedDomain: 'initiative' as const, taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'v1', resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', actorRole: 'SYSTEM' as const, actorId: 'x', createdAt: '2026-01-01T00:00:00Z' };
    const result = replayLivingKoralStateFromLedger([
      { ...base, id: 'a', materialChangeId: 'mc1', operation: 'add_element', recognizedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'b', materialChangeId: 'mc2', operation: 'remove_element', recognizedAt: '2026-01-02T00:00:00Z' },
      { ...base, id: 'c', materialChangeId: 'mc3', operation: 'remove_element', recognizedAt: '2026-01-03T00:00:00Z' }, // one extra remove — must floor at 0, never go negative
    ]);
    expect(result.regions.initiative.elementCount).toBe(0);
    expect(result.revision).toBe(3); // all three events counted, even the floored one — never silently dropped
  });

  it('KORAL Morphology Package A — increase_extent/decrease_extent/reorient/stabilize are ZERO-DELTA to regions/elementCount (they change extent/direction/stability, never presence/count) but still counted toward revision (report 183 §4 — this is the exact fix for the delta bug this task also found and corrected)', async () => {
    const { replayLivingKoralStateFromLedger } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const base = { tenantId: 't1', affectedDomain: 'initiative' as const, taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'morphogenesis-v1.1', resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', actorRole: 'SYSTEM' as const, actorId: 'x', createdAt: '2026-01-01T00:00:00Z' };
    const result = replayLivingKoralStateFromLedger([
      { ...base, id: 'a', materialChangeId: 'mc1', category: 'Emergence', operation: 'add_element', recognizedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'b', materialChangeId: 'mc2', category: 'Strengthening', operation: 'increase_extent', recognizedAt: '2026-01-02T00:00:00Z' },
      { ...base, id: 'c', materialChangeId: 'mc3', category: 'Weakening', operation: 'decrease_extent', recognizedAt: '2026-01-03T00:00:00Z' },
      { ...base, id: 'd', materialChangeId: 'mc4', category: 'Reorientation', operation: 'reorient', recognizedAt: '2026-01-04T00:00:00Z' },
      { ...base, id: 'e', materialChangeId: 'mc5', category: 'Stabilization', operation: 'stabilize', recognizedAt: '2026-01-05T00:00:00Z' },
    ]);
    expect(result.regions.initiative.elementCount).toBe(1); // only the add_element affected the count — the four Package-A ops did not touch it at all
    expect(result.revision).toBe(5); // every event still counted toward revision — none silently dropped
  });

  it('REPLAY ORDER — folds in recognized_at order regardless of input array order (Company-local canonical order, pre-check 170 §7)', async () => {
    const { replayLivingKoralStateFromLedger } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');
    const base = { tenantId: 't1', category: 'Emergence' as const, affectedDomain: 'initiative' as const, taxonomyConfigVersion: '1.0', morphogenesisEngineVersion: 'v1', resultingStateRevision: 1, occurredAt: '2026-01-01T00:00:00Z', actorRole: 'SYSTEM' as const, actorId: 'x', createdAt: '2026-01-01T00:00:00Z' };
    const inOrder = replayLivingKoralStateFromLedger([
      { ...base, id: 'a', materialChangeId: 'mc1', operation: 'add_element', recognizedAt: '2026-01-01T00:00:00Z' },
      { ...base, id: 'b', materialChangeId: 'mc2', operation: 'remove_element', recognizedAt: '2026-01-02T00:00:00Z' },
    ]);
    const shuffled = replayLivingKoralStateFromLedger([
      { ...base, id: 'b', materialChangeId: 'mc2', operation: 'remove_element', recognizedAt: '2026-01-02T00:00:00Z' },
      { ...base, id: 'a', materialChangeId: 'mc1', operation: 'add_element', recognizedAt: '2026-01-01T00:00:00Z' },
    ]);
    expect(shuffled).toEqual(inOrder);
  });
});

// ── Real-DB-gated section — matches KORA-WP-112's own established
// service-layer real-DB testing convention exactly. ────────────────────────

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

const KNOWN_NON_THROWAWAY_PROJECT_REFS = ['azdnepfmwrmacruykskm', 'haqflkurpmeaxpikozjl'];
const ALLOWED_LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1'];

function assertLocalOnly(varName: string, url: string): void {
  const lower = url.toLowerCase();
  for (const ref of KNOWN_NON_THROWAWAY_PROJECT_REFS) {
    if (lower.includes(ref)) throw new Error(`${varName} matches a known staging/production project ref — refusing to proceed.`);
  }
  if (lower.includes('supabase.co') || lower.includes('supabase.com')) throw new Error(`${varName} points at a hosted Supabase domain — refusing to proceed.`);
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error(`${varName} is not a valid URL — refusing to proceed.`);
  }
  if (!ALLOWED_LOCAL_HOSTS.includes(hostname)) throw new Error(`${varName} host "${hostname}" is not local — refusing to proceed.`);
}

const pgUrl = readEnv('WP113_PG_URL');
const supabaseUrl = readEnv('WP113_SUPABASE_URL');
const serviceRoleKey = readEnv('WP113_SERVICE_ROLE_KEY');
const allowed = readEnv('WP113_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

describe('WP-113 guard — every *_URL env var (if set) must be local-only', () => {
  it('WP113_PG_URL / WP113_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP113_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP113_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE = `WP113-FIXTURE-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('KORA-WP-113 — real service-layer proof (local Supabase)', () => {
  let pgClient: InstanceType<typeof Client>;

  it('setup: tenant fixture + exactly-once/atomicity/concurrency/provenance/replay end-to-end proof', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    assertLocalOnly('WP113_PG_URL', pgUrl);
    assertLocalOnly('WP113_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE, 'WP-113 Real-DB Fixture Tenant'],
    );
    const tenantId = tenant.rows[0].id;

    async function insertRecognizedMaterialChange(category: string): Promise<string> {
      const ins = await pgClient.query<{ id: string }>(
        `INSERT INTO gov.living_koral_material_change (tenant_id, status, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
         VALUES ($1, 'CANDIDATE', $2, 'initiative', 'initiative', gen_random_uuid(), now(), 'WP-113 fixture', '1.0', 'SYSTEM', 'wp113-fixture') RETURNING id`,
        [tenantId, category],
      );
      const id = ins.rows[0].id;
      await pgClient.query(`UPDATE gov.living_koral_material_change SET status='RECOGNIZED', recognized_at=now(), recognition_source='kora-automatic' WHERE id=$1`, [id]);
      return id;
    }

    const {
      recordLivingKoralTransformation, getCurrentLivingKoralState, listTransformationLedgerForTenant, replayLivingKoralStateFromLedger,
    } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');

    // 1. NEGATIVE — CANDIDATE cannot transform.
    const candidateOnlyIns = await pgClient.query<{ id: string }>(
      `INSERT INTO gov.living_koral_material_change (tenant_id, status, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
       VALUES ($1, 'CANDIDATE', 'Emergence', 'initiative', 'initiative', gen_random_uuid(), now(), 'stays candidate', '1.0', 'SYSTEM', 'wp113-fixture') RETURNING id`,
      [tenantId],
    );
    await expect(recordLivingKoralTransformation({ materialChangeId: candidateOnlyIns.rows[0].id, tenantId })).rejects.toThrow(/kora\/not-recognized/);

    // 2. First-time success — exactly-once, first leg.
    const mc1 = await insertRecognizedMaterialChange('Emergence');
    const r1 = await recordLivingKoralTransformation({ materialChangeId: mc1, tenantId });
    expect(r1.created).toBe(true);
    expect(r1.resultingStateRevision).toBe(1);

    // 3. RETRY — exactly-once, second leg: a duplicate invocation for the
    //    SAME Material Change is a safe no-op, never a second effective
    //    transformation (this task's own §5).
    const r1retry = await recordLivingKoralTransformation({ materialChangeId: mc1, tenantId });
    expect(r1retry.created).toBe(false);
    expect(r1retry.ledgerId).toBe(r1.ledgerId);
    expect(r1retry.resultingStateRevision).toBe(1); // unchanged — state was NOT re-advanced

    // 4. A second, real, distinct RECOGNIZED event advances state further.
    const mc2 = await insertRecognizedMaterialChange('Disappearance');
    const r2 = await recordLivingKoralTransformation({ materialChangeId: mc2, tenantId });
    expect(r2.created).toBe(true);
    expect(r2.resultingStateRevision).toBe(2);

    // 5. CURRENT STATE reflects both — add then remove nets to zero.
    const state = await getCurrentLivingKoralState(tenantId);
    expect(state?.revision).toBe(2);
    expect(state?.regions.initiative.elementCount).toBe(0);
    expect(state?.updatedFromLedgerId).toBe(r2.ledgerId);

    // 6. PROVENANCE — the ledger row is recoverable and traces back to its
    //    own Material Change (this task's own §9 provenance chain).
    const ledger = await listTransformationLedgerForTenant(tenantId);
    expect(ledger).toHaveLength(2);
    expect(ledger.map((l) => l.materialChangeId).sort()).toEqual([mc1, mc2].sort());

    // 7. REPLAY / DETERMINISM — reconstructing state purely from the
    //    ledger's own history exactly matches the live current-state row
    //    (Registry 142's own Acceptance criterion, proven directly).
    const replay = replayLivingKoralStateFromLedger(ledger);
    expect(replay.revision).toBe(state?.revision);
    expect(replay.regions.initiative.elementCount).toBe(state?.regions.initiative.elementCount);

    // 8. CONCURRENCY — two DIFFERENT, genuinely concurrent RECOGNIZED
    //    events for the SAME tenant must not lose an update (this task's
    //    own §6/§14.G — a real concurrency test, not a mock).
    const mc3 = await insertRecognizedMaterialChange('Emergence');
    const mc4 = await insertRecognizedMaterialChange('Emergence');
    const [c1, c2] = await Promise.all([
      recordLivingKoralTransformation({ materialChangeId: mc3, tenantId }),
      recordLivingKoralTransformation({ materialChangeId: mc4, tenantId }),
    ]);
    expect(c1.created).toBe(true);
    expect(c2.created).toBe(true);
    expect(new Set([c1.resultingStateRevision, c2.resultingStateRevision]).size).toBe(2); // no lost update — distinct revisions
    const stateAfterConcurrency = await getCurrentLivingKoralState(tenantId);
    expect(stateAfterConcurrency?.revision).toBe(4);
    expect(stateAfterConcurrency?.regions.initiative.elementCount).toBe(2); // both adds landed

    // 9. NEGATIVE — Consolidation is now the ONE remaining dormant category
    //    (KORAL Morphology Package A, 2026-09-19, widened Strengthening/
    //    Weakening/Reorientation/Stabilization to live) — no live producer
    //    exists for it, so no RECOGNIZED row of that category can even
    //    exist to test the RPC against in a realistic way; the
    //    config-level rejection is already proven above without a DB.
    //    Confirmed here that the RPC's own independent CHECK constraint
    //    agrees (defense in depth): a direct SQL call with an arbitrary,
    //    never-configured operation string is still rejected, regardless
    //    of category.
    const dormantMc = await insertRecognizedMaterialChange('Consolidation');
    await expect(
      pgClient.query(`SELECT * FROM gov.record_living_koral_transformation($1, 'fuse_a_lot', 'morphogenesis-v1.1')`, [dormantMc]),
    ).rejects.toThrow(/kora\/invalid-operation/);

    // 10. KORAL MORPHOLOGY PACKAGE A — POSITIVE proof: migration 087's own
    //     widened RPC accepts all four new operations, advances revision
    //     each time, and leaves `regions`/elementCount COMPLETELY
    //     unchanged (report 183 §4/§6 — these operations change extent/
    //     direction/stability, never presence/count).
    const stateBeforePackageA = await getCurrentLivingKoralState(tenantId);
    const revisionBeforePackageA = stateBeforePackageA!.revision;
    const countBeforePackageA = stateBeforePackageA!.regions.initiative.elementCount;

    const strengtheningMc = await insertRecognizedMaterialChange('Strengthening');
    const rStrengthen = await recordLivingKoralTransformation({ materialChangeId: strengtheningMc, tenantId });
    expect(rStrengthen.created).toBe(true);
    expect(rStrengthen.resultingStateRevision).toBe(revisionBeforePackageA + 1);

    const weakeningMc = await insertRecognizedMaterialChange('Weakening');
    const rWeaken = await recordLivingKoralTransformation({ materialChangeId: weakeningMc, tenantId });
    expect(rWeaken.created).toBe(true);
    expect(rWeaken.resultingStateRevision).toBe(revisionBeforePackageA + 2);

    const reorientationMc = await insertRecognizedMaterialChange('Reorientation');
    const rReorient = await recordLivingKoralTransformation({ materialChangeId: reorientationMc, tenantId });
    expect(rReorient.created).toBe(true);
    expect(rReorient.resultingStateRevision).toBe(revisionBeforePackageA + 3);

    const stabilizationMc = await insertRecognizedMaterialChange('Stabilization');
    const rStabilize = await recordLivingKoralTransformation({ materialChangeId: stabilizationMc, tenantId });
    expect(rStabilize.created).toBe(true);
    expect(rStabilize.resultingStateRevision).toBe(revisionBeforePackageA + 4);

    const stateAfterPackageA = await getCurrentLivingKoralState(tenantId);
    expect(stateAfterPackageA?.revision).toBe(revisionBeforePackageA + 4); // revision advanced for every one of the four
    expect(stateAfterPackageA?.regions.initiative.elementCount).toBe(countBeforePackageA); // element_count completely untouched by any of the four

    // 11. RETRY of a Package-A operation remains exactly-once, identically
    //     to add_element/remove_element (this task's own §requirement:
    //     "same Material Change affects state exactly once").
    const rStrengthenRetry = await recordLivingKoralTransformation({ materialChangeId: strengtheningMc, tenantId });
    expect(rStrengthenRetry.created).toBe(false);
    expect(rStrengthenRetry.resultingStateRevision).toBe(rStrengthen.resultingStateRevision);

    await pgClient.end();
  }, 30_000);

  it('FIRST-STATE CONCURRENCY — two genuinely concurrent FIRST transformations for a brand-new Company (analytics.living_koral_state row ABSENT before either transaction starts) do not race', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    const client = new Client({ connectionString: pgUrl });
    await client.connect();

    const tenantCode = `WP113-FIRSTSTATE-${RUN_SUFFIX_HEX}-${Math.random().toString(16).slice(2, 8)}`;
    const tenant = await client.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [tenantCode, 'WP-113 First-State Concurrency Fixture Tenant'],
    );
    const tenantId = tenant.rows[0].id;

    // Confirmed ABSENT — no analytics.living_koral_state row exists for
    // this tenant at all before either concurrent transaction starts. A
    // SELECT ... FOR UPDATE alone would not serialize two concurrent
    // first-writers against a row that does not yet exist; the real
    // serialization point is the RPC's own leading
    // `INSERT ... ON CONFLICT (tenant_id) DO NOTHING` — Postgres's
    // documented behavior for ON CONFLICT is to wait for a concurrent,
    // not-yet-committed conflicting insert to resolve (commit or abort)
    // before re-evaluating the conflict, which is what actually serializes
    // the two competing first-writers here, before either ever reaches its
    // own SELECT ... FOR UPDATE line.
    const before = await client.query(`SELECT 1 FROM analytics.living_koral_state WHERE tenant_id = $1`, [tenantId]);
    expect(before.rows).toHaveLength(0);

    async function insertRecognizedMaterialChange(category: string): Promise<string> {
      const ins = await client.query<{ id: string }>(
        `INSERT INTO gov.living_koral_material_change (tenant_id, status, category, affected_domain, source_entity_type, source_entity_id, occurred_at, provenance, taxonomy_config_version, actor_role, actor_id)
         VALUES ($1, 'CANDIDATE', $2, 'initiative', 'initiative', gen_random_uuid(), now(), 'WP-113 first-state fixture', '1.0', 'SYSTEM', 'wp113-fixture') RETURNING id`,
        [tenantId, category],
      );
      const id = ins.rows[0].id;
      await client.query(`UPDATE gov.living_koral_material_change SET status='RECOGNIZED', recognized_at=now(), recognition_source='kora-automatic' WHERE id=$1`, [id]);
      return id;
    }

    const mcA = await insertRecognizedMaterialChange('Emergence');
    const mcB = await insertRecognizedMaterialChange('Emergence');

    const { recordLivingKoralTransformation, getCurrentLivingKoralState } = await import('@/lib/living-koral-transformation-ledger/transformation-ledger-service');

    const [resultA, resultB] = await Promise.all([
      recordLivingKoralTransformation({ materialChangeId: mcA, tenantId }),
      recordLivingKoralTransformation({ materialChangeId: mcB, tenantId }),
    ]);

    // Exactly one stable Company identity/current-state row — no duplicate
    // genesis row was ever created by the losing side of the race.
    const stateRows = await client.query(`SELECT id FROM analytics.living_koral_state WHERE tenant_id = $1`, [tenantId]);
    expect(stateRows.rows).toHaveLength(1);

    // Both transformations succeeded, each got its own distinct monotonic
    // revision — no lost update.
    expect(resultA.created).toBe(true);
    expect(resultB.created).toBe(true);
    expect(new Set([resultA.resultingStateRevision, resultB.resultingStateRevision])).toEqual(new Set([1, 2]));

    // Exactly two Ledger transformations exist for this tenant.
    const ledgerRows = await client.query(`SELECT id FROM gov.living_koral_transformation_ledger WHERE tenant_id = $1`, [tenantId]);
    expect(ledgerRows.rows).toHaveLength(2);

    // Final state contains both transformations — nothing silently dropped.
    const finalState = await getCurrentLivingKoralState(tenantId);
    expect(finalState?.revision).toBe(2);
    expect(finalState?.regions.initiative.elementCount).toBe(2);

    // Retry remains idempotent even after the race resolved.
    const retryA = await recordLivingKoralTransformation({ materialChangeId: mcA, tenantId });
    expect(retryA.created).toBe(false);
    expect(retryA.resultingStateRevision).toBe(resultA.resultingStateRevision);

    await client.end();
  }, 30_000);
});
