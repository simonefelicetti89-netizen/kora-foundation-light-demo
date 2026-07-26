/**
 * B173-FIX-01 / B173-FIX-02 / B173-FIX-03 / B173-FIX-04 — Migration numbering
 * collision guard.
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
 * ahead of 039, so any future promotion stays linear. The out-of-order guard
 * (below) was added at this point specifically to catch recurrences of this
 * exact class automatically.
 *
 * B173-FIX-03 (KORA-LINK-HARDENING-AUTOMATION-13B): the guard added in
 * B173-FIX-02 fired again — 042_kora_link_company_partner_provisioning.sql
 * was, in turn, created directly in supabase/migrations/, leaving 040/041
 * chronologically BEHIND the new highest canonical migration (42). Fixed the
 * same way: renumbered 040 → 043 and 041 → 044, ahead of 042. This
 * demonstrates the guard doing exactly what it was built for — catching the
 * same risk class against the test author's OWN new migration, not just
 * historical ones.
 *
 * B173-FIX-04 (KORA-LINK-HARDENING-AUTOMATION-13B, governance correction —
 * same sprint as B173-FIX-03, applied immediately after it): three
 * renumberings in a row is a structural problem, not three unrelated
 * incidents — carrying ANY canonical-looking 3-digit number on an unapplied
 * proposed file guarantees another renumbering the next time a new canonical
 * migration is created (a normal, frequent event). Root-fixed by removing
 * numbers from supabase/proposed/ filenames entirely: 043 → draft_
 * contribution_atomic_attribution.sql, 044 → draft_initiative_adoption_
 * source_model.sql. A draft file gets its first real number only at
 * promotion time (computed then, as the next free number after whatever the
 * highest canonical migration is AT THAT MOMENT) — there is no longer a
 * number for a new canonical migration to invalidate. This supersedes the
 * B173-FIX-02 numeric "proposed number > highest canonical" comparison
 * (nothing to compare once proposed files carry no number) with a simpler,
 * permanent structural rule: no file in supabase/proposed/ may start with
 * three digits, ever.
 *
 * Deliberately does not hardcode a total file count or a maximum migration
 * number — those are expected to grow over time. It only asserts structural
 * properties: no duplicate numeric prefixes within supabase/migrations/, no
 * 3-digit-prefixed file in supabase/proposed/, the specific file-level facts
 * fixed by these repairs, and that every retired number (029, 037, 038, 040,
 * 041, 043, 044) never reappears in either directory.
 *
 * No SQL executed. No DB touched. No migration applied.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, existsSync, readFileSync } from 'fs';
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

describe('B173-FIX-04 — unnumbered draft files present at their permanent (numberless) names', () => {
  it('draft_contribution_atomic_attribution.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/draft_contribution_atomic_attribution.sql'))).toBe(true);
  });

  it('draft_initiative_adoption_source_model.sql exists in supabase/proposed/', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/draft_initiative_adoption_source_model.sql'))).toBe(true);
  });
});

describe('B173-FIX-01/02/03 — every superseded NUMBERED proposed filename no longer exists', () => {
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

  it('040_contribution_atomic_attribution.sql is absent from supabase/proposed/ (B173-FIX-03)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/040_contribution_atomic_attribution.sql'))).toBe(false);
  });

  it('041_initiative_adoption_source_model.sql is absent from supabase/proposed/ (B173-FIX-03)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/041_initiative_adoption_source_model.sql'))).toBe(false);
  });

  it('043_contribution_atomic_attribution.sql is absent from supabase/proposed/ (B173-FIX-04 — renamed to draft, no number)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/043_contribution_atomic_attribution.sql'))).toBe(false);
  });

  it('044_initiative_adoption_source_model.sql is absent from supabase/proposed/ (B173-FIX-04 — renamed to draft, no number)', () => {
    expect(existsSync(resolve(root, 'supabase/proposed/044_initiative_adoption_source_model.sql'))).toBe(false);
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

describe('B173-FIX-02/03 — canonical migrations 034-036/039/042 untouched by these repairs', () => {
  it('036_kora_link_rpc_functions.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/036_kora_link_rpc_functions.sql'))).toBe(true);
  });

  it('039_kora_link_audit_hardening.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/039_kora_link_audit_hardening.sql'))).toBe(true);
  });

  it('042_kora_link_company_partner_provisioning.sql still exists in supabase/migrations/', () => {
    expect(existsSync(resolve(root, 'supabase/migrations/042_kora_link_company_partner_provisioning.sql'))).toBe(true);
  });
});

// B173-FIX-04 superseded the B173-FIX-02 numeric out-of-order check above: a
// number is no longer assigned to a proposed file until promotion, so there
// is no "proposed number vs. highest canonical number" comparison left to
// make — the class of risk B173-FIX-02 targeted is now structurally
// impossible rather than merely detected after the fact. The checks below
// enforce the replacement convention directly.

describe('B173-FIX-04 — no file in supabase/proposed/ starts with a 3-digit canonical-looking number', () => {
  it('every filename in supabase/proposed/ fails the canonical NNN_ pattern', () => {
    const files = readdirSync(resolve(root, 'supabase/proposed')).filter((f) => f.endsWith('.sql'));
    expect(files.length).toBeGreaterThan(0);
    const numbered = files.filter((f) => /^\d{3}_/.test(f));
    expect(
      numbered,
      `supabase/proposed/ contains file(s) with a canonical-looking 3-digit prefix: ${numbered.join(', ')} — ` +
        `unnumbered proposed files (draft_*.sql) must never be renamed back to a numbered form until the ` +
        `moment of promotion into supabase/migrations/, per B173-FIX-04.`,
    ).toEqual([]);
  });

  it('every filename in supabase/proposed/ uses the draft_ prefix', () => {
    const files = readdirSync(resolve(root, 'supabase/proposed')).filter((f) => f.endsWith('.sql'));
    for (const f of files) {
      expect(f.startsWith('draft_'), `${f} does not start with draft_`).toBe(true);
    }
  });
});

describe('B173-FIX-04 — draft files document the promotion-time numbering rule, not a pre-assigned one', () => {
  it('both draft files declare "migration number not assigned" and describe next-free-number promotion', () => {
    const draft1 = readFileSync(resolve(root, 'supabase/proposed/draft_contribution_atomic_attribution.sql'), 'utf8');
    const draft2 = readFileSync(resolve(root, 'supabase/proposed/draft_initiative_adoption_source_model.sql'), 'utf8');
    for (const draft of [draft1, draft2]) {
      expect(draft).toMatch(/DRAFT \/ PROPOSED — migration number not assigned/);
      expect(draft).toMatch(/next free number after the then-current\s+highest/);
    }
  });
});

describe('B173-FIX-01/02/03/04 — retired numbers never reappear in either directory', () => {
  it('029, 037, 038, 040, 041, 043, 044 are absent from both supabase/migrations/ and supabase/proposed/', () => {
    const RETIRED_NUMBERS = [29, 37, 38, 40, 41, 43, 44];
    const allFiles = [
      ...readdirSync(resolve(root, 'supabase/migrations')).filter((f) => f.endsWith('.sql')),
      ...readdirSync(resolve(root, 'supabase/proposed')).filter((f) => f.endsWith('.sql')),
    ];
    for (const n of RETIRED_NUMBERS) {
      const padded = String(n).padStart(3, '0');
      const collisions = allFiles.filter((f) => f.startsWith(`${padded}_`));
      expect(collisions, `retired number ${padded} reappeared in: ${collisions.join(', ')}`).toEqual([]);
    }
  });
});
