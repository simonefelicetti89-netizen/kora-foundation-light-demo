/**
 * CC-002 / B-INV — Constitutional Invariant I2: N≥10 canonical threshold, no duplicates.
 *
 * SCOPE / WHAT THIS PROVES:
 *   Scans app/, services/, lib/, components/ (excluding tests and the canonical
 *   file itself) for a local `const`/`let` declaration whose name looks like a
 *   privacy aggregation threshold (THRESHOLD, MIN_GROUP_SIZE, MIN_COHORT_SIZE,
 *   GROUP_THRESHOLD, AGGREGATION_THRESHOLD — case-insensitive) assigned the
 *   literal `10`. The only allowed source for that value is
 *   `SAFE_AGGREGATION_THRESHOLD` in lib/constants/kora.ts.
 *
 *   This is a naming-pattern match, not a value match — it does NOT flag every
 *   unrelated `= 10` in the codebase (e.g. retry counts, page sizes), only
 *   identifiers that are semantically named as a group/aggregation threshold.
 *
 * CC-002 fixed 5 duplicate definitions found by this exact search:
 *   - app/company/activation/page.tsx (local SAFE_AGGREGATION_THRESHOLD = 10)
 *   - services/worker-pillar-adoption/WorkerPillarAdoptionService.ts (SAFE_THRESHOLD = 10)
 *   - lib/roster-import/roster-validation.ts (PRIVACY_THRESHOLD = 10)
 *   - app/api/company/workers/activation-aggregate/route.ts (`?? 10` fallback)
 *   - lib/privacy/group-threshold.ts (DEFAULT_MIN_GROUP_SIZE = 10, now re-exported
 *     from the canonical constant instead of independently defined)
 *
 * WHAT THIS DOES NOT PROVE:
 *   It does not verify runtime suppression behavior (see lib/privacy/group-threshold.ts's
 *   own unit tests for that) — only that the numeric source is not duplicated.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative } from 'path';

const root = resolve(process.cwd());
const SCAN_DIRS = ['app', 'services', 'lib', 'components'];
const CANONICAL_FILE = resolve(root, 'lib/constants/kora.ts');

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

// Matches: (const|let) SOME_NAME = 10;  where SOME_NAME looks like a
// group/aggregation privacy threshold identifier.
const THRESHOLD_NAME_PATTERN = /(THRESHOLD|MIN_GROUP_SIZE|MIN_COHORT_SIZE|GROUP_THRESHOLD)/i;
const DECLARATION_LITERAL_10 = /\b(?:const|let)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*10\s*;/g;
// Matches: `??  10` fallback pattern on a variable/property named like a threshold.
const FALLBACK_LITERAL_10 = /(\w*(?:threshold|aggregation)\w*)\s*\?\?\s*10\b/gi;

interface Violation {
  file: string;
  line: number;
  snippet: string;
}

function findDuplicateThresholdDeclarations(): Violation[] {
  const violations: Violation[] = [];
  const files = SCAN_DIRS.flatMap((d) => walk(resolve(root, d)));

  for (const file of files) {
    if (file === CANONICAL_FILE) continue;
    const content = readFileSync(file, 'utf8');
    const lines = content.split('\n');

    lines.forEach((lineText, idx) => {
      DECLARATION_LITERAL_10.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = DECLARATION_LITERAL_10.exec(lineText))) {
        const name = m[1];
        if (THRESHOLD_NAME_PATTERN.test(name)) {
          violations.push({ file: relative(root, file), line: idx + 1, snippet: lineText.trim() });
        }
      }
      FALLBACK_LITERAL_10.lastIndex = 0;
      while ((m = FALLBACK_LITERAL_10.exec(lineText))) {
        violations.push({ file: relative(root, file), line: idx + 1, snippet: lineText.trim() });
      }
    });
  }

  return violations;
}

describe('I2 — canonical N≥10 threshold, no duplicated constants (B-INV / CC-002)', () => {
  it('lib/constants/kora.ts still exports SAFE_AGGREGATION_THRESHOLD = 10', () => {
    const content = readFileSync(CANONICAL_FILE, 'utf8');
    expect(content).toMatch(/export const SAFE_AGGREGATION_THRESHOLD\s*=\s*10\s*;/);
  });

  it('lib/privacy/group-threshold.ts re-exports the canonical value instead of redefining it', () => {
    const content = readFileSync(resolve(root, 'lib/privacy/group-threshold.ts'), 'utf8');
    expect(content).toMatch(/import\s*\{\s*SAFE_AGGREGATION_THRESHOLD\s*\}\s*from\s*['"]@\/lib\/constants\/kora['"]/);
    expect(content).toMatch(/export const DEFAULT_MIN_GROUP_SIZE\s*=\s*SAFE_AGGREGATION_THRESHOLD\s*;/);
    // Must not independently redefine the value as a literal 10.
    expect(content).not.toMatch(/export const DEFAULT_MIN_GROUP_SIZE\s*=\s*10\s*;/);
  });

  it('no other file in app/ services/ lib/ components/ locally declares a threshold-named constant as literal 10', () => {
    const violations = findDuplicateThresholdDeclarations();
    if (violations.length > 0) {
      const report = violations.map((v) => `  ${v.file}:${v.line}  ${v.snippet}`).join('\n');
      throw new Error(
        `Found ${violations.length} duplicate privacy-threshold constant(s) outside the canonical source ` +
          `(lib/constants/kora.ts). Import SAFE_AGGREGATION_THRESHOLD instead:\n${report}`,
      );
    }
    expect(violations).toHaveLength(0);
  });

  // ── Adversarial check (I2 acceptance criteria) ──────────────────────────────
  // Proves the detector itself actually catches a reintroduced duplicate — run
  // against an in-memory sample, never written to a real file in the repo.
  it('ADVERSARIAL — detector flags a simulated reintroduced duplicate constant', () => {
    const simulatedBadLine = "const SAFE_AGGREGATION_THRESHOLD = 10; // reintroduced duplicate";
    DECLARATION_LITERAL_10.lastIndex = 0;
    const match = DECLARATION_LITERAL_10.exec(simulatedBadLine);
    expect(match).not.toBeNull();
    expect(THRESHOLD_NAME_PATTERN.test(match![1])).toBe(true);
  });

  it('ADVERSARIAL — detector flags a simulated reintroduced `?? 10` fallback', () => {
    const simulatedBadLine = "const threshold = fn.safe_aggregation_threshold ?? 10;";
    FALLBACK_LITERAL_10.lastIndex = 0;
    const match = FALLBACK_LITERAL_10.exec(simulatedBadLine);
    expect(match).not.toBeNull();
  });
});
