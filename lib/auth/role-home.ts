// lib/auth/role-home.ts
// Canonical role-to-home mapping — single source of truth for post-auth redirects.
// Used by: unified /login page, auth/callback, and any future role-aware redirect.
//
// WORKER lands on /worker/onboarding — the onboarding gate redirects to
// /worker/workspace automatically if onboarding is already completed.

export function getRoleHome(role: string | undefined): string {
  if (role === 'KORA_ADMIN') return '/admin';
  if (role === 'COMPANY_ADMIN' || role === 'COMPANY_VIEWER') return '/company/workspace';
  if (role === 'WORKER') return '/worker/onboarding';
  if (role === 'PARTNER') return '/partner/workspace';
  if (role === 'DEMO_VIEWER') return '/demo';
  return '/login';
}
