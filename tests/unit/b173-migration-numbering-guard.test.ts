/**
 * B173-FIX-01 / B173-FIX-02 — Migration numbering collision guard.
 *
 * B173-FIX-01: B173-RO found that
 * supabase/proposed/032_contribution_atomic_attribution.sql and
 * supabase/proposed/033_initiative_adoption_source_model.sql (reserved
 * 2026-06-24) silently collided with active migrations
 * supabase/migrations/032_network_schema_grants.sql and
 * supabase/migrations/033_personal_worker_identity_service_role_grant.sql
 * (added 2026-07-09) — nobody re-checked supabase/proposed/ before reusing
 * those numbers. Fixed by renumbering to 037/038.
 *
 * B173-FIX-02 (KORA-LINK-HARDENING-AUTOMATION-13A out-of-order-risk fix):
 * 039_kora_link_audit_hardening.sql was created directly in
 * supabase/migrations/, which would have left 037/038 in supabase/proposed/
 * chronologically BEHIND the already-canonical 039 — a future promotion of
 * 037/038 would then require out-of-order handling (--include-all) instead
 * of a clean linear apply. Fixed by renumbering 037 → 040 and 038 → 041,
 * ahead of 039, so any future promotion stays linear.
 *
 * Deliberately does not hardcode a total file count or a maximum migration
 * number — those are expected to grow over time. It only asserts structural
 * properties: no duplicate numeric prefixes, no overlap between the two
 * directories, the specific file-level facts fixed by these repairs, and
 * (B173-FIX-02) that no future proposed migration can reuse a number at or
 * below the highest canonical migration — the exact class of risk that
 * necessitated this second renumbering.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());

function migrationNumbers(dir: string): number[] {
  const files = readdirSync(resolve(root, dir)).filter((f) => f.endsWith('.sql'));
  return files
    .map((f) => parseInt(f.split('_')[0], 10))
    .filter((n) => !Number.isNaN(n));
}

function duplicates(numbers: number[]): number[] {
  const seen = new Set<number>();
  const dupes = new Set<number>();
  for (const n of numbers) {
    if (seen.has(n)) dupes.add(n);
    seen.add(n);
  }
  return Array.from(dupes);
}

describe('B173-FIX-01 — no duplicate numeric prefixes within supabase/migrations/', () => {
  it('every migration number in supabase/migrations/ appears exactly once', () => {
    const numbers = migrationNumbers('supabase/migrations');
    expect(duplicates(numbers)).toEqual([]);
  });
});

describe('B173-FIX-01 — no duplicate numeric prefixes within supabase/proposed/', () => {
  it('every migration number in supabase/proposed/ appears exactly once', () => {
    const numbers = migrationNumbers('supabase/proposed');
    expect(duplicates(numbers)).toEqual([]);
  });
});

describe('B173-FIX-01 — no numeric prefix overlap between supabase/proposed/ and supabase/migrations/', () => {
  it('no number is claimed by both an active migration and a proposed migration', () => {
    const activeNumbers = new Set(migrationNumbers('supabase/migrations'));
    const proposedNumbers = migrationNumbers('supabase/proposed');
    const overlap = proposedNumbers.filter((n) => activeNumbers.has(n));
    expect(overlap).toEqual([]);
  });
});

describe('B173-FIX-01 — 029 remains quarantined', () => {
  it('029 is absent from supabase/migrations/ (rollback script, intentionally quarantined to supabase/rollback/)', () => {
    const numbers = new Set(migrationNumbers('supabase/migrations'));
    expect(numbers.has(29)).toBe(false);
  });
});

describe('B173-FIX-02 — renamed proposed files present at their new numbers', () => {
  it('040_contribution_atomic_attribution.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/040_contribution_atomic_attribution.sql'))).toBe(true);
  });

  it('041_initiative_adoption_source_model.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/041_initiative_adoption_source_model.sql'))).toBe(true);
  });
});

describe('B173-FIX-01/02 — every superseded proposed filename no longer exists', () => {
  it('032_contribution_atomic_attribution.sql is absent from supabase/proposed/ (B173-FIX-01)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/032_contribution_atomic_attribution.sql'))).toBe(false);
  });

  it('033_initiative_adoption_source_model.sql is absent from supabase/proposed/ (B173-FIX-01)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/033_initiative_adoption_source_model.sql'))).toBe(false);
  });

  it('037_contribution_atomic_attribution.sql is absent from supabase/proposed/ (B173-FIX-02)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/037_contribution_atomic_attribution.sql'))).toBe(false);
  });

  it('038_initiative_adoption_source_model.sql is absent from supabase/proposed/ (B173-FIX-02)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/038_initiative_adoption_source_model.sql'))).toBe(false);
  });
});

describe('B173-FIX-01 — active migrations 032/033 untouched by this repair', () => {
  it('032_network_schema_grants.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/032_network_schema_grants.sql'))).toBe(true);
  });

  it('033_personal_worker_identity_service_role_grant.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/033_personal_worker_identity_service_role_grant.sql'))).toBe(true);
  });
});

describe('B173-FIX-02 — canonical migrations 034-036/039 untouched by this repair', () => {
  it('036_kora_link_rpc_functions.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/036_kora_link_rpc_functions.sql'))).toBe(true);
  });

  it('039_kora_link_audit_hardening.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/039_kora_link_audit_hardening.sql'))).toBe(true);
  });
});

describe('B173-FIX-02 — no future proposed migration reuses a number at or below the highest canonical migration', () => {
  it('every number in supabase/proposed/ is strictly greater than the highest number in supabase/migrations/', () => {
    const canonicalNumbers = migrationNumbers('supabase/migrations');
    const proposedNumbers = migrationNumbers('supabase/proposed');
    expect(canonicalNumbers.length).toBeGreaterThan(0);
    expect(proposedNumbers.length).toBeGreaterThan(0);
    const highestCanonical = Math.max(...canonicalNumbers);
    const outOfOrder = proposedNumbers.filter((n) => n <= highestCanonical);
    expect(
      outOfOrder,
      `supabase/proposed/ contains number(s) ${outOfOrder.join(', ')} at or below the highest canonical migration ` +
        `(${highestCanonical}) — this is exactly the out-of-order risk B173-FIX-02 closed. Any new proposed ` +
        `migration must use a number strictly greater than the current highest canonical migration.`,
    ).toEqual([]);
  });
});
