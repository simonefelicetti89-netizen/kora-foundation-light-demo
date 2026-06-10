// app/account/page.tsx
// B118: Role-aware account profile page — accessible to all authenticated users.
//
// Privacy rules:
//   - No individual worker data is shown here (no workerId, no PIB, no UEF)
//   - No cross-role data leaks: worker sees only their space, company sees only their space
//   - Auth is validated server-side via getSupabaseServerClient().auth.getUser()
//   - koraRole is always read from app_metadata (server-controlled, never from client)
//
// What each role sees:
//   KORA_ADMIN     — email, role badge, admin space description, dashboard link
//   COMPANY_ADMIN  — email, role badge, company space description, dashboard link
//   COMPANY_VIEWER — email, role badge, viewer space description, dashboard link
//   WORKER         — email, role badge, private space description, My KORA link

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getRoleHome } from '@/lib/auth/role-home';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const metadata = { title: 'Il tuo account · KORA' };

const FONT = 'Plus Jakarta Sans, system-ui, sans-serif';

const ROLE_INFO: Record<string, { label: string; spaceLabel: string; description: string; color: string; bg: string; border: string }> = {
  KORA_ADMIN: {
    label:       'KORA Admin',
    spaceLabel:  'Piattaforma KORA',
    description: 'Accesso completo alla piattaforma. Puoi gestire company, advisor, partner e configurazioni metodologia.',
    color:       '#3b30c9',
    bg:          'rgba(97,86,245,0.10)',
    border:      'rgba(97,86,245,0.28)',
  },
  COMPANY_ADMIN: {
    label:       'Company Admin',
    spaceLabel:  'Workspace aziendale',
    description: 'Accesso al workspace aziendale. KORA Index, ingestion dati, report aggregati. Nessun dato individuale lavoratore è visibile a questo ruolo.',
    color:       '#166534',
    bg:          'rgba(22,101,52,0.10)',
    border:      'rgba(22,101,52,0.28)',
  },
  COMPANY_VIEWER: {
    label:       'Company Viewer',
    spaceLabel:  'Workspace aziendale (sola lettura)',
    description: 'Accesso in sola lettura al workspace aziendale. Dashboard KORA Index e report aggregati.',
    color:       'rgba(6,3,43,0.55)',
    bg:          'rgba(6,3,43,0.06)',
    border:      'rgba(6,3,43,0.14)',
  },
  WORKER: {
    label:       'Worker',
    spaceLabel:  'Spazio personale — My KORA',
    description: 'Il tuo spazio personale è privato. I tuoi dati di attivazione non sono visibili al datore di lavoro — l\'azienda vede solo medie aggregate anonime.',
    color:       '#1e4a8a',
    bg:          'rgba(37,99,235,0.10)',
    border:      'rgba(37,99,235,0.28)',
  },
};

export default async function AccountPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const appMeta  = user.app_metadata as Record<string, unknown> | undefined;
  const koraRole = appMeta?.kora_role as string | undefined;

  if (!koraRole) redirect('/login');

  const roleInfo  = ROLE_INFO[koraRole] ?? {
    label:       koraRole,
    spaceLabel:  'Spazio KORA',
    description: 'Account autenticato sulla piattaforma KORA.',
    color:       'rgba(6,3,43,0.55)',
    bg:          'rgba(6,3,43,0.06)',
    border:      'rgba(6,3,43,0.14)',
  };
  const dashboardHref = getRoleHome(koraRole);

  return (
    <div
      data-testid="account-page"
      style={{ maxWidth: 520, margin: '0 auto', padding: '40px 24px', fontFamily: FONT }}
    >
      {/* Back link */}
      <Link
        href={dashboardHref}
        data-testid="account-dashboard-link"
        style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'none', display: 'inline-block', marginBottom: 24 }}
      >
        ← Torna alla dashboard
      </Link>

      {/* Page title */}
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: '0 0 4px' }}>
        Il tuo account
      </h1>
      <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.45)', margin: '0 0 32px' }}>
        Informazioni sul tuo profilo e accesso alla piattaforma.
      </p>

      {/* Identity card */}
      <div
        style={{
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 14,
          overflow:     'hidden',
          marginBottom: 20,
        }}
      >
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(6,3,43,0.07)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 8px' }}>
            Identità
          </p>
          <p
            data-testid="account-email"
            style={{ fontSize: 14, fontWeight: 600, color: '#06032B', margin: '0 0 10px', wordBreak: 'break-all' }}
          >
            {user.email}
          </p>
          <span
            data-testid="account-role-badge"
            style={{
              fontSize:      9,
              fontWeight:    700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding:       '3px 10px',
              borderRadius:  999,
              background:    roleInfo.bg,
              color:         roleInfo.color,
              border:        `1px solid ${roleInfo.border}`,
            }}
          >
            {roleInfo.label}
          </span>
        </div>

        {/* Space description */}
        <div style={{ padding: '16px 24px' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 6px' }}>
            Spazio di accesso
          </p>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#06032B', margin: '0 0 4px' }}>
            {roleInfo.spaceLabel}
          </p>
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.55)', margin: 0, lineHeight: 1.6 }}>
            {roleInfo.description}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 14,
          overflow:     'hidden',
        }}
      >
        <div style={{ padding: '12px 24px', borderBottom: '1px solid rgba(6,3,43,0.07)' }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(6,3,43,0.35)', margin: '0 0 12px' }}>
            Azioni account
          </p>
          <Link
            href="/auth/forgot-password"
            data-testid="account-change-password-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          '#3b30c9',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(97,86,245,0.28)',
              borderRadius:   8,
              background:     'rgba(97,86,245,0.06)',
            }}
          >
            Cambia password
          </Link>
        </div>

        <div style={{ padding: '12px 24px' }}>
          <form action="/api/auth/logout" method="POST">
            <button
              data-testid="account-logout-button"
              type="submit"
              style={{
                fontFamily:   FONT,
                fontSize:     12,
                fontWeight:   600,
                color:        '#9E3B2F',
                background:   'rgba(158,59,47,0.06)',
                border:       '1px solid rgba(158,59,47,0.20)',
                borderRadius: 8,
                padding:      '7px 14px',
                cursor:       'pointer',
              }}
            >
              Esci dall&apos;account
            </button>
          </form>
        </div>
      </div>

      {/* Foundation Light note */}
      <p
        data-testid="account-foundation-light-note"
        style={{ fontSize: 10, color: 'rgba(6,3,43,0.28)', margin: '24px 0 0', lineHeight: 1.5 }}
      >
        KORA Foundation Light · Dati sintetici di demo · Metodologia v0.1 pre-empirical
      </p>
    </div>
  );
}
