/**
 * B109 — Worker Experience MVP: Initiatives, Participation & Private Activity
 *
 * Test suite strutturale — verifica contratti, privacy invariants, migration SQL.
 * Non richiede Supabase live: tutti i test leggono file statici o importano tipi.
 *
 * Vincoli rispettati:
 *   - Non modifica algoritmo KORA Index v1.0, formule, pesi, scoring
 *   - Non modifica Eligibility Gate, CS, Activation Safeguard, BTI
 *   - Non modifica B99-B108
 *   - Tutti i test sono deterministici e isolati
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

// ── 1. Migration 008 — data model ─────────────────────────────────────────────

describe('B109 — migration 008 data model', () => {
  const migrationPath = 'supabase/migrations/008_worker_initiatives.sql';

  it('migration file 008 exists', () => {
    expect(fileExists(migrationPath)).toBe(true);
  });

  it('defines personal.worker_initiative table', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS personal.worker_initiative');
  });

  it('defines personal.worker_participation table', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS personal.worker_participation');
  });

  it('worker_initiative has pillar CHECK constraint on 5 pillars', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain("CHECK (pillar IN ('LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'))");
  });

  it('worker_initiative has status CHECK constraint (draft/published/closed)', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain("CHECK (status IN ('draft', 'published', 'closed'))");
  });

  it('worker_participation has UNIQUE constraint on (worker_id, initiative_id)', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('UNIQUE (worker_id, initiative_id)');
  });

  it('worker_participation has status CHECK constraint', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain("CHECK (status IN ('interested', 'registered', 'attended', 'cancelled'))");
  });

  it('worker_initiative has FORCE ROW LEVEL SECURITY', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('ALTER TABLE personal.worker_initiative FORCE ROW LEVEL SECURITY');
  });

  it('worker_participation has FORCE ROW LEVEL SECURITY', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('ALTER TABLE personal.worker_participation FORCE ROW LEVEL SECURITY');
  });
});

// ── 2. Migration 008 — RLS privacy invariants ────────────────────────────────

describe('B109 — migration 008 RLS privacy contracts', () => {
  const migrationPath = 'supabase/migrations/008_worker_initiatives.sql';

  it('worker_initiative has KORA_ADMIN policy (ALL)', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain("worker_initiative_kora_admin_all");
    expect(sql).toContain("kora.kora_role() = 'KORA_ADMIN'");
  });

  it('worker_initiative has WORKER SELECT policy (published + own tenant only)', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain("worker_initiative_worker_published_select");
    expect(sql).toContain("status = 'published'");
    expect(sql).toContain("kora.tenant_id()");
  });

  it('worker_participation has WORKER own-row policy only (no company policy)', () => {
    const sql = readFile(migrationPath);
    // Worker own-row policy exists
    expect(sql).toContain("worker_participation_worker_own_all");
    expect(sql).toContain("auth.uid()");
    // No company policy on participation — check absence of COMPANY_ADMIN in participation section
    const participationSection = sql.split('worker_participation')[2] ?? '';
    expect(participationSection).not.toContain('COMPANY_ADMIN');
    expect(participationSection).not.toContain('COMPANY_VIEWER');
  });

  it('no company policy on worker_participation (privacy: never employer-visible)', () => {
    const sql = readFile(migrationPath);
    // The intentional comment about no company policy must be present
    expect(sql).toContain('No COMPANY_ADMIN / COMPANY_VIEWER policy — intentional');
  });

  it('migration documents that private_note is never logged in audit trail', () => {
    const sql = readFile(migrationPath);
    expect(sql).toContain('private_note');
    expect(sql).toContain('NEVER');
  });
});

// ── 3. API route files exist ─────────────────────────────────────────────────

describe('B109 — API route files exist', () => {
  it('GET /api/worker/initiatives route exists', () => {
    expect(fileExists('app/api/worker/initiatives/route.ts')).toBe(true);
  });

  it('POST /api/worker/initiatives/[id]/interest route exists', () => {
    expect(fileExists('app/api/worker/initiatives/[id]/interest/route.ts')).toBe(true);
  });

  it('GET /api/worker/history route exists', () => {
    expect(fileExists('app/api/worker/history/route.ts')).toBe(true);
  });

  it('GET /api/company/workers/activation-aggregate route exists', () => {
    expect(fileExists('app/api/company/workers/activation-aggregate/route.ts')).toBe(true);
  });

  it('GET|POST /api/admin/worker-initiatives route exists', () => {
    expect(fileExists('app/api/admin/worker-initiatives/route.ts')).toBe(true);
  });

  it('PATCH /api/admin/worker-initiatives/[id] route exists', () => {
    expect(fileExists('app/api/admin/worker-initiatives/[id]/route.ts')).toBe(true);
  });
});

// ── 4. Privacy contracts in API routes ───────────────────────────────────────

describe('B109 — API privacy contracts', () => {
  it('worker interest route reads workerId and tenantId from session — not from body', () => {
    const src = readFile('app/api/worker/initiatives/[id]/interest/route.ts');
    // Must extract from auth object (from session), not from body
    expect(src).toContain('const { tenantId, workerId } = auth');
    // Must NOT trust worker_id from body
    expect(src).toContain('worker_id: workerId');
    // Comment explaining the body rejection
    expect(src).toContain('worker_id and tenant_id from body are silently rejected');
  });

  it('company activation-aggregate never imports private_note', () => {
    const src = readFile('app/api/company/workers/activation-aggregate/route.ts');
    // The select query must NOT include private_note
    const selectMatch = src.match(/\.select\([^)]+\)/g) ?? [];
    for (const s of selectMatch) {
      expect(s).not.toContain('private_note');
    }
  });

  it('company activation-aggregate applies SAFE_AGGREGATION_THRESHOLD', () => {
    const src = readFile('app/api/company/workers/activation-aggregate/route.ts');
    expect(src).toContain('SAFE_AGGREGATION_THRESHOLD');
    expect(src).toContain('10');
  });

  it('company activation-aggregate never returns individual worker rows', () => {
    const src = readFile('app/api/company/workers/activation-aggregate/route.ts');
    // Never selects worker_id from participation
    expect(src).toContain('initiative_id, status');
    // Privacy note in response
    expect(src).toContain('privacy_note');
  });

  it('worker history route reads workerId from session only', () => {
    const src = readFile('app/api/worker/history/route.ts');
    expect(src).toContain('const { workerId } = auth');
    expect(src).toContain('.eq(\'worker_id\', workerId)');
  });

  it('worker initiatives route reads tenantId and workerId from session only', () => {
    const src = readFile('app/api/worker/initiatives/route.ts');
    expect(src).toContain('const { tenantId, workerId } = auth');
  });
});

// ── 5. TypeScript types ───────────────────────────────────────────────────────

describe('B109 — TypeScript types exported from lib/supabase/types.ts', () => {
  it('WorkerInitiativeRow is exported', () => {
    const src = readFile('lib/supabase/types.ts');
    expect(src).toContain('export interface WorkerInitiativeRow');
  });

  it('WorkerParticipationRow is exported', () => {
    const src = readFile('lib/supabase/types.ts');
    expect(src).toContain('export interface WorkerParticipationRow');
  });

  it('WorkerIdentityRow is exported', () => {
    const src = readFile('lib/supabase/types.ts');
    expect(src).toContain('export interface WorkerIdentityRow');
  });

  it('WorkerParticipationRow includes private_note field', () => {
    const src = readFile('lib/supabase/types.ts');
    // private_note must be in the interface (worker-controlled)
    const block = src.slice(src.indexOf('WorkerParticipationRow'), src.indexOf('WorkerParticipationInsert'));
    expect(block).toContain('private_note');
  });

  it('Database type map includes worker_initiative in personal schema', () => {
    const src = readFile('lib/supabase/types.ts');
    expect(src).toContain('worker_initiative:');
    expect(src).toContain('WorkerInitiativeRow');
  });

  it('Database type map includes worker_participation in personal schema', () => {
    const src = readFile('lib/supabase/types.ts');
    expect(src).toContain('worker_participation:');
    expect(src).toContain('WorkerParticipationRow');
  });
});

// ── 6. Admin page and worker workspace ───────────────────────────────────────

describe('B109 — UI pages', () => {
  it('admin worker-initiatives page exists', () => {
    expect(fileExists('app/admin/worker-initiatives/page.tsx')).toBe(true);
  });

  it('admin worker-initiatives page is KORA_ADMIN gated', () => {
    const src = readFile('app/admin/worker-initiatives/page.tsx');
    expect(src).toContain('requireKoraAdmin');
    expect(src).toContain('isKoraAuthError');
  });

  it('admin worker-initiatives client component exists', () => {
    expect(fileExists('app/admin/worker-initiatives/_components/WorkerInitiativesClient.tsx')).toBe(true);
  });

  it('worker workspace page renders initiatives section', () => {
    const src = readFile('app/worker/workspace/page.tsx');
    expect(src).toContain('Le tue iniziative');
  });

  it('worker workspace page renders storico section', () => {
    const src = readFile('app/worker/workspace/page.tsx');
    expect(src).toContain('Il mio storico');
  });

  it('worker workspace page never imports worker_participation from personal schema for employer view', () => {
    const src = readFile('app/worker/workspace/page.tsx');
    // Should always filter by worker.workerId (own row)
    expect(src).toContain('.eq(\'worker_id\', worker.workerId)');
  });

  it('worker workspace page shows privacy notice', () => {
    const src = readFile('app/worker/workspace/page.tsx');
    expect(src).toContain('Il tuo datore di lavoro non può vedere questi dati individuali');
  });
});

// ── 7. Auth guards ───────────────────────────────────────────────────────────

describe('B109 — auth guard consistency', () => {
  it('all worker API routes use requireWorkerUser', () => {
    const routes = [
      'app/api/worker/initiatives/route.ts',
      'app/api/worker/initiatives/[id]/interest/route.ts',
      'app/api/worker/history/route.ts',
    ];
    for (const route of routes) {
      const src = readFile(route);
      expect(src, `${route} must use requireWorkerUser`).toContain('requireWorkerUser');
      expect(src, `${route} must use isKoraAuthError`).toContain('isKoraAuthError');
    }
  });

  it('company activation-aggregate uses requireCompanyUser', () => {
    const src = readFile('app/api/company/workers/activation-aggregate/route.ts');
    expect(src).toContain('requireCompanyUser');
    expect(src).toContain('isKoraAuthError');
  });

  it('all admin worker-initiatives routes use requireKoraAdmin', () => {
    const routes = [
      'app/api/admin/worker-initiatives/route.ts',
      'app/api/admin/worker-initiatives/[id]/route.ts',
    ];
    for (const route of routes) {
      const src = readFile(route);
      expect(src, `${route} must use requireKoraAdmin`).toContain('requireKoraAdmin');
      expect(src, `${route} must use isKoraAuthError`).toContain('isKoraAuthError');
    }
  });
});
