// app/demo/portfolio/layout.tsx — B168.5-P3: gate Company Portfolio.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function PortfolioLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
