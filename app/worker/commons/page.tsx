// app/worker/commons/page.tsx
// B128: KORA Commons — Worker view. Tenant-scoped, published only, privacy-safe.
// B165: esteso con lista iniziative (gradi di apertura) + mappa Leaflet.
//
// Access: WORKER only (requireWorkerUser enforced).
// Privacy contract:
//   - worker vede post status='published' del proprio tenant (post generici)
//   - worker vede iniziative company_internal/extended solo del proprio tenant
//   - worker vede iniziative cross_company di tutti i tenant (RLS mig 024)
//   - nessun tracking individuale di lettura
//   - nessun dato individuale esposto (no worker_id, no email, no PIB)
//   - la lettura non viene mostrata al datore di lavoro come dato individuale

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import type { CommonsPostWorkerView, InitiativeOpeningGrade } from '@/lib/commons/types';
import { OPENING_GRADE_LABELS, OPENING_GRADE_COLORS } from '@/lib/commons/types';
import { InitiativesMapClient } from '@/components/commons/InitiativesMapClient';
import { WorkerBookingButton } from '@/components/commons/WorkerBookingButton';
import { BoundaryBadge } from '@/components/ui/BoundaryBadge';
import { BADGE_TOKENS, PILLAR_SURFACE, TOKENS, SPACE, typeStyle, TYPE_FAMILY, PX } from '@/lib/design/kora-design-tokens';
import { PageHead, Workspace, Col, Region, Notice, Chip, NoData } from '@/components/ui/px';

export const metadata = { title: 'KORA Space · Worker' };

const CATEGORY_LABELS: Record<string, string> = {
  announcement:      'Annuncio',
  initiative_update: 'Aggiornamento iniziativa',
  opportunity:       'Opportunità',
  event:             'Evento',
  request:           'Richiesta',
  resource:          'Risorsa',
};

const PILLAR_COLORS: Record<string, { text: string; bg: string }> = {
  LIFE:       { text: PILLAR_SURFACE.LIFE.color, bg: PILLAR_SURFACE.LIFE.bg },
  GROWTH:     { text: PILLAR_SURFACE.GROWTH.color, bg: PILLAR_SURFACE.GROWTH.bg },
  CONNECTION: { text: PILLAR_SURFACE.CONNECTION.color, bg: PILLAR_SURFACE.CONNECTION.bg },
  IMPACT:     { text: PILLAR_SURFACE.IMPACT.color, bg: PILLAR_SURFACE.IMPACT.bg },
  LEGACY:     { text: PILLAR_SURFACE.LEGACY.color, bg: PILLAR_SURFACE.LEGACY.bg },
};

const INITIATIVE_SELECT = [
  'id', 'title', 'body', 'category', 'pillar', 'published_at', 'created_at',
  'opening_grade', 'location_address', 'location_lat', 'location_lng',
  'event_start_at', 'event_end_at', 'capacity_internal', 'capacity_cross',
].join(', ');

