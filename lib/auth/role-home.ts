// lib/auth/role-home.ts
// Canonical role-to-home mapping — single source of truth for post-auth redirects.
// Used by: unified /login page, auth/callback, and any future role-aware redirect.
//
// WORKER lands on /worker/onboarding — the onboarding gate redirects to
// /worker/workspace automatically if onboarding is already completed.
//
// CC-00 DEMO_VIEWER role retirement (2026-09-26): the `role === 'DEMO_VIEWER'
// → '/demo'` branch is removed, not replaced. Any unknown or retired role
// (including a legacy account still carrying app_metadata.kora_role =
// 'DEMO_VIEWER') falls through to '/login' — fails closed, never a
// privileged default.

export function getRoleHome(role: string | undefined): string {
  if (role === 'KORA_ADMIN') return '/admin';
  if (role === 'COMPANY_ADMIN') return '/company/workspace';
  if (role === 'WORKER') return '/worker/onboarding';
  if (role === 'PARTNER') return '/partner/workspace';
  return '/login';
}
