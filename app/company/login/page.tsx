// app/company/login/page.tsx
// B117: Company login is now unified at /login — this page redirects there.
// Existing bookmarks and email links to /company/login continue to work.
// The /login page auto-routes to /company/workspace on successful COMPANY_ADMIN/VIEWER auth.

import { redirect } from 'next/navigation';

export default function CompanyLoginRedirect() {
  redirect('/login');
}
