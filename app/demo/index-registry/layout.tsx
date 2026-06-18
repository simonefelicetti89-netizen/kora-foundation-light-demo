// app/demo/index-registry/layout.tsx — B168.5-P3: gate KORA Index Registry.
import { requireDemoGate } from '@/lib/auth/demo-guard';
export default async function IndexRegistryLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
