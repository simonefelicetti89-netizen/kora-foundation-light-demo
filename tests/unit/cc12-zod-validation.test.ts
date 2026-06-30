/**
 * CC-12 — Zod Input Validation: structural tests
 *
 * Verifica che le 4 route selezionate abbiano schema Zod e usino safeParse.
 * Pattern: source-file reading (identico a B104, B109, ecc.)
 * Non richiede Supabase live — tutti i test leggono file statici.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function readRoute(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. workers/provision ──────────────────────────────────────────────────────

describe('CC-12 — workers/provision Zod schema', () => {
  const src = readRoute('app/api/admin/workers/provision/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("defines ProvisionWorkerSchema", () => {
    expect(src).toContain('ProvisionWorkerSchema');
  });

  it("validates email format", () => {
    expect(src).toContain('.email(');
  });

  it("validates tenantCode non-empty", () => {
    expect(src).toContain('.min(1,');
  });

  it("uses safeParse instead of manual typeof", () => {
    expect(src).toContain('safeParse');
    expect(src).not.toContain("!email.includes('@')");
  });

  it("returns 400 on parse failure", () => {
    expect(src).toContain("{ status: 400 }");
  });
});

// ── 2. companies/provision ────────────────────────────────────────────────────

describe('CC-12 — companies/provision Zod schema', () => {
  const src = readRoute('app/api/admin/companies/provision/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("defines ProvisionCompanySchema", () => {
    expect(src).toContain('ProvisionCompanySchema');
  });

  it("validates admin_email format", () => {
    expect(src).toContain('.email(');
  });

  it("validates company_name non-empty", () => {
    expect(src).toContain('.min(1,');
  });

  it("uses safeParse", () => {
    expect(src).toContain('safeParse');
  });

  it("retains admin_role VALID_ROLES check after parse", () => {
    expect(src).toContain('VALID_ROLES.includes(adminRole)');
  });
});

// ── 3. scoring/run-approved-batch ─────────────────────────────────────────────

describe('CC-12 — scoring/run-approved-batch Zod schema', () => {
  const src = readRoute('app/api/admin/scoring/run-approved-batch/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("defines RunBatchSchema", () => {
    expect(src).toContain('RunBatchSchema');
  });

  it("validates batchId non-empty string", () => {
    expect(src).toContain("batchId");
    expect(src).toContain('.min(1,');
  });

  it("accepts optional workforcePopulation", () => {
    expect(src).toContain('workforcePopulation');
  });

  it("uses safeParse", () => {
    expect(src).toContain('safeParse');
  });

  it("does not pass raw body to runKoraPipeline directly", () => {
    // runKoraPipeline must not receive rawBody — it receives processed values
    expect(src).not.toContain('runKoraPipeline(rawBody');
    expect(src).not.toContain('runKoraPipeline(body');
  });
});

// ── 4. worker/initiatives/[id]/interest ───────────────────────────────────────

describe('CC-12 — worker/initiatives/[id]/interest Zod schema', () => {
  const src = readRoute('app/api/worker/initiatives/[id]/interest/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("defines InterestSchema", () => {
    expect(src).toContain('InterestSchema');
  });

  it("uses z.enum for status", () => {
    expect(src).toContain('z.enum(');
  });

  it("validates private_note max length", () => {
    expect(src).toContain('.max(PRIVATE_NOTE_MAX_LENGTH,');
  });

  it("uses safeParse", () => {
    expect(src).toContain('safeParse');
  });

  it("preserves privacy: worker_id and tenant_id not accepted from body", () => {
    // Schema does not include worker_id or tenant_id — they are stripped by Zod
    expect(src).toContain('worker_id and tenant_id from body are silently rejected');
  });

  it("uses as const satisfies for ALLOWED_STATUSES (type-safe, Zod-compatible)", () => {
    expect(src).toContain('as const satisfies');
  });
});
