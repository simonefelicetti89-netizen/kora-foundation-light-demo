// KORA-WP-129 Wave 4b (W3A remediation) — the first-access route set.
//
// WHY THIS IS A MODULE AND NOT AN INLINE LITERAL: AppShell decides chrome from
// it, and a test asserts both halves of the decision — that these two routes
// get the focused entry shell, and that every other Worker route keeps the full
// workspace navigation. A predicate both can import is the only way those two
// assertions can be about the same rule.
//
// This is a PRESENTATION rule. It changes no route, no redirect, no session, no
// role and no access-control policy: /worker/onboarding and /worker/setup-password
// remain inside app/worker/layout.tsx's WORKER gate exactly as before, and remain
// absent from AppShell's PUBLIC_ROUTE_PREFIXES — they are authenticated surfaces
// that render a quieter shell, never public ones.

/** The surfaces a worker meets before they have an account they can use. */
export const FIRST_ACCESS_ROUTES = [
  '/worker/onboarding',
  '/worker/setup-password',
] as const;

export function isFirstAccessRoute(pathname: string): boolean {
  return FIRST_ACCESS_ROUTES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
