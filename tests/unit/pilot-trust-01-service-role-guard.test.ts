/**
 * PILOT-TRUST-01 (F-02) — repository-wide anti-service-role guard.
 *
 * getSupabaseServiceClient() bypasses Row Level Security entirely. This test
 * scans every .ts/.tsx file under app/, lib/, services/, and scripts/ for an
 * actual import of it from '@/lib/supabase/server', and fails if that import
 * appears in a file NOT on the explicit ALLOWLIST below.
 *
 * The allowlist is intentionally narrow and per-file/per-directory-prefix —
 * never a broad glob like app/** or lib/**. Every entry below has a one-line
 * reason. Adding a new entry to unblock a failing test IS the correct fix
 * when a genuinely new trusted server-only context needs it — but it must be
 * a real justification (audit write, admin-only provisioning, a documented
 * structural reason RLS cannot apply), never "temporarily disable the
 * check". Two entries below (app/cv/share, app/partner/workspace) are
 * documented pre-existing exceptions/gaps, not endorsements — see their
 * comments.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const SCAN_DIRS = ['app', 'lib', 'services', 'scripts'];
const IMPORT_PATTERN = /import\s*\{[^}]*\bgetSupabaseServiceClient\b[^}]*\}\s*from\s*['"]@\/lib\/supabase\/server['"]/;

// ── Explicit, narrow allowlist — path relative to repo root ────────────────
// prettier-ignore
const ALLOWLIST: ReadonlyArray<{ path: string; reason: string }> = [
  // Definition file — the guard flags USAGE of the import, not its own
  // declaration/export site.
  { path: 'lib/supabase/server.ts', reason: 'defines getSupabaseServiceClient — not a usage site' },

  // Admin workspace — KORA_ADMIN-only surfaces. Provisioning, diagnostics,
  // cross-tenant operational support. Not user-facing in the F-02 sense
  // (worker/company tenant self-service surfaces) — these are internal
  // operator tools gated by requireKoraAdmin()/canAccess() elsewhere.
  { path: 'app/admin/', reason: 'KORA_ADMIN-only admin workspace UI — provisioning/operational, not tenant-facing' },
  { path: 'app/api/admin/', reason: 'KORA_ADMIN-only admin API routes — provisioning/operational, not tenant-facing' },

  // Documented server-only service-key wrapper utilities (lib/supabase/*-service-key.ts).
  { path: 'lib/supabase/auth-admin-update-user.ts', reason: 'Supabase Auth Admin API wrapper — no RLS equivalent exists for auth.users administration' },
  { path: 'lib/supabase/impact-unit-service-key.ts', reason: 'documented server-only service-key wrapper — batch IU computation' },
  { path: 'lib/supabase/storage-service-key.ts', reason: 'documented server-only service-key wrapper — private bucket storage' },
  { path: 'lib/supabase/uef-service-key.ts', reason: 'documented server-only service-key wrapper — UEF batch processing' },
  { path: 'lib/supabase/worker-provisioning-service-key.ts', reason: 'documented server-only service-key wrapper — worker account provisioning' },

  // Internal auth helper — one specific internal check (tenant active-status
  // lookup inside requireCompanyUser()), not a per-page data query.
  { path: 'lib/auth/kora-session.ts', reason: 'internal session-resolution helper — tenant active-status check, not a page-level data query' },

  // Evidence attachment storage — private bucket signed URLs, short expiry,
  // server-only by design (see file header).
  { path: 'lib/data-intake/evidence-attachment-storage.ts', reason: 'private Supabase Storage bucket access — signed URLs, server-only by design' },

  // Scoring pipeline persistence — batch write from the admin scoring route,
  // not a user-facing read.
  { path: 'lib/live/persistence.ts', reason: 'batch write of scoring computation results — admin-triggered pipeline persistence, not a user-facing read' },

  // ── Documented pre-existing exceptions (NOT part of this sprint's 6-page
  // scope) — real, tracked, not silently endorsed ─────────────────────────
  {
    path: 'app/cv/share/[token]/page.tsx',
    reason: 'PUBLIC unauthenticated route (token in URL, no session/JWT role at all) — RLS has no authenticated claim to key off; service-role is the only structurally viable mechanism here, scoped by a hashed share-token lookup',
  },
  {
    path: 'app/partner/workspace/page.tsx',
    reason: 'KNOWN GAP, out of PILOT-TRUST-01 scope (only the 6 named worker/company pages were migrated this sprint) — network.partner_profile has no PARTNER-self SELECT policy yet (only KORA_ADMIN and WORKER-published-only exist); fixing this page requires a new RLS policy, tracked as a follow-up, not fixed here',
  },
];

function isAllowlisted(relPath: string): { allowed: boolean; reason?: string } {
  for (const entry of ALLOWLIST) {
    if (entry.path.endsWith('/')) {
      if (relPath.startsWith(entry.path)) return { allowed: true, reason: entry.reason };
    } else if (relPath === entry.path) {
      return { allowed: true, reason: entry.reason };
    }
  }
  return { allowed: false };
}

function walk(dir: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return; // directory doesn't exist (e.g. no services/ dir) — nothing to scan
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx')) {
      out.push(full);
    }
  }
}

function findAllServiceClientImports(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) walk(join(REPO_ROOT, dir), files);

  const offenders: string[] = [];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    if (IMPORT_PATTERN.test(src)) {
      offenders.push(relative(REPO_ROOT, file));
    }
  }
  return offenders;
}

describe('anti-service-role guard (F-02) — getSupabaseServiceClient only outside an explicit allowlist', () => {
  const allImportSites = findAllServiceClientImports();

  it('finds at least one real import site (sanity check the scanner itself works)', () => {
    expect(allImportSites.length).toBeGreaterThan(0);
  });

  it('every import site is either on the allowlist or fails with the offending file named', () => {
    const violations = allImportSites
      .map((f) => ({ file: f, result: isAllowlisted(f) }))
      .filter((x) => !x.result.allowed);

    if (violations.length > 0) {
      const names = violations.map((v) => v.file).join(', ');
      expect(violations, `getSupabaseServiceClient used outside the allowlist in: ${names}`).toEqual([]);
    }
  });

  it('every allowlist entry actually corresponds to a real, still-existing usage or directory (no stale/unused entries)', () => {
    for (const entry of ALLOWLIST) {
      if (entry.path === 'lib/supabase/server.ts') continue; // the definition file never "imports" its own export
      if (entry.path.endsWith('/')) {
        const matches = allImportSites.some((f) => f.startsWith(entry.path));
        expect(matches, `allowlist prefix "${entry.path}" matches no actual import site — remove the stale entry`).toBe(true);
      } else {
        expect(allImportSites, `allowlist entry "${entry.path}" matches no actual import site — remove the stale entry`).toContain(entry.path);
      }
    }
  });

  it('the 6 PILOT-TRUST-01 pages are NOT on the allowlist and have 0 service-role import (regression guard)', () => {
    const migratedPages = [
      'app/worker/workspace/page.tsx',
      'app/worker/opportunities/page.tsx',
      'app/worker/onboarding/page.tsx',
      'app/worker/dynamic-cv/print/page.tsx',
      'app/company/commons/page.tsx',
      'app/company/layout.tsx',
    ];
    for (const page of migratedPages) {
      expect(isAllowlisted(page).allowed, `${page} should not need an allowlist entry — it was migrated off the service client`).toBe(false);
      expect(allImportSites, `${page} must not import getSupabaseServiceClient (regression)`).not.toContain(page);
    }
  });

  it('rejects an allowlist bypass via inline suppression comments (detection is import-based, not comment-based)', () => {
    // The scanner looks for the actual import statement, not for the
    // presence/absence of an eslint-disable or similar comment — so a
    // comment can never silence a real violation. This test documents that
    // invariant rather than re-deriving it structurally.
    expect(IMPORT_PATTERN.source).not.toMatch(/eslint-disable|allow-service-role/i);
  });
});
