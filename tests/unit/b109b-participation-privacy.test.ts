/**
 * B109-B — Worker Participation Privacy & RLS Hardening
 *
 * Test invarianti strutturali — verifica che le partecipazioni worker
 * siano realmente private e che la company non possa vedere chi ha partecipato,
 * espresso interesse, scritto note private o costruito uno storico individuale.
 *
 * Domanda guida:
 *   "Una company può, direttamente o indirettamente, vedere chi ha partecipato,
 *    espresso interesse, scritto note private o costruito uno storico individuale?"
 *
 * Tutti i test sono deterministici e isolati (lettura file statici).
 * Non richiedono Supabase live. Non modificano nessun file.
 *
 * Vincoli rispettati:
 *   - Non modifica KORA Index v1.0, scoring, Data Intake, metodologia
 *   - Non modifica B99-B108
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function readFile(relPath: string): string {
  return readFileSync(resolve(root, relPath), 'utf-8');
}

function fileExists(relPath: string): boolean {
  return existsSync(resolve(root, relPath));
}

// Strip single-line comments to avoid false positives on comment strings.
// Does NOT strip multi-line /* */ comments but those are rare in these files.
function stripLineComments(src: string): string {
  return src.replace(/\/\/[^\n]*/g, '');
}

// Strip SQL single-line comments (-- ...) for migration file assertions.
function stripSQLComments(sql: string): string {
  return sql.replace(/--[^\n]*/g, '');
}

