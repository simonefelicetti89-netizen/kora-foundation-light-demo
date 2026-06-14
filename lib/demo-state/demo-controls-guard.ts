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
  if (shouldShowDemoControls(realRole)) return activeEnvironment;
  return 'live';
}
