// lib/auth/demo-guard.tsx — B168.5-P3: shared Server Component guard for gated demo routes.
// Usage: call requireDemoGate() at the top of any demo sub-layout that must be gated.
// Returns null on success (authorized). On 401 → redirects to /request-access?next=<path>.
// On 403 (live role, wrong context) → redirects to /.

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireDemoAccess, isKoraAuthError } from '@/lib/auth/kora-session';

export async function requireDemoGate(): Promise<void> {
  const auth = await requireDemoAccess();
  if (!isKoraAuthError(auth)) return; // authorized — proceed

  const h = await headers();
  const pathname = h.get('x-pathname') ?? '/demo';

  if (auth.status === 401) {
    redirect(`/request-access?next=${encodeURIComponent(pathname)}`);
  }
  // 403: authenticated but wrong role (COMPANY_ADMIN, WORKER, etc.)
  redirect('/');
}
