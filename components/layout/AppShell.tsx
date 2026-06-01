'use client';

import { usePathname } from 'next/navigation';
import { DemoStateProvider, useEnvironment } from '@/lib/demo-state';
import { SyntheticDataBanner } from '@/components/demo/SyntheticDataBanner';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

// Routes rendered without AppShell chrome (no sidebar, no header, no banner)
const PUBLIC_ROUTES = ['/', '/demo-guide'];

// Inner component so it can read useEnvironment() which requires DemoStateProvider above it.
function AppShellContent({ children }: { children: React.ReactNode }) {
  const { activeEnvironment } = useEnvironment();
  const pathname = usePathname();

  if (PUBLIC_ROUTES.includes(pathname)) {
    return (
      <div className="min-h-screen bg-kora-canvas">
        {children}
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen flex-col env-${activeEnvironment}`}>
      <SyntheticDataBanner />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-kora-canvas p-6">
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
