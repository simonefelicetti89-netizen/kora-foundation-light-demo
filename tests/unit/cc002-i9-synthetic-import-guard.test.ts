/**
 * CC-002 / B-INV — Constitutional Invariant I9: synthetic import allowlist,
 * progressively → 0 (B-TRUTH's job, not CC-002's).
 *
 * SCOPE:
 *   Scans app/, services/, lib/, components/ (never tests/ or scripts/) for
 *   any `import ... from '@/data/synthetic/...'` statement — a real runtime
 *   import, not a comment mentioning the path. Every match must appear in
 *   lib/security/synthetic-import-allowlist.ts. A NEW, non-allowlisted import
 *   fails this test immediately. This does NOT reduce the current count —
 *   that is explicitly B-TRUTH's job (Master Plan §19/§28) — it only makes
 *   the count visible and prevents silent growth.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';
import { SYNTHETIC_IMPORT_ALLOWLIST } from '@/lib/security/synthetic-import-allowlist';

const root = resolve(process.cwd());
const SCAN_DIRS = ['app', 'services', 'lib', 'components'];
const EXCLUDED_DIR_NAMES = new Set(['node_modules', '.next', '.git']);

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (EXCLUDED_DIR_NAMES.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// Real import statement only — `import X from '@/data/synthetic/...'` or
// `import X from '.../data/synthetic/...'`. Does not match comments
// mentioning the path (those aren't runtime imports).
const SYNTHETIC_IMPORT_PATTERN = /^\s*import\s+.+\s+from\s+['"][^'"]*\/data\/synthetic\/[^'"]+['"]\s*;?\s*$/;

interface ScanResult {
  file: string; // repo-relative, e.g. "services/tenant/TenantService.ts"
  importCount: number;
}

function scanForSyntheticImports(): ScanResult[] {
  const files = SCAN_DIRS.flatMap((d) => walk(resolve(root, d)));
  const results: ScanResult[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');
    const importCount = lines.filter((l) => SYNTHETIC_IMPORT_PATTERN.test(l)).length;
    if (importCount > 0) {
      results.push({ file: relative(root, file), importCount });
    }
  }
  return results;
}

describe('I9 — synthetic import allowlist, measurable and growth-blocked (B-INV / CC-002)', () => {
  it('the live scan of app/services/lib/components matches the allowlist exactly (no new, no stale entries)', () => {
    const live = scanForSyntheticImports();
    const liveFiles = new Set(live.map((r) => r.file));
    const allowlistFiles = new Set(SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file));

    const newUnauthorized = [...liveFiles].filter((f) => !allowlistFiles.has(f));
    const staleAllowlistEntries = [...allowlistFiles].filter((f) => !liveFiles.has(f));

    if (newUnauthorized.length > 0) {
      throw new Error(
        `Found ${newUnauthorized.length} NEW runtime import(s) of data/synthetic/** not in the I9 allowlist ` +
          `(lib/security/synthetic-import-allowlist.ts). Either this is a genuine new demo-path dependency ` +
          `(add it to the allowlist with a reason) or an accidental leak of synthetic data into a live path ` +
          `(fix the import instead):\n  ${newUnauthorized.join('\n  ')}`,
      );
    }
    if (staleAllowlistEntries.length > 0) {
      throw new Error(
        `The I9 allowlist lists file(s) that no longer import data/synthetic/** — remove the stale entries ` +
          `(this is expected, welcome progress toward B-TRUTH's N→0 goal):\n  ${staleAllowlistEntries.join('\n  ')}`,
      );
    }

    expect(newUnauthorized).toEqual([]);
    expect(staleAllowlistEntries).toEqual([]);
  });

  it('CURRENT_SYNTHETIC_RUNTIME_IMPORTS is measurable — reports the current count', () => {
    const live = scanForSyntheticImports();
    const fileCount = live.length;
    const statementCount = live.reduce((s, r) => s + r.importCount, 0);

    // Not a strict pass/fail gate — this test's job is to make the number
    // visible in test output, matching CC-002's I9 acceptance criteria
    // ("CC-002 deve poter dire: CURRENT_SYNTHETIC_RUNTIME_IMPORTS = N").
    // eslint-disable-next-line no-console
    console.log(`CURRENT_SYNTHETIC_RUNTIME_IMPORTS = ${fileCount} files / ${statementCount} import statements`);
    // PRIOR HISTORY (accurate as of CC-002, preserved verbatim): "sanity:
    // demo path still exists pre-B-TRUTH" — asserted fileCount > 0. B-WORKER
    // WorkerProvisioning Canonicalization (2026-09-06) retired the final
    // synthetic runtime import (WorkerProvisioningService.ts) — I9 = 0 is
    // now the correct, achieved state, not a sanity-check failure. See
    // tests/unit/bworker-workerprovisioning-canonicalization.test.ts.
    expect(fileCount).toBe(0);
    expect(fileCount).toBe(SYNTHETIC_IMPORT_ALLOWLIST.length);
  });

  it('every allowlist entry has a non-empty reason', () => {
    for (const entry of SYNTHETIC_IMPORT_ALLOWLIST) {
      expect(entry.reason.length).toBeGreaterThan(10);
    }
  });

  it('the allowlist has no duplicate file entries', () => {
    const files = SYNTHETIC_IMPORT_ALLOWLIST.map((e) => e.file);
    expect(new Set(files).size).toBe(files.length);
  });

  // ── Adversarial check (I9 acceptance criteria) ──────────────────────────────
  // Proves the detector regex itself correctly matches a real import
  // statement and correctly ignores a comment — run against in-memory
  // strings, never written to a real file.
  it('ADVERSARIAL — detector flags a simulated new unauthorized synthetic import', () => {
    const simulatedNewImportLine = "import badData from '@/data/synthetic/some-new-file.json';";
    expect(SYNTHETIC_IMPORT_PATTERN.test(simulatedNewImportLine)).toBe(true);
  });

  it('ADVERSARIAL — detector does not false-positive on a comment mentioning the path', () => {
    const simulatedComment = "// see data/synthetic/some-file.json for the shape";
    expect(SYNTHETIC_IMPORT_PATTERN.test(simulatedComment)).toBe(false);
  });
});
