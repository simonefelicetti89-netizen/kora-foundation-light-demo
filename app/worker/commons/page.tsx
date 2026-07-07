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

export const metadata = { title: 'KORA Space · Worker' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const CATEGORY_LABELS: Record<string, string> = {
  announcement:      'Annuncio',
  initiative_update: 'Aggiornamento iniziativa',
  opportunity:       'Opportunità',
  event:             'Evento',
  request:           'Richiesta',
  resource:          'Risorsa',
};

const PILLAR_COLORS: Record<string, { text: string; bg: string }> = {
  LIFE:       { text: '#2F7D55', bg: 'rgba(47,125,85,0.08)'   },
  GROWTH:     { text: '#3B6EBA', bg: 'rgba(59,110,186,0.08)'  },
  CONNECTION: { text: '#7C3D8F', bg: 'rgba(124,61,143,0.08)'  },
  IMPACT:     { text: '#C07D2A', bg: 'rgba(192,125,42,0.08)'  },
  LEGACY:     { text: '#5A4A3F', bg: 'rgba(90,74,63,0.08)'    },
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

  return (
    <div
      data-testid="worker-commons"
      style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}
    >
      {/* Back nav */}
      <Link href="/my-kora" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
        ← My KORA
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          KORA Space
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
          Iniziative, opportunità e contenuti pubblicati per la tua organizzazione e la rete KORA.
        </p>
      </div>

      {/* Privacy notice — non-suppressible */}
      <div
        data-testid="worker-commons-privacy-notice"
        style={{
          background:   'rgba(47,125,85,0.07)',
          border:       '1.5px solid rgba(47,125,85,0.22)',
          borderRadius: 12,
          padding:      '12px 16px',
          marginBottom: 28,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1.2, flexShrink: 0 }}>&#128274;</span>
        <p style={{ fontSize: 12, color: '#2F7D55', margin: 0, lineHeight: 1.6 }}>
          KORA Space mostra contenuti approvati per il tuo tenant e iniziative aperte alla rete.
          La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale.
        </p>
      </div>

      {/* ── Sezione Iniziative ────────────────────────────────────────────── */}
      {hasInitiatives && (
        <section
          data-testid="worker-commons-initiatives"
          style={{ marginBottom: 40 }}
        >
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#06032B', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Iniziative partecipabili
          </h2>

          {/* Mappa — dynamic Leaflet (no SSR) */}
          <div data-testid="worker-commons-map" style={{ marginBottom: 20 }}>
            <InitiativesMapClient initiatives={initiatives} height={340} />
          </div>

          {/* Cards iniziative */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {initiatives.map((initiative) => {
              const grade = initiative.opening_grade as InitiativeOpeningGrade | null;
              const gradeStyle = grade ? OPENING_GRADE_COLORS[grade] : null;
              const gradeLabel = grade ? OPENING_GRADE_LABELS[grade] : null;
              const pillarStyle = initiative.pillar ? PILLAR_COLORS[initiative.pillar] : null;

              return (
                <article
                  key={initiative.id}
                  data-testid="worker-commons-initiative-card"
                  style={{
                    background:   '#FFFFFF',
                    border:       '1px solid rgba(6,3,43,0.09)',
                    borderRadius: 14,
                    padding:      '16px 20px',
                  }}
                >
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {grade && gradeStyle && (
                      <span
                        data-testid={`opening-grade-badge-${grade}`}
                        style={{
                          fontSize:     9,
                          fontWeight:   700,
                          color:        gradeStyle.text,
                          padding:      '2px 8px',
                          borderRadius: 4,
                          background:   gradeStyle.bg,
                          border:       `1px solid ${gradeStyle.border}`,
                          letterSpacing: '0.04em',
                        }}
                      >
                        {gradeLabel}
                      </span>
                    )}
                    {initiative.pillar && pillarStyle && (
                      <span style={{ fontSize: 9, fontWeight: 600, color: pillarStyle.text, padding: '2px 8px', borderRadius: 4, background: pillarStyle.bg }}>
                        {initiative.pillar}
                      </span>
                    )}
                    <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', padding: '2px 8px', background: 'rgba(6,3,43,0.04)', borderRadius: 4 }}>
                      {CATEGORY_LABELS[initiative.category] ?? initiative.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: '#06032B', margin: '0 0 6px', lineHeight: 1.35 }}>
                    {initiative.title}
                  </h3>

                  {/* Body preview */}
                  <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.60)', margin: '0 0 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {initiative.body}
                  </p>

                  {/* Meta row */}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', marginBottom: grade === 'cross_company' ? 12 : 0 }}>
                    {initiative.event_start_at && (
                      <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.50)' }}>
                        📅{' '}
                        {new Date(initiative.event_start_at).toLocaleDateString('it-IT', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </span>
                    )}
                    {initiative.location_address && (
                      <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.50)' }}>
                        📍 {initiative.location_address}
                      </span>
                    )}
                    {initiative.capacity_internal != null && (
                      <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)' }}>
                        {initiative.capacity_internal} posti
                        {initiative.capacity_cross != null ? ` (+${initiative.capacity_cross} cross-azienda)` : ''}
                      </span>
                    )}
                  </div>

                  {/* Pulsante Prenota — solo per iniziative cross_company */}
                  {/* B185: WorkerBookingButton (client) POSTs JSON — sostituisce la form HTML
                      che inviava application/x-www-form-urlencoded mentre l'API richiede JSON. */}
                  {grade === 'cross_company' && (
                    <WorkerBookingButton postId={initiative.id} />
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Sezione Post generici ─────────────────────────────────────────── */}
      <section>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#06032B', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          Contenuti
        </h2>

        {allPosts.length === 0 ? (
          <div
            data-testid="worker-commons-empty"
            style={{
              textAlign:    'center',
              padding:      '48px 24px',
              background:   'rgba(6,3,43,0.03)',
              borderRadius: 14,
              border:       '1px dashed rgba(6,3,43,0.10)',
            }}
          >
            <p style={{ fontSize: 14, fontWeight: 600, color: '#06032B', margin: '0 0 8px' }}>
              Nessun contenuto ancora
            </p>
            <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: 0 }}>
              {hasInitiatives
                ? 'Nessun contenuto generico — guarda le iniziative sopra.'
                : 'La tua organizzazione non ha ancora pubblicato contenuti in KORA Space.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {allPosts.map((post) => {
              const pillarStyle = post.pillar ? PILLAR_COLORS[post.pillar] : null;
              return (
                <article
                  key={post.id}
                  data-testid="worker-commons-post-card"
                  style={{
                    background:   '#FFFFFF',
                    border:       '1px solid rgba(6,3,43,0.09)',
                    borderRadius: 14,
                    padding:      '18px 22px',
                  }}
                >
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                    <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', padding: '2px 8px', background: 'rgba(6,3,43,0.05)', borderRadius: 4 }}>
                      {CATEGORY_LABELS[post.category] ?? post.category}
                    </span>
                    {post.pillar && pillarStyle && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: pillarStyle.text, padding: '2px 8px', borderRadius: 4, background: pillarStyle.bg }}>
                        {post.pillar}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: '#06032B', margin: '0 0 8px', lineHeight: 1.35 }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.65)', margin: '0 0 12px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                    {post.body}
                  </p>
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
                    Pubblicato il{' '}
                    {new Date(post.published_at ?? post.created_at).toLocaleDateString('it-IT', {
                      day: 'numeric', month: 'long', year: 'numeric',
                    })}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Boundary footer */}
      <div
        data-testid="worker-commons-footer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16, marginTop: 40 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Space · Tenant-scoped · Solo contenuti approvati da KORA ·
          Nessun commento · Nessuna reaction · Nessun read receipt ·
          Mappa: OpenStreetMap · La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale.
        </p>
      </div>
    </div>
  );
}
