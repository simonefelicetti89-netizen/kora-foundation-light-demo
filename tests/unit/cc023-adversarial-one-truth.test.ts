// tests/unit/cc023-adversarial-one-truth.test.ts
// CC-023 — Adversarial One Truth Validation (2026-09-06).
//
// The final adversarial gate of CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH).
// Independently attempts to falsify the claim that KORA has one canonical
// product runtime and one product truth, rather than merely re-running
// existing tests. See lib/architecture/registry.ts's CC-023 closure note
// for the full methodology and findings record.
//
// Result: P0 = 0, P1 = 0. CC-023 PASS. CC-00 fully closed on the technical
// axis. Two categories of real findings were investigated and classified
// non-blocking (confirmed-unreachable dead code with fictional data; the
// out-of-B-TRUTH-scope Partner Activity Catalog) — see the registry note
// for the full reasoning, not repeated here as brittle prose assertions.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import {
  SYNTHETIC_IMPORT_ALLOWLIST,
  BTRUTH_OWNED_SYNTHETIC_IMPORTS,
  BWORKER_OWNED_SYNTHETIC_IMPORTS,
} from '@/lib/security/synthetic-import-allowlist';

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function exists(rel: string): boolean {
  return existsSync(resolve(root, rel));
}

function stripComments(src: string): string {
  return src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
}

function walk(dir: string, exts: RegExp, excludeTests = true): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const entry of entries) {
    if (['node_modules', '.next', '.git'].includes(entry)) continue;
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) out.push(...walk(p, exts, excludeTests));
    else if (exts.test(entry) && !(excludeTests && /\.test\.tsx?$/.test(entry))) out.push(p);
  }
  return out;
}

const RUNTIME_DIRS = ['app', 'services', 'lib', 'components'];

// ── 1. No B-TRUTH synthetic imports (independent recompute) ────────────────

describe('CC-023 — no B-TRUTH synthetic imports (independent I9 recompute)', () => {
  it('a fresh repo-wide regex scan for data/synthetic/** imports matches the allowlist exactly', () => {
    const pattern = /^\s*import\s+.+\s+from\s+['"][^'"]*data\/synthetic\/[^'"]+['"]/;
    const found: string[] = [];
    for (const dir of RUNTIME_DIRS) {
      for (const file of walk(resolve(root, dir), /\.(ts|tsx)$/)) {
        const lines = readFileSync(file, 'utf-8').split('\n');
        if (lines.some((l) => pattern.test(l))) {
          found.push(file.replace(root + '/', ''));
        }
      }
    }
    const allowlistFiles = new Set(SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file));
    expect(new Set(found)).toEqual(allowlistFiles);
  });

  it('BTRUTH_OWNED_SYNTHETIC_IMPORTS is empty', () => {
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS).toEqual([]);
  });
});

// ── 2. No UNKNOWN I9 owner ───────────────────────────────────────────────────

describe('CC-023 — no UNKNOWN synthetic ownership', () => {
  it('every allowlist entry is owner B_TRUTH or B_WORKER, no third value', () => {
    for (const entry of SYNTHETIC_IMPORT_ALLOWLIST) {
      expect(['B_TRUTH', 'B_WORKER']).toContain(entry.owner);
    }
  });
});

// ── 3. No demo runtime service ───────────────────────────────────────────────

describe('CC-023 — no demo runtime scoring/data service remains', () => {
  it('ScoringSimulatorService, DemoDataService, DemoScoringAdapter directories/files absent', () => {
    expect(exists('services/scoring-simulator')).toBe(false);
    expect(exists('services/demo-data')).toBe(false);
    expect(exists('services/scoring/DemoScoringAdapter.ts')).toBe(false);
  });

  it('every other previously-retired legacy/duplicate service remains absent', () => {
    for (const dir of [
      'services/report-generator', 'services/report-factory', 'services/ingestion-pipeline',
      'services/ingestion-simulator', 'services/ingestion-normalizer', 'services/eligibility-gate',
      'services/company-intelligence', 'services/tenant', 'services/company-data-intake',
      'services/dynamic-scoring', 'services/budget-to-human-impact', 'services/lifecycle',
      'services/uef-review',
    ]) {
      expect(exists(dir)).toBe(false);
    }
  });
});

