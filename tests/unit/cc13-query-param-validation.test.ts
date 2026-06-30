/**
 * CC-13 — Query param UUID validation: structural tests
 *
 * Verifica che le 4 route selezionate usino Zod per validare query param.
 * Pattern: source-file reading (identico a CC-12).
 * Non richiede Supabase live.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
function readRoute(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

// ── 1. impact-units ───────────────────────────────────────────────────────────

describe('CC-13 — impact-units: tenantId UUID validation', () => {
  const src = readRoute('app/api/admin/impact-units/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("uses z.string().uuid() for tenantId", () => {
    expect(src).toContain('z.string().uuid()');
  });

  it("uses safeParse on tenantId", () => {
    expect(src).toContain('tenantIdParsed');
    expect(src).toContain('safeParse(');
  });

  it("returns 400 on invalid tenantId", () => {
    expect(src).toContain("{ status: 400 }");
  });

  it("does not expose raw tenantId in error message", () => {
    expect(src).not.toContain('error: tenantId');
    expect(src).toContain("'tenantId non valido.'");
  });

  it("does not use legacy empty-string check before DB call (replaced by safeParse)", () => {
    // legacy pattern was "if (!tenantId) return 400" — now handled by safeParse result
    expect(src).toContain('tenantIdParsed.success');
  });
});

// ── 2. worker-initiatives (GET) ───────────────────────────────────────────────

describe('CC-13 — worker-initiatives GET: tenantId UUID validation', () => {
  const src = readRoute('app/api/admin/worker-initiatives/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("uses z.string().uuid() for tenantId", () => {
    expect(src).toContain('z.string().uuid()');
  });

  it("uses safeParse on tenantId", () => {
    expect(src).toContain('tenantIdParsed');
    expect(src).toContain('safeParse(');
  });

  it("returns 400 on invalid tenantId", () => {
    expect(src).toContain("{ status: 400 }");
  });

  it("GET handler uses safeParse result check (not legacy null check)", () => {
    expect(src).toContain('tenantIdParsed.success');
  });

  it("does not expose the raw tenantId value in error", () => {
    expect(src).not.toContain('tenantId query param obbligatorio');
  });
});

// ── 3. company-users (GET) ────────────────────────────────────────────────────

describe('CC-13 — company-users GET: tenantId UUID validation', () => {
  const src = readRoute('app/api/admin/company-users/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("uses z.string().uuid() for tenantId", () => {
    expect(src).toContain('z.string().uuid()');
  });

  it("uses safeParse on tenantId", () => {
    expect(src).toContain('tenantIdParsed');
    expect(src).toContain('safeParse(');
  });

  it("returns 400 on invalid tenantId", () => {
    expect(src).toContain("{ status: 400 }");
  });

  it("GET handler uses safeParse result check (not legacy empty-string check)", () => {
    expect(src).toContain('tenantIdParsed.success');
  });
});

// ── 4. workers/list ───────────────────────────────────────────────────────────

describe('CC-13 — workers/list: tenantCode length validation', () => {
  const src = readRoute('app/api/admin/workers/list/route.ts');

  it("imports zod", () => {
    expect(src).toContain("from 'zod'");
  });

  it("uses z.string().min(1).max(40) for tenantCode", () => {
    expect(src).toContain('z.string().min(1).max(40)');
  });

  it("uses safeParse on tenantCode", () => {
    expect(src).toContain('tenantCodeParsed');
    expect(src).toContain('safeParse(');
  });

  it("returns 400 on invalid tenantCode", () => {
    expect(src).toContain("{ status: 400 }");
  });

  it("does not use legacy empty-string check for tenantCode", () => {
    expect(src).not.toContain("if (!tenantCode)");
  });
});
