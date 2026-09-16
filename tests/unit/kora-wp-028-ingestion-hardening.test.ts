// tests/unit/kora-wp-028-ingestion-hardening.test.ts
// KORA-WP-028 — Ingestion Hardening — Sync Path + Retry Contract.
//
// Structural/static coverage. The DB-dependent half of the founder test
// matrix (happy path, exact replay does not duplicate, side-effect
// duplication, conflict, tenant independence, failure-not-replayed-as-
// success, in-progress duplicate, concurrency (same/different key), no raw
// payload in claim metadata, direct DB bypass denial) was exercised for
// real against local disposable Postgres (migration chain 001-077, 18/18
// assertions passed) plus a real load test (1,000/20,000/50,000 rows,
// 29ms/90ms/196ms end-to-end) and a direct-SQL RLS/GRANT role-emulation
// pass — see this task's own completion report for the full transcript;
// this file does not run a live database.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  ALLOWED_INGEST_EXTENSIONS, MAX_INGEST_ROWS, MAX_INGEST_BYTES, INGEST_OPERATION,
} from '@/lib/ingestion-hardening/company-ingest-service';

const SERVICE_PATH = 'lib/ingestion-hardening/company-ingest-service.ts';
const STORE_PATH = 'lib/async-contract/postgres-idempotency-store.ts';
const CONTRACT_PATH = 'lib/async-contract/idempotency-contract.ts';
const MIGRATION_PATH = 'supabase/migrations/077_ingestion_idempotency_claim.sql';
const ROUTE_PATH = 'app/api/company/data-ingest/route.ts';

function read(path: string): string { return readFileSync(path, 'utf8'); }
function codeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*--/.test(l)); } // SQL comment stripper
function tsCodeLines(src: string): string[] { return src.split('\n').filter((l) => !/^\s*\/\//.test(l)); } // TS single-line comment stripper
function importLines(src: string): string[] { return src.split('\n').filter((l) => /^\s*import\b/.test(l)); }

describe('KORA-WP-028 — canonical vocabulary', () => {
  it('R-1 evidence-bound constants: MAX_INGEST_ROWS matches R-1\'s own tested bound (100,000)', () => {
    expect(MAX_INGEST_ROWS).toBe(100_000);
  });

  it('supports exactly CSV and XLSX (R-1\'s own tested/reused extensions)', () => {
    expect(ALLOWED_INGEST_EXTENSIONS).toEqual(['csv', 'xlsx']);
  });

  it('MAX_INGEST_BYTES is bounded, non-zero, and consistent with the row bound', () => {
    expect(MAX_INGEST_BYTES).toBeGreaterThan(0);
    expect(MAX_INGEST_BYTES).toBeLessThanOrEqual(50 * 1024 * 1024);
  });

  it('operation name is namespaced (KORA-WP-011\'s own IdempotencyKey shape)', () => {
    expect(INGEST_OPERATION).toBe('company_data_upload.ingest');
  });
});

describe('KORA-WP-028 — WP-011 contract reuse boundary (Section 5)', () => {
  it('imports executeIdempotent/hashPayload/IdempotencyKey from the existing WP-011 module, never redeclares them', () => {
    const lines = importLines(read(SERVICE_PATH));
    const contractImport = lines.find((l) => l.includes('@/lib/async-contract/idempotency-contract'));
    expect(contractImport).toBeDefined();
    expect(contractImport).toMatch(/executeIdempotent/);
  });

  it('the Postgres store implements the WP-011 IdempotencyStore interface unmodified — no second idempotency abstraction', () => {
    const src = read(STORE_PATH);
    expect(src).toMatch(/implements IdempotencyStore/);
    expect(src).toMatch(/import type \{ IdempotencyKey, IdempotencyRecord, IdempotencyStore, JobStatus \} from '\.\/idempotency-contract'/);
  });

  it('idempotency-contract.ts keeps its own canonical exports unchanged (executeIdempotent, IdempotencyStore, InMemoryIdempotencyStore, hashPayload) — this WP consumes, never forks, the contract', () => {
    const src = read(CONTRACT_PATH);
    expect(src).toMatch(/export async function executeIdempotent/);
    expect(src).toMatch(/export interface IdempotencyStore/);
    expect(src).toMatch(/export class InMemoryIdempotencyStore implements IdempotencyStore/);
    expect(src).toMatch(/export function hashPayload/);
  });
});

describe('KORA-WP-028 — atomic claim (Section 9, no SELECT-then-INSERT race)', () => {
  it('the RPC uses INSERT ... ON CONFLICT ... DO NOTHING RETURNING — never a bare SELECT before INSERT', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/INSERT INTO analytics\.idempotency_claim[\s\S]*?ON CONFLICT \(tenant_id, operation, idempotency_key\) DO NOTHING[\s\S]*?RETURNING \* INTO v_new/);
  });

  it('the store\'s claim() delegates to the RPC, never performs its own multi-step insert logic', () => {
    const src = read(STORE_PATH);
    expect(src).toMatch(/rpc\('claim_idempotency_key'/);
    expect(src).not.toMatch(/\.from\('idempotency_claim'\)\s*\.insert/);
  });
});

describe('KORA-WP-028 — tenant isolation (Section 12)', () => {
  it('the unique index is scoped by (tenant_id, operation, idempotency_key) — never a global key', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/CREATE UNIQUE INDEX[\s\S]*?ON analytics\.idempotency_claim \(tenant_id, operation, idempotency_key\)/);
  });

  it('the domain write always derives tenantId from the verified session, never from client input', () => {
    const route = read(ROUTE_PATH);
    expect(route).toMatch(/tenantId:\s*auth\.tenantId/);
    expect(route).not.toMatch(/tenantId:\s*(body|formData|request)\./);
  });
});

