// app/admin/impact-units/page.tsx
// Impact Units™ Explorer — KORA_ADMIN only.
// Renders the IU trace layer: per-initiative IU values, factor breakdown, blocked records.
// Never exposes worker identity or individual-level data.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { ImpactUnitsExplorer } from './_components/ImpactUnitsExplorer';

export default async function ImpactUnitsPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 p-8">
        <p className="text-red-400 font-medium">Accesso non autorizzato.</p>
        <a href="/admin/login" className="text-blue-400 underline text-sm">
          Accedi come KORA Admin
        </a>
      </div>
    );
  }

  return <ImpactUnitsExplorer userEmail={auth.email} />;
}
