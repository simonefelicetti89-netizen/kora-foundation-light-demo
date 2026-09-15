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

  // KORA-WP-004: new Company Membership service — server-only by design
  // (see the module's own header comment), not wired into any client route
  // or authentication path; the only writer of analytics.company_memberships.
  { path: 'lib/company-membership/membership-service.ts', reason: 'documented server-only service — Company Membership creation/termination, KORA-WP-004' },

  // KORA-WP-041: Worker Offboarding playbook's own narrow gap-closing
  // service — server-only, mirrors membership-service.ts's own pattern.
  { path: 'lib/worker-identity/worker-identity-service.ts', reason: 'documented server-only service — Worker identity Company-access shutdown (offboarding), KORA-WP-041' },

  // KORA-WP-005: shared governance event/provenance substrate — server-only,
  // insertion-only, no client route or authentication path ever calls it.
  { path: 'lib/audit/governance-event.ts', reason: 'documented server-only service — append-only governance event recording, KORA-WP-005' },

  // KORA-WP-014: Investment Map Core (Observed Investment Fact) — server-only
  // service, matches the Pattern-A convention (Company sessions read via RLS
  // policy only; writes happen exclusively through this service).
  { path: 'lib/investment-map/observed-investment-fact-service.ts', reason: 'documented server-only service — Observed Investment Fact creation/query, KORA-WP-014' },

  // KORA-WP-009: internal admin operator identity + capability/RBAC grants —
  // server-only, not Company-scoped, no client route or authentication path
  // calls it (foundation-only, no route enforcement integration this WP).
  { path: 'lib/admin-capability/capability-service.ts', reason: 'documented server-only service — internal operator/capability grant management + hasAdminCapability() check, KORA-WP-009' },

  // KORA-WP-017: Need Hypothesis creation/query — server-only, matches the
  // Pattern-A convention (Company sessions read via RLS policy only; writes
  // happen exclusively through this service, same as KORA-WP-014).
  { path: 'lib/needs-map/need-hypothesis-service.ts', reason: 'documented server-only service — Need Hypothesis creation/query, KORA-WP-017' },

  // KORA-WP-030: Advisor Identity/Role Qualification — server-only by design.
  // Unlike Company-scoped tables, no self-service write grant exists at all
  // (migration 056: authenticated gets SELECT only) — a qualification is a
  // governed capability (doc 76 §4), never self-declared, so every write
  // (identity/qualification creation, status transitions) goes exclusively
  // through this service.
  { path: 'lib/advisor-identity/advisor-identity-service.ts', reason: 'documented server-only service — Advisor Identity/Role Qualification creation/query, KORA-WP-030' },

  // KORA-WP-031: Advisor Assignment + Validity Rule + Minimum
  // Prerequisite-Eligibility Data — server-only by design, same rationale as
  // WP-030 immediately above. No route/UI exists over this WP (registry:
  // "UI: N/A at this WP") — this service is itself the authorization
  // boundary (every mutating function checks actorRole === 'KORA_ADMIN').
  { path: 'lib/advisor-assignment/advisor-assignment-service.ts', reason: 'documented server-only service — Advisor Assignment creation/validity/prerequisite-eligibility, KORA-WP-031' },

  // KORA-WP-033: Company Advisor Action-Matrix Surface + Portal Pilot Slice —
  // server-only, same rationale as WP-030/031 immediately above. No route
  // bypasses requireCompanyUser()/requireAdvisorUser() to reach this file.
  { path: 'lib/advisor-portal/advisor-portal-service.ts', reason: 'documented server-only service — Company/Advisor assigned-relationship read + contact-message send, KORA-WP-033' },

  // KORA-WP-035: Advisor Calendar & Call/Appointment Lineage — server-only,
  // same rationale as WP-033 immediately above. Every mutating function
  // re-verifies the caller is a genuine party to the Assignment itself.
  { path: 'lib/advisor-portal/advisor-appointment-service.ts', reason: 'documented server-only service — Advisor appointment create/confirm/reschedule/cancel with lineage, KORA-WP-035' },

  // KORA-WP-036: Advisor Document/Note Five-Class Taxonomy — server-only,
  // same rationale as WP-033/035 immediately above. Class-aware read
  // filtering is defense-in-depth on top of RLS, never the sole boundary.
  { path: 'lib/advisor-portal/advisor-content-service.ts', reason: 'documented server-only service — Advisor five-class content create/list, KORA-WP-036' },

  // KORA-WP-034: Advisor Tasks & Cases — server-only, same rationale as
  // every other Advisor-domain service. Thin Assignment-scoping layer over
  // WP-007's own operational-case-service.ts, never a second Case truth.
  { path: 'lib/advisor-portal/advisor-case-service.ts', reason: 'documented server-only service — Advisor-facing Assignment-scoped Case list/create/transition over KORA-WP-007, KORA-WP-034' },

  // KORA-WP-007: Operational Case Primitive — server-only, same rationale
  // as every other domain service. Every mutating function re-verifies
  // the caller's role and (for Advisor) ownership before any write.
  { path: 'lib/operations/operational-case-service.ts', reason: 'documented server-only service — Operational Case create/list/status-transition, KORA-WP-007' },

  // KORA-WP-008: ADMIN-020 Effort-Capture — server-only, zero RLS read
  // policy at all (migration 063) — this module's own aggregate function
  // is the sole read path over gov.workload_event, by design.
  { path: 'lib/operations/effort-capture-service.ts', reason: 'documented server-only service — ADMIN-020 effort capture + aggregate-only read, KORA-WP-008' },

  // KORA-WP-015: Resource Allocation Ledger — server-only, matches the
  // Pattern-A convention (Company sessions read via RLS policy only; every
  // transition — declare/allocate/commit/spend/release/reallocate/refund —
  // happens exclusively through this service, same as WP-014/WP-017).
  { path: 'lib/resource-allocation/resource-allocation-service.ts', reason: 'documented server-only service — Resource Allocation Ledger transitions + balance read, KORA-WP-015' },

  // KORA-WP-020: Commitment Draft / Governance Substrate (Layer A) —
  // server-only, matches the Pattern-A convention (Company sessions read via
  // RLS policy only; every mutating function additionally requires
  // actorRole === 'COMPANY_ADMIN', doc 73 §6's Decision-Owner-authoring rule).
  { path: 'lib/commitment/commitment-service.ts', reason: 'documented server-only service — Commitment draft create/edit/ready-flag/Resource-Allocation-reference, KORA-WP-020' },

  // KORA-WP-021: Evidence Plan Lineage (Layer B) — server-only, matches the
  // Pattern-A convention (Company sessions read via RLS policy only; every
  // mutating function requires actorRole === 'COMPANY_ADMIN', same
  // discipline as KORA-WP-020's own commitment-service.ts).
  { path: 'lib/evidence-plan/evidence-plan-service.ts', reason: 'documented server-only service — Evidence Plan primary/addendum lineage create/edit/reconstruct, KORA-WP-021' },

  // KORA-WP-022: Commit Activation Transaction + MVB Manifest (Layer C) —
  // server-only, delegates the atomic transaction to a single Postgres RPC
  // (analytics.commit_commitment()); actorRole==='COMPANY_ADMIN' enforced
  // before the RPC is ever called, same discipline as KORA-WP-020/021.
  { path: 'lib/commitment/commit-activation-service.ts', reason: 'documented server-only service — Commit Activation Transaction (RPC) + MVB manifest read, KORA-WP-022' },

  // KORA-WP-023: Core Decision Linkage — server-only, read-only query
  // surface over a security-invoker view (migration 069) that projects
  // already-existing KORA-WP-015/020/021/022 relationships; creates no new
  // domain truth (doc 68 §8 — DECISION-008 IS the reference architecture
  // itself, not a separate object).
  { path: 'lib/decision-linkage/decision-linkage-service.ts', reason: 'documented server-only service — read-only Core Decision Linkage traceability query, KORA-WP-023' },

  // KORA-WP-024: Review — Thin State + Event — server-only, matches the
  // Pattern-A convention (Company sessions read via RLS policy only; every
  // mutating function requires actorRole === 'COMPANY_ADMIN', same
  // discipline as every other Lane-B primitive in this schema). Conclusion
  // delegates to a single atomic Postgres RPC (analytics.conclude_review()).
  { path: 'lib/review/review-service.ts', reason: 'documented server-only service — Review open/in-progress/conclude (RPC) + read paths, KORA-WP-024' },

  // KORA-WP-003: consolidated onto getSupabaseServiceClient() — previously
  // called @supabase/supabase-js's createClient() directly, invisible to this
  // guard. Pre-existing status, not newly introduced by KORA-WP-003: called
  // from app/api/admin/decision-pack/** (already-allowlisted app/api/admin/
  // prefix, KORA_ADMIN-only) AND from app/api/company/decision-pack/** — a
  // Company reading its OWN Decision Pack. The latter is the same class of
  // documented pre-existing self-service exception as app/partner/workspace/
  // page.tsx below (not fixed here, not endorsed as ideal — RLS-based access
  // for a company's own decision-pack read is a separate, out-of-scope
  // architectural question from "consolidate the duplicated factory").
  { path: 'lib/decision-pack/pdf-data.ts', reason: 'consolidated in KORA-WP-003 (previously an inline createClient() call); reads a tenant\'s persisted Decision Pack data for both admin and company-self routes — see comment for the company-self caveat, a pre-existing status this WP made visible, not newly created' },

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