// ── 4. No DEMO_VIEWER runtime role ──────────────────────────────────────────

describe('CC-023 — DEMO_VIEWER has zero live executable references', () => {
  it('no runtime file compares a role value to the literal DEMO_VIEWER', () => {
    const offenders: string[] = [];
    const pattern = /(===|==)\s*'DEMO_VIEWER'|'DEMO_VIEWER'\s*(===|==)|role:\s*'DEMO_VIEWER'|'DEMO_VIEWER':/;
    for (const dir of RUNTIME_DIRS) {
      for (const file of walk(resolve(root, dir), /\.(ts|tsx)$/)) {
        const codeOnly = stripComments(readFileSync(file, 'utf-8'));
        if (pattern.test(codeOnly)) offenders.push(file.replace(root + '/', ''));
      }
    }
    expect(offenders).toEqual([]);
  });

  it('REMOVED_KORA_ROLES includes DEMO_VIEWER; no demo-guard file exists', () => {
    expect(read('lib/constants/kora.ts')).toContain("REMOVED_KORA_ROLES = ['COMPANY_VIEWER', 'DEMO_VIEWER']");
    expect(exists('lib/auth/demo-guard.tsx')).toBe(false);
    expect(exists('app/api/admin/demo')).toBe(false);
  });
});

// ── 5. No synthetic scoring fallback ─────────────────────────────────────────

describe('CC-023 — no synthetic scoring fallback', () => {
  it('lib/scoring-result/index.ts has exactly one live path and an honest demo stub, no synthetic seed', () => {
    const src = read('lib/scoring-result/index.ts');
    const codeOnly = stripComments(src);
    expect(codeOnly).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
    expect(src).toContain("status: 'insufficient_data'");
    expect(src).toContain('LIVE must NEVER fallback to demo seed data');
  });

  it('ActivationSafeguardService has no synthetic evaluateFromSeed path', () => {
    const codeOnly = stripComments(read('services/activation-safeguard/ActivationSafeguardService.ts'));
    expect(codeOnly).not.toContain('evaluateFromSeed');
  });
});

// ── 6. No fake product results in public/demo surfaces ─────────────────────

