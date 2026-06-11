// app/partner/workspace/page.tsx
// B127: Partner Workspace Foundation — area riservata per partner autenticati.
//
// Access: PARTNER only (requirePartnerUser enforced server-side).
// Identity: partnerId always from app_metadata.kora_partner_id — never from URL or body.
//
// Privacy boundaries (non-negotiable):
//   - PARTNER non vede dati individuali worker (no PIB, no Dynamic CV, no worker_id)
//   - PARTNER non vede KORA Index aziendale
//   - PARTNER non vede Trial Control Center o admin
//   - Solo profilo proprio partner e opportunità/servizi collegati al proprio partner_id
//   - Nessun marketplace, nessuna prenotazione, nessun pagamento, nessuna chat

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { requirePartnerUser, isKoraAuthError } from '@/lib/auth/kora-session';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = { title: 'Partner Workspace · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const PILLAR_META: Record<string, { color: string; bg: string; border: string }> = {
  LIFE:       { color: '#2F7D55', bg: 'rgba(47,125,85,0.08)',   border: 'rgba(47,125,85,0.22)'   },
  GROWTH:     { color: '#3B6EBA', bg: 'rgba(59,110,186,0.08)',  border: 'rgba(59,110,186,0.22)'  },
  CONNECTION: { color: '#7C3D8F', bg: 'rgba(124,61,143,0.08)',  border: 'rgba(124,61,143,0.22)'  },
  IMPACT:     { color: '#C07D2A', bg: 'rgba(192,125,42,0.08)',  border: 'rgba(192,125,42,0.22)'  },
  LEGACY:     { color: '#5A4A3F', bg: 'rgba(90,74,63,0.08)',    border: 'rgba(90,74,63,0.22)'    },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  published: { label: 'Pubblicato',  color: '#2F7D55', bg: 'rgba(47,125,85,0.08)',  border: 'rgba(47,125,85,0.22)'  },
  draft:     { label: 'In revisione', color: '#8A5A00', bg: 'rgba(192,125,42,0.08)', border: 'rgba(192,125,42,0.22)' },
  archived:  { label: 'Archiviato',  color: 'rgba(6,3,43,0.45)', bg: 'rgba(6,3,43,0.04)', border: 'rgba(6,3,43,0.12)' },
};

