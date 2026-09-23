// tests/unit/kora-wp-132-canonical-intake-actor-model.test.ts
//
// KORA-WP-132 — Canonical Intake Actor Model Remediation.
//
// THE CONTRADICTION THIS SUITE CLOSES. Before WP-132 two intake paths
// coexisted: the canonical operator-mediated one (/api/admin/data-intake,
// requireKoraAdmin) and a legacy Company self-service one
// (/api/company/data-ingest, requireCompanyUser → company-ingest-service →
// analytics.source_batch). The legacy service used the service-role client,
// so it bypassed the migration-026 RLS policy that already restricted
// COMPANY_ADMIN writes to source_type='company_submission' with batch_status
// in ('submission_draft','submission_pending'). The RLS model was therefore
// already correct; only the bypassing Product path had to go — which is why
// WP-132's contract says the actor model is the deliverable and RLS is
// unchanged.
//
// The distinction these tests must preserve: a Company MAY create SUBMISSION
// state (by design — that is the operator-mediated model's first half). A
// Company may NOT create canonical INGESTION state. Asserting "Company cannot
// touch source_batch" would be wrong and would break the approved model.

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { ARCHITECTURE_REGISTRY, validateArchitectureRegistry } from '@/lib/architecture/registry';
import { buildDataIntakeStatusView, type CanonicalIntakeStatus } from '@/lib/live/data-intake-status-view';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

const RETIRED_ROUTE = 'app/api/company/data-ingest';
const RETIRED_SERVICE = 'lib/ingestion-hardening/company-ingest-service.ts';
const RETIRED_PANEL = 'app/company/data/upload/_components/ConfirmIngestPanel.tsx';

/** Every file that could hold a runtime reference. */
function sourceFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: string[];
    try { entries = readdirSync(join(ROOT, dir)); } catch { return; }
    for (const e of entries) {
      if (e === 'node_modules' || e === '.next' || e.startsWith('.')) continue;
      const rel = `${dir}/${e}`;
      if (/\.(ts|tsx|mjs|js)$/.test(e)) out.push(rel);
      else if (statSync(join(ROOT, rel)).isDirectory()) walk(rel);
    }
  };
  for (const d of ['app', 'lib', 'components', 'services', 'scripts']) walk(d);
  return out;
}

function withoutComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');
}

// ── A — the legacy Company ingestion path no longer exists ───────────────────

describe('KORA-WP-132 (A) — the legacy Company self-service ingestion path is gone', () => {
  it('the Company ingest API route is deleted', () => {
    expect(exists(RETIRED_ROUTE)).toBe(false);
    expect(exists(`${RETIRED_ROUTE}/route.ts`)).toBe(false);
  });

  it('the Company ingest service is deleted, and its directory with it', () => {
    expect(exists(RETIRED_SERVICE)).toBe(false);
    expect(exists('lib/ingestion-hardening')).toBe(false);
  });

  it('the ConfirmIngestPanel that invoked it is deleted', () => {
    expect(exists(RETIRED_PANEL)).toBe(false);
    expect(exists('app/company/data/upload/_components')).toBe(false);
  });
});

// ── B — no executable path reaches the retired surfaces ──────────────────────

