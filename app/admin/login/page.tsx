// app/admin/login/page.tsx
// B117-B: /admin/login is a redirect wrapper.
//
// Two cases:
//   - Unauthenticated user → admin layout (requireKoraAdmin) intercepts FIRST
//     and redirects to /login?role_hint=admin. This page never renders.
//   - Authenticated KORA_ADMIN visiting /admin/login directly → layout passes,
//     page renders and redirects to /admin (their home).
//
// This preserves the /admin/login URL as a valid bookmark while routing correctly.

import { redirect } from 'next/navigation';

export default function AdminLoginRedirect() {
  // If this renders, the admin layout has already validated the session.
  // Send authenticated KORA_ADMIN to their workspace.
  redirect('/admin');
}
