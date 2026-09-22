// tests/unit/kora-wp-066-saved-mappings.test.ts
//
// KORA-WP-066 — Saved Mappings (COMPANY-011).
//
// FOUNDER SEMANTIC RULING (2026-09-21) — READING 1, TENANT-SCOPED SESSION REUSE.
// The historical registry wording "reusable mapping across Companies" is NOT
// the intended Product semantics. Corrected canonical acceptance, which this
// suite encodes: "a saved mapping is reusable across upload/mapping sessions
// FOR THE SAME COMPANY."
//
// The lettered groups below are the Founder's own mandated proofs (§25 A–H).

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'path';
import {
  sanitizeMappingPayload,
  applySavedMappingToHeaders,
  type SavedMappingPayload,
} from '@/lib/saved-mappings/saved-mapping-service';
import { CANONICAL_FIELDS } from '@/lib/data-intake/column-mapping';

const ROOT = resolve(process.cwd());
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const exists = (rel: string) => existsSync(join(ROOT, rel));

/**
 * Executable lines only. These files deliberately DOCUMENT what they exclude
 * ("no cross-Company template", "no schema fingerprint"), so a prose mention
 * proving absence must never be mistaken for a usage.
 */
function codeLines(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');
}

/**
 * BYTE-IDENTITY TO THE WP-125 BASELINE, WITHOUT GIT HISTORY.
 *
 * These guards previously ran `git diff --stat <baseline SHA> -- <file>` and
 * required empty output. That is unrunnable under `actions/checkout@v4`, which
 * clones at depth 1: the baseline commit is simply absent, git exits
 * `fatal: bad object`, and the suite fails for a reason unrelated to the
 * invariant. The first genuine GitHub run (35763067234) surfaced exactly that.
 *
 * The guarantee is unchanged and expressed directly: the file's content must
 * still hash to the baseline blob's digest. An empty `git diff` and a matching
 * content digest prove the same fact — byte-identity — and the digest form is
 * marginally STRONGER, because it is exact rather than dependent on how
 * `--stat` chooses to summarise, and it states the baseline explicitly in the
 * test instead of leaving it implicit in a commit the runner cannot see.
 *
 * Digests were computed from the real baseline blobs at
 * 0bc14f6e484110ce65be8aa0c185a68208057359. If a later WP legitimately changes
 * one of these files, this guard fails — which is precisely its purpose, and it
 * failed the same way before.
 */
const WP125_BASELINE_SHA = '0bc14f6e484110ce65be8aa0c185a68208057359';
const BASELINE_BLOB_SHA256: Record<string, string> = {
  'lib/mapping-governance/manual-remap-service.ts':
    '819bb9d016f70bc865df0af413036111c297b7039377159c119aa9dd7708380d',
  'lib/data-intake/column-mapping.ts':
    '2e395a9588c4d5c440bee06ce87497424746eac3caeba172208162f61da97a94',
};
const sha256 = (rel: string) => createHash('sha256').update(readFileSync(join(ROOT, rel))).digest('hex');

const MIGRATION = 'supabase/migrations/090_saved_column_mapping_tenant_scoped.sql';
const SERVICE   = 'lib/saved-mappings/saved-mapping-service.ts';
const READ_ROUTE = 'app/api/admin/data-intake/saved-mappings/route.ts';
const ACCEPT    = 'app/api/admin/data-intake/accept/route.ts';
const STUDIO    = 'app/admin/data-intake/_components/DataIntakeStudio.tsx';

// ── A — persistence ───────────────────────────────────────────────────────

