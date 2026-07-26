/**
 * RLS-02 — Static RLS Policy Inventory (migration-file text analysis only)
 *
 * SCOPE / WHAT THIS PROVES:
 *   This test parses the SQL text of every file under supabase/migrations/*.sql
 *   and builds a declarative inventory of tables, RLS enablement, and policies,
 *   as they are WRITTEN in the migration files — in filename order, applying
 *   DROP POLICY removals against earlier CREATE POLICY statements so the final
 *   inventory reflects the migrations' own cumulative intent.
 *
 * WHAT THIS DOES NOT PROVE (see docs — RLS-01 audit, RLS-03/04/05):
 *   - It does NOT connect to any database, staging or production.
 *   - It does NOT prove which migrations are actually applied on any real
 *     environment. Several migrations in this repo are explicitly written but
 *     NOT applied anywhere (022, 026, 027), or applied to staging only, not
 *     production (030, 031) — per their own file-header comments. This test
 *     treats the migrations directory as a single declarative source of truth
 *     for "what the schema is designed to look like", not "what is live."
 *   - It does NOT prove runtime behavior (no negative DB queries, no
 *     authenticated sessions). That is the job of RLS-03/04/05.
 *
 * This test is a STATIC INVENTORY + DRIFT DETECTOR, cross-checked against
 * lib/auth/access-matrix.ts and docs/access-matrix.md. Findings here are
 * migration-file findings, not live-database findings.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const root = resolve(process.cwd());
const MIGRATIONS_DIR = resolve(root, 'supabase/migrations');

// ── SQL text helpers ──────────────────────────────────────────────────────────

function stripSqlComments(sql: string): string {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '');
}

function listMigrationFiles(): string[] {
  // Zero-padded numeric prefixes (001..031) sort correctly as plain strings.
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

// ── Inventory data model ──────────────────────────────────────────────────────

interface PolicyRecord {
  name: string;
  table: string; // schema.table
  file: string;
  command: string; // ALL | SELECT | INSERT | UPDATE | DELETE | UNKNOWN
  rolesMentioned: string[]; // uppercase role literals found in the policy body (kora.kora_role() checks)
  body: string; // raw text from just after the policy name to the terminating ';'
  referencesTenant: boolean; // body contains 'tenant_id' (covers both a tenant_id column ref and kora.tenant_id())
  referencesWorkerOwnership: boolean; // body references worker_id / worker_identity_id / auth.uid() / auth.jwt()
  isBlanketAdmin: boolean; // name matches /kora_admin_all/ or similar broad-admin naming with no scoping predicate
  isUsingTrueLiteral: boolean; // USING (true) with no predicate at all — maximally broad
  isCompanyFacing: boolean; // rolesMentioned includes COMPANY_ADMIN or COMPANY_VIEWER — the role that can legitimately span many workers of ONE tenant
}

interface TableRecord {
  table: string; // schema.table
  schema: string;
  createdIn?: string;
  rlsEnabled: boolean;
  rlsEnabledIn?: string;
  forceRls: boolean;
  forceRlsIn?: string;
  hasTenantIdColumn: boolean;
  hasWorkerOwnershipColumn: boolean;
  policies: PolicyRecord[]; // surviving policies (CREATE minus later DROP), in file order
}

const SENSITIVE_SCHEMAS = ['personal', 'analytics', 'commons', 'audit', 'network', 'gov'];

const KNOWN_ROLE_LITERALS = ['KORA_ADMIN', 'COMPANY_ADMIN', 'COMPANY_VIEWER', 'WORKER', 'PARTNER', 'ADVISOR', 'DEMO_VIEWER'];

function buildInventory(): Map<string, TableRecord> {
  const files = listMigrationFiles();
  const tables = new Map<string, TableRecord>();

  function ensureTable(qualified: string): TableRecord {
    const key = qualified.toLowerCase();
    if (!tables.has(key)) {
      const [schema] = key.split('.');
      tables.set(key, {
        table: key,
        schema,
        rlsEnabled: false,
        forceRls: false,
        hasTenantIdColumn: false,
        hasWorkerOwnershipColumn: false,
        policies: [],
      });
    }
    return tables.get(key)!;
  }

  for (const file of files) {
    const rawSql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8');
    const sql = stripSqlComments(rawSql);

    // ── CREATE TABLE schema.table (optionally IF NOT EXISTS) ──────────────────
    const createTableRe = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+\.[a-z_]+)\s*\(/gi;
    let m: RegExpExecArray | null;
    while ((m = createTableRe.exec(sql))) {
      const qualified = m[1];
      const t = ensureTable(qualified);
      if (!t.createdIn) t.createdIn = file;

      // Heuristic column scan: look at the raw (uncommented) text window from the
      // CREATE TABLE match up to the next top-level "ALTER TABLE <same table> ENABLE
      // ROW LEVEL SECURITY" statement (the codebase's own convention keeps table
      // definition + RLS enable in the same migration file, right after each other),
      // falling back to a fixed window if that anchor isn't found nearby.
      const enableAnchor = new RegExp(
        `ALTER TABLE\\s+${qualified.replace('.', '\\.')}\\s+ENABLE ROW LEVEL SECURITY`,
        'i',
      );
      const enableMatch = enableAnchor.exec(sql.slice(m.index));
      const windowEnd = enableMatch ? m.index + enableMatch.index + enableMatch[0].length : m.index + 4000;
      const columnWindow = sql.slice(m.index, Math.min(windowEnd, sql.length));

      if (/\btenant_id\b/i.test(columnWindow)) t.hasTenantIdColumn = true;
      if (/\bworker_id\b|\bworker_identity_id\b/i.test(columnWindow)) t.hasWorkerOwnershipColumn = true;
    }

    // ── ALTER TABLE ... ENABLE ROW LEVEL SECURITY ──────────────────────────────
    const enableRe = /ALTER TABLE\s+([a-z_]+\.[a-z_]+)\s+ENABLE ROW LEVEL SECURITY/gi;
    while ((m = enableRe.exec(sql))) {
      const t = ensureTable(m[1]);
      t.rlsEnabled = true;
      if (!t.rlsEnabledIn) t.rlsEnabledIn = file;
    }

    // ── ALTER TABLE ... FORCE ROW LEVEL SECURITY ───────────────────────────────
    const forceRe = /ALTER TABLE\s+([a-z_]+\.[a-z_]+)\s+FORCE ROW LEVEL SECURITY/gi;
    while ((m = forceRe.exec(sql))) {
      const t = ensureTable(m[1]);
      t.forceRls = true;
      if (!t.forceRlsIn) t.forceRlsIn = file;
    }

    // ── DROP POLICY [IF EXISTS] "name" ON schema.table ─────────────────────────
    // Applied against the running inventory in file order, so a policy dropped
    // by a later migration disappears from the "surviving" inventory below —
    // this is what lets us represent e.g. migration 027 removing migration 007's
    // blanket admin policy, even though 027 itself is not applied to any DB yet.
    const dropRe = /DROP POLICY\s+(?:IF EXISTS\s+)?"?([a-zA-Z0-9_]+)"?\s+ON\s+([a-z_]+\.[a-z_]+)/gi;
    while ((m = dropRe.exec(sql))) {
      const policyName = m[1];
      const table = m[2].toLowerCase();
      const t = ensureTable(table);
      t.policies = t.policies.filter((p) => p.name !== policyName);
    }

    // ── CREATE POLICY "name" ... ; ──────────────────────────────────────────────
    // Two syntaxes appear in this repo:
    //   CREATE POLICY "name" ON schema.table FOR ... USING (...);
    //   CREATE POLICY "name"\n  ON schema.table FOR ...\n  USING (...);
    // Both are handled the same way: capture everything from the policy name to
    // the next top-level semicolon (policy bodies in this repo never contain an
    // embedded ';' — verified against the actual migration set before writing
    // this parser), then search that captured body for ON/FOR/USING content.
    const createPolicyRe = /CREATE POLICY\s+"?([a-zA-Z0-9_]+)"?\s*([\s\S]*?);/g;
    while ((m = createPolicyRe.exec(sql))) {
      const name = m[1];
      const body = m[2];

      const tableMatch = body.match(/ON\s+([a-z_]+\.[a-z_]+)/i);
      if (!tableMatch) continue; // not a table-targeted policy statement — skip defensively
      const table = tableMatch[1].toLowerCase();

      const forMatch = body.match(/FOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)/i);
      const rolesMentioned = Array.from(
        new Set(
          (body.match(/'([A-Z][A-Z_]+)'/g) ?? [])
            .map((s) => s.replace(/'/g, ''))
            .filter((s) => KNOWN_ROLE_LITERALS.includes(s)),
        ),
      );

      const referencesTenant = /tenant_id/i.test(body);
      const referencesWorkerOwnership = /worker_identity_id|worker_id|auth\.uid\(\)|auth\.jwt\(\)/i.test(body);
      const isUsingTrueLiteral = /USING\s*\(\s*true\s*\)/i.test(body);
      const isBlanketAdmin =
        /kora_admin_all/i.test(name) ||
        (/kora\.kora_role\(\)\s*=\s*'KORA_ADMIN'/i.test(body) && !referencesTenant && !referencesWorkerOwnership);
      const isCompanyFacing = rolesMentioned.includes('COMPANY_ADMIN') || rolesMentioned.includes('COMPANY_VIEWER');

      const t = ensureTable(table);
      // Idempotent re-CREATE within the same logical migration set (e.g. a file
      // that DROPs then re-CREATEs the same name) — keep the latest definition.
      t.policies = t.policies.filter((p) => p.name !== name);
      t.policies.push({
        name,
        table,
        file,
        command: forMatch ? forMatch[1].toUpperCase() : 'UNKNOWN',
        rolesMentioned,
        body,
        referencesTenant,
        referencesWorkerOwnership,
        isBlanketAdmin,
        isUsingTrueLiteral,
        isCompanyFacing,
      });
    }
  }

  return tables;
}

const inventory = buildInventory();
const tableList = Array.from(inventory.values()).sort((a, b) => a.table.localeCompare(b.table));

function fmtPolicies(t: TableRecord): string {
  if (t.policies.length === 0) return '(none)';
  return t.policies.map((p) => `${p.name}[${p.command}]`).join(', ');
}

// ── 1. Positive inventory snapshot (informational — not live-DB proof) ────────

describe('RLS-02 static inventory — positive snapshot (informational only)', () => {
  it('prints the full table × RLS × policy inventory extracted from supabase/migrations/*.sql', () => {
    const lines = [
      '',
      '=== RLS-02 static policy inventory (migration-file text only, NOT live-DB proof) ===',
      '',
    ];
    for (const t of tableList) {
      lines.push(
        `${t.table.padEnd(38)} RLS=${t.rlsEnabled ? 'Y' : 'N'}${t.rlsEnabledIn ? `(${t.rlsEnabledIn})` : ''}` +
          ` FORCE=${t.forceRls ? 'Y' : 'N'}` +
          ` tenant_id_col=${t.hasTenantIdColumn ? 'Y' : 'N'}` +
          ` worker_col=${t.hasWorkerOwnershipColumn ? 'Y' : 'N'}` +
          ` policies=[${fmtPolicies(t)}]`,
      );
    }
    lines.push('');
    console.log(lines.join('\n'));

    // Sanity check that the parser actually found the known schema, not an empty result.
    expect(tableList.length).toBeGreaterThanOrEqual(20);
    expect(tableList.some((t) => t.table === 'personal.worker_pseudonym_map')).toBe(true);
  });
});

// ── 2. Every table with surviving policies has RLS enabled ────────────────────

describe('RLS-02 — tables with policies must have RLS enabled', () => {
  const withPolicies = tableList.filter((t) => t.policies.length > 0);

  it('sanity: at least one table with policies was found', () => {
    expect(withPolicies.length).toBeGreaterThan(0);
  });

  for (const t of withPolicies) {
    it(`${t.table}: has ${t.policies.length} polic${t.policies.length === 1 ? 'y' : 'ies'} and RLS enabled`, () => {
      expect(t.rlsEnabled, `${t.table} has CREATE POLICY statements but no ENABLE ROW LEVEL SECURITY found`).toBe(true);
    });
  }
});

// ── 3. personal.* tables must have FORCE ROW LEVEL SECURITY ───────────────────
//
// FORCE RLS closes the "table owner / superuser bypasses RLS" gap. Every
// personal.* table (worker-individual data) must set it, since this is the
// schema constitutionally off-limits to employer-facing code (CLAUDE.md §13).
//
// Documented exceptions (schema.table -> reason) — currently none. Adding an
// entry here requires a linked justification, not just to silence a failure.

const FORCE_RLS_EXCEPTIONS: Record<string, string> = {
  // (none) — every personal.* table created in supabase/migrations/ currently
  // sets FORCE ROW LEVEL SECURITY. If a future migration adds a personal.*
  // table without it, this test should fail rather than silently pass.
};

describe('RLS-02 — personal.* tables require FORCE ROW LEVEL SECURITY', () => {
  const personalTables = tableList.filter((t) => t.schema === 'personal');

  it('sanity: at least one personal.* table was found', () => {
    expect(personalTables.length).toBeGreaterThan(0);
  });

  for (const t of personalTables) {
    it(`${t.table}: has FORCE ROW LEVEL SECURITY (or a documented exception)`, () => {
      if (FORCE_RLS_EXCEPTIONS[t.table]) {
        // Documented, reasoned exception — not a silent pass.
        expect(FORCE_RLS_EXCEPTIONS[t.table].length).toBeGreaterThan(0);
        return;
      }
      expect(t.forceRls, `${t.table} lacks FORCE ROW LEVEL SECURITY and has no documented exception`).toBe(true);
    });
  }
});

// ── 4. Company-facing policies on tenant-id tables must reference tenant scoping
//
// First pass at this check asserted "every tenant_id-having table needs SOME
// tenant-referencing policy," which produced 5 false positives: personal.*
// tables where the only policies are KORA_ADMIN (intentionally cross-tenant —
// that role's whole job is operating across tenants) and/or WORKER-own-row
// (scoped by worker_identity_id/auth_user_id/auth.uid(), which already implies
// correct tenant containment transitively, since one worker belongs to exactly
// one tenant — confirmed against the actual migration bodies, not assumed).
//
// The security-relevant invariant is narrower and matches this codebase's own
// documented design (docs/access-matrix.md, GATE2_CTO_CLOSE_REVIEW.md C-11/C-12
// "no COMPANY_ADMIN policy on any personal.* table"): a policy that grants
// COMPANY_ADMIN or COMPANY_VIEWER access — the role that can legitimately see
// many workers but must never cross a tenant boundary — must reference tenant
// scoping. If such a policy ever omitted a tenant filter, that IS a real
// cross-tenant leak, unlike the KORA_ADMIN/WORKER-only cases above.

describe('RLS-02 — company-facing policies must reference tenant scoping', () => {
  const companyFacingPolicies = tableList.flatMap((t) => t.policies.filter((p) => p.isCompanyFacing).map((p) => ({ t, p })));

  it('sanity: at least one company-facing policy was found', () => {
    expect(companyFacingPolicies.length).toBeGreaterThan(0);
  });

  for (const { t, p } of companyFacingPolicies) {
    it(`${t.table} :: ${p.name} (COMPANY_ADMIN/COMPANY_VIEWER policy) references tenant scoping`, () => {
      expect(
        p.referencesTenant,
        `${t.table} :: ${p.name} grants COMPANY_ADMIN/COMPANY_VIEWER access without a tenant_id reference — this is the pattern that would cause a real cross-tenant leak`,
      ).toBe(true);
    });
  }

  // The constitutional invariant (CLAUDE.md §13 / GATE2_CTO_CLOSE_REVIEW.md
  // C-11,C-12: "no COMPANY_ADMIN policy on any personal.* table") is about
  // WORKER-INDIVIDUAL data specifically, not the "personal" schema name as a
  // whole. personal.workforce_baseline is the one deliberate exception: it is
  // pre-aggregated headcount data (own migration comment: "Aggregate data
  // only — no individual worker rows here"), so a tenant-scoped COMPANY_ADMIN
  // read policy on it is correct and safe, not a privacy leak. Confirmed by
  // reading 001_live_v1_foundation.sql directly before encoding this
  // exception — this is not a blanket carve-out for the whole schema.
  const AGGREGATE_ONLY_PERSONAL_TABLES = new Set(['personal.workforce_baseline']);

  it('no worker-individual table (personal.* minus documented aggregate exceptions) has a COMPANY_ADMIN/COMPANY_VIEWER-facing policy', () => {
    const personalCompanyFacing = tableList
      .filter((t) => t.schema === 'personal' && !AGGREGATE_ONLY_PERSONAL_TABLES.has(t.table))
      .flatMap((t) => t.policies.filter((p) => p.isCompanyFacing).map((p) => `${t.table}::${p.name}`));
    expect(
      personalCompanyFacing,
      `found COMPANY_ADMIN/COMPANY_VIEWER-facing polic${personalCompanyFacing.length === 1 ? 'y' : 'ies'} on worker-individual table(s): ${personalCompanyFacing.join(', ')}`,
    ).toEqual([]);
  });
});

// ── 4b. Informational: non-canonical worker-identity resolution patterns ──────
//
// Every worker-owned table resolves "is this my row" via the canonical
// subquery `worker_identity_id IN (SELECT id FROM personal.worker_identity
// WHERE auth_user_id = auth.uid())`, EXCEPT personal.worker_cv_share, which
// reads `(auth.jwt() -> 'app_metadata' ->> 'kora_worker_id')::uuid` directly —
// a pattern the migration file itself (011_worker_cv_share.sql) flags as an
// open design question ("no canonical helper exists"). This is not a tenant-
// scoping gap (worker ownership already implies tenant containment), but it
// is a real, worth-tracking inconsistency — reported here, not hard-failed,
// since resolving it is a design decision (add a canonical helper?) rather
// than an obvious bug fix.

describe('RLS-02 — non-canonical worker-identity resolution (informational)', () => {
  it('flags any worker-own policy resolving identity via raw auth.jwt() claim instead of the canonical worker_identity subquery', () => {
    const nonCanonical = tableList.flatMap((t) =>
      t.policies
        .filter((p) => /auth\.jwt\(\)/i.test(p.body) && !/SELECT\s+id\s+FROM\s+personal\.worker_identity/i.test(p.body))
        .map((p) => `${t.table} :: ${p.name} (${p.file})`),
    );
    console.log(
      '\n=== Non-canonical worker-identity resolution (raw auth.jwt() claim read, no worker_identity subquery) ===\n' +
        (nonCanonical.join('\n') || '(none found)') +
        '\n',
    );
    // Known, self-documented instance: personal.worker_cv_share. Reported for
    // visibility; not asserted empty, since resolving it is a design decision.
    expect(Array.isArray(nonCanonical)).toBe(true);
  });
});

// KORA Link RPC-only worker tables — named allowlist (Gate 4 §10).
//
// Gate 4 (KORA-LINK-RLS-LIVE-VALIDATION-11, docs/KORA_LINK_GATE_4_FINAL_REPORT.md
// §10) validated LIVE against staging that these exact 5 kora_link tables have
// a worker_id-shaped column but deliberately carry NO direct worker-self-select
// RLS policy: worker access is routed exclusively through the kora_link.fn_*
// SECURITY DEFINER RPC functions (supabase/migrations/036_kora_link_rpc_functions.sql),
// which authenticate the caller via auth.uid() resolved against
// personal.worker_identity before returning any row. This is a validated,
// intentional design choice, not a gap.
//
// This allowlist names each table explicitly — it does NOT exclude the
// kora_link schema wholesale — so any FUTURE worker-owned table (in kora_link
// or any other schema) still fails the check below unless it is deliberately
// added here with the same kind of documented justification.
const KORA_LINK_RPC_ONLY_WORKER_TABLES = new Set([
  'kora_link.link_activation_acknowledgements',
  'kora_link.link_assignments',
  'kora_link.link_events',
  'kora_link.link_replacements',
  'kora_link.revocations',
]);

describe('RLS-02 — worker-scoped tables have a worker-ownership-aware policy', () => {
  const workerScoped = tableList.filter(
    (t) => t.hasWorkerOwnershipColumn && t.policies.length > 0 && !KORA_LINK_RPC_ONLY_WORKER_TABLES.has(t.table),
  );

  it('sanity: at least one worker-scoped table was found', () => {
    expect(workerScoped.length).toBeGreaterThan(0);
  });

  for (const t of workerScoped) {
    it(`${t.table}: at least one policy references worker ownership`, () => {
      const anyWorkerAware = t.policies.some((p) => p.referencesWorkerOwnership);
      expect(
        anyWorkerAware,
        `${t.table} has a worker ownership column but none of its policies (${fmtPolicies(t)}) reference worker ownership`,
      ).toBe(true);
    });
  }
});

describe('RLS-02 — KORA Link RPC-only worker tables (named allowlist, Gate 4 §10)', () => {
  const rpcFunctionsSrc = readFileSync(resolve(root, 'supabase/migrations/036_kora_link_rpc_functions.sql'), 'utf-8');

  it('sanity: the allowlist names exactly the 5 tables Gate 4 §10 validated', () => {
    expect(KORA_LINK_RPC_ONLY_WORKER_TABLES.size).toBe(5);
  });

  it('every allowlisted table still exists in the migration inventory with a worker ownership column', () => {
    for (const table of KORA_LINK_RPC_ONLY_WORKER_TABLES) {
      const t = inventory.get(table);
      expect(t, `${table} not found in migration inventory — allowlist entry is stale`).toBeTruthy();
      expect(
        t?.hasWorkerOwnershipColumn,
        `${table} no longer has a worker ownership column — allowlist entry is stale`,
      ).toBe(true);
    }
  });

  it('every allowlisted table still has zero direct worker-ownership-aware RLS policy (Gate 4 finding still holds)', () => {
    for (const table of KORA_LINK_RPC_ONLY_WORKER_TABLES) {
      const t = inventory.get(table);
      if (!t) continue;
      const anyWorkerAware = t.policies.some((p) => p.referencesWorkerOwnership);
      expect(
        anyWorkerAware,
        `${table} now has a direct worker-ownership policy — if this is an intentional new design, remove it from KORA_LINK_RPC_ONLY_WORKER_TABLES instead of leaving both a policy and this exception in place`,
      ).toBe(false);
    }
  });

  it('kora_link.fn_* RPC functions authenticate the caller via auth.uid() resolved against personal.worker_identity', () => {
    expect(rpcFunctionsSrc).toMatch(/auth\.uid\(\)/);
    expect(rpcFunctionsSrc).toMatch(/personal\.worker_identity/);
  });
});

// ── 5. Blanket-admin / USING(true) detector (informational — reported, not failed)
//
// "kora_admin_all"-style policies are an intentional, documented KORA_ADMIN
// pattern in this codebase (see docs/access-matrix.md, lib/auth/access-matrix.ts)
// — flagging them is about visibility, not implying every instance is a bug.
// A literal USING (true) with zero predicate would be a maximally broad policy
// and is reported the same way. Neither case is asserted to be absent; the
// point of this block is to make them impossible to miss in a code review.

describe('RLS-02 — blanket admin / unconditional policy detector (informational)', () => {
  it('lists every blanket-admin ("kora_admin_all"-style) policy found', () => {
    const blanket = tableList.flatMap((t) => t.policies.filter((p) => p.isBlanketAdmin).map((p) => `${t.table} :: ${p.name} (${p.file})`));
    console.log('\n=== Blanket-admin policies (expected, documented KORA_ADMIN pattern) ===\n' + blanket.join('\n') + '\n');
    expect(Array.isArray(blanket)).toBe(true);
  });

  it('lists any policy using a literal USING (true) with no predicate', () => {
    const trueLiterals = tableList.flatMap((t) => t.policies.filter((p) => p.isUsingTrueLiteral).map((p) => `${t.table} :: ${p.name} (${p.file})`));
    console.log('\n=== USING(true) literal policies (should be empty or explicitly justified) ===\n' + (trueLiterals.join('\n') || '(none found)') + '\n');
    // Not asserted false — this repo currently has none; if one appears, it will
    // show up loudly in test output for review rather than failing silently.
    expect(Array.isArray(trueLiterals)).toBe(true);
  });
});

// ── 6. Cross-check against lib/auth/access-matrix.ts ───────────────────────────
//
// access-matrix.ts is the authoritative APPLICATION-LAYER decision matrix
// (docs/access-matrix.md is its source of truth per the file's own header).
// This is a distinct layer from DB-level RLS, but the two must agree on the
// non-negotiable invariants: KORA_ADMIN must never be granted worker-individual
// data, and personal_pseudonym_map must deny every role. This check guards
// against either layer silently drifting from the other.

describe('RLS-02 — cross-check against lib/auth/access-matrix.ts', () => {
  const accessMatrixSrc = readFileSync(resolve(root, 'lib/auth/access-matrix.ts'), 'utf-8');

  it('worker_individual_pib denies KORA_ADMIN in the access matrix', () => {
    const section = accessMatrixSrc.split('worker_individual_pib:')[1]?.split(/worker_individual_uef:|personal_pseudonym_map:/)[0] ?? '';
    expect(section).toMatch(/KORA_ADMIN:\s*\{\s*allowed:\s*false/);
  });

  it('worker_individual_uef denies KORA_ADMIN in the access matrix', () => {
    const section = accessMatrixSrc.split('worker_individual_uef:')[1]?.split(/personal_pseudonym_map:|hq_operator_console:/)[0] ?? '';
    expect(section).toMatch(/KORA_ADMIN:\s*\{\s*allowed:\s*false/);
  });

  it('personal_pseudonym_map denies every role in the access matrix', () => {
    const section = accessMatrixSrc.split('personal_pseudonym_map:')[1]?.split(/hq_operator_console:/)[0] ?? '';
    for (const role of ['KORA_ADMIN', 'COMPANY_ADMIN', 'WORKER', 'PARTNER', 'DEMO_VIEWER']) {
      expect(section, `${role} should be denied on personal_pseudonym_map`).toMatch(
        new RegExp(`${role}:\\s*\\{\\s*allowed:\\s*false`),
      );
    }
  });

  it('personal.worker_pseudonym_map (DB) has zero application-role policies beyond WORKER-own-select and admin — matches "zero application access" intent', () => {
    const t = inventory.get('personal.worker_pseudonym_map');
    expect(t, 'personal.worker_pseudonym_map not found in migration inventory').toBeTruthy();
    if (!t) return;
    const nonAdminNonWorkerPolicies = t.policies.filter(
      (p) => !p.isBlanketAdmin && !/worker/i.test(p.name),
    );
    expect(
      nonAdminNonWorkerPolicies.length,
      `unexpected non-admin/non-worker policies on worker_pseudonym_map: ${nonAdminNonWorkerPolicies.map((p) => p.name).join(', ')}`,
    ).toBe(0);
  });
});

// ── 7. Cross-check against docs/access-matrix.md (drift detector) ─────────────

describe('RLS-02 — cross-check against docs/access-matrix.md', () => {
  const docPath = resolve(root, 'docs/access-matrix.md');
  let docSrc = '';
  try {
    docSrc = readFileSync(docPath, 'utf-8');
  } catch {
    docSrc = '';
  }

  it('docs/access-matrix.md exists and is readable', () => {
    expect(docSrc.length).toBeGreaterThan(0);
  });

  it('every AccessResource key used in access-matrix.ts is mentioned in docs/access-matrix.md', () => {
    const accessMatrixSrc = readFileSync(resolve(root, 'lib/auth/access-matrix.ts'), 'utf-8');
    const resourceKeys = Array.from(accessMatrixSrc.matchAll(/^\s{2}([a-z_]+):\s*\{/gm)).map((m) => m[1]);
    expect(resourceKeys.length).toBeGreaterThan(0);
    for (const key of resourceKeys) {
      expect(docSrc, `resource "${key}" from access-matrix.ts not mentioned in docs/access-matrix.md`).toContain(key);
    }
  });
});

// ── 8. Light-touch presence check for docs/QA_STATUS.md and docs/STATUS.md ────
//
// Not a content assertion (too brittle — these docs evolve). Just confirms
// they exist and are readable, since RLS-01's audit cited both as corroborating
// that live RLS negative testing is a known, tracked gap. If either goes
// missing, that's worth surfacing here rather than only at audit time.

describe('RLS-02 — QA/status docs presence (light touch, no content assertions)', () => {
  it('docs/QA_STATUS.md exists', () => {
    expect(() => readFileSync(resolve(root, 'docs/QA_STATUS.md'), 'utf-8')).not.toThrow();
  });

  it('docs/STATUS.md exists', () => {
    expect(() => readFileSync(resolve(root, 'docs/STATUS.md'), 'utf-8')).not.toThrow();
  });
});
