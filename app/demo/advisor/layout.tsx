// app/demo/advisor/layout.tsx — B168.5-P3: gate Advisor Workspace.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function AdvisorLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