export default async function PartnerWorkspacePage() {
  const auth = await requirePartnerUser();

  if (isKoraAuthError(auth)) {
    redirect('/login?role_hint=partner');
  }

  const { partnerId, email, partnerStatus } = auth;

  const db = getSupabaseServiceClient();

  // Fetch partner profile — service role bypasses RLS for server-side lookup
  const { data: profileRow } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, description, pillar, category, website_url, city, country, delivery_mode, status')
    .eq('id', partnerId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profile = (profileRow ?? null) as any;

  const pillarMeta  = profile ? (PILLAR_META[profile.pillar as string] ?? null) : null;
  const statusMeta  = profile ? (STATUS_META[profile.status as string] ?? null) : null;

  const visibilityNote =
    profile?.status === 'published'
      ? 'Visibile nel catalogo opportunità worker.'
      : profile?.status === 'draft'
        ? 'In revisione da parte di KORA. Non ancora visibile ai worker.'
        : profile?.status === 'archived'
          ? 'Non visibile nel catalogo. Contatta KORA per riattivare.'
          : 'Profilo non trovato — contatta KORA Admin.';

  return (
    <div
      data-testid="partner-workspace"
      style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 60px', fontFamily: FONT }}
    >
      {/* ── Back nav ─────────────────────────────────────────────────────── */}
      <a
        href="/account"
        style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        ← Account
      </a>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div
        data-testid="partner-workspace-hero"
        style={{
          background:   '#06032B',
          borderRadius: 16,
          padding:      '28px 32px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', margin: '0 0 8px' }}>
          Area Partner KORA
        </p>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 4px', letterSpacing: '-0.025em' }}>
          {profile?.name ?? 'Partner KORA'}
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '0 0 12px' }}>
          {email}
          {partnerStatus !== 'active' && (
            <span style={{ marginLeft: 8, color: 'rgba(255,200,100,0.80)' }}>
              · Stato: {partnerStatus}
            </span>
          )}
        </p>
        {profile && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {pillarMeta && (
              <span
                data-testid="partner-workspace-pillar"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: pillarMeta.bg, color: pillarMeta.color, border: `1px solid ${pillarMeta.border}` }}
              >
                {profile.pillar}
              </span>
            )}
            {profile.delivery_mode && (
              <span
                data-testid="partner-workspace-delivery-mode"
                style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                {profile.delivery_mode}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Data boundary — non-suppressible ─────────────────────────────── */}
      <div
        data-testid="partner-workspace-boundary"
        style={{
          background:   'rgba(47,125,85,0.07)',
          border:       '1.5px solid rgba(47,125,85,0.22)',
          borderRadius: 12,
          padding:      '16px 20px',
          marginBottom: 20,
        }}
      >
        <p style={{ fontSize: 12, fontWeight: 700, color: '#2F7D55', margin: '0 0 8px' }}>
          Perimetro dati — accesso partner
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[
            'Non hai accesso a dati individuali dei lavoratori.',
            'Non hai accesso al KORA Index delle aziende.',
            'Non hai accesso a Dynamic Impact CV o PIB individuali.',
            'Non hai accesso a nominativi, email o ID worker.',
            'Le opportunità sono visibili ai worker solo se il tuo profilo è pubblicato da KORA.',
            'Nessun marketplace, nessuna prenotazione, nessun pagamento in questa area.',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 12, color: '#2F7D55', lineHeight: 1.5 }}>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* ── Partner profile ───────────────────────────────────────────────── */}
      {profile ? (
        <div
          data-testid="partner-workspace-profile"
          style={{
            border:       '1px solid rgba(6,3,43,0.09)',
            borderRadius: 14,
            padding:      '20px 24px',
            marginBottom: 20,
            background:   '#FAFAFA',
          }}
        >
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 14px' }}>
            Il tuo profilo partner
          </p>

          <div style={{ display: 'grid', gap: 14 }}>
            {profile.description && (
              <div>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>Descrizione</p>
                <p style={{ fontSize: 13, color: '#06032B', margin: 0, lineHeight: 1.6 }}>
                  {profile.description}
                </p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>Categoria</p>
                <p style={{ fontSize: 12, color: '#06032B', margin: 0 }}>{profile.category ?? '—'}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>Modalità</p>
                <p style={{ fontSize: 12, color: '#06032B', margin: 0, textTransform: 'capitalize' }}>{profile.delivery_mode}</p>
              </div>
              {profile.city && (
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>Città</p>
                  <p style={{ fontSize: 12, color: '#06032B', margin: 0 }}>{profile.city}</p>
                </div>
              )}
              {profile.website_url && (
                <div>
                  <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', margin: '0 0 4px' }}>Sito web</p>
                  <a
                    href={profile.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#3B6EBA', textDecoration: 'none' }}
                  >
                    {profile.website_url}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div
          data-testid="partner-workspace-no-profile"
          style={{
            border:       '1px dashed rgba(6,3,43,0.12)',
            borderRadius: 12,
            padding:      '24px',
            textAlign:    'center',
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 8px' }}>
            Profilo partner non trovato
          </p>
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', margin: 0 }}>
            Contatta KORA Admin per associare il tuo account al profilo partner.
          </p>
        </div>
      )}

      {/* ── Opportunities status ─────────────────────────────────────────── */}
      <div
        data-testid="partner-workspace-opportunity-status"
        style={{
          border:       '1px solid rgba(6,3,43,0.09)',
          borderRadius: 14,
          padding:      '20px 24px',
          marginBottom: 20,
          background:   '#FAFAFA',
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
          Visibilità nel catalogo opportunità
        </p>
        {statusMeta && (
          <span
            data-testid="partner-workspace-status-badge"
            style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 999, background: statusMeta.bg, color: statusMeta.color, border: `1px solid ${statusMeta.border}`, display: 'inline-block', marginBottom: 10 }}
          >
            {statusMeta.label}
          </span>
        )}
        <p
          data-testid="partner-workspace-visibility-note"
          style={{ fontSize: 13, color: '#06032B', margin: 0, lineHeight: 1.6 }}
        >
          {visibilityNote}
        </p>
      </div>

      {/* ── Future capabilities — coming soon ────────────────────────────── */}
      <div
        data-testid="partner-workspace-future"
        style={{
          border:       '1px dashed rgba(6,3,43,0.12)',
          borderRadius: 12,
          padding:      '20px 24px',
          marginBottom: 20,
          background:   'rgba(6,3,43,0.02)',
        }}
      >
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.10em', color: 'rgba(6,3,43,0.35)', margin: '0 0 10px' }}>
          Funzionalità future — prossimamente
        </p>
        <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            'Richieste di contatto da aziende (no chat, no leads individuali)',
            'Performance aggregate dell\'attivazione — nessun dato individuale worker',
            'Protocollo evidenze e stato audit',
            'Coordination KORA per iniziative collettive',
          ].map((item, i) => (
            <li key={i} style={{ fontSize: 12, color: 'rgba(6,3,43,0.50)', lineHeight: 1.5 }}>
              {item} <span style={{ color: 'rgba(6,3,43,0.30)', fontSize: 10 }}>— prossimamente</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Privacy footer — non-suppressible ────────────────────────────── */}
      <div
        data-testid="partner-workspace-footer"
        style={{ borderTop: '1px solid rgba(6,3,43,0.06)', paddingTop: 16 }}
      >
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', margin: 0, lineHeight: 1.6 }}>
          KORA Foundation Light · Area Partner · Metodologia v0.1 pre-empirical ·
          Nessun dato individuale worker esposto in questa area.
          Il tuo account partner è stato provisionato da KORA Admin.
        </p>
      </div>
    </div>
  );
}
