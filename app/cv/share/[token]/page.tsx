// app/cv/share/[token]/page.tsx
// B126: Public share view for Dynamic Impact CV.
//
// PUBLIC ROUTE — no authentication required.
// The raw token comes from the URL path.
// Server-side: hash the token, lookup in personal.worker_cv_share via service role,
// compute CV data for the owning worker, render public-safe view.
//
// Public-safe CV NEVER shows:
//   - worker_id (internal UUID)
//   - tenant_id (internal UUID)
//   - email (excluded unless worker explicitly chose to share — not in B126)
//   - private_note
//   - ranking, score, percentile, comparison with colleagues
//
// Public-safe CV CAN show:
//   - display_name
//   - pillar profile (counts per pillar)
//   - experiences (title, pillar, status label, date)
//   - narrative (headline, strengths, emerging areas)
//   - privacy footer (canonical disclaimer)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { hashShareToken, isShareExpired } from '@/lib/worker-cv/share-token';

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_META: Record<string, { color: string; bg: string }> = {
  LIFE:       { color: '#2F7D55', bg: 'rgba(47,125,85,0.08)'   },
  GROWTH:     { color: '#3B6EBA', bg: 'rgba(59,110,186,0.08)'  },
  CONNECTION: { color: '#7C3D8F', bg: 'rgba(124,61,143,0.08)'  },
  IMPACT:     { color: '#C07D2A', bg: 'rgba(192,125,42,0.08)'  },
  LEGACY:     { color: '#5A4A3F', bg: 'rgba(90,74,63,0.08)'    },
};

const STATUS_LABELS: Record<string, string> = {
  interested: 'Interesse espresso',
  registered: 'Iscrizione',
  attended:   'Partecipazione registrata',
};