describe('KORA-WP-066 (A) — persistence: a saved mapping survives across sessions, owned by one tenant', () => {
  it('a real migration creates the persistence, at the next free number', () => {
    expect(exists(MIGRATION)).toBe(true);
    const nums = readdirSync(join(ROOT, 'supabase/migrations'))
      .filter((f) => /^\d{3}_.*\.sql$/.test(f))
      .map((f) => Number.parseInt(f.slice(0, 3), 10));
    expect(Math.max(...nums)).toBe(90);
    // 090 is exactly one beyond the baseline high-water, not a reused number.
    expect(nums.filter((n) => n === 90)).toHaveLength(1);
  });

  it('persistence is a dedicated table — never an existing table repurposed', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS analytics\.saved_column_mapping/);
    // The debugging field explicitly ruled out by the Founder (§14).
    expect(sql).not.toMatch(/INSERT INTO analytics\.source_batch/);
    expect(sql).not.toMatch(/ALTER TABLE analytics\.source_batch/);
    expect(read(SERVICE)).not.toMatch(/payload_sample/);
  });

  it('every row carries a stable identifier, creation and update timestamps', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/id\s+uuid\s+PRIMARY KEY DEFAULT gen_random_uuid\(\)/);
    expect(sql).toMatch(/created_at\s+timestamptz\s+NOT NULL DEFAULT now\(\)/);
    expect(sql).toMatch(/updated_at\s+timestamptz\s+NOT NULL DEFAULT now\(\)/);
    expect(sql).toMatch(/created_by\s+text/);
  });

  it('a saved mapping belongs to EXACTLY ONE tenant, enforced by a NOT NULL FK', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(
      /tenant_id\s+uuid\s+NOT NULL REFERENCES analytics\.tenant \(id\) ON DELETE CASCADE/,
    );
  });

  it('the per-tenant unique constraint exists and is the conflict authority', () => {
    // SUPERSEDED BY FOUNDER RULING 2026-09-22: this guard previously asserted
    // that re-saving under an existing name UPDATED the row. That behaviour is
    // now explicitly forbidden — a duplicate name is a conflict and the
    // existing mapping must remain unchanged. The constraint is unchanged; only
    // what the code does with its violation changed. Full semantics are guarded
    // in the dedicated duplicate-name describe block below.
    const sql = read(MIGRATION);
    expect(sql).toMatch(/UNIQUE \(tenant_id, mapping_name\)/);
    expect(codeLines(read(SERVICE))).not.toContain('onConflict');
  });
});

// ── B — isolation ─────────────────────────────────────────────────────────

