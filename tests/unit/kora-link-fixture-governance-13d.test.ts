/**
 * KORA-LINK-HARDENING-AUTOMATION-13D — staging fixture governance.
 *
 * STATIC tests only — reads scripts/docs as text and asserts structural
 * safety-gate properties. Same taxonomy convention as
 * tests/unit/kora-link-audit-hardening-13a.test.ts: these prove the source
 * says what we intend (gates present, allowlist-scoped, no credentials), not
 * that it behaves correctly against a real database. Live behavior of
 * check-staging-fixtures.ts was validated once manually against staging as
 * part of 13D's own FASE 7 (read-only) — not itself a repo-committed
 * automated test, per the same convention as run-live-staging-suite.ts.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

function readSource(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), 'utf8');
}

const CHECK_PATH = 'scripts/kora-link/check-staging-fixtures.ts';
const CLEANUP_PATH = 'scripts/kora-link/cleanup-staging-fixtures.ts';
const DOC_PATH = 'docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md';
const LIVE_STAGING_SUITE_PATH = 'scripts/kora-link/run-live-staging-suite.ts';

const checkSrc = readSource(CHECK_PATH);
const cleanupSrc = readSource(CLEANUP_PATH);
const docSrc = readSource(DOC_PATH);
const liveStagingSuiteSrc = readSource(LIVE_STAGING_SUITE_PATH);

describe('check-staging-fixtures.ts — read-only, refuses production', () => {
  it('is read-only: contains no INSERT/UPDATE/DELETE statement', () => {
    expect(/\b(INSERT INTO|UPDATE\s+\w|DELETE FROM)\b/i.test(checkSrc)).toBe(false);
  });

  it('requires KORA_LINK_FIXTURE_CHECK_CONFIRM to equal exactly YES', () => {
    expect(checkSrc).toContain("process.env.KORA_LINK_FIXTURE_CHECK_CONFIRM !== 'YES'");
    expect(checkSrc).toMatch(/KORA_LINK_FIXTURE_CHECK_CONFIRM[\s\S]{0,200}process\.exit\(1\)/);
  });

  it('requires an explicit staging DB URL and project ref (no hardcoded default)', () => {
    expect(checkSrc).toContain('process.env.KORA_LINK_STAGING_DB_URL');
    expect(checkSrc).toContain('process.env.KORA_LINK_STAGING_PROJECT_REF');
    expect(checkSrc).not.toMatch(/postgresql:\/\/[^.]*\.supabase\.co/);
  });

  it('rejects the Transaction pooler port 6543', () => {
    expect(checkSrc).toContain("url.port === '6543'");
  });

  it('verifies the connection project ref matches the expected ref', () => {
    expect(checkSrc).toMatch(/usernameRef === expectedRef \|\| hostRef === expectedRef/);
  });

  it('refuses to run against anything that looks like production', () => {
    expect(checkSrc).toMatch(/\/prod\/i\.test\(expectedRef\)/);
    expect(checkSrc).toMatch(/\/prod\/i\.test\(dbUrl\)/);
  });

  it('rejects a password that looks like a service-role JWT', () => {
    expect(checkSrc).toContain("startsWith('eyJ')");
  });

  it('masks identifiers instead of printing full UUIDs or emails', () => {
    expect(checkSrc).toMatch(/function mask\(/);
    expect(checkSrc).toMatch(/function maskEmail\(/);
    // report fields use the masked variants, not raw id/email columns
    expect(checkSrc).toMatch(/id_masked:\s*mask\(/);
    expect(checkSrc).toMatch(/email_masked:\s*maskEmail\(/);
  });

  it('verifies 0 residual rows across all 8 kora_link.* tables', () => {
    for (const table of [
      'link_batches',
      'links',
      'link_assignments',
      'link_activation_acknowledgements',
      'link_events',
      'revocations',
      'link_replacements',
      'audit_log',
    ]) {
      expect(checkSrc).toContain(`'${table}'`);
    }
    expect(checkSrc).toContain('EXPECTED_RESIDUAL_KORA_LINK = 0');
  });

  it('exits with code 1 when the overall check is incoherent', () => {
    expect(checkSrc).toContain('if (!report.overall_coherent)');
    expect(checkSrc).toMatch(/if \(!report\.overall_coherent\)[\s\S]{0,400}process\.exit\(1\)/);
  });

  it('expects exactly 0 permanent company_identity and partner_identity mappings, and gates on it', () => {
    expect(checkSrc).toContain('EXPECTED_COMPANY_IDENTITY_PERMANENT_TOTAL = 0');
    expect(checkSrc).toContain('EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL = 0');
    expect(checkSrc).toMatch(/coherent:\s*rows\.length === EXPECTED_COMPANY_IDENTITY_PERMANENT_TOTAL/);
    expect(checkSrc).toMatch(/coherent:\s*rows\.length === EXPECTED_PARTNER_IDENTITY_PERMANENT_TOTAL/);
  });

  it('folds company_identity and partner_identity coherence into overall_coherent (an unexpected permanent mapping fails the check)', () => {
    expect(checkSrc).toMatch(/overallCoherent =[\s\S]{0,300}companyIdentity\.coherent[\s\S]{0,300}partnerIdentity\.coherent/);
  });
});

describe('cleanup-staging-fixtures.ts — safe-by-default, double confirmation', () => {
  it('requires KORA_LINK_FIXTURE_CLEANUP_CONFIRM to equal the exact literal phrase', () => {
    expect(cleanupSrc).toContain("const RUNTIME_CONFIRM_PHRASE = 'DELETE_KL11_FIXTURES'");
    expect(cleanupSrc).toContain('process.env.KORA_LINK_FIXTURE_CLEANUP_CONFIRM !== RUNTIME_CONFIRM_PHRASE');
  });

  it('requires a second, runtime (interactive) confirmation distinct from the env-var gate', () => {
    expect(cleanupSrc).toMatch(/function requireInteractiveRuntimeConfirmation/);
    expect(cleanupSrc).toContain('process.stdin.isTTY');
    expect(cleanupSrc).toMatch(/rl\.question\(/);
    expect(cleanupSrc).toMatch(/answer\.trim\(\) !== RUNTIME_CONFIRM_PHRASE/);
  });

  it('aborts the runtime confirmation when not attached to an interactive TTY (cannot be automated)', () => {
    expect(cleanupSrc).toContain('if (!process.stdin.isTTY)');
    expect(cleanupSrc).toMatch(/if \(!process\.stdin\.isTTY\)[\s\S]{0,600}process\.exit\(1\)/);
  });

  it('always computes and prints a count-only plan before any confirmation prompt', () => {
    const planIdx = cleanupSrc.indexOf('const plan = await computePlan(client);');
    const confirmIdx = cleanupSrc.indexOf('await requireInteractiveRuntimeConfirmation();');
    const executeIdx = cleanupSrc.indexOf('const deleted = await executeCleanup(client, plan);');
    expect(planIdx).toBeGreaterThan(-1);
    expect(confirmIdx).toBeGreaterThan(planIdx);
    expect(executeIdx).toBeGreaterThan(confirmIdx);
  });

  it('refuses to run against anything that looks like production', () => {
    expect(cleanupSrc).toMatch(/\/prod\/i\.test\(expectedRef\)/);
    expect(cleanupSrc).toMatch(/\/prod\/i\.test\(dbUrl\)/);
  });

  it('rejects the Transaction pooler port and a service-role-looking password', () => {
    expect(cleanupSrc).toContain("url.port === '6543'");
    expect(cleanupSrc).toContain("startsWith('eyJ')");
  });

  it('scopes every DELETE with an explicit KL11 allowlist WHERE clause (no unscoped DELETE FROM)', () => {
    const deleteStatements = cleanupSrc.match(/DELETE FROM [^;]*;/g) ?? [];
    expect(deleteStatements.length).toBeGreaterThan(0);
    for (const stmt of deleteStatements) {
      expect(stmt, `unscoped DELETE found: ${stmt}`).toMatch(/WHERE/i);
    }
  });

  it('derives its allowlist explicitly from KL11-prefixed tenant_code / email, never a generic scan', () => {
    expect(cleanupSrc).toContain("tenant_code ILIKE 'kl11%'");
    expect(cleanupSrc).toContain("email ILIKE '%kl11%'");
  });

  it('deletes kora_link children before link_batches before tenant (FK-safe order)', () => {
    const linksIdx = cleanupSrc.indexOf("DELETE FROM kora_link.links WHERE id = ANY");
    const batchesIdx = cleanupSrc.indexOf("DELETE FROM kora_link.link_batches WHERE id = ANY");
    const tenantIdx = cleanupSrc.indexOf('DELETE FROM analytics.tenant WHERE id = ANY');
    expect(linksIdx).toBeGreaterThan(-1);
    expect(batchesIdx).toBeGreaterThan(linksIdx);
    expect(tenantIdx).toBeGreaterThan(batchesIdx);
  });

  it('never deletes auth.users rows (documented as out of scope)', () => {
    expect(cleanupSrc).not.toMatch(/DELETE FROM auth\.users/);
    expect(cleanupSrc).toMatch(/auth\.users rows are intentionally OUT OF SCOPE/);
  });

  it('masks identifiers instead of printing full UUIDs', () => {
    expect(cleanupSrc).toMatch(/function mask\(/);
    expect(cleanupSrc).toMatch(/id_masked:\s*mask\(/);
  });
});

describe('run-live-staging-suite.ts — compatible with the dormant-fixture mapping model', () => {
  it('creates a temporary company_identity mapping and always removes it in cleanup (finally)', () => {
    expect(liveStagingSuiteSrc).toMatch(/async function smokeC5Company/);
    expect(liveStagingSuiteSrc).toContain('createdCompanyIdentityAuthUserIds.push(authUserId)');
    expect(liveStagingSuiteSrc).toMatch(/DELETE FROM analytics\.company_identity WHERE auth_user_id = ANY/);
  });

  it('creates a temporary partner_identity/partner_profile mapping and always removes it in cleanup (finally)', () => {
    expect(liveStagingSuiteSrc).toMatch(/async function smokeC6Partner/);
    expect(liveStagingSuiteSrc).toContain('createdPartnerIdentityAuthUserIds.push(partnerAuthValid)');
    expect(liveStagingSuiteSrc).toMatch(/DELETE FROM network\.partner_identity WHERE auth_user_id = ANY/);
    expect(liveStagingSuiteSrc).toMatch(/DELETE FROM network\.partner_profile WHERE name = \$1/);
  });

  it('never provisions a mapping on the dormant KL11_COMPANY_*/KL11_PARTNER_P1 accounts themselves (uses a throwaway auth_user_id instead)', () => {
    // smokeC5Company/smokeC6Partner generate their own sub via randomUUID(), never
    // read/reuse a KL11_COMPANY_ADMIN_A/KL11_PARTNER_P1-style pre-existing auth id.
    expect(liveStagingSuiteSrc).toMatch(/async function smokeC5Company[\s\S]{0,600}randomUUID\(\)/);
    expect(liveStagingSuiteSrc).toMatch(/async function smokeC6Partner[\s\S]{0,600}randomUUID\(\)/);
  });

  it('calls both the company and the partner smoke scenario from main()', () => {
    expect(liveStagingSuiteSrc).toContain('await smokeC5Company(client, tenant);');
    expect(liveStagingSuiteSrc).toContain('await smokeC6Partner(client);');
  });
});

