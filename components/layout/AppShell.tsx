'use client';

import { DemoStateProvider, useEnvironment } from '@/lib/demo-state';
import { SyntheticDataBanner } from '@/components/demo/SyntheticDataBanner';
import { EnvironmentWatermark } from '@/components/demo/EnvironmentWatermark';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

// Inner component so it can read useEnvironment() which requires DemoStateProvider above it.
function AppShellContent({ children }: { children: React.ReactNode }) {
  const { activeEnvironment } = useEnvironment();
  return (
    <div className={`flex min-h-screen flex-col env-${activeEnvironment}`}>
      <EnvironmentWatermark />
      <SyntheticDataBanner />
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-white p-6">
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
