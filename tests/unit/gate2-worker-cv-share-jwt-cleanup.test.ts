/**
 * Gate 2 — Worker CV Share JWT cleanup + /api/test route audit
 *
 * Verifies:
 *   A. /api/test/* routes have been removed from main
 *   B. Migration 011 role reads use kora.kora_role() (canonical helper)
 *   C. Migration 011 kora_worker_id reads are documented as an intentional exception
 *      with a Gate 2 CTO design question
 *   D. Gate 2 Review Pack reflects the final state
 *
 * These tests do NOT run SQL, touch any database, or apply migrations.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());

// Recursively find all files under dir matching the predicate.
function findFiles(dir: string, predicate: (path: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFiles(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

function read(rel: string): string {
  return readFileSync(resolve(root, rel), 'utf-8');
}

function migration(name: string): string {
  return read(`supabase/migrations/${name}`);
}

function stripLineComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trimStart().startsWith('--'))
    .join('\n');
}

// ── A. /api/test/* route audit ────────────────────────────────────────────────

describe('/api/test/* routes — confirmed absent from main', () => {
  it('no app/api/test directory exists', () => {
    expect(existsSync(resolve(root, 'app/api/test'))).toBe(false);
  });

  it('no route.ts files under app/api/test exist', () => {
    const testApiDir = resolve(root, 'app/api/test');
    const routes = findFiles(testApiDir, f => f.endsWith('route.ts'));
    expect(routes, `Found test route files: ${routes.join(', ')}`).toHaveLength(0);
  });

  it('no pages/api directory exists', () => {
    expect(existsSync(resolve(root, 'pages/api'))).toBe(false);
  });

  it('no route file contains KORA_ENABLE_TEST_ROUTES', () => {
    const allRoutes = findFiles(resolve(root, 'app/api'), f => f.endsWith('route.ts'));
    const offenders = allRoutes.filter(f => readFileSync(f, 'utf-8').includes('KORA_ENABLE_TEST_ROUTES'));
    expect(offenders, `Routes still reference KORA_ENABLE_TEST_ROUTES: ${offenders.join(', ')}`).toHaveLength(0);
  });

  it('no route file contains x-kora-test-secret', () => {
    const allRoutes = findFiles(resolve(root, 'app/api'), f => f.endsWith('route.ts'));
    const offenders = allRoutes.filter(f => readFileSync(f, 'utf-8').includes('x-kora-test-secret'));
    expect(offenders, `Routes still reference x-kora-test-secret: ${offenders.join(', ')}`).toHaveLength(0);
  });

  it('no route file contains test-route-guard', () => {
    const allRoutes = findFiles(resolve(root, 'app/api'), f => f.endsWith('route.ts'));
    const offenders = allRoutes.filter(f => readFileSync(f, 'utf-8').includes('test-route-guard'));
    expect(offenders, `Routes still reference test-route-guard: ${offenders.join(', ')}`).toHaveLength(0);
  });

  it('doc states test routes are absent from main', () => {
    const doc = read('docs/archive/qa/test-routes-removal-before-production.md');
    expect(doc).toMatch(/removed from.*main|absent.*from.*main|removed from `main`/i);
  });

  it('doc separates completed removal from pre-staging and pre-production checklist items', () => {
    const doc = read('docs/archive/qa/test-routes-removal-before-production.md');
    expect(doc).toContain('Pre-Staging Checklist');
    expect(doc).toContain('Pre-Production Checklist');
  });

  it('doc marks route removal as completed [x]', () => {
    const doc = read('docs/archive/qa/test-routes-removal-before-production.md');
    expect(doc).toMatch(/\[x\].*Remove all.*\/api\/test/i);
  });

  it('doc does not contain language implying routes still exist', () => {
    const doc = read('docs/archive/qa/test-routes-removal-before-production.md');
    // Should not say "routes that exist" as a present-tense claim
    expect(doc).not.toMatch(/routes that exist for development/i);
    // Should not say "These routes must be removed" as a future-tense imperative without noting they already are
    expect(doc).not.toMatch(/^These routes must be removed/m);
  });
});

// ── B. Migration 011 — role reads use canonical helper ────────────────────────

describe('migration 011 — role checks use kora.kora_role()', () => {
  const execSql = () => stripLineComments(migration('011_worker_cv_share.sql'));

  it('uses kora.kora_role() for KORA_ADMIN check', () => {
    expect(execSql()).toMatch(/kora\.kora_role\(\)\s*=\s*'KORA_ADMIN'/);
  });

  it('uses kora.kora_role() for WORKER check', () => {
    expect(execSql()).toMatch(/kora\.kora_role\(\)\s*=\s*'WORKER'/);
  });

  it('no longer has raw kora_role read via auth.jwt() -> app_metadata in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'kora_role'/);
  });

  it('no raw auth.jwt() ->> kora_role in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->>\s*'kora_role'/);
  });

  it('no auth.jwt() ->> role (wrong role key) in executable SQL', () => {
    expect(execSql()).not.toMatch(/auth\.jwt\(\)\s*->>\s*'role'/);
  });

  it('KORA_ADMIN policy is present', () => {
    expect(execSql()).toContain('worker_cv_share_kora_admin_read');
  });

  it('WORKER policy is present', () => {
    expect(execSql()).toContain('worker_cv_share_worker_own_all');
  });
});

// ── C. Migration 011 — kora_worker_id raw read documented as exception ────────

describe('migration 011 — kora_worker_id read is intentionally retained and documented', () => {
  const sql = () => migration('011_worker_cv_share.sql');

  it('raw kora_worker_id read is still present in executable SQL', () => {
    // This is an intentional retention — the test asserts it is still there.
    expect(stripLineComments(sql())).toMatch(
      /auth\.jwt\(\)\s*->\s*'app_metadata'\s*->>\s*'kora_worker_id'/,
    );
  });

  it('comment near kora_worker_id read explains no canonical helper exists', () => {
    const fullSql = sql();
    const workerIdSection = fullSql.slice(
      fullSql.indexOf('kora_worker_id'),
      fullSql.indexOf('kora_worker_id') + 1500,
    );
    expect(workerIdSection).toMatch(/no canonical helper|canonical helper.*does not exist|kora\.worker_id\(\).*does not exist/i);
  });

  it('comment near kora_worker_id read mentions Gate 2 CTO', () => {
    const fullSql = sql();
    expect(fullSql).toMatch(/GATE 2 CTO|Gate 2 CTO/i);
  });

  it('comment mentions future kora.worker_id() decision', () => {
    const fullSql = sql();
    expect(fullSql).toMatch(/kora\.worker_id\(\)/i);
  });

  it('comment explains kora_worker_id is set at provisioning time', () => {
    const fullSql = sql();
    expect(fullSql).toMatch(/provisioning|provision/i);
  });
});

// ── D. Gate 2 Review Pack reflects final state ────────────────────────────────

describe('Gate 2 Review Pack — migration 011 state correctly documented', () => {
  const doc = () => read('docs/archive/gate2/GATE2_SQL_REVIEW_PACK.md');

  it('migration 011 row no longer implies uncleaned raw role reads', () => {
    const content = doc();
    const row011Line = content.split('\n').find(l => l.includes('| 011 |'));
    expect(row011Line).toBeDefined();
    // Should contain the update note, not the original "uses raw auth.jwt()" wording
    expect(row011Line).toMatch(/Fixed|updated|Role reads updated/i);
    expect(row011Line).not.toMatch(/ISSUE.*auth\.jwt\(\)/i);
  });

  it('checklist has [x] item for migration 011 role reads fix', () => {
    const content = doc();
    expect(content).toMatch(/\[x\].*Migration 011 role reads/i);
  });

  it('checklist still has open item for kora_worker_id helper decision', () => {
    const content = doc();
    expect(content).toMatch(/\[ \].*kora_worker_id.*JWT field.*canonical helper decision/i);
  });

  it('§7 contains the CTO design question about kora.worker_id() helper', () => {
    const content = doc();
    const openQSection = content.slice(content.indexOf('## 7. Open Questions'));
    expect(openQSection).toMatch(/kora\.worker_id\(\)/);
    expect(openQSection).toMatch(/CTO design decision/i);
  });

  it('§7 Q2 about provisioning path is marked partially resolved', () => {
    const content = doc();
    const openQSection = content.slice(content.indexOf('## 7. Open Questions'));
    const q2Block = openQSection.slice(0, openQSection.indexOf('\n3.'));
    expect(q2Block).toMatch(/Partially resolved|resolved/i);
  });

  it('migration 011 remains NEEDS_LEGAL_PRIVACY_REVIEW (not reclassified)', () => {
    const content = doc();
    const row011Line = content.split('\n').find(l => l.includes('| 011 |'));
    expect(row011Line).toContain('NEEDS_LEGAL_PRIVACY_REVIEW');
    expect(row011Line).not.toContain('SAFE_TO_REVIEW');
    expect(row011Line).not.toContain('DO_NOT_APPLY_YET');
  });

  it('test-routes doc reference or its current status is clean', () => {
    // The doc should no longer imply routes still need to be removed
    const testRoutesDoc = read('docs/archive/qa/test-routes-removal-before-production.md');
    expect(testRoutesDoc).toMatch(/removed from.*main|absent.*main/i);
  });
});