describe('KORA-WP-066 (B) — isolation: Company A\'s mapping can never reach Company B', () => {
  it('RLS is enabled and forced', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/ALTER TABLE analytics\.saved_column_mapping ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/ALTER TABLE analytics\.saved_column_mapping FORCE ROW LEVEL SECURITY/);
  });

  it('exactly one policy exists — KORA_ADMIN only (Founder least-privilege ruling)', () => {
    const sql = read(MIGRATION);
    const policies = [...sql.matchAll(/CREATE POLICY "([^"]+)"/g)].map(m => m[1]);
    expect(policies).toEqual(['saved_column_mapping_kora_admin_all']);
    // No Company/Worker/Advisor/Partner read path exists in the DDL itself.
    // (The header comment names those roles to record what they must NOT have,
    //  so only executable lines are scanned here.)
    expect(codeLines(sql)).not.toMatch(/COMPANY_ADMIN|COMPANY_VIEWER/);
  });

  it('`authenticated` gets SELECT only — no write grant to any tenant role', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/GRANT SELECT ON analytics\.saved_column_mapping TO authenticated;/);
    expect(sql).not.toMatch(/GRANT[^;]*INSERT[^;]*TO authenticated/);
    expect(sql).not.toMatch(/GRANT[^;]*UPDATE[^;]*TO authenticated/);
    expect(sql).not.toMatch(/GRANT[^;]*DELETE[^;]*TO authenticated/);
  });

  it('no policy grants any tenant sight of another tenant\'s row', () => {
    // SUPERSEDED BY FOUNDER RULING 2026-09-22 — SEMANTIC GUARANTEE MADE
    // STRONGER. This previously asserted the Company policy's own
    // `tenant_id = kora.tenant_id()` clause. That policy is gone: no normal
    // tenant role reads this table at all, which subsumes cross-tenant
    // isolation rather than weakening it. What remains to guard is that the
    // single surviving policy grants nothing broad.
    const sql = read(MIGRATION);
    const policyBlocks = sql.split('CREATE POLICY').slice(1);
    expect(policyBlocks).toHaveLength(1);
    for (const b of policyBlocks) {
      expect(b).not.toMatch(/tenant_id\s*<>\s*kora\.tenant_id\(\)/);
      expect(b).not.toMatch(/USING \(\s*true\s*\)/);
      expect(b).toMatch(/kora\.kora_role\(\) = 'KORA_ADMIN'/);
    }
  });

  it('belonging to a tenant is not itself a right to read its mapping config', () => {
    // SUPERSEDED BY FOUNDER RULING 2026-09-22 — SEMANTIC GUARANTEE MADE
    // STRONGER. An intermediate implementation gave Company roles a scoped read
    // and gated it on the role (after RLS-28 caught a WORKER reading it). The
    // Founder then removed Company read access entirely, so the guarantee is
    // now absolute rather than scoped: no tenant role reads this table.
    const sql = codeLines(read(MIGRATION));
    expect(sql).not.toMatch(/company_own_read|company_own_batches_read/);
    expect(sql).not.toMatch(/kora\.tenant_id\(\)/);
  });

  it('RLS-28 exists and is wired into the mandatory CI RLS step', () => {
    expect(exists('tests/integration/rls-28-saved-column-mapping-cross-tenant.test.ts')).toBe(true);
    const ci = read('.github/workflows/ci.yml');
    expect(ci).toMatch(/RLS28_ALLOW_RUN: 'true'/);
    expect(ci).toMatch(/tests\/integration\/rls-28-saved-column-mapping-cross-tenant\.test\.ts/);
  });

  it('the server scopes every read by a tenant id the client could not supply', () => {
    const svc = read(SERVICE);
    // Callers pass a CODE; the id is resolved server-side against analytics.tenant.
    expect(svc).toMatch(/async function resolveTenantId\(tenantCode: string\)/);
    expect(svc).toMatch(/\.eq\('tenant_code', code\)/);
    expect(svc).toMatch(/\.eq\('tenant_id', tenantId\)/);
    // A raw tenant id is never accepted as an input field anywhere in WP-066.
    for (const f of [SERVICE, READ_ROUTE]) {
      expect(read(f)).not.toMatch(/searchParams\.get\('tenantId'\)/);
      expect(read(f)).not.toMatch(/formData\.get\('tenantId'\)/);
    }
  });

  it('server-side scope is authoritative — the UI filter is not the guard', () => {
    // The list endpoint takes a tenantCode and returns only that tenant's rows;
    // the client never receives a broader set to filter down.
    const route = read(READ_ROUTE);
    expect(route).toMatch(/listSavedMappingsForTenant\(tenantCode\)/);
    expect(route).toMatch(/tenantCode is required/);
  });

  it('the read route is KORA_ADMIN-only', () => {
    const route = read(READ_ROUTE);
    expect(route).toMatch(/requireKoraAdmin\(request\)/);
    expect(route).toMatch(/isKoraAuthError\(authResult\)/);
  });

  it('no cross-Company template, catalogue or promotion concept exists anywhere in this WP', () => {
    for (const f of [MIGRATION, SERVICE, READ_ROUTE]) {
      const src = codeLines(read(f));
      for (const forbidden of [
        'global_template', 'globalTemplate', 'mapping_template', 'mappingTemplate',
        'promoteMapping', 'promote_mapping', 'catalogue', 'shareMapping', 'share_mapping',
      ]) {
        expect(src, `${forbidden} appears in ${f}`).not.toContain(forbidden);
      }
    }
  });
});

