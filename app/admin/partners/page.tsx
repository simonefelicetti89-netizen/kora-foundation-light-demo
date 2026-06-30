// app/admin/partners/page.tsx
// B116: Partner Map Foundation — KORA_ADMIN partner catalog management.
// KORA_ADMIN creates and publishes partners visible to all workers.
// No marketplace, no booking, no pricing, no partner ranking.
//
// B117 DIAGNOSTIC NOTE — If this page shows 0 partners despite having DB data:
// The Supabase JS client uses PostgREST even with the service role key.
// PostgREST only exposes schemas listed in "Extra Search Path" (Project Settings → API).
// FIX: Supabase Dashboard → Project Settings → API → Extra Search Path → add "network"
// Then re-run: NOTIFY pgrst, 'reload schema'; in the SQL editor.

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PartnersAdminClient } from './_components/PartnersAdminClient';

export const metadata = {
  title: 'Partner Catalog — KORA Admin',
};

export default async function AdminPartnersPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/admin/login');

  const db = getSupabaseServiceClient();

  const { data: partners, error: partnersError } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, delivery_mode, status, created_at')
    .order('created_at', { ascending: false });

  // Log the error so it's visible in server logs — silent failure was masking the schema bug
  if (partnersError) {
    console.error('[AdminPartnersPage] network.partner_profile query failed:', partnersError.message, partnersError.code);
  }

  const schemaNotExposed = partnersError?.code === 'PGRST106' || partnersError?.message?.includes('schema');
  const hasError = !!partnersError;

  const partnerList = (partners ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    description:   (p.description as string | null) ?? null,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    website_url:   (p.website_url as string | null) ?? null,
    city:          (p.city as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
    status:        p.status as string,
    created_at:    p.created_at as string,
  }));

  return (
    <div style={{
      maxWidth: 960, margin: '0 auto', padding: '40px 24px',
      fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0 }}>
            Partner Catalog
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: 'rgba(6,3,43,0.07)', color: 'rgba(6,3,43,0.45)',
            borderRadius: 4, padding: '2px 7px',
          }}>
            KORA ADMIN
          </span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
          Gestisci i partner della rete KORA. I partner published sono visibili ai worker
          nella sezione &ldquo;Opportunità&rdquo;. Nessun marketplace, nessuna prenotazione, nessun ranking.
        </p>
      </div>

      {/* Diagnostic banner — shown only when the network schema query fails */}
      {hasError && (
        <div
          data-testid="partner-schema-error-banner"
          style={{
            marginBottom: 24,
            borderRadius: 10,
            border: '1px solid rgba(199,111,61,0.35)',
            background: 'rgba(199,111,61,0.08)',
            padding: '14px 18px',
            fontSize: 13,
          }}
        >
          <p style={{ fontWeight: 700, color: '#C76F3D', marginBottom: 6 }}>
            ⚠ Schema &quot;network&quot; non raggiungibile via PostgREST
          </p>
          <p style={{ color: 'rgba(6,3,43,0.65)', margin: 0, lineHeight: 1.6 }}>
            {schemaNotExposed
              ? 'Lo schema "network" non è in "Extra Search Path" del progetto Supabase.'
              : `Errore query: ${partnersError?.message}`}
            {' '}Per risolvere: <strong>{'Supabase Dashboard → Project Settings → API → Extra Search Path → aggiungi "network"'}</strong>.
            Poi eseguire: <code style={{ background: 'rgba(6,3,43,0.08)', padding: '1px 5px', borderRadius: 4 }}>NOTIFY pgrst, &apos;reload schema&apos;;</code>
          </p>
        </div>
      )}

      <PartnersAdminClient initialPartners={partnerList} />
    </div>
  );
}
