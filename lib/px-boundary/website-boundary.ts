// lib/px-boundary/website-boundary.ts
// Product Experience ↔ website ownership boundary — fail-closed.
//
// WHY THIS EXISTS. The public/commercial website is a separate workstream
// (Founder ruling 2026-09-27, report `275`). `/pilot` in particular is
// FOUNDER-DEFERRED, is explicitly NOT Founder-accepted visual quality, and is
// NOT a KORA Product visual benchmark. The PX-C migration (`KORA-WP-127`,
// `128`, `129`) must therefore never reach a website surface by accident —
// through a shared component, a navigation edit, or a "while here" cleanup.
//
// AUTHORITATIVE SOURCE, REUSED NOT DUPLICATED. `lib/architecture/registry.ts`
// is KORA's machine-validated architecture registry and already classifies
// surfaces by `domain`. This module DERIVES the protected set from it —
// `domain: 'Marketing'` and `domain: 'Demo'` — rather than restating it. A
// second ownership registry is exactly the duplicated-current-truth defect
// report `257` catalogued.
//
// THE REGISTRY IS INCOMPLETE, AND THAT GAP IS DECLARED, NOT HIDDEN. It carries
// only six `app/` entries and has no entry at all for `app/pilot`,
// `components/landing`, `app/cv`, `app/request-access`, `app/login`,
// `app/privacy` or `app/legal` — nor any `app-surface.company`. Where it is
// silent this module declares the path explicitly and cites report `275`. It
// never contradicts the registry: the cross-check in this module's own test
// fails if the registry later classifies a declared path into a Product domain.

import { ARCHITECTURE_REGISTRY } from '@/lib/architecture/registry';

/** Domains the architecture registry uses for non-Product, website-owned surfaces. */
export const WEBSITE_DOMAINS = ['Marketing', 'Demo'] as const;

/**
 * Protected paths the architecture registry already owns.
 *
 * NARROWED TO `app-surface.*` DELIBERATELY. Domain alone is NOT sufficient:
 * the registry also labels Product SERVICES with `domain: 'Demo'` —
 * `services/scenario/ScenarioService.ts` and
 * `services/submission-feedback/SubmissionFeedbackService.ts` — which are
 * Product code, not website surfaces. Deriving on domain alone would protect
 * them and make this boundary over-broad, barring legitimate Product work.
 * Only a registered app SURFACE in a website domain is website territory.
 */
export function registryDerivedWebsitePaths(): string[] {
  return ARCHITECTURE_REGISTRY
    .filter((c) => c.id.startsWith('app-surface.') && (WEBSITE_DOMAINS as readonly string[]).includes(c.domain))
    .map((c) => c.primaryPath)
    .sort();
}

/**
 * Paths the architecture registry does not yet classify, declared here on the
 * authority of report `275` §5. Each is a public/unauthenticated surface owned
 * by the website workstream. Kept separate from the derived set so the gap
 * stays visible rather than silently absorbed.
 */
export const DECLARED_WEBSITE_PATHS = [
  'app/pilot/',
  'app/cv/',
  'app/request-access/',
  'app/login/',
  'app/privacy/',
  'components/landing/',
] as const;

/**
 * CORRECTION TO REPORT `275` §5, found by this guard's own existence check.
 * That report listed `app/legal/**` among the protected website paths. **It
 * does not exist.** The public privacy surface is `app/privacy/`.
 *
 * `KORA-WP-141`'s `ROUTE_ARCHETYPE` separately declares `'/legal/privacy'`
 * with a `DISCLOSURE_STATIC` archetype, and no `app/legal/` route file or
 * rewrite backs it — an orphaned declaration. `KORA-WP-141` is COMPLETE and is
 * NOT reopened here; this is recorded, not fixed, and the boundary protects
 * only paths that exist.
 */
export const REPORT_275_CORRECTION = 'app/legal/ does not exist; the public privacy surface is app/privacy/' as const;

export function protectedWebsitePaths(): string[] {
  return [...new Set([...registryDerivedWebsitePaths(), ...DECLARED_WEBSITE_PATHS])].sort();
}

/**
 * PX-C migration ownership, from each package's own `Existing Paths` field in
 * Registry 219. Registry 219 lives in `.kora-audit/` on the governance line and
 * is not readable from the Product tree, so it is transcribed here with its
 * source named — and the test asserts this set never intersects the protected
 * set, which is the property that actually matters.
 */
export const PX_MIGRATION_OWNERSHIP: Record<string, readonly string[]> = {
  'KORA-WP-127': ['app/admin/', 'lib/navigation/admin-nav-groups.ts'],
  'KORA-WP-128': ['app/company/'],
  'KORA-WP-129': ['app/worker/', 'app/my-kora/'],
};

export type PathOwnership = 'px-migration' | 'website' | 'unclassified';

function under(path: string, prefix: string): boolean {
  return prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix;
}

export function classifyPath(path: string): PathOwnership {
  const p = path.replace(/^\.\//, '');
  if (protectedWebsitePaths().some((w) => under(p, w))) return 'website';
  for (const paths of Object.values(PX_MIGRATION_OWNERSHIP)) {
    if (paths.some((o) => under(p, o))) return 'px-migration';
  }
  return 'unclassified';
}

export interface BoundaryViolation {
  readonly wp: string;
  readonly path: string;
  readonly reason: string;
}

/**
 * THE GUARD. Fail-closed: a migration target that resolves into a website path
 * is a violation, whichever package proposed it.
 *
 * `migrationTargets` means files this package intends to MODIFY as migration
 * work. It is deliberately NOT "files this package mentions": a test that READS
 * `app/pilot/page.tsx` to assert a dead `/demo/guide` href has not returned is
 * a read-only reference, constrains nothing about `/pilot`'s design, and is not
 * passed here. Conflating the two would either bar legitimate enforcement or
 * license real redesign — see `isReadOnlyReference`.
 */
export function checkMigrationTargets(wp: string, migrationTargets: readonly string[]): BoundaryViolation[] {
  const out: BoundaryViolation[] = [];
  for (const t of migrationTargets) {
    if (classifyPath(t) === 'website') {
      out.push({
        wp, path: t,
        reason: `"${t}" is a website/public surface owned by the separate website workstream (report 275). ` +
                `${wp} may not migrate, restyle or redesign it. /pilot in particular is Founder-deferred and is not a Product visual benchmark.`,
      });
    }
  }
  return out;
}

export function assertNoWebsiteMigration(wp: string, migrationTargets: readonly string[]): void {
  const v = checkMigrationTargets(wp, migrationTargets);
  if (v.length) {
    throw new Error(`[PX-BOUNDARY] ${v.length} website surface(s) claimed as migration targets:\n  - ${v.map((x) => x.reason).join('\n  - ')}`);
  }
}

/**
 * A read-only reference is permitted into a website path. It asserts something
 * about that file without owning its presentation — the dead-target guard being
 * the live example. The distinction is the caller's declaration, because no
 * static rule can infer intent; this function exists so the declaration is
 * explicit at the call site rather than implied by omission.
 */
export function isReadOnlyReference(path: string, intent: 'assert-only' | 'migrate'): boolean {
  return classifyPath(path) === 'website' && intent === 'assert-only';
}
