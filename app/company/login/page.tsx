// app/company/login/page.tsx
// B117-B: /company/login is a redirect wrapper to the unified /login page.
// role_hint=company allows /login to show contextual copy ("Accesso aziendale").
// Company layout is client-side — this server redirect fires before it runs.

import { redirect } from 'next/navigation';

export default function CompanyLoginRedirect() {
  redirect('/login?role_hint=company');
}
