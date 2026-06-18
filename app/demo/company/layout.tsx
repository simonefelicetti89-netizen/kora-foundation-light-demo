// app/demo/company/layout.tsx — B168.5-P3: gate per tutte le 6 route /demo/company/*.
// requireDemoGate(): 401 → /request-access?next=<path>, 403 → /.
// KORA_ADMIN e DEMO_VIEWER passano. Ruoli live → bloccati.
// Il rendering client-side (useRole, useScenario, useDemoState) rimane intatto —
// questo è un check server-side aggiuntivo PRIMA del render.

import { requireDemoGate } from '@/lib/auth/demo-guard';

export default async function DemoCompanyLayout({ children }: { children: React.ReactNode }) {
  await requireDemoGate();
  return <>{children}</>;
}
