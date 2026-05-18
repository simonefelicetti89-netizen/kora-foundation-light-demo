'use client';

import { DemoStateProvider } from '@/lib/demo-state';
import { SyntheticDataBanner } from '@/components/demo/SyntheticDataBanner';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <DemoStateProvider>
      <div className="flex min-h-screen flex-col">
        <SyntheticDataBanner />
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-white p-6">
            {children}
          </main>
        </div>
      </div>
    </DemoStateProvider>
  );
}
