'use client';
// AppShell — chrome condiviso per tutte le route autenticate.
// Scopo: fornire sidebar, header, banner ambiente come scheletro globale.
// Le route pubbliche (landing, pilot, demo-guide) non ricevono chrome.
//
// KORA-WP-125 — questo è lo shell condiviso del Prodotto autenticato e
// implementa la Product Experience approvata in KORA-WP-124 (Gate I).
// Tre stati di shell, governati dal viewport (Decisione Founder 3):
//   full   > 1200px   sidebar 248px
//   rail   721–1200px rail icone 68px
//   mobile ≤ 720px    drawer off-canvas + toggle nell'header
// Le route pubbliche restano fuori dallo shell autenticato e conservano il
// canvas legacy (Decisione Founder 4): WP-125 non le tocca.

import { usePathname } from 'next/navigation';
import { DemoStateProvider, useEnvironment } from '@/lib/demo-state';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { SidebarDrawerProvider } from '@/components/layout/SidebarDrawerContext';
import { usePxShellState } from '@/components/layout/usePxShellState';

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
  const shellState = usePxShellState();

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
      {/* WP-125: data-px-shell is the single source the CSS shell rules read.
          It comes from the same resolvePxShellState() the tests assert, so the
          stylesheet and the component can never disagree about the state. */}
      <div
        data-px-shell={shellState}
        className={`px-shell flex min-h-screen flex-col env-${activeEnvironment}`}
      >
        {/* ONE PRODUCT / NO DEMO RUNTIME (Governance Patch 03, 2026-08-31):
            the SyntheticDataBanner is removed from the authenticated Product
            shell. It was an automatic, architecture-driven "DEMO · DATI
            SIMULATI" indication, which the ruling forbids — and it already
            resolved to a meaningless "LIVE · SERVICE-ASSISTED" strip for every
            real Company/Worker session. The component is NOT deleted: the
            separately-governed /demo/* showcase island may still use it, and
            B150's guard (a real session must never see 'demo') is preserved by
            its own unchanged tests. */}
        {/* Header — workspace identity, route context, account */}
        <Header />
        {/* No overflow clip here: .px-nav is sticky at md+, so this row has to
            stay a normal (non-scrollport) block or the navigation would never
            pin. min-h-0 keeps the row from inheriting an automatic minimum
            height from its children. The document is the only scroller, which
            is what keeps the nav from setting the page height — see the
            .px-nav sticky rule in globals.css. */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar — navigazione per ruolo */}
          <Sidebar />
          {/* Main content — WP-125 Product canvas. The gutters are owned by
              .px-main so every authenticated route gets the same measure and
              no page has to reproduce it. */}
          <main
            id="main-content"
            aria-label="Contenuto principale"
            className="px-main flex-1 overflow-y-auto"
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
