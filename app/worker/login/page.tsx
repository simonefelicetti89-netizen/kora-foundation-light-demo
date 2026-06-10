// app/worker/login/page.tsx
// B117: Worker login is now unified at /login — this page redirects there.
// Existing bookmarks and email links to /worker/login continue to work.
// The /login page auto-routes to /worker/onboarding on successful WORKER auth.

import { redirect } from 'next/navigation';

export default function WorkerLoginRedirect() {
  redirect('/login');
}
