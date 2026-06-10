// app/worker/login/page.tsx
// B117-B: /worker/login is a redirect wrapper to the unified /login page.
// role_hint=worker allows /login to show contextual copy ("Accesso lavoratore").
//
// Note: this page only renders if WorkerLayout's auth check passes (authenticated WORKER).
// Unauthenticated users: WorkerLayout redirects to /login first — page never renders.
// Authenticated WORKER visiting /worker/login: page redirects to /login?role_hint=worker,
// then /login sees existing session and getRoleHome() routes them to /worker/onboarding.

import { redirect } from 'next/navigation';

export default function WorkerLoginRedirect() {
  redirect('/login?role_hint=worker');
}