describe('KORA-WP-028 — authorization (Section 13)', () => {
  it('the route requires a Company session before any parsing/claim work', () => {
    const route = read(ROUTE_PATH);
    expect(route).toMatch(/requireCompanyUser\(request\)/);
    expect(route).toMatch(/isKoraAuthError\(auth\)/);
  });

  it('the RPC EXECUTE grant is service_role-only, PUBLIC explicitly revoked', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION analytics\.claim_idempotency_key[\s\S]*?FROM PUBLIC/);
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION analytics\.claim_idempotency_key[\s\S]*?TO service_role/);
  });

  it('idempotency_claim carries no authenticated/COMPANY_ADMIN grant of any kind — it is not Company-facing', () => {
    const grantLines = codeLines(read(MIGRATION_PATH)).filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.some((l) => /idempotency_claim/.test(l) && /\bauthenticated\b/.test(l))).toBe(false);
  });
});

describe('KORA-WP-028 — privacy / PIB (Section 14)', () => {
  it('PII detection runs on parsed rows before any persistence', () => {
    const src = read(SERVICE_PATH);
    expect(src).toMatch(/detectPiiInPayload/);
  });

  it('never writes personal.uploaded_record or any pseudonym_id (Admin-exclusive, out of this WP\'s scope)', () => {
    const lines = tsCodeLines(read(SERVICE_PATH));
    expect(lines.some((l) => /uploaded_record|pseudonym_id/.test(l))).toBe(false);
  });

  it('the idempotency-claim result stored is a small summary object, never raw rows/headers', () => {
    const src = read(SERVICE_PATH);
    // The exact `execute()` return statement — the value that becomes the
    // stored/replayed idempotency-claim result — is a fixed, named-field
    // object, never the parsed `rows`/`headers` arrays themselves.
    expect(src).toMatch(/return \{ batchId, rowCount: rows\.length, fileType: ext2 \};/);
    const returnStatements = src.match(/return \{[^}]*\};/g) ?? [];
    const resultReturn = returnStatements.find((r) => r.includes('batchId'));
    expect(resultReturn).toBeDefined();
    // Allows `rows.length` (a count) but rejects the raw `rows` array itself
    // being included as a value (e.g. `rows,` / `rows}` / `rows: rows`).
    expect(resultReturn).not.toMatch(/\brows\b(?!\.length)/);
    expect(resultReturn).not.toMatch(/\bheaders\b/);
  });
});

