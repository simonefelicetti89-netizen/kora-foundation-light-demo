// app/admin/commons/page.tsx
// B128: KORA Commons — Admin Moderation Console.
//
// Access: KORA_ADMIN only.
// Purpose: review pending posts, publish/reject/archive, create posts for tenants.
// Privacy contract:
//   - admin vede tutti i post di tutti i tenant (aggregazione moderation-first)
//   - nessun dato individuale worker esposto (no PIB, no worker_id, no Dynamic CV)
//   - nessun analytics di lettura individuale
//   - admin non ha accesso a My KORA dei worker tramite questa console
//   - avviso privacy non sopprimibile

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { AdminCommonsModerationPanel } from '@/components/commons/AdminCommonsModerationPanel';
import { AdminBookingModerationSection } from '@/components/commons/AdminBookingModerationSection';

export const metadata = { title: 'KORA Space — Moderazione · Admin' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

export default async function AdminCommonsPage() {
  const auth = await requireKoraAdmin();
  if (isKoraAuthError(auth)) redirect('/login?role_hint=admin');

  const db = getSupabaseServiceClient();

  // Fetch all posts from all tenants (sorted: pending_review first, then by date)
  // B165: include nuovi campi iniziativa nella selezione per la moderazione
  const { data: posts } = await db
    .schema('commons')
    .from('post')
    .select('id, tenant_id, author_role, title, body, category, status, pillar, published_at, reviewed_at, created_at, updated_at, opening_grade, location_address, location_lat, location_lng, event_start_at, event_end_at, capacity_internal, capacity_cross, external_participants_count, external_participants_evidence, value_chain_supplier_count')
    .order('created_at', { ascending: false })
    .limit(500);

  // Fetch tenants for display labels
  const { data: tenants } = await db
    .schema('analytics')
    .from('tenant')
    .select('id, company_name, tenant_code')
    .limit(200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPosts  = (posts   ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantMap = ((tenants ?? []) as any[]).reduce((acc: Record<string, string>, t: any) => {
    acc[t.id] = t.company_name ?? t.tenant_code;
    return acc;
  }, {} as Record<string, string>);

  // postsMap: id → { id, title, pillar, event_start_at, opening_grade }
  // Passed to AdminBookingModerationSection for safe initiative enrichment.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const postsMap = allPosts.reduce((acc: Record<string, any>, p: any) => {
    acc[p.id] = { id: p.id, title: p.title, pillar: p.pillar ?? null, event_start_at: p.event_start_at ?? null, opening_grade: p.opening_grade ?? null };
    return acc;
  }, {} as Record<string, any>);

  const pending   = allPosts.filter((p) => p.status === 'pending_review');
  const published = allPosts.filter((p) => p.status === 'published');
  const drafts    = allPosts.filter((p) => p.status === 'draft');
  const rejected  = allPosts.filter((p) => p.status === 'rejected');
  const archived  = allPosts.filter((p) => p.status === 'archived');

  return (
    <div
      data-testid="admin-commons"
      style={{ maxWidth: 1060, margin: '0 auto', padding: '36px 24px 80px', fontFamily: FONT }}
    >
      {/* Back nav */}
      <Link href="/admin/trial-control-center" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
        ← Trial Control Center
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          KORA Space — Moderazione
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
          Revisiona, pubblica, rifiuta o archivia i contenuti inviati dalle aziende.
        </p>
      </div>

      {/* Admin privacy notice — non-suppressible */}
      <div
        data-testid="admin-commons-privacy-notice"
        style={{
          background:   'rgba(199,111,61,0.07)',
          border:       '1.5px solid rgba(199,111,61,0.28)',
          borderRadius: 12,
          padding:      '12px 16px',
          marginBottom: 24,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>&#9888;&#65039;</span>
        <p style={{ fontSize: 12, color: '#C76F3D', margin: 0, lineHeight: 1.6 }}>
          <strong>KORA Space è moderation-first.</strong>{' '}
          Non pubblicare dati personali, sanitari o valutazioni individuali.
          Questa console non espone dati individuali worker (no PIB, no Dynamic CV, no analytics di lettura).
        </p>
      </div>

      {/* Stats row */}
      <div
        data-testid="admin-commons-pending-queue"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 32 }}
      >
        {[
          { label: 'In revisione', value: pending.length,   color: '#8A5A00', bg: 'rgba(192,125,42,0.10)', urgent: pending.length > 0 },
          { label: 'Pubblicati',   value: published.length, color: '#2F7D55', bg: 'rgba(47,125,85,0.08)'  },
          { label: 'Bozze',        value: drafts.length,    color: 'rgba(6,3,43,0.50)', bg: 'rgba(6,3,43,0.04)' },
          { label: 'Rifiutati',    value: rejected.length,  color: '#9E3B2F', bg: 'rgba(158,59,47,0.08)'  },
          { label: 'Archiviati',   value: archived.length,  color: 'rgba(6,3,43,0.40)', bg: 'rgba(6,3,43,0.04)' },
        ].map(({ label, value, color, bg, urgent }) => (
          <div key={label} style={{ background: bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center', border: urgent ? '1.5px solid rgba(192,125,42,0.35)' : 'none' }}>
            <p style={{ fontSize: 26, fontWeight: 800, color, margin: '0 0 3px', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Moderation panel — client component for actions */}
      <AdminCommonsModerationPanel
        posts={allPosts}
        tenantMap={tenantMap}
      />

      {/* B166 — Booking lifecycle control */}
      <AdminBookingModerationSection tenantMap={tenantMap} postsMap={postsMap} />

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 14, marginTop: 40 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Space Moderation Console · B128 · {allPosts.length} post totali ·
          Nessun dato individuale worker · Nessun analytics di lettura individuale ·
          Moderation-first: ogni post richiede approvazione prima della pubblicazione.
        </p>
      </div>
    </div>
  );
}