// Extract all .select() call argument strings from source
function extractSelectArgs(src: string): string[] {
  const matches: string[] = [];
  const re = /\.select\(`([^`]+)`|\.select\('([^']+)'|\.select\("([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    matches.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return matches;
}

// ── 1. Migration 008 — RLS Company Privacy Invariants ────────────────────────

describe('B109-B — migration 008: no company access to worker_participation', () => {
  const migration = 'supabase/migrations/008_worker_initiatives.sql';

  it('migration file 008 exists', () => {
    expect(fileExists(migration)).toBe(true);
  });

  it('no COMPANY_ADMIN policy on personal.worker_participation', () => {
    const sql = readFile(migration);
    // Extract only the worker_participation RLS section (after its CREATE TABLE)
    const afterPartTable = sql.slice(sql.indexOf('CREATE TABLE IF NOT EXISTS personal.worker_participation'));
    expect(afterPartTable).not.toContain("kora.kora_role() = 'COMPANY_ADMIN'");
    expect(afterPartTable).not.toContain("kora.kora_role() = 'COMPANY_VIEWER'");
  });

  it('no COMPANY_VIEWER policy on personal.worker_participation', () => {
    const sql = readFile(migration);
    // Strip SQL comments — they document the absence ("No COMPANY_VIEWER policy — intentional")
    // We check that no actual POLICY statement grants COMPANY_VIEWER access
    const sqlNoComments = stripSQLComments(sql);
    const afterPartTable = sqlNoComments.slice(sqlNoComments.indexOf('personal.worker_participation'));
    expect(afterPartTable).not.toContain("COMPANY_VIEWER");
  });

  it('personal.worker_initiative WORKER SELECT policy restricts to published only', () => {
    const sql = readFile(migration);
    expect(sql).toContain("AND status = 'published'");
    expect(sql).toContain("worker_initiative_worker_published_select");
  });

  it('WORKER cannot see draft initiatives (no draft in WORKER policy)', () => {
    const sql = readFile(migration);
    const workerPolicy = sql.slice(
      sql.indexOf('worker_initiative_worker_published_select'),
      sql.indexOf('No COMPANY_ADMIN / COMPANY_VIEWER policy'),
    );
    expect(workerPolicy).toContain("status = 'published'");
    expect(workerPolicy).not.toContain("status = 'draft'");
    expect(workerPolicy).not.toContain("status = 'closed'");
  });

  it('WORKER participation policy uses auth.uid() subquery on worker_identity', () => {
    const sql = readFile(migration);
    expect(sql).toContain('auth_user_id = auth.uid()');
    expect(sql).toContain('SELECT id FROM personal.worker_identity');
  });

  it('migration explicitly documents NO COMPANY ACCESS on both tables', () => {
    const sql = readFile(migration);
    expect(sql.match(/No COMPANY_ADMIN \/ COMPANY_VIEWER policy — intentional/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('FORCE ROW LEVEL SECURITY active on worker_initiative', () => {
    const sql = readFile(migration);
    expect(sql).toContain('ALTER TABLE personal.worker_initiative FORCE ROW LEVEL SECURITY');
  });

  it('FORCE ROW LEVEL SECURITY active on worker_participation', () => {
    const sql = readFile(migration);
    expect(sql).toContain('ALTER TABLE personal.worker_participation FORCE ROW LEVEL SECURITY');
  });

  it('private_note documented as worker-only field', () => {
    const sql = readFile(migration);
    expect(sql).toContain('private_note');
    expect(sql.toLowerCase()).toContain('never');
  });
});

// ── 2. Worker API — session-only identity enforcement ────────────────────────

describe('B109-B — worker API: session-only workerId/tenantId', () => {
  it('POST interest: workerId extracted from auth session, not body', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    expect(src).toContain('const { tenantId, workerId } = auth');
    expect(src).toContain('worker_id: workerId');
    expect(src).toContain('tenant_id: tenantId');
  });

  it('POST interest: body worker_id is silently rejected (not read from body)', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    // Only status and private_note extracted from body — worker_id/tenant_id ignored
    expect(src).toContain('body.status');
    expect(src).toContain('body.private_note');
    expect(src).not.toContain('body.worker_id');
    expect(src).not.toContain('body.tenant_id');
  });

  it('POST interest: documents body rejection in comment', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    expect(src).toContain('worker_id and tenant_id from body are silently rejected');
  });

  it('POST interest: initiative tenant_id must match worker session tenant', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    expect(src).toContain(".eq('tenant_id', tenantId)");
    expect(src).toContain(".eq('status', 'published')");
  });

  it('POST interest: attended is NOT a self-declarable status (B109-B requirement)', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    // ALLOWED_STATUSES must NOT include 'attended' for worker self-declaration
    const allowedMatch = src.match(/const ALLOWED_STATUSES[^=]*=\s*\[([^\]]+)\]/);
    expect(allowedMatch, 'ALLOWED_STATUSES constant must exist').not.toBeNull();
    const statusList = allowedMatch![1];
    expect(statusList).not.toContain('attended');
    expect(statusList).toContain('interested');
    expect(statusList).toContain('registered');
    expect(statusList).toContain('cancelled');
  });

  it('POST interest: private_note has maximum length validation', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    // Must have a constant or inline check for note length
    expect(src).toMatch(/PRIVATE_NOTE_MAX_LENGTH|private_note.*\.length|\.length.*PRIVATE_NOTE/);
  });

  it('GET history: workerId strictly from session, never from params or body', () => {
    const src = readFile('app/api/worker/history/route.ts');
    expect(src).toContain('const { workerId } = auth');
    // B163: isolamento via RLS worker_participation_worker_own_all (mig 008, auth.uid()).
    // Filtro esplicito rimosso — usa getSupabaseServerClient.
    const stripped = src.replace(/\/\/[^\n]*/g, '');
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
    expect(src).not.toContain('searchParams.get(');
    expect(src).not.toContain('body.worker_id');
  });

  it('GET history: returns private_note (worker is data owner)', () => {
    const src = readFile('app/api/worker/history/route.ts');
    // Worker owns their own private_note — correct to return it
    expect(src).toContain('private_note');
  });

  it('GET history: participation rows isolate via RLS (B163: server client + mig 008)', () => {
    const src = readFile('app/api/worker/history/route.ts');
    // B163: filtro esplicito rimosso; RLS worker_participation_worker_own_all garantisce isolamento.
    const stripped = src.replace(/\/\/[^\n]*/g, '');
    expect(stripped).toContain('getSupabaseServerClient');
    const mig008 = readFile('supabase/migrations/008_worker_initiatives.sql');
    expect(mig008).toContain('worker_participation_worker_own_all');
  });

  it('GET initiatives: tenantId e workerId dalla sessione (B163: server client + RLS)', () => {
    const src = readFile('app/api/worker/initiatives/route.ts');
    expect(src).toContain('const { tenantId, workerId } = auth');
    // B163: .eq('worker_id', workerId) su worker_participation rimosso (RLS lo fa).
    // tenant_id e status mantenuti su worker_initiative (business logic).
    const stripped = src.replace(/\/\/[^\n]*/g, '');
    expect(stripped).toContain('getSupabaseServerClient');
    expect(stripped).not.toContain('getSupabaseServiceClient');
    expect(src).toContain(".eq('tenant_id', tenantId)");
  });

  it('GET initiatives: participation select does not include private_note', () => {
    const src = readFile('app/api/worker/initiatives/route.ts');
    // The participation fetch for the list only needs status, not private_note
    const selects = extractSelectArgs(src);
    // Find the participation select — should be 'initiative_id, status' only
    const participationSelect = selects.find(s => s.includes('initiative_id') && s.includes('status'));
    expect(participationSelect, 'participation select must exist').toBeDefined();
    expect(participationSelect).not.toContain('private_note');
  });
});

// ── 3. Company aggregate — no individual data leakage ────────────────────────

describe('B109-B — company aggregate: zero individual data leakage', () => {
  const aggSrc = readFile('app/api/company/workers/activation-aggregate/route.ts');
  const aggStripped = stripLineComments(aggSrc);

  it('company aggregate requires COMPANY role (not WORKER or KORA_ADMIN)', () => {
    expect(aggSrc).toContain('requireCompanyUser');
    expect(aggSrc).toContain('isKoraAuthError');
    expect(aggSrc).not.toContain('requireWorkerUser');
    expect(aggSrc).not.toContain('requireKoraAdmin');
  });

  it('company aggregate usa fn_company_activation_summary (B152-B: no direct participation select)', () => {
    // B152-B: migrated to analytics.fn_company_activation_summary() RPC.
    // No .select() on worker_participation exists in the route — suppression and
    // aggregation moved to SQL (migration 015). Verified by checking for RPC call.
    expect(aggSrc).toContain('fn_company_activation_summary');
    expect(aggSrc).not.toContain("from('worker_participation')");
    expect(aggSrc).not.toContain("from('worker_initiative')");
  });

  it('company aggregate code (excl. comments) never accesses display_name', () => {
    // Strip comments to avoid false positives from privacy contract docs
    expect(aggStripped).not.toContain('display_name');
  });

  it('company aggregate code (excl. comments) never accesses private_note', () => {
    expect(aggStripped).not.toContain('private_note');
  });

  it('company aggregate response never contains a participations key (individual rows)', () => {
    // The response uses 'aggregate:' as the top-level key — never 'participations:'
    // Check the response shape: aggregate.pillar_breakdown, not participations
    expect(aggSrc).toContain('pillar_breakdown');
    // The key 'participations' must not appear as a JSON response property
    // Use stripped source so we don't catch type annotations
    const responseSection = aggStripped.slice(aggStripped.lastIndexOf('return NextResponse.json'));
    expect(responseSection).not.toContain('participations:');
    // But it must have aggregate:
    expect(responseSection).toContain('aggregate:');
  });

  it('company aggregate suppression è in SQL non in TS (B152-B: safeCount rimosso)', () => {
    // B152-B: safeCount() TS function removed. Suppression N<10 → NULL enforced in
    // analytics.fn_company_activation_summary() SQL (migration 015, BETWEEN 1 AND 9 THEN NULL).
    // The route reads total_engagements_suppressed from the SQL function output.
    expect(aggSrc).not.toContain('function safeCount');
    expect(aggSrc).not.toContain('const SAFE_AGGREGATION_THRESHOLD = 10');
    expect(aggSrc).toContain('total_engagements_suppressed');
  });

  it('company aggregate suppressed pillars do NOT use -1 sentinel value', () => {
    // After B109-B hardening: suppressed entries must omit total_participations
    // rather than using -1 which leaks "some participation exists below threshold"
    // Strip line comments — the header doc mentions "-1 sentinel" as the OLD pattern
    const codeOnly = stripLineComments(aggSrc);
    expect(codeOnly).not.toContain(': -1');
    expect(codeOnly).not.toContain('? -1');
    expect(codeOnly).not.toMatch(/total_participations.*-1|-1.*total_participations/);
  });

  it('company aggregate suppressed pillars include suppression_reason field', () => {
    expect(aggSrc).toContain('suppression_reason');
    expect(aggSrc).toContain('privacy_threshold');
  });

  it('company aggregate suppressed pillars include suppression_threshold field', () => {
    expect(aggSrc).toContain('suppression_threshold');
  });

  it('company aggregate privacy_note is present in response', () => {
    expect(aggSrc).toContain('privacy_note');
  });

  it('company aggregate tenantId è dalla sessione, mai da request params (B152-B: in SQL via kora.tenant_id())', () => {
    // B152-B: tenantId enforced in SQL via kora.tenant_id() — route no longer needs it as variable.
    // What matters: route uses requireCompanyUser (session) and never reads tenantId from params.
    expect(aggSrc).toContain('requireCompanyUser');
    expect(aggSrc).not.toContain("searchParams.get('tenantId')");
    expect(aggSrc).not.toContain("searchParams.get('tenant_id')");
    expect(aggSrc).not.toContain('getSupabaseServiceClient');
  });
});

// ── 4. Admin boundary — no participation exposure ────────────────────────────

describe('B109-B — admin routes: no individual participation exposure', () => {
  it('admin worker-initiatives GET does not query worker_participation', () => {
    const src = readFile('app/api/admin/worker-initiatives/route.ts');
    expect(src).not.toContain("from('worker_participation')");
    expect(src).not.toContain('.from(\'worker_participation\')');
  });

  it('admin worker-initiatives GET and POST selects do not include private_note', () => {
    const src = readFile('app/api/admin/worker-initiatives/route.ts');
    // worker_initiative table has no private_note column — confirmed in migration
    // Any select on worker_initiative must not fetch private_note
    const selects = extractSelectArgs(src);
    for (const s of selects) {
      expect(s).not.toContain('private_note');
    }
  });

  it('admin worker-diagnostics selects only status from worker_identity (aggregate-safe)', () => {
    const src = readFile('app/api/admin/worker-diagnostics/route.ts');
    // Confirms only 'status' is fetched — no PII columns
    const selects = extractSelectArgs(src);
    const identitySelect = selects.find(s => s.trim() === 'status');
    expect(identitySelect, 'worker_identity select must be exactly "status"').toBeDefined();
  });

  it('admin worker-diagnostics does not select worker_ref or auth_user_id', () => {
    const src = readFile('app/api/admin/worker-diagnostics/route.ts');
    const selects = extractSelectArgs(src);
    for (const s of selects) {
      expect(s).not.toContain('worker_ref');
      expect(s).not.toContain('auth_user_id');
      expect(s).not.toContain('email');
    }
  });

  it('admin worker-initiatives page is KORA_ADMIN gated', () => {
    const src = readFile('app/admin/worker-initiatives/page.tsx');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('isKoraAuthError');
  });
});

// ── 5. Company route isolation ───────────────────────────────────────────────

describe('B109-B — company routes: zero direct participation imports', () => {
  it('company workspace route does not access worker_participation', () => {
    if (!fileExists('app/api/company/workspace/route.ts')) return;
    const src = readFile('app/api/company/workspace/route.ts');
    expect(src).not.toContain("from('worker_participation')");
  });

  it('company workers aggregate route does not access worker_participation', () => {
    if (!fileExists('app/api/company/workers/aggregate/route.ts')) return;
    const src = readFile('app/api/company/workers/aggregate/route.ts');
    expect(src).not.toContain('worker_participation');
  });

  it('no company route accesses worker_profile_private', () => {
    const companyRoutes = [
      'app/api/company/workspace/route.ts',
      'app/api/company/workers/aggregate/route.ts',
      'app/api/company/workers/activation-aggregate/route.ts',
    ];
    for (const route of companyRoutes) {
      if (existsSync(resolve(root, route))) {
        const src = readFile(route);
        expect(src, `${route} must not access worker_profile_private`).not.toContain('worker_profile_private');
      }
    }
  });

  it('worker workspace fetches only own participation rows (session workerId)', () => {
    const src = readFile('app/worker/workspace/page.tsx');
    expect(src).toContain(".eq('worker_id', worker.workerId)");
    expect(src).not.toContain('params.workerId');
    expect(src).not.toContain('body.workerId');
  });
});

// ── 6. Auth guards consistent across all routes ──────────────────────────────

describe('B109-B — auth guards: correct role enforcement on all routes', () => {
  const workerRoutes = [
    'app/api/worker/initiatives/route.ts',
    'app/api/worker/initiatives/[id]/interest/route.ts',
    'app/api/worker/history/route.ts',
  ];

  for (const route of workerRoutes) {
    it(`${route}: uses requireWorkerUser`, () => {
      const src = readFile(route);
      expect(src).toContain('requireWorkerUser');
      expect(src).toContain('isKoraAuthError');
    });
  }

  it('company activation-aggregate: uses requireCompanyUser (not worker role)', () => {
    const src = readFile('app/api/company/workers/activation-aggregate/route.ts');
    expect(src).toContain('requireCompanyUser');
    expect(src).not.toContain('requireWorkerUser');
  });

  const adminRoutes = [
    'app/api/admin/worker-initiatives/route.ts',
    'app/api/admin/worker-initiatives/[id]/route.ts',
  ];
  for (const route of adminRoutes) {
    it(`${route}: uses requireKoraAdmin`, () => {
      const src = readFile(route);
      expect(src).toContain('requireKoraAdmin');
      expect(src).toContain('isKoraAuthError');
    });
  }
});
