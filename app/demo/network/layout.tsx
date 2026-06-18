// app/demo/network/layout.tsx — B168.5-P3: gate Rete Advisor & Partner.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
