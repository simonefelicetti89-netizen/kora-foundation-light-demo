// app/worker/workspace/page.tsx
// B109: Worker Experience MVP — worker private workspace (server component).
// Only reachable by authenticated WORKER role (layout gate + middleware).
// Shows: identity, available initiatives, participation history, placeholders.
// NEVER shows PIB, rankings, employer analytics, or other workers' data.

import { getCurrentWorkerUser } from '@/lib/auth/kora-session';
import { SessionBar } from '@/components/auth/SessionBar';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { WorkerInitiativeRow, WorkerParticipationRow } from '@/lib/supabase/types';
import { InitiativeCardsClient } from './_components/InitiativeCardsClient';
import type { InitiativeItem } from './_components/InitiativeCardsClient';
import { ActivationProfileSection } from './_components/ActivationProfileSection';
import type { WorkerActivationProfile, PillarDistributionEntry } from '@/app/api/worker/activation-profile/route';

// ── Types ─────────────────────────────────────────────────────────────────────

type HistoryItem = {
  initiative_title: string;
  pillar: WorkerInitiativeRow['pillar'];
  participation_status: WorkerParticipationRow['status'];
  updated_at: string;
  private_note: string | null;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function WorkerWorkspacePage() {
  const worker = await getCurrentWorkerUser();
  if (!worker) redirect('/login');

  const db = getSupabaseServiceClient();

  // Fetch worker identity — own row only (workerId from session)
  const { data: wiRow } = await db.schema('personal').from('worker_identity')
    .select('worker_ref, status, tenant_id, created_at')
    .eq('id', worker.workerId)
    .eq('auth_user_id', worker.id)
    .maybeSingle();

  // Fetch tenant name
  const { data: tenantRow } = await db.schema('analytics').from('tenant')
    .select('company_name, tenant_code')
    .eq('id', worker.tenantId)
    .maybeSingle();

  // Fetch private profile — includes onboarding gate check
  const { data: profRow } = await db.schema('personal').from('worker_profile_private')
    .select('display_name, onboarding_done, onboarding_completed_at')
    .eq('worker_id', worker.workerId)
    .maybeSingle();

  // Onboarding gate: if not completed → redirect to onboarding
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!(profRow as any)?.onboarding_completed_at) {
    redirect('/worker/onboarding');
  }

  // Fetch published initiatives for worker's tenant
  const { data: rawInitiatives } = await db.schema('personal').from('worker_initiative')
    .select('id, title, pillar, description, start_date, end_date, mode, location, eligibility_class')
    .eq('tenant_id', worker.tenantId)
    .eq('status', 'published')
    .order('start_date', { ascending: true, nullsFirst: false });

  // Fetch worker's own participation rows
  const initiativeIds = (rawInitiatives ?? []).map(i => i.id as string);
  const { data: participations } = initiativeIds.length > 0
    ? await db.schema('personal').from('worker_participation')
        .select('initiative_id, status')
        .eq('worker_id', worker.workerId)
        .in('initiative_id', initiativeIds)
    : { data: [] };

  const participationMap = new Map<string, WorkerParticipationRow['status']>(
    (participations ?? []).map(p => [p.initiative_id as string, p.status as WorkerParticipationRow['status']]),
  );

  const initiatives: InitiativeItem[] = (rawInitiatives ?? []).map(i => ({
    id: i.id as string,
    title: i.title as string,
    pillar: i.pillar as WorkerInitiativeRow['pillar'],
    description: i.description as string | null,
    start_date: i.start_date as string | null,
    end_date: i.end_date as string | null,
    mode: i.mode as string | null,
    location: i.location as string | null,
    eligibility_class: i.eligibility_class as string | null,
    participation_status: participationMap.get(i.id as string) ?? null,
  }));

  // Fetch participation history — own rows only, includes private_note (worker is data owner)
  const { data: historyRows } = await db.schema('personal').from('worker_participation')
    .select('initiative_id, status, updated_at, private_note, worker_initiative:initiative_id(title, pillar)')
    .eq('worker_id', worker.workerId)
    .order('updated_at', { ascending: false })
    .limit(20);

  const history: HistoryItem[] = (historyRows ?? []).map(r => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const init = (r.worker_initiative as any) ?? {};
    return {
      initiative_title:     (init.title as string) ?? '—',
      pillar:               (init.pillar as WorkerInitiativeRow['pillar']) ?? 'GROWTH',
      participation_status: r.status as WorkerParticipationRow['status'],
      updated_at:           r.updated_at as string,
      private_note:         (r.private_note as string | null) ?? null,
    };
  });

  // Compute activation profile — server-side, no new table needed
  // Re-uses already-fetched participation rows but needs pillar data from initiative
  const { data: profileRows } = await db.schema('personal').from('worker_participation')
    .select('status, updated_at, worker_initiative:initiative_id(pillar)')
    .eq('worker_id', worker.workerId);

  const ALL_PILLARS = ['LIFE', 'GROWTH', 'CONNECTION', 'IMPACT', 'LEGACY'] as const;
  type ProfilePillar = typeof ALL_PILLARS[number];

  const pillarCounters: Record<ProfilePillar, { interested: number; registered: number; attended: number; cancelled: number }> = {
    LIFE:       { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    GROWTH:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    CONNECTION: { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    IMPACT:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
    LEGACY:     { interested: 0, registered: 0, attended: 0, cancelled: 0 },
  };
  let profileLastActivity: string | null = null;

  for (const row of profileRows ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pillar = ((row.worker_initiative as any)?.pillar as ProfilePillar | undefined);
    if (!pillar || !pillarCounters[pillar]) continue;
    const s = row.status as string;
    if (s === 'interested')       pillarCounters[pillar].interested++;
    else if (s === 'registered')  pillarCounters[pillar].registered++;
    else if (s === 'attended')    pillarCounters[pillar].attended++;
    else if (s === 'cancelled')   pillarCounters[pillar].cancelled++;
    const ua = row.updated_at as string;
    if (!profileLastActivity || ua > profileLastActivity) profileLastActivity = ua;
  }

  const pillarDistribution: PillarDistributionEntry[] = ALL_PILLARS.map(pillar => {
    const c = pillarCounters[pillar];
    return { pillar, ...c, total_active: c.interested + c.registered + c.attended };
  });

  const totalActive    = pillarDistribution.reduce((s, p) => s + p.total_active, 0);
  const hasAnyActivity = totalActive > 0;
  const activePillars  = pillarDistribution.filter(p => p.total_active > 0);

  let strongestPillar: ProfilePillar | null = null;
  if (activePillars.length > 0) {
    strongestPillar = activePillars.reduce((best, p) => p.total_active > best.total_active ? p : best).pillar as ProfilePillar;
  }
  const nonStrongest = activePillars.filter(p => p.pillar !== strongestPillar);
  let emergingPillar: ProfilePillar | null = null;
  if (nonStrongest.length > 0) {
    emergingPillar = nonStrongest.reduce((c, p) => p.total_active < c.total_active ? p : c).pillar as ProfilePillar;
  }

  const activationProfile: WorkerActivationProfile = {
    profileStatus: totalActive === 0 ? 'empty' : 'active',
    pillarDistribution,
    activitySummary: {
      total_interested: pillarDistribution.reduce((s, p) => s + p.interested, 0),
      total_registered: pillarDistribution.reduce((s, p) => s + p.registered, 0),
      total_attended:   pillarDistribution.reduce((s, p) => s + p.attended, 0),
      total_cancelled:  pillarDistribution.reduce((s, p) => s + p.cancelled, 0),
      last_activity_at: profileLastActivity,
    },
    strongestPillar,
    emergingPillar,
    missingPillars: pillarDistribution.filter(p => p.total_active === 0).map(p => p.pillar) as ProfilePillar[],
    lastActivityAt: profileLastActivity,
    privacyNotice:      'Il tuo datore di lavoro non può vedere questo profilo individuale. Solo tu puoi accedere a questi dati.',
    interpretationNote: 'Questo profilo è basato sulle attività registrate in KORA. Non è una valutazione individuale, non genera ranking e non viene condiviso con la tua azienda.',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wi   = (wiRow   ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t    = (tenantRow ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prof = (profRow ?? {}) as any;

  const displayName    = (prof.display_name as string | null) ?? worker.email;
  const onboardingDone = (prof.onboarding_done as boolean) ?? false;
  const status         = (wi.status as string) ?? worker.workerStatus;
  const workerRef      = (wi.worker_ref as string) ?? '—';
  const companyName    = (t.company_name as string) ?? '—';

  // Fetch partner preview — up to 3 published partners for workspace card
  const { data: rawPartnerPreview } = await db
    .schema('network')
    .from('partner_profile')
    .select('id, name, pillar, category, delivery_mode')
    .eq('status', 'published')
    .limit(3);

  type PartnerPreviewItem = { id: string; name: string; pillar: string; category: string | null; delivery_mode: string };
  const partnerPreview: PartnerPreviewItem[] = (rawPartnerPreview ?? []).map(p => ({
    id:            p.id as string,
    name:          p.name as string,
    pillar:        p.pillar as string,
    category:      (p.category as string | null) ?? null,
    delivery_mode: p.delivery_mode as string,
  }));

  const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
    invited:  { bg: '#fef9c3', text: '#854d0e', label: 'Invitato' },
    active:   { bg: '#dcfce7', text: '#15803d', label: 'Attivo' },
    pending:  { bg: '#dbeafe', text: '#1d4ed8', label: 'In attesa' },
    disabled: { bg: '#f3f4f6', text: '#6b7280', label: 'Disabilitato' },
  };
  const sc = STATUS_COLOR[status] ?? STATUS_COLOR['pending'];

  const firstName = (prof.display_name as string | null)
    ? (prof.display_name as string).split(' ')[0]
    : null;

  return (
    <>
    <SessionBar email={worker.email} role={worker.koraRole} />
    <div data-testid="workspace-page" style={{ maxWidth: 660, margin: '0 auto', padding: '40px 24px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <h1 data-testid="workspace-hero" style={{ fontSize: '1.7rem', fontWeight: 800, color: '#06032B', letterSpacing: '-0.03em', margin: 0 }}>
            {firstName ? `Ciao, ${firstName}` : 'Il mio spazio'}
          </h1>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            background: sc.bg, color: sc.text, borderRadius: 4, padding: '2px 7px',
          }}>
            {sc.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 13, color: 'rgba(6,3,43,0.55)', margin: 0 }}>
            {displayName} · {companyName}
          </p>
          {/* Privacy active badge */}
          <span
            data-testid="privacy-active-badge"
            style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              background: 'rgba(22,101,52,0.10)', color: '#166534',
              border: '1px solid rgba(22,101,52,0.22)', borderRadius: 999, padding: '2px 8px',
            }}
          >
            Spazio privato attivo
          </span>
          {/* Review privacy link */}
          <a
            href="/worker/onboarding?mode=review"
            style={{ fontSize: 11, color: 'rgba(6,3,43,0.40)', textDecoration: 'underline', textUnderlineOffset: 2, letterSpacing: '0.01em' }}
          >
            Rivedi privacy boundary
          </a>
        </div>
      </div>

      {/* Privacy notice — always visible */}
      <div style={{
        background: 'rgba(47,125,85,0.06)', border: '1px solid rgba(47,125,85,0.20)',
        borderRadius: 10, padding: '14px 18px', marginBottom: 28,
      }}>
        <p style={{ fontSize: 12, color: '#1a4731', margin: 0, lineHeight: 1.6 }}>
          <strong>Privacy:</strong> Il tuo datore di lavoro non può vedere questi dati individuali.
          Solo tu puoi accedere a questo spazio. KORA misura le organizzazioni, non le persone.
        </p>
      </div>

      {/* Identity card */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>La tua identità KORA</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          <Row label="Email" value={worker.email} />
          <Row label="Azienda" value={companyName} />
          <Row label="Onboarding" value={onboardingDone ? 'Completato' : 'In attesa'} />
        </div>
      </div>

      {/* Initiatives section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Le tue iniziative</h2>
        <InitiativeCardsClient initiatives={initiatives} />
      </div>

      {/* History section */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Il mio storico</h2>
        {history.length === 0 ? (
          <p data-testid="workspace-history-empty" style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.6 }}>
            Non hai ancora partecipazioni registrate.<br />
            Esprimi interesse o iscriviti a un&apos;iniziativa nella sezione &ldquo;Le tue iniziative&rdquo; qui sopra.
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {history.map((h, i) => (
              <HistoryRow key={i} item={h} />
            ))}
          </div>
        )}
        <p style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
          Solo tu puoi vedere questo storico. Non è condiviso con l&apos;azienda.
          Ti aiuta a capire il tuo percorso di attivazione — l&apos;azienda vede solo segnali aggregati, mai la tua attività individuale.
        </p>
      </div>

      {/* Private activation profile */}
      <div style={{
        background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
        padding: '20px 24px', marginBottom: 20,
      }}>
        <h2 style={sectionHeadingStyle}>Il mio profilo privato</h2>
        <ActivationProfileSection profile={activationProfile} />
      </div>

      {/* Partner preview section */}
      <div
        data-testid="workspace-partner-preview"
        style={{
          background: '#fff', border: '1px solid rgba(6,3,43,0.08)', borderRadius: 10,
          padding: '20px 24px', marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={sectionHeadingStyle}>Partner & opportunità</h2>
          {partnerPreview.length > 0 && (
            <a
              href="/worker/opportunities"
              style={{ fontSize: 11, color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
            >
              Vedi tutti →
            </a>
          )}
        </div>
        {partnerPreview.length === 0 ? (
          <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.40)', margin: 0, lineHeight: 1.6 }}>
            La rete partner sarà disponibile prossimamente.<br />
            <span style={{ fontSize: 11 }}>
              I partner vengono pubblicati dall&apos;amministratore KORA.
            </span>
          </p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {partnerPreview.map(p => (
              <PartnerPreviewRow key={p.id} partner={p} />
            ))}
            <a
              href="/worker/opportunities"
              style={{
                fontSize: 11, fontWeight: 700, color: '#06032B',
                background: 'rgba(6,3,43,0.04)', border: '1px solid rgba(6,3,43,0.10)',
                borderRadius: 7, padding: '8px 14px', textDecoration: 'none',
                display: 'inline-block', marginTop: 6, textAlign: 'center',
              }}
            >
              Esplora tutti i partner →
            </a>
          </div>
        )}
      </div>

      {/* KORA Space trace summary — links to private trace surfaces */}
      <div
        data-testid="workspace-trace-summary"
        style={{
          border:         '1px solid rgba(59,110,186,0.18)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     '#FAFAFA',
          marginBottom:   16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3B6EBA', margin: '0 0 6px' }}>
            Le tue tracce personali
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
            Partecipazioni e percorso privato
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Le partecipazioni confermate restano nel tuo percorso privato.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <a
              href="/my-kora/bookings"
              data-testid="workspace-trace-bookings-link"
              style={{ fontSize: 12, fontWeight: 600, color: '#3B6EBA', textDecoration: 'none' }}
            >
              Prenotazioni &amp; partecipazioni →
            </a>
            <a
              href="/my-kora/personal-impact-balance"
              style={{ fontSize: 12, fontWeight: 600, color: '#C76F3D', textDecoration: 'none' }}
            >
              Il tuo bilancio →
            </a>
            <a
              href="/my-kora/dynamic-cv"
              style={{ fontSize: 12, fontWeight: 600, color: '#2F7D55', textDecoration: 'none' }}
            >
              Dynamic Impact CV →
            </a>
          </div>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(59,110,186,0.10)',
            color:         '#3B6EBA',
          }}
        >
          Privato
        </span>
      </div>

      {/* My KORA — navigation bridge to personal area */}
      <div
        data-testid="workspace-my-kora-link"
        style={{
          border:         '1px solid rgba(199,111,61,0.18)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     '#FAFAFA',
          marginBottom:   16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#C76F3D', margin: '0 0 6px' }}>
            My KORA · Area personale
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
            Il tuo spazio privato KORA
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Il tuo bilancio privato e le tue esperienze di attivazione. Solo tu puoi vederlo.
          </p>
          <a
            href="/my-kora/personal-impact-balance"
            data-testid="workspace-my-kora-pib-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          '#C76F3D',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(199,111,61,0.28)',
              borderRadius:   8,
              background:     'rgba(199,111,61,0.06)',
            }}
          >
            Vai alla tua area personale →
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(199,111,61,0.10)',
            color:         '#C76F3D',
          }}
        >
          Privato
        </span>
      </div>

      {/* Dynamic Impact CV — B121 */}
      <div
        data-testid="workspace-dynamic-cv-card"
        style={{
          border:       '1px solid rgba(6,3,43,0.10)',
          borderRadius: 14,
          padding:      '20px 22px',
          background:   '#FAFAFA',
          display:      'flex',
          alignItems:   'flex-start',
          justifyContent: 'space-between',
          gap:          16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3B6EBA', margin: '0 0 6px' }}>
            Dynamic Impact CV
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
            {hasAnyActivity ? 'Il tuo percorso KORA è in costruzione' : 'Inizia a costruire il tuo profilo'}
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            {hasAnyActivity
              ? 'CV privato disponibile. Il tuo datore di lavoro non vede questi dati.'
              : 'Partecipa alle prime iniziative per generare il tuo CV KORA.'}
          </p>
          <a
            href="/worker/dynamic-cv"
            data-testid="workspace-dynamic-cv-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          '#3B6EBA',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(59,110,186,0.28)',
              borderRadius:   8,
              background:     'rgba(59,110,186,0.06)',
            }}
          >
            {hasAnyActivity ? 'Vedi il tuo CV →' : 'Esplora il tuo CV →'}
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    hasAnyActivity ? 'rgba(47,125,85,0.10)' : 'rgba(6,3,43,0.06)',
            color:         hasAnyActivity ? '#2F7D55' : 'rgba(6,3,43,0.40)',
          }}
        >
          {hasAnyActivity ? 'Pronto' : 'In costruzione'}
        </span>
      </div>

      {/* Privacy & Condivisione — B122 */}
      <div
        data-testid="workspace-privacy-card"
        style={{
          border:         '1px solid rgba(6,3,43,0.10)',
          borderRadius:   14,
          padding:        '18px 22px',
          background:     '#FAFAFA',
          marginTop:      16,
          display:        'flex',
          alignItems:     'flex-start',
          justifyContent: 'space-between',
          gap:            16,
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2F7D55', margin: '0 0 6px' }}>
            Privacy & Condivisione
          </p>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: '0 0 4px' }}>
            I tuoi dati restano privati
          </p>
          <p style={{ fontSize: 11, color: 'rgba(6,3,43,0.50)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Il datore di lavoro vede solo medie aggregate anonime. Mai dati individuali.
          </p>
          <a
            href="/worker/privacy"
            data-testid="workspace-privacy-link"
            style={{
              display:        'inline-block',
              fontSize:       12,
              fontWeight:     600,
              color:          '#2F7D55',
              textDecoration: 'none',
              padding:        '7px 14px',
              border:         '1px solid rgba(47,125,85,0.28)',
              borderRadius:   8,
              background:     'rgba(47,125,85,0.06)',
            }}
          >
            Scopri i tuoi diritti &#8594;
          </a>
        </div>
        <span
          style={{
            fontSize:      9,
            fontWeight:    700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            padding:       '3px 8px',
            borderRadius:  999,
            background:    'rgba(47,125,85,0.10)',
            color:         '#2F7D55',
          }}
        >
          Attivo
        </span>
      </div>

      <div style={{ marginTop: 28, fontSize: 10, color: 'rgba(6,3,43,0.30)', lineHeight: 1.5 }}>
        KORA Foundation Light · Spazio lavoratore · I dati aziendali rimangono aggregati e non mostrano dati individuali.
      </div>
    </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: 'rgba(6,3,43,0.45)', marginBottom: 14, marginTop: 0,
};

const PILLAR_COLORS: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};

const PARTICIPATION_LABELS: Record<string, string> = {
  interested: 'Interessato',
  registered: 'Registrato',
  attended:   'Partecipato',
  cancelled:  'Cancellato',
};

function HistoryRow({ item }: { item: HistoryItem }) {
  const pillarColor = PILLAR_COLORS[item.pillar] ?? '#555';
  const partLabel   = PARTICIPATION_LABELS[item.participation_status] ?? item.participation_status;
  const date        = item.updated_at ? item.updated_at.slice(0, 10) : '—';

  return (
    <div style={{
      paddingBottom: 10, borderBottom: '1px solid rgba(6,3,43,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: pillarColor, marginRight: 6 }}>
            {item.pillar}
          </span>
          <span style={{ fontSize: 12, color: '#06032B' }}>{item.initiative_title}</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.45)' }}>{partLabel}</span>
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.30)', fontFamily: 'monospace' }}>{date}</span>
        </div>
      </div>
      {item.private_note && (
        <div style={{
          marginTop: 5, fontSize: 11, color: 'rgba(6,3,43,0.50)',
          background: 'rgba(6,3,43,0.03)', borderRadius: 5, padding: '5px 8px',
          fontStyle: 'italic', lineHeight: 1.4,
        }}>
          {item.private_note}
        </div>
      )}
    </div>
  );
}

const PILLAR_COLORS_MAP: Record<string, string> = {
  LIFE: '#16a34a', GROWTH: '#2563eb', CONNECTION: '#9333ea',
  IMPACT: '#dc2626', LEGACY: '#ca8a04',
};
const DELIVERY_SHORT: Record<string, string> = {
  online: 'Online', onsite: 'In presenza', hybrid: 'Ibrido',
};

function PartnerPreviewRow({ partner }: { partner: { id: string; name: string; pillar: string; category: string | null; delivery_mode: string } }) {
  const pc = PILLAR_COLORS_MAP[partner.pillar] ?? '#555';
  return (
    <div style={{
      paddingBottom: 10, borderBottom: '1px solid rgba(6,3,43,0.05)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: pc, marginRight: 6 }}>
          {partner.pillar}
        </span>
        <span style={{ fontSize: 12, color: '#06032B', fontWeight: 600 }}>{partner.name}</span>
        {partner.category && (
          <span style={{ fontSize: 10, color: 'rgba(6,3,43,0.40)', marginLeft: 6 }}>{partner.category}</span>
        )}
      </div>
      <span style={{ fontSize: 9, color: 'rgba(6,3,43,0.35)', flexShrink: 0 }}>
        {DELIVERY_SHORT[partner.delivery_mode] ?? partner.delivery_mode}
      </span>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(6,3,43,0.05)' }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(6,3,43,0.50)' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#06032B', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function PlaceholderSection({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      background: '#f9f9fb', border: '1px dashed rgba(6,3,43,0.15)', borderRadius: 10, padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#06032B', margin: 0 }}>{title}</h3>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
          background: 'rgba(6,3,43,0.07)', color: 'rgba(6,3,43,0.45)', borderRadius: 3, padding: '1px 5px',
        }}>
          Prossimamente
        </span>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(6,3,43,0.45)', margin: 0, lineHeight: 1.5 }}>{description}</p>
    </div>
  );
}