export default async function WorkerCommonsPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/worker/login?hint=worker');

  const { tenantId } = auth;
  const db = await getSupabaseServerClient();

  // Post generici del proprio tenant (opening_grade IS NULL)
  const { data: genericPosts } = await db
    .schema('commons')
    .from('post')
    .select('id, author_role, title, body, category, pillar, published_at, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .is('opening_grade', null)
    .order('published_at', { ascending: false })
    .limit(100);

  // Iniziative: tutti i tenant per cross_company, solo proprio tenant per company_*
  // La RLS (mig 013 + mig 024) fa il filtro corretto — la query non filtra per tenant.
  const { data: initiativesRaw } = await db
    .schema('commons')
    .from('post')
    .select(INITIATIVE_SELECT)
    .eq('status', 'published')
    .not('opening_grade', 'is', null)
    .order('event_start_at', { ascending: true, nullsFirst: false })
    .limit(200);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPosts       = (genericPosts ?? []) as any[];
  const initiatives    = (initiativesRaw ?? []) as unknown as CommonsPostWorkerView[];
  const hasInitiatives = initiatives.length > 0;

  // B-WORKER-3: pre-fetch the worker's own existing booking status for the
  // cross_company initiatives shown below, so WorkerBookingButton reflects
  // persisted truth on load instead of always starting at 'idle' (the
  // parity gap identified in Slice 2's KORA Space comparison). RLS
  // (commons.booking, mig 025) scopes this to the caller's own rows —
  // no worker_identity_id resolution needed, same trust boundary this page
  // already uses for personal.worker_participation reads.
  const crossCompanyIds = initiatives
    .filter((i) => i.opening_grade === 'cross_company')
    .map((i) => i.id);

  const bookingStatusByPostId: Record<string, string> = {};
  if (crossCompanyIds.length > 0) {
    const { data: ownBookings } = await db
      .schema('commons')
      .from('booking')
      .select('post_id, status')
      .in('post_id', crossCompanyIds);
    for (const b of (ownBookings ?? []) as Array<{ post_id: string; status: string }>) {
      bookingStatusByPostId[b.post_id] = b.status;
    }
  }

  return (
    <div
      data-testid="worker-commons"
      style={{ maxWidth: 1180, margin: '0 auto', padding: `${SPACE.lg}px ${SPACE.md}px ${SPACE['2xl']}px`, fontFamily: TYPE_FAMILY }}
    >
      {/* Back nav */}
      <Link href="/worker/workspace" style={{ ...typeStyle('caption'), color: TOKENS.inkHint, textDecoration: 'none', display: 'inline-block', marginBottom: SPACE.sm }}>
        ← Spazio operativo
      </Link>

      <PageHead
        eyebrow="My KORA · KORA Space"
        title="KORA Space"
        lead="Iniziative, opportunità e contenuti pubblicati per la tua organizzazione e la rete KORA."
        meta={<BoundaryBadge mode="LIVE" variant="light" />}
      />

      {/* Privacy notice — non-suppressible. Now the governed system message,
          which carries its own icon; the decorative lock glyph is dropped.
          Copy unchanged. */}
      <div data-testid="worker-commons-privacy-notice">
        <Notice tone="ok">
          KORA Space mostra contenuti approvati per il tuo tenant e iniziative aperte alla rete.
          La partecipazione è sempre volontaria e non genera classifiche individuali.
          La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale — l&apos;azienda vede solo segnali aggregati.
        </Notice>
      </div>

      <Workspace style={{ marginTop: SPACE.lg }}>

        {/* PRIMARY — what the worker can actually enter. */}
        <Col span="main">
          {hasInitiatives && (
            <Region label="Iniziative partecipabili">
              {/* Mappa — dynamic Leaflet (no SSR) */}
              <div data-testid="worker-commons-map" style={{ marginBottom: SPACE.md }}>
                <InitiativesMapClient initiatives={initiatives} height={340} />
              </div>

              <section data-testid="worker-commons-initiatives">
                {initiatives.map((initiative, idx) => {
                  const grade = initiative.opening_grade as InitiativeOpeningGrade | null;
                  const gradeLabel = grade ? OPENING_GRADE_LABELS[grade] : null;
                  const pillarStyle = initiative.pillar ? PILLAR_COLORS[initiative.pillar] : null;

                  return (
                    <article
                      key={initiative.id}
                      data-testid="worker-commons-initiative-card"
                      style={{
                        display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
                        borderBottom: idx === initiatives.length - 1 ? undefined : `1px solid ${PX.line}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: SPACE.sm, flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, ...typeStyle('subsection'), color: TOKENS.ink }}>
                          {initiative.title}
                        </h3>
                        {grade && gradeLabel && (
                          <span data-testid={`opening-grade-badge-${grade}`}>
                            <Chip>{gradeLabel}</Chip>
                          </span>
                        )}
                      </div>

                      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                        {initiative.pillar && pillarStyle && (
                          <span style={{ ...typeStyle('caption', { weight: 700 }), color: pillarStyle.text }}>{initiative.pillar}{' · '}</span>
                        )}
                        {CATEGORY_LABELS[initiative.category] ?? initiative.category}
                        {initiative.event_start_at && <>{' · '}{new Date(initiative.event_start_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</>}
                        {initiative.location_address && <>{' · '}{initiative.location_address}</>}
                        {initiative.capacity_internal != null && <>{' · '}{initiative.capacity_internal} posti{initiative.capacity_cross != null ? ` (+${initiative.capacity_cross} cross-azienda)` : ''}</>}
                      </p>

                      <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {initiative.body}
                      </p>

                      {/* Pulsante Prenota — solo per iniziative cross_company */}
                      {/* B185: WorkerBookingButton (client) POSTs JSON — sostituisce la form HTML
                          che inviava application/x-www-form-urlencoded mentre l'API richiede JSON. */}
                      {grade === 'cross_company' && (
                        <div style={{ justifySelf: 'start' }}>
                          <WorkerBookingButton postId={initiative.id} initialStatus={bookingStatusByPostId[initiative.id]} />
                        </div>
                      )}
                      {grade !== 'cross_company' && (
                        <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                          Iniziativa informativa, pubblicata dalla tua azienda — non richiede prenotazione in KORA Space.
                        </p>
                      )}
                    </article>
                  );
                })}
              </section>
            </Region>
          )}

          {/* ── Sezione Post generici ─────────────────────────────────────────── */}
          <Region label="Contenuti">
            {allPosts.length === 0 ? (
              <div data-testid="worker-commons-empty">
                <NoData
                  missing={hasInitiatives
                    ? 'Nessun contenuto generico — guarda le iniziative sopra.'
                    : 'La tua organizzazione non ha ancora pubblicato contenuti in KORA Space.'}
                />
              </div>
            ) : (
              <div>
                {allPosts.map((post, idx) => {
                  const pillarStyle = post.pillar ? PILLAR_COLORS[post.pillar] : null;
                  return (
                    <article
                      key={post.id}
                      data-testid="worker-commons-post-card"
                      style={{
                        display: 'grid', gap: SPACE.xs, padding: `${SPACE.md}px 0`,
                        borderBottom: idx === allPosts.length - 1 ? undefined : `1px solid ${PX.line}`,
                      }}
                    >
                      <h2 style={{ margin: 0, ...typeStyle('subsection'), color: TOKENS.ink }}>
                        {post.title}
                      </h2>
                      <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                        {post.pillar && pillarStyle && (
                          <span style={{ ...typeStyle('caption', { weight: 700 }), color: pillarStyle.text }}>{post.pillar}{' · '}</span>
                        )}
                        {CATEGORY_LABELS[post.category] ?? post.category}
                        {' · '}Pubblicato il{' '}
                        {new Date(post.published_at ?? post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p style={{ margin: 0, ...typeStyle('secondary'), color: TOKENS.inkSecondary, whiteSpace: 'pre-wrap' }}>
                        {post.body}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </Region>
        </Col>

        {/* Subordinate: how participation works, and the boundary footer. */}
        <Col span="rail">
          {/* Booking lifecycle — non-suppressible. Salvaged verbatim (B-WORKER-3)
              from /my-kora/kora-space's removed live branch — same explainer
              copy, now shown once here instead of duplicated on both surfaces. */}
          {hasInitiatives && (
            <div data-testid="space-booking-lifecycle">
              <Region label="Come funziona la partecipazione" tone="inset">
                <ol style={{ margin: 0, paddingLeft: SPACE.md, display: 'grid', gap: SPACE.xs, ...typeStyle('caption'), color: BADGE_TOKENS.eligible.text }}>
                  <li>Richiedi partecipazione su KORA Space</li>
                  <li>KORA esamina la richiesta</li>
                  <li>Ricevi conferma (partecipazione confermata)</li>
                  <li>Partecipazione registrata dopo l&apos;evento</li>
                  <li>Traccia privata nel tuo percorso personale (solo tua)</li>
                  <li>Segnale aggregato per l&apos;ecosistema — il datore di lavoro non vede il tuo percorso individuale</li>
                </ol>
              </Region>
            </div>
          )}

          {/* Boundary footer */}
          <div data-testid="worker-commons-footer">
            <Region label="Confine KORA Space" tone="inset">
              <p style={{ margin: 0, ...typeStyle('caption'), color: TOKENS.inkHint }}>
                KORA Space · Tenant-scoped · Solo contenuti approvati da KORA ·
                Nessun commento · Nessuna reaction · Nessun read receipt ·
                Mappa: OpenStreetMap · La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale.
              </p>
            </Region>
          </div>
        </Col>
      </Workspace>
    </div>
  );
}
