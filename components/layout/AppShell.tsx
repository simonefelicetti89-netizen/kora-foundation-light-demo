'use client';
// AppShell — chrome condiviso per tutte le route autenticate.
// Scopo: fornire sidebar, header, banner ambiente come scheletro globale.
// Le route pubbliche (landing, pilot, demo-guide) non ricevono chrome.

import { usePathname } from 'next/navigation';
import { DemoStateProvider, useEnvironment } from '@/lib/demo-state';
import { SyntheticDataBanner } from '@/components/demo/SyntheticDataBanner';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

// Route che non ricevono il chrome AppShell (sidebar + header + banner).
// /pilot è pubblico come la landing.
const PUBLIC_ROUTE_PREFIXES = ['/', '/demo-guide', '/pilot', '/login', '/admin/login', '/auth/', '/request-access'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((p) =>
    p === '/' ? pathname === '/' : pathname === p || pathname.startsWith(p + '/'),
  );
}

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { activeEnvironment } = useEnvironment();
  const pathname = usePathname();

  if (isPublicRoute(pathname)) {
    return (
      <div className="min-h-screen bg-kora-canvas">
        {children}
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col env-${activeEnvironment}`}>
      {/* Synthetic data / environment banner — non-suppressible */}
      <SyntheticDataBanner />
      {/* Header — environment switcher, persona, scenario, role */}
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — navigazione per ruolo */}
        <Sidebar />
        {/* Main content — padding dal Layer SPACE scale */}
        <main
          id="main-content"
          aria-label="Contenuto principale"
          className="flex-1 overflow-y-auto bg-kora-canvas"
          style={{ padding: '32px 40px' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <DemoStateProvider>
      <AppShellContent>{children}</AppShellContent>
    </DemoStateProvider>
  );
}