export default async function CVSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Validate token format — 64-char hex string (32 bytes)
  if (!token || !/^[0-9a-f]{64}$/.test(token)) {
    notFound();
  }

  const tokenHash = hashShareToken(token);
  const db = getSupabaseServiceClient();

  // ── 1. Lookup share record ─────────────────────────────────────────────────
  const { data: shareRow, error: shareErr } = await db
    .schema('personal')
    .from('worker_cv_share')
    .select('id, worker_id, status, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (shareErr || !shareRow) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const share = shareRow as any;

  // ── 2. Status checks ──────────────────────────────────────────────────────
  if (share.status === 'revoked') {
    return <ShareInvalidPage reason="revoked" />;
  }

  if (share.status === 'expired' || isShareExpired(share.expires_at as string)) {
    // Mark as expired in DB if not already done (best-effort, no await needed for UX)
    void db.schema('personal').from('worker_cv_share')
      .update({ status: 'expired' })
      .eq('id', share.id as string)
      .eq('status', 'active');
    return <ShareInvalidPage reason="expired" />;
  }

  // ── 3. Update access tracking (best-effort — failure does not block view) ─
  void db.schema('personal').from('worker_cv_share')
    .update({
      access_count:     (share.access_count as number ?? 0) + 1,
      last_accessed_at: new Date().toISOString(),
    })
    .eq('id', share.id as string);

  const workerId = share.worker_id as string;

  // ── 4. Load CV data for the owning worker ─────────────────────────────────
  const [{ data: profRow }, { data: participationRows }] = await Promise.all([
    db.schema('personal').from('worker_profile_private')
      .select('display_name')
      .eq('worker_id', workerId)
      .maybeSingle(),

    db.schema('personal').from('worker_participation')
      .select(`
        initiative_id,
        status,
        updated_at,
        worker_initiative:initiative_id (
          title,
          pillar,
          delivery_mode
        )
      `)
      .eq('worker_id', workerId)
      .order('updated_at', { ascending: false }),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof         = (profRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const participations = (participationRows ?? []) as any[];

  const displayName = (prof.display_name as string | null) ?? 'Lavoratore';

  // ── 5. Build pillar profile ────────────────────────────────────────────────
  const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
  type PillarCode = typeof ALL_PILLARS[number];

  const pillarCounts: Record<PillarCode, number> = {
    LIFE: 0, GROWTH: 0, CONNECTION: 0, IMPACT: 0, LEGACY: 0,
  };


  const experiences: Array<{ title: string; pillar: PillarCode; statusLabel: string; date: string }> = [];

  for (const row of participations) {
    const status = row.status as string;
    if (status === 'cancelled') continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init   = (row.worker_initiative ?? {}) as any;
    const pillar = init.pillar as PillarCode | undefined;
    if (!pillar || !pillarCounts[pillar] !== undefined) {
      if (pillar && pillar in pillarCounts) pillarCounts[pillar]++;
    }

    if (pillar && pillar in pillarCounts) {
      pillarCounts[pillar]++;
      experiences.push({
        title:       (init.title as string) ?? '—',
        pillar,
        statusLabel: STATUS_LABELS[status] ?? status,
        date:        (row.updated_at as string)?.slice(0, 10) ?? '',
      });
    }
  }

  const activePillars = ALL_PILLARS.filter(p => pillarCounts[p] > 0);
  const totalActivities = experiences.length;

  return (
    <div
      data-testid="cv-share-public-view"
      style={{
        maxWidth:   760,
        margin:     '0 auto',
        padding:    '40px 24px 60px',
        fontFamily: FONT,
      }}
    >
      {/* ── Shared banner ───────────────────────────────────────────── */}
      <div
        data-testid="cv-share-voluntary-banner"
        style={{
          background:   'rgba(6,3,43,0.04)',
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 10,
          padding:      '10px 16px',
          marginBottom: 28,
          display:      'flex',
          gap:          10,
          alignItems:   'center',
        }}
      >
        <span style={{ fontSize: 14 }}>&#128279;</span>
        <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.55)', margin: 0, lineHeight: 1.5 }}>
          CV condiviso volontariamente dal lavoratore. Non &egrave; una valutazione KORA
          dell&apos;azienda o della performance individuale.
        </p>
      </div>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div
        data-testid="cv-share-hero"
        style={{
          background:   '#06032B',
          borderRadius: 16,
          padding:      '28px 32px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>
          Dynamic Impact CV
        </p>
        <h1
          data-testid="cv-share-display-name"
          style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px', letterSpacing: '-0.025em' }}
        >
          {displayName}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
          {totalActivities} {totalActivities === 1 ? 'attività' : 'attività'} tracciate &middot; {activePillars.length} pillar attivi
        </p>
      </div>

      {/* ── Pillar profile ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
          Profilo pillar
        </p>
        <div
          data-testid="cv-share-pillar-profile"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}
        >
          {ALL_PILLARS.map(p => {
            const meta  = PILLAR_META[p];
            const count = pillarCounts[p];
            return (
              <div
                key={p}
                style={{
                  border:       `1px solid ${meta?.color ?? '#ddd'}30`,
                  borderRadius: 10,
                  padding:      '12px 10px',
                  background:   count > 0 ? (meta?.bg ?? '#f9f9f9') : 'rgba(6,3,43,0.02)',
                  opacity:      count > 0 ? 1 : 0.4,
                  textAlign:    'center',
                }}
              >
                <p style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: meta?.color ?? '#06032B', margin: '0 0 4px' }}>
                  {p}
                </p>
                <p style={{ fontSize: '1.25rem', fontWeight: 900, color: count > 0 ? (meta?.color ?? '#06032B') : 'rgba(6,3,43,0.20)', margin: 0 }}>
                  {count}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Experiences ───────────────────────────────────────────────── */}
      {experiences.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
            Esperienze
          </p>
          <div
            data-testid="cv-share-experiences"
            style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
          >
            {experiences.map((exp, i) => {
              const meta = PILLAR_META[exp.pillar];
              return (
                <div
                  key={i}
                  style={{
                    border:       '1px solid rgba(6,3,43,0.08)',
                    borderRadius: 10,
                    padding:      '12px 16px',
                    display:      'flex',
                    alignItems:   'flex-start',
                    gap:          12,
                  }}
                >
                  <div style={{
                    minWidth:       36,
                    height:         36,
                    borderRadius:   8,
                    background:     meta?.bg ?? 'rgba(6,3,43,0.05)',
                    display:        'flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    flexShrink:     0,
                  }}>
                    <span style={{ fontSize: 8, fontWeight: 800, color: meta?.color ?? '#06032B' }}>
                      {exp.pillar.slice(0, 2)}
                    </span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 2px' }}>
                      {exp.title}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: 0 }}>
                      {exp.pillar} &middot; {exp.statusLabel}{exp.date ? ` · ${exp.date}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Privacy footer — non-suppressible ─────────────────────────── */}
      <div
        data-testid="cv-share-privacy-footer"
        style={{
          borderTop:  '1px solid rgba(6,3,43,0.08)',
          paddingTop: 20,
          marginTop:  8,
        }}
      >
        <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px', lineHeight: 1.6 }}>
          CV condiviso volontariamente dal lavoratore tramite KORA Foundation Light.
          Non &egrave; una valutazione della performance individuale.
          Non contiene ranking, score o confronto con colleghi.
        </p>
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.25)', margin: 0, lineHeight: 1.5 }}>
          KORA misura le organizzazioni, non valuta i singoli lavoratori.
          Questo link pu&ograve; essere revocato dal lavoratore in qualsiasi momento.
        </p>
      </div>
    </div>
  );
}

// ── Invalid share states ──────────────────────────────────────────────────────

function ShareInvalidPage({ reason }: { reason: 'revoked' | 'expired' }) {
  const msg = reason === 'revoked'
    ? { title: 'Link revocato', body: 'Il lavoratore ha revocato questo link di condivisione.' }
    : { title: 'Link scaduto',  body: 'Questo link di condivisione è scaduto.' };

  return (
    <div
      data-testid={`cv-share-${reason}`}
      style={{
        maxWidth:   480,
        margin:     '80px auto',
        padding:    '40px 32px',
        textAlign:  'center',
        fontFamily: FONT,
        border:     '1px solid rgba(6,3,43,0.08)',
        borderRadius: 16,
      }}
    >
      <p style={{ fontSize: 32, margin: '0 0 16px' }}>
        {reason === 'revoked' ? '🔒' : '⏰'}
      </p>
      <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#06032B', margin: '0 0 10px' }}>
        {msg.title}
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.50)', margin: '0 0 24px', lineHeight: 1.6 }}>
        {msg.body}
      </p>
      <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.5 }}>
        KORA Foundation Light &middot; Dynamic Impact CV
      </p>
    </div>
  );
}
