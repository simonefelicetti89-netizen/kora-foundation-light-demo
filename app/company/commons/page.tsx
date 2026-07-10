// app/company/commons/page.tsx
// B128: KORA Commons — Company Admin view. Tenant-scoped, moderated, privacy-safe.
//
// Access: COMPANY_ADMIN only (requireCompanyUser enforced).
// Privacy contract:
//   - tenant_id dalla sessione — nessun accesso cross-tenant
//   - mostra post del proprio tenant (tutti gli stati per COMPANY_ADMIN)
//   - nessun dato individuale worker
//   - pubblicazione richiede approvazione KORA_ADMIN
//   - nessun analytics di lettura worker visibili qui

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requireCompanyUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CommonsCreateForm } from '@/components/commons/CommonsCreateForm';

export const metadata = { title: 'KORA Space · Company' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const CATEGORY_LABELS: Record<string, string> = {
  announcement:      'Annuncio',
  initiative_update: 'Aggiornamento iniziativa',
  opportunity:       'Opportunità',
  event:             'Evento',
  request:           'Richiesta',
  resource:          'Risorsa',
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft:          { label: 'Bozza',       color: 'rgba(6,3,43,0.50)', bg: 'rgba(6,3,43,0.06)',  border: 'rgba(6,3,43,0.12)' },
  pending_review: { label: 'In revisione', color: '#8A5A00',          bg: 'rgba(192,125,42,0.08)', border: 'rgba(192,125,42,0.22)' },
  published:      { label: 'Pubblicato',  color: '#2F7D55',           bg: 'rgba(47,125,85,0.08)', border: 'rgba(47,125,85,0.22)' },
  archived:       { label: 'Archiviato',  color: 'rgba(6,3,43,0.40)', bg: 'rgba(6,3,43,0.04)',  border: 'rgba(6,3,43,0.10)' },
  rejected:       { label: 'Rifiutato',   color: '#9E3B2F',           bg: 'rgba(158,59,47,0.08)', border: 'rgba(158,59,47,0.22)' },
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE:       '#2F7D55',
  GROWTH:     '#3B6EBA',
  CONNECTION: '#7C3D8F',
  IMPACT:     '#C07D2A',
  LEGACY:     '#5A4A3F',
};

export default async function CompanyCommonsPage() {
  const auth = await requireCompanyUser();

  if (isKoraAuthError(auth)) redirect('/login?role_hint=company');
  if (auth.koraRole !== 'COMPANY_ADMIN') {
    redirect('/company/workspace');
  }

  const { tenantId } = auth;
  const db = getSupabaseServiceClient();

  const { data: posts } = await db
    .schema('commons')
    .from('post')
    .select('id, author_role, title, body, category, status, pillar, published_at, reviewed_at, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPosts = (posts ?? []) as any[];
  const pending   = allPosts.filter((p) => p.status === 'pending_review');
  const published = allPosts.filter((p) => p.status === 'published');
  const drafts    = allPosts.filter((p) => p.status === 'draft');

  return (
    <div
      data-testid="company-commons"
      style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px 80px', fontFamily: FONT }}
    >
      {/* Back nav */}
      <Link href="/company" style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}>
        ← Executive Cockpit
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 8px' }}>
          KORA Space
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: 0, lineHeight: 1.6 }}>
          Il layer operativo dell&apos;attivazione umana nel tuo tenant. Non un social network. Non un modulo welfare.
        </p>
      </div>

      {/* Operating model — non-suppressible */}
      <div
        data-testid="space-operating-model"
        style={{
          background:   'rgba(6,3,43,0.03)',
          border:       '1px solid rgba(6,3,43,0.09)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: '#06032B', margin: '0 0 6px' }}>
          KORA Space è il luogo in cui KORA passa dalla misurazione all&apos;attivazione.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: 0, lineHeight: 1.65 }}>
          Non è un social network e non è sorveglianza dei lavoratori.
          Le adesioni sono visibili all&apos;azienda solo in forma aggregata — nessun nome, nessun ID worker, nessuna traccia individuale.
          KORA Contribution™ è un indicatore companion che legge parte del valore generato dallo Space — non è il suo scopo principale e non è una componente del KORA Index™.
        </p>
      </div>

      {/* Activation loop — non-suppressible */}
      <div
        data-testid="space-activation-loop"
        style={{
          background:   'rgba(47,125,85,0.05)',
          border:       '1.5px solid rgba(47,125,85,0.18)',
          borderRadius: 12,
          padding:      '16px 20px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 11, fontWeight: 700, color: '#2F7D55', margin: '0 0 10px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Come funziona KORA Space
        </p>
        <ol style={{ fontSize: 12, color: '#2F5A42', lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
          <li>L&apos;azienda propone un&apos;iniziativa in KORA Space.</li>
          <li>KORA la modera e la pubblica — solo dopo approvazione KORA.</li>
          <li>I lavoratori scoprono e partecipano — il datore di lavoro vede solo aggregati.</li>
          <li>La partecipazione viene confermata dall&apos;admin.</li>
          <li>La partecipazione confermata crea una traccia privata nel percorso personale del lavoratore (timeline personale).</li>
          <li>In forma aggregata, può generare un <strong>Contribution Event</strong> per KORA Contribution™ — indicatore companion separato dal KORA Index™ e <strong>non una sua componente</strong>.</li>
        </ol>
      </div>

      {/* Pilot Preview notice — non-suppressible */}
      <div
        data-testid="space-pilot-preview-notice"
        style={{
          background:   'rgba(74,127,224,0.06)',
          border:       '1px solid rgba(74,127,224,0.18)',
          borderRadius: 10,
          padding:      '10px 14px',
          marginBottom: 20,
          fontSize:     11,
          color:        '#3B5A8A',
          lineHeight:   1.6,
        }}
      >
        <strong>KORA Space · Pilot Preview.</strong>{' '}
        La dashboard live di KORA Contribution™ richiede l&apos;attivazione del profilo Pilot+.
        Gli eventi di partecipazione possono essere registrati; la dashboard live richiede l&apos;attivazione pilot.
        KORA Space non influenza direttamente il KORA Index™.
      </div>

      {/* Moderation copy — non-suppressible */}
      <div
        data-testid="company-commons-moderation-notice"
        style={{
          background:   'rgba(192,125,42,0.07)',
          border:       '1.5px solid rgba(192,125,42,0.25)',
          borderRadius: 12,
          padding:      '14px 18px',
          marginBottom: 28,
          display:      'flex',
          gap:          10,
          alignItems:   'flex-start',
        }}
      >
        <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>&#9432;</span>
        <p style={{ fontSize: 13, color: '#8A5A00', margin: 0, lineHeight: 1.6 }}>
          <strong>KORA Space è uno spazio moderato.</strong>{' '}
          I contenuti diventano visibili ai worker solo dopo approvazione KORA.
          Invia i tuoi contenuti a revisione usando il pulsante &quot;Invia a revisione KORA&quot;.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 32 }}>
        {[
          { label: 'In revisione', value: pending.length,   color: '#8A5A00', bg: 'rgba(192,125,42,0.08)' },
          { label: 'Pubblicati',   value: published.length, color: '#2F7D55', bg: 'rgba(47,125,85,0.08)'  },
          { label: 'Bozze',        value: drafts.length,    color: 'rgba(6,3,43,0.50)', bg: 'rgba(6,3,43,0.04)' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '16px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 28, fontWeight: 800, color, margin: '0 0 4px', lineHeight: 1 }}>{value}</p>
            <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: 0 }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      <CommonsCreateForm tenantId={tenantId} />

      {/* Posts list */}
      <div style={{ marginTop: 40 }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#06032B', margin: '0 0 16px' }}>
          Tutti i contenuti ({allPosts.length})
        </h2>

        {allPosts.length === 0 ? (
          <div
            data-testid="company-commons-empty"
            style={{ textAlign: 'center', padding: '40px 24px', background: 'rgba(6,3,43,0.03)', borderRadius: 12, border: '1px dashed rgba(6,3,43,0.12)' }}
          >
            <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
              Nessun contenuto ancora. Crea il primo comunicato per il tuo team.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allPosts.map((post) => {
              const sm = STATUS_META[post.status] ?? STATUS_META.draft;
              const pillarColor = post.pillar ? PILLAR_COLORS[post.pillar] : undefined;
              return (
                <div
                  key={post.id}
                  data-testid="company-commons-post-card"
                  style={{
                    background:   '#FAFAFA',
                    border:       '1px solid rgba(6,3,43,0.09)',
                    borderRadius: 12,
                    padding:      '16px 20px',
                    display:      'flex',
                    gap:          16,
                    alignItems:   'flex-start',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>
                        {sm.label}
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', padding: '2px 6px', background: 'rgba(6,3,43,0.05)', borderRadius: 4 }}>
                        {CATEGORY_LABELS[post.category] ?? post.category}
                      </span>
                      {post.pillar && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: pillarColor, padding: '2px 6px', borderRadius: 4, background: `${pillarColor}14` }}>
                          {post.pillar}
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#06032B', margin: '0 0 4px', lineHeight: 1.3 }}>
                      {post.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: '0 0 8px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {post.body}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0 }}>
                      Creato il {new Date(post.created_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {post.published_at && ` · Pubblicato il ${new Date(post.published_at).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Aggregate privacy copy — non-suppressible */}
      <div
        data-testid="space-aggregate-privacy-copy"
        style={{
          background:   'rgba(47,125,85,0.04)',
          border:       '1px solid rgba(47,125,85,0.14)',
          borderRadius: 10,
          padding:      '10px 14px',
          marginTop: 28,
          marginBottom: 0,
        }}
      >
        <p style={{ fontSize: 11, color: '#2F5A42', margin: 0, lineHeight: 1.6 }}>
          Le adesioni sono gestite nel rispetto del perimetro privacy: l&apos;azienda vede solo aggregati.
          Nessun lavoratore identificabile, nessun percorso individuale visibile in questa vista.
        </p>
      </div>

      {/* Privacy footer — non-suppressible */}
      <div style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16, marginTop: 20 }}>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Space · Tenant-scoped · Moderation-first ·
          Nessun dato individuale worker esposto. Nessun analytics di lettura individuale.
          I contenuti pubblicati sono visibili ai worker solo dopo approvazione KORA.
        </p>
      </div>
    </div>
  );
}
