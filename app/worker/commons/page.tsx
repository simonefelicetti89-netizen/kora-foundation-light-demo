// app/worker/commons/page.tsx
// B128: KORA Commons — Worker view. Tenant-scoped, published only, privacy-safe.
//
// Access: WORKER only (requireWorkerUser enforced).
// Privacy contract:
//   - worker vede solo post status='published' del proprio tenant
//   - nessun tracking individuale di lettura
//   - nessun dato individuale esposto (no worker_id, no email, no PIB)
//   - nessuna azione: no commenti, no like, no submit post
//   - la lettura non viene mostrata al datore di lavoro come dato individuale

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireWorkerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'KORA Commons · Worker' };

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

export default async function WorkerCommonsPage() {
  const auth = await requireWorkerUser();
  if (isKoraAuthError(auth)) redirect('/worker/login?hint=worker');

  const { tenantId } = auth;
  const db = getSupabaseServiceClient();

  const { data: posts } = await db
    .schema('commons')
    .from('post')
    .select('id, author_role, title, body, category, pillar, published_at, created_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPosts = (posts ?? []) as any[];

  return (
    <div
      data-testid="worker-commons"
      style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}
    >
      {/* Back nav */}
      <Link href="/my-kora" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
        ← My KORA
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          KORA Commons
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
          Contenuti pubblicati dalla tua organizzazione — iniziative, aggiornamenti, opportunità.
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
          KORA Commons mostra contenuti pubblicati per il tuo tenant.
          La tua lettura non viene mostrata al datore di lavoro come dato individuale.
        </p>
      </div>

      {/* Posts feed */}
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
            La tua organizzazione non ha ancora pubblicato contenuti in KORA Commons.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  padding:      '20px 24px',
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

                {/* Title */}
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#06032B', margin: '0 0 8px', lineHeight: 1.35 }}>
                  {post.title}
                </h2>

                {/* Body */}
                <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.65)', margin: '0 0 12px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
                  {post.body}
                </p>

                {/* Meta */}
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
                  Pubblicato il{' '}
                  {new Date(post.published_at ?? post.created_at).toLocaleDateString('it-IT', {
                    day:   'numeric',
                    month: 'long',
                    year:  'numeric',
                  })}
                </p>
              </article>
            );
          })}
        </div>
      )}

      {/* Boundary footer */}
      <div
        data-testid="worker-commons-footer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16, marginTop: 40 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Commons Foundation · Tenant-scoped · Solo contenuti approvati da KORA ·
          Nessun commento · Nessuna reaction · Nessun read receipt ·
          La tua visualizzazione non viene mostrata al datore di lavoro come dato individuale.
        </p>
      </div>
    </div>
  );
}
