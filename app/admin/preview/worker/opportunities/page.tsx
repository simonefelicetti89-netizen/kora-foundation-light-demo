// app/admin/preview/worker/opportunities/page.tsx
// B117-G: KORA_ADMIN presentation preview of the worker partner catalog.
//
// This page shows what a WORKER sees in /worker/opportunities without requiring
// a real worker session. Accessible only to KORA_ADMIN.
//
// Purpose: allow KORA_ADMIN to present the worker partner experience during demos
//   without logging in as a real worker.
//
// Privacy rules preserved:
//   - Data shown is published partner catalog (aggregate, non-individual)
//   - No individual worker tracking, no booking, no marketplace
//   - Admin cannot take any worker actions (CTA explicitly disabled)
//   - Real worker data is never exposed here

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Worker Opportunities — Admin Preview · KORA',
};

type PartnerItem = {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        string;
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  delivery_mode: string;
};

const PILLAR_COLOR: Record<string, string> = {
  LIFE:       '#2F7D55',
  GROWTH:     '#3B6EBA',
  CONNECTION: '#7C3D8F',
  IMPACT:     '#C07D2A',
  LEGACY:     '#5A4A3F',
};

const DELIVERY_LABEL: Record<string, string> = {
  online:  'Online',
  onsite:  'In presenza',
  hybrid:  'Ibrido',
};

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export default async function AdminPreviewWorkerOpportunitiesPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  const db = getSupabaseServiceClient();

  const { data: rawPartners } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, delivery_mode')
    .eq('status', 'published')
    .order('pillar', { ascending: true });

  const partners: PartnerItem[] = (rawPartners ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    description:   (p.description as string | null) ?? null,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    website_url:   (p.website_url as string | null) ?? null,
    city:          (p.city as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
  }));

  return (
    <div
      data-testid="admin-preview-worker-opportunities"
      style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}
    >
      {/* Admin Preview Banner — non-suppressible */}
      <div
        data-testid="admin-preview-banner"
        style={{
          background:   'rgba(199,111,61,0.10)',
          border:       '1.5px solid rgba(199,111,61,0.40)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 28,
          display:      'flex',
          gap:          12,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>👁</span>
        <div>
          <p style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: '#8B4513', margin: 0, marginBottom: 4 }}>
            KORA Admin Preview — non sei loggato come worker reale
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, color: 'rgba(139,69,19,0.80)', margin: 0, lineHeight: 1.6 }}>
            Stai visualizzando il catalogo partner come lo vede un lavoratore. Le CTA sono disabilitate.
            Nessuna azione worker è attiva in questa modalità.
          </p>
        </div>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <a
          href="/admin"
          style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 12 }}
        >
          ← Admin Dashboard
        </a>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0, marginBottom: 6 }}>
          Opportunità & Partner
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
          Anteprima admin — catalogo partner pubblicati visibile ai lavoratori.
        </p>
      </div>

      {/* Privacy notice — same as worker view */}
      <div
        style={{
          background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.20)',
          borderRadius: 10, padding: '14px 18px', marginBottom: 24,
        }}
      >
        <p style={{ fontSize: 12, color: '#1a4731', margin: 0, lineHeight: 1.6 }}>
          <strong>Privacy (come la vede il lavoratore):</strong>{' '}
          La navigazione tra i partner non viene mostrata al datore di lavoro.
          L&apos;azienda vede solo dati aggregati anonimi, non le scelte individuali.
          Questa sezione è informativa — nessuna prenotazione, nessun tracciamento click.
        </p>
      </div>

      {/* Partner catalog — read-only preview */}
      {partners.length === 0 ? (
        <div
          style={{
            textAlign: 'center', padding: '40px 24px',
            border: '1px dashed rgba(6,3,43,0.12)', borderRadius: 12,
          }}
        >
          <p style={{ fontFamily: FONT, fontSize: 14, color: 'rgba(6,3,43,0.45)', margin: 0, marginBottom: 8 }}>
            Nessun partner pubblicato
          </p>
          <p style={{ fontFamily: FONT, fontSize: 12, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
            Pubblica un partner in{' '}
            <a href="/admin/partners" style={{ color: '#C76F3D', textDecoration: 'none' }}>
              Admin → Partner Catalog
            </a>{' '}
            per vederlo qui.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {partners.map(p => (
            <div
              key={p.id}
              style={{
                border: '1px solid rgba(6,3,43,0.10)',
                borderRadius: 12,
                padding: '16px 18px',
                background: '#FAFAFA',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <span style={{
                    display: 'inline-block',
                    fontFamily: FONT, fontWeight: 700, fontSize: 9,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: PILLAR_COLOR[p.pillar] ?? '#06032B',
                    marginBottom: 4,
                  }}>
                    {p.pillar}
                  </span>
                  <h3 style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: '#06032B', margin: 0 }}>
                    {p.name}
                  </h3>
                </div>
                <span style={{
                  fontFamily: FONT, fontSize: 9, fontWeight: 600,
                  color: 'rgba(6,3,43,0.45)', background: 'rgba(6,3,43,0.05)',
                  borderRadius: 4, padding: '2px 6px', flexShrink: 0, marginLeft: 8,
                }}>
                  {DELIVERY_LABEL[p.delivery_mode] ?? p.delivery_mode}
                </span>
              </div>

              {p.description && (
                <p style={{ fontFamily: FONT, fontSize: 12.5, color: 'rgba(6,3,43,0.60)', margin: 0, marginBottom: 10, lineHeight: 1.55 }}>
                  {p.description}
                </p>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(6,3,43,0.35)' }}>
                  {p.city ?? ''}
                  {p.category ? ` · ${p.category}` : ''}
                </span>
                {/* CTA disabled in admin preview — not a worker action */}
                <button
                  disabled
                  data-testid="admin-preview-cta-disabled"
                  title="Disponibile solo in accesso lavoratore"
                  style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    padding: '5px 12px', borderRadius: 8,
                    background: 'rgba(6,3,43,0.05)',
                    color: 'rgba(6,3,43,0.30)',
                    border: '1px solid rgba(6,3,43,0.08)',
                    cursor: 'not-allowed',
                  }}
                >
                  Disponibile solo in accesso lavoratore
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 10, color: 'rgba(6,3,43,0.30)', lineHeight: 1.5 }}>
        KORA Admin Preview · Opportunità & Partner · Nessuna azione worker attiva in questa modalità.
      </div>
    </div>
  );
}
