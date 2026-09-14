/**
 * Consolidation Audit Wave 2 — Remediation of Item 10b (worker_profile_private
 * service_role GRANT defect). Database-privilege-only — kept as its own
 * commit/test file, separate from Item 9/10a (code/auth-only, no migration).
 *
 * See .kora-audit/output/127_KORA_CONSOLIDATION_AUDIT_IMPLEMENTATION_WAVE_2.md.
 * Real-catalog proof (the actual GRANT after applying migration 062 to
 * clean local Postgres, minimum-privilege confirmed by a denied INSERT
 * attempt, Company/Advisor/Partner isolation reconfirmed by RLS) was
 * performed via a disposable script, deleted after use. This file is the
 * permanent, migration-content-level regression guard.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('AUD-W2-ITEM-10b — worker_profile_private service_role GRANT, minimum privilege', () => {
  const migrationSrc = readFileSync(
    join(process.cwd(), 'supabase/migrations/062_worker_profile_private_service_access.sql'),
    'utf-8',
  );

  it('migration 062 exists and grants exactly SELECT to service_role — no broader privilege', () => {
    expect(migrationSrc).toMatch(/GRANT SELECT ON personal\.worker_profile_private TO service_role;/);
    expect(migrationSrc).not.toMatch(/GRANT (ALL|INSERT|UPDATE|DELETE)\s+ON personal\.worker_profile_private TO service_role/);
  });

  it('does not grant anything to authenticated, anon, or PUBLIC', () => {
    expect(migrationSrc).not.toMatch(/TO authenticated/);
    expect(migrationSrc).not.toMatch(/TO anon/);
    expect(migrationSrc).not.toMatch(/TO PUBLIC/);
  });

  it('is the only 062 migration (no gap, no renumbering, no unrelated bundling) — a later, independent 063 (KORA-WP-008) does not retroactively change this', () => {
    const migrationsDir = join(process.cwd(), 'supabase/migrations');
    const files = readdirSync(migrationsDir);
    expect(files.filter((f) => f.startsWith('062_'))).toHaveLength(1);
  });

  it('does not create or alter any table, column, or RLS policy', () => {
    expect(migrationSrc).not.toMatch(/CREATE TABLE|ALTER TABLE.*ADD COLUMN|CREATE POLICY|DROP POLICY/i);
  });
});