describe('KORA-WP-132 (B) — zero runtime consumers remain', () => {
  it('no source file imports the retired service', () => {
    const offenders = sourceFiles().filter((f) =>
      /(^|\n)\s*import[^;\n]*from\s*['"][^'"]*ingestion-hardening[^'"]*['"]/.test(read(f)) ||
      /(require|import)\(\s*['"][^'"]*ingestion-hardening[^'"]*['"]\s*\)/.test(read(f)),
    );
    expect(offenders, `retired service still imported by: ${offenders.join(', ')}`).toEqual([]);
  });

  it('no executable code calls the retired Company ingest endpoint', () => {
    const offenders = sourceFiles().filter((f) => /['"`]\/api\/company\/data-ingest/.test(withoutComments(read(f))));
    expect(offenders, `retired endpoint still called by: ${offenders.join(', ')}`).toEqual([]);
  });

  it('no executable code references the retired service symbols', () => {
    const offenders = sourceFiles().filter((f) => /\bingestCompanyDataFile\b/.test(withoutComments(read(f))));
    expect(offenders, `retired symbols still referenced by: ${offenders.join(', ')}`).toEqual([]);
  });
});

// ── C — the deliverable: Company cannot create canonical ingestion state ─────

describe('KORA-WP-132 (C) — a COMPANY_ADMIN cannot create canonical ingestion state by any path', () => {
  /** Company-facing API routes that touch analytics.source_batch at all. */
  function companyRoutesTouchingSourceBatch(): string[] {
    return sourceFiles().filter(
      (f) => f.startsWith('app/api/company/') && f.endsWith('route.ts') && read(f).includes('source_batch'),
    );
  }

  it('every Company route touching source_batch writes only submission state, never intake state', () => {
    const violations: string[] = [];
    for (const f of companyRoutesTouchingSourceBatch()) {
      const code = withoutComments(read(f));
      for (const m of code.matchAll(/batch_status:\s*'([a-z_]+)'/g)) {
        // migration 026's RLS WITH CHECK allows exactly these two for a Company actor.
        if (m[1] !== 'submission_draft' && m[1] !== 'submission_pending') {
          violations.push(`${f} writes batch_status='${m[1]}'`);
        }
      }
    }
    expect(violations, violations.join('; ')).toEqual([]);
  });

  it('no Company route writes the canonical ingested status', () => {
    const offenders = sourceFiles()
      .filter((f) => f.startsWith('app/api/company/') || f.startsWith('app/company/'))
      .filter((f) => /batch_status:\s*'ingested'/.test(withoutComments(read(f))));
    expect(offenders).toEqual([]);
  });

  it('no Company surface creates UEF records — canonical ingestion is operator-mediated', () => {
    const offenders = sourceFiles()
      .filter((f) => f.startsWith('app/api/company/') || f.startsWith('app/company/'))
      .filter((f) => /\.from\(\s*['"]uef_record['"]\s*\)[\s\S]{0,120}\.insert\(/.test(withoutComments(read(f))));
    expect(offenders, `Company surface inserting uef_record: ${offenders.join(', ')}`).toEqual([]);
  });

  it('the RLS policy that already encoded this actor model is unchanged', () => {
    const sql = read('supabase/migrations/026_company_route_rls_gaps.sql');
    expect(sql).toContain("source_type = 'company_submission'");
    expect(sql).toContain("batch_status IN ('submission_draft', 'submission_pending')");
  });
});

// ── D — /company/data/upload is a non-ingestion boundary ─────────────────────

describe('KORA-WP-132 (D) — the legacy upload route is reduced to a non-ingestion boundary', () => {
  const page = () => read('app/company/data/upload/page.tsx');

  it('it redirects to the canonical Company surface', () => {
    expect(page()).toContain("redirect('/company/data')");
  });

  it('it is a boundary, not a surface — no upload, ingest or scoring logic survives', () => {
    const code = withoutComments(page());
    for (const forbidden of ['FormData', 'fetch(', 'source_batch', 'data-ingest', 'ConfirmIngestPanel']) {
      expect(code, `retired upload page still contains ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('the legacy client-side scoring is gone from the canonical Product path', () => {
    expect(/\b(computeKora|calculateScore|koraIndex)\b/i.test(withoutComments(page()))).toBe(false);
  });

  it('the canonical Company surface still exists', () => {
    expect(exists('app/company/data/page.tsx')).toBe(true);
  });
});

// ── E — the canonical operator-mediated path is intact ───────────────────────

describe('KORA-WP-132 (E) — canonical Admin intake remains available and Admin-only', () => {
  const routes = [
    'app/api/admin/data-intake/accept/route.ts',
    'app/api/admin/data-intake/preview/route.ts',
    'app/api/admin/data-intake/upload-preview/route.ts',
  ];

  it('all three canonical intake routes still exist', () => {
    for (const r of routes) expect(exists(r), `${r} missing`).toBe(true);
  });

  it('each is guarded by requireKoraAdmin — and by nothing weaker', () => {
    for (const r of routes) {
      const src = read(r);
      expect(src, `${r} lost its Admin guard`).toContain('requireKoraAdmin');
      expect(src, `${r} must not accept a Company actor`).not.toContain('requireCompanyUser');
    }
  });

  it('the Admin intake surface still exists', () => {
    expect(exists('app/admin/data-intake/page.tsx')).toBe(true);
  });
});

// ── F — WP-049 status model coherence ────────────────────────────────────────

describe('KORA-WP-132 (F) — the KORA-WP-049 status model represents ingested coherently', () => {
  it("'ingested' is a member of CanonicalIntakeStatus", () => {
    const s: CanonicalIntakeStatus = 'ingested';
    expect(s).toBe('ingested');
  });

  it('a batch left behind by the retired path is reported as ingested, not in_progress', () => {
    const view = buildDataIntakeStatusView(
      [{ batch_status: 'ingested', created_at: '2026-09-01T00:00:00Z' }],
      0,
    );
    expect(view.intakeStatus).toBe('ingested');
    expect(view.batchCount).toBe(1);
  });

  it('the terminal status wins over an older approved batch', () => {
    const view = buildDataIntakeStatusView(
      [
        { batch_status: 'approved', created_at: '2026-08-01T00:00:00Z' },
        { batch_status: 'ingested', created_at: '2026-09-01T00:00:00Z' },
      ],
      0,
    );
    expect(view.intakeStatus).toBe('ingested');
  });

  it('every other status derivation is unchanged', () => {
    expect(buildDataIntakeStatusView([], 0).intakeStatus).toBe('not_started');
    expect(
      buildDataIntakeStatusView([{ batch_status: 'approved', created_at: '2026-09-01T00:00:00Z' }], 0).intakeStatus,
    ).toBe('ready_for_ingestion');
    expect(
      buildDataIntakeStatusView([{ batch_status: 'pending', created_at: '2026-09-01T00:00:00Z' }], 2).intakeStatus,
    ).toBe('validation_required');
    expect(
      buildDataIntakeStatusView([{ batch_status: 'pending', created_at: '2026-09-01T00:00:00Z' }], 0).intakeStatus,
    ).toBe('in_progress');
  });
});

// ── G — no phantom or zero-row batch state ───────────────────────────────────

describe('KORA-WP-132 (G) — no phantom or zero-row batch state reaches a view', () => {
  it('an empty batch list yields not_started, never a phantom batch', () => {
    const view = buildDataIntakeStatusView([], 0);
    expect(view).toEqual({ batchCount: 0, intakeStatus: 'not_started', pendingReviewCount: 0 });
  });

  it('a zero-batch tenant never reports a pending review count', () => {
    // pendingReviewCount is forced to 0 when no batch exists — a review cannot
    // be pending against nothing.
    expect(buildDataIntakeStatusView([], 7).pendingReviewCount).toBe(0);
  });

  it('batchCount always equals the real row count it was given', () => {
    const rows = [
      { batch_status: 'pending', created_at: '2026-09-01T00:00:00Z' },
      { batch_status: 'approved', created_at: '2026-09-02T00:00:00Z' },
    ];
    expect(buildDataIntakeStatusView(rows, 0).batchCount).toBe(2);
  });
});

// ── H — the retirement is recorded, not silently dropped ─────────────────────

describe('KORA-WP-132 (H) — the architecture registry records the retirement', () => {
  const entry = () => ARCHITECTURE_REGISTRY.find((c) => c.id === 'svc.company-ingest');

  it('a historical record exists for the retired service', () => {
    expect(entry()).toBeTruthy();
  });

  it('it follows the established retirement form', () => {
    const e = entry()!;
    expect(e.status).toBe('DEAD');
    expect(e.primaryPath).toBe(RETIRED_SERVICE);
    expect(e.purpose).toMatch(/HISTORICAL/i);
    expect(e.decisionRef).toBe('KORA-WP-132');
    expect(e.deletableWhen).toMatch(/already deleted/i);
    expect(e.notes).toMatch(/DELETED/);
    expect(e.futureCore).toBe(false);
  });

  it('it names the canonical path that survives', () => {
    expect(entry()!.competingWith).toContain('api.admin.data-intake');
  });

  it('the registry as a whole still validates', () => {
    expect(validateArchitectureRegistry(ARCHITECTURE_REGISTRY)).toEqual([]);
  });
});

// ── I — WP-133 scope was not consumed ────────────────────────────────────────

describe('KORA-WP-132 (I) — no technical decomposition was performed', () => {
  it('no new ingestion module tree was introduced', () => {
    for (const d of ['lib/intake', 'lib/ingestion-v2', 'services/intake']) {
      expect(exists(d), `${d} would be KORA-WP-133 scope`).toBe(false);
    }
  });

  it('the retired upload page was deleted down to a boundary, not refactored into components', () => {
    expect(exists('app/company/data/upload/_components')).toBe(false);
    expect(read('app/company/data/upload/page.tsx').split('\n').length).toBeLessThan(40);
  });

  it('no migration was added — this package is Contract, with no data impact', () => {
    const files = readdirSync(join(ROOT, 'supabase/migrations')).filter((f) => f.endsWith('.sql'));
    expect(files.some((f) => /wp[-_]?132|intake[-_]?actor/i.test(f))).toBe(false);
  });
});