describe('docs/KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md — presence and required sections', () => {
  const requiredSections = [
    '## 1. Scopo',
    '## 2. Perimetro',
    '## 3. Inventario fixture',
    '## 4. Ownership',
    '## 5. Classificazione TEST',
    '## 6. Uso consentito',
    '## 7. Uso vietato',
    '## 8. Gestione password',
    '## 9. Lifecycle mapping',
    '## 10. Cleanup',
    '## 11. Periodic review',
    '## 12. Incident handling',
    '## 13. Anti-production safeguards',
    '## 14. Relazione con il runner C1–C10',
    '## 15. Criteri di eliminazione futura',
  ];

  it.each(requiredSections)('contains required section: %s', (section) => {
    expect(docSrc).toContain(section);
  });

  it('states the 7 permanent Auth / 2 permanent tenant / 3 permanent worker_identity baseline explicitly', () => {
    expect(docSrc).toMatch(/\*\*7 account Auth e 2 tenant\*\*/);
    expect(docSrc).toMatch(/3 mapping di identità permanenti/);
  });

  it('states 0 permanent company_identity and 0 permanent partner_identity mappings explicitly', () => {
    expect(docSrc).toMatch(/`analytics\.company_identity`: \*\*0 mapping permanenti attesi\*\*/);
    expect(docSrc).toMatch(/`network\.partner_identity`.*0 mapping permanenti attesi\.?\*\*/);
  });

  it('states COMPANY/PARTNER accounts are dormant Auth fixtures that get no access from the claim alone', () => {
    expect(docSrc).toMatch(/fixture Auth dormient[ei]/);
    expect(docSrc).toMatch(/non è sufficiente/);
  });

  it('states COMPANY/PARTNER mappings are created only temporarily by live tests and always removed in cleanup', () => {
    expect(docSrc).toMatch(/solo temporaneamente/);
    expect(docSrc).toMatch(/rimosso in `finally`|rimossi in `finally`|sempre rimoss[ae]/);
  });

  it('states no temporary mapping must ever survive a test run', () => {
    expect(docSrc).toMatch(/nessun mapping temporaneo[\s\S]{0,80}deve sopravvivere a un'esecuzione di test/);
  });

  it('never contains a full unmasked UUID', () => {
    const uuidPattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
    expect(uuidPattern.test(docSrc)).toBe(false);
  });

  it('never contains a full email address on the kl11.test domain (only masked or alias forms)', () => {
    const fullEmailPattern = /[a-z0-9._-]+@kl11\.test/i;
    expect(fullEmailPattern.test(docSrc)).toBe(false);
  });

  it('never contains a connection string, password value, token, or key', () => {
    expect(docSrc).not.toMatch(/postgresql:\/\/\S+:\S+@/);
    expect(docSrc).not.toMatch(/\beyJ[A-Za-z0-9_-]{10,}/); // JWT-shaped literal
  });
});

describe('no credentials committed alongside this sprint\'s files', () => {
  for (const [label, src] of [
    ['check-staging-fixtures.ts', checkSrc],
    ['cleanup-staging-fixtures.ts', cleanupSrc],
    ['KORA_LINK_STAGING_FIXTURE_GOVERNANCE.md', docSrc],
  ] as const) {
    it(`${label} contains no real connection string, JWT, or long hex/base64 secret literal`, () => {
      expect(src).not.toMatch(/postgresql:\/\/\S+:\S+@\S+\.supabase\.co/);
      expect(src).not.toMatch(/\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/); // real-looking JWT (header.payload)
    });
  }
});
