'use client';
// AppShell — chrome condiviso per tutte le route autenticate.
// Scopo: fornire sidebar, header, banner ambiente come scheletro globale.
// Le route pubbliche (landing, pilot, demo-guide) non ricevono chrome.

import { usePathname } from 'next/navigation';
import { DemoStateProvider, useEnvironment } from '@/lib/demo-state';
import { SyntheticDataBanner } from '@/components/demo/SyntheticDataBanner';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarDrawerProvider } from '@/components/layout/SidebarDrawerContext';

// Route che non ricevono il chrome AppShell (sidebar + header + banner).
// /pilot è pubblico come la landing.
// B126: /cv/share/ added — public share view, no AppShell chrome needed.
// KL-10: /link/ added — KORA Link public NFC entry point, no chrome.
const PUBLIC_ROUTE_PREFIXES = ['/', '/demo', '/pilot', '/login', '/admin/login', '/auth/', '/request-access', '/cv/share/', '/link/'];

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
    // WP-088: the drawer provider wraps Header + Sidebar so the mobile
    // toggle (Header) and the drawer itself (Sidebar) share one state.
    <SidebarDrawerProvider>
      <div className={`flex min-h-screen flex-col env-${activeEnvironment}`}>
        {/* Synthetic data / environment banner — non-suppressible */}
        <SyntheticDataBanner />
        {/* Header — environment switcher, persona, scenario, role */}
        <Header />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar — navigazione per ruolo */}
          <Sidebar />
          {/* Main content — padding dal Layer SPACE scale.
              WP-088: padding steps down on narrow viewports so content keeps
              a usable measure at ~375px instead of losing 80px to gutters. */}
          <main
            id="main-content"
            aria-label="Contenuto principale"
            className="flex-1 overflow-y-auto bg-kora-canvas px-4 py-5 sm:px-6 sm:py-6 lg:px-10 lg:py-8"
          >
            {children}
          </main>
        </div>
      </div>
    </SidebarDrawerProvider>
  );
}

export function AppShell({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole?: import('@/lib/types').KoraRole | null;
}) {
  return (
    <DemoStateProvider initialRole={initialRole}>
      <AppShellContent>{children}</AppShellContent>
    </DemoStateProvider>
  );
}
