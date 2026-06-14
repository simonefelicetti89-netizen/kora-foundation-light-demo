// Pure logic for determining whether demo controls should appear in the Header.
// Extracted so the rule can be unit-tested without React or Supabase.

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