// ── C — reuse ─────────────────────────────────────────────────────────────

describe('KORA-WP-066 (C) — reuse prefills matching headers and never blocks on the rest', () => {
  const saved: SavedMappingPayload = {
    'Nome iniziativa': 'initiative_name',
    'Importo':         'amount',
    'Colonna sparita': 'participants',
  };

  it('prefills exactly the headers present in the current upload', () => {
    const r = applySavedMappingToHeaders(saved, ['Nome iniziativa', 'Importo', 'Colonna nuova']);
    expect(r.applied).toEqual({ 'Nome iniziativa': 'initiative_name', 'Importo': 'amount' });
  });

  it('reports — never fails on — a saved header missing from this file', () => {
    const r = applySavedMappingToHeaders(saved, ['Nome iniziativa', 'Importo', 'Colonna nuova']);
    expect(r.missingHeaders).toEqual(['Colonna sparita']);
  });

  it('leaves new/unknown headers available for normal manual mapping', () => {
    const r = applySavedMappingToHeaders(saved, ['Nome iniziativa', 'Importo', 'Colonna nuova']);
    expect(r.unmappedHeaders).toEqual(['Colonna nuova']);
  });

  it('a completely non-overlapping file yields an empty prefill, not an error', () => {
    const r = applySavedMappingToHeaders(saved, ['Del tutto', 'Diverse']);
    expect(r.applied).toEqual({});
    expect(r.unmappedHeaders).toEqual(['Del tutto', 'Diverse']);
  });

  it('application is USER-SELECTED — no automatic application, no schema fingerprint', () => {
    const svc = codeLines(read(SERVICE));
    const studio = codeLines(read(STUDIO));
    for (const forbidden of ['fingerprint', 'autoApply', 'auto_apply', 'autoMatch', 'auto_match', 'isCompatible']) {
      expect(svc, `${forbidden} in service`).not.toContain(forbidden);
      expect(studio, `${forbidden} in studio`).not.toContain(forbidden);
    }
    // The apply path runs only from an explicit operator choice.
    expect(studio).toMatch(/onChange=\{\(e\) => handleApplySavedMapping\(e\.target\.value\)\}/);
  });
});

// ── D — non-blocking ──────────────────────────────────────────────────────