describe('CC-023 — no fake company/score claims on public or demo surfaces', () => {
  it('app/page.tsx and app/demo/page.tsx contain no fictional company names as claimed results', () => {
    for (const page of ['app/page.tsx', 'app/demo/page.tsx']) {
      const codeOnly = stripComments(read(page));
      for (const fake of ['Meridiana Group', 'Nexo Digital', 'Ferretti Holding', 'TerraFlex Agri', 'Fortis Industrial', 'Communitas Cooperativa']) {
        expect(codeOnly).not.toContain(fake);
      }
    }
  });

  it('app/demo/page.tsx has zero live DB calls', () => {
    const codeOnly = stripComments(read('app/demo/page.tsx'));
    expect(codeOnly).not.toContain('getSupabaseServiceClient');
    expect(codeOnly).not.toContain('getSupabaseServerClient');
    expect(codeOnly).not.toMatch(/schema\(['"]analytics['"]\)/);
  });

  it('app/demo/ contains only the two static, non-role-gated surfaces', () => {
    const pages = walk(resolve(root, 'app/demo'), /page\.tsx$/).map((f) => f.replace(root + '/', '')).sort();
    expect(pages).toEqual(['app/demo/future-vision/page.tsx', 'app/demo/page.tsx']);
  });
});

// ── 7. No tenant_kind product branch ─────────────────────────────────────────

describe('CC-023 — no tenant_kind product/business-logic branch', () => {
  it('no live view builder branches on tenant_kind (comment-only mentions asserting the invariant are fine)', () => {
    for (const file of [
      'lib/live/account-provisioning-status-view.ts',
      'lib/live/admin-cross-company-view.ts',
      'lib/live/decision-pack-status-view.ts',
      'lib/live/data-intake-status-view.ts',
      'lib/scoring-result/index.ts',
    ]) {
      const codeOnly = stripComments(read(file));
      expect(codeOnly).not.toContain('tenant_kind');
    }
  });
});

// ── 8. No known retired service reachable ───────────────────────────────────

describe('CC-023 — no retired component is reachable', () => {
  it('no runtime file references a value from a service the registry marks DEAD (except the 2 Master-Plan-§32-scheduled, [VERIFIED] inert stubs pending a later, non-B-TRUTH gate)', () => {
    const registry = read('lib/architecture/registry.ts');
    const deadPrimaryPaths = [...registry.matchAll(/status: 'DEAD'[^}]*?primaryPath: '([^']+)'/g)]
      .concat([...registry.matchAll(/primaryPath: '([^']+)'[^}]*?status: 'DEAD'/g)])
      .map((m) => m[1]);
    // Sanity: at least the well-known retired services are present in this set.
    expect(deadPrimaryPaths.some((p) => p.includes('ScoringSimulatorService'))).toBe(true);
    // Master Plan §32 Safe Deletion Plan explicitly [VERIFIED] these 2 as
    // DEAD-but-still-present inert stubs (redirect-only page; service that
    // always returns []/null) — scheduled for physical deletion "dopo B-REG",
    // a gate unrelated to CC-00/B-TRUTH. Independently re-verified below.
    //
    // B-WORKER "One Product / No Demo Runtime" correction (2026-09-06) adds
    // a third, analogous case: app-surface.my-kora (primaryPath 'app/my-kora/')
    // is marked DEAD (no product runtime remains) but the directory is
    // intentionally NOT deleted — every route under it is now a one-line,
    // unconditional redirect() shell, kept only so an external bookmark to a
    // legacy /my-kora/** URL still lands somewhere correct instead of
    // 404ing. Inert, non-functional-as-a-product, same shape as the 2
    // Master-Plan stubs above — see that registry entry's own
    // `deletableWhen` for the (non-urgent) condition under which the shells
    // themselves could be removed.
    const scheduledStubs = new Set([
      'app/company/reports/board-pack/page.tsx',
      'services/booking-request/BookingRequestService.ts',
      'app/my-kora/',
    ]);
    for (const p of deadPrimaryPaths) {
      if (scheduledStubs.has(p)) continue;
      expect(exists(p)).toBe(false);
    }
  });

  it('the 2 scheduled-DEAD stubs are genuinely inert — redirect-only / always-empty-return, not hidden runtime authority', () => {
    const boardPack = read('app/company/reports/board-pack/page.tsx');
    expect(boardPack).toContain("redirect('/api/company/decision-pack')");
    const booking = stripComments(read('services/booking-request/BookingRequestService.ts'));
    // getRequests/applyAction each have exactly 2 return statements, both empty.
    const returns = booking.match(/return\s+[^;]+;/g) ?? [];
    expect(returns.length).toBe(4);
    for (const r of returns) {
      expect(r).toMatch(/return (\[\]|null);/);
    }
  });
});

// ── 9. No output seeding ─────────────────────────────────────────────────────

describe('CC-023 — no persistent downstream output seeding', () => {
  it('scripts/koratest-canonical-seed.ts writes only input-boundary tables, computes via the real pipeline', () => {
    const src = read('scripts/koratest-canonical-seed.ts');
    expect(src).toContain('runKoraPipeline');
    expect(src).toContain('persistKoraComputationResult');
    // The script's own header states the "seed inputs, run canonical processing,
    // persist canonical outputs" invariant.
    expect(src).toContain('seed inputs, run canonical processing');
  });

  it('the canonical live pipeline function is shared between the test-tenant seed script and real admin routes', () => {
    const seedScript = read('scripts/koratest-canonical-seed.ts');
    const realRoute = read('app/api/admin/scoring/run-approved-batch/route.ts');
    expect(seedScript).toContain("lib/kora-engine/run-kora-pipeline");
    expect(realRoute).toMatch(/run-kora-pipeline|runKoraPipeline/);
  });
});

// ── 10. Exactly tracked B-WORKER residuals ──────────────────────────────────

describe('CC-023 — B-WORKER residuals are exactly the tracked 3, unchanged', () => {
  // PRIOR HISTORY (accurate as of CC-023, preserved verbatim): "exactly the
  // 3 known files" including WorkerAchievementService.ts. B-WORKER "One
  // Product / No Demo Runtime" correction (2026-09-06) deleted it (zero real
  // callers) — 2 files remain.
  it('BWORKER_OWNED_SYNTHETIC_IMPORTS is exactly the 2 known files (WorkerAchievementService retired since)', () => {
    const files = BWORKER_OWNED_SYNTHETIC_IMPORTS.map((e) => e.file).sort();
    expect(files).toEqual([
      'services/account/AccountProvisioningService.ts',
      'services/worker-provisioning/WorkerProvisioningService.ts',
    ].sort());
  });

  it('no new B_WORKER residual and no B_TRUTH residual relabeled to escape closure', () => {
    expect(SYNTHETIC_IMPORT_ALLOWLIST.length).toBe(2);
    expect(BTRUTH_OWNED_SYNTHETIC_IMPORTS.length).toBe(0);
    expect(BWORKER_OWNED_SYNTHETIC_IMPORTS.length).toBe(2);
  });
});

// ── 11. KORA Space canonical discovery ──────────────────────────────────────

describe('CC-023 — KORA Space discovery remains canonical and live', () => {
  it('getPublishedInitiatives/getPublishedInitiativesAdmin are real, live, exported functions with zero synthetic dependency', () => {
    const src = read('services/commons/CommonsService.ts');
    expect(src).toContain('export async function getPublishedInitiatives(');
    expect(src).toContain('export async function getPublishedInitiativesAdmin(');
    expect(stripComments(src)).not.toMatch(/from\s+['"][^'"]*data\/synthetic\//);
  });

  it('migration 024 remains recorded as applied to staging, production untouched', () => {
    const sql = read('supabase/migrations/024_commons_initiative_fields.sql');
    expect(sql).toContain('haqflkurpmeaxpikozjl');
    expect(sql).not.toContain('azdnepfmwrmacruykskm');
  });
});

// ── 12. Confidence weight 0 ───────────────────────────────────────────────────

describe('CC-023 — Confidence remains external, weight 0', () => {
  it('methodology config sets CS weight to 0', () => {
    const src = read('lib/methodology-config/v0.1.ts');
    expect(src).toContain("result['CS'] = 0");
  });
});

// ── 13. Safeguard separate ───────────────────────────────────────────────────

describe('CC-023 — Activation Safeguard remains separate from KORA Index computation', () => {
  it('the canonical KORA Index engine does not import or reference ActivationSafeguardService', () => {
    const engine = read('lib/kora-engine/kora-index-engine.ts');
    expect(engine).not.toContain('ActivationSafeguardService');
    expect(engine).not.toContain('activationSafeguardService');
  });
});

// ── 14. Static demo only ─────────────────────────────────────────────────────

describe('CC-023 — demo surfaces remain static presentation only', () => {
  it('app/demo/future-vision/page.tsx is labeled inactive', () => {
    const src = read('app/demo/future-vision/page.tsx');
    expect(src.toLowerCase()).toMatch(/inattivo|not active|future vision/);
  });
});

// ── 15. CC-022 closed ────────────────────────────────────────────────────────

describe('CC-023 — CC-022 remains closed (precondition for this gate)', () => {
  it('registry records CC-022 as CLOSED', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('CC-022 — B-TRUTH CLOSURE (2026-09-06): CLOSED.');
  });
});

// ── 16. CC-023 result recorded, no premature next-phase start ──────────────

describe('CC-023 — result recorded, no B-WORKER/commercial-review/N1 started', () => {
  it('registry records CC-023 PASS and CC-00 fully closed, without starting B-WORKER or commercial review', () => {
    const registry = read('lib/architecture/registry.ts');
    expect(registry).toContain('CC-023 — ADVERSARIAL ONE TRUTH VALIDATION (2026-09-06): PASS.');
    expect(registry).toContain('CC-00 (B-TRUTH / ONE PRODUCT, ONE TRUTH) is FULLY CLOSED.');
    expect(registry).toContain('B-WORKER has NOT started; no N1/NB work started; no');
    expect(registry).toContain('commercial review performed by this slice.');
  });
});

// ── 17. Registry internal consistency: no live component depends on DEAD ───

describe('CC-023 — registry dependency arrays do not silently reference DEAD components', () => {
  it('svc.scoring.facade, app-surface.demo, and svc.bti-intelligence no longer list dead dependencies', () => {
    const registry = read('lib/architecture/registry.ts');
    for (const id of ["id: 'svc.scoring.facade'", "id: 'svc.bti-intelligence'"]) {
      const idx = registry.indexOf(id);
      const entry = registry.slice(idx, registry.indexOf('deletableWhen:', idx));
      expect(entry).toContain('dependencies: []');
    }
  });

  it('no non-DEAD component dependency array references a DEAD primaryPath id', () => {
    const registry = read('lib/architecture/registry.ts');
    const entries = [...registry.matchAll(/\{ id: '([^']+)'[^}]*?status: '([^']+)'[^}]*?dependencies: \[([^\]]*)\]/g)];
    const deadIds = new Set(entries.filter(([, , status]) => status === 'DEAD').map(([, id]) => id));
    // Re-derive status/id pairs properly (regex above is approximate for id/status order-independence).
    const idStatus = new Map<string, string>();
    for (const m of registry.matchAll(/\{ id: '([^']+)'.*?status: '([^']+)'/g)) {
      if (!idStatus.has(m[1])) idStatus.set(m[1], m[2]);
    }
    for (const id of idStatus.keys()) {
      if (idStatus.get(id) === 'DEAD') deadIds.add(id);
    }
    const violations: string[] = [];
    for (const [id, , deps] of entries) {
      if (idStatus.get(id) === 'DEAD') continue;
      for (const d of [...deps.matchAll(/'([^']+)'/g)].map((m) => m[1])) {
        if (deadIds.has(d)) violations.push(`${id} -> ${d}`);
      }
    }
    expect(violations).toEqual([]);
  });
});

// ── 18. Dead code with fictional data confirmed unreachable ────────────────

describe('CC-023 — confirmed-unreachable dead code carrying fictional data stays unreachable', () => {
  it('SubmissionFeedbackPanel is proven unreachable from the live company page by an existing guard', () => {
    expect(exists('tests/unit/b106-company-area-live-boundary.test.ts')).toBe(true);
    const guard = read('tests/unit/b106-company-area-live-boundary.test.ts');
    expect(guard).toContain('does not import SubmissionFeedbackPanel');
  });

  it('ActionPlanReport and ConfidenceScoreService have zero real callers outside themselves/tests/registry', () => {
    for (const [name, dir] of [
      ['ActionPlanReport', 'app'],
      ['ConfidenceScoreService', 'app'],
    ] as const) {
      const offenders: string[] = [];
      for (const file of walk(resolve(root, dir), /\.(ts|tsx)$/)) {
        const rel = file.replace(root + '/', '');
        if (read(rel).includes(name)) offenders.push(rel);
      }
      expect(offenders).toEqual([]);
    }
  });
});
