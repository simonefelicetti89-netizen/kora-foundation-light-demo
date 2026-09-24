// Pure logic for determining whether demo controls / demo banners should appear.
// Single source of truth for "is this a real user or a demo session?"
// Used by Header.tsx and SyntheticDataBanner.tsx — keep in sync.

/**
 * Converts a raw Supabase session into the role sentinel used by the Header guard.
 *
 * Three distinct states:
 *   null          — no session at all  → pure demo mode (unauthenticated visitor)
 *   'KORA_ADMIN'  — admin operator session → demo controls allowed
 *   'COMPANY_ADMIN' | 'WORKER' | 'AUTHENTICATED' | …
 *                 — real authenticated session → demo controls must be hidden
 *
 * The critical invariant: a session that EXISTS but lacks kora_role in app_metadata
 * (provisioning gap, migration lag, etc.) must never fall through to the null path.
 * We return 'AUTHENTICATED' so the guard treats it as a real user.
 */
export function resolveRealRoleFromSession(
  session: { user?: { app_metadata?: Record<string, unknown> } } | null,
): string | null {
  if (!session) return null;
  return (session.user?.app_metadata?.kora_role as string | undefined) ?? 'AUTHENTICATED';
}

/**
 * Returns true only when demo controls (RoleSwitcher, EnvironmentSwitcher, DEMO badge)
 * should be visible.
 *
 * Show demo controls:
 *   realRole === null        — no session → visitor in pure demo mode
 *   realRole === 'KORA_ADMIN' — operator with full demo access
 *
 * Hide demo controls (return false):
 *   realRole === undefined   — session check pending → fail-safe toward live,
 *                              no flash of DEMO banner before we know who the user is
 *   any other string         — real authenticated session (COMPANY_ADMIN, WORKER,
 *                              AUTHENTICATED, …) → demo controls irrelevant and harmful
 */
export function shouldShowDemoControls(realRole: string | null | undefined): boolean {
  return realRole !== undefined && (realRole === null || realRole === 'KORA_ADMIN');
}

/**
 * Resolves which environment label the SyntheticDataBanner should display,
 * given the real session role and the current demo-state activeEnvironment.
 *
 * Returns null when the banner should not render at all (pending state).
 *
 * Rules:
 *   undefined  — session check still pending → null (no banner, fail-safe toward live)
 *   null       — no session → respect activeEnvironment (pure demo visitor)
 *   KORA_ADMIN — operator → respect activeEnvironment (they control the switcher)
 *   any other  — real authenticated user → force 'live' regardless of demo state
 *
 * 'live' is forced (not null) so the real user always sees the LIVE banner —
 * confirming they are in a service-assisted environment, not a demo.
 */
export type BannerEnvironment = 'demo' | 'live' | 'future';

export function resolveBannerEnvironment(
  realRole: string | null | undefined,
  activeEnvironment: BannerEnvironment,
): BannerEnvironment | null {
  if (realRole === undefined) return null;
  return resolveEffectiveEnvironment(realRole, activeEnvironment);
}

/**
 * KORA-WP-138 — THE canonical runtime environment rule.
 *
 * `activeEnvironment` is the OPERATOR'S PREVIEW PREFERENCE. It is not, and has
 * never been, a statement about which runtime a real user is in. This function
 * derives the environment the runtime must actually use, and every
 * environment-sensitive consumer resolves through it — scoring and chrome
 * alike — so the two can no longer disagree.
 *
 * WHY THIS EXISTS (OBS-02): `lib/demo-state` initialises `activeEnvironment` to
 * 'demo', and `shouldShowDemoControls()` grants the switcher only to an
 * unauthenticated visitor or KORA_ADMIN. A real COMPANY_ADMIN therefore had no
 * path to 'live', so `useScoringResult` took the demo branch and returned
 * `insufficient_data` synchronously WITHOUT EVER QUERYING THE DATABASE — while
 * the banner, which already applied this rule, displayed LIVE. Four canonical
 * Company surfaces rendered an empty state irrespective of real data.
 *
 * This mirrors `reconcileActiveRole` (ROLE-SWITCHER-02), which fixed the same
 * class of defect for `activeRole`: a truth that only becomes known after login
 * never reached client state. Role is RECONCILED (mutated, with a manual
 * override). Environment is DERIVED and never mutated, deliberately — mutating
 * it would let reconciliation silently overwrite a KORA_ADMIN's switcher choice
 * and would make hydration order load-bearing.
 *
 * Rules, in the vocabulary `shouldShowDemoControls` already establishes:
 *   undefined  — session still resolving → 'live'. FAIL-SAFE TOWARD LIVE: the
 *                transient window must never yield demo scoring, because the
 *                demo branch resolves SYNCHRONOUSLY and would render an empty
 *                state before the real role arrives. Every Company route is
 *                already server-guarded by requireCompanyUser, so an
 *                unauthenticated visitor never observes this window there.
 *                The banner keeps its own stricter `undefined -> render
 *                nothing` check, applied before it delegates here.
 *   null       — no session → the demo preference is authoritative
 *   KORA_ADMIN — operator → the demo preference is authoritative
 *   any other  — a REAL authenticated user (COMPANY_ADMIN, WORKER, PARTNER,
 *                ADVISOR, AUTHENTICATED) → ALWAYS 'live'
 *
 * This is environment SELECTION, never authorization: it chooses between two
 * already-authorized read paths for a session the server guards have already
 * admitted. It must never become an auth boundary.
 */
export function resolveEffectiveEnvironment(
  realRole: string | null | undefined,
  activeEnvironment: BannerEnvironment,
): BannerEnvironment {
  if (shouldShowDemoControls(realRole)) return activeEnvironment;
  return 'live';
}
