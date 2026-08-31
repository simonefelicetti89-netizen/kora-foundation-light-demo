// C-01 (Commons): KORA Commons — layer condiviso di attivazione tra organizzazioni.
// KORA Commons NON è un social network. È uno spazio per opportunità di attivazione umana.
// Ogni iniziativa risponde a: "Quale opportunità di attivazione umana esiste?"
// CC-052 (2026-08-31): retired the synthetic-preview data path. Now a server
// component reading live commons.post (getPublishedInitiativesAdmin), the
// same RLS this app/commons/layout.tsx-guarded route has always required —
// no synthetic fallback, no demo-only rendering path. Nessun IU generato da
// questa pagina.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getPublishedInitiativesAdmin } from '@/services/commons/CommonsService';
import { getAggregateForPromoter } from '@/services/commons/BookingService';
import { buildDiscoveryView } from '@/lib/commons/discovery-view';
import { CommonsDiscoveryBrowser } from '@/components/commons/CommonsDiscoveryBrowser';

export default async function CommonsPage() {
  const db = await getSupabaseServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await getPublishedInitiativesAdmin(db as any);

  const tenantIds = [...new Set(rows.map((r) => r.tenant_id))];
  const tenantById = new Map<string, { company_name: string; industry_code: string | null }>();
  if (tenantIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tenants } = await (db as any)
      .schema('analytics')
      .from('tenant')
      .select('id, company_name, industry_code')
      .in('id', tenantIds);
    for (const t of (tenants ?? []) as Array<{ id: string; company_name: string; industry_code: string | null }>) {
      tenantById.set(t.id, { company_name: t.company_name, industry_code: t.industry_code });
    }
  }

  // Real per-status booking counts — commons.booking_aggregate_for_promoter()
  // (mig 025) is a SECURITY DEFINER RPC restricted to KORA_ADMIN or the
  // post's own COMPANY_ADMIN; it self-degrades to zeros on any other caller
  // or error (see services/commons/BookingService.ts), never throws.
  const participantsByPostId = new Map<string, number>();
  await Promise.all(
    rows.map(async (r) => {
      const agg = await getAggregateForPromoter({ db, postId: r.id });
      participantsByPostId.set(r.id, agg.count_approved + agg.count_attended);
    }),
  );

  const initiatives = buildDiscoveryView(rows, tenantById, participantsByPostId);

  return <CommonsDiscoveryBrowser initiatives={initiatives} />;
}
