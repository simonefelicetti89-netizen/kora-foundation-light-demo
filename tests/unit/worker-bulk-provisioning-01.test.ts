/**
 * Worker Bulk Provisioning 01 — pilot-readiness bulk worker invitation guards.
 *
 * Static/structural only — reads source text, does not run against a
 * database and does not import Supabase. Guards the sprint's own rule: the
 * new bulk-provision API and admin UI reuse the existing, already-tested
 * single-worker provisioning path (insertWorkerIdentity, the same
 * app_metadata shape, the same privacy invariants) without touching
 * app/api/admin/workers/provision/route.ts, whose exact literal source is
 * itself asserted by tests/unit/b104-worker-provisioning.test.ts. No DB/RLS/
 * migration, no KORA Link flag, no KORA Index change, no companion score.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const BULK_ROUTE = 'app/api/admin/workers/bulk-provision/route.ts';
const PARSER = 'lib/admin/bulk-worker-parser.ts';
const BULK_PAGE = 'app/admin/workers/bulk/page.tsx';
const BULK_CLIENT = 'app/admin/workers/bulk/_components/BulkWorkerProvisioningClient.tsx';
const SINGLE_ROUTE = 'app/api/admin/workers/provision/route.ts';
const ADMIN_WORKERS_PAGE = 'app/admin/workers/page.tsx';

const ALL_NEW_FILES = [BULK_ROUTE, PARSER, BULK_PAGE, BULK_CLIENT];

// ── 1: bulk provision API route exists ───────────────────────────────────────

describe('Worker Bulk Provisioning 01 — bulk provision API route exists', () => {
  it(`${BULK_ROUTE} exists`, () => {
    expect(() => readSource(BULK_ROUTE)).not.toThrow();
  });
});

// ── 2: requires KORA_ADMIN ────────────────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — API route requires the admin guard', () => {
  it(`${BULK_ROUTE} calls requireKoraAdmin and returns its error`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toMatch(/from '@\/lib\/auth\/kora-session'/);
    expect(source).toContain('requireKoraAdmin(request)');
    expect(source).toContain('isKoraAuthError(auth)');
  });
});

// ── 3-4: validates tenantId and empty worker list ───────────────────────────

describe('Worker Bulk Provisioning 01 — validates missing tenantId and empty worker list', () => {
  const source = readSource(BULK_ROUTE);

  it('requires a valid tenantId (uuid)', () => {
    expect(source).toMatch(/tenantId:\s*z\.string\(\)\.uuid\(/);
  });

  it('rejects an empty workers array', () => {
    expect(source).toMatch(/\.min\(1,\s*'workers non può essere vuoto'\)/);
  });
});

// ── 5: duplicate email detection ─────────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — detects duplicate emails in the same batch', () => {
  it(`${PARSER} exports validateWorkerBatch with duplicate-email detection`, () => {
    const source = readSource(PARSER);
    expect(source).toContain('export function validateWorkerBatch');
    expect(source).toContain('duplicateEmails');
    expect(source).toMatch(/Email duplicate nel batch/);
  });

  it(`${BULK_ROUTE} calls validateWorkerBatch server-side (defense in depth)`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toContain('validateWorkerBatch(workers)');
  });
});

// ── 6: safe max batch size ────────────────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — enforces a safe max batch size', () => {
  it(`${PARSER} exports MAX_BULK_BATCH_SIZE`, () => {
    const source = readSource(PARSER);
    expect(source).toMatch(/export const MAX_BULK_BATCH_SIZE = \d+/);
  });

  it(`${BULK_ROUTE} enforces MAX_BULK_BATCH_SIZE via zod .max()`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toMatch(/\.max\(MAX_BULK_BATCH_SIZE,/);
  });
});

// ── 7: per-row results ────────────────────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — returns per-row results', () => {
  it(`${BULK_ROUTE} defines a per-row outcome type and a results array in the response`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toMatch(/type BulkRowOutcome = 'created' \| 'already_exists' \| 'invited' \| 'failed' \| 'validation_error'/);
    expect(source).toContain('results.push(');
    expect(source).toMatch(/results,\s*\}\);/);
  });
});

// ── 8: no secrets/service-role exposure ──────────────────────────────────────

describe('Worker Bulk Provisioning 01 — does not expose secrets or service-role details', () => {
  for (const file of ALL_NEW_FILES) {
    it(`${file} never logs or returns a raw secret value`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/console\.(log|error|warn)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
      expect(source).not.toMatch(/SUPABASE_SERVICE_ROLE_KEY\s*[,:]\s*process\.env/);
    });
  }

  it(`${BULK_ROUTE} never returns the service client or a raw env secret in the JSON response`, () => {
    const source = readSource(BULK_ROUTE);
    const responseBlocks = source.match(/NextResponse\.json\(\{[\s\S]*?\}\)/g) ?? [];
    for (const block of responseBlocks) {
      expect(block).not.toMatch(/getSupabaseServiceClient/);
      expect(block).not.toMatch(/process\.env/);
    }
  });
});

// ── 9: app_metadata only via existing provisioning logic ────────────────────

describe('Worker Bulk Provisioning 01 — modifies app_metadata only through the existing provisioning shape', () => {
  it(`${BULK_ROUTE} uses the exact same app_metadata field set as the single-worker route`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toContain("kora_role:      'WORKER'");
    expect(source).toContain('kora_tenant_id: tenantId');
    expect(source).toContain('kora_worker_id: workerId');
    expect(source).toContain("kora_status:    'invited'");
  });

  it(`${BULK_ROUTE} writes personal.worker_identity only via the shared, whitelist-enforced helper`, () => {
    const source = readSource(BULK_ROUTE);
    expect(source).toContain('insertWorkerIdentity(');
    expect(source).toContain("from '@/lib/supabase/worker-provisioning-service-key'");
  });

  it(`${BULK_ROUTE} never persists firstName/lastName to worker_identity or app_metadata`, () => {
    const source = readSource(BULK_ROUTE);
    // Only email/workerRef are mapped into the internal `workers` array —
    // firstName/lastName from the validated input are dropped before this point.
    expect(source).toMatch(/const workers: ParsedWorkerInput\[\] = parsed\.data\.workers\.map\(\(w\) => \(\{\s*email:\s*w\.email\.trim\(\)\.toLowerCase\(\),\s*workerRef:\s*w\.workerRef,\s*\}\)\);/);
  });
});

// ── 10-11: single-worker route untouched ─────────────────────────────────────

describe('Worker Bulk Provisioning 01 — existing single-worker provisioning route is unchanged', () => {
  it(`${SINGLE_ROUTE} still exists`, () => {
    expect(() => readSource(SINGLE_ROUTE)).not.toThrow();
  });

  it(`${SINGLE_ROUTE} still bears the exact literal contract tests/unit/b104-worker-provisioning.test.ts asserts`, () => {
    const source = readSource(SINGLE_ROUTE);
    expect(source).toContain('requireKoraAdmin');
    expect(source).toContain('inviteUserByEmail');
    expect(source).toContain("kora_role:      'WORKER'");
    expect(source).toContain('kora_tenant_id: tenantId');
    expect(source).toContain('kora_worker_id: workerId');
    expect(source).toContain('insertWorkerIdentity(');
    expect(source).toContain("from '@/lib/supabase/worker-provisioning-service-key'");
  });

  it('b104-worker-provisioning.test.ts itself still exists (regression lock intact)', () => {
    expect(() => readSource('tests/unit/b104-worker-provisioning.test.ts')).not.toThrow();
  });
});

// ── 12: admin bulk worker UI exists ──────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — admin bulk worker UI exists', () => {
  it(`${BULK_PAGE} exists`, () => {
    expect(() => readSource(BULK_PAGE)).not.toThrow();
  });

  it(`${BULK_CLIENT} exists`, () => {
    expect(() => readSource(BULK_CLIENT)).not.toThrow();
  });

  it(`${ADMIN_WORKERS_PAGE} links to the new bulk page without losing its own admin guard`, () => {
    const source = readSource(ADMIN_WORKERS_PAGE);
    expect(source).toContain('href="/admin/workers/bulk"');
    expect(source).toContain('getCurrentKoraUser');
    expect(source).toContain("redirect('/admin/login')");
    expect(source).toContain("koraRole !== 'KORA_ADMIN'");
  });
});

// ── 13: missing tenantId handled safely ──────────────────────────────────────

describe('Worker Bulk Provisioning 01 — UI handles missing tenantId safely', () => {
  it(`${BULK_PAGE} shows guidance and does not crash when tenantId is absent`, () => {
    const source = readSource(BULK_PAGE);
    expect(source).toMatch(/!tenantId/);
    expect(source).toMatch(/Nessun.*tenantId.*specificato/);
  });
});

// ── 14: documents accepted format ────────────────────────────────────────────

describe('Worker Bulk Provisioning 01 — UI documents the accepted CSV/paste format', () => {
  it(`${BULK_CLIENT} explains the accepted input formats`, () => {
    const source = readSource(BULK_CLIENT);
    expect(source).toMatch(/Formati accettati/);
    expect(source).toContain('firstName,lastName,email');
  });
});

// ── 15: previews parsed workers before submit ────────────────────────────────

describe('Worker Bulk Provisioning 01 — UI previews parsed workers before submit', () => {
  it(`${BULK_CLIENT} parses client-side and renders a preview before any submit call`, () => {
    const source = readSource(BULK_CLIENT);
    expect(source).toContain('parseBulkWorkerInput(pasteText)');
    expect(source).toMatch(/Anteprima —/);
    expect(source).toContain('canSubmit');
  });
});

// ── 16: links to company-users-live and company-workspace-live ─────────────

describe('Worker Bulk Provisioning 01 — links to company-users-live and company-workspace-live', () => {
  it(`${BULK_PAGE} links to both -live admin pages`, () => {
    const source = readSource(BULK_PAGE);
    expect(source).toMatch(/\/admin\/company-users-live\?tenantId=/);
    expect(source).toMatch(/\/admin\/company-workspace-live/);
  });
});

// ── 17-18: no KORA Link reference, no NFC writing ───────────────────────────

describe('Worker Bulk Provisioning 01 — no KORA Link flag reference, no NFC chip writing', () => {
  for (const file of ALL_NEW_FILES) {
    it(`${file} never references a KORA Link feature flag`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/KORA_LINK_ENABLED|KORA_LINK_DB_LOOKUP_ENABLED|KORA_LINK_ACTIVATION_ENABLED/);
    });

    it(`${file} contains no NFC chip writing logic (Web NFC API or kl1_ token construction)`, () => {
      const source = readSource(file);
      expect(source).not.toMatch(/NDEFReader|navigator\.nfc|new NDEFMessage/i);
      expect(source).not.toMatch(/kl1_/);
    });
  }
});

// ── 19-21: migrations, proposed SQL, 034/035/036 untouched ─────────────────

describe('Worker Bulk Provisioning 01 — no migration or proposed SQL touched', () => {
  it('supabase/migrations/007_worker_provisioning.sql is unmodified (spot check)', () => {
    const migration = readSource('supabase/migrations/007_worker_provisioning.sql');
    expect(migration).toMatch(/worker_identity/);
  });

  it('034/035/036 remain readable and unchanged under supabase/proposed/', () => {
    for (const file of [
      'supabase/migrations/034_kora_link_schema.sql',
      'supabase/migrations/035_kora_link_rls.sql',
      'supabase/migrations/036_kora_link_rpc_functions.sql',
    ]) {
      expect(() => readSource(file)).not.toThrow();
    }
    const rls = readSource('supabase/migrations/035_kora_link_rls.sql');
    expect(rls).toMatch(/Worker SELECT self-only — BLOCKED until activation function is ready/);
  });

  it('no new file in this sprint is a .sql file', () => {
    for (const file of ALL_NEW_FILES) {
      expect(file.endsWith('.sql')).toBe(false);
    }
  });
});

// ── 22-24: KORA Index engine, ingestion, access-matrix untouched ───────────

describe('Worker Bulk Provisioning 01 — KORA Index engine, ingestion, and access-matrix remain untouched', () => {
  it('lib/kora-engine/kora-index-engine.ts still bears its v2.0 Sprint 1 header (not rewritten)', () => {
    const engine = readSource('lib/kora-engine/kora-index-engine.ts');
    expect(engine).toMatch(/KORA Index Engine v2\.0 — Sprint 1 IU-centric refactor/);
  });

  it('lib/ingestion/raw-to-uef-interpreter.ts still bears its original header (not rewritten)', () => {
    const interpreter = readSource('lib/ingestion/raw-to-uef-interpreter.ts');
    expect(interpreter).toMatch(/Raw-to-UEF Rule-Based Interpreter v0\.1/);
  });

  it('lib/auth/access-matrix.ts still bears its B168 authoritative header (not rewritten)', () => {
    const accessMatrix = readSource('lib/auth/access-matrix.ts');
    expect(accessMatrix).toMatch(/B168 — Matrice di accesso autoritativa per KORA/);
  });
});

// ── 25-26: no RLS policy files, no companion/activation score ──────────────

describe('Worker Bulk Provisioning 01 — no RLS policy files, no companion/activation score introduced', () => {
  it('no new file in this sprint contains a CREATE POLICY statement', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/CREATE\s+POLICY/i);
    }
  });

  it('no new file introduces a companion score or separate activation score', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/companion score/i);
      expect(source).not.toMatch(/separate (?:public )?activation score/i);
    }
  });
});

// ── 27: commons.post / commons.booking / commons.contribution_event untouched ──

describe('Worker Bulk Provisioning 01 — commons.post, commons.booking, commons.contribution_event remain untouched', () => {
  it('migration 013 still creates commons.post unmodified', () => {
    const migration = readSource('supabase/migrations/013_kora_commons.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.post');
  });

  it('migration 025 still creates commons.booking and commons.contribution_event unmodified', () => {
    const migration = readSource('supabase/migrations/025_commons_booking_contribution.sql');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.booking');
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS commons.contribution_event');
  });

  it('no new file references commons.* tables', () => {
    for (const file of ALL_NEW_FILES) {
      const source = readSource(file);
      expect(source).not.toMatch(/commons\.(post|booking|contribution_event)/);
    }
  });
});
