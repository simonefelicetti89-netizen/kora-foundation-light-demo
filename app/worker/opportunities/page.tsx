// app/worker/opportunities/page.tsx
// B116: Worker Partner Map — informational partner catalog for workers.
//
// WORKER only — server component with requireWorkerUser gate.
// Shows published partners filtered by pillar.
// No booking, no marketplace, no ranking, no pricing, no chat.
// No individual click tracking — browsing is private to the worker.
//
// PRIVACY CONTRACT:
//   - workerId and tenantId from session only — never from request params
//   - No click/view tracking stored
//   - Company roles cannot access this page (middleware + layout gate)
//   - Privacy notice is non-suppressible

import { getCurrentWorkerUser, requireKoraAdmin, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PartnerCatalogClient } from './_components/PartnerCatalogClient';
import { PageHead, Workspace, Col, Notice } from '@/components/ui/px';
import { TOKENS, SPACE, typeStyle, TYPE_FAMILY } from '@/lib/design/kora-design-tokens';

export type PartnerItem = {
  id:            string;
  name:          string;
  description:   string | null;
  pillar:        string;
  category:      string | null;
  website_url:   string | null;
  city:          string | null;
  delivery_mode: string;
};

export default async function WorkerOpportunitiesPage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) {
    // B117-G: KORA_ADMIN navigating worker demo → send to admin preview, not login
    const admin = await requireKoraAdmin();
    if (!isKoraAuthError(admin)) redirect('/admin/preview/worker/opportunities');
    redirect('/login');
  }

  const db = await getSupabaseServerClient();

  // Fetch published partners — app layer enforces status = 'published'
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
    <>
      <div
        data-testid="worker-opportunities-page"
        style={{ maxWidth: 1180, margin: '0 auto', padding: `${SPACE.lg}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
      >
        <a
          href="/worker/workspace"
          style={{ ...typeStyle('caption'), color: TOKENS.inkHint, textDecoration: 'none', display: 'inline-block', marginBottom: SPACE.sm }}
        >
          ← Il mio spazio
        </a>

        <PageHead
          eyebrow="My KORA · Opportunità"
          title="Opportunità & Partner"
          lead="Partner della rete KORA organizzati per pillar — informativo, non una prenotazione."
        />

        {/* Privacy notice — non-suppressible. Now the governed system message,
            with role="status"; copy unchanged. */}
        <div data-testid="partner-privacy-notice">
          <Notice tone="ok">
            <strong>Privacy:</strong>{' '}
            La tua navigazione tra i partner non viene mostrata al datore di lavoro.
            L&apos;azienda vede solo dati aggregati anonimi, non le tue scelte individuali.
            Questa sezione è informativa — non genera prenotazioni, non traccia click individuali.
          </Notice>
        </div>

        <Workspace style={{ marginTop: SPACE.lg }}>
          <Col span="full">
            <PartnerCatalogClient partners={partners} />
          </Col>
        </Workspace>

        <p style={{ marginTop: SPACE.lg, ...typeStyle('caption'), color: TOKENS.inkHint }}>
          KORA Foundation Light · Opportunità & Partner · Nessun marketplace, nessuna prenotazione, nessun ranking.
        </p>
      </div>
    </>
  );
}
