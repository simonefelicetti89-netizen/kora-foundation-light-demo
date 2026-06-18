// app/admin/platform/diagnostics/layout.tsx — B169 FASE 5
// Primary auth check + tab nav for consolidated diagnostics workspace.
// Individual sub-pages retain auth checks as defense-in-depth.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { redirect } from 'next/navigation';
import { DiagnosticsTabNav } from './_components/DiagnosticsTabNav';

export default async function DiagnosticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  return (
    <div className="flex flex-col min-h-full">
      <DiagnosticsTabNav />
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
