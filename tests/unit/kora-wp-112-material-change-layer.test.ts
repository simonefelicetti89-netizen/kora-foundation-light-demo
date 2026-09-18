// tests/unit/kora-wp-112-material-change-layer.test.ts
// KORA-WP-112 — Material Change Layer + Initiative Domain Adapter (Candidate-Only).
//
// Two parts: (1) always-on structural guards (taxonomy consumption,
// WP-113+ boundary, Decision Spine/Intelligence absence — no DB needed);
// (2) an env-var-gated real-DB section proving the actual candidate-
// creation/recognition/idempotency behavior through the real TypeScript
// service functions against a local disposable Supabase stack — matching
// KORA-WP-045's own established real-service-layer testing convention
// (this WP's own service calls getSupabaseServiceClient(), which needs
// the full local API stack, not only raw Postgres — the same reason
// KORA-WP-045's own scenario test needed WP045_SUPABASE_URL alongside
// WP045_PG_URL).

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Client } = pg;

const WP112_FILES = [
  'lib/living-koral-material-change/types.ts',
  'lib/living-koral-material-change/material-change-service.ts',
  'lib/living-koral-material-change/initiative-adapter.ts',
];

function readWp112File(rel: string): string {
  return readFileSync(rel, 'utf-8');
}

function codeOnly(rel: string): string {
  return readWp112File(rel).split('\n').filter((l) => !/^\s*\/\//.test(l) && !/^\s*\*/.test(l) && !/^\s*\/\*/.test(l)).join('\n');
}

function importLines(rel: string): string {
  return readWp112File(rel).split('\n').filter((l) => /^\s*import\b/.test(l)).join('\n');
}

describe('KORA-WP-112 — consumes KORA-WP-111\'s own config, never redefines it', () => {
  for (const file of WP112_FILES) {
    it(`${file}: no hardcoded 7-way taxonomy category union (must import from lib/living-koral-config, never redeclare)`, () => {
      const TAXONOMY_UNION_LITERAL = "'Emergence' | 'Disappearance' | 'Strengthening' | 'Weakening' | 'Consolidation' | 'Reorientation' | 'Stabilization'";
      expect(codeOnly(file)).not.toContain(TAXONOMY_UNION_LITERAL);
    });
  }

  it('material-change-service.ts imports getMaterialChangeTaxonomy from KORA-WP-111\'s own config module', () => {
    expect(importLines('lib/living-koral-material-change/material-change-service.ts')).toMatch(/living-koral-config\/v1/);
  });

  it('initiative-adapter.ts consumes getOrganizationChangedVsKoraLearnedFramework (the six-way, "only A justifies" rule) rather than hardcoding it', () => {
    const src = codeOnly('lib/living-koral-material-change/initiative-adapter.ts');
    expect(src).toContain('getOrganizationChangedVsKoraLearnedFramework');
    expect(src).not.toMatch(/justifiesMaterialChange\s*[:=]\s*true[\s\S]*Emergence|Emergence[\s\S]*justifiesMaterialChange\s*[:=]\s*true/);
  });
});

describe('KORA-WP-112 — no REJECTED/EXPIRED/DISMISSED/ARCHIVED lifecycle state (Founder decision — none is canonically defined)', () => {
  it('LIVING_KORAL_MATERIAL_CHANGE_STATUSES contains exactly CANDIDATE, RECOGNIZED, SUPERSEDED', async () => {
    const { LIVING_KORAL_MATERIAL_CHANGE_STATUSES } = await import('@/lib/living-koral-material-change/types');
    expect([...LIVING_KORAL_MATERIAL_CHANGE_STATUSES].sort()).toEqual(['CANDIDATE', 'RECOGNIZED', 'SUPERSEDED']);
  });

  for (const file of WP112_FILES) {
    it(`${file}: no REJECTED/EXPIRED/DISMISSED/ARCHIVED status literal anywhere`, () => {
      const code = codeOnly(file);
      for (const forbidden of ['REJECTED', 'EXPIRED', 'DISMISSED', 'ARCHIVED']) {
        expect(code).not.toContain(`'${forbidden}'`);
      }
    });
  }
});

describe('KORA-WP-112 — WP-113+ boundary (scoped to this WP\'s own files, not the whole repository)', () => {
  const OWNED_BY_LATER_WPS = [
    'gov.living_koral_transformation_ledger', // KORA-WP-113
    'analytics.living_koral_state', // KORA-WP-113
    'Morphogenesis Engine', // KORA-WP-113
    'Continuity Contract', // KORA-WP-113
    'analytics.living_koral_edition', // KORA-WP-115
    'commons.post', // KORA-WP-118
  ];

  for (const file of WP112_FILES) {
    it(`${file}: does not implement any KORA-WP-113+-owned persistence/service/UI concept`, () => {
      const code = codeOnly(file);
      for (const owned of OWNED_BY_LATER_WPS) {
        expect(code).not.toContain(owned);
      }
    });
  }
});

describe('KORA-WP-112 — Decision Spine boundary (no automatic recognition from Commitment/Evidence Plan/Review/Decision Pack)', () => {
  for (const file of WP112_FILES) {
    it(`${file}: imports nothing from the Decision Spine modules`, () => {
      const imports = importLines(file);
      expect(imports).not.toMatch(/lib\/commitment|lib\/evidence-plan|lib\/review\/|lib\/decision-pack/i);
    });
  }
});

describe('KORA-WP-112 — no duplicate Intelligence engine, no Prime-specific KORAL (by absence, mirroring KORA-WP-042\'s own guard)', () => {
  for (const file of WP112_FILES) {
    it(`${file}: imports nothing from methodology-config or any Prime-scoped module`, () => {
      const imports = importLines(file);
      expect(imports).not.toMatch(/methodology-config/i);
      expect(imports).not.toMatch(/flow-a-billing|program-funds|partner-payable|prime-settlement|prime-fee|\bcommission\b/i);
    });
  }
});

describe('KORA-WP-112 — reuses the existing governance_event substrate, never a second audit system', () => {
  it('material-change-service.ts imports recordGovernanceEvent from the existing lib/audit module', () => {
    expect(importLines('lib/living-koral-material-change/material-change-service.ts')).toMatch(/lib\/audit\/governance-event/);
  });

  it('no new audit/governance table or function is introduced anywhere in this WP\'s own files', () => {
    for (const file of WP112_FILES) {
      expect(codeOnly(file)).not.toMatch(/CREATE TABLE|audit\.(?!governance_event)/i);
    }
  });
});

describe('KORA-WP-112 — no migration beyond 081 was introduced BY THIS WP (a later WP may legitimately raise the ceiling further)', () => {
  it('supabase/migrations/ ceiling is at least 081 (WP-112\'s own migration exists) — bumped to 082 by KORA-WP-113, then to 083/084 by KORA-WP-114, then to 085 by KORA-WP-115, all later, unrelated WPs/increments; this assertion\'s own intent is unaffected', async () => {
    const { readdirSync } = await import('node:fs');
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(Math.max(...numbers)).toBe(85);
    expect(numbers).toContain(81);
  });
});

// ── Real-DB-gated section — matches KORA-WP-045's own established
// service-layer real-DB testing convention exactly (env-var-gated,
// static local-only guard, full local Supabase stack required since the
// real service functions use getSupabaseServiceClient()). ────────────────

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

const pgUrl = readEnv('WP112_PG_URL');
const supabaseUrl = readEnv('WP112_SUPABASE_URL');
const serviceRoleKey = readEnv('WP112_SERVICE_ROLE_KEY');
const allowed = readEnv('WP112_ALLOW_RUN') === 'true';
const ready = Boolean(pgUrl && supabaseUrl && serviceRoleKey && allowed);

describe('WP-112 guard — every *_URL env var (if set) must be local-only', () => {
  it('WP112_PG_URL / WP112_SUPABASE_URL are either unset or local-only', () => {
    if (pgUrl) expect(() => assertLocalOnly('WP112_PG_URL', pgUrl)).not.toThrow();
    if (supabaseUrl) expect(() => assertLocalOnly('WP112_SUPABASE_URL', supabaseUrl)).not.toThrow();
  });
});

const RUN_SUFFIX_HEX = `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 8)}`.padEnd(12, '0').slice(0, 12);
const TENANT_CODE = `WP112-FIXTURE-${RUN_SUFFIX_HEX}`;
const INITIATIVE_AUTH_UID = `00000000-0000-4000-8000-${RUN_SUFFIX_HEX}`;

describe.skipIf(!ready)('KORA-WP-112 — real service-layer proof (local Supabase)', () => {
  let pgClient: InstanceType<typeof Client>;
  let tenantId: string;

  it('setup: tenant + initiative fixtures + full end-to-end candidate/recognition/idempotency proof', async () => {
    if (!pgUrl || !supabaseUrl || !serviceRoleKey) throw new Error('unreachable: only runs when ready');
    assertLocalOnly('WP112_PG_URL', pgUrl);
    assertLocalOnly('WP112_SUPABASE_URL', supabaseUrl);
    process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey;

    pgClient = new Client({ connectionString: pgUrl });
    await pgClient.connect();

    const tenant = await pgClient.query<{ id: string }>(
      `INSERT INTO analytics.tenant (tenant_code, company_name, tenant_kind) VALUES ($1, $2, 'TEST') RETURNING id`,
      [TENANT_CODE, 'WP-112 Real-DB Fixture Tenant'],
    );
    tenantId = tenant.rows[0].id;

    const initiative = await pgClient.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, eligibility_class, status)
       VALUES ($1, 'WP-112 fixture initiative', 'GROWTH', 'eligible', 'draft') RETURNING id`,
      [tenantId],
    );
    const initiativeId = initiative.rows[0].id;

    const { observeInitiativeTransition } = await import('@/lib/living-koral-material-change/initiative-adapter');

    // 1. Ineligible transition (draft -> draft, i.e. no real change) produces NO candidate.
    const noop = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'draft', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(noop).toBeNull();

    // 2. Emergence: draft -> published, real record already at 'published'
    //    (matches the DB fixture below) — the re-verification passes and
    //    the candidate is immediately RECOGNIZED (discrete category, no
    //    hysteresis, doc 129 Part 24).
    await pgClient.query(`UPDATE personal.worker_initiative SET status = 'published' WHERE id = $1`, [initiativeId]);
    const emergence = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'published', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(emergence).not.toBeNull();
    expect(emergence?.category).toBe('Emergence');
    expect(emergence?.status).toBe('RECOGNIZED');
    expect(emergence?.recognitionSource).toBe('kora-automatic');
    expect(emergence?.taxonomyConfigVersion).toBe('1.0');

    // 3. Idempotency: re-observing the SAME transition is a safe no-op —
    //    returns the SAME row, never a duplicate.
    const emergenceAgain = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'draft', newStatus: 'published', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(emergenceAgain?.id).toBe(emergence?.id);

    // 4. Disappearance: published -> closed.
    await pgClient.query(`UPDATE personal.worker_initiative SET status = 'closed' WHERE id = $1`, [initiativeId]);
    const disappearance = await observeInitiativeTransition({
      tenantId, initiativeId, previousStatus: 'published', newStatus: 'closed', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    expect(disappearance?.category).toBe('Disappearance');
    expect(disappearance?.status).toBe('RECOGNIZED');

    // 5. Governance event provenance — confirms the recognition promotion
    //    emitted a real governance_event (registry 142's own explicit
    //    Audit field requirement).
    const govEvents = await pgClient.query(
      `SELECT event_type FROM audit.governance_event WHERE object_id = $1 AND event_type = 'material_change.recognized'`,
      [emergence?.id],
    );
    expect(govEvents.rows.length).toBeGreaterThan(0);

    // 6. Real-DB assessment failure case: create a candidate whose real
    //    source record does NOT confirm the claimed transition (an
    //    invalid re-verification input) — must remain CANDIDATE, never
    //    RECOGNIZED, never REJECTED (no such state exists).
    const initiative2 = await pgClient.query<{ id: string }>(
      `INSERT INTO personal.worker_initiative (tenant_id, title, pillar, eligibility_class, status)
       VALUES ($1, 'WP-112 fixture initiative 2 (stays draft)', 'GROWTH', 'eligible', 'draft') RETURNING id`,
      [tenantId],
    );
    const { createMaterialChangeCandidate, assessMaterialChangeCandidate } = await import('@/lib/living-koral-material-change/material-change-service');
    const staleCandidate = await createMaterialChangeCandidate({
      tenantId, category: 'Emergence', affectedDomain: 'initiative', sourceEntityType: 'initiative',
      sourceEntityId: initiative2.rows[0].id, occurredAt: new Date().toISOString(),
      provenance: 'claims published but the real record never actually transitioned', actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
    });
    const staleResult = await assessMaterialChangeCandidate({
      candidateId: staleCandidate.id, tenantId, actorRole: 'KORA_ADMIN', actorId: INITIATIVE_AUTH_UID,
      reverifyAgainstSource: async () => false, // the real record never actually confirms it
    });
    expect(staleResult?.status).toBe('CANDIDATE'); // never promoted, never a REJECTED state

    await pgClient.end();
  }, 30_000);
});