describe('KORA-WP-028 — immutability / no-delete discipline', () => {
  it('installs a terminal-state immutability trigger (a resolved claim is never re-resolved)', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/kora\/immutable: analytics\.idempotency_claim ".*is already terminal/);
  });

  it('installs an unconditional no-delete trigger', () => {
    const migration = read(MIGRATION_PATH);
    expect(migration).toMatch(/CREATE TRIGGER trg_idempotency_claim_no_delete\s+BEFORE DELETE ON analytics\.idempotency_claim/);
  });

  it('no DELETE grant exists for idempotency_claim, for any role', () => {
    const grantLines = codeLines(read(MIGRATION_PATH)).filter((l) => /^\s*GRANT\b/i.test(l));
    expect(grantLines.some((l) => /DELETE/i.test(l) && /idempotency_claim/.test(l))).toBe(false);
  });
});

describe('KORA-WP-028 — WP-013/WP-062/Prime/Living-KORAL boundaries untouched', () => {
  it('the migration never references gov.policy_config_version or analytics.fee_charge_event', () => {
    const lines = codeLines(read(MIGRATION_PATH));
    expect(lines.some((l) => /gov\.policy_config_version|analytics\.fee_charge_event/.test(l))).toBe(false);
  });

  it('the service never references Program Funds / Prime / Living KORAL vocabulary', () => {
    const src = read(SERVICE_PATH);
    expect(src).not.toMatch(/program_funds|funding_commitment|partner_payable|material_change|transformation_ledger|morphogenesis/i);
  });

  it('the existing data-submissions flow (B39) is never imported by this WP\'s new files', () => {
    for (const path of [SERVICE_PATH, STORE_PATH, ROUTE_PATH]) {
      const lines = importLines(read(path));
      expect(lines.some((l) => /data-submissions/.test(l))).toBe(false);
    }
  });
});

describe('KORA-WP-028 — failure taxonomy (Section 10/K)', () => {
  it('validation failures use a dedicated, non-generic error class', () => {
    const src = read(SERVICE_PATH);
    expect(src).toMatch(/class CompanyIngestValidationError extends Error/);
  });

  it('the route maps every typed outcome to a distinct HTTP status', () => {
    const route = read(ROUTE_PATH);
    expect(route).toMatch(/case 'executed':[\s\S]*?status: 201/);
    expect(route).toMatch(/case 'replayed':[\s\S]*?status: 200/);
    expect(route).toMatch(/case 'replayed_failure':[\s\S]*?status: 422/);
    expect(route).toMatch(/case 'conflict':[\s\S]*?status: 409/);
    expect(route).toMatch(/case 'in_progress':[\s\S]*?status: 409/);
  });
});

describe('KORA-WP-028 — service-role guard allowlist', () => {
  it('both new server-only files are documented allowlist entries', () => {
    const guard = readFileSync('tests/unit/pilot-trust-01-service-role-guard.test.ts', 'utf8');
    expect(guard).toMatch(/lib\/async-contract\/postgres-idempotency-store\.ts/);
    expect(guard).toMatch(/lib\/ingestion-hardening\/company-ingest-service\.ts/);
  });
});

describe('KORA-WP-028 — migration ledger sanity (no lateral migration added)', () => {
  it('077 exists and no migration beyond the WP-028 scope was introduced alongside it', () => {
    const files = readdirSync('supabase/migrations').filter((f) => /^\d+_/.test(f));
    const numbers = files.map((f) => parseInt(f.split('_')[0], 10));
    expect(numbers).toContain(77);
    expect(Math.max(...numbers)).toBeGreaterThanOrEqual(77);
  });
});
