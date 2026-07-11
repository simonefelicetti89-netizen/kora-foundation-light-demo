/**
 * B173-FIX-01 — Migration numbering collision guard.
 *
 * B173-RO found that supabase/proposed/032_contribution_atomic_attribution.sql
 * and supabase/proposed/033_initiative_adoption_source_model.sql (reserved
 * 2026-06-24) silently collided with active migrations
 * supabase/migrations/032_network_schema_grants.sql and
 * supabase/migrations/033_personal_worker_identity_service_role_grant.sql
 * (added 2026-07-09) — nobody re-checked supabase/proposed/ before reusing
 * those numbers. The existing migration-count tests only ever scanned
 * supabase/migrations/ in isolation, so this class of collision went
 * undetected. This file guards the structural invariant across BOTH
 * directories so it cannot silently recur.
 *
 * Deliberately does not hardcode a total file count or a maximum migration
 * number — those are expected to grow over time. It only asserts structural
 * properties: no duplicate numeric prefixes, no overlap between the two
 * directories, and the specific file-level facts fixed by this repair.
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

describe('B173-FIX-01 — renamed proposed files present at their new numbers', () => {
  it('037_contribution_atomic_attribution.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/037_contribution_atomic_attribution.sql'))).toBe(true);
  });

  it('038_initiative_adoption_source_model.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/038_initiative_adoption_source_model.sql'))).toBe(true);
  });
});

describe('B173-FIX-01 — old colliding proposed filenames no longer exist', () => {
  it('032_contribution_atomic_attribution.sql is absent from supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/032_contribution_atomic_attribution.sql'))).toBe(false);
  });

  it('033_initiative_adoption_source_model.sql is absent from supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/033_initiative_adoption_source_model.sql'))).toBe(false);
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
