// tests/unit/r0a-db-gate-enforcement.test.ts
//
// R0-A — CI REAL-DB ENFORCEMENT: the drift guard.
//
// THE DEFECT THIS EXISTS TO PREVENT. The repository accumulated 32 DB
// execution gates while CI enforced 26. Six canonical suites — 186 real
// database assertions — passed locally and were enforced nowhere, so the
// full-suite pass count overstated continuously enforced coverage. Wiring
// those six fixes today; this guard is what stops the gap reopening.
//
// THE RULE. Every `*_ALLOW_RUN` gate discovered in tests/ must be either
// ENFORCED by CI or EXPLICITLY EXCLUDED below with a canonical reason. A gate
// that is neither fails this test, so a future DB suite cannot be added
// without a deliberate classification decision.
//
// WHAT IS NOT A VALID EXCLUSION. "Difficult to wire" and "currently fails"
// are not reasons — they describe a defect, and a defect belongs in the
// blocker category, not in this list. An exclusion needs a governance source
// and a revisit condition.
//
// This follows the repository's own established precedent rather than
// inventing a framework: tests/unit/pilot-trust-01-service-role-guard.test.ts
// embeds its allowlist in the guard itself, with a one-line reason per entry.

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const REPO_ROOT = join(__dirname, '..', '..');
const TESTS_DIR = join(REPO_ROOT, 'tests');
const WORKFLOW_DIR = join(REPO_ROOT, '.github', 'workflows');

const GATE_PATTERN = /\b([A-Z][A-Z0-9_]*_ALLOW_RUN)\b/g;

/**
 * Gates deliberately not enforced by CI.
 *
 * EMPTY BY DESIGN. Every canonical DB gate discovered at R0-A's execution is
 * enforced — including `WP117_ALLOW_RUN`, whose committed suite
 * (`kora-wp-117-koral-mark-substrate.test.ts`) exercises only the eight
 * COMMITTED `lib/living-koral-mark/*` substrate modules. It references none of
 * the deferred WP-117 renderer files, which are not on this branch at all, so
 * running it validates already-canonical substrate and does not advance
 * deferred WP-117 acceptance. WP-117's Founder deferral is untouched by it.
 *
 * To add an entry, supply all three fields. A reason alone is not enough.
 */
const DELIBERATE_EXCLUSIONS: ReadonlyArray<{
  gate: string;
  reason: string;
  governanceSource: string;
  revisitCondition: string;
}> = [];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

function discoverGates(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const file of walk(TESTS_DIR)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(GATE_PATTERN)) {
      const gate = m[1];
      const rel = relative(REPO_ROOT, file);
      const list = found.get(gate) ?? [];
      if (!list.includes(rel)) list.push(rel);
      found.set(gate, list);
    }
  }
  return found;
}

function workflowText(): string {
  if (!existsSync(WORKFLOW_DIR)) return '';
  return readdirSync(WORKFLOW_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => readFileSync(join(WORKFLOW_DIR, f), 'utf8'))
    .join('\n');
}

describe('R0-A — every DB execution gate is enforced or explicitly excluded', () => {
  const gates = discoverGates();
  const ci = workflowText();
  const excluded = new Set(DELIBERATE_EXCLUSIONS.map((e) => e.gate));

  it('the scanner finds real gates (self-test — a broken scanner must not pass silently)', () => {
    expect(gates.size).toBeGreaterThan(20);
    expect([...gates.keys()]).toContain('RLS03_ALLOW_RUN');
    expect([...gates.keys()]).toContain('WP045_ALLOW_RUN');
  });

  it('no DB gate is unclassified — every gate is CI-enforced or explicitly excluded', () => {
    const unclassified: string[] = [];
    for (const [gate, files] of gates) {
      if (ci.includes(gate)) continue;
      if (excluded.has(gate)) continue;
      unclassified.push(`${gate} (${files.join(', ')})`);
    }
    expect(
      unclassified,
      'DB gate(s) neither enforced by CI nor in DELIBERATE_EXCLUSIONS. ' +
        'Wire the suite into .github/workflows/ci.yml, or add an entry with a ' +
        'canonical reason, governance source and revisit condition. ' +
        '"Difficult to wire" and "currently fails" are not valid exclusions:\n  ' +
        unclassified.join('\n  '),
    ).toEqual([]);
  });

  it('every exclusion carries a reason, a governance source and a revisit condition', () => {
    for (const e of DELIBERATE_EXCLUSIONS) {
      expect(e.reason.trim().length, `${e.gate} has no reason`).toBeGreaterThan(20);
      expect(e.governanceSource.trim().length, `${e.gate} has no governance source`).toBeGreaterThan(3);
      expect(e.revisitCondition.trim().length, `${e.gate} has no revisit condition`).toBeGreaterThan(3);
      for (const bad of ['difficult', 'currently fails', 'flaky', 'too slow']) {
        expect(
          e.reason.toLowerCase().includes(bad),
          `${e.gate}: "${bad}" describes a defect, not a canonical exclusion`,
        ).toBe(false);
      }
    }
  });

  it('an excluded gate is never also wired into CI — the two lists cannot disagree', () => {
    for (const e of DELIBERATE_EXCLUSIONS) {
      expect(ci.includes(e.gate), `${e.gate} is listed as excluded but is wired into CI`).toBe(false);
    }
  });

  it('the six suites R0-A newly enforced are wired and stay wired', () => {
    for (const gate of [
      'COMMONS_GRANT_ALLOW_RUN',
      'WP045_ALLOW_RUN',
      'WP112_ALLOW_RUN',
      'WP113_ALLOW_RUN',
      'WP116_ALLOW_RUN',
      'WP117_ALLOW_RUN',
    ]) {
      expect(ci.includes(gate), `${gate} lost its CI wiring`).toBe(true);
    }
  });

  it('CI watches the canonical Product-truth line, not only archival main', () => {
    // R0-B (report 243) makes `integration/**` Product truth and `main`
    // archival. Enforcement that runs only on `main` would verify code after
    // it had already shipped.
    expect(ci).toMatch(/branches:\s*\[main,\s*'integration\/\*\*',\s*'release\/\*\*'\]/);
  });

  it('the DB-gate assertions fail loudly — no silent pass on skip', () => {
    expect(ci).toMatch(/Assert 0 R0-A DB-gated tests skipped and 0 failed/);
    expect(ci).toMatch(/numPendingTests !== 0/);
    // The pre-existing RLS gate must remain intact and unweakened.
    expect(ci).toMatch(/Assert 0 RLS tests skipped and 0 failed/);
    // No blanket suppression anywhere in the DB jobs.
    expect(ci).not.toMatch(/vitest run[^\n]*\|\|\s*true/);
  });
});
