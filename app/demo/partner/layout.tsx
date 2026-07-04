// app/demo/partner/layout.tsx — PARTNER-01: gate for the Partner demo preview.
// Same pattern as app/demo/network/layout.tsx, app/demo/advisor/layout.tsx.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function DemoPartnerLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