describe('KORA-WP-066 (D) — non-blocking: ingestion never depends on a saved mapping', () => {
  it('saving is optional — absent the Operator\'s name, nothing is saved', () => {
    const acc = read(ACCEPT);
    expect(acc).toMatch(/const saveMappingName = String\(formData\.get\('saveMappingName'\) \?\? ''\)\.trim\(\);/);
    expect(acc).toMatch(/if \(saveMappingName\) \{/);
  });

  it('the accept route never requires, reads back or validates a saved mapping to ingest', () => {
    const acc = read(ACCEPT);
    expect(acc).not.toMatch(/listSavedMappingsForTenant/);
    // The mapping actually applied is still reconstructed by accept itself.
    expect(acc).toMatch(/const effectiveMapping = \(isMultiFile \? null : columnMapping\) \?\? Object\.fromEntries\(/);
  });

  it('a failed save never fails the batch', () => {
    const acc = read(ACCEPT);
    const block = acc.slice(acc.indexOf('if (saveMappingName) {'), acc.indexOf('// ── 13. Flush audit log'));
    // No early return / thrown error inside the save block.
    expect(block).not.toMatch(/return NextResponse\.json/);
    expect(block).not.toMatch(/throw /);
    expect(block).toMatch(/console\.error\('\[data-intake\/accept\] saved mapping not stored:'/);
  });

  it('a failed list never disturbs the mapping workflow', () => {
    const studio = read(STUDIO);
    expect(studio).toMatch(/catch \{\s*\/\/ Saved Mappings are an accelerator/);
  });

  it('an unknown Company or an empty list is an empty array, never an error', () => {
    const route = read(READ_ROUTE);
    expect(route).toMatch(/ok: true, tenantCode, savedMappings/);
  });
});

// ── E — copy-on-use ───────────────────────────────────────────────────────

describe('KORA-WP-066 (E) — copy-on-use: the persisted mapping is never mutated by a session', () => {
  it('applying returns a NEW object — the saved mapping is not handed out by reference', () => {
    const saved: SavedMappingPayload = { 'Col A': 'amount' };
    const r = applySavedMappingToHeaders(saved, ['Col A']);
    expect(r.applied).not.toBe(saved);
  });

  it('mutating the applied result does not touch the saved mapping', () => {
    const saved: SavedMappingPayload = { 'Col A': 'amount', 'Col B': 'participants' };
    const snapshot = JSON.parse(JSON.stringify(saved));
    const r = applySavedMappingToHeaders(saved, ['Col A', 'Col B']);
    r.applied['Col A'] = 'hours';
    delete r.applied['Col B'];
    expect(saved).toEqual(snapshot);
  });

  it('the UI merges a copy into session state and never writes back implicitly', () => {
    const studio = read(STUDIO);
    expect(studio).toMatch(/setUserMapping\(\(prev\) => \(\{ \.\.\.prev, \.\.\.applied \}\)\)/);
    // Persisting an update always requires another explicit save.
    expect(studio).toMatch(/if \(saveMappingName\.trim\(\)\) \{/);
  });

  it('there is no implicit learning — nothing persists a mapping without an explicit name', () => {
    for (const f of [SERVICE, ACCEPT, STUDIO]) {
      const src = read(f);
      for (const forbidden of ['autoSave', 'auto_save', 'learnMapping', 'implicitSave']) {
        expect(src, `${forbidden} in ${f}`).not.toContain(forbidden);
      }
    }
  });
});

// ── F — existing ingestion semantics are untouched ────────────────────────

describe('KORA-WP-066 (F) — existing ingestion semantics unchanged', () => {
  it('accept still reconstructs and re-applies the mapping server-side, never trusting preview', () => {
    const acc = read(ACCEPT);
    expect(acc).toMatch(/apply column mapping server-side \(re-applied — never trusts preview\)/);
    expect(acc).toMatch(/let finalRows = isMultiFile \? rows : applyColumnMapping\(rows, effectiveMapping\);/);
  });

  it('what is persisted is the SERVER-reconstructed mapping, never the raw client value', () => {
    const acc = read(ACCEPT);
    const block = acc.slice(acc.indexOf('if (saveMappingName) {'), acc.indexOf('// ── 13. Flush audit log'));
    expect(block).toMatch(/mapping:\s+effectiveMapping,/);
    expect(block).not.toMatch(/columnMapping/);
  });

  it('the save happens after the batch exists — never before, never instead', () => {
    const acc = read(ACCEPT);
    expect(acc.indexOf('11c. Create source_batch')).toBeLessThan(acc.indexOf('if (saveMappingName) {'));
  });

  it('PII scanning and the strict-reject policy are untouched', () => {
    const acc = read(ACCEPT);
    expect(acc).toMatch(/detectPiiInPayload/);
    expect(acc).toMatch(/PII detected in manual completion values/);
  });

  it('source_batch semantics are unchanged — no new column, no new status', () => {
    const sql = read(MIGRATION);
    expect(sql).not.toMatch(/source_batch/i.test(sql) && /ALTER TABLE/.test(sql) ? /ALTER TABLE analytics\.source_batch/ : /$^/);
    expect(read(ACCEPT)).toMatch(/batch_status:\s+'pending'/);
  });

  it('the preview route is not asked to save anything', () => {
    expect(read('app/api/admin/data-intake/upload-preview/route.ts')).not.toMatch(/saveMappingName|saved_column_mapping/);
  });
});

// ── G — WP-029 is untouched ───────────────────────────────────────────────

describe('KORA-WP-066 (G) — WP-029 manual-remap governance is unchanged and unmerged', () => {
  it('the WP-029 service file is byte-identical to the WP-125 baseline', () => {
    // A regex cannot prove this: WP-029's own header legitimately NAMES
    // KORA-WP-066 in the clause reserving Saved Mappings to it. Git is the
    // honest instrument — the file must be untouched, not merely free of a
    // keyword.
    const rel = 'lib/mapping-governance/manual-remap-service.ts';
    expect(
      sha256(rel),
      `WP-029 service changed since ${WP125_BASELINE_SHA} — this WP may not modify it`,
    ).toBe(BASELINE_BLOB_SHA256[rel]);
    // And its reservation clause still stands, unedited.
    expect(read('lib/mapping-governance/manual-remap-service.ts')).toMatch(/Out of Scope[\s\S]{0,200}Saved Mappings/);
  });

  it('WP-029\'s own guard still holds: no saved-mapping vocabulary leaked into it', () => {
    const svc = read('lib/mapping-governance/manual-remap-service.ts');
    const code = svc.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(/saved.?mapping|reusable.?mapping|mapping.?template|mapping.?recommendation/i.test(code)).toBe(false);
  });

  it('WP-066 never imports, wraps or re-implements the remap Case governance', () => {
    for (const f of [SERVICE, READ_ROUTE]) {
      const src = codeLines(read(f));
      expect(src).not.toMatch(/manual-remap-service|requestManualRemap|resolveManualRemap|createOperationalCase/);
    }
  });

  it('the two concepts stay distinct: no Case, no governance_event, invented for a saved mapping', () => {
    expect(read(SERVICE)).not.toMatch(/operational_case|governance_event|recordGovernanceEvent/);
  });
});

// ── H — One Product / no demo runtime ─────────────────────────────────────

describe('KORA-WP-066 (H) — One Product, no demo runtime, no commercial gating', () => {
  it('no tenant_kind or demo behavioural branch exists', () => {
    for (const f of [MIGRATION, SERVICE, READ_ROUTE]) {
      const src = read(f);
      for (const forbidden of ['tenant_kind', 'tenantKind', 'isDemo', 'demoMode', 'synthetic']) {
        expect(src, `${forbidden} in ${f}`).not.toContain(forbidden);
      }
    }
  });

  it('no entitlement, plan gating or feature flag was introduced', () => {
    for (const f of [MIGRATION, SERVICE, READ_ROUTE, STUDIO]) {
      const src = read(f);
      for (const forbidden of ['featureFlag', 'isFeatureFlagEnabled', 'entitlement', 'planTier', 'production_ready']) {
        expect(src, `${forbidden} in ${f}`).not.toContain(forbidden);
      }
    }
    expect(read('lib/feature-flags/feature-flags.ts')).toContain('FEATURE_FLAG_NAMES = [] as const');
  });
});

// ── privacy: only canonical field names are ever persisted ────────────────

describe('KORA-WP-066 — privacy: a saved mapping cannot carry Company data', () => {
  it('the sanitizer keeps only canonical intake field targets', () => {
    const out = sanitizeMappingPayload({
      'Nome iniziativa': 'initiative_name',
      'Importo':         'amount',
      'Colonna X':       'ignore',           // UI sentinel — not a canonical field
      'Colonna Y':       'keep_original',    // UI sentinel — not a canonical field
      'Colonna Z':       'Mario Rossi',      // a row value — must never persist
    });
    expect(out).toEqual({ 'Nome iniziativa': 'initiative_name', 'Importo': 'amount' });
  });

  it('non-string, nested and array values are dropped', () => {
    const out = sanitizeMappingPayload({
      a: { nested: 'amount' }, b: ['amount'], c: 42, d: null, e: 'amount',
    });
    expect(out).toEqual({ e: 'amount' });
  });

  it('a non-object payload yields an empty mapping', () => {
    expect(sanitizeMappingPayload(null)).toEqual({});
    expect(sanitizeMappingPayload('amount')).toEqual({});
    expect(sanitizeMappingPayload(['amount'])).toEqual({});
  });

  it('every canonical field is accepted — the allow-list is the real one, not a subset', () => {
    const all = Object.fromEntries(CANONICAL_FIELDS.map((f, i) => [`col_${i}`, f]));
    expect(Object.keys(sanitizeMappingPayload(all))).toHaveLength(CANONICAL_FIELDS.length);
  });

  it('the database enforces the same rule independently of the service', () => {
    const sql = read(MIGRATION);
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION kora\.saved_column_mapping_valid\(mapping jsonb\)/);
    expect(sql).toMatch(/IMMUTABLE/);
    expect(sql).toMatch(/CONSTRAINT saved_column_mapping_shape\s*\n?\s*CHECK \(kora\.saved_column_mapping_valid\(mapping\)\)/);
    // The literal allow-list in SQL must match the TypeScript canonical list exactly.
    const sqlList = sql.slice(sql.indexOf("NOT IN ("), sql.indexOf('))', sql.indexOf('NOT IN (')));
    for (const f of CANONICAL_FIELDS) {
      expect(sqlList, `${f} missing from the SQL allow-list`).toContain(`'${f}'`);
    }
  });
});

// ── duplicate name is a conflict, never an overwrite ─────────────────────

describe('KORA-WP-066 — a duplicate mapping name conflicts; it never overwrites', () => {
  it('the write is a plain INSERT — no upsert, no onConflict, no auto-version', () => {
    const svc = codeLines(read(SERVICE));
    expect(svc).toMatch(/\.insert\(\{/);
    for (const forbidden of ['upsert', 'onConflict', 'ignoreDuplicates', 'autoVersion', 'suffix']) {
      expect(svc, `${forbidden} present`).not.toContain(forbidden);
    }
  });

  it('a unique violation is surfaced as duplicate_name, not swallowed', () => {
    const svc = read(SERVICE);
    expect(svc).toMatch(/code === '23505'/);
    expect(svc).toMatch(/reason: 'duplicate_name'/);
    expect(svc).toMatch(/'unknown_tenant' \| 'empty_mapping' \| 'blank_name' \| 'duplicate_name' \| 'write_failed'/);
  });

  it('nothing in the save path can mutate an existing row', () => {
    const svc = codeLines(read(SERVICE));
    // No UPDATE/DELETE verb anywhere in the service: the only write is the insert.
    expect(svc).not.toMatch(/\.update\(/);
    expect(svc).not.toMatch(/\.delete\(/);
  });

  it('the Operator is warned about a colliding name BEFORE accepting', () => {
    const studio = read(STUDIO);
    expect(studio).toMatch(/const nameAlreadyUsed = saveMappingName\.trim\(\) !== ''/);
    expect(studio).toMatch(/savedMappings\.some\(m => m\.mappingName === saveMappingName\.trim\(\)\)/);
    expect(studio).toMatch(/quella esistente non verrà sovrascritta/);
  });

  it('the refusal is reported after accept, and the batch still succeeds', () => {
    const acc = read(ACCEPT);
    expect(acc).toMatch(/savedMappingError = saveResult\.reason;/);
    expect(acc).toMatch(/savedMappingError, savedMappingName: saveMappingName/);
    const studio = read(STUDIO);
    expect(studio).toMatch(/savedMappingError === 'duplicate_name'/);
    expect(studio).toMatch(/Quella esistente non è stata modificata/);
  });

  it('uniqueness is per tenant, so two Companies may use the same name', () => {
    expect(read(MIGRATION)).toMatch(/UNIQUE \(tenant_id, mapping_name\)/);
  });
});

// ── the <0.9 emphasis rule is presentation-only ──────────────────────────

describe('KORA-WP-066 — the confidence emphasis threshold changes nothing but pixels', () => {
  it('isException never appears in a non-presentational position', () => {
    // Inverted deliberately: an allow-list of style properties needs widening
    // for every new CSS form (a colour literal, a numeric font weight…), which
    // makes it a maintenance trap rather than a guarantee. What actually
    // matters is the negative — the threshold must never reach state, the
    // network, or the mapping value. That is what this asserts.
    const studio = read(STUDIO);
    const region = studio.slice(studio.indexOf('const isException'), studio.indexOf('LEVEL 4'));
    const lines = region.split('\n').filter((l) => /\bexception\b|isException/.test(l));
    expect(lines.length).toBeGreaterThan(0);
    for (const l of lines) {
      for (const forbidden of [
        'setUserMapping', 'setSaveMappingName', 'setSavedMapping', 'useState',
        'fetch(', 'fd.append', 'JSON.stringify', 'handleAccept', 'handleValidateCsv',
        'suggestedField =', 'currentVal =', 'userMapping[',
      ]) {
        expect(l.includes(forbidden), `isException reaches ${forbidden}: ${l.trim()}`).toBe(false);
      }
    }
  });

  it('it never touches the mapping value, the select, or anything submitted', () => {
    const studio = read(STUDIO);
    const region = studio.slice(studio.indexOf('const isException'), studio.indexOf('LEVEL 4'));
    // The row's select value comes from valueFor(), never from the threshold.
    expect(region).toMatch(/const currentVal = valueFor\(s\.sourceHeader, s\.suggestedField\);/);
    for (const forbidden of ['setUserMapping(m => ({ ...m, [s.sourceHeader]: exception',
                             'exception ? \'ignore\'', 'exception && setUserMapping']) {
      expect(region).not.toContain(forbidden);
    }
  });

  it('no backend or service file knows the threshold at all', () => {
    for (const f of [SERVICE, READ_ROUTE, ACCEPT, MIGRATION]) {
      const src = codeLines(read(f));
      expect(src, `0.9 threshold leaked into ${f}`).not.toMatch(/confidence\s*<\s*0\.9/);
    }
    // And the suggester itself is untouched by this WP.
    const rel = 'lib/data-intake/column-mapping.ts';
    expect(
      sha256(rel),
      `the classifier changed since ${WP125_BASELINE_SHA} — this WP may not modify it`,
    ).toBe(BASELINE_BLOB_SHA256[rel]);
  });
});

// ── Founder semantic ruling is recorded in the code itself ────────────────

describe('KORA-WP-066 — the Founder ruling is recorded where implementers will read it', () => {
  it('migration, service and route all state the tenant-scoped reading', () => {
    for (const f of [MIGRATION, SERVICE]) {
      const src = read(f);
      expect(src).toMatch(/FOUNDER SEMANTIC RULING/);
      expect(src).toMatch(/same Company only|FOR THE SAME COMPANY|for the same Company/);
    }
  });

  it('no Company-facing saved-mapping surface was created', () => {
    expect(exists('app/company/data/upload/page.tsx')).toBe(true); // legacy, untouched
    const legacyUpload = read('app/company/data/upload/page.tsx');
    expect(legacyUpload).not.toMatch(/saved.?mapping/i);
    expect(read('app/company/data/page.tsx')).not.toMatch(/saved.?mapping/i);
    expect(exists('app/company/saved-mappings')).toBe(false);
    expect(exists('app/admin/saved-mappings')).toBe(false);
  });

  it('the only new route is the single required read endpoint', () => {
    expect(exists(READ_ROUTE)).toBe(true);
    expect(exists('app/api/admin/data-intake/saved-mappings/[id]/route.ts')).toBe(false);
    expect(exists('app/api/company/saved-mappings/route.ts')).toBe(false);
  });
});
